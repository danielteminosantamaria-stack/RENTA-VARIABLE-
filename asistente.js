/* Asistente local: responde dudas con los datos de la propia web. Sin IA externa, sin claves, sin enviar nada fuera. */
(function () {
  "use strict";
  var FUNDS = (window.DATA && window.DATA.funds) || [];
  var STOCKS = window.STOCKS || [];
  if (!FUNDS.length || document.getElementById("cfbot")) return;

  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function nf(v, d) { return v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function pc(v, d) { return isNum(v) ? (v > 0 ? "+" : "") + nf(v, d == null ? 2 : d) + " %" : "–"; }
  function pn(v, d) { return isNum(v) ? nf(v, d == null ? 2 : d) + " %" : "–"; }
  function dc(v, d) { return isNum(v) ? nf(v, d == null ? 2 : d) : "–"; }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9&%\s.]/g, " ").replace(/\s+/g, " ").trim(); }
  function cost(f) { var m = String(f.cost || "").replace(",", ".").match(/[\d.]+/); return m ? parseFloat(m[0]) : null; }
  function link(f) { return '<a href="#/fondo/' + encodeURIComponent(f.id) + '">' + esc(f.n) + "</a>"; }
  function curId() { var m = (location.hash || "").match(/^#\/fondo\/([^/]+)/); return m ? decodeURIComponent(m[1]) : null; }
  function byId(id) { for (var i = 0; i < FUNDS.length; i++) if (FUNDS[i].id === id) return FUNDS[i]; return null; }
  var FN = FUNDS.map(function (f) { return { f: f, n: norm(f.n), g: norm(f.g), c: norm(f.c) }; });

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
    [/indexado|indice/, "Fondo indexado", "Fondo que replica un índice. En la web aparece con la etiqueta Indexado y se excluye de las propuestas."],
    [/\bpeg\b/, "PEG", "Relación entre el P/E esperado y el crecimiento esperado del beneficio. Menos de 1 sugiere que el crecimiento no está en el precio; más de 1,5 o 2, que el mercado ya paga una prima."],
    [/composite|rs rating|eps rating|acc\/?dis|smr/, "Ratings de acciones", "Composite, EPS Rating y RS Rating van de 1 a 99 e indican la calidad global, del crecimiento de beneficios y de la fuerza relativa frente al mercado. Acc/Dis (A a E) mide si los grandes inversores compran o venden, y SMR (A a E) la calidad de ventas, márgenes y ROE."],
    [/amplitud|breadth/, "Amplitud de mercado", "Mide cuántas acciones acompañan la tendencia del índice. Los datos están en el apartado Amplitud, que es privado."],
    [/\btir\b/, "TIR", "Rentabilidad anual que obtendría un bono si se mantiene hasta el vencimiento y cobra todos sus pagos."]
  ];

  /* ---------- Periodos y métricas ---------- */
  function plazo(t) {
    if (/\b(ytd|este ano|en lo que va|del ano|en el ano|2026)\b/.test(t)) return "ytd";
    if (/\b10 anos\b|diez anos/.test(t)) return "y10";
    if (/\b5 anos\b|cinco anos/.test(t)) return "y5";
    if (/\b3 anos\b|tres anos/.test(t)) return "y3";
    if (/\b(1 ano|un ano|12 meses|doce meses)\b/.test(t)) return "y1";
    if (/\b6 meses\b|seis meses|semestre/.test(t)) return "m6";
    if (/\b3 meses\b|tres meses|trimestre/.test(t)) return "m3";
    if (/\b(1 mes|un mes|ultimo mes|este mes)\b/.test(t)) return "m1";
    if (/semana/.test(t)) return "w1";
    return null;
  }
  var PL = { ytd: "en el año", y1: "a 1 año", y3: "a 3 años (anualizada)", y5: "a 5 años (anualizada)", y10: "a 10 años (anualizada)", m6: "a 6 meses", m3: "a 3 meses", m1: "a 1 mes", w1: "en la semana" };
  function idx135(p) { return p === "y5" ? 2 : p === "y3" ? 1 : p === "y1" ? 0 : null; }

  function metric(t, p) {
    var i = idx135(p) == null ? 0 : idx135(p), lab = ["1 año", "3 años", "5 años"][i];
    if (/sortino/.test(t)) return { k: "so" + i, lab: "Sortino " + lab, get: function (f) { return f.sortino && f.sortino[i]; }, hi: true, fmt: function (v) { return dc(v); } };
    if (/sharpe|rentabilidad ajustada|relacion rentabilidad.?riesgo/.test(t)) return { k: "sh" + i, lab: "Sharpe " + lab, get: function (f) { return f.sharpe && f.sharpe[i]; }, hi: true, fmt: function (v) { return dc(v); } };
    if (/volatil|menos riesgo|mas estable|menos riesgoso|conservador|tranquilo/.test(t)) return { k: "vol" + i, lab: "Volatilidad " + lab, get: function (f) { return f.vol && f.vol[i]; }, hi: false, fmt: function (v) { return pn(v, 1); } };
    if (/caida|drawdown|perdida maxima/.test(t)) return { k: "dd", lab: "Caída máxima", get: function (f) { return f.dd && f.dd[4]; }, hi: true, fmt: function (v) { return pn(v, 1); } };
    if (/\balpha\b|\balfa\b/.test(t)) return { k: "alpha", lab: "Alpha", get: function (f) { return f.alpha; }, hi: true, fmt: function (v) { return dc(v); } };
    if (/barato|coste|comision|gastos/.test(t)) return { k: "cost", lab: "Coste", get: cost, hi: false, fmt: function (v) { return pn(v); } };
    if (/estrella/.test(t)) return { k: "stars", lab: "Estrellas", get: function (f) { return f.stars; }, hi: true, fmt: function (v) { return v + " ★"; } };
    if (p || /rentab|rendimiento|gana|sube|subido|mejor evolucion/.test(t)) {
      var pp = p || "y1";
      return { k: pp, lab: "Rentabilidad " + PL[pp], get: function (f) { return f.ret && f.ret[pp]; }, hi: true, fmt: function (v) { return pc(v); } };
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
    ["growth|crecimiento", "growth"], ["value|valor", "value"], ["global", "global"], ["japon", "japon"]
  ];
  var GALIAS = { "jp morgan": "jpmorgan", "jpm": "jpmorgan", "morgan stanley": "morgan stanley", "echiquier": "financiere", "threadneedle": "columbia", "goldman": "goldman", "t rowe": "t. rowe", "rowe price": "t. rowe", "edmond": "edmond", "blackrock": "blackrock", "ishares": "blackrock", "buy and hold": "buy & hold", "renta 4": "renta 4", "polar": "polar", "man group": "man group" };

  var GEN = { renta: 1, global: 1, buy: 1, morgan: 1, la: 1, man: 1 };
  function gestoras(t) {
    var out = [];
    Object.keys(GALIAS).forEach(function (a) { if (t.indexOf(a) >= 0 && out.indexOf(GALIAS[a]) < 0) out.push(GALIAS[a]); });
    var seen = {};
    FN.forEach(function (x) {
      if (seen[x.g]) return; seen[x.g] = 1;
      var full = new RegExp("(^|\\s)" + x.g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\s|$)").test(t);
      var w = x.g.split(" ")[0], first = w.length >= 5 && !GEN[w] && new RegExp("(^|\\s)" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(t);
      if ((full || first) && out.indexOf(x.g) < 0) out.push(x.g);
    });
    return out;
  }

  function filtros(t) {
    var fl = { tipo: null, cats: [], g: [], stars: null, idx: /indexad|\betf\b/.test(t) };
    if (/renta fija|\brf\b|bonos|deuda|credito/.test(t)) fl.tipo = "rf";
    if (/renta variable|\brv\b|bolsa|acciones/.test(t)) fl.tipo = "rv";
    CATW.forEach(function (c) { if (new RegExp(c[0]).test(t)) fl.cats.push(c[1]); });
    fl.g = gestoras(t);
    var m = t.match(/(\d)\s*(estrellas|\*)/); if (m) fl.stars = +m[1];
    if (/cinco estrellas/.test(t)) fl.stars = 5; if (/cuatro estrellas/.test(t)) fl.stars = 4;
    return fl;
  }
  function aplicar(fl) {
    return FN.filter(function (x) {
      var f = x.f;
      if (fl.tipo && f.t !== fl.tipo) return false;
      if (!fl.idx && f.idx) return false;
      if (fl.stars && !(f.stars >= fl.stars)) return false;
      if (fl.g.length && fl.g.indexOf(x.g) < 0 && !fl.g.some(function (g) { return x.g.indexOf(g) >= 0; })) return false;
      for (var i = 0; i < fl.cats.length; i++) if (x.c.indexOf(fl.cats[i]) < 0) return false;
      return true;
    }).map(function (x) { return x.f; });
  }
  function descFiltro(fl) {
    var a = [];
    if (fl.tipo) a.push(fl.tipo === "rf" ? "renta fija" : "renta variable");
    if (fl.cats.length) a.push("categoría «" + fl.cats.join(" ") + "»");
    if (fl.g.length) a.push("gestora " + fl.g.join("/"));
    if (fl.stars) a.push(fl.stars + "+ estrellas");
    return a.join(", ");
  }

  /* ---------- Búsqueda de fondo por nombre ---------- */
  var STOP = {}; "de del la el los las un una y o con en por para que cual cuales es son fondo fondos como va esta este mejor compara comparar comparame ver dime dame sobre sharpe vs frente".split(" ").forEach(function (w) { STOP[w] = 1; });
  function buscarFondo(t) {
    var toks = t.split(" ").filter(function (w) { return w.length >= 3 && !STOP[w]; });
    if (!toks.length) return [];
    var res = FN.map(function (x) {
      var hit = 0, hg = 0;
      toks.forEach(function (w) { if (x.n.indexOf(w) >= 0) hit++; else if (x.g.indexOf(w) >= 0) hg++; });
      return { f: x.f, s: hit * 2 + hg * 0.5, hit: hit, n: toks.length };
    }).filter(function (r) { return r.hit >= 1 && (r.hit >= 2 || r.n === 1 || r.hit / r.n >= 0.5); });
    res.sort(function (a, b) { return b.s - a.s; });
    if (!res.length) return [];
    var top = res[0].s;
    var out = res.filter(function (r) { return r.s >= top - 0.01; }).map(function (r) { return r.f; }).slice(0, 5);
    out.best = res[0].hit; return out;
  }

  /* ---------- Respuestas ---------- */
  function ranking(t, fl, mt, p) {
    var pool = aplicar(fl).filter(function (f) { return isNum(mt.get(f)); });
    if (!pool.length) return "No he encontrado fondos con esos criterios" + (descFiltro(fl) ? " (" + descFiltro(fl) + ")" : "") + ".";
    var peor = /peor|peores|menos rentable/.test(t);
    var hi = peor ? !mt.hi : mt.hi;
    pool.sort(function (a, b) { return hi ? mt.get(b) - mt.get(a) : mt.get(a) - mt.get(b); });
    var n = (t.match(/\b(?:top|los|las)?\s*(\d{1,2})\s*(?:mejores|peores|fondos)?/) || [])[1];
    n = /\btop\s*(\d+)/.test(t) ? +t.match(/\btop\s*(\d+)/)[1] : /(\d+)\s*(mejores|peores|fondos)/.test(t) ? +t.match(/(\d+)\s*(mejores|peores|fondos)/)[1] : 5;
    n = Math.max(1, Math.min(10, n));
    var rows = pool.slice(0, n).map(function (f, i) {
      return "<li>" + link(f) + '<small> ' + esc(f.g) + " · " + esc(f.c) + "</small><b> " + mt.fmt(mt.get(f)) + "</b></li>";
    }).join("");
    var h = "<p>" + (peor ? "Peores" : "Mejores") + " por <b>" + esc(mt.lab.toLowerCase()) + "</b>" + (descFiltro(fl) ? " (" + esc(descFiltro(fl)) + ")" : "") + ":</p><ol>" + rows + "</ol>";
    var ex = FUNDS.filter(function (f) { return f.idx; }).length;
    h += '<p class="cfnote">' + (fl.idx ? "" : "Sin fondos indexados. ") + "Son datos pasados de Morningstar (" + esc((window.DATA.meta || {}).rv || "") + "), no una recomendación.</p>";
    if (fl.cats.length && !fl.tipo) h += '<p class="cfnote">Para ver el reparto riesgo y rentabilidad, abre el gráfico de dispersión de la categoría.</p>';
    return h;
  }

  function resumenFondo(f) {
    var r = f.ret || {};
    var h = "<p>" + link(f) + "<br><small>" + esc(f.g) + " · " + esc(f.c) + (f.idx ? " · Indexado" : "") + "</small></p><ul>" +
      "<li>Rentabilidad: año " + pc(r.ytd) + ", 1 año " + pc(r.y1) + ", 3 años " + pc(r.y3) + ", 5 años " + pc(r.y5) + "</li>" +
      "<li>Riesgo: volatilidad 1 año " + pn(f.vol && f.vol[0], 1) + ", caída máxima " + pn(f.dd && f.dd[4], 1) + "</li>" +
      "<li>Sharpe 1 año " + dc(f.sharpe && f.sharpe[0]) + " y 3 años " + dc(f.sharpe && f.sharpe[1]) + "</li>" +
      "<li>Coste " + esc(f.cost || "–") + " · " + (f.stars ? f.stars + " estrellas" : "sin estrellas") + (f.aum ? " · patrimonio " + esc(f.aum) : "") + "</li></ul>";
    return h;
  }

  function comparar(t) {
    var partes = t.replace(/^.*?(compara\w*|diferencia\w*|versus)\s*/, "").split(/\s+(?:y|con|vs|frente a|contra|e)\s+/).filter(Boolean);
    var fs = [];
    partes.forEach(function (p) { var r = buscarFondo(p); if (r.length && fs.indexOf(r[0]) < 0) fs.push(r[0]); });
    if (fs.length < 2) return null;
    fs = fs.slice(0, 4);
    var filas = [["Rentab. año", function (f) { return pc(f.ret.ytd); }], ["Rentab. 1 año", function (f) { return pc(f.ret.y1); }], ["Rentab. 3 años", function (f) { return pc(f.ret.y3); }], ["Volatilidad 1 año", function (f) { return pn(f.vol[0], 1); }], ["Sharpe 1 año", function (f) { return dc(f.sharpe[0]); }], ["Caída máxima", function (f) { return pn(f.dd[4], 1); }], ["Coste", function (f) { return esc(f.cost || "–"); }], ["Estrellas", function (f) { return f.stars || "–"; }]];
    var h = '<table class="cft"><thead><tr><th></th>' + fs.map(function (f) { return "<th>" + link(f) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      filas.map(function (r) { return "<tr><td>" + r[0] + "</td>" + fs.map(function (f) { return "<td>" + r[1](f) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
    h += '<p><a href="#/comparar/' + fs.map(function (f) { return encodeURIComponent(f.id); }).join(",") + '">Abrir en el comparador completo →</a></p>';
    return h;
  }

  var NAV = [
    [/amplitud/, "#/amplitud", "Amplitud de mercado (privado)"], [/renta fija|\brf\b/, "#/rf", "Renta fija"], [/renta variable|\brv\b/, "#/rv", "Renta variable"],
    [/stocks|acciones|stock/, "#/acciones", "Stocks"], [/carteras?\b/, "#/carteras", "Carteras"], [/comparador/, "#/comparar", "Comparador"],
    [/construir/, "#/construir", "Construir cartera (privado)"], [/recomendad/, "#/recomendadas", "Recomendadas"], [/estado/, "#/estado", "Estado"],
    [/nota/, "#/nota", "Nota diaria"], [/agenda/, "#/agenda", "Agenda"], [/gestion/, "#/gestion", "Gestión"]
  ];

  function stock(t) {
    var tt = t.split(" ");
    for (var i = 0; i < STOCKS.length; i++) {
      var s = STOCKS[i], tk = norm(s.t), nm = norm(s.n);
      if (tt.indexOf(tk) >= 0 || (nm.length > 3 && t.indexOf(nm.split(" ")[0]) >= 0 && nm.split(" ")[0].length >= 4)) {
        return '<p><a href="#/accion/' + encodeURIComponent(s.t) + '">' + esc(s.n) + " (" + esc(s.t) + ")</a><br><small>" + esc(s.g) + "</small></p><ul><li>Precio " + dc(s.px) + " · Composite " + esc(s.comp) + " · EPS " + esc(s.eps) + " · RS " + esc(s.rs) + "</li><li>Acc/Dis " + esc(s.ad) + " · SMR " + esc(s.smr) + " · PEG " + (isNum(s.peg) ? dc(s.peg) : "no calculable") + "</li></ul>";
      }
    }
    return null;
  }

  var AYUDA = "<p>Puedo ayudarte con los datos de esta web. Prueba con:</p><ul><li>«Mejores fondos de renta variable a 3 años»</li><li>«Fondos de tecnología con más de 4 estrellas»</li><li>«Fondo de renta fija con menos volatilidad»</li><li>«Compara Renta 4 Valor Relativo y PIMCO»</li><li>«Fondos de M&amp;G»</li><li>«Qué es el ratio de Sharpe»</li><li>Estando en un fondo: «cómo va este fondo»</li></ul>";

  function responder(q) {
    var t = norm(q);
    if (!t) return AYUDA;
    if (/^(hola|buenas|buenos dias|buenas tardes|hey|ayuda|que puedes hacer|que sabes|help)\b/.test(t) && t.length < 40) return AYUDA;
    if (/^(gracias|vale|ok|perfecto)\b/.test(t)) return "A tu disposición.";

    var nv = /^(ir a|ve a|abre|abrir|llevame a|quiero ver|ensename|muestrame el apartado|donde esta)\b/.test(t) || /donde (esta|veo|encuentro)/.test(t);
    if (nv) for (var j = 0; j < NAV.length; j++) if (NAV[j][0].test(t)) return '<p><a href="' + NAV[j][1] + '">Ir a ' + NAV[j][2] + " →</a></p>";

    var def = /que es|que son|que significa|explica|explicame|definicion|a que se refiere|para que sirve|como se interpreta|que mide|como se calcula/.test(t);
    var g;
    for (var i = 0; i < GLOS.length; i++) if (GLOS[i][0].test(t)) { g = GLOS[i]; break; }
    if (g && (def || t.split(" ").length <= 3)) return "<p><b>" + g[1] + "</b></p><p>" + g[2] + "</p>";

    if (/compara|diferencia entre|versus/.test(t)) { var c = comparar(t); if (c) return c; }

    var cid = curId(), esteFondo = /\beste\b|\bel fondo\b|\beste fondo\b|\bactual\b/.test(t) && cid && byId(cid);
    var p = plazo(t), fl = filtros(t), mt = metric(t, p);
    var quiereRank = /mejor|mejores|peor|peores|\btop\b|ranking|mas rentable|menos riesgo|mas barato|barato|ordena|lista|menos volatil|mas estable|con mayor|con menor|con mejor|con menos/.test(t);

    if (esteFondo && !quiereRank) {
      var f0 = byId(cid);
      if (mt && !/mejor|peor/.test(t)) { var v = mt.get(f0); return "<p>" + link(f0) + ": <b>" + esc(mt.lab) + " " + mt.fmt(v) + "</b>.</p>"; }
      return resumenFondo(f0);
    }

    if (quiereRank || (mt && (fl.tipo || fl.cats.length || fl.g.length) && !buscarFondo(t).length)) {
      if (!mt) mt = { lab: "Puntuación global", get: function (f) { return f.score && f.score[3]; }, hi: true, fmt: function (v) { return dc(v); } };
      if (!fl.tipo && !fl.cats.length && !fl.g.length && !mt) return AYUDA;
      return ranking(t, fl, mt, p);
    }

    var s = stock(t); if (s) return s;

    var enc = buscarFondo(t);
    var hasF = fl.tipo || fl.cats.length || fl.g.length || fl.stars;
    if (hasF && !((enc.best || 0) >= 2)) enc = [];
    var soloGest = fl.g.length && (!enc.length || /fondos de|fondos (de la )?gestora|de la gestora|gestora/.test(t));
    if (soloGest || (!enc.length && hasF)) {
      var lst = aplicar(fl);
      if (!lst.length) return "No he encontrado fondos con esos criterios" + (descFiltro(fl) ? " (" + esc(descFiltro(fl)) + ")" : "") + ".";
      lst.sort(function (a, b) { return (b.stars || 0) - (a.stars || 0); });
      return "<p>" + lst.length + " fondo" + (lst.length > 1 ? "s" : "") + (descFiltro(fl) ? " (" + esc(descFiltro(fl)) + ")" : "") + ":</p><ul>" +
        lst.slice(0, 12).map(function (f) { return "<li>" + link(f) + "<small> " + esc(f.c) + "</small><b> " + (f.stars ? f.stars + " ★" : "") + "</b></li>"; }).join("") + "</ul>" + (lst.length > 12 ? "<p class='cfnote'>Y " + (lst.length - 12) + " más. Usa los filtros de la lista para verlos todos.</p>" : "");
    }

    if (enc.length === 1) return resumenFondo(enc[0]);
    if (enc.length > 1) return "<p>Hay varios fondos que encajan, ¿cuál?</p><ul>" + enc.map(function (f) { return "<li>" + link(f) + "<small> " + esc(f.g) + "</small></li>"; }).join("") + "</ul>";

    if (/cuantos fondos|numero de fondos|cuantos hay/.test(t)) {
      var rf = FUNDS.filter(function (f) { return f.t === "rf"; }).length;
      return "<p>Hay <b>" + FUNDS.length + "</b> fondos: " + rf + " de renta fija y " + (FUNDS.length - rf) + " de renta variable, de " + Object.keys(FUNDS.reduce(function (a, f) { a[f.g] = 1; return a; }, {})).length + " gestoras.</p>";
    }
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
    '<form class="cfb-form"><input type="text" placeholder="Pregunta sobre fondos, ratios, gestoras…" autocomplete="off" maxlength="200"><button type="submit">Enviar</button></form></section>';
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
  var SUG = ["Mejores fondos de renta variable a 3 años", "Renta fija con menos volatilidad", "Qué es el ratio de Sharpe", "Fondos de tecnología con 4 estrellas"];
  SUG.forEach(function (s) { var b = document.createElement("button"); b.type = "button"; b.textContent = s; b.onclick = function () { ask(s); }; chips.appendChild(b); });

  function open(v) {
    panel.hidden = !v; btn.classList.toggle("on", v);
    if (v) { if (!log.children.length) add("b", "<p>Hola. Pregúntame por los fondos de la web: rankings, comparativas, gestoras o qué significa cada ratio.</p><p class='cfnote'>Respondo solo con los datos que tiene la página. No es una recomendación de inversión.</p>"); setTimeout(function () { inp.focus(); }, 30); }
  }
  btn.onclick = function () { open(panel.hidden); };
  root.querySelector(".cfb-x").onclick = function () { open(false); };
  form.onsubmit = function (e) { e.preventDefault(); var q = inp.value; inp.value = ""; ask(q); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) open(false); });
  log.addEventListener("click", function (e) { if (e.target.closest("a")) { if (window.innerWidth < 640) open(false); } });
  window.CFBOT = { ask: responder };
})();
