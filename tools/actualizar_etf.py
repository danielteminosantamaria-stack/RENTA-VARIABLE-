#!/usr/bin/env python3
"""Actualiza etf.js (apartado ETF) con datos de Interactive Brokers.

Uso: python3 tools/actualizar_etf.py CARPETA --fecha dd/mm/aaaa   (fecha = ultima sesion americana)
CARPETA tiene un fichero TICKER.json por cada ETF de etf.js y otro SPY.json:
  {"w": [["aaaa-mm-dd", cierre], ...],     barras semanales (ONE_WEEK, step_count 10); SPY no la necesita
   "m": [["aaaa-mm-dd", cierre], ...],     barras mensuales (ONE_MONTH, step_count 15)
   "div": [["aaaa-mm-dd", importe], ...]}  dividendos (corp_actions, fecha ex) de los ultimos 15 meses
Si cualquier comprobacion falla no escribe nada. Si hay cambios sube la version de etf.js en index.html.
"""
import argparse, copy, datetime as dt, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MESES = "ene feb mar abr may jun jul ago sep oct nov dic".split()


class Mal(Exception):
    pass


def pc(x):
    return round(x * 100, 1)


def mes(fecha):
    return MESES[int(fecha[5:7]) - 1], fecha[:4]


def periodo(pico, valle):
    (m1, a1), (m2, a2) = pico.split(), mes(valle)
    return f"{m1} a {m2} {a2}" if a1 == a2 else f"{m1} {a1} a {m2} {a2}"


def serie(raw, nombre):
    if not raw or len(raw) < 2:
        raise Mal(f"serie {nombre} vacia")
    s = [(str(d)[:10], float(c)) for d, c in raw]
    if any(a[0] >= b[0] for a, b in zip(s, s[1:])) or any(c <= 0 for _, c in s):
        raise Mal(f"serie {nombre} desordenada o con precios no validos")
    return s


def avanzar(st, bars, i, divs):
    """Aplica la barra i (dividendos primero, despues el cierre) al estado de maximos y caidas."""
    d, c = bars[i]
    fin = bars[i + 1][0] if i + 1 < len(bars) else "9999"
    for ex, v in divs:
        if d <= ex < fin:
            st["fa"] *= 1 + v / c
    if c * st["fa"] > st["ath"]:
        st.update(ath=c, athd=" ".join(mes(d)), fa=1.0)
    else:
        dd = pc(c * st["fa"] / st["ath"] - 1)
        if dd < st["mdd"]:
            st.update(mdd=dd, per=periodo(st["athd"], d))
    st.update(h=d, hc=c)


def actualizar(e, datos, hoy, base):
    divs = sorted({(str(d)[:10], float(v)) for d, v in datos.get("div", [])})
    m = serie(datos.get("m"), "mensual")
    bars = serie(datos.get(base), "semanal") if base == "w" else m
    px = m[-1][1]
    if abs(bars[-1][1] - px) > 0.006:
        raise Mal(f"el ultimo cierre semanal {bars[-1][1]} no coincide con el mensual {px}")
    if (hoy - dt.date.fromisoformat(bars[-1][0])).days > (8 if base == "w" else 35) or bars[-1][0] > hoy.isoformat():
        raise Mal("la ultima barra no corresponde a la fecha indicada")
    st = copy.deepcopy(e["st"])
    idx = [i for i, b in enumerate(bars) if b[0] == st["h"]]
    if not idx:
        raise Mal(f"falta la barra del {st['h']}: pide mas barras (step_count mayor)")
    if abs(bars[idx[0]][1] / st["hc"] - 1) > 0.005:
        raise Mal(f"el cierre del {st['h']} ha cambiado ({st['hc']} a {bars[idx[0]][1]}): revisar posible split")
    for i in range(idx[0] + 1, len(bars) - 1):  # solo barras ya terminadas
        if abs(bars[i][1] / bars[i - 1][1] - 1) > 0.35:
            raise Mal(f"salto de precio anomalo el {bars[i][0]}")
        avanzar(st, bars, i, divs)
    ver = copy.deepcopy(st)  # lo que se muestra incluye la barra en curso
    if bars[-1][0] > st["h"]:
        avanzar(ver, bars, len(bars) - 1, divs)

    def rent(i):
        desde = m[i + 1][0]
        return pc((px + sum(v for ex, v in divs if ex >= desde)) / m[i][1] - 1)

    def del_mes(clave):
        for i, b in enumerate(m[:-1]):
            if b[0].startswith(clave):
                return i
        raise Mal(f"falta el cierre mensual de {clave}")

    obj = hoy - dt.timedelta(days=365)
    if obj.day <= 15:
        obj = obj.replace(day=1) - dt.timedelta(days=1)
    cur = pc(px * ver["fa"] / ver["ath"] - 1)
    e.update(px=px, mes=rent(len(m) - 2), ytd=rent(del_mes(f"{int(m[-1][0][:4]) - 1}-12")),
             y1=rent(del_mes(obj.strftime("%Y-%m"))), cur=min(cur, 0.0), mdd=ver["mdd"], per=ver["per"],
             ath=ver["ath"], athd=ver["athd"], st=st)
    if "extra" in e:
        e["extra"] = pc((1 + e["mdd"] / 100) / (1 + e["cur"] / 100) - 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("carpeta")
    ap.add_argument("--fecha", required=True)
    a = ap.parse_args()
    hoy = dt.datetime.strptime(a.fecha, "%d/%m/%Y").date()
    ruta = ROOT / "etf.js"
    txt = ruta.read_text(encoding="utf-8")
    cab, cuerpo = txt.split("window.ETFS = ", 1)
    E = json.loads(cuerpo.strip().rstrip(";"))
    if hoy < dt.datetime.strptime(E["f"], "%d/%m/%Y").date():
        sys.exit("La fecha indicada es anterior a la publicada. No se escribe nada.")
    errores = []
    for e, base in [(x, "w") for x in E["list"]] + [(E["ref"], "m")]:
        try:
            datos = json.loads((Path(a.carpeta) / f"{e['t']}.json").read_text(encoding="utf-8"))
            actualizar(e, datos, hoy, base)
        except (Mal, OSError, ValueError, KeyError, TypeError) as ex:
            errores.append(f"{e['t']}: {ex}")
    if errores:
        sys.exit("No se escribe nada. Errores:\n" + "\n".join(errores))
    E["f"] = a.fecha
    nuevo = cab + "window.ETFS = " + json.dumps(E, ensure_ascii=False) + ";\n"
    if nuevo == txt:
        print("SIN CAMBIOS")
        return
    ruta.write_text(nuevo, encoding="utf-8")
    ind = ROOT / "index.html"
    html, n = re.subn(r"etf\.js\?v=(\d+)", lambda g: f"etf.js?v={int(g.group(1)) + 1}", ind.read_text(encoding="utf-8"))
    if n != 1:
        sys.exit("No encuentro etf.js en index.html")
    ind.write_text(html, encoding="utf-8")
    print("CAMBIOS", a.fecha)
    for e in E["list"] + [E["ref"]]:
        print(e["t"], "px", e["px"], "mes", e["mes"], "ano", e["ytd"], "1a", e["y1"], "caida", e["cur"], "max", e["mdd"])


if __name__ == "__main__":
    main()
