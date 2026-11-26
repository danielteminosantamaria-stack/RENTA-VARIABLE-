// Genera carteras_ia.js: congela las 3 carteras IA del trimestre actual y archiva la anterior.
// Uso: node tools/rotar_ia.js [--force]   (sin --force no hace nada si el trimestre ya está congelado)
var fs = require("fs"), vm = require("vm"), path = require("path");
var root = path.join(__dirname, "..");
var sb = { window: {}, console: console };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, "data.js"), "utf8"), sb);
var FUNDS = sb.window.DATA.funds, META = sb.window.DATA.meta;
var src = fs.readFileSync(path.join(root, "app.js"), "utf8");
var a = src.indexOf("  var PROFILES = ["), b = src.indexOf("  var REC_KEY");
if (a < 0 || b < 0) throw new Error("No encuentro PROFILES en app.js");
var code = "function isNum(v){return typeof v==='number'&&isFinite(v);} function ofType(t){return FUNDS.filter(function(f){return f.t===t;});}\n" + src.slice(a, b) + "\nthis.out = PROFILES.map(function(p){return {k:p.k, b:buildProfile(p)};});";
var ctx = { FUNDS: FUNDS }; vm.createContext(ctx); vm.runInContext(code, ctx);
var now = new Date(), q = now.getFullYear() + "-T" + (Math.floor(now.getMonth() / 3) + 1);
var prev = null, file = path.join(root, "carteras_ia.js");
if (fs.existsSync(file)) { var s = { window: {} }; vm.createContext(s); vm.runInContext(fs.readFileSync(file, "utf8"), s); prev = s.window.CIA; }
if (prev && prev.trimestre === q && process.argv.indexOf("--force") < 0) { console.log("Trimestre " + q + " ya congelado; nada que hacer."); process.exit(0); }
function navOf(f) { var n = parseFloat(String(f.nav == null ? "" : f.nav).replace(/,/g, "").replace(/[A-Za-z\s]/g, "")); return isFinite(n) && n > 0 ? n : null; }
var hist = prev ? (prev.historial || []).slice() : [];
if (prev && prev.trimestre !== q) hist.unshift({ trimestre: prev.trimestre, fecha: prev.fecha, perfiles: prev.perfiles });
var perfiles = {};
ctx.out.forEach(function (o) {
  var navs = {}; o.b.lines.forEach(function (l) { var f = FUNDS.filter(function (x) { return x.id === l.id; })[0], n = navOf(f); if (n) navs[l.id] = n; });
  perfiles[o.k] = { lines: o.b.lines.map(function (l) { return { id: l.id, w: l.w }; }), navs: navs };
});
var d = now, fecha = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
var cia = { trimestre: q, fecha: fecha, datos: META.rv, perfiles: perfiles, historial: hist.slice(0, 12) };
fs.writeFileSync(file, "window.CIA = " + JSON.stringify(cia) + ";\n");
console.log("Carteras IA " + q + " generadas (" + Object.keys(perfiles).map(function (k) { return k + ":" + perfiles[k].lines.length; }).join(", ") + ").");
