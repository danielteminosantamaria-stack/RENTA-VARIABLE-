# GESTION DE CARTERAS - DANIEL TEMIÑO

Web estática (sin servidor, sin dependencias) con el seguimiento de fondos de renta fija y renta variable y mixtos a partir de las hojas de Morningstar del Drive.

## Estructura

- `index.html`, `styles.css`, `app.js`: la web.
- `data.js`: los datos (se genera, no se edita a mano).
- `tools/build_data.py`: convierte las hojas exportadas en `data.js`.

## Publicar en GitHub Pages

1. Crear un repositorio (por ejemplo `seguimiento-fondos`) y subir todo el contenido de esta carpeta a la raíz.
2. En el repositorio: Settings, Pages, Source: "Deploy from a branch", rama `main`, carpeta `/ (root)`.
3. La web queda en `https://<usuario>.github.io/<repositorio>/`.

Ojo: en cuentas gratuitas un repositorio con Pages es público. La web lleva `noindex`, pero cualquiera con el enlace puede verla.

## Actualizar los datos

1. En Google Sheets, exportar cada hoja (pestaña "Indexados") como CSV: `rf.csv` (Fondos Renta Fija) y `rv.csv` (Fondos Renta Variable).
2. Ejecutar: `python3 tools/build_data.py rf.csv rv.csv data.js`
3. Subir `data.js` al repositorio. La web se actualiza sola en un par de minutos.
