#!/usr/bin/env python3
"""Convierte las hojas de Morningstar (exportadas a CSV desde Google Drive)
en data.js, el fichero de datos que lee la web.

Uso:
    python3 tools/build_data.py rf.csv rv.csv data.js

rf.csv  = hoja "Fondos Renta Fija"     (pestaña Indexados, exportada como CSV)
rv.csv  = hoja "Fondos Renta Variable" (pestaña Indexados, exportada como CSV)
"""
import csv
import json
import re
import sys
from datetime import datetime

# Gestora a partir del nombre completo de Morningstar (primer patron que coincida)
MANAGERS = [
    (r"^Renta 4", "Renta 4"),
    (r"^Morgan Stanley", "Morgan Stanley IM"),
    (r"^Man Funds", "Man Group"),
    (r"^Algebris", "Algebris"),
    (r"^PIMCO", "PIMCO"),
    (r"^Buy & Hold", "Buy & Hold"),
    (r"^Vontobel", "Vontobel"),
    (r"M&G", "M&G"),
    (r"^Amundi", "Amundi"),
    (r"^MFS", "MFS"),
    (r"^BlackRock", "BlackRock"),
    (r"^T\. Rowe", "T. Rowe Price"),
    (r"^Alger", "Alger"),
    (r"^JPMorgan", "JPMorgan AM"),
    (r"^Jupiter", "Jupiter"),
    (r"^Findlay", "Findlay Park"),
    (r"^Groupama", "Groupama"),
    (r"^Nomura", "Nomura"),
    (r"^DNB", "DNB"),
    (r"^Federated", "Federated Hermes"),
    (r"^DWS", "DWS"),
    (r"^Goldman", "Goldman Sachs AM"),
    (r"^Goehring", "Goehring & Rozencwajg"),
    (r"^Fidelity", "Fidelity"),
    (r"^Robeco", "Robeco"),
    (r"^Eleva", "Eleva"),
    (r"^Wellington", "Wellington"),
    (r"^CT \(Lux\)", "Columbia Threadneedle"),
    (r"^Polar Capital", "Polar Capital"),
    (r"^Vanguard", "Vanguard"),
    (r"^Allianz", "Allianz GI"),
    (r"^Echiquier", "La Financière de l'Echiquier"),
    (r"^Edmond de Rothschild", "Edmond de Rothschild"),
]

# Prefijos de "paraguas" que se quitan del nombre (ej. "Man Funds plc - Man Euro...")
UMBRELLAS = [
    r"^Man Funds (VI )?plc - ", r"^Algebris UCITS Funds plc - ",
    r"^Morgan Stanley Investment Funds - ", r"^European Specialist Investment Funds - ",
    r"^Vontobel Fund - ", r"^MFS Meridian Funds - ", r"^T\. Rowe Price Funds SICAV - ",
    r"^Amundi S\.F\. - ", r"^Amundi Funds - ", r"^Alger SICAV - ", r"^JPMorgan Funds - ",
    r"^Robeco Capital Growth Funds - ", r"^Fidelity Funds - ",
    r"^Allianz Global Investors Fund - ", r"^Edmond de Rothschild Fund - ",
    r"^Polar Capital Funds PLC - ", r"^Nomura Funds Ireland plc - ",
    r"^BlackRock Global Funds - ", r"^CT \(Lux\) - ",
]

INDEXED = re.compile(r"^Vanguard")


def manager(name):
    for pat, label in MANAGERS:
        if re.search(pat, name):
            return label
    return name.split()[0]


def clean_name(name):
    for pat in UMBRELLAS:
        if re.search(pat, name):
            return re.sub(pat, "", name)
    return name


def num(s):
    """'▲ 0.19%' / '3.65 %' / '-3.18' -> float, vacio o '-' -> None"""
    if s is None:
        return None
    s = str(s).replace("▲", "").replace("▼", "").replace("%", "").replace(",", "").strip()
    if s in ("", "-", "~"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def split_num(s):
    """'Estados Unidos 74.46' o 'Canadá65.73' -> ['Estados Unidos', 74.46]"""
    s = (s or "").strip()
    m = re.match(r"^(.*?)\s*(\d+(?:\.\d+)?)$", s)
    if not m:
        return None
    return [m.group(1).strip(), float(m.group(2))]


def parse_kv(raw):
    parts = raw.split("|")
    d = {}
    for i in range(0, len(parts) - 1, 2):
        d[parts[i]] = parts[i + 1].strip()
    return d


def trio(d, prefix, scale=1.0):
    out = []
    for suf in ("1", "3", "5"):
        v = num(d.get(f"{prefix}_{suf}"))
        out.append(None if v is None else round(v * scale, 2))
    return out


def fund(row, kind):
    d = parse_kv(row[-1].lstrip("'")) if row[-1] else {}
    if d.get("STATUS") != "DONE":
        return None
    name = d.get("NOMBRE") or row[1]
    acum = (d.get("ACUMULADA") or "").split("~")
    acum += ["-"] * (10 - len(acum))
    ret = dict(zip(["d1", "w1", "m1", "m3", "m6", "ytd", "y1", "y3", "y5", "y10"],
                   [num(x) for x in acum[:10]]))
    anual = [num(x) for x in (d.get("ANUAL") or "").split("~")] if d.get("ANUAL") else []
    stars = re.search(r"img/(\d)stars", d.get("RATING", ""))
    last = (d.get("LAST_RUN") or "").lstrip("'")[:10]
    dd = [num(d.get(f"DRAWDOWN_{k}")) for k in ("1", "3", "5", "10", "MAX")]
    f = {
        "id": row[0],
        "n": clean_name(name),
        "g": manager(name),
        "c": d.get("CATEGORIA", ""),
        "t": kind,
        "idx": bool(INDEXED.search(name)),
        "stars": int(stars.group(1)) if stars else None,
        "cost": d.get("COSTE_NETO", ""),
        "cre": d.get("CREACION", "").lstrip("'"),
        "aum": d.get("PATRIMONIO", ""),
        "aumc": d.get("PATRIMONIO_CLASE", ""),
        "nd": d.get("FECHA", ""),
        "nav": d.get("PRECIO", ""),
        "top10": num(d.get("TOP_10")),
        "mix": [num(d.get("ACCIONES")), num(d.get("OBLIGACIONES")),
                num(d.get("EFECTIVO")), num(d.get("OTRO"))],
        "nEq": num(d.get("TOTAL_ACCIONES")),
        "nBo": num(d.get("TOTAL_OBLIGACIONES")),
        "per": num(d.get("PER")), "pcf": num(d.get("PCF")), "gro": num(d.get("CRECIMIENTO")),
        "cap": [num(d.get(k)) for k in ("CAP_GIGANTE", "CAP_GRANDE", "CAP_MEDIANO",
                                        "CAP_PEQUENO", "CAP_MICRO")],
        "reg": split_num(d.get("RV_REGION")),
        "sec": split_num(d.get("RV_SECTOR")),
        "vto": num(d.get("RF_VTO")),
        "dur": num(d.get("RF_DURACION")),
        "cal": d.get("RF_CALIDAD") or None,
        "ret": ret,
        "ann": anual,
        "vol": trio(d, "VOLATILIDAD"),
        "dd": dd,
        "worst": [num(d.get(f"WORST_MONTH_{k}")) for k in ("1", "3", "5")],
        "pos": trio(d, "RATIO", 100.0),
        "sharpe": trio(d, "SHARPE"),
        "sortino": trio(d, "SORTINO"),
        "mar": trio(d, "MAR"),
        "skew": trio(d, "ASIMETRIA"),
        "kurt": trio(d, "CURTOSIS"),
        "score": [num(d.get("SCORE_1")), num(d.get("SCORE_3")), num(d.get("SCORE_5")), num(d.get("SCORE_TOTAL"))],
        "rmed": num(d.get("RENTABILIDAD_MEDIA")),
        "mrent": d.get("RENTABILIDAD_MORNINGSTAR") or None,
        "mris": d.get("RIESGO_MORNINGSTAR") or None,
        "alpha": num(d.get("ALPHA")),
        "beta": num(d.get("BETA")),
        "r2": num(d.get("RATIO_CUADRADO")),
        "ms": d.get("URL") or None,
        "ficha": d.get("FICHA") or None,
        "informe": d.get("INFORME") or None,
        "xray": d.get("XRAY") or None,
        "run": last,
    }
    return f


# Fondos que Daniel ha decidido sacar de la web (Fondos Selección 50): se descartan aunque sigan en las hojas.
EXCLUIDOS = {
    "LU2482630675",  # M&G Total Return Credit Investment P EUR Acc
    "IE00BDT57Y96",  # PIMCO GIS Low Duration Income E Hedged
    "LU0599946893",  # DWS Concept Kaldemorgen EUR LC
}


def load(path, kind):
    rows = list(csv.reader(open(path, encoding="utf-8")))
    out = []
    for r in rows[2:]:
        if r and r[0].strip() and len(r) >= 118:
            f = fund(r, kind)
            if f and f.get("id") not in EXCLUIDOS:
                out.append(f)
    return out


def fmt(date_iso):
    try:
        return datetime.strptime(date_iso, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return ""


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    rf, rv, out = sys.argv[1:]
    funds_rf, funds_rv = load(rf, "rf"), load(rv, "rv")
    header = list(csv.reader(open(rv, encoding="utf-8")))[1]
    ann_date = next((c for c in header if re.fullmatch(r"\d{2}/\d{2}/\d{4}", c.strip())), "")
    meta = {
        "rf": fmt(max((f["run"] for f in funds_rf), default="")),
        "rv": fmt(max((f["run"] for f in funds_rv), default="")),
        "annDate": ann_date,
    }
    payload = {"meta": meta, "funds": funds_rf + funds_rv}
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("window.DATA=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"RF: {len(funds_rf)} fondos, RV: {len(funds_rv)} fondos -> {out}")


if __name__ == "__main__":
    main()
