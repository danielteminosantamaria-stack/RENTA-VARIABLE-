// Prueba rápida de la web: abre cada sección en móvil y ordenador y falla si hay errores de código,
// desbordes de página, tablas que no se pueden deslizar o nombres de fondo que no quedan fijos.
// Uso (desde la raíz): node tools/test_web.js [carpeta_para_capturas]
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, ".."), SHOTS = process.argv[2];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((q, r) => {
  let p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
  if (!p.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  if (p.endsWith(path.sep)) p += "index.html";
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" }); r.end(d); });
});
(async () => {
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  const base = "http://127.0.0.1:" + srv.address().port + "/";
  const browser = await chromium.launch(), fails = [];
  for (const w of [360, 390, 820, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 780 }, hasTouch: w < 800, isMobile: w < 800 });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort()); // sin recursos externos
    const page = await ctx.newPage(), errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto(base); await page.waitForFunction(() => window.DATA);
    const ids = await page.evaluate(() => {
      const rv = DATA.funds.filter((f) => f.t === "rv").slice(0, 3).map((f) => f.id), rf = DATA.funds.filter((f) => f.t === "rf").slice(0, 2).map((f) => f.id);
      // cartera de ejemplo, solo en este navegador de pruebas
      localStorage.setItem("cf_carteras", JSON.stringify([{ id: "prueba", name: "Prueba", amount: 100000, lines: rv.concat(rf).map((id) => ({ id, w: 20 })) }]));
      return { rv, rf };
    });
    await page.reload();
    const routes = ["", "rv", "rf", "rv/resumen", "fondo/" + ids.rv[0], "fondo/" + ids.rf[0], "comparar", "comparar/" + ids.rv.concat(ids.rf[0]).join(","),
      "carteras", "cartera/prueba", "construir", "macro", "nota", "estado", "amplitud", "acciones", "accion/FROG"];
    for (const r of routes) {
      const before = errs.length;
      await page.goto(base + "#/" + r); await page.waitForTimeout(350);
      const tabs = await page.$$('#app [role="tab"]');
      for (const t of tabs) { if (await t.isVisible()) await t.click(); }
      if (tabs.length && (await tabs[0].isVisible())) await tabs[0].click();
      const m = await page.evaluate(() => {
        const out = { over: document.documentElement.scrollWidth - innerWidth, empty: document.getElementById("app").innerText.trim().length < 20, cut: [], loose: [] };
        document.querySelectorAll("#app table").forEach((t) => {
          if (!t.offsetParent) return;
          let e = t.parentElement, sc = null;
          while (e && e.id !== "app") { if (/auto|scroll/.test(getComputedStyle(e).overflowX)) { sc = e; break; } e = e.parentElement; }
          const name = (t.id || t.className || t.parentElement.className || "tabla").toString().slice(0, 40);
          if (!sc) { if (t.getBoundingClientRect().right > innerWidth + 2) out.cut.push(name); return; }
          if (sc.scrollWidth <= sc.clientWidth + 2) return;
          const cell = t.querySelector("tbody tr:not(.mxgr):not(.grp) > :first-child");
          if (!cell) return;
          const x0 = cell.getBoundingClientRect().left; sc.scrollLeft = 200;
          const moved = x0 - cell.getBoundingClientRect().left, wdt = cell.offsetWidth; sc.scrollLeft = 0;
          if (moved > 30) out.loose.push(name + " (columna sin fijar)");
          else if (wdt > sc.clientWidth * 0.62) out.loose.push(name + " (columna fija demasiado ancha: " + wdt + " de " + sc.clientWidth + ")");
        });
        return out;
      });
      const bad = [];
      if (errs.length > before) bad.push("error: " + errs.slice(before).join(" | "));
      if (m.over > 1) bad.push("la página se desborda " + m.over + " px");
      if (m.empty) bad.push("pantalla vacía");
      if (m.cut.length) bad.push("tablas cortadas: " + m.cut.join(", "));
      if (m.loose.length && w < 800) bad.push(m.loose.join(", "));
      if (bad.length) fails.push(w + "px #/" + r + ": " + bad.join("; "));
      if (SHOTS && (w === 390 || w === 1280)) await page.screenshot({ path: path.join(SHOTS, w + "_" + (r.replace(/[\/,]/g, "_").slice(0, 24) || "home") + ".png") });
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  if (fails.length) { console.log(fails.join("\n")); process.exit(1); }
  console.log("Todo correcto");
})();
