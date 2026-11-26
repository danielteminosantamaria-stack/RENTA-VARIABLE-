/* Asistente local: responde dudas con los datos de la propia web. Sin IA externa, sin claves, sin enviar nada fuera. */
(function () {
  "use strict";
  var FUNDS = (window.DATA && window.DATA.funds) || [];
  var META = (window.DATA && window.DATA.meta) || {};
  if (!FUNDS.length || document.getElementById("cfbot")) return;

  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function nf(v, d) { return v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function pc(v, d) { return isNum(v) ? (v > 0 ? "+" : "") + nf(v, d == null ? 2 : d) + " %" : "–"; }
  function pn(v, d) { return isNum(v) ? nf(v, d == null ? 2 : d) + " %" : "–"; }
  function dc(v, d) { return isNum(v) ? nf(v, d == null ? 2 : d) : "–"; }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9&%\s.<>]/g, " ").replace(/\s+/g, " ").trim(); }
  function re(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function cost(f) { var m = String(f.cost || "").replace(",", ".").match(/[\d.]+/); return m ? parseFloat(m[0]) : null; }
  function mnum(s) { var m = /([\d,]+(?:\.\d+)?)/.exec(String(s || "")); return m ? parseFloat(m[1].replace(/,/g, "")) : null; }
  function money(s) { var v = mnum(s); return isNum(v) ? nf(v, 2) + " M EUR" : esc(s || "–"); }
  function years(d) { var m = /(\d+)\/(\d+)\/(\d+)/.exec(String(d || "")); return m ? (new Date(2026, 10, 23) - new Date(+m[3], +m[2] - 1, +m[1])) / 31557600000 : null; }
  function link(f) { return '<a href="#/fondo/' + encodeURIComponent(f.id) + '">' + esc(f.n) + "</a>"; }
  function curId() { var m = (location.hash || "").match(/^#\/fondo\/([^/]+)/); return m ? decodeURIComponent(m[1]) : null; }
  function byId(id) { for (var i = 0; i < FUNDS.length; i++) if (FUNDS[i].id === id) return FUNDS[i]; return null; }
  function annOf(f, y) { return f.ann && isNum(f.ann[2026 - y]) ? f.ann[2026 - y] : null; }
  var FN = FUNDS.map(function (f) { return { f: f, n: norm(f.n), g: norm(f.g), c: norm(f.c) }; });
  var ctx = { fund: null, rank: null };
  function setFund(f) { ctx.fund = f; return f; }

  /* ---------- Glosario ---------- */
  var GLOS = [
    [/sharpe/, "Ratio de Sharpe", "Mide cuánta rentabilidad extra obtiene el fondo por cada unidad de riesgo (volatilidad). Cuanto más alto, mejor: por encima de 1 es bueno y por debajo de 0 indica que no compensó el riesgo. Sirve para comparar fondos de la misma categoría."],
    [/sortino/, "Ratio de Sortino", "Parecido al Sharpe, pero solo penaliza la volatilidad a la baja (las caídas), no las subidas. Más alto es mejor."],
    [/\balfa\b|\balpha\b/, "Alpha", "Rentabilidad que aporta el gestor por encima de la que explicaría el mercado según el riesgo asumido. Positivo es bueno; negativo indica que no compensó frente a su referencia."],
    [/\bbeta\b/, "Beta", "Sensibilidad del fondo al mercado. Beta 1 se mueve como el mercado; 0,5 la mitad; más de 1 amplifica subidas y caídas."],
    [/\br2\b|r cuadrado|r al cuadrado/, "R cuadrado (R2)", "Porcentaje del movimiento del fondo que se explica por su índice de referencia. Cerca de 100 significa que se comporta casi como el índice; bajo significa que su gestor se aleja mucho de él."],
    [/volatilidad|desviacion/, "Volatilidad", "Cuánto oscila la rentabilidad del fondo alrededor de su media (desviación típica anualizada). Es la medida habitual de riesgo: más volatilidad, más altibajos."],
    [/caida maxima|drawdown|\bdd\b/, "Caída máxima (drawdown)", "La mayor pérdida desde un máximo hasta el mínimo siguiente en el periodo. Indica cuánto habría llegado a perder alguien que entrase en el peor momento."],
    [/\bter\b|coste|comision|gastos corrientes/, "Coste del fondo", "Gastos corrientes anuales que se descuentan del valor liquidativo (gestión, depósito, administración). Pesan cada año, así que a igualdad de resultado es mejor el fondo más barato."],
    [/estrellas|rating morningstar/, "Estrellas Morningstar", "Calificación de 1 a 5 según la rentabilidad ajustada al riesgo frente a fondos de su misma categoría. Es una medida del pasado, no una garantía futura."],
    [/duracion/, "Duración", "En renta fija, sensibilidad del precio a los tipos de interés. Una duración de 5 significa que, si los tipos suben un 1 %, el fondo cae aproximadamente un 5 %."],
    [/frontera eficiente/, "Frontera eficiente", "Línea formada por los fondos que no tienen otro mejor: ninguno ofrece más rentabilidad con menos riesgo. En el gráfico de dispersión se activa al elegir una categoría y un plazo."],
    [/\bmar\b/, "MAR", "Ratio entre la rentabilidad y la caída máxima. Mide cuánta rentabilidad se obtiene por cada punto de pérdida máxima sufrida."],
    [/asimetria|skew/, "Asimetría (skewness)", "Si es negativa, las pérdidas grandes son más probables o más fuertes que las ganancias grandes. Si es positiva, ocurre al revés."],
    [/curtosis|kurt/, "Curtosis", "Mide si el fondo tiene colas gruesas, es decir, más movimientos extremos de lo habitual. Valores altos implican más sorpresas fuertes."],
    [/indexado|indice/, "Fondo indexado", "Fondo que replica un índice. En la web aparece con la etiqueta Indexado y se excluye de los rankings salvo que lo pidas."],
    [/\bpeg\b/, "PEG", "Relación entre el P/E esperado y el crecimiento esperado del beneficio. Menos de 1 sugiere que el crecimiento no está en el precio; más de 1,5 o 2, que el mercado ya paga una prima."],
    [/\bper\b|precio beneficio|p\/e/, "PER", "Cuántas veces paga el mercado el beneficio anual de las empresas de la cartera. Más alto indica valoraciones más exigentes y más expectativas de crecimiento."],
    [/composite|rs rating|eps rating|acc\/?dis|smr/, "Ratings de acciones", "Composite, EPS Rating y RS Rating van de 1 a 99 e indican la calidad global, la del crecimiento de beneficios y la fuerza relativa frente al mercado. Acc/Dis (A a E) mide si los grandes inversores compran o venden, y SMR (A a E) la calidad de ventas, márgenes y ROE."],
    [/amplitud|breadth/, "Amplitud de mercado", "Mide cuántas acciones acompañan la tendencia del índice. Los datos están en el apartado Amplitud, que es privado."],
    [/\btir\b/, "TIR", "Rentabilidad anual que obtendría un bono si se mantiene hasta el vencimiento y cobra todos sus pagos."],
    [/calidad crediticia|rating crediticio|calificacion crediticia/, "Calidad crediticia", "Nota media de los emisores de bonos de la cartera. De AAA (máxima) a BBB es grado de inversión; BB o inferior es high yield, con más rentabilidad y más riesgo."],
    [/high yield|alto rendimiento/, "High yield", "Bonos con calidad crediticia inferior a BBB. Pagan más cupón a cambio de más riesgo de impago y más sensibilidad al ciclo."],
    [/rentabilidad anualizada|anualizada/, "Rentabilidad anualizada", "A 3, 5 y 10 años, la web muestra la rentabilidad media por año, no la acumulada."],
    [/cobertura|cubierto|hedged/, "Cobertura de divisa", "Los fondos «cubiertos» (hedged) eliminan el efecto de la divisa extranjera frente al euro. Reducen la volatilidad por tipo de cambio pero cuestan algo."],
    [/diversificacion|top 10|concentracion/, "Concentración", "El «top 10» es el peso de las diez mayores posiciones. Más del 45 % indica cartera concentrada, con más riesgo específico."],
    [/capitalizacion|small|mid cap|large/, "Capitalización", "Tamaño de las empresas de la cartera: gigante, grande, mediana, pequeña y micro. A menor tamaño, más riesgo y menos liquidez."],
    [/frontera|dispersion/, "Gráfico de dispersión", "Pone la volatilidad en el eje horizontal y la rentabilidad en el vertical. Los fondos arriba a la izquierda son los más eficientes."]
  ];

  /* ---------- Periodos ---------- */
  function plazo(t) {
    if (/\b(ytd|este ano|en lo que va|del ano|en el ano|en 2026)\b/.test(t)) return "ytd";
    if (/\b10 anos\b|diez anos/.test(t)) return "y10";
    if (/\b5 anos\b|cinco anos/.test(t)) return "y5";
    if (/\b3 anos\b|tres anos/.test(t)) return "y3";
    if (/\b(1 ano|un ano|12 meses|doce meses|ultimo ano)\b/.test(t)) return "y1";
    if (/\b6 meses\b|seis meses|semestre/.test(t)) return "m6";
    if (/\b3 meses\b|tres meses|trimestre/.test(t)) return "m3";
    if (/\b(1 mes|un mes|ultimo mes|este mes)\b/.test(t)) return "m1";
    if (/semana/.test(t) && !/agenda|esta semana/.test(t)) return "w1";
    return null;
  }
  var PL = { ytd: "en el año", y1: "a 1 año", y3: "a 3 años (anualizada)", y5: "a 5 años (anualizada)", y10: "a 10 años (anualizada)", m6: "a 6 meses", m3: "a 3 meses", m1: "a 1 mes", w1: "en la semana" };
  function pidx(p) { return p === "y5" ? 2 : p === "y3" ? 1 : 0; }
  function yearOf(t) { var m = t.match(/\b(20(?:19|2[0-5]))\b/); return m ? +m[1] : null; }

  /* ---------- Métricas ---------- */
  function M(lab, get, hi, fmt, neutral) { return { lab: lab, get: get, hi: hi, fmt: fmt, neutral: !!neutral }; }
  function metric(t, p) {
    var i = pidx(p), yl = ["1 año", "3 años", "5 años"][i], y = yearOf(t);
    if (y) return M("Rentabilidad " + y, function (f) { return annOf(f, y); }, true, pc);
    if (/sortino/.test(t)) return M("Sortino " + yl, function (f) { return f.sortino && f.sortino[i]; }, true, dc);
    if (/sharpe|rentabilidad ajustada|relacion rentabilidad.?riesgo/.test(t)) return M("Sharpe " + yl, function (f) { return f.sharpe && f.sharpe[i]; }, true, dc);
    if (/volatil|menos riesgo|mas estable|menos riesgoso|conservador|tranquilo/.test(t)) return M("Volatilidad " + yl, function (f) { return f.vol && f.vol[i]; }, false, function (v) { return pn(v, 1); });
    if (/peor mes/.test(t)) return M("Peor mes (1 año)", function (f) { return f.worst && f.worst[0]; }, true, function (v) { return pn(v, 1); });
    if (/meses (en )?positiv/.test(t)) return M("Meses en positivo (1 año)", function (f) { return f.pos && f.pos[0]; }, true, function (v) { return pn(v, 0); });
    if (/caida|drawdown|perdida maxima/.test(t)) return M("Caída máxima", function (f) { return f.dd && f.dd[4]; }, true, function (v) { return pn(v, 1); });
    if (/\balpha\b|\balfa\b/.test(t)) return M("Alpha", function (f) { return f.alpha; }, true, dc, true);
    if (/\bbeta\b/.test(t)) return M("Beta", function (f) { return f.beta; }, true, dc, true);
    if (/\br2\b|r cuadrado/.test(t)) return M("R2", function (f) { return f.r2; }, true, function (v) { return dc(v, 1); }, true);
    if (/\bmar\b/.test(t)) return M("MAR " + yl, function (f) { return f.mar && f.mar[i]; }, true, dc);
    if (/barato|coste|comision|gastos/.test(t)) return M("Coste", cost, false, pn);
    if (/estrella/.test(t)) return M("Estrellas", function (f) { return f.stars; }, true, function (v) { return v + " ★"; });
    if (/patrimonio|tamano|mas grande|aum/.test(t)) return M("Patrimonio de la clase", function (f) { return mnum(f.aumc || f.aum); }, true, function (v) { return nf(v, 0) + " M EUR"; }, true);
    if (/concentrad|top 10|diversificad/.test(t)) return M("Peso de las 10 mayores posiciones", function (f) { return f.top10; }, !/diversificad/.test(t), function (v) { return pn(v, 1); });
    if (/posiciones|numero de valores|n de valores/.test(t)) return M("Posiciones en renta variable", function (f) { return f.nEq; }, true, function (v) { return nf(v, 0); }, true);
    if (/\bper\b|precio beneficio/.test(t)) return M("PER", function (f) { return f.per; }, false, function (v) { return dc(v, 1); }, true);
    if (/duracion/.test(t)) return M("Duración", function (f) { return f.dur; }, true, function (v) { return dc(v, 1); }, true);
    if (/vencimiento/.test(t)) return M("Vencimiento medio", function (f) { return f.vto; }, true, function (v) { return dc(v, 1) + " años"; }, true);
    if (/antigu|veteran|mas antiguo|mas joven|mas nuevo|joven/.test(t)) return M("Años de historia", function (f) { return years(f.cre); }, !/joven|nuevo/.test(t), function (v) { return nf(v, 1) + " años"; }, true);
    if (/puntuacion|score|mejor valorado|recomiend|aconsej/.test(t)) return M("Puntuación global", function (f) { return f.score && f.score[3]; }, true, dc);
    if (p || /rentab|rendimiento|gana|sube|subido|mejor evolucion/.test(t)) {
      var pp = p || "y1";
      return M("Rentabilidad " + PL[pp], function (f) { return f.ret && f.ret[pp]; }, true, pc);
    }
    return null;
  }

  /* ---------- Filtros ---------- */
  var CATW = [
    ["tecnolog", "tecnologia"], ["salud|sanidad", "salud"], ["\\boro\\b|metales", "oro"], ["emergent", "emergente"],
    ["usa|eeuu|estados unidos|americ", "usa"], ["europ", "europa"], ["zona euro|eurozona", "zona euro"], ["asia", "asia"],
    ["small|pequena|mediana", "med peq"], ["dividendo", "dividendo"], ["infraestructura", "infraestructura"],
    ["high yield|alto rendimiento", "high yield"], ["corto plazo", "corto plazo"], ["flexible", "flexible"], ["mixto", "mixto"],
    ["macro", "macro"], ["corporativ", "corporativa"], ["recursos|materias primas", "recursos"], ["industrial", "industrial"],
    ["growth|crecimiento", "growth"], ["value|valor\\b", "value"], ["global", "global"], ["japon", "japon"]
  ];
  var GALIAS = { "jp morgan": "jpmorgan", "jpm": "jpmorgan", "morgan stanley": "morgan stanley", "echiquier": "echiquier", "threadneedle": "columbia", "goldman": "goldman", "t rowe": "t. rowe", "rowe price": "t. rowe", "edmond": "edmond", "blackrock": "blackrock", "ishares": "blackrock", "buy and hold": "buy & hold", "renta 4": "renta 4", "polar": "polar", "man group": "man group" };
  var GEN = { renta: 1, global: 1, buy: 1, morgan: 1, la: 1, man: 1 };
  function gestoras(t) {
    var out = [];
    Object.keys(GALIAS).forEach(function (a) { if (t.indexOf(a) >= 0 && out.indexOf(GALIAS[a]) < 0) out.push(GALIAS[a]); });
    var seen = {};
    FN.forEach(function (x) {
      if (seen[x.g]) return; seen[x.g] = 1;
      var full = new RegExp("(^|\\s)" + re(x.g) + "(\\s|$)").test(t);
      var w = x.g.split(" ")[0], first = w.length >= 5 && !GEN[w] && new RegExp("(^|\\s)" + re(w)).test(t);
      if ((full || first) && out.indexOf(x.g) < 0) out.push(x.g);
    });
    return out;
  }

  var NUMK = [
    ["volatilidad|\\bvol\\b|riesgo", "volatilidad"], ["rentabilidad|rendimiento|rentab", "rentabilidad"], ["coste|comision|gastos", "coste"],
    ["duracion", "duracion"], ["sharpe", "sharpe"], ["sortino", "sortino"], ["\\bper\\b", "per"], ["patrimonio|tamano", "patrimonio"],
    ["\\bbeta\\b", "beta"], ["caida maxima|drawdown|caida", "caida"], ["\\balpha\\b", "alpha"], ["estrellas", "estrellas"], ["vencimiento", "vencimiento"],
    ["concentracion|top 10", "concentrado"], ["antiguedad|historia", "antiguo"]
  ];
  var LOW = "menor|menos|inferior|maxim\\w*|hasta|por debajo|bajo|<";
  var HIGH = "mayor|mas|superior|minim\\w*|desde|por encima|sobre|>";
  function numFilters(t, p) {
    var res = [];
    NUMK.forEach(function (k) {
      var r = new RegExp("(?:" + k[0] + ")(?:\\s+a\\s+\\d+\\s+anos|\\s+de\\s+\\d+\\s+anos|\\s+\\d+\\s+anos)?\\s*(?:del?|que|a|con)?\\s*(" + LOW + "|" + HIGH + ")\\s*(?:de|del|que|a|al)?\\s*(-?\\d+(?:[.,]\\d+)?)");
      var m = t.match(r); if (!m) return;
      var op = new RegExp("^(?:" + LOW + ")$").test(m[1]) ? "<" : ">", val = parseFloat(m[2].replace(",", "."));
      var mt = k[1] === "rentabilidad" ? metric("rentabilidad", p || "y1") : metric(k[1], p);
      if (mt) res.push({ mt: mt, op: op, v: val });
    });
    var m2 = t.match(/calidad(?: crediticia)? (aaa|aa|a|bbb|bb|b|ccc)\b/); if (m2) res.push({ cal: m2[1].toUpperCase() });
    return res;
  }

  function filtros(t, p) {
    var fl = { tipo: null, cats: [], g: [], stars: null, idx: /indexad|\betf\b/.test(t), num: [] };
    if (/renta fija|\brf\b|bonos|deuda|credito/.test(t)) fl.tipo = "rf";
    if (/renta variable|\brv\b|bolsa|acciones/.test(t)) fl.tipo = "rv";
    CATW.forEach(function (c) { if (new RegExp(c[0]).test(t)) fl.cats.push(c[1]); });
    fl.g = gestoras(t);
    var m = t.match(/(\d)\s*(estrellas|\*)/); if (m) fl.stars = +m[1];
    if (/cinco estrellas/.test(t)) fl.stars = 5; if (/cuatro estrellas/.test(t)) fl.stars = 4;
    fl.num = numFilters(t, p);
    return fl;
  }
  function aplicar(fl) {
    return FN.filter(function (x) {
      var f = x.f;
      if (fl.tipo && f.t !== fl.tipo) return false;
      if (!fl.idx && f.idx) return false;
      if (fl.stars && !(f.stars >= fl.stars)) return false;
      if (fl.g.length && !fl.g.some(function (g) { return x.g.indexOf(g) >= 0; })) return false;
      for (var i = 0; i < fl.cats.length; i++) if (x.c.indexOf(fl.cats[i]) < 0) return false;
      for (var j = 0; j < fl.num.length; j++) {
        var n = fl.num[j];
        if (n.cal) { if (String(f.cal || "").toUpperCase() !== n.cal) return false; continue; }
        var v = n.mt.get(f); if (!isNum(v)) return false;
        if (n.op === "<" ? v > n.v : v < n.v) return false;
      }
      return true;
    }).map(function (x) { return x.f; });
  }
  function descFiltro(fl) {
    var a = [];
    if (fl.tipo) a.push(fl.tipo === "rf" ? "renta fija" : "renta variable");
    if (fl.cats.length) a.push("categoría «" + fl.cats.join(" ") + "»");
    if (fl.g.length) a.push("gestora " + fl.g.join("/"));
    if (fl.stars) a.push(fl.stars + "+ estrellas");
    fl.num.forEach(function (n) { a.push(n.cal ? "calidad " + n.cal : n.mt.lab.toLowerCase() + (n.op === "<" ? " ≤ " : " ≥ ") + nf(n.v, 2)); });
    return a.join(", ");
  }
  function hasFilter(fl) { return fl.tipo || fl.cats.length || fl.g.length || fl.stars || fl.num.length; }

  /* ---------- Búsqueda de fondo (tolera erratas) ---------- */
  var STOP = {}; "de del la el los las un una y o con en por para que cual cuales es son fondo fondos como va esta este mejor compara comparar comparame ver dime dame sobre sharpe vs frente tiene tengo cuanto cuantos cuanta cuantas coste patrimonio composicion rentabilidad volatilidad cartera carteras clase estrellas gestora categoria region sector duracion calidad vencimiento ficha informe comentario antiguedad creacion".split(" ").forEach(function (w) { STOP[w] = 1; });
  function lev1(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, d = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++d > 1) return false;
      if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
    }
    return d + (a.length - i) + (b.length - j) <= 1;
  }
  function tm(tok, text) {
    if (text.indexOf(tok) >= 0) return true;
    if (tok.length < 5) return false;
    var ws = text.split(" ");
    for (var i = 0; i < ws.length; i++) if (ws[i].length >= 4 && lev1(tok, ws[i])) return true;
    return false;
  }
  function buscarFondo(t, raw) {
    var isin = (raw || "").toUpperCase().match(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/);
    if (isin && byId(isin[0])) { var o = [byId(isin[0])]; o.best = 9; return o; }
    var toks = t.split(" ").filter(function (w) { return w.length >= 3 && !STOP[w]; });
    var none = []; none.best = 0;
    if (!toks.length) return none;
    var res = FN.map(function (x) {
      var hit = 0, hg = 0;
      toks.forEach(function (w) { if (tm(w, x.n)) hit++; else if (x.g.indexOf(w) >= 0) hg++; });
      return { f: x.f, s: hit * 2 + hg * 0.5, hit: hit, n: toks.length };
    }).filter(function (r) { return r.hit >= 1 && (r.hit >= 2 || r.n === 1 || r.hit / r.n >= 0.5); });
    res.sort(function (a, b) { return b.s - a.s; });
    if (!res.length) return none;
    var top = res[0].s;
    var out = res.filter(function (r) { return r.s >= top - 0.01; }).map(function (r) { return r.f; }).slice(0, 5);
    out.best = res[0].hit; return out;
  }

  /* ---------- Atributos de un fondo ---------- */
  function li(a) { return "<ul>" + a.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>"; }
  var ATTR = [
    [/composicion|reparto|distribucion|activos|cuanto tiene en (acciones|bonos|efectivo)|porcentaje (en )?(acciones|bonos)/, function (f) {
      var m = f.mix || []; return "Composición de la cartera: " + li(["Acciones " + pn(m[0], 1), "Bonos " + pn(m[1], 1), "Efectivo " + pn(m[2], 1), "Otros " + pn(m[3], 1)]); }],
    [/top 10|diez (mayores|principales)|concentrac/, function (f) { return "Las 10 mayores posiciones pesan <b>" + pn(f.top10, 1) + "</b>" + (isNum(f.nEq) && f.nEq > 0 ? " sobre " + nf(f.nEq, 0) + " valores." : isNum(f.nBo) && f.nBo > 0 ? " sobre " + nf(f.nBo, 0) + " bonos." : "."); }],
    [/posiciones|cuantos (valores|bonos|titulos)|numero de (valores|bonos)/, function (f) { return "Posiciones: " + (isNum(f.nEq) && f.nEq > 0 ? nf(f.nEq, 0) + " en renta variable" : "") + (isNum(f.nBo) && f.nBo > 0 ? (isNum(f.nEq) && f.nEq > 0 ? " y " : "") + nf(f.nBo, 0) + " en renta fija" : "") + "."; }],
    [/\bper\b|precio beneficio|flujo de caja|crecimiento esperado|valoracion/, function (f) { return "Valoración de la cartera: " + li(["PER " + dc(f.per, 1), "Precio / flujo de caja " + dc(f.pcf, 1), "Crecimiento esperado " + pn(f.gro, 1)]); }],
    [/capitalizacion|tamano de las empresas|small|gigante/, function (f) { var c = f.cap || [], l = ["Gigante", "Grande", "Mediana", "Pequeña", "Micro"]; return isNum(c[0]) || isNum(c[1]) ? "Capitalización de la cartera: " + li(l.map(function (x, i) { return x + " " + pn(c[i], 1); })) : "No hay datos de capitalización para este fondo."; }],
    [/region|pais|geografi|donde invierte/, function (f) { return f.reg ? "Principal región: <b>" + esc(f.reg[0]) + "</b> (" + pn(f.reg[1], 1) + ")." : "No hay dato de región para este fondo."; }],
    [/sector/, function (f) { return f.sec ? "Principal sector: <b>" + esc(f.sec[0]) + "</b> (" + pn(f.sec[1], 1) + ")." : "No hay dato de sector para este fondo."; }],
    [/calidad crediticia|rating crediticio|calificacion/, function (f) { return isNum(f.dur) || f.cal ? "Calidad crediticia media: <b>" + esc(f.cal || "–") + "</b>." : "No aplica a este fondo."; }],
    [/duracion/, function (f) { return isNum(f.dur) ? "Duración: <b>" + dc(f.dur, 2) + "</b> años." : "No hay duración para este fondo."; }],
    [/vencimiento/, function (f) { return isNum(f.vto) ? "Vencimiento medio: <b>" + dc(f.vto, 1) + "</b> años." : "No hay vencimiento para este fondo."; }],
    [/coste|comision|gastos|\bter\b|cuanto cobra|cobra/, function (f) { return "Coste (gastos corrientes): <b>" + esc(f.cost || "–") + "</b>."; }],
    [/creacion|antiguedad|antiguo|cuando (se )?(creo|lanzo)|desde cuando|edad|anos de historia/, function (f) { var y = years(f.cre); return "Creado el <b>" + esc(f.cre || "–") + "</b>" + (isNum(y) ? " (" + nf(y, 1) + " años de historia)." : "."); }],
    [/patrimonio|tamano del fondo|cuanto gestiona|aum/, function (f) { return "Patrimonio: fondo " + money(f.aum) + ", clase " + money(f.aumc) + "."; }],
    [/valor liquidativo|\bnav\b|precio del fondo|cotizacion/, function (f) { return "Valor liquidativo: <b>" + esc(f.nav || "–") + "</b> (a " + esc(f.nd || "–") + ")."; }],
    [/estrellas|rating|valoracion morningstar/, function (f) { return "Estrellas Morningstar: <b>" + (f.stars ? f.stars + " de 5" : "sin calificar") + "</b>. Rentabilidad " + esc(f.mrent || "–") + ", riesgo " + esc(f.mris || "–") + " (frente a su categoría)."; }],
    [/isin|codigo/, function (f) { return "ISIN: <b>" + esc(f.id) + "</b>."; }],
    [/gestora|quien lo gestiona|quien gestiona/, function (f) { return "Gestora: <b>" + esc(f.g) + "</b>."; }],
    [/categoria|que tipo de fondo|tipo de fondo/, function (f) { return "Categoría Morningstar: <b>" + esc(f.c) + "</b> (" + (f.t === "rf" ? "renta fija" : "renta variable") + ")" + (f.idx ? ", indexado." : "."); }],
    [/peor mes|mejor mes|meses (en )?positiv/, function (f) { var w = f.worst || [], p = f.pos || []; return "Peor mes: " + pn(w[0], 1) + " (1 año), " + pn(w[1], 1) + " (3 años). Meses en positivo: " + pn(p[0], 0) + " (1 año), " + pn(p[1], 0) + " (3 años)."; }],
    [/caida|drawdown|perdida maxima/, function (f) { var d = f.dd || []; return "Caída máxima: " + li(["1 año " + pn(d[0], 1), "3 años " + pn(d[1], 1), "5 años " + pn(d[2], 1), "Histórica " + pn(d[4], 1)]); }],
    [/\bbeta\b|\balpha\b|\balfa\b|\br2\b|r cuadrado/, function (f) { return "Frente a su referencia: beta <b>" + dc(f.beta) + "</b>, alpha <b>" + dc(f.alpha) + "</b>, R2 <b>" + dc(f.r2, 1) + "</b>."; }],
    [/sortino|\bmar\b|asimetria|skew|curtosis/, function (f) { return "Ratios (1, 3 y 5 años): " + li(["Sortino " + (f.sortino || []).map(function (v) { return dc(v); }).join(" · "), "MAR " + (f.mar || []).map(function (v) { return dc(v); }).join(" · "), "Asimetría " + (f.skew || []).map(function (v) { return dc(v); }).join(" · "), "Curtosis " + (f.kurt || []).map(function (v) { return dc(v); }).join(" · ")]); }],
    [/sharpe/, function (f) { var s = f.sharpe || []; return "Sharpe: <b>" + dc(s[0]) + "</b> (1 año), <b>" + dc(s[1]) + "</b> (3 años), <b>" + dc(s[2]) + "</b> (5 años)."; }],
    [/volatilidad|\bvol\b/, function (f) { var v = f.vol || []; return "Volatilidad: <b>" + pn(v[0], 1) + "</b> (1 año), <b>" + pn(v[1], 1) + "</b> (3 años), <b>" + pn(v[2], 1) + "</b> (5 años)."; }],
    [/puntuacion|score/, function (f) { var s = f.score || []; return "Puntuación global <b>" + dc(s[3]) + "</b> (1 año " + dc(s[0]) + ", 3 años " + dc(s[1]) + ", 5 años " + dc(s[2]) + ")."; }],
    [/comentario|opinion de la gestora|carta/, function (f) {
      var cm = (window.COMMENTS && window.COMMENTS[f.id]) || [];
      if (!cm.length) return "Todavía no hay comentarios de la gestora cargados para este fondo.";
      return cm.slice(0, 2).map(function (c) { return "<p><small>" + esc(c.d || "") + " · " + esc(c.s || "") + "</small><br>" + esc(c.t || "") + "</p>"; }).join(""); }],
    [/estado semanal|novedad|que ha cambiado|alerta/, function (f) {
      var e = window.ESTADO && window.ESTADO.fondos && window.ESTADO.fondos[f.id];
      if (!e) return "No hay estado semanal registrado para este fondo.";
      return "Estado semanal (" + esc(window.ESTADO.fecha || "") + "): sigma semanal <b>" + esc(e.sw == null ? "–" : e.sw) + "</b> y sigma mensual <b>" + esc(e.sm == null ? "–" : e.sm) + "</b>."; }],
    [/ficha|informe|enlace|morningstar|documento|x-?ray|kid/, function (f) {
      var a = []; if (f.ms) a.push('<a href="' + esc(f.ms) + '" target="_blank" rel="noopener">Morningstar</a>'); if (f.ficha) a.push('<a href="' + esc(f.ficha) + '" target="_blank" rel="noopener">Ficha (KID)</a>'); if (f.informe) a.push('<a href="' + esc(f.informe) + '" target="_blank" rel="noopener">Informe periódico</a>'); return a.length ? "Enlaces: " + a.join(" · ") : "No hay enlaces para este fondo."; }]
  ];
  function attrFor(t, f) {
    var y = yearOf(t);
    if (y) return "Rentabilidad de " + link(f) + " en <b>" + y + "</b>: <b>" + pc(annOf(f, y)) + "</b>.";
    if (/ano a ano|por anos|anual(es)?|historico de rentabilidad|calendario/.test(t) && f.ann) {
      return "Rentabilidad por año de " + link(f) + ":" + li(f.ann.map(function (v, i) { return isNum(v) ? (2026 - i) + (i === 0 ? " (hasta " + esc(META.annDate || "hoy") + ")" : "") + ": " + pc(v) : null; }).filter(Boolean));
    }
    var p = plazo(t);
    if (p && /rentab|gana|sube|rendimiento|%|como va|que tal/.test(t) && !/sharpe|vol|caida/.test(t)) return link(f) + ": rentabilidad <b>" + PL[p] + "</b> " + pc(f.ret[p]) + ".";
    for (var i = 0; i < ATTR.length; i++) if (ATTR[i][0].test(t)) return "<p>" + link(f) + "</p>" + ATTR[i][1](f);
    return null;
  }

  /* ---------- Respuestas ---------- */
  var DISC = '<p class="cfnote">Datos pasados de Morningstar (' + esc(META.rv || "") + "), no una recomendación.</p>";

  function ranking(t, fl, mt, n, peor) {
    var pool = aplicar(fl).filter(function (f) { return isNum(mt.get(f)); });
    if (!pool.length) return "No he encontrado fondos con esos criterios" + (hasFilter(fl) ? " (" + esc(descFiltro(fl)) + ")" : "") + ".";
    var hi = mt.hi;
    if (mt.neutral && /menor|menos|mas bajo|bajo|minim|pequeno|barato/.test(t)) hi = false;
    if (peor) hi = !hi;
    pool.sort(function (a, b) { return hi ? mt.get(b) - mt.get(a) : mt.get(a) - mt.get(b); });
    ctx.rank = { t: t, fl: fl, mt: mt, peor: peor };
    setFund(pool[0]);
    var rows = pool.slice(0, n).map(function (f) { return "<li>" + link(f) + "<small> " + esc(f.g) + " · " + esc(f.c) + "</small><b> " + mt.fmt(mt.get(f)) + "</b></li>"; }).join("");
    return "<p>" + (mt.neutral ? "Ranking" : peor ? "Peores" : "Mejores") + " por <b>" + esc(mt.lab.toLowerCase()) + "</b>" + (hasFilter(fl) ? " (" + esc(descFiltro(fl)) + ")" : "") + " · " + pool.length + (pool.length === 1 ? " fondo" : " fondos") + ":</p><ol>" + rows + "</ol>" + '<p class="cfnote">' + (fl.idx ? "" : "Sin fondos indexados. ") + "Datos pasados de Morningstar (" + esc(META.rv || "") + "), no una recomendación.</p>";
  }

  function resumenFondo(f) {
    setFund(f);
    var r = f.ret || {};
    return "<p>" + link(f) + "<br><small>" + esc(f.g) + " · " + esc(f.c) + (f.idx ? " · Indexado" : "") + "</small></p><ul>" +
      "<li>Rentabilidad: año " + pc(r.ytd) + ", 1 año " + pc(r.y1) + ", 3 años " + pc(r.y3) + ", 5 años " + pc(r.y5) + "</li>" +
      "<li>Riesgo: volatilidad 1 año " + pn(f.vol && f.vol[0], 1) + ", caída máxima " + pn(f.dd && f.dd[4], 1) + "</li>" +
      "<li>Sharpe 1 año " + dc(f.sharpe && f.sharpe[0]) + " y 3 años " + dc(f.sharpe && f.sharpe[1]) + "</li>" +
      "<li>Coste " + esc(f.cost || "–") + " · " + (f.stars ? f.stars + " estrellas" : "sin estrellas") + (f.aumc ? " · patrimonio clase " + money(f.aumc) : "") + "</li></ul>" + '<p class="cfnote">Puedes preguntarme por su composición, coste, caída máxima, rentabilidad por años o fondos parecidos.</p>';
  }

  function comparar(t) {
    var partes = t.replace(/^.*?(compara\w*|diferencia\w*|versus)\s*(entre\s+)?/, "").split(/\s+(?:y|con|vs|frente a|contra|e)\s+/).filter(Boolean);
    var fs = [];
    partes.forEach(function (p) { var r = buscarFondo(p, ""); if (r.length && fs.indexOf(r[0]) < 0) fs.push(r[0]); });
    if (fs.length === 1 && ctx.fund && ctx.fund !== fs[0] && /\b(lo|este|ese|el anterior)\b/.test(t)) fs.unshift(ctx.fund);
    if (fs.length < 2) return null;
    fs = fs.slice(0, 4); setFund(fs[0]);
    var filas = [["Rentab. año", function (f) { return pc(f.ret.ytd); }], ["Rentab. 1 año", function (f) { return pc(f.ret.y1); }], ["Rentab. 3 años", function (f) { return pc(f.ret.y3); }], ["Rentab. 5 años", function (f) { return pc(f.ret.y5); }], ["Volatilidad 1 año", function (f) { return pn(f.vol[0], 1); }], ["Sharpe 1 año", function (f) { return dc(f.sharpe[0]); }], ["Caída máxima", function (f) { return pn(f.dd[4], 1); }], ["Coste", function (f) { return esc(f.cost || "–"); }], ["Estrellas", function (f) { return f.stars || "–"; }]];
    return '<table class="cft"><thead><tr><th></th>' + fs.map(function (f) { return "<th>" + link(f) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      filas.map(function (r) { return "<tr><td>" + r[0] + "</td>" + fs.map(function (f) { return "<td>" + r[1](f) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>" +
      '<p><a href="#/comparar/' + fs.map(function (f) { return encodeURIComponent(f.id); }).join(",") + '">Abrir en el comparador completo →</a></p>';
  }

  function parecidos(f) {
    setFund(f);
    var l = FUNDS.filter(function (x) { return x !== f && x.c === f.c && !x.idx; });
    var nota = "";
    if (!l.length) {
      l = FUNDS.filter(function (x) { return x !== f && x.t === f.t && !x.idx && isNum(x.vol && x.vol[0]) && isNum(f.vol && f.vol[0]); });
      if (!l.length) return "No hay otros fondos comparables en el seguimiento.";
      l.sort(function (a, b) { return Math.abs(a.vol[0] - f.vol[0]) - Math.abs(b.vol[0] - f.vol[0]); });
      nota = " Es el único de su categoría, así que muestro los de " + (f.t === "rf" ? "renta fija" : "renta variable") + " con volatilidad más parecida.";
      return "<p>" + link(f) + " (" + esc(f.c) + ")." + nota + "</p>" + tablaPar(f, l.slice(0, 6)) + DISC;
    }
    l.sort(function (a, b) { return ((b.score && b.score[3]) || -9) - ((a.score && a.score[3]) || -9); });
    return "<p>Fondos de la misma categoría que " + link(f) + " (" + esc(f.c) + "):</p>" + tablaPar(f, l.slice(0, 6)) + DISC;
  }
  function tablaPar(f, l) {
    return '<table class="cft"><thead><tr><th></th><th>1 año</th><th>Vol. 1A</th><th>Sharpe</th><th>Coste</th></tr></thead><tbody>' +
      [f].concat(l).map(function (x) { return "<tr><td>" + (x === f ? "<b>" + esc(x.n) + "</b>" : link(x)) + "</td><td>" + pc(x.ret.y1, 1) + "</td><td>" + pn(x.vol[0], 1) + "</td><td>" + dc(x.sharpe[0]) + "</td><td>" + esc(x.cost || "–") + "</td></tr>"; }).join("") + "</tbody></table>";
  }

  /* ---------- Estadísticas de grupo ---------- */
  function groupBy(fn, list) { var o = {}; list.forEach(function (f) { var k = fn(f); (o[k] = o[k] || []).push(f); }); return o; }
  function stats(vals) { var s = 0; vals.forEach(function (v) { s += v; }); return { n: vals.length, mean: s / vals.length, min: Math.min.apply(null, vals), max: Math.max.apply(null, vals) }; }
  function agregados(t, fl, mt) {
    var porCat = /(categoria|categorias|gestora|gestoras)\s+(con|que tiene|tiene)\s+(mejor|peor|mayor|menor|mas|menos)|que (categoria|gestora)|mejor (categoria|gestora)|peor (categoria|gestora)/.test(t);
    var por = /gestora/.test(t) ? "g" : "c";
    var list = aplicar(fl);
    if (porCat && mt) {
      var gs = groupBy(function (f) { return f[por]; }, list), arr = [];
      Object.keys(gs).forEach(function (k) { var v = gs[k].map(mt.get).filter(isNum); if (v.length) arr.push({ k: k, s: stats(v) }); });
      var peor = /peor|menor|menos/.test(t), hi = mt.neutral ? !peor : (peor ? !mt.hi : mt.hi);
      arr.sort(function (a, b) { return hi ? b.s.mean - a.s.mean : a.s.mean - b.s.mean; });
      return "<p>Ranking de " + (por === "g" ? "gestoras" : "categorías") + " por <b>" + esc(mt.lab.toLowerCase()) + "</b> media:</p><ol>" + arr.slice(0, 6).map(function (a) { return "<li>" + esc(a.k) + "<small> " + a.s.n + " fondo" + (a.s.n > 1 ? "s" : "") + "</small><b> " + mt.fmt(a.s.mean) + "</b></li>"; }).join("") + "</ol>" + DISC;
    }
    if (/media|promedio|de media|medio/.test(t) && mt) {
      var v = list.map(mt.get).filter(isNum);
      if (!v.length) return "No hay datos suficientes para calcularlo.";
      var s = stats(v);
      return "<p><b>" + esc(mt.lab) + "</b>" + (hasFilter(fl) ? " (" + esc(descFiltro(fl)) + ")" : " (todos los fondos sin indexados)") + ":</p>" + li(["Media " + mt.fmt(s.mean), "Mínimo " + mt.fmt(s.min), "Máximo " + mt.fmt(s.max), "Fondos " + s.n]) + DISC;
    }
    if (/que categorias|lista de categorias|categorias hay|cuantas categorias|categorias disponibles/.test(t)) {
      var cs = groupBy(function (f) { return f.c; }, FUNDS), ks = Object.keys(cs).sort();
      return "<p>" + ks.length + " categorías:</p><ul>" + ks.map(function (k) { return "<li>" + esc(k) + " <small>" + cs[k].length + "</small></li>"; }).join("") + "</ul>";
    }
    if (/que gestoras|lista de gestoras|gestoras hay|cuantas gestoras|gestoras disponibles|gestora con mas fondos/.test(t)) {
      var gs2 = groupBy(function (f) { return f.g; }, FUNDS), kg = Object.keys(gs2).sort(function (a, b) { return gs2[b].length - gs2[a].length || (a < b ? -1 : 1); });
      return "<p>" + kg.length + " gestoras:</p><ul>" + kg.map(function (k) { return "<li>" + esc(k) + " <small>" + gs2[k].length + " fondo" + (gs2[k].length > 1 ? "s" : "") + "</small></li>"; }).join("") + "</ul>";
    }
    if (/cuantos fondos|numero de fondos|cuantos hay|cuantos son/.test(t)) {
      var all = hasFilter(fl) ? aplicar(fl) : FUNDS, rf = all.filter(function (f) { return f.t === "rf"; }).length;
      return "<p>" + (hasFilter(fl) ? "Con esos criterios (" + esc(descFiltro(fl)) + ") hay" : "Hay") + " <b>" + all.length + "</b> fondos: " + rf + " de renta fija y " + (all.length - rf) + " de renta variable" + (hasFilter(fl) ? "." : ", de " + Object.keys(groupBy(function (f) { return f.g; }, FUNDS)).length + " gestoras y " + Object.keys(groupBy(function (f) { return f.c; }, FUNDS)).length + " categorías.") + "</p>";
    }
    return null;
  }

  function resumenUniverso() {
    var nonIdx = FUNDS.filter(function (f) { return !f.idx; }), ytd = nonIdx.filter(function (f) { return isNum(f.ret.ytd); }).sort(function (a, b) { return b.ret.ytd - a.ret.ytd; });
    var rf = FUNDS.filter(function (f) { return f.t === "rf"; }).length;
    return "<p>Resumen del universo (" + esc(META.rv || "") + "):</p>" + li([FUNDS.length + " fondos: " + rf + " de renta fija y " + (FUNDS.length - rf) + " de renta variable",
      "Mejor del año: " + link(ytd[0]) + " " + pc(ytd[0].ret.ytd), "Peor del año: " + link(ytd[ytd.length - 1]) + " " + pc(ytd[ytd.length - 1].ret.ytd),
      "Rentabilidad media del año: " + pc(stats(ytd.map(function (f) { return f.ret.ytd; })).mean)]) + DISC;
  }

  /* ---------- Agenda, carteras, estado, nota, stocks ---------- */
  var DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  function agenda(t) {
    var A = window.AGENDA; if (!A || !A.dias) return "No hay agenda cargada.";
    var sel = [], tgt = null, d = new Date();
    if (/\bhoy\b/.test(t)) tgt = DIAS[d.getDay()];
    else if (/manana/.test(t)) tgt = DIAS[(d.getDay() + 1) % 7];
    DIAS.forEach(function (n) { if (t.indexOf(n) >= 0) tgt = n; });
    A.dias.forEach(function (x) { if (!tgt || norm(x.d).indexOf(tgt) === 0) sel.push(x); });
    var tipo = /subasta/.test(t) ? "sub" : /resultados|presenta|earnings/.test(t) ? "res" : null;
    var out = sel.map(function (x) {
      var es = x.e.filter(function (e) { return !tipo || e[0] === tipo; });
      return es.length ? "<p><b>" + esc(x.d) + "</b></p><ul>" + es.map(function (e) { return "<li>" + esc(e[1]) + "</li>"; }).join("") + "</ul>" : "";
    }).join("");
    if (!out) return "No hay eventos" + (tgt ? " para ese día" : "") + " en la agenda de la semana " + esc(A.semana || "") + ".";
    return "<p class='cfnote'>Semana " + esc(A.semana || "") + " (actualizada el " + esc(A.actualizado || "–") + ")</p>" + out;
  }
  function maxFondos(a) { return !isNum(a) || a <= 0 ? null : a < 60000 ? 6 : a <= 100000 ? 8 : a <= 300000 ? 10 : a <= 1000000 ? 15 : null; }
  function carteras(t) {
    var PF = []; try { PF = JSON.parse(localStorage.getItem("cf_carteras") || "[]"); } catch (e) { PF = []; }
    if (!PF.length) return '<p>No hay carteras guardadas en este navegador. Puedes crearlas o importarlas desde <a href="#/carteras">Carteras</a>.</p>';
    var pick = PF.filter(function (p) { return t.indexOf(norm(p.name)) >= 0; })[0];
    if (!pick && PF.length === 1) pick = PF[0];
    function wavg(p, get) { var s = 0, c = 0; p.lines.forEach(function (l) { var f = byId(l.id); if (!f || !(l.w > 0)) return; var v = get(f); if (isNum(v)) { s += l.w * v; c += l.w; } }); return c ? s / c : null; }
    if (!pick) return "<p>Tienes " + PF.length + " carteras guardadas:</p><ul>" + PF.map(function (p) { return "<li><a href=\"#/cartera/" + encodeURIComponent(p.id) + "\">" + esc(p.name) + "</a><small> " + p.lines.length + " fondos" + (p.amount ? " · " + nf(p.amount, 0) + " €" : "") + "</small></li>"; }).join("") + "</ul><p class='cfnote'>Pregunta por una por su nombre para ver su detalle.</p>";
    var mx = maxFondos(pick.amount), sw = pick.lines.reduce(function (a, l) { return a + (l.w || 0); }, 0);
    return "<p><a href=\"#/cartera/" + encodeURIComponent(pick.id) + "\">" + esc(pick.name) + "</a>" + (pick.amount ? " · " + nf(pick.amount, 0) + " €" : "") + "</p><ul>" +
      pick.lines.map(function (l) { var f = byId(l.id); return f ? "<li>" + link(f) + "<b> " + nf(l.w, 2) + " %</b></li>" : ""; }).join("") + "</ul>" +
      li(["Suma de pesos: " + nf(sw, 2) + " %", "Rentabilidad ponderada: año " + pc(wavg(pick, function (f) { return f.ret.ytd; })) + ", 1 año " + pc(wavg(pick, function (f) { return f.ret.y1; })),
        "Volatilidad 1 año ponderada: " + pn(wavg(pick, function (f) { return f.vol[0]; }), 1) + " · Sharpe " + dc(wavg(pick, function (f) { return f.sharpe[0]; })),
        "Coste medio ponderado: " + pn(wavg(pick, cost)), mx ? "Máximo de fondos para su importe: " + mx + " (tiene " + pick.lines.length + ")" + (pick.lines.length > mx ? ". Se supera el límite." : ".") : "Sin importe definido para calcular el máximo de fondos."]) + DISC;
  }
  function estadoNota(t) {
    if (/nota/.test(t)) {
      var n = window.NOTA && window.NOTA.actual;
      if (!n) return '<p>Todavía no hay nota diaria publicada. <a href="#/nota">Ir a Nota diaria →</a></p>';
      var vals = typeof n === "string" ? [n] : Object.keys(n).filter(function (k) { return typeof n[k] === "string"; }).map(function (k) { return n[k]; });
      return "<p><b>Nota diaria</b></p>" + vals.slice(0, 4).map(function (v) { return "<p>" + esc(v) + "</p>"; }).join("") + '<p><a href="#/nota">Ver completa →</a></p>';
    }
    var e = window.ESTADO; if (!e || !e.fondos) return '<p>Todavía no hay estado semanal publicado. <a href="#/estado">Ir a Estado →</a></p>';
    return "<p><b>Estado semanal</b> (" + esc(e.fecha || "") + "): sigma semanal y mensual de cada fondo, con los movimientos importantes resaltados.</p>" + '<p><a href="#/estado">Ver tabla →</a></p>';
  }
  function acciones(t) {
    var S = window.STOCKS || []; if (!S.length) return "No hay fichas de acciones cargadas.";
    var tt = t.split(" "), hit = null;
    S.forEach(function (s) { var tk = norm(s.t), w = norm(s.n).split(" ")[0]; if (tt.indexOf(tk) >= 0 || (w.length >= 4 && t.indexOf(w) >= 0)) hit = s; });
    function head(s) { return '<a href="#/accion/' + encodeURIComponent(s.t) + '">' + esc(s.n) + " (" + esc(s.t) + ")</a>"; }
    if (hit) {
      if (/que hace|explica|explicame|resumen|cliente|vale|como va|de que va/.test(t) && hit.cli) return "<p>" + head(hit) + "</p>" + String(hit.cli).split("\n").map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("");
      if (/tecnico|tecnica|analisis|ratings?/.test(t) && hit.tec) return "<p>" + head(hit) + "</p>" + li(hit.tec.slice(0, 9).map(function (r) { return esc(r[0]) + ": <b>" + esc(r[1]) + "</b>"; }));
      var at = [[/peg/, "PEG", isNum(hit.peg) ? dc(hit.peg) : "no calculable"], [/composite/, "Composite", hit.comp], [/\beps\b/, "EPS Rating", hit.eps], [/\brs\b|fuerza relativa/, "RS Rating", hit.rs], [/precio|cotiza|cuesta/, "Precio", dc(hit.px)], [/smr/, "SMR", hit.smr], [/acc\/?dis|acumulacion/, "Acc/Dis", hit.ad], [/grupo|industria|sector/, "Grupo", hit.g]];
      for (var i = 0; i < at.length; i++) if (at[i][0].test(t)) return "<p>" + head(hit) + "</p><p>" + at[i][1] + ": <b>" + esc(at[i][2]) + "</b> (ficha del " + esc(hit.f || "–") + ").</p>";
      return "<p>" + head(hit) + "<br><small>" + esc(hit.g) + "</small></p><ul><li>Precio " + dc(hit.px) + " · Composite " + esc(hit.comp) + " · EPS " + esc(hit.eps) + " · RS " + esc(hit.rs) + "</li><li>Acc/Dis " + esc(hit.ad) + " · SMR " + esc(hit.smr) + " · PEG " + (isNum(hit.peg) ? dc(hit.peg) : "no calculable") + "</li></ul><p class='cfnote'>Pregúntame «qué hace " + esc(hit.t) + "» o «análisis técnico de " + esc(hit.t) + "».</p>";
    }
    var key = /peg/.test(t) ? ["peg", "PEG", false] : /composite/.test(t) ? ["comp", "Composite", true] : /\beps\b/.test(t) ? ["eps", "EPS Rating", true] : /\brs\b/.test(t) ? ["rs", "RS Rating", true] : /precio/.test(t) ? ["px", "Precio", true] : null;
    var lst = S.slice(); if (key) lst = lst.filter(function (s) { return isNum(s[key[0]]); }).sort(function (a, b) { return key[2] ? b[key[0]] - a[key[0]] : a[key[0]] - b[key[0]]; });
    return "<p>" + S.length + " ficha" + (S.length > 1 ? "s" : "") + " de acciones" + (key ? " ordenadas por " + key[1] : "") + ":</p><ul>" + lst.slice(0, 10).map(function (s) { return "<li>" + head(s) + "<small> " + esc(s.g) + "</small><b> Comp " + esc(s.comp) + " · RS " + esc(s.rs) + (isNum(s.peg) ? " · PEG " + dc(s.peg) : "") + "</b></li>"; }).join("") + "</ul>";
  }
  function stockHit(t) {
    var S = window.STOCKS || [], tt = t.split(" ");
    return S.some(function (s) { var w = norm(s.n).split(" ")[0]; return tt.indexOf(norm(s.t)) >= 0 || (w.length >= 4 && t.indexOf(w) >= 0); });
  }

  var NAV = [
    [/amplitud/, "#/amplitud", "Amplitud de mercado (privado)"], [/renta fija|\brf\b/, "#/rf", "Renta fija"], [/renta variable|\brv\b/, "#/rv", "Renta variable"],
    [/stocks|acciones|stock/, "#/acciones", "Stocks"], [/carteras?\b/, "#/carteras", "Carteras"], [/comparador/, "#/comparar", "Comparador"],
    [/construir/, "#/construir", "Construir cartera (privado)"], [/recomendad/, "#/recomendadas", "Recomendadas"], [/estado/, "#/estado", "Estado"],
    [/nota/, "#/nota", "Nota diaria"], [/agenda/, "#/agenda", "Agenda"], [/gestion/, "#/gestion", "Gestión"], [/newsletter|suscrib|boletin/, "#/newsletter", "Newsletter"], [/privacidad/, "#/privacidad", "Política de privacidad"], [/inicio|principal|home/, "#/", "Inicio"]
  ];

  var AYUDA = "<p>Puedo responder con los datos de esta web. Algunos ejemplos:</p><ul>" +
    "<li><b>Rankings:</b> «mejores fondos de renta variable a 3 años», «fondos con menor volatilidad», «mayor patrimonio»</li>" +
    "<li><b>Filtros:</b> «renta fija con duración menor de 3 y coste menor de 1», «tecnología con 4 estrellas»</li>" +
    "<li><b>Un fondo:</b> «coste de Renta 4 Valor Relativo», «composición», «rentabilidad en 2022», «caída máxima»</li>" +
    "<li><b>Comparar y parecidos:</b> «compara A y B», «fondos parecidos a este»</li>" +
    "<li><b>Grupos:</b> «rentabilidad media de renta fija», «categoría con mejor Sharpe», «qué gestoras hay»</li>" +
    "<li><b>Otros:</b> «agenda de hoy», «mis carteras», «JFrog», «estado semanal», «qué es el Sharpe»</li></ul>";

  function numN(t) { var m = t.match(/\btop\s*(\d+)/) || t.match(/(\d+)\s*(?:mejores|peores|fondos)/) || t.match(/\blos\s+(\d+)\b/); var n = m ? +m[1] : (/\btodos\b/.test(t) ? 15 : 5); return Math.max(1, Math.min(15, n)); }

  function responder(q) {
    var t = norm(q);
    if (!t) return AYUDA;
    if (/^(hola|buenas|buenos dias|buenas tardes|hey|ayuda|que puedes hacer|que sabes|help|que me puedes preguntar|como funcionas)\b/.test(t) && t.length < 45) return AYUDA;
    if (/^(gracias|vale|ok|perfecto|genial|muchas gracias)\b/.test(t) && t.length < 25) return "A tu disposición.";

    if (/^(ir a|ve a|abre|abrir|llevame a|quiero ver|ensename|muestrame el apartado|donde esta)\b/.test(t) || /donde (esta|veo|encuentro)/.test(t))
      for (var j = 0; j < NAV.length; j++) if (NAV[j][0].test(t)) return '<p><a href="' + NAV[j][1] + '">Ir a ' + NAV[j][2] + " →</a></p>";

    var def = /que es|que son|que significa|explica|explicame|definicion|a que se refiere|para que sirve|como se interpreta|que mide|como se calcula|que quiere decir/.test(t), g;
    for (var i = 0; i < GLOS.length; i++) if (GLOS[i][0].test(t)) { g = GLOS[i]; break; }
    if (g && def && !(buscarFondo(t.replace(/renta fija|renta variable/g, " "), q).best >= 2)) return "<p><b>" + g[1] + "</b></p><p>" + g[2] + "</p>";

    if (/agenda|calendario|subasta|que hay (hoy|manana|el )|esta semana|resultados (de )?(empresas|esta semana|hoy|manana)|\b(lunes|martes|miercoles|jueves|viernes)\b/.test(t) && !/fondo/.test(t)) return agenda(t);
    if (/mis carteras|mi cartera|carteras guardadas|cartera guardada|cartera morningstar|cuantas carteras/.test(t)) return carteras(t);
    if (/estado semanal|nota diaria|nota del dia|resumen del dia|resumen semanal/.test(t)) return estadoNota(t);
    if (/resumen (del )?(universo|mercado|fondos)|panorama|como estan los fondos|vision general/.test(t)) return resumenUniverso();

    if (/compara|diferencia entre|versus/.test(t)) { var c = comparar(t); if (c) return c; }

    var p = plazo(t), fl = filtros(t, p), mt = metric(t, p);
    var tF = t.replace(/renta fija|renta variable|bolsa|bonos/g, " ").replace(/\s+/g, " ").trim();
    var enc = buscarFondo(tF, q), explicit = enc.length && (enc.best >= 2 || (!hasFilter(fl) && enc.length === 1 && enc.best >= 1 && t.split(" ").length <= 4));
    if (hasFilter(fl) && enc.best < 2) explicit = false;
    var pron = /\b(este|ese|el|su|sus|lo|y)\b/.test(t) && !explicit;
    var cid = curId(), base = explicit ? enc[0] : (cid && byId(cid)) || (pron && ctx.fund) || null;
    var corto = t.split(" ").length <= 7;

    if (/parecid|similar|alternativa|equivalente|mismo tipo|misma categoria|competencia/.test(t) && (explicit || base)) return parecidos(explicit ? enc[0] : base);

    var ag = agregados(t, fl, mt); if (ag) return ag;

    if ((/acciones|stock|stocks|composite|peg|eps rating|rs rating/.test(t) && !/fondo/.test(t) && !(explicit && enc.best >= 2)) || stockHit(t)) { var a = acciones(t); if (a) return a; }

    var rank = /mejor|mejores|peor|peores|\btop\b|ranking|mas rentable|menos riesgo|mas barato|barato|ordena|lista|menos volatil|mas estable|con mayor|con menor|con mejor|con menos|mas grande|mas antiguo|mas joven|mas concentrado|\b(mayor|menor|mas alto|mas alta|mas bajo|mas baja|maximo|minimo)\b|recomiend|aconsej|que fondo (compro|elijo|elegir|meto)/.test(t);

    if (explicit && !(rank && !/\bde\b|\bdel\b/.test(t))) {
      var ans = attrFor(t, enc[0]); setFund(enc[0]);
      if (ans) return ans;
      return resumenFondo(enc[0]);
    }
    if (base && !rank && (corto || /este fondo|este|ese fondo/.test(t)) && !(hasFilter(fl) && !pron)) {
      var an2 = attrFor(t, base); if (an2) { setFund(base); return an2; }
      if (/como va|que tal|resumen|dime|hablame|cuentame|que opinas|analiza|analisis|informacion|datos|ficha/.test(t) || (cid && !mt)) return resumenFondo(base);
      if (mt && !hasFilter(fl)) { setFund(base); var v = mt.get(base); return "<p>" + link(base) + ": <b>" + esc(mt.lab) + " " + mt.fmt(v) + "</b>.</p>"; }
    }

    if (ctx.rank && !hasFilter(fl) && corto && (p || /^y /.test(t)) && !rank && !explicit) {
      var base0 = ctx.rank.t.replace(/\b\d+ anos\b|\bytd\b|\b(un|1) ano\b/g, "");
      return ranking(base0, ctx.rank.fl, metric(base0, p) || ctx.rank.mt, 5, ctx.rank.peor);
    }

    if (rank || (mt && hasFilter(fl) && !explicit)) {
      if (!mt) mt = M("Puntuación global", function (f) { return f.score && f.score[3]; }, true, dc);
      return ranking(t, fl, mt, numN(t), /peor|peores|menos rentable/.test(t));
    }

    if (hasFilter(fl) && !explicit) {
      var lst = aplicar(fl);
      if (!lst.length) return "No he encontrado fondos con esos criterios (" + esc(descFiltro(fl)) + ").";
      lst.sort(function (a, b) { return (b.stars || 0) - (a.stars || 0); });
      return "<p>" + lst.length + " fondo" + (lst.length > 1 ? "s" : "") + " (" + esc(descFiltro(fl)) + "):</p><ul>" +
        lst.slice(0, 12).map(function (f) { return "<li>" + link(f) + "<small> " + esc(f.c) + "</small><b> " + (f.stars ? f.stars + " ★" : "") + "</b></li>"; }).join("") + "</ul>" + (lst.length > 12 ? "<p class='cfnote'>Y " + (lst.length - 12) + " más. Usa los filtros de la lista para verlos todos.</p>" : "");
    }

    if (enc.length === 1) return resumenFondo(enc[0]);
    if (enc.length > 1) return "<p>Hay varios fondos que encajan, ¿cuál?</p><ul>" + enc.map(function (f) { return "<li>" + link(f) + "<small> " + esc(f.g) + "</small></li>"; }).join("") + "</ul>";

    if (g) return "<p><b>" + g[1] + "</b></p><p>" + g[2] + "</p>";
    if (/amplitud|breadth/.test(t)) return '<p>Los datos de amplitud están en el apartado privado. <a href="#/amplitud">Ir a Amplitud →</a></p>';
    return "<p>No he entendido bien la pregunta. Solo conozco los datos de esta web y no tengo noticias ni información externa.</p>" + AYUDA;
  }

  /* ---------- Interfaz ---------- */
  var root = document.createElement("div");
  root.id = "cfbot";
  root.innerHTML = '<button type="button" class="cfb-btn" aria-label="Abrir asistente" title="Asistente"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg></button>' +
    '<section class="cfb-panel" hidden role="dialog" aria-label="Asistente"><header><b>Asistente</b><small>Responde con los datos de esta web</small><button type="button" class="cfb-x" aria-label="Cerrar">×</button></header>' +
    '<div class="cfb-log" aria-live="polite"></div><div class="cfb-chips"></div>' +
    '<form class="cfb-form"><input type="text" placeholder="Pregunta sobre fondos, ratios, agenda, carteras…" autocomplete="off" maxlength="220"><button type="submit">Enviar</button></form></section>';
  document.body.appendChild(root);
  var btn = root.querySelector(".cfb-btn"), panel = root.querySelector(".cfb-panel"), log = root.querySelector(".cfb-log"),
    form = root.querySelector(".cfb-form"), inp = form.querySelector("input"), chips = root.querySelector(".cfb-chips");

  function add(cls, html) { var d = document.createElement("div"); d.className = "cfb-m " + cls; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function ask(q) {
    q = String(q || "").trim(); if (!q) return;
    add("u", esc(q));
    var out; try { out = responder(q); } catch (e) { out = "<p>Algo ha fallado al procesar la pregunta. Prueba a reformularla.</p>"; }
    add("b", out);
  }
  var SUG = ["Mejores fondos de renta variable a 3 años", "Renta fija con menos volatilidad", "Agenda de esta semana", "Qué es el ratio de Sharpe", "Resumen del universo"];
  SUG.forEach(function (s) { var b = document.createElement("button"); b.type = "button"; b.textContent = s; b.onclick = function () { ask(s); }; chips.appendChild(b); });

  function open(v) {
    panel.hidden = !v; btn.classList.toggle("on", v);
    if (v) { if (!log.children.length) add("b", "<p>Hola. Pregúntame por los fondos de la web: rankings, filtros, datos de un fondo concreto, comparativas, medias por categoría, agenda, carteras o qué significa cada ratio.</p><p class='cfnote'>Respondo solo con los datos que tiene la página. No es una recomendación de inversión.</p>"); setTimeout(function () { inp.focus(); }, 30); }
  }
  btn.onclick = function () { open(panel.hidden); };
  root.querySelector(".cfb-x").onclick = function () { open(false); };
  form.onsubmit = function (e) { e.preventDefault(); var q = inp.value; inp.value = ""; ask(q); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) open(false); });
  log.addEventListener("click", function (e) { if (e.target.closest("a") && window.innerWidth < 640) open(false); });
  window.CFBOT = { ask: responder };
})();
