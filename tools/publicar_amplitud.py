#!/usr/bin/env python3
"""Cifra los datos de amplitud del NYSE y escribe amplitud.js.

Uso:  AMP_PW=contraseña python3 tools/publicar_amplitud.py valores.json

valores.json es la respuesta de Google Sheets (get_values) de NYSE!A2:O421:
una lista de filas con las columnas A a O de la pestaña NYSE (la más reciente primero),
o bien un objeto con la clave "values". No se guarda ninguna contraseña en el repositorio.
"""
import base64, json, os, sys

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def num(x):
    s = str(x).strip()
    if not s:
        return None
    try:
        return float(s.replace(".", "").replace(",", ".")) if "," in s and "." in s else float(s.replace(",", "."))
    except ValueError:
        return None


raw = json.load(open(sys.argv[1], encoding="utf-8"))
if isinstance(raw, list) and raw and isinstance(raw[0], dict) and "text" in raw[0]:
    raw = json.loads(raw[0]["text"])
vals = raw["values"] if isinstance(raw, dict) else raw
rows = []
for r in vals:
    r = list(r) + [""] * (15 - len(r))
    d = str(r[0]).split("/")
    if len(d) != 3:
        continue
    rows.append([f"{d[2]}-{d[1].zfill(2)}-{d[0].zfill(2)}"] + [num(r[i]) for i in (1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14)])
rows.reverse()
if len(rows) < 100:
    sys.exit("Muy pocas filas válidas: no se escribe nada")
data = {"actualizado": rows[-1][0], "cols": ["f", "nyse", "nmax", "nmin", "ad", "wma", "adn", "rasi", "mcos", "sum", "p50", "p200"], "rows": rows}
pw = os.environ["AMP_PW"].encode()
salt, iv = os.urandom(16), os.urandom(12)
key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=150000).derive(pw)
ct = AESGCM(key).encrypt(iv, json.dumps(data, separators=(",", ":")).encode(), None)
b = lambda x: base64.b64encode(x).decode()
open("amplitud.js", "w", encoding="utf-8").write(
    "/* Datos de amplitud cifrados (AES-GCM). Solo se leen con la contraseña. */\nwindow.AMPLITUD_ENC = "
    + json.dumps({"s": b(salt), "i": b(iv), "c": b(ct), "it": 150000}) + ";\n")
print("amplitud.js escrito con", len(rows), "sesiones, hasta", rows[-1][0])
