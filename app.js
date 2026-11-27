(function () {
  "use strict";

  var DATA = window.DATA || { funds: [], meta: {} };
  var FUNDS = DATA.funds;
  (function () { var O = window.OVERRIDES || {}; FUNDS.forEach(function (f) { var o = O[f.id]; if (o) for (var k in o) f[k] = o[k]; }); })();
  var META = DATA.meta || {};
  var app = document.getElementById("app");

  var CATS = {
    rf: { title: "Renta fija", card: "Renta fija", top: "Renta fija" },
    rv: { title: "Renta variable", card: "Renta variable", top: "Renta variable" }
  };

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function nf(v, d) {
    return v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: "always" });
  }
  function pct(v, signed, d) {
    if (!isNum(v)) return "–";
    d = d == null ? 2 : d;
    var s = nf(Math.abs(v), d);
    if (v < 0) return "-" + s + "%";
    return (signed ? "+" : "") + s + "%";
  }
  function dec(v, d) { return isNum(v) ? nf(v, d == null ? 2 : d) : "–"; }
  function cls(v) { return !isNum(v) ? "muted" : v < 0 ? "neg" : v > 0 ? "pos" : ""; }
  function ret(v, d) { return '<span class="num ' + cls(v) + '">' + pct(v, true, d) + "</span>"; }
  function safeUrl(u) { return /^https:\/\//i.test(u || "") ? u : null; }
  function byId(id) { for (var i = 0; i < FUNDS.length; i++) if (FUNDS[i].id === id) return FUNDS[i]; return null; }
  function ofType(t) { return FUNDS.filter(function (f) { return f.t === t; }); }
  function initials(g) {
    var w = g.replace(/[^A-Za-zÀ-ÿ0-9& ]/g, "").split(/\s+/).filter(Boolean);
    if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
    return (w[0][0] + w[1][0]).toUpperCase();
  }
  function logoSlug(g) { return g.toLowerCase().replace(/&/g, "y").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function logoSrc(g) {
    var L = window.LOGOS || {}, D = window.LOGODOM || {};
    return L[g] ? "logos/" + L[g] : D[g] ? "https://www.google.com/s2/favicons?sz=128&domain=" + encodeURIComponent(D[g]) : null;
  }
  function logoOrInit(g) {
    var L = window.LOGOS || {}, D = window.LOGODOM || {}, src = L[g] ? "logos/" + L[g] : D[g] ? "https://www.google.com/s2/favicons?sz=128&domain=" + encodeURIComponent(D[g]) : null;
    return src ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.textContent=\'' + esc(initials(g)) + '\'">' : esc(initials(g));
  }
  function fLogo(g, now) { // icono de la gestora; now = cargar ya (PDF)
    return '<span class="flogo">' + (now ? logoOrInit(g).replace(' loading="lazy"', "") : logoOrInit(g)) + "</span>";
  }
  function vlTag(f) { var d = String(f.nd || ""); return d ? ' · <span class="vl" title="Fecha del valor liquidativo: ' + esc(d) + '">VL ' + esc(d.slice(0, 5)) + "</span>" : ""; }
  function icon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  }
  function footer(t) {
    var date = (t && META[t]) || META.rf || META.rv || "";
    return (window.NEWSLETTER && window.NEWSLETTER.mini ? window.NEWSLETTER.mini() : "") + '<footer class="foot"><span>Datos Morningstar a ' + esc(date) + '</span>' +
      '<span>Información orientativa. Las rentabilidades pasadas no garantizan resultados futuros.</span><a class="privlk" href="#/acceso" title="Acceso privado">' + (unlocked() ? "🔓" : "🔒") + '</a></footer>';
  }
  function matches(f, q) {
    var n = norm(q);
    if (!n) return true;
    return norm(f.n + " " + f.id + " " + f.g + " " + f.c).indexOf(n) !== -1;
  }
  function setTitle(t) { document.title = t ? t + " · Gestión de carteras" : "Gestión de carteras"; }

  // ---------- inicio ----------
  function topFive(t) {
    return ofType(t).filter(function (f) { return isNum(f.ret.ytd); })
      .sort(function (a, b) { return b.ret.ytd - a.ret.ytd; }).slice(0, 5);
  }
  function topList(t) {
    return '<div><p class="label">Top 5 en el año · ' + esc(CATS[t].top) + '</p><div class="list">' +
      topFive(t).map(function (f) {
        return '<a href="#/fondo/' + encodeURIComponent(f.id) + '"><span class="tln">' + fLogo(f.g) + '<em>' + esc(f.n) + '</em></span>' + ret(f.ret.ytd) + "</a>";
      }).join("") + "</div></div>";
  }
  function weekList(t, best) {
    var l = ofType(t).filter(function (f) { return isNum(f.ret.w1); })
      .sort(function (a, b) { return best ? b.ret.w1 - a.ret.w1 : a.ret.w1 - b.ret.w1; }).slice(0, 5);
    return "<div><p class=\"label\">" + (best ? "5 mejores" : "5 peores") + " de la semana · " + esc(CATS[t].top) + '</p><div class="list">' +
      l.map(function (f) { return '<a href="#/fondo/' + encodeURIComponent(f.id) + '"><span>' + esc(f.n) + "</span>" + ret(f.ret.w1) + "</a>"; }).join("") + "</div></div>";
  }
  var ICONS = {
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>', trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18M11 13v2h2v-2"/>',
    swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/><path d="M4 12h16" opacity=".35"/>',
    xray: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 15v-3M12 15V9M16 15v-5"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 12h8"/>',
    build: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="8"/>', compare: '<path d="M8 3v18M16 3v18"/><path d="M3 8h5M16 16h5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>'
  };
  function tile(href, ic, small, title, count) {
    return '<a class="tile" href="' + href + '"><span class="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[ic] + '</svg></span>' +
      '<span class="tt">' + (small ? "<small>" + esc(small) + "</small>" : "") + "<b>" + esc(title) + '</b></span><span class="cnt">' + esc(count) + '</span><span class="arrow" aria-hidden="true">→</span></a>';
  }
  function homeSection(title, tiles) { return '<h2 class="sec">' + esc(title) + '</h2><div class="tiles">' + tiles.join("") + "</div>"; }
  function heroHtml() {
    var gest = {}; FUNDS.forEach(function (f) { gest[f.g] = 1; });
    var stat = function (n, l) { return '<div class="hstat"><b>' + esc(String(n)) + "</b><span>" + esc(l) + "</span></div>"; };
    return '<header class="hero vis"><svg class="deco" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true"><path d="M0 190 C60 170 90 150 140 160 S230 120 290 110 380 130 430 80 530 40 600 20" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/><path d="M0 210 C70 195 110 185 170 180 S260 150 320 145 420 150 470 110 560 80 600 60" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="3"/></svg>' +
      '<h1>Gestión de carteras</h1><p class="lead">Rentabilidad, riesgo y ratios de los fondos en seguimiento, con datos de Morningstar.</p></header>';
  }
  function searchHtml() {
    return '<div class="search big">' + icon() + '<input id="q" type="search" placeholder="Buscar fondo por nombre o ISIN" autocomplete="off" aria-label="Buscar fondo"></div><div class="results" id="res"></div>';
  }
  function moversPanel(t) {
    var l = ofType(t).filter(function (f) { return isNum(f.ret.w1); }).sort(function (a, b) { return b.ret.w1 - a.ret.w1; });
    var pick = l.slice(0, 5).concat(l.slice(-5).reverse());
    if (!pick.length) return "";
    var mx = Math.max.apply(null, pick.map(function (f) { return Math.abs(f.ret.w1); })) || 1;
    return '<section class="mv"><h3>' + esc(CATS[t].top) + '</h3><p class="label">5 mejores y 5 peores de la semana</p>' + pick.map(function (f) {
      var w = Math.max(2, Math.abs(f.ret.w1) / mx * 100).toFixed(0);
      return '<a class="mvrow" href="#/fondo/' + encodeURIComponent(f.id) + '" title="' + esc(f.n + " · " + f.g) + '"><span class="mvn">' + fLogo(f.g) + '<em>' + esc(f.n) + '</em></span><span class="mvbar"><i class="' + (f.ret.w1 < 0 ? "neg" : "pos") + '" style="width:' + w + '%"></i></span>' + ret(f.ret.w1) + "</a>";
    }).join("") + "</section>";
  }
  function viewHome() {
    setTitle("");
    app.innerHTML =
      heroHtml() + searchHtml() +
      homeSection("Fondos Selección 50", [
        tile("#/rf", "chart", "", CATS.rf.card, ofType("rf").length + " fondos"),
        tile("#/rv", "trend", "", CATS.rv.card, ofType("rv").length + " fondos")
      ]) +
      homeSection("Carteras", [
        tile("#/construir", "pie", "🔒 Privado", "Construir cartera", "con el cliente"),
        tile("#/comparar", "swap", "Herramienta", "Comparador de fondos", "hasta " + CMP_MAX + " fondos"),
        tile("#/carteras", "brief", "Herramienta", "Xray", PF.length + (PF.length === 1 ? " cartera" : " carteras"))
      ]) +
      homeSection("Mercado y seguimiento", [
        tile("#/acciones", "bolt", "Explorar", "Stocks", stocks().length + (stocks().length === 1 ? " ficha" : " fichas")),
        tile("#/etf", "grid", "🔒 Privado", "ETF", "seguimiento y caídas"),
        tile("#/amplitud", "trend", "🔒 Privado", "Amplitud de mercado", "NYSE y gráficos"),
        tile("#/estado", "alert", "Cada lunes", "Estado de fondos", "sigmas de día, semana y mes"),
        tile("#/macro", "chart", "Para el cliente", "Macro", "gráficos y PDF"),
        tile("#/nota", "doc", "Cada día", "Nota diaria", "mercados y macro")
      ]) +
      '<h2 class="sec">Movimientos de la semana</h2><div class="movers">' + moversPanel("rf") + moversPanel("rv") + "</div>" +
      '<div class="tops">' + topList("rf") + topList("rv") + "</div>" +
      footer("rf");
    var q = document.getElementById("q"), res = document.getElementById("res");
    q.addEventListener("input", function () {
      var v = q.value.trim();
      if (!v) { res.innerHTML = ""; return; }
      var hits = FUNDS.filter(function (f) { return matches(f, v); }).slice(0, 8);
      res.innerHTML = hits.length
        ? '<div class="list">' + hits.map(function (f) {
          return '<a href="#/fondo/' + encodeURIComponent(f.id) + '">' + esc(f.n) +
            "<small>" + esc(f.g) + " · " + esc(f.id) + "</small></a>";
        }).join("") + "</div>"
        : '<div class="list"><div class="empty">Sin resultados</div></div>';
    });
  }

  // ---------- listado ----------
  var STORE = "cf_cols_";
  function P(k, l, g, v, o) { o = o || {}; return { k: k, l: l, g: g, v: v, u: o.u, d: o.d, sg: o.sg, txt: o.txt, only: o.only }; }
  var RET = { u: "%", sg: 1 };
  var METRICS = [
    P("tir", "TIR", "Cartera", function (f) { return f.tir; }, { u: "%", d: 2, only: "rf" }),
    P("dur", "Duración", "Cartera", function (f) { return f.dur; }, { d: 2, only: "rf" }),
    P("cal", "Calidad", "Cartera", function (f) { return f.cal; }, { txt: 1, only: "rf" }),
    P("w1", "1 semana", "Rentabilidad", function (f) { return f.ret.w1; }, RET),
    P("m1", "1 mes", "Rentabilidad", function (f) { return f.ret.m1; }, RET),
    P("m3", "3 meses", "Rentabilidad", function (f) { return f.ret.m3; }, RET),
    P("m6", "6 meses", "Rentabilidad", function (f) { return f.ret.m6; }, RET),
    P("ytd", "Año", "Rentabilidad", function (f) { return f.ret.ytd; }, RET),
    P("y1", "1 año", "Rentabilidad", function (f) { return f.ret.y1; }, RET),
    P("y3", "3 años", "Rentabilidad", function (f) { return f.ret.y3; }, RET),
    P("y5", "5 años", "Rentabilidad", function (f) { return f.ret.y5; }, RET),
    P("y10", "10 años", "Rentabilidad", function (f) { return f.ret.y10; }, RET),
    P("rmed", "Rent. media 3 años", "Rentabilidad", function (f) { return f.rmed; }, { u: "%", d: 2 }),
    P("sh1", "Sharpe 1 año", "Ratios", function (f) { return f.sharpe[0]; }),
    P("sh3", "Sharpe 3 años", "Ratios", function (f) { return f.sharpe[1]; }),
    P("sh5", "Sharpe 5 años", "Ratios", function (f) { return f.sharpe[2]; }),
    P("so1", "Sortino 1 año", "Ratios", function (f) { return f.sortino[0]; }),
    P("so3", "Sortino 3 años", "Ratios", function (f) { return f.sortino[1]; }),
    P("so5", "Sortino 5 años", "Ratios", function (f) { return f.sortino[2]; }),
    P("mar1", "MAR 1 año", "Ratios", function (f) { return f.mar[0]; }),
    P("mar3", "MAR 3 años", "Ratios", function (f) { return f.mar[1]; }),
    P("mar5", "MAR 5 años", "Ratios", function (f) { return f.mar[2]; }),
    P("alpha", "Alpha 3 años", "Ratios", function (f) { return f.alpha; }),
    P("beta", "Beta 3 años", "Ratios", function (f) { return f.beta; }),
    P("r2", "R² 3 años", "Ratios", function (f) { return f.r2; }, { d: 1 }),
    P("score", "Score", "Ratios", function (f) { return f.score && f.score[3]; }),
    P("vol1", "Vol. 1 año", "Riesgo", function (f) { return f.vol[0]; }, { u: "%", d: 1 }),
    P("vol3", "Vol. 3 años", "Riesgo", function (f) { return f.vol[1]; }, { u: "%", d: 1 }),
    P("vol5", "Vol. 5 años", "Riesgo", function (f) { return f.vol[2]; }, { u: "%", d: 1 }),
    P("ddmax", "Caída máxima", "Riesgo", function (f) { return f.dd[4]; }, { u: "%", d: 1 }),
    P("worst1", "Peor mes 1 año", "Riesgo", function (f) { return f.worst && f.worst[0]; }, { u: "%", d: 1 }),
    P("worst3", "Peor mes 3 años", "Riesgo", function (f) { return f.worst && f.worst[1]; }, { u: "%", d: 1 }),
    P("worst5", "Peor mes 5 años", "Riesgo", function (f) { return f.worst && f.worst[2]; }, { u: "%", d: 1 }),
    P("pos1", "Meses en positivo 1 año", "Riesgo", function (f) { return f.pos && f.pos[0]; }, { u: "%", d: 0 }),
    P("neg1", "Meses en negativo 1 año", "Riesgo", function (f) { return f.pos && isNum(f.pos[0]) ? 100 - Math.round(f.pos[0]) : null; }, { u: "%", d: 0 }),
    P("pos3", "Meses en positivo 3 años", "Riesgo", function (f) { return f.pos && f.pos[1]; }, { u: "%", d: 0 }),
    P("neg3", "Meses en negativo 3 años", "Riesgo", function (f) { return f.pos && isNum(f.pos[1]) ? 100 - Math.round(f.pos[1]) : null; }, { u: "%", d: 0 }),
    P("pos5", "Meses en positivo 5 años", "Riesgo", function (f) { return f.pos && f.pos[2]; }, { u: "%", d: 0 }),
    P("neg5", "Meses en negativo 5 años", "Riesgo", function (f) { return f.pos && isNum(f.pos[2]) ? 100 - Math.round(f.pos[2]) : null; }, { u: "%", d: 0 }),
    P("top10", "Peso top 10", "Otros", function (f) { return f.top10; }, { u: "%", d: 1 })
  ];
  var GROUPS = ["Rentabilidad", "Ratios", "Riesgo", "Distribución", "Cartera", "Otros"];
  var DEFAULTS = {
    rf: ["dur", "cal", "ytd", "y1", "y3", "y5", "y10", "vol1"],
    rv: ["ytd", "y1", "y3", "y5", "y10", "vol1"]
  };
  function metricsFor(t) { return METRICS.filter(function (m) { return !m.only || m.only === t; }); }
  function metric(k) { for (var i = 0; i < METRICS.length; i++) if (METRICS[i].k === k) return METRICS[i]; return null; }
  function fmtMetric(m, v, signed) {
    if (m.txt) return esc(v || "–");
    if (m.u === "%") return pct(v, signed, m.d == null ? 1 : m.d);
    return dec(v, m.d == null ? 2 : m.d);
  }
  function cell(f, m) {
    var v = m.v(f);
    if (m.txt) return '<span class="muted">' + esc(v || "–") + "</span>";
    if (m.u === "%" && m.sg) return ret(v, m.d);
    return '<span class="num">' + fmtMetric(m, v) + "</span>";
  }
  function loadCols(t) {
    var ok = metricsFor(t).map(function (m) { return m.k; }), saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE + t) || "null"); } catch (e) { saved = null; }
    if (Array.isArray(saved)) {
      saved = saved.filter(function (k) { return ok.indexOf(k) !== -1; });
      if (saved.length) return saved;
    }
    return DEFAULTS[t].slice();
  }
  function saveCols(t) { try { localStorage.setItem(STORE + t, JSON.stringify(state[t].cols)); } catch (e) { /* sin almacenamiento */ } }

  var state = {
    rf: { view: "list", g: null, cat: null, q: "", sort: "n", dir: 1, pick: false, cols: loadCols("rf") },
    rv: { view: "list", g: null, cat: null, q: "", sort: "n", dir: 1, pick: false, cols: loadCols("rv") },
    cx: "vol1", cy: "y1", front: true
  };

  function cols(t) {
    return state[t].cols.map(metric).filter(Boolean).map(function (m) {
      return { k: m.k, l: m.l, v: m.v, r: function (f) { return cell(f, m); } };
    });
  }

  function filtered(t) {
    var s = state[t];
    return ofType(t).filter(function (f) { return (!s.g || f.g === s.g) && (!s.cat || f.c === s.cat) && matches(f, s.q); });
  }
  function sorted(t, list) {
    var s = state[t], c = cols(t).filter(function (x) { return x.k === s.sort; })[0];
    var get = s.sort === "st" ? function (f) { return f.stars || null; } : s.sort === "n" ? function (f) { return f.n; } : c ? c.v : function (f) { return f.n; };
    return list.slice().sort(function (a, b) {
      var x = get(a), y = get(b);
      var nx = x == null || x === "" || (typeof x === "number" && !isNum(x));
      var ny = y == null || y === "" || (typeof y === "number" && !isNum(y));
      if (nx && ny) return 0;
      if (nx) return 1;
      if (ny) return -1;
      if (typeof x === "string") return s.dir * x.localeCompare(y, "es");
      return s.dir * (x - y);
    });
  }

  function viewList(t) {
    var s = state[t];
    setTitle(CATS[t].title);
    var groups = {};
    ofType(t).forEach(function (f) { groups[f.g] = (groups[f.g] || 0) + 1; });
    var cc = {};
    ofType(t).forEach(function (f) { if (f.c) cc[f.c] = (cc[f.c] || 0) + 1; });
    var cats = Object.keys(cc).sort(function (a, b) { return a.localeCompare(b, "es"); });

    app.innerHTML =
      '<div class="topbar"><a href="#/">← Inicio</a></div>' +
      '<div class="page-head"><h1>' + esc(CATS[t].title) + '</h1><div class="tools">' +
      '<div class="seg" role="group" aria-label="Vista">' +
      '<button type="button" data-view="list" aria-pressed="' + (s.view === "list") + '">Lista</button>' +
      '<button type="button" data-view="chart" aria-pressed="' + (s.view === "chart") + '">Gráfico</button></div>' +
      '<a class="link" href="#/' + t + '/resumen">Visión general</a></div></div>' +
      '<div class="catbar" role="group" aria-label="Categorías"><button type="button" class="catchip" data-cat="" aria-pressed="' + (!s.cat) + '">Todas <i>' + ofType(t).length + "</i></button>" + cats.map(function (c) {
        return '<button type="button" class="catchip" data-cat="' + esc(c) + '" aria-pressed="' + (s.cat === c) + '">' + esc(c) + " <i>" + cc[c] + "</i></button>";
      }).join("") + "</div>" +
      '<div class="filters"><div class="search">' + icon() +
      '<input id="q" type="search" placeholder="Buscar por nombre o ISIN" value="' + esc(s.q) + '" aria-label="Buscar fondo" autocomplete="off"></div>' +
      (s.view === "list" ? '<button type="button" class="chip" id="pickBtn" aria-expanded="' + s.pick + '">Columnas</button>' : "") + "</div>" +
      '<div class="picker" id="picker"' + (s.pick && s.view === "list" ? "" : " hidden") + "></div>" +
      '<div id="body"></div>' + footer(t);

    app.querySelectorAll("[data-view]").forEach(function (b) {
      b.addEventListener("click", function () { s.view = b.getAttribute("data-view"); viewList(t); });
    });
    app.querySelectorAll(".catchip").forEach(function (b) {
      b.addEventListener("click", function () {
        var c = b.getAttribute("data-cat");
        s.cat = c && s.cat !== c ? c : null;
        viewList(t);
      });
    });
    var q = document.getElementById("q");
    q.addEventListener("input", function () { s.q = q.value; renderBody(t); });
    var pb = document.getElementById("pickBtn");
    if (pb) {
      pb.addEventListener("click", function () {
        s.pick = !s.pick;
        pb.setAttribute("aria-expanded", String(s.pick));
        document.getElementById("picker").hidden = !s.pick;
        if (s.pick) renderPicker(t);
      });
      if (s.pick) renderPicker(t);
    }
    renderBody(t);
  }

  function renderPicker(t) {
    var s = state[t], el = document.getElementById("picker"), ms = metricsFor(t);
    if (!el) return;
    el.innerHTML = GROUPS.map(function (g) {
      var l = ms.filter(function (m) { return m.g === g; });
      if (!l.length) return "";
      return '<div class="pgroup"><p class="label">' + g + '</p><div class="chips">' + l.map(function (m) {
        return '<button type="button" class="chip" data-col="' + m.k + '" aria-pressed="' + (s.cols.indexOf(m.k) !== -1) + '">' + esc(m.l) + "</button>";
      }).join("") + "</div></div>";
    }).join("") + '<button type="button" class="chip" id="resetCols">Restablecer columnas</button>';
    el.querySelectorAll("[data-col]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-col"), i = s.cols.indexOf(k);
        if (i !== -1) { if (s.cols.length > 1) s.cols.splice(i, 1); } else s.cols.push(k);
        if (s.sort !== "n" && s.sort !== "st" && s.cols.indexOf(s.sort) === -1) { s.sort = "n"; s.dir = 1; }
        saveCols(t); renderPicker(t); renderBody(t);
      });
    });
    document.getElementById("resetCols").addEventListener("click", function () {
      s.cols = DEFAULTS[t].slice(); s.sort = "n"; s.dir = 1; saveCols(t); renderPicker(t); renderBody(t);
    });
  }

  function renderBody(t) {
    var s = state[t], body = document.getElementById("body");
    var list = filtered(t);
    if (!list.length) { body.innerHTML = '<div class="table-wrap"><div class="empty">Sin resultados</div></div>'; return; }
    if (s.view === "chart") {
      body.innerHTML = axisBar(t) + chart(t, list);
      ["cx", "cy"].forEach(function (id) {
        var el = document.getElementById(id);
        el.addEventListener("change", function () { state[id] = el.value; renderBody(t); document.getElementById(id).focus(); });
      });
      var pz = document.getElementById("plazo"), fr = document.getElementById("front");
      pz.addEventListener("change", function () { if (pz.value) { state.cx = "vol" + pz.value; state.cy = "y" + pz.value; } renderBody(t); });
      fr.addEventListener("change", function () { state.front = fr.checked; renderBody(t); });
      bindChart(t);
      return;
    }
    var c = cols(t), rows = sorted(t, list);
    function th(k, l, first) {
      var on = s.sort === k;
      return '<th scope="col"' + (on ? ' aria-sort="' + (s.dir > 0 ? "ascending" : "descending") + '"' : "") + '><button type="button" data-sort="' + k + '">' +
        l + (on ? (s.dir > 0 ? " ↑" : " ↓") : "") + "</button></th>";
    }
    body.innerHTML = '<div class="table-wrap"><table><thead><tr>' + th("n", "Fondo") + th("st", "Morningstar") +
      c.map(function (x) { return th(x.k, x.l); }).join("") + "</tr></thead><tbody>" +
      rows.map(function (f) {
        return '<tr data-id="' + esc(f.id) + '" tabindex="0"><td class="fund"><span class="flogo" aria-hidden="true">' + logoOrInit(f.g) + '</span><span class="ftxt"><b>' + esc(f.n) +
          (f.idx ? '<span class="tag">Indexado</span>' : "") + "</b><small>" + esc(f.g) + (f.c ? " · " + esc(f.c) : "") + vlTag(f) +
          "</small></span></td>" +
          '<td class="mst">' + (f.stars ? '<span role="img" aria-label="' + f.stars + ' de 5 estrellas">' + stars(f.stars) + "</span>" : '<span class="muted">–</span>') + "</td>" +
          c.map(function (x) { return "<td>" + x.r(f) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
    body.querySelectorAll("[data-sort]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-sort");
        if (s.sort === k) s.dir = -s.dir; else { s.sort = k; s.dir = k === "n" || k === "cal" ? 1 : -1; }
        renderBody(t);
      });
    });
    body.querySelectorAll("tbody tr").forEach(function (tr) {
      function go() { location.hash = "#/fondo/" + encodeURIComponent(tr.getAttribute("data-id")); }
      tr.addEventListener("click", go);
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    });
  }

  // ---------- gráfico ----------
  function ticks(min, max, n) {
    var span = max - min || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 5, 10].map(function (m) { return m * mag; }).filter(function (s) { return s >= raw; })[0];
    var out = [], v = Math.ceil(min / step) * step;
    for (; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
    return out;
  }
  function dd(arr) {
    return arr.reduce(function (a, v) { var s = String(v).split(".")[1]; return Math.max(a, s ? s.length : 0); }, 0);
  }
  function axisBar(t) {
    var ms = metricsFor(t).filter(function (m) { return !m.txt; });
    function sel(id, label, cur) {
      return '<label class="axis"><span class="muted">' + label + '</span><select id="' + id + '" aria-label="' + label + '">' +
        GROUPS.map(function (g) {
          var l = ms.filter(function (m) { return m.g === g; });
          return l.length ? '<optgroup label="' + g + '">' + l.map(function (m) {
            return '<option value="' + m.k + '"' + (m.k === cur ? " selected" : "") + ">" + esc(m.l) + "</option>";
          }).join("") + "</optgroup>" : "";
        }).join("") + "</select></label>";
    }
    var pl = { "1": ["vol1", "y1"], "3": ["vol3", "y3"], "5": ["vol5", "y5"] }, cur = "";
    Object.keys(pl).forEach(function (k) { if (state.cx === pl[k][0] && state.cy === pl[k][1]) cur = k; });
    var plazo = '<label class="axis"><span class="muted">Plazo (volatilidad y rentabilidad)</span><select id="plazo" aria-label="Plazo">' +
      '<option value=""' + (cur ? "" : " selected") + ">Personalizado</option>" +
      Object.keys(pl).map(function (k) { return '<option value="' + k + '"' + (cur === k ? " selected" : "") + ">" + k + (k === "1" ? " año" : " años") + "</option>"; }).join("") + "</select></label>";
    return '<div class="axes">' + plazo + sel("cx", "Eje X", state.cx) + sel("cy", "Eje Y", state.cy) +
      '<label class="axis frontchk"><input type="checkbox" id="front"' + (state.front ? " checked" : "") + '> <span>Frontera eficiente</span></label></div>';
  }
  function chart(t, list) {
    var mx = metric(state.cx) || metric("vol1"), my = metric(state.cy) || metric("y1");
    var pts = list.filter(function (f) { return isNum(mx.v(f)) && isNum(my.v(f)); });
    if (!pts.length) return '<div class="table-wrap"><div class="empty">No hay datos suficientes para este gráfico</div></div>';
    var W = 820, H = 440, L = 58, R = 18, T = 18, B = 46;
    var xs = pts.map(mx.v), ys = pts.map(my.v);
    function lo(a) { var m = Math.min.apply(null, a); return m < 0 ? m * 1.1 : 0; }
    function hi(a) { var m = Math.max.apply(null, a); return m > 0 ? m * 1.08 : 0.1; }
    var x0 = lo(xs), x1 = hi(xs), y0 = lo(ys), y1 = hi(ys);
    function X(v) { return L + (v - x0) / (x1 - x0) * (W - L - R); }
    function Y(v) { return H - B - (v - y0) / (y1 - y0) * (H - T - B); }
    function lab(m, v, d) { return nf(v, d) + (m.u === "%" ? "%" : ""); }
    var g = "", ty = ticks(y0, y1, 5), tx = ticks(x0, x1, 6), dy = dd(ty), dx = dd(tx);
    ty.forEach(function (v) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + (v === 0 ? "#bdbdbd" : "#e0e0e0") + '"/>' +
        '<text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" fill="#717171" font-size="11">' + lab(my, v, dy) + "</text>";
    });
    tx.forEach(function (v) {
      g += '<text x="' + X(v) + '" y="' + (H - B + 18) + '" text-anchor="middle" fill="#717171" font-size="11">' + lab(mx, v, dx) + "</text>";
    });
    if (x0 < 0) g += '<line y1="' + T + '" y2="' + (H - B) + '" x1="' + X(0) + '" x2="' + X(0) + '" stroke="#bdbdbd"/>';
    g += '<text x="' + (L + (W - L - R) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" fill="#717171" font-size="11">' + esc(mx.l) + "</text>";
    g += '<text transform="translate(14 ' + (T + (H - T - B) / 2) + ') rotate(-90)" text-anchor="middle" fill="#717171" font-size="11">' + esc(my.l) + "</text>";
    var fr = [], note = "";
    if (state.front) {
      if (!state[t].cat) note = "La frontera eficiente solo se calcula dentro de una misma categoría: elige una categoría arriba.";
      else if (pts.length < 3) note = "Hay menos de 3 fondos con datos en esta categoría, así que no se dibuja la frontera.";
      else if (mx.g === "Riesgo" && my.g !== "Riesgo") {
        var srt = pts.slice().sort(function (a, b) { return mx.v(a) - mx.v(b) || my.v(b) - my.v(a); }), best = -Infinity;
        srt.forEach(function (f) { if (my.v(f) > best) { fr.push(f); best = my.v(f); } });
        if (fr.length > 1) {
          g += '<polygon class="efarea" points="' + fr.map(function (f) { return X(mx.v(f)).toFixed(1) + "," + Y(my.v(f)).toFixed(1); }).join(" ") + " " + X(mx.v(fr[fr.length - 1])).toFixed(1) + "," + Y(y0).toFixed(1) + " " + X(mx.v(fr[0])).toFixed(1) + "," + Y(y0).toFixed(1) + '"/>';
        }
        g += '<polyline class="efline" fill="none" points="' + fr.map(function (f) { return X(mx.v(f)).toFixed(1) + "," + Y(my.v(f)).toFixed(1); }).join(" ") + '"/>';
      } else note = "La frontera eficiente necesita un eje X de riesgo (volatilidad) y un eje Y de rentabilidad.";
    }
    var efIds = {}; fr.forEach(function (f) { efIds[f.id] = 1; });
    g += '<defs><clipPath id="lgclip"><circle r="11"/></clipPath></defs>';
    pts.slice().sort(function (p, q) { return (efIds[p.id] ? 1 : 0) - (efIds[q.id] ? 1 : 0); }).forEach(function (f) {
      var src = logoSrc(f.g), ef = !!efIds[f.id];
      g += '<g class="dot' + (ef ? " ef" : "") + '" tabindex="0" role="link" aria-label="' + esc(f.n) + '" data-id="' + esc(f.id) + '" transform="translate(' + X(mx.v(f)).toFixed(1) + " " + Y(my.v(f)).toFixed(1) + ')">' +
        (ef ? '<circle class="dhalo" r="17"/>' : "") + '<circle class="dbg" r="11"/><text class="dini" y="3" text-anchor="middle">' + esc(initials(f.g)) + "</text>" +
        (src ? '<image href="' + esc(src) + '" x="-11" y="-11" width="22" height="22" clip-path="url(#lgclip)" preserveAspectRatio="xMidYMid slice" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'"/>' : "") + '<circle class="dring" r="11"/></g>';
    });
    return '<div class="chart-card"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(my.l) + " frente a " + esc(mx.l) + '">' + g + "</svg>" +
      '<div class="tip" id="tip"></div>' +
      '<div class="legend"><span>Cada punto lleva el icono de su gestora</span><span>' + pts.length + " de " + list.length + " fondos con datos</span>" + (fr.length ? '<span><i class="efi"></i>Frontera eficiente</span><span><i class="efring"></i>Fondo en la frontera</span>' : "") + "</div>" +
      (fr.length ? '<div class="eflist"><b>Fondos en la frontera (menos riesgo a más riesgo):</b> ' + fr.map(function (f) { return '<a href="#/fondo/' + encodeURIComponent(f.id) + '">' + esc(f.n) + "</a> (" + nf(mx.v(f), 1) + "%, " + nf(my.v(f), 1) + "%)"; }).join(" · ") +
        '<p class="note">Un fondo está en la frontera cuando ningún otro ofrece más rentabilidad con igual o menos volatilidad, dentro de los fondos que se muestran (respeta el filtro de categoría). Es una comparación de datos pasados, no una recomendación.</p></div>' : "") + (note ? '<p class="note">' + esc(note) + "</p>" : "") + "</div>";
  }
  function bindChart() {
    var card = document.querySelector(".chart-card"), tip = document.getElementById("tip");
    if (!card) return;
    card.querySelectorAll(".dot").forEach(function (d) {
      var f = byId(d.getAttribute("data-id"));
      function show(e) {
        var box = card.getBoundingClientRect(), r = d.getBoundingClientRect();
        var mx = metric(state.cx), my = metric(state.cy);
        tip.innerHTML = "<b>" + esc(f.n) + "</b><br>" + esc(f.g) + "<br>" + esc(my.l) + " " + fmtMetric(my, my.v(f), my.sg) + "<br>" + esc(mx.l) + " " + fmtMetric(mx, mx.v(f), mx.sg);
        tip.style.display = "block";
        tip.style.left = Math.min(r.left - box.left + 14, box.width - 270) + "px";
        tip.style.top = (r.top - box.top - 64) + "px";
      }
      d.addEventListener("mouseenter", show);
      d.addEventListener("focus", show);
      d.addEventListener("mouseleave", function () { tip.style.display = "none"; });
      d.addEventListener("blur", function () { tip.style.display = "none"; });
      d.addEventListener("click", function () { location.hash = "#/fondo/" + encodeURIComponent(f.id); });
      d.addEventListener("keydown", function (e) { if (e.key === "Enter") location.hash = "#/fondo/" + encodeURIComponent(f.id); });
    });
  }

  // ---------- visión general ----------
  function viewOverview(t) {
    setTitle(CATS[t].title + " · Visión general");
    var by = {};
    ofType(t).forEach(function (f) { (by[f.c] = by[f.c] || []).push(f); });
    var rows = Object.keys(by).map(function (c) {
      var l = by[c], ys = l.filter(function (f) { return isNum(f.ret.ytd); });
      var avg = ys.length ? ys.reduce(function (a, f) { return a + f.ret.ytd; }, 0) / ys.length : null;
      var best = ys.slice().sort(function (a, b) { return b.ret.ytd - a.ret.ytd; })[0];
      return { c: c, n: l.length, avg: avg, best: best };
    }).sort(function (a, b) { return b.n - a.n || a.c.localeCompare(b.c, "es"); });
    app.innerHTML =
      '<div class="topbar"><a href="#/' + t + '">← ' + esc(CATS[t].title) + '</a></div>' +
      '<div class="page-head"><h1>Visión general</h1></div>' +
      '<p class="muted" style="margin:-8px 0 20px">' + esc(CATS[t].title) + " por categoría Morningstar. Rentabilidad del año: media simple de los fondos de la categoría.</p>" +
      '<div class="ov">' + rows.map(function (r) {
        return '<div class="ov-row"><div><b>' + esc(r.c) + "</b><small>" + r.n + (r.n === 1 ? " fondo" : " fondos") + "</small></div>" +
          '<div><small>Media del año</small>' + ret(r.avg) + "</div>" +
          '<div><small>Mejor del año</small>' + (r.best ? ret(r.best.ret.ytd) : "–") + "</div>" +
          "<div>" + (r.best ? '<a href="#/fondo/' + encodeURIComponent(r.best.id) + '">' + esc(r.best.n) + "</a>" : "") + "</div></div>";
      }).join("") + "</div>" + footer(t);
  }

  // ---------- ficha ----------
  function kpi(l, v, hi) { return '<div class="kpi' + (hi ? " hi" : "") + '"><small>' + l + "</small><span>" + v + "</span></div>"; }
  function bar(label, v, max, kind, text) {
    var w = isNum(v) ? Math.min(100, Math.abs(v) / (max || 1) * 100) : 0;
    return '<div class="bar"><span>' + esc(label) + '</span><div class="track"><div class="fill ' + (kind || "") + '" style="width:' + w.toFixed(1) + '%"></div></div><span class="v num">' + text + "</span></div>";
  }
  function fact(k, v) { return "<dt>" + esc(k) + "</dt><dd>" + v + "</dd>"; }
  function money(s) {
    var m = /^([\d,]+(?:\.\d+)?)\s*([A-Z]{3})$/.exec(String(s || "").trim());
    if (!m) return esc(s);
    return nf(parseFloat(m[1].replace(/,/g, "")), 2) + " M " + m[2];
  }
  function money2(s) {
    var m = /^([A-Z]{3})\s*([\d,]+(?:\.\d+)?)$/.exec(String(s || "").trim());
    return m ? nf(parseFloat(m[2].replace(/,/g, "")), 2) + " " + m[1] : esc(s);
  }
  function stars(n) { return n ? "★".repeat(n) + '<span class="muted">' + "★".repeat(5 - n) + "</span>" : null; }

  function viewFund(id) {
    var f = byId(id);
    if (!f) { viewNotFound(); return; }
    setTitle(f.n);
    var r = f.ret, html = '<div class="fundpg">', TB = { res: "", ris: "", car: "", dat: "" };
    html += '<div class="topbar"><a href="#/' + f.t + '">← ' + esc(CATS[f.t].title) + '</a></div>';
    var fsg = ESP.map(function (p) { var n = esSig(f, p); return n === null ? "" : '<span class="fsg' + esLvl(n) + (n < 0 ? " neg" : "") + '" title="' + p[1] + ": " + esSg(n) + ' sigmas"><em>' + p[3] + "</em>" + esSg(n) + "</span>"; }).join("");
    html += '<header class="fhero"><span class="flogo big">' + logoOrInit(f.g) + '</span><div class="fhm"><h1 class="h1star">' + esc(f.n) + ' <span class="isin">' + esc(f.id) + "</span></h1>" +
      '<p class="fchips"><a class="fchip" href="#/gestora/' + encodeURIComponent(f.g) + '">' + esc(f.g) + '</a><span class="fchip alt">' + esc(f.c) + '</span><span class="fchip ' + f.t + '">' + (f.t === "rf" ? "Renta fija" : "Renta variable") + "</span>" +
      (f.stars ? '<span class="fchip star">' + "★".repeat(f.stars) + "</span>" : "") + (f.idx ? '<span class="fchip">Indexado</span>' : "") + (f.nd ? '<span class="fchip vl">VL ' + esc(String(f.nd).slice(0, 5)) + "</span>" : "") + "</p>" +
      (fsg ? '<p class="fsgs"><a href="#/estado">Sigmas</a>' + fsg + "</p>" : "") + "</div></header>";
    html += '<div class="row tools2" id="fundtools"></div><div class="kpis">' +
      kpi("Vol. 1 año", pct(f.vol[0], false, 1), true) + kpi("Sharpe 1 año", dec(f.sharpe[0]), true) +
      kpi("Último mes", ret(r.m1)) + kpi("Año", ret(r.ytd)) + kpi("1 año", ret(r.y1)) +
      kpi("3 años", ret(r.y3)) + kpi("5 años", ret(r.y5)) + kpi("10 años", ret(r.y10)) + "</div>";
    html += '<p class="note">Rentabilidad de la clase en euros. A 3, 5 y 10 años, anualizada. Fuente: Morningstar, valor liquidativo a ' + esc(f.nd) + ". La rentabilidad de la semana cubre los 7 días naturales hasta esa fecha.</p>";

    var docs = [["xray", "X-Ray", "Morningstar"], ["ms", "Morningstar", "Ficha online"]]
      .filter(function (d) { return safeUrl(f[d[0]]); })
      .map(function (d) { return '<a class="doc" href="' + esc(f[d[0]]) + '" target="_blank" rel="noopener noreferrer">' + d[1] + "<small>" + d[2] + "</small></a>"; });
    docs.push('<a class="doc" href="#/comparar/' + encodeURIComponent(f.id) + '">Comparar<small>Con otros fondos</small></a>');
    if (false && PF.length) docs.push('<span class="doc addpf">Añadir a cartera<small><select id="addpf" aria-label="Cartera">' + PF.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + "</option>"; }).join("") + '</select> <button type="button" id="addpfBtn" class="btn sm">Añadir</button></small></span>');
    html += '<div class="docs">' + docs.join("") + "</div>";

    // Rentabilidad por año
    if (f.ann && f.ann.some(isNum)) {
      var years = [], base = 2025;
      f.ann.forEach(function (v, i) { years.push([i === 0 ? "2026 (" + String(META.annDate || "").slice(0, 5) + ")" : String(base - (i - 1)), v]); });
      var mx = Math.max.apply(null, years.map(function (y) { return isNum(y[1]) ? Math.abs(y[1]) : 0; })) || 1;
      var yv = years.filter(function (y) { return isNum(y[1]); }).reverse(), CW = 560, CH = 290, cb = 190, cmax = Math.max.apply(null, yv.map(function (y) { return Math.abs(y[1]); })) || 1, cneg = yv.some(function (y) { return y[1] < 0; }), base = cneg ? 150 : 215, ph = cneg ? 115 : 185, cwd = (CW - 20) / yv.length;
      TB.res += '<section class="block"><h3>Rentabilidad por año</h3><svg viewBox="0 0 ' + CW + " " + (CH + 10) + '" width="100%" role="img" aria-label="Rentabilidad por año"><line x1="10" x2="' + (CW - 10) + '" y1="' + base + '" y2="' + base + '" stroke="#bbb"/>' + yv.map(function (y, k) {
        var h = Math.max(2, Math.abs(y[1]) / cmax * ph), x = 10 + k * cwd + cwd * 0.18, w = cwd * 0.64, up = y[1] >= 0;
        return '<rect x="' + x.toFixed(1) + '" y="' + (up ? base - h : base).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="' + (up ? "#1e7a4a" : "#b3261e") + '"/>' +
          '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (up ? base - h - 6 : base + h + 14).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#222">' + nf(y[1], 1) + "%</text>" +
          '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (CH - 2) + '" text-anchor="middle" font-size="11" fill="#666">' + esc(String(y[0]).replace(/ \(.*$/, "*")) + "</text>";
      }).join("") + '</svg><p class="note">* Año en curso hasta ' + esc(String(META.annDate || "").slice(0, 5)) + ".</p></section>";
    }

    // Composición
    var mix = f.mix, labels = ["Acciones", "Bonos", "Efectivo", "Otros"], colors = ["#2a5ca8", "#a3173f", "#bfc3c9", "#f2b705"];
    if (mix.some(isNum)) {
      var tot = mix.reduce(function (a, v) { return a + (isNum(v) && v > 0 ? v : 0); }, 0) || 1;
      var odd = mix.some(function (v) { return isNum(v) && v < 0; }) || Math.abs(mix.reduce(function (a, v) { return a + (isNum(v) ? v : 0); }, 0) - 100) > 2;
      TB.car += '<section class="block"><h3>Asignación de activos</h3><div class="donutw"><div class="donut" role="img" aria-label="Composición" style="background:conic-gradient(' + (function () { var acc = 0; return mix.map(function (v, i) { if (!(isNum(v) && v > 0)) return null; var a0 = acc; acc += v / tot * 100; return colors[i] + " " + a0.toFixed(2) + "% " + acc.toFixed(2) + "%"; }).filter(Boolean).join(","); })() + ')"><i>' + nf(Math.max(mix[0] || 0, mix[1] || 0), 0) + "%" + '<small>' + (mix[0] >= mix[1] ? "Acciones" : "Bonos") + '</small></i></div><div class="keys">' + mix.map(function (v, i) {
        return isNum(v) && Math.abs(v) >= 0.05 ? '<span style="--c:' + colors[i] + '">' + labels[i] + " <b>" + pct(v, false, 1) + "</b></span>" : "";
      }).join("") + "</div></div>" +
        (odd ? '<p class="note">Posiciones netas: pueden incluir derivados y apalancamiento, por lo que no suman 100%.</p>' : "") +
        '</section><section class="block"><h3>Posiciones</h3><dl class="facts">' +
        (isNum(f.top10) ? fact("Peso de las 10 mayores posiciones", pct(f.top10, false, 1)) : "") +
        (isNum(f.nEq) && f.nEq > 0 ? fact("Posiciones en renta variable", nf(f.nEq, 0)) : "") +
        (isNum(f.nBo) && f.nBo > 0 ? fact("Posiciones en renta fija", nf(f.nBo, 0)) : "") + "</dl></section>";
    }

    // Riesgo
    var rows = [
      ["Volatilidad", f.vol, function (v) { return pct(v, false, 1); }],
      ["Ratio de Sharpe", f.sharpe, function (v) { return dec(v); }],
      ["Ratio de Sortino", f.sortino, function (v) { return dec(v); }],
      ["Ratio MAR", f.mar, function (v) { return dec(v); }],
      ["Peor mes", f.worst, function (v) { return pct(v, false, 1); }],
      ["Meses en positivo", f.pos, function (v) { return pct(v, false, 0); }],
      ["Caída máxima", [f.dd[0], f.dd[1], f.dd[2]], function (v) { return pct(v, false, 1); }]
    ].filter(function (x) { return x[1].some(isNum); });
    if (rows.length) {
      TB.ris += '<section class="block"><h3>Riesgo</h3><table class="rtable"><thead><tr><th scope="col"></th><th scope="col">1 año</th><th scope="col">3 años</th><th scope="col">5 años</th></tr></thead><tbody>' +
        rows.map(function (x) { return "<tr><td>" + x[0] + "</td>" + x[1].map(function (v) { return '<td class="num">' + x[2](v) + "</td>"; }).join("") + "</tr>"; }).join("") +
        "</tbody></table></section>" +
        '<section class="block"><h3>Indicadores de riesgo</h3><dl class="facts">' +
        (isNum(f.dd[4]) ? fact("Caída máxima histórica", pct(f.dd[4], false, 1)) : "") +
        (isNum(f.alpha) ? fact("Alpha 3 años", dec(f.alpha)) : "") + (isNum(f.beta) ? fact("Beta 3 años", dec(f.beta)) : "") +
        (isNum(f.r2) ? fact("R² 3 años", dec(f.r2, 1)) : "") +
        (isNum(f.rmed) ? fact("Rentabilidad media 3 años", pct(f.rmed, false, 2)) : "") +
        (f.score && isNum(f.score[3]) ? fact("Score", dec(f.score[3]) + ' <span class="muted">(1A ' + dec(f.score[0]) + " · 3A " + dec(f.score[1]) + " · 5A " + dec(f.score[2]) + ")</span>") : "") +
        (f.mrent ? fact("Rentabilidad Morningstar", esc(f.mrent)) : "") + (f.mris ? fact("Riesgo Morningstar", esc(f.mris)) : "") + "</dl></section>";
    }

    // Específico por tipo
    if (f.t === "rf" && (isNum(f.dur) || isNum(f.vto) || isNum(f.tir) || f.cal)) {
      TB.car += '<section class="block"><h3>Cartera de bonos</h3><dl class="facts">' +
        (isNum(f.tir) ? fact("TIR", pct(f.tir, false, 2)) : "") + (isNum(f.dur) ? fact("Duración, años", dec(f.dur, 2)) : "") + (isNum(f.vto) ? fact("Vencimiento medio, años", dec(f.vto, 1)) : "") +
        (f.cal ? fact("Calidad crediticia media", esc(f.cal)) : "") + "</dl></section>";
    }
    if (f.t === "rv" && (f.cap.some(isNum) || f.reg || f.sec || isNum(f.per))) {
      var cl = ["Gigante", "Grande", "Mediana", "Pequeña", "Micro"], capm = Math.max.apply(null, f.cap.map(function (v) { return isNum(v) ? v : 0; })) || 1;
      TB.car += '<section class="block"><h3>Tamaño de las empresas</h3>' + (f.cap.some(isNum) ? '<div class="bars">' + f.cap.map(function (v, i) {
        return isNum(v) ? bar(cl[i], v, capm, "", pct(v, false, 1)) : "";
      }).join("") + "</div>" : '<p class="note">Sin datos.</p>') + "</section>" +
        '<section class="block"><h3>Valoración y exposición</h3><dl class="facts">' +
        (isNum(f.per) ? fact("PER", dec(f.per, 1)) : "") + (isNum(f.pcf) ? fact("Precio / flujo de caja", dec(f.pcf, 1)) : "") +
        (isNum(f.gro) ? fact("Crecimiento esperado", pct(f.gro, false, 1)) : "") +
        (f.reg ? fact("Región principal", esc(f.reg[0]) + " " + pct(f.reg[1], false, 1)) : "") +
        (f.sec ? fact("Sector principal", esc(f.sec[0]) + " " + pct(f.sec[1], false, 1)) : "") + "</dl></section>";
    }

    TB.res += '<section class="block"><h3>Evolución reciente</h3><dl class="facts">' +
      [["1 día", r.d1], ["1 semana", r.w1], ["1 mes", r.m1], ["3 meses", r.m3], ["6 meses", r.m6]].map(function (x) {
        return fact(x[0], ret(x[1]));
      }).join("") + "</dl></section>";

    // Datos generales
    TB.dat += '<section class="block"><h3>Datos generales</h3><dl class="facts">' +
      fact("Categoría Morningstar", esc(f.c)) + fact("Gestora", esc(f.g)) +
      (f.stars ? fact("Rating Morningstar", stars(f.stars)) : "") +
      (f.cre ? fact("Fecha de creación", esc(f.cre)) : "") +
      (f.aum ? fact("Patrimonio del fondo", money(f.aum)) : "") +
      (f.aumc ? fact("Patrimonio de la clase", money(f.aumc)) : "") +
      (f.nav ? fact("Valor liquidativo", money2(f.nav) + ' <span class="muted">(' + esc(f.nd) + ")</span>") : "") + "</dl></section>";

    var cm = (window.COMMENTS && window.COMMENTS[f.id]) || [];
    TB.dat += '<section class="block"><h3>Comentarios de la gestora</h3>' + (cm.length
      ? cm.map(function (c) { return '<div class="comment"><p class="cm-h"><b>' + esc(c.d || "") + "</b>" + (c.s ? " · " + esc(c.s) : "") + '</p>' + (c.secs ? '<div class="cm-secs">' + c.secs.map(function (x) { return '<div class="cm-sec"><h4>' + esc(x.h) + "</h4><p>" + esc(x.t) + "</p></div>"; }).join("") + "</div>" : '<p class="cm-t">' + esc(c.t || "") + "</p>") + "</div>"; }).join("")
      : '<p class="muted">Todavía no hay comentarios de la gestora para este fondo.</p>') + "</section>";
    var TABS = [["res", "Resumen"], ["ris", "Riesgo"], ["car", "Cartera"], ["dat", "Datos y comentarios"]].filter(function (t) { return TB[t[0]]; });
    html += '<nav class="mstabs" role="tablist">' + TABS.map(function (t, i) { return '<button type="button" role="tab" data-tab="' + t[0] + '" class="' + (i ? "" : "on") + '">' + t[1] + "</button>"; }).join("") + "</nav>";
    TABS.forEach(function (t, i) { html += '<div class="mspanel' + (i ? "" : " on") + '" id="tab-' + t[0] + '"><div class="grid2">' + TB[t[0]] + "</div></div>"; });
    html += "</div>" + footer(f.t);
    app.innerHTML = html;
    Array.prototype.forEach.call(app.querySelectorAll(".mstabs button"), function (bt) {
      bt.addEventListener("click", function () {
        Array.prototype.forEach.call(app.querySelectorAll(".mstabs button"), function (x) { x.classList.toggle("on", x === bt); });
        Array.prototype.forEach.call(app.querySelectorAll(".mspanel"), function (p) { p.classList.toggle("on", p.id === "tab-" + bt.getAttribute("data-tab")); });
      });
    });
    var ft = document.getElementById("fundtools");
    if (ft) { if (unlocked()) ft.appendChild(mailBtn(function () { return fundMail(f); })); ft.appendChild(deckBtn(function () { deckFund(f); })); }
    var apb = document.getElementById("addpfBtn");
    if (apb) apb.addEventListener("click", function () {
      var p = pfById(document.getElementById("addpf").value);
      if (!p) return;
      if (p.lines.some(function (l) { return l.id === f.id; })) { apb.textContent = "Ya está"; return; }
      p.lines.push({ id: f.id, w: Math.max(0, Math.round((100 - sumW(p)) * 100) / 100) });
      savePf(); apb.textContent = "Añadido";
    });
  }

  function viewNotFound() {
    setTitle("No encontrado");
    app.innerHTML = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>No encontrado</h1><p class="muted">Este fondo no está en la web.</p>';
  }

  // ---------- utilidades comunes de comparador y carteras ----------
  var BETTER = {
    hi: "tir w1 m1 m3 m6 ytd y1 y3 y5 y10 rmed sh1 sh3 sh5 so1 so3 so5 mar1 mar3 mar5 alpha score ddmax worst1 worst3 worst5 pos1 pos3 pos5".split(" "),
    lo: "vol1 vol3 vol5 neg1 neg3 neg5".split(" ")
  };
  var CMP_MAX = 4;
  var CMP_HIDE = "so1 so3 so5 rmed sh5 mar5 worst1 pos1 neg1 neg3 neg5".split(" "); // métricas que no salen en el comparador
  var CMP_MONTH = "worst3 pos3 worst5 pos5".split(" "); // van juntas en "Comportamiento mensual"
  var CMP_NOBAR = "beta r2 dur top10".split(" ");
  var CMP_COLORS = ["#851a2e", "#3b3b3b", "#1e7a4a", "#c27c0e"];
  var YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

  function annOf(f, y) { return f.ann && isNum(f.ann[2026 - y]) ? f.ann[2026 - y] : null; }
  function yearLabel(y) { return y === 2026 ? "2026 (" + String(META.annDate || "").slice(0, 5) + ")" : String(y); }
  function download(name, text, type) {
    var b = new Blob([text], { type: type }), u = URL.createObjectURL(b), a = document.createElement("a");
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
  }
  function parseNum(s) {
    var n = parseFloat(String(s == null ? "" : s).replace(",", "."));
    return isFinite(n) ? n : null;
  }
  function pickList(q, exclude, make) {
    var hits = FUNDS.filter(function (f) { return exclude.indexOf(f.id) === -1 && matches(f, q); }).slice(0, 8);
    return hits.length ? '<div class="list">' + hits.map(make).join("") + "</div>" : '<div class="list"><div class="empty">Sin resultados</div></div>';
  }
  function bars(items, max, signed) {
    return '<div class="bars">' + items.map(function (x) {
      return bar(x[0], x[1], max, signed ? (x[1] < 0 ? "neg" : "pos") : "", signed ? '<span class="' + cls(x[1]) + '">' + pct(x[1], true, 1) + "</span>" : pct(x[1], false, 1));
    }).join("") + "</div>";
  }

  // ---------- comparador ----------
  function hashFor(ids) { return "#/comparar" + (ids.length ? "/" + ids.map(encodeURIComponent).join(",") : ""); }

  function printBar(titleFn) {
    var d = document.createElement("div"); d.id = "printhead"; d.className = "printhead"; app.insertBefore(d, app.firstChild);
    var b = document.createElement("button"); b.type = "button"; b.className = "btn ghost"; b.id = "pdfbtn"; b.textContent = "Descargar PDF";
    b.addEventListener("click", function () {
      var t = titleFn();
      d.innerHTML = "<h1 class=\"ph\">" + esc(t[0]) + "</h1><p>" + esc(t[1]) + " · " + new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) + "</p>";
      window.print();
    });
    return b;
  }

  /* ---- Correo y PDF ---- */
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function mailClean(t) {
    return String(t == null ? "" : t).replace(/[\u2014\u2013\u2212]/g, ",").replace(/(^|[\s(])-(?=\d)/g, "$1menos ").replace(/\s[-\/]\s/g, ", ").replace(/[-\/]/g, " ").replace(/ {2,}/g, " ").replace(/ +,/g, ",").replace(/[ \t]+\n/g, "\n");
  }
  function dlong(d) { var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d || ""); return m ? (+m[1]) + " de " + MESES[+m[2] - 1] + " de " + m[3] : (d || ""); }
  function plainP(v, d) { return isNum(v) ? pct(v, false, d == null ? 1 : d) : "sin dato"; }
  function wAvgL(lines, key) {
    var tw = 0, r = 0;
    lines.forEach(function (l) { var f = byId(l.id); if (f && l.w > 0 && isNum(f.ret[key])) { tw += l.w; r += l.w * f.ret[key]; } });
    return tw ? r / tw : null;
  }
  function pnum(v) { var x = parseFloat(String(v == null ? "" : v).replace("%", "").replace(",", ".")); return isFinite(x) ? x : null; }
  function wAvgF(lines, fn) {
    var tw = 0, r = 0;
    lines.forEach(function (l) { var f = byId(l.id), v = f ? fn(f) : null; if (f && l.w > 0 && isNum(v)) { tw += l.w; r += l.w * v; } });
    return tw ? r / tw : null;
  }
  function mailYear() { var m = /(\d{4})$/.exec((META && (META.rv || META.rf)) || ""); return m ? +m[1] : new Date().getFullYear(); }
  function volWord(v) { return !isNum(v) ? "" : v < 5 ? "baja" : v < 12 ? "moderada" : "elevada"; }
  function shWord(v) { return !isNum(v) ? "" : v >= 1 ? "muy buena" : v >= 0.5 ? "buena" : v > 0 ? "moderada" : "floja"; }
  function linesText(lines, amount) {
    return lines.map(function (l, i) {
      var f = byId(l.id); if (!f) return "";
      return (i + 1) + ". " + f.n + " (" + f.g + ")\n   Peso " + nf(l.w, 1) + "%" + (amount > 0 ? ", " + nf(amount * l.w / 100, 0) + " €" : "") + ", " + f.c + ". Rentabilidad a 1 año: " + plainP(f.ret.y1) + ".";
    }).filter(Boolean).join("\n");
  }
  var MAIL_PIE = "\n\nComo siempre, te recuerdo que la rentabilidad pasada no garantiza resultados futuros. Los datos proceden de Morningstar y esta información es orientativa, no constituye asesoramiento personalizado.";
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function fundQ(f) {
    var r = f.ret, n = 0, t = 0;
    [[r.y1, 0], [r.ytd, 0], [r.y3, 0], [f.sharpe && f.sharpe[0], 0.5], [f.alpha, 0]].forEach(function (x) { if (isNum(x[0])) { t++; if (x[0] > x[1]) n++; } });
    return t < 3 ? 0 : n / t >= 0.8 ? 1 : n / t <= 0.4 ? -1 : 0;
  }
  var ACOMP = [
    "Mi idea es que cualquier decisión se tome con calma y con sentido para ti, sin prisas. Lo importante no es acertar con un fondo concreto, sino que tu cartera te permita dormir tranquilo y avanzar hacia tus objetivos.",
    "Quiero que tengas claro que no se trata solo de elegir un producto: me interesa que encaje con tu situación, con tu horizonte y con la tranquilidad que necesitas. Si algo cambia en tu vida o en tus planes, lo ajustamos.",
    "Seguiré pendiente de la evolución y te iré informando de lo relevante, para que no tengas que estar pendiente tú. Tu confianza es lo que más valoro y mi trabajo es cuidarla.",
    "Prefiero que tomemos las decisiones juntos y con toda la información sobre la mesa, tanto lo bueno como lo que conviene vigilar. Así estarás siempre al tanto de lo que tienes y de por qué lo tienes."];
  function listJoin(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " y " + a[a.length - 1]; }
  function fundMail(f) {
    var r = f.ret, rf = f.t === "rf", y = mailYear(), L = [], v1 = f.vol && f.vol[0], sh = f.sharpe && f.sharpe[0];
    var q = fundQ(f), fi = pick([
      "Como te comentaba, te hago llegar la información de " + f.n + ", un fondo de " + f.g + " de la categoría " + f.c + ", para que puedas verlo con calma.",
      "Te escribo para compartir contigo la información de " + f.n + ", un fondo de " + f.g + " de la categoría " + f.c + ".",
      "Te envío la ficha de " + f.n + ", fondo de " + f.g + " (categoría " + f.c + "), para que la puedas revisar con tranquilidad."]);
    if (q > 0) fi += " " + pick(["Es un fondo cuyos números recientes acompañan.", "Tiene un comportamiento que me parece interesante destacar."]);
    if (q < 0) fi += " " + pick(["Te lo planteo con una visión de medio y largo plazo, que es donde tiene más sentido valorarlo.", "Conviene analizarlo con perspectiva y dentro del conjunto de tu cartera."]);
    L.push("Hola,", "", fi + " Los datos están actualizados a " + dlong(f.nd) + ".", "");
    var p = [];
    if (isNum(r.y3)) p.push("En los últimos tres años ha ofrecido una rentabilidad anualizada del " + plainP(r.y3) + (isNum(r.y5) ? " (y del " + plainP(r.y5) + " anual a cinco años)" : ""));
    if (isNum(r.y1)) p.push(r.y1 < 0 ? "en el último año ha cedido un " + plainP(Math.abs(r.y1)) + (isNum(r.ytd) ? (r.ytd < 0 ? " y en lo que va de año cede un " + plainP(Math.abs(r.ytd)) : ", con un " + plainP(r.ytd) + " en lo que va de año") : "") : "en el último año acumula un " + plainP(r.y1) + (isNum(r.ytd) ? ", con un " + plainP(r.ytd) + " en lo que va de año" : ""));
    var sent = p.length ? p.join(", y ").replace(/^./, function (c) { return c.toUpperCase(); }) + "." : "";
    if (isNum(v1)) sent += " Lo ha hecho con una volatilidad " + volWord(v1) + " (" + plainP(v1) + " a un año)" + (isNum(sh) ? " y una relación entre rentabilidad y riesgo " + shWord(sh) + " (Sharpe de " + nf(sh, 2) + ")" : "") + ".";
    if (f.stars) sent += " Morningstar lo califica con " + f.stars + (f.stars === 1 ? " estrella" : " estrellas") + ".";
    if (sent) L.push(pick(["En pocas palabras", "Resumen", "Lo esencial"]), sent.trim(), "");
    var st = [];
    if (isNum(r.y3) && r.y3 > 0) st.push("una rentabilidad anualizada positiva del " + plainP(r.y3) + " a tres años");
    if (isNum(r.y5) && r.y5 > 0) st.push("un " + plainP(r.y5) + " anual a cinco años");
    if (isNum(r.y10) && r.y10 > 0) st.push("un " + plainP(r.y10) + " anual a diez años");
    if (f.pos && isNum(f.pos[0]) && f.pos[0] >= 50) st.push("meses positivos en el " + nf(f.pos[0], 0) + "% de los últimos doce");
    if (isNum(f.alpha) && f.alpha > 0) st.push("un alpha positivo de " + nf(f.alpha, 2) + " frente a su referencia");
    if (isNum(sh) && sh >= 0.5) st.push("una buena relación entre rentabilidad y riesgo (Sharpe de " + nf(sh, 2) + ")");
    if (isNum(f.beta) && f.beta < 0.8) st.push("una beta contenida de " + nf(f.beta, 2) + ", que suele amortiguar las caídas del mercado");
    if (f.stars >= 4) st.push("una calificación de " + f.stars + " estrellas de Morningstar");
    var bestY = null; (f.ann || []).forEach(function (v, i) { if (i >= 1 && i <= 5 && isNum(v) && v > 0 && (!bestY || v > bestY.v)) bestY = { v: v, y: y - i }; });
    if (bestY) st.push("un " + plainP(bestY.v) + " en " + bestY.y + ", su mejor año reciente");
    st = st.slice(0, q < 0 ? 4 : 3);
    if (st.length) L.push(pick(["Puntos a favor", "Lo que más me gusta", "Aspectos positivos"]), "Entre sus puntos fuertes, destaca " + listJoin(st) + ".", "");
    L.push(pick(["Cómo ha evolucionado", "Evolución", "Rentabilidades"]));
    L.push("• Última semana: " + plainP(r.w1) + ", último mes: " + plainP(r.m1) + ", tres meses: " + plainP(r.m3), "• Seis meses: " + plainP(r.m6) + ", en el año: " + plainP(r.ytd) + ", un año: " + plainP(r.y1));
    L.push("• Tres años: " + plainP(r.y3) + " anual, cinco años: " + plainP(r.y5) + " anual" + (isNum(r.y10) ? ", diez años: " + plainP(r.y10) + " anual" : ""));
    var yrs = [];
    (f.ann || []).forEach(function (v, i) { if (i >= 1 && i <= 5 && isNum(v)) yrs.push((y - i) + " (" + plainP(v) + ")"); });
    if (yrs.length) L.push("• Año a año: " + listJoin(yrs));
    L.push("");
    var bad = [];
    if (f.dd && isNum(f.dd[4])) bad.push("su caída máxima histórica ha sido del " + plainP(Math.abs(f.dd[4])));
    if (f.worst && isNum(f.worst[0])) bad.push(f.worst[0] < 0 ? "el peor mes del último año supuso un retroceso del " + plainP(Math.abs(f.worst[0])) : "no ha tenido meses negativos en el último año");
    if (f.pos && isNum(f.pos[0])) bad.push("ha cerrado en positivo el " + nf(f.pos[0], 0) + "% de los meses del último año");
    var risk = bad.length ? pick(["Para hacerte una idea de cómo se comporta cuando vienen mal dadas, ", "Mirando también la parte de riesgo, ", "En cuanto al comportamiento en momentos complicados, "]) + listJoin(bad) + "." : "";
    if (isNum(f.beta)) risk += " Su beta a tres años es de " + nf(f.beta, 2) + (f.beta < 0.8 ? ", lo que indica que suele amortiguar las caídas del mercado." : f.beta > 1.1 ? ", por lo que tiende a amplificar los movimientos del mercado." : ", es decir, sigue al mercado de cerca.");
    var w = [];
    if (isNum(v1) && v1 >= 15) w.push("su volatilidad es elevada y puede registrar oscilaciones amplias a corto plazo");
    if (isNum(f.top10) && f.top10 >= 45) w.push("la cartera está concentrada, con pocas posiciones explicando buena parte del resultado");
    if (isNum(f.alpha) && f.alpha < 0) w.push("en tres años ha quedado algo por debajo de su referencia (alpha de " + nf(f.alpha, 2) + ")");
    if (w.length) risk += (q > 0 ? " Como en toda inversión, conviene recordar que " : " Conviene tener presente que ") + listJoin(w) + ".";
    if (risk && q < 0) risk += " Son oscilaciones normales en este tipo de activos y el objetivo del fondo es a medio y largo plazo.";
    if (risk) L.push(pick(["Qué conviene tener presente", "Riesgo y comportamiento", "Para tener en cuenta"]), risk.trim(), "");
    var inside = [];
    if (rf) {
      if (isNum(f.dur)) inside.push("una duración de " + nf(f.dur, 2) + " años");
      if (f.cal) inside.push("una calidad crediticia media " + f.cal);
      if (isNum(f.tir)) inside.push("una rentabilidad al vencimiento (TIR) del " + plainP(f.tir, 2));
    } else {
      if (f.reg && f.reg[0]) inside.push("un " + nf(f.reg[1], 0) + "% en " + f.reg[0]);
      if (f.sec && f.sec[0]) inside.push("un " + nf(f.sec[1], 0) + "% en el sector " + String(f.sec[0]).toLowerCase());
      if (isNum(f.per)) inside.push("un PER medio de " + nf(f.per, 1));
    }
    var insTxt = inside.length ? "La cartera tiene " + listJoin(inside) + "." : "";
    if (isNum(f.top10)) insTxt += (insTxt ? " " : "") + "Las diez mayores posiciones suponen el " + nf(f.top10, 0) + "% del total.";
    if (insTxt) L.push("Qué lleva dentro", insTxt, "");
    var cm = (window.COMMENTS && window.COMMENTS[f.id]) || [];
    if (cm.length && cm[0].t) L.push("Lo que dice la gestora (" + (cm[0].d || "último comentario") + ")", cm[0].t, "");
    var d = ["ISIN " + f.id];
    if (f.aum) d.push("patrimonio de " + String(f.aum).replace(/\s*EUR$/, "").replace(".", ",") + " millones de euros");
    if (f.cre) d.push("creado el " + dlong(f.cre));
    L.push(pick(["Si te parece bien, lo comentamos con calma y vemos qué papel podría jugar en tu cartera según tu perfil y tu horizonte de inversión. Quedo a tu disposición para cualquier duda.", "Cuando quieras lo vemos con más detalle y valoramos si encaja con tu perfil y tus objetivos. Quedo a tu disposición.", "Si te interesa, lo repasamos juntos y vemos cómo podría encajar en tu cartera. Cualquier duda, me dices."]));
    return { subject: "Información del fondo " + f.n, body: mailClean(L.join("\n")) + MAIL_PIE, chart: function () { return mcFund(f); } };
  }
  function pfMail(name, amount, lines, extra) {
    var L = [], fs = lines.map(function (l) { return { l: l, f: byId(l.id) }; }).filter(function (x) { return x.f; }), tw = 0, rfW = 0, gs = {}, idx = 0;
    lines.forEach(function (l) { tw += l.w; });
    fs.forEach(function (x) { if (x.f.t === "rf") rfW += x.l.w; gs[x.f.g] = 1; if (x.f.idx) idx++; });
    var ng = Object.keys(gs).length;
    var pa = wAvgF(lines, function (f) { return f.ret.ytd; }), pb = wAvgF(lines, function (f) { return f.ret.y1; }), pq = isNum(pa) && isNum(pb) ? (pa > 0 && pb > 0 ? 1 : pa < 0 || pb < 0 ? -1 : 0) : 0;
    var pi = pick(["Te hago llegar la propuesta de cartera", "Te comparto la propuesta de cartera", "Te envío la propuesta de cartera"]) + " \"" + (name || "Cartera") + "\"" + (amount > 0 ? " para un importe de " + nf(amount, 0) + " euros" : "") + ", que he preparado con datos de Morningstar a " + dlong(META && (META.rv || META.rf)) + ".";
    if (pq > 0) pi += " " + pick(["Los datos recientes acompañan a la propuesta.", "Su comportamiento reciente es positivo."]);
    if (pq < 0) pi += " " + pick(["Está pensada con un horizonte de medio y largo plazo, que es donde tiene más sentido valorarla.", "Te la presento con perspectiva, ya que su objetivo va más allá del corto plazo."]);
    L.push("Hola,", "", pi, "");
    var intro = "Está formada por " + fs.length + " fondos de " + ng + (ng === 1 ? " gestora" : " gestoras diferentes");
    if (tw > 0) intro += ", con un " + nf(rfW / tw * 100, 0) + "% en renta fija y un " + nf((tw - rfW) / tw * 100, 0) + "% en renta variable";
    intro += idx ? "." : ", todos de gestión activa.";
    L.push(pick(["Cómo está construida", "Estructura", "Cómo está planteada"]), intro + (extra ? "\n" + extra.replace(/^Perfil:?\s*([^.\n]*)\.?/i, "El perfil de inversión es $1.").replace(/^El perfil de inversión es (\S+?)ora\./, "El perfil de inversión es $1or.").replace(/^El perfil de inversión es (\S+?)ada\./, "El perfil de inversión es $1ado.") : ""), "");
    L.push("Composición", linesText(lines, amount), "");
    var a = wAvgF(lines, function (f) { return f.ret.ytd; }), b = wAvgF(lines, function (f) { return f.ret.y1; }), c = wAvgF(lines, function (f) { return f.ret.y3; }), v = wAvgF(lines, function (f) { return f.vol && f.vol[0]; }), sh = wAvgF(lines, function (f) { return f.sharpe && f.sharpe[0]; });
    var perf = "Con los datos actuales, la rentabilidad media ponderada de los fondos se sitúa en el " + plainP(a) + " en el año, del " + plainP(b) + " a un año y del " + plainP(c) + " anual a tres años";
    if (isNum(v)) perf += ", con una volatilidad media del " + plainP(v) + (isNum(sh) ? " y un Sharpe medio de " + nf(sh, 2) : "");
    perf += ".";
    var ps = [], npos = fs.filter(function (x) { return isNum(x.f.ret.y1) && x.f.ret.y1 > 0; }).length;
    if (isNum(c) && c > 0) ps.push("una rentabilidad media anualizada del " + plainP(c) + " a tres años");
    if (npos && npos >= fs.length / 2) ps.push(npos + " de los " + fs.length + " fondos con rentabilidad positiva en el último año");
    if (ng >= 3) ps.push("diversificación entre " + ng + " gestoras");
    if (isNum(sh) && sh >= 0.5) ps.push("una buena relación entre rentabilidad y riesgo (Sharpe medio de " + nf(sh, 2) + ")");
    if (!ps.length && fs.length) ps.push("una cartera construida con fondos de gestión activa y seguimiento cercano");
    if (ps.length) L.push(pick(["Puntos a favor", "Lo más destacable", "Aspectos positivos"]), "Entre los puntos fuertes de la propuesta, destaca " + listJoin(ps.slice(0, 4)) + ".", "");
    L.push(pick(["Cómo se ha comportado", "Evolución de la cartera", "Resultados hasta ahora"]), perf, "");
    var sorted = fs.slice().sort(function (p, q) { return q.l.w - p.l.w; }), best = null, worst = null;
    fs.forEach(function (x) { if (isNum(x.f.ret.y1)) { if (!best || x.f.ret.y1 > best.f.ret.y1) best = x; if (!worst || x.f.ret.y1 < worst.f.ret.y1) worst = x; } });
    var P = [];
    if (sorted.length) P.push("La mayor posición es " + sorted[0].f.n + ", con un " + nf(sorted[0].l.w, 1) + "% de la cartera.");
    if (best) P.push("El fondo que mejor ha funcionado en el último año es " + best.f.n + " (" + plainP(best.f.ret.y1) + ").");
    if (worst && worst !== best) P.push(pq > 0 ? "El de comportamiento más contenido es " + worst.f.n + " (" + plainP(worst.f.ret.y1) + ")." : "El fondo con un comportamiento más moderado en el último año es " + worst.f.n + " (" + plainP(worst.f.ret.y1) + "), que seguimos con atención.");
    if (Math.abs(tw - 100) > 0.5) P.push("Ten en cuenta que los pesos suman " + nf(tw, 1) + "%.");
    L.push(pick(["A tener en cuenta", "Detalles de la cartera", "Para valorar"]), P.join(" ") + (pq < 0 ? " Es una cartera pensada para el medio y largo plazo, y los movimientos recientes entran dentro de lo esperable." : ""), "");
    L.push(pick(["Si te parece, la repasamos juntos y la ajustamos a tu perfil de riesgo y a tus objetivos. Quedo a tu disposición para cualquier duda.", "Cuando te venga bien la comentamos con calma y la adaptamos a lo que necesites. Quedo a tu disposición.", "Si te encaja, la vemos juntos y afinamos lo que haga falta. Cualquier duda, me dices."]));
    return { subject: "Propuesta de cartera: " + (name || ""), body: mailClean(L.join("\n")) + MAIL_PIE, chart: function () { return mcPf(name, amount, fs.filter(function (x) { return x.l.w > 0; }), tw, rfW); } };
  }
  /* ---- Gráficos para los correos ---- */
  var MC = { br: "#a3173f", bl: "#2a5ca8", ink: "#1c1c26", mut: "#717171", trk: "#ece8ea", pos: "#1f7a4d", neg: "#a3173f", line: "#e3dfe1" };
  function mcCanvas(h) { var c = document.createElement("canvas"); c.width = 1200; c.height = h; var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 1200, h); return [c, g]; }
  function mcRR(g, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function mcTitle(g, t, sub) {
    g.fillStyle = MC.br; g.fillRect(0, 0, 1200, 14);
    g.fillStyle = MC.ink; g.font = "bold 40px Arial, sans-serif"; g.textAlign = "left"; g.fillText(t.length > 50 ? t.slice(0, 48) + "…" : t, 50, 78);
    g.fillStyle = MC.mut; g.font = "24px Arial, sans-serif"; g.fillText(sub, 50, 114);
    g.fillStyle = MC.line; g.fillRect(50, 138, 1100, 2);
  }
  function mcFoot(g, H, txt) {
    g.fillStyle = MC.line; g.fillRect(50, H - 62, 1100, 2);
    g.fillStyle = MC.mut; g.font = "19px Arial, sans-serif"; g.textAlign = "left"; g.fillText(txt, 50, H - 28);
    g.fillStyle = MC.br; g.font = "bold 19px Arial, sans-serif"; g.textAlign = "right"; g.fillText("RENTA 4 BANCO", 1150, H - 28);
  }
  function mcFund(f) {
    var y = mailYear(), items = [];
    (f.ann || []).forEach(function (v, i) { if (i <= 5 && isNum(v)) items.push([i === 0 ? "Año actual" : String(y - i), v]); });
    var sub = "Rentabilidad año a año";
    if (items.length < 3) { items = [["1 mes", f.ret.m1], ["3 meses", f.ret.m3], ["6 meses", f.ret.m6], ["En el año", f.ret.ytd], ["1 año", f.ret.y1], ["3 años anual", f.ret.y3]].filter(function (p) { return isNum(p[1]); }); sub = "Rentabilidad por periodos"; }
    items.reverse();
    var H = 190 + items.length * 64 + 90, cg = mcCanvas(H), c = cg[0], g = cg[1];
    mcTitle(g, f.n, sub + " · " + f.g);
    var mn = 0, mx = 1; items.forEach(function (p) { mn = Math.min(mn, p[1]); mx = Math.max(mx, p[1]); });
    var x0 = 250, w = 640, k = w / (mx - mn), zx = x0 + (-mn) * k;
    items.forEach(function (p, i) {
      var yy = 170 + i * 64, bw = Math.max(6, Math.abs(p[1]) * k), bx = p[1] < 0 ? zx - bw : zx;
      g.fillStyle = MC.ink; g.font = "26px Arial, sans-serif"; g.textAlign = "right"; g.fillText(p[0], x0 - 24, yy + 34);
      g.fillStyle = MC.trk; mcRR(g, x0, yy + 8, w, 34, 17); g.fill();
      g.fillStyle = p[1] < 0 ? MC.neg : MC.pos; mcRR(g, bx, yy + 8, bw, 34, 17); g.fill();
      g.fillStyle = p[1] < 0 ? MC.neg : MC.pos; g.font = "bold 28px Arial, sans-serif"; g.textAlign = "left"; g.fillText((p[1] > 0 ? "+" : "") + nf(p[1], 1) + "%", x0 + w + 22, yy + 36);
    });
    if (mn < 0) { g.fillStyle = MC.ink; g.fillRect(zx - 1, 162, 2, items.length * 64 + 4); }
    mcFoot(g, H, "Datos de Morningstar a " + dlong(f.nd) + ". La rentabilidad pasada no garantiza resultados futuros.");
    return c.toDataURL("image/png");
  }
  function mcPf(name, amount, fs, tw, rfW) {
    var H = Math.max(700, 200 + fs.length * 58 + 90), cg = mcCanvas(H), c = cg[0], g = cg[1];
    mcTitle(g, name || "Cartera", "Composición" + (amount > 0 ? " · " + nf(amount, 0) + " €" : "") + " · " + fs.length + " fondos");
    var cx = 270, cy = 380, R = 160, rfp = tw ? rfW / tw : 0, a0 = -Math.PI / 2;
    function arc(a, b, col) { g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a, b); g.closePath(); g.fillStyle = col; g.fill(); }
    if (rfp > 0) arc(a0, a0 + rfp * 2 * Math.PI, MC.br);
    if (rfp < 1) arc(a0 + rfp * 2 * Math.PI, a0 + 2 * Math.PI, MC.bl);
    g.beginPath(); g.arc(cx, cy, R * 0.6, 0, 2 * Math.PI); g.fillStyle = "#fff"; g.fill();
    g.fillStyle = MC.ink; g.textAlign = "center"; g.font = "bold 58px Arial, sans-serif"; g.fillText(String(fs.length), cx, cy + 14); g.font = "20px Arial, sans-serif"; g.fillStyle = MC.mut; g.fillText("FONDOS", cx, cy + 46);
    g.textAlign = "left"; g.font = "24px Arial, sans-serif";
    g.fillStyle = MC.br; mcRR(g, 80, 600, 20, 20, 5); g.fill(); g.fillStyle = MC.ink; g.fillText("Renta fija " + nf(rfp * 100, 0) + "%", 112, 618);
    g.fillStyle = MC.bl; mcRR(g, 80, 640, 20, 20, 5); g.fill(); g.fillStyle = MC.ink; g.fillText("Renta variable " + nf(100 - rfp * 100, 0) + "%", 112, 658);
    var mx = 1; fs.forEach(function (x) { mx = Math.max(mx, x.l.w); });
    fs.slice().sort(function (p, q) { return q.l.w - p.l.w; }).forEach(function (x, i) {
      var yy = 176 + i * 58, bx = 540, bw = 470, nm = x.f.n.length > 40 ? x.f.n.slice(0, 39) + "…" : x.f.n;
      g.fillStyle = MC.ink; g.font = "21px Arial, sans-serif"; g.textAlign = "left"; g.fillText(nm, bx, yy + 14);
      g.fillStyle = MC.trk; mcRR(g, bx, yy + 24, bw, 14, 7); g.fill();
      g.fillStyle = x.f.t === "rf" ? MC.br : MC.bl; mcRR(g, bx, yy + 24, Math.max(10, x.l.w / mx * bw), 14, 7); g.fill();
      g.fillStyle = MC.ink; g.font = "bold 24px Arial, sans-serif"; g.textAlign = "right"; g.fillText(nf(x.l.w, 1) + "%", 1150, yy + 36);
    });
    mcFoot(g, H, "Datos de Morningstar. Información orientativa, no es asesoramiento personalizado.");
    return c.toDataURL("image/png");
  }
  function mcBlock(g, y, title, rows, max, hasPrev) {
    g.fillStyle = MC.br; g.font = "bold 22px Arial, sans-serif"; g.textAlign = "left"; g.fillText(title.toUpperCase(), 50, y);
    g.fillStyle = MC.br; g.fillRect(50, y + 10, 1100, 2);
    var bx = 400, bw = 520, mx = max || 0;
    if (!max) rows.forEach(function (r) { mx = Math.max(mx, r.v, isNum(r.p) ? r.p : 0); });
    mx = max || mx * 1.12;
    rows.forEach(function (r, i) {
      var cy = y + 52 + i * 52;
      g.fillStyle = MC.ink; g.font = "24px Arial, sans-serif"; g.textAlign = "left"; g.fillText(r.n, 50, cy + 8);
      g.fillStyle = MC.trk; mcRR(g, bx, cy - 10, bw, 22, 11); g.fill();
      g.fillStyle = r.c; mcRR(g, bx, cy - 10, Math.max(8, r.v / mx * bw), 22, 11); g.fill();
      if (isNum(r.p)) { var px = bx + Math.min(r.p, mx) / mx * bw; g.fillStyle = MC.ink; g.fillRect(px - 1.5, cy - 17, 3, 36); }
      g.fillStyle = MC.ink; g.font = "bold 26px Arial, sans-serif"; g.fillText(r.t, bx + bw + 24, cy + 9);
    });
    return y + 52 + rows.length * 52 + 18;
  }
  function mcMacro() {
    var M = mxData(), H = 1210, cg = mcCanvas(H), c = cg[0], g = cg[1];
    mcTitle(g, "Entorno macroeconómico", "Inflación, tipos y bonos · datos a " + dlong(M.fecha));
    var y = 196;
    y = mcBlock(g, y, "Inflación (variación anual)", mxRows(["ipc_es", "ipc_ez", "ipc_us", "pce_us"], MC.br), 0, true);
    y = mcBlock(g, y + 10, "Tipos de interés", mxRows(["bce", "fed", "estr", "eur12"], MC.bl), 0, true);
    y = mcBlock(g, y + 10, "Bonos a 10 años", mxRows(["es10", "bund", "ust10"], MC.br), 0, true);
    g.fillStyle = MC.mut; g.font = "19px Arial, sans-serif"; g.textAlign = "left"; g.fillText("La marca negra indica el dato anterior.", 50, y + 14);
    mcFoot(g, H, "Fuentes: " + (M.fuentes || "").slice(0, 70) + ".");
    return c.toDataURL("image/png");
  }
  function mailHtml(text, url) {
    var ff = "font-family:Arial,Helvetica,sans-serif;color:#1c1c26;", h = '<div style="max-width:640px;' + ff + '"><div style="height:6px;background:#a3173f;border-radius:3px;margin:0 0 18px"></div>', blocks = text.split(/\n\s*\n/), shown = false;
    blocks.forEach(function (bl, i) {
      var ls = bl.split("\n").filter(function (x) { return x.trim(); });
      if (!ls.length) return;
      var head = ls.length > 1 && ls[0].length <= 42 && !/[.:]$/.test(ls[0]) && !/^[\u2022\u00b7]/.test(ls[0]) && !/^\d+\./.test(ls[0]);
      var small = /^Como siempre, te recuerdo/.test(ls[0]);
      var inner = (head ? '<div style="font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#a3173f;margin:0 0 5px">' + esc(ls[0]) + "</div>" : "") +
        (head ? ls.slice(1) : ls).map(function (x) { return /^[\u2022\u00b7]/.test(x) ? '<div style="padding-left:14px;text-indent:-14px;margin:2px 0">' + esc(x) + "</div>" : esc(x); }).join("<br>");
      h += '<div style="margin:0 0 16px;font-size:' + (small ? "12px;color:#717171;border-top:1px solid #e3dfe1;padding-top:12px" : "14.5px") + ';line-height:1.55">' + inner + "</div>";
      if (!shown && url && (i >= 2 || i === blocks.length - 1)) { shown = true; h += '<div style="margin:4px 0 20px"><img src="' + url + '" width="600" alt="Gráfico" style="display:block;max-width:100%;height:auto;border:1px solid #e3dfe1;border-radius:10px"></div>'; }
    });
    return h + "</div>";
  }
  function mailModal(m) {
    var ov = document.getElementById("mailov");
    if (ov) ov.remove();
    ov = document.createElement("div"); ov.id = "mailov"; ov.className = "mov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Redactar correo");
    ov.innerHTML = '<div class="mbox"><div class="mhd"><b>Correo</b><button type="button" class="gx" id="mclose">Cerrar</button></div>' +
      '<label class="mlb">Asunto<input class="inp" id="msub" maxlength="200"></label><label class="mlb">Mensaje<textarea class="inp" id="mbody" rows="16"></textarea></label>' + (m.chart ? '<div class="mlb">Gráfico del correo<img id="mimg" alt="Gráfico" style="display:block;width:100%;max-width:560px;border:1px solid #e3e6ea;border-radius:8px;margin-top:6px"></div>' : "") +
      '<div class="row">' + (m.chart ? '<button type="button" class="btn" id="mcopyr">Copiar con gráfico</button>' : "") + '<button type="button" class="btn' + (m.chart ? " ghost" : "") + '" id="mcopy">Copiar mensaje</button>' + (m.chart ? '<a class="btn ghost" id="mdl" href="#" download="grafico.png">Descargar gráfico</a>' : "") + '<button type="button" class="btn ghost" id="mcopys">Copiar asunto</button><a class="btn ghost" id="mopen" href="#">Abrir en mi correo</a></div>' +
      '<p class="note" id="mnote">Puedes editar el texto antes de copiarlo. Sin destinatario: añádelo en tu correo.</p></div>';
    document.body.appendChild(ov);
    var sub = ov.querySelector("#msub"), body = ov.querySelector("#mbody"), note = ov.querySelector("#mnote");
    sub.value = m.subject; body.value = m.body;
    function close() { ov.remove(); document.removeEventListener("keydown", esc2); }
    function esc2(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", esc2);
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    ov.querySelector("#mclose").addEventListener("click", close);
    function copy(txt, msg) {
      function ok() { note.textContent = msg; }
      function fb() { body.focus(); body.select(); try { document.execCommand("copy"); ok(); } catch (x) { note.textContent = "No se pudo copiar, selecciona el texto y cópialo a mano."; } }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fb); else fb();
    }
    ov.querySelector("#mcopy").addEventListener("click", function () { copy(body.value, "Mensaje copiado."); });
    if (m.chart) {
      var url = ""; try { url = m.chart(); } catch (x) { url = ""; }
      var im = ov.querySelector("#mimg"), dl = ov.querySelector("#mdl"), cr = ov.querySelector("#mcopyr");
      if (url) { im.src = url; dl.href = url; } else { im.style.display = "none"; }
      cr.addEventListener("click", function () {
        var tx = body.value, h = mailHtml(body.value, url);
        function fb() { note.textContent = "Tu navegador no permite copiar con formato. Usa Copiar mensaje y Descargar gráfico, y adjunta la imagen."; }
        if (navigator.clipboard && window.ClipboardItem) {
          navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([h], { type: "text/html" }), "text/plain": new Blob([tx], { type: "text/plain" }) })]).then(function () { note.textContent = "Copiado con el gráfico. Pégalo en tu correo (si no sale la imagen, usa Descargar gráfico y adjúntala)."; }, fb);
        } else fb();
      });
    }
    ov.querySelector("#mcopys").addEventListener("click", function () { copy(sub.value, "Asunto copiado."); });
    ov.querySelector("#mopen").addEventListener("click", function (e) {
      e.preventDefault();
      var b = body.value, cut = b.length > 1800;
      if (cut) b = b.slice(0, 1800) + "...";
      location.href = "mailto:?subject=" + encodeURIComponent(sub.value) + "&body=" + encodeURIComponent(b);
      if (cut) note.textContent = "El mensaje es largo: tu correo solo recibe el principio. Usa Copiar mensaje para llevarlo entero.";
    });
    body.focus();
  }
  function mailBtn(fn, cls) {
    var b = document.createElement("button"); b.type = "button"; b.className = cls || "btn ghost"; b.textContent = "Correo";
    b.addEventListener("click", function () { mailModal(fn()); });
    return b;
  }
  function pdfNow(title, sub, only) {
    var d = document.getElementById("printhead");
    if (!d) { d = document.createElement("div"); d.id = "printhead"; d.className = "printhead"; app.insertBefore(d, app.firstChild); }
    d.innerHTML = '<h1 class="ph">' + esc(title) + "</h1><p>" + esc(sub) + " · " + new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) + "</p>";
    if (only) { only.classList.add("pr-on"); document.body.classList.add("po"); }
    function done() { if (only) only.classList.remove("pr-on"); document.body.classList.remove("po"); window.removeEventListener("afterprint", done); }
    window.addEventListener("afterprint", done);
    window.print();
  }
  function pdfBtn(titleFn, only) {
    var b = document.createElement("button"); b.type = "button"; b.className = "btn ghost"; b.textContent = "Descargar PDF";
    b.addEventListener("click", function () { var t = titleFn(); pdfNow(t[0], t[1], only ? only() : null); });
    return b;
  }

  /* ---- Presentación en PDF (formato cliente) ---- */
  function dkp(v, d) { return isNum(v) ? nf(v, d == null ? 1 : d) + "%" : "n.d."; }
  function dkv(v, d) { return '<b class="' + (isNum(v) && v < 0 ? "ng" : "") + '">' + dkp(v, d) + "</b>"; }
  function dkDate() { return new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }); }
  function dkFoot(n) { return '<div class="dk-ft"><span>Datos de Morningstar a ' + esc(META && (META.rv || META.rf) || "") + '</span><span>' + n + "</span></div>"; }
  function dkSlide(title, sub, body, n) {
    return '<section class="dk-s"><div class="dk-top"><div><h2>' + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + '</div><span class="dk-bd">Renta 4 Banco</span></div><div class="dk-body">' + body + "</div>" + dkFoot(n) + "</section>";
  }
  function dkCover(kicker, title, sub, stats) {
    return '<section class="dk-s dk-cv"><div class="dk-sh1"></div><div class="dk-sh2"></div><div class="dk-cvt"><div class="dk-k">' + esc(kicker) + "</div><h1>" + esc(title) + "</h1><p>" + esc(sub) + "</p></div>" +
      (stats && stats.length ? '<div class="dk-cst">' + stats.map(function (s) { return "<div><b>" + esc(s[1]) + "</b><span>" + esc(s[0]) + "</span></div>"; }).join("") + "</div>" : "") + '<div class="dk-lg">Renta 4 Banco</div></section>';
  }
  function dkKpi(l, v, neg) { return '<div class="dk-kpi"><span>' + esc(l) + '</span><b class="' + (neg ? "ng" : "") + '">' + esc(v) + "</b></div>"; }
  function dkIdeas(f) {
    var r = f.ret, rf = f.t === "rf", out = [], v1 = f.vol && f.vol[0], sh = f.sharpe && f.sharpe[0], dd = f.dd && f.dd[4];
    var a = [];
    if (isNum(r.y3)) a.push(dkp(r.y3) + " anual a tres años");
    if (isNum(r.y1)) a.push(r.y1 < 0 ? "ajuste del " + dkp(Math.abs(r.y1)) + " en el último año" : dkp(r.y1) + " en el último año");
    if (a.length) out.push(["Rentabilidad", listJoin(a)]);
    var b = [];
    if (rf) {
      if (isNum(f.dur)) b.push("duración de " + nf(f.dur, 2) + " años");
      if (f.cal) b.push("calidad " + f.cal);
      if (isNum(f.tir)) b.push("TIR " + dkp(f.tir, 2));
    } else {
      if (f.reg && f.reg[0]) b.push(nf(f.reg[1], 0) + "% en " + f.reg[0]);
      if (f.sec && f.sec[0]) b.push(nf(f.sec[1], 0) + "% en " + String(f.sec[0]).toLowerCase());
    }
    if (b.length) out.push(["Posicionamiento", listJoin(b)]);
    var c = [];
    if (isNum(v1)) c.push("volatilidad " + volWord(v1) + " (" + dkp(v1) + ")");
    if (isNum(sh)) c.push("Sharpe " + nf(sh, 2));
    if (isNum(dd)) c.push("caída máxima " + dkp(Math.abs(dd)));
    if (c.length) out.push(["Riesgo", listJoin(c)]);
    return out;
  }
  function dkCard(f, chip, logo) {
    return '<div class="dk-card">' + (logo ? '<div class="dk-ch">' + fLogo(f.g, true) + "<div>" : "") + "<h3>" + esc(f.n) + '</h3><small>' + esc(f.g) + " · ISIN " + esc(f.id) + (chip ? ' <u>' + esc(chip) + "</u>" : "") + "</small>" + (logo ? "</div></div>" : "") + dkIdeas(f).map(function (t) { return "<p><i>" + t[0] + "</i>" + esc(t[1]) + "</p>"; }).join("") + "</div>";
  }
  function dkLegal(n) {
    return dkSlide("Aviso legal", "Información importante", '<div class="dk-legal"><p>Este documento tiene carácter meramente informativo y no constituye asesoramiento personalizado, recomendación de inversión ni oferta o solicitud de compra o venta de ningún instrumento financiero.</p>' +
      "<p>Las rentabilidades pasadas no garantizan resultados futuros. El valor de las inversiones puede subir o bajar y es posible recuperar un importe inferior al invertido.</p>" +
      "<p>Los datos proceden de Morningstar y de las fuentes que se citan en cada página, pueden contener errores y corresponden a la fecha indicada. Las carteras y los fondos que aparecen son ejemplos de análisis y su idoneidad depende del perfil de riesgo, la situación financiera y los objetivos de cada cliente.</p>" +
      "<p>Antes de invertir, consulta la documentación legal de cada fondo (folleto y documento de datos fundamentales) y valora con tu asesor si encaja contigo.</p></div>", n);
  }
  function dkPrint(html, src) {
    var old = document.getElementById("deck"); if (old) old.remove();
    var d = document.createElement("div"); d.id = "deck"; d.innerHTML = html + dkLegal(0); document.body.appendChild(d);
    var ss = d.querySelectorAll(".dk-s"), i, sp;
    for (i = 0; i < ss.length; i++) {
      sp = ss[i].querySelectorAll(".dk-ft span");
      if (sp.length > 1) { sp[1].textContent = (i + 1) + " / " + ss.length; if (src) sp[0].textContent = src; }
    }
    var st = document.createElement("style"); st.id = "deckpage"; st.textContent = "@media print{@page{size:A4 landscape;margin:0}}"; document.head.appendChild(st);
    document.body.classList.add("pd");
    function done() { document.body.classList.remove("pd"); d.remove(); st.remove(); window.removeEventListener("afterprint", done); }
    window.addEventListener("afterprint", done);
    // se espera a los iconos (como mucho 3 segundos) antes de abrir la impresión
    var pend = [].slice.call(d.querySelectorAll("img")).filter(function (im) { return !im.complete; }), left = pend.length, sent = false;
    function go() { if (!sent && d.parentNode) { sent = true; window.print(); } }
    function one() { if (--left === 0) setTimeout(go, 150); }
    pend.forEach(function (im) { im.addEventListener("load", one); im.addEventListener("error", one); });
    setTimeout(go, left ? 3000 : 150);
  }
  function deckBtn(fn) {
    var b = document.createElement("button"); b.type = "button"; b.className = "btn ghost"; b.textContent = "Descargar PDF";
    b.addEventListener("click", fn); return b;
  }
  function deckPortfolio(name, prof, amount, lines) {
    var fs = lines.map(function (l) { return { l: l, f: byId(l.id) }; }).filter(function (x) { return x.f && x.l.w > 0; }), tw = 0, rfW = 0, n = 2, S = [];
    fs.forEach(function (x) { tw += x.l.w; if (x.f.t === "rf") rfW += x.l.w; });
    var a = wAvgF(lines, function (f) { return f.ret.ytd; }), b = wAvgF(lines, function (f) { return f.ret.y1; }), c3 = wAvgF(lines, function (f) { return f.ret.y3; }), v = wAvgF(lines, function (f) { return f.vol && f.vol[0]; }), sh = wAvgF(lines, function (f) { return f.sharpe && f.sharpe[0]; });
    var sub = (prof ? "Perfil " + prof.toLowerCase().replace(/a$/, "o") + " · " : "") + (amount > 0 ? nf(amount, 0) + " € · " : "") + dkDate();
    S.push(dkCover("Propuesta de cartera", name || "Cartera", sub, [["Rentabilidad 3 años anual", dkp(c3)], ["Volatilidad media", dkp(v)], ["Fondos", String(fs.length)]]));
    var rfp = tw ? rfW / tw * 100 : 0, mxw = 1;
    fs.forEach(function (x) { mxw = Math.max(mxw, x.l.w); });
    var rows = fs.slice().sort(function (p, q) { return q.f.t === p.f.t ? q.l.w - p.l.w : (p.f.t === "rf" ? -1 : 1); }).map(function (x) {
      return "<tr><td><b>" + esc(x.f.n) + "</b><small>ISIN " + esc(x.f.id) + " · " + esc(x.f.g) + " · " + esc(x.f.c) + '</small></td><td class="w"><div class="dk-pb"><i style="width:' + (x.l.w / mxw * 100) + '%;background:' + (x.f.t === "rf" ? "#a3173f" : "#2a5ca8") + '"></i></div><b>' + nf(x.l.w, 1) + "%</b></td>" + (amount > 0 ? '<td class="r">' + nf(amount * x.l.w / 100, 0) + " €</td>" : "") + '<td class="r">' + dkv(x.f.ret.y1) + "</td></tr>";
    }).join("");
    S.push(dkSlide("Composición de la cartera", fs.length + " fondos de gestión activa",
      '<div class="dk-two dk-comp"><div class="dk-l"><table class="dk-t"><thead><tr><th>Fondo</th><th>Peso</th>' + (amount > 0 ? '<th class="r">Importe</th>' : "") + '<th class="r">1 año</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="dk-r"><div class="dk-dn" style="background:conic-gradient(#a3173f 0 ' + rfp + "%,#2a5ca8 " + rfp + '% 100%)"><i><b>' + nf(fs.length, 0) + "</b>fondos</i></div>" +
      '<div class="dk-lgd"><span><u style="background:#a3173f"></u>Renta fija<b>' + nf(rfp, 0) + '%</b></span><span><u style="background:#2a5ca8"></u>Renta variable<b>' + nf(100 - rfp, 0) + "%</b></span></div></div></div>", n++)
      // con muchos fondos se compactan las filas para que la composición entre en una página
      .replace('class="dk-s"', 'class="dk-s' + (fs.length > 15 ? " dk-one-page dk-c3" : fs.length > 10 ? " dk-one-page dk-c2" : fs.length > 6 ? " dk-one-page dk-c1" : "") + '"'));
    var mx = 1;
    fs.forEach(function (x) { if (isNum(x.f.ret.y1)) mx = Math.max(mx, Math.abs(x.f.ret.y1)); });
    var bars = fs.map(function (x) {
      var y1 = x.f.ret.y1, v1 = x.f.vol && x.f.vol[0];
      return '<div class="dk-br"><span>' + esc(x.f.n) + '</span><div><i style="width:' + (isNum(y1) ? Math.max(2, Math.abs(y1) / mx * 100) : 0) + "%;background:" + (isNum(y1) && y1 < 0 ? "#a3173f" : "#1f7a4d") + '"></i></div><b>' + dkp(y1) + "</b><em>vol. " + dkp(v1) + "</em></div>";
    }).join("");
    S.push(dkSlide("Rentabilidad y riesgo", "Medias ponderadas por el peso de cada fondo",
      '<div class="dk-kpis" style="grid-template-columns:repeat(5,1fr)">' + dkKpi("En el año", dkp(a), a < 0) + dkKpi("Último año", dkp(b), b < 0) + dkKpi("3 años anual", dkp(c3), c3 < 0) + dkKpi("Volatilidad", dkp(v)) + dkKpi("Sharpe", isNum(sh) ? nf(sh, 2) : "n.d.") + "</div>" +
      '<h4 class="dk-h4">Rentabilidad a un año por fondo</h4><div class="dk-wide' + (fs.length > 15 ? " dk-tight" : "") + '">' + bars + "</div>", n++));
    for (var i = 0; i < fs.length; i += 6) {
      S.push(dkSlide("Ideas clave por fondo", "", '<div class="dk-grid">' + fs.slice(i, i + 6).map(function (x) { return dkCard(x.f, nf(x.l.w, 1) + "%"); }).join("") + "</div>", n++));
    }
    dkPrint(S.join(""));
  }
  function deckFund(f) {
    var r = f.ret, y = mailYear(), v1 = f.vol && f.vol[0], sh = f.sharpe && f.sharpe[0], S = [];
    S.push(dkCover("Ficha de fondo", f.n, "ISIN " + f.id + " · " + f.g + " · " + f.c + " · " + dkDate(), [["3 años anual", dkp(r.y3)], ["Volatilidad", dkp(v1)], ["Sharpe", isNum(sh) ? nf(sh, 2) : "n.d."]]));
    var yrs = (f.ann || []).map(function (v, i) { return { y: i === 0 ? "Año actual" : String(y - i), v: v }; }).filter(function (o, i) { return i <= 5 && isNum(o.v); }), mxv = 1;
    yrs.forEach(function (o) { mxv = Math.max(mxv, Math.abs(o.v)); });
    S.push(dkSlide(f.n, "ISIN " + f.id + " · " + f.g + " · " + f.c,
      '<div class="dk-kpis">' + dkKpi("En el año", dkp(r.ytd), r.ytd < 0) + dkKpi("Último año", dkp(r.y1), r.y1 < 0) + dkKpi("3 años anual", dkp(r.y3), r.y3 < 0) + dkKpi("5 años anual", dkp(r.y5), r.y5 < 0) + dkKpi("Volatilidad", dkp(v1)) + dkKpi("Sharpe", isNum(sh) ? nf(sh, 2) : "n.d.") + "</div>" +
      '<div class="dk-two"><div class="dk-l"><h4 class="dk-h4">Año a año</h4>' + yrs.map(function (o) { return '<div class="dk-br"><span>' + o.y + '</span><div><i style="width:' + Math.max(2, Math.abs(o.v) / mxv * 100) + "%;background:" + (o.v < 0 ? "#a3173f" : "#1f7a4d") + '"></i></div><b>' + dkp(o.v) + "</b></div>"; }).join("") +
      '</div><div class="dk-r"><div class="dk-card dk-one"><h3>Ideas clave</h3>' + dkIdeas(f).map(function (t) { return "<p><i>" + t[0] + "</i>" + esc(t[1]) + "</p>"; }).join("") + "</div></div></div>", 2));
    dkPrint(S.join(""));
  }
  function deckCompare(fs) {
    var S = [], n = 2;
    S.push(dkCover("Comparativa de fondos", fs.length + " fondos", fs.map(function (f) { return f.n + " (" + f.id + ")"; }).join("\n")));
    var rows = [["Categoría", function (f) { return esc(f.c); }],
      ["En el año", function (f) { return dkv(f.ret.ytd); }], ["1 año", function (f) { return dkv(f.ret.y1); }], ["3 años anual", function (f) { return dkv(f.ret.y3); }], ["5 años anual", function (f) { return dkv(f.ret.y5); }],
      ["Volatilidad", function (f) { return dkp(f.vol && f.vol[0]); }], ["Sharpe", function (f) { return f.sharpe && isNum(f.sharpe[0]) ? nf(f.sharpe[0], 2) : "n.d."; }],
      ["Caída máxima", function (f) { return dkp(f.dd && isNum(f.dd[4]) ? Math.abs(f.dd[4]) : null); }],
      ["Morningstar", function (f) { return f.stars ? f.stars + " estrellas" : "n.d."; }]];
    var avail = [];
    cmpSections(fs).forEach(function (x) { x[1].forEach(function (it) { if (x[0] !== CMP_VIS_T) avail.push(it); }); });
    if (avail.some(function (it) { return !cmpOn(it.k); })) { // campos elegidos a mano
      rows = [];
      avail.filter(function (it) { return cmpOn(it.k); }).forEach(function (it) {
        if (it.k === "info") rows.push(["Categoría", function (f) { return esc(f.c); }], ["Morningstar", function (f) { return f.stars ? f.stars + " estrellas" : "n.d."; }]);
        else rows.push([esc(it.l), function (f) {
          var v = it.m.v(f);
          if (it.k === "pos3" || it.k === "pos5") return isNum(v) ? Math.round(v) + "% positivos, " + (100 - Math.round(v)) + "% negativos" : "n.d.";
          return (it.m.txt ? v : isNum(v)) ? cell(f, it.m) : "n.d.";
        }]);
      });
    }
    // todas las filas en una sola página: la altura de fila se ajusta al número de campos
    var rh = Math.max(14, Math.min(34, Math.floor(550 / Math.max(1, rows.length))));
    var fz = rh >= 28 ? 13 : rh >= 23 ? 12 : rh >= 19 ? 11 : rh >= 17 ? 10 : 9;
    var pad = Math.max(0, Math.floor((rh - 1 - fz * 1.25) / 2 * 10) / 10);
    S.push(dkSlide("Comparativa", "Datos de Morningstar a " + (META && (META.rv || META.rf) || ""),
      '<table class="dk-t dk-cmp" style="--fz:' + fz + "px;--pad:" + pad + 'px"><thead><tr><th></th>' + fs.map(function (f) { return '<th><div>' + fLogo(f.g, true) + "<span>" + esc(f.n) + "<small>" + esc(f.g) + "</small><small>ISIN " + esc(f.id) + "</small></span></div></th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr><td><b>" + r[0] + "</b></td>" + fs.map(function (f) { return '<td class="r">' + r[1](f) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>", n++).replace('class="dk-s"', 'class="dk-s dk-one-page"'));
    S.push(dkSlide("Ideas clave por fondo", "", '<div class="dk-grid dk-g' + Math.min(fs.length, 3) + '">' + fs.map(function (f) { return dkCard(f, "", true); }).join("") + "</div>", n++));
    dkPrint(S.join(""));
  }

  function viewCompare(raw) {
    setTitle("Comparador de fondos");
    var ids = (raw ? raw.split(",") : []).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } })
      .filter(function (id, i, a) { return byId(id) && a.indexOf(id) === i; }).slice(0, CMP_MAX);
    var fs = ids.map(byId);
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Comparador de fondos</h1>' +
      '<p class="sub">Elige entre 2 y ' + CMP_MAX + ' fondos para ver sus métricas una al lado de otra. En cada fila se marca el mejor valor.</p>';
    if (fs.length < 2) h += '<div class="sel">' + fs.map(function (f, i) {
      var rest = ids.filter(function (x) { return x !== f.id; });
      return '<a class="selchip" href="' + hashFor(rest) + '" style="--c:' + CMP_COLORS[i] + '" title="Quitar de la comparación">' + fLogo(f.g) + esc(f.n) + " <b>×</b></a>";
    }).join("") + "</div>";
    if (ids.length < CMP_MAX) {
      h += '<div class="search tight">' + icon() + '<input id="cq" type="search" autocomplete="off" placeholder="Añadir fondo por nombre o ISIN" aria-label="Añadir fondo"></div><div class="results cmpres" id="cres"></div>';
    }
    h += fs.length >= 2 ? cmpPicker(fs) + '<div id="cmpbody">' + cmpBody(fs) + "</div>" : '<p class="muted" style="margin-top:20px">Añade al menos 2 fondos para compararlos.</p>';
    app.innerHTML = h + footer("rv");
    if (fs.length >= 2) cmpWire(fs);
    if (fs.length >= 2) { var cb = deckBtn(function () { deckCompare(fs); }); var tb = document.createElement("div"); tb.className = "row tools2"; tb.appendChild(cb); app.appendChild(tb); }
    var cq = document.getElementById("cq");
    if (cq) {
      var mk = function (f) { return '<a href="' + hashFor(ids.concat(f.id)) + '">' + fLogo(f.g) + "<div>" + esc(f.n) + "<small>" + esc(f.g) + " · " + esc(f.c) + "</small></div></a>"; };
      var sug = function () {
        var res = document.getElementById("cres");
        if (!res || !fs.length) return;
        var same = FUNDS.filter(function (f) { return ids.indexOf(f.id) === -1 && f.c === fs[0].c; }).slice(0, 8), tit = "Fondos de la misma categoría (" + esc(fs[0].c) + ")";
        if (!same.length) { same = FUNDS.filter(function (f) { return ids.indexOf(f.id) === -1 && f.t === fs[0].t; }).slice(0, 8); tit = fs[0].t === "rf" ? "Otros fondos de renta fija" : "Otros fondos de renta variable"; }
        res.innerHTML = same.length ? '<p class="note" style="margin:10px 0 4px">' + tit + "</p>" + '<div class="list">' + same.map(mk).join("") + "</div>" : "";
      };
      cq.addEventListener("input", function () {
        var v = cq.value.trim(), res = document.getElementById("cres");
        if (!v) { sug(); return; }
        res.innerHTML = pickList(v, ids, mk);
      });
      var box = document.getElementById("cres");
      if (fs.length < 2) { sug(); if (fs.length === 1) try { cq.focus(); } catch (e) { /* sin foco */ } }
      else {
        cq.addEventListener("focus", sug);
        box.addEventListener("mousedown", function (e) { e.preventDefault(); });
        cq.addEventListener("blur", function (e) { if (!e.relatedTarget || !box.contains(e.relatedTarget)) { box.innerHTML = ""; cq.value = ""; } });
      }
    }
  }

  /* ---- campos elegidos en el comparador (se recuerdan en este navegador) ---- */
  var CMP_STORE = "cf_cmp_off", CMP_VIS_T = "Resumen y gráficos", cmpOpen = false, cmpScatY = 3;
  var CMP_PRE = [["Todo", null],
    ["Esencial", "info cards scat chart ytd y1 y3 y5 sh3 vol3 ddmax".split(" ")],
    ["3 y 5 años", "info cards scat chart y3 y5 sh3 mar3 alpha beta r2 vol3 vol5 ddmax worst3 pos3 worst5 pos5".split(" ")],
    ["Riesgo", "info cards scat sh1 sh3 mar3 beta vol1 vol3 vol5 ddmax worst3 pos3 worst5 pos5".split(" ")]];
  var cmpOff = (function () { try { var v = JSON.parse(localStorage.getItem(CMP_STORE) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } })();
  function cmpOn(k) { return cmpOff.indexOf(k) === -1; }
  function cmpSections(fs) {
    function shown(m) { return fs.some(function (f) { var v = m.v(f); return m.txt ? !!v : isNum(v); }); }
    function item(m) { return { k: m.k, m: m, l: m.k === "pos3" ? "Meses 3 años" : m.k === "pos5" ? "Meses 5 años" : m.l }; }
    var secs = [["General", [{ k: "info", l: "Categoría y rating" }]]];
    GROUPS.forEach(function (g) {
      secs.push([g, METRICS.filter(function (m) { return m.g === g && CMP_HIDE.indexOf(m.k) === -1 && CMP_MONTH.indexOf(m.k) === -1 && shown(m); }).map(item)]);
      if (g === "Riesgo") secs.push(["Comportamiento mensual", CMP_MONTH.map(metric).filter(shown).map(item)]);
    });
    var vis = [{ k: "cards", l: "Tarjetas resumen" }];
    if (cmpPts(fs, 3).length || cmpPts(fs, 5).length) vis.push({ k: "scat", l: "Rentabilidad frente a riesgo" });
    if (cmpChart(fs)) vis.push({ k: "chart", l: "Rentabilidad por año" });
    secs.push([CMP_VIS_T, vis]);
    return secs.filter(function (x) { return x[1].length; });
  }
  function cmpPicker(fs) {
    return '<div class="cmpf" id="cmpf"><div class="cmpf-top"><span class="cmpf-t">Vista</span><div class="cmpf-pre" role="group" aria-label="Vistas rápidas">' +
      CMP_PRE.map(function (v, i) { return '<button type="button" data-pre="' + i + '">' + v[0] + "</button>"; }).join("") +
      '</div><button type="button" class="cmpf-more" aria-controls="cmpfb" aria-expanded="' + cmpOpen + '">Elegir campos <b id="cmpfn"></b></button></div>' +
      '<div class="cmpf-body" id="cmpfb"' + (cmpOpen ? "" : " hidden") + '><div class="cmpf-bar"><span>Pulsa un campo para mostrarlo u ocultarlo, o el título de un bloque para cambiarlo entero. El PDF usa la misma selección.</span><button type="button" class="btn ghost sm" data-all="1">Marcar todos</button><button type="button" class="btn ghost sm" data-all="0">Quitar todos</button></div>' +
      cmpSections(fs).map(function (sec, i) {
        return '<div class="cmpf-sec"><button type="button" class="cmpf-h" data-sec="' + i + '">' + sec[0] + '</button><div class="cmpf-list">' +
          sec[1].map(function (it) { return '<button type="button" class="cf" data-k="' + it.k + '">' + esc(it.l) + "</button>"; }).join("") + "</div></div>";
      }).join("") + "</div></div>";
  }
  function cmpWire(fs) {
    var box = document.getElementById("cmpf"), body = document.getElementById("cmpbody"), secs = cmpSections(fs), all = [];
    if (!box) return;
    secs.forEach(function (sec) { sec[1].forEach(function (it) { all.push(it.k); }); });
    function inPre(i, k) { return !CMP_PRE[i][1] || CMP_PRE[i][1].indexOf(k) !== -1; }
    function paint() {
      [].forEach.call(box.querySelectorAll(".cf"), function (b) { b.setAttribute("aria-pressed", cmpOn(b.getAttribute("data-k")) ? "true" : "false"); });
      [].forEach.call(box.querySelectorAll("[data-pre]"), function (b) {
        var i = +b.getAttribute("data-pre");
        b.setAttribute("aria-pressed", all.every(function (k) { return cmpOn(k) === inPre(i, k); }) ? "true" : "false");
      });
      document.getElementById("cmpfn").textContent = all.filter(cmpOn).length + " de " + all.length;
    }
    function apply(off) {
      cmpOff = off;
      try { localStorage.setItem(CMP_STORE, JSON.stringify(cmpOff)); } catch (e) { /* sin almacenamiento */ }
      paint();
      body.innerHTML = cmpBody(fs);
    }
    function set(keys, on) {
      var off = cmpOff.filter(function (k) { return keys.indexOf(k) === -1; });
      apply(on ? off : off.concat(keys));
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button") : null;
      if (!b) return;
      if (b.classList.contains("cmpf-more")) { cmpOpen = !cmpOpen; b.setAttribute("aria-expanded", cmpOpen); document.getElementById("cmpfb").hidden = !cmpOpen; }
      else if (b.hasAttribute("data-pre")) { var i = +b.getAttribute("data-pre"); apply(cmpOff.filter(function (k) { return all.indexOf(k) === -1; }).concat(all.filter(function (k) { return !inPre(i, k); }))); }
      else if (b.hasAttribute("data-k")) { var k = b.getAttribute("data-k"); set([k], !cmpOn(k)); }
      else if (b.hasAttribute("data-sec")) { var ks = secs[+b.getAttribute("data-sec")][1].map(function (it) { return it.k; }); set(ks, !ks.every(cmpOn)); }
      else if (b.hasAttribute("data-all")) set(all, b.getAttribute("data-all") === "1");
    });
    body.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-scy]") : null;
      if (!b) return;
      cmpScatY = +b.getAttribute("data-scy");
      body.innerHTML = cmpBody(fs);
    });
    paint();
  }
  function cmpBody(fs) {
    var g = (cmpOn("scat") ? cmpScatter(fs) : "") + (cmpOn("chart") ? cmpChart(fs) : "");
    return (cmpOn("cards") ? cmpCards(fs) : "") + cmpTable(fs) + (g ? '<div class="cmpgs">' + g + "</div>" : "");
  }
  function cmpCards(fs) {
    var ids = fs.map(function (f) { return f.id; });
    function top(fn, dir) {
      var v = fs.map(fn).filter(isNum);
      return v.length > 1 ? (dir > 0 ? Math.max.apply(null, v) : Math.min.apply(null, v)) : null;
    }
    var gy3 = function (f) { return f.ret.y3; }, gv = function (f) { return f.vol && f.vol[1]; }, gd = function (f) { return f.dd && f.dd[4]; };
    var by = top(gy3, 1), bv = top(gv, -1), bd = top(gd, 1);
    return '<div class="cmpcards" style="--n:' + fs.length + '">' + fs.map(function (f, i) {
      var rest = ids.filter(function (x) { return x !== f.id; }), has3 = isNum(f.ret.y3), big = has3 ? f.ret.y3 : f.ret.y1, badges = [];
      if (by !== null && gy3(f) === by) badges.push("Más rentable a 3 años");
      if (bv !== null && gv(f) === bv) badges.push("Menor volatilidad");
      if (bd !== null && gd(f) === bd) badges.push("Menor caída");
      function stat(l, v, c) { return "<div><dt>" + l + '</dt><dd class="' + (c || "") + '">' + v + "</dd></div>"; }
      return '<article class="cmpc" style="--c:' + CMP_COLORS[i] + '"><a class="cmpc-x" href="' + hashFor(rest) + '" title="Quitar de la comparación" aria-label="Quitar ' + esc(f.n) + '">×</a>' +
        '<div class="cmpc-h">' + fLogo(f.g) + '<div><a class="cmpc-n" href="#/fondo/' + encodeURIComponent(f.id) + '">' + esc(f.n) + "</a><small>" + esc(f.g) + "</small></div></div>" +
        (cmpOn("info") ? '<div class="cmpc-i"><span class="cat">' + esc(f.c) + '</span><span class="cst">' + (f.stars ? stars(f.stars) : '<span class="muted">Sin rating</span>') + "</span></div>" : "") +
        '<div class="cmpc-big"><b class="' + (isNum(big) ? cls(big) : "") + '">' + pct(big, true, 2) + "</b><span>" + (has3 ? "Rentabilidad anual a 3 años" : "Rentabilidad a 1 año") + "</span></div>" +
        "<dl>" + stat("5 años anual", pct(f.ret.y5, true, 2), isNum(f.ret.y5) ? cls(f.ret.y5) : "") + stat("Volatilidad 3 años", pct(gv(f), false, 1)) + stat("Caída máxima", pct(gd(f), false, 1)) + "</dl>" +
        '<div class="cmpc-b">' + badges.map(function (b) { return "<span>" + b + "</span>"; }).join("") + "</div></article>";
    }).join("") + "</div>";
  }
  function cmpPts(fs, y) {
    var out = [];
    fs.forEach(function (f, i) {
      var r = y === 3 ? f.ret.y3 : f.ret.y5, v = f.vol && f.vol[y === 3 ? 1 : 2];
      if (isNum(r) && isNum(v)) out.push({ f: f, i: i, r: r, v: v });
    });
    return out;
  }
  function cmpScatter(fs) {
    var y = cmpScatY;
    if (!cmpPts(fs, y).length) y = y === 3 ? 5 : 3;
    var pts = cmpPts(fs, y);
    if (!pts.length) return "";
    var rs = pts.map(function (p) { return p.r; }), xhi = Math.max.apply(null, pts.map(function (p) { return p.v; })) * 1.18 || 1;
    var lo = Math.min(0, Math.min.apply(null, rs) * 1.3), hi = Math.max(1, Math.max.apply(null, rs) * 1.2);
    function X(v) { return (v / xhi * 100).toFixed(2); }
    function Y(v) { return ((v - lo) / (hi - lo) * 100).toFixed(2); }
    var tx = ticks(0, xhi, 5), ty = ticks(lo, hi, 5);
    var grid = ty.map(function (v) { return '<i class="sgy' + (v === 0 ? " sz" : "") + '" style="bottom:' + Y(v) + '%"><span>' + nf(v, dd(ty)) + "%</span></i>"; }).join("") +
      tx.map(function (v) { return '<i class="sgx" style="left:' + X(v) + '%"><span>' + nf(v, dd(tx)) + "%</span></i>"; }).join("");
    var miss = fs.filter(function (f) { return !pts.some(function (p) { return p.f === f; }); });
    return '<div class="chart-card cmpg"><div class="cmpg-h"><p class="label">Rentabilidad frente a riesgo</p><div class="cmpg-seg">' + [3, 5].map(function (n) {
      return '<button type="button" data-scy="' + n + '" aria-pressed="' + (n === y) + '"' + (cmpPts(fs, n).length ? "" : " disabled") + ">" + n + " años</button>";
    }).join("") + '</div></div><p class="scat-ay">↑ Rentabilidad anual</p><div class="scat"><div class="scat-plot">' + grid + pts.map(function (p) {
      return '<a class="sp" href="#/fondo/' + encodeURIComponent(p.f.id) + '" style="--c:' + CMP_COLORS[p.i] + ";left:" + X(p.v) + "%;bottom:" + Y(p.r) + '%" title="' + esc(p.f.n) + ": rentabilidad " + pct(p.r, true, 2) + ", volatilidad " + pct(p.v, false, 1) + '">' + fLogo(p.f.g) + "</a>";
    }).join("") + '</div></div><p class="scat-ax">Volatilidad (riesgo) →</p><ul class="scat-l">' + pts.map(function (p) {
      return '<li style="--c:' + CMP_COLORS[p.i] + '"><i></i><span>' + esc(p.f.n) + '</span><b class="' + cls(p.r) + '">' + pct(p.r, true, 2) + "</b><small>Vol. " + pct(p.v, false, 1) + "</small></li>";
    }).join("") + "</ul>" + (miss.length ? '<p class="note">Sin datos a ' + y + " años: " + esc(miss.map(function (f) { return f.n; }).join(", ")) + ".</p>" : '<p class="note">Cuanto más arriba y más a la izquierda, más rentabilidad con menos riesgo.</p>') + "</div>";
  }

  function cmpTable(fs) {
    var n = fs.length, ids = fs.map(function (f) { return f.id; });
    var head = '<tr><th scope="col" class="lb"><span class="cmpkey"><i></i>Mejor de la fila</span></th>' + fs.map(function (f, i) {
      var rest = ids.filter(function (x) { return x !== f.id; });
      return '<th scope="col" class="ch" style="--c:' + CMP_COLORS[i] + '"><a class="cq" href="' + hashFor(rest) + '" title="Quitar de la comparación" aria-label="Quitar ' + esc(f.n) + '">×</a>' +
        '<div class="cmph"><span class="flogo">' + logoOrInit(f.g) + '</span><div><a class="cn" href="#/fondo/' + encodeURIComponent(f.id) + '">' + esc(f.n) + "</a><small>" + esc(f.g) + "</small></div></div></th>";
    }).join("") + "</tr>";
    var rows = !cmpOn("info") || cmpOn("cards") ? "" : '<tr class="info"><td class="lb">Categoría y rating Morningstar</td>' + fs.map(function (f) {
      return '<td><span class="cat">' + esc(f.c) + '</span><span class="cst">' + (f.stars ? stars(f.stars) : '<span class="muted">Sin rating</span>') + "</span></td>";
    }).join("") + "</tr>";
    var secs = cmpSections(fs).filter(function (x) { return x[0] !== "General" && x[0] !== CMP_VIS_T; })
      .map(function (x) { return [x[0], x[1].filter(function (it) { return cmpOn(it.k); }).map(function (it) { return it.m; })]; });
    secs.forEach(function (sec) {
      if (!sec[1].length) return;
      rows += '<tr class="grp"><th colspan="' + (n + 1) + '" scope="colgroup"><span>' + cmpIcon(sec[0]) + sec[0] + "</span></th></tr>";
      sec[1].forEach(function (m) {
        var vals = fs.map(function (f) { return m.v(f); });
        var dir = BETTER.hi.indexOf(m.k) !== -1 ? 1 : BETTER.lo.indexOf(m.k) !== -1 ? -1 : 0;
        var nums = m.txt ? [] : vals.filter(isNum), best = null;
        if (dir && nums.length > 1) best = dir > 0 ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
        var split = m.k === "pos3" || m.k === "pos5";
        var two = (m.g === "Rentabilidad" || m.g === "Ratios") && nums.some(function (v) { return v < 0; }); // barras a ambos lados del cero
        var max = nums.length && CMP_NOBAR.indexOf(m.k) === -1 ? Math.max.apply(null, nums.map(Math.abs)) : 0;
        var label = split ? "Meses " + (m.k === "pos3" ? "3" : "5") + " años<small>En positivo y en negativo</small>" : esc(m.l);
        rows += '<tr><td class="lb">' + label + "</td>" + fs.map(function (f, i) {
          var v = vals[i], inner;
          if (split && isNum(v)) {
            var p = Math.round(v);
            inner = '<span class="cv msv"><span class="pos"><b>' + p + '%</b> ▲</span><span class="neg">▼ <b>' + (100 - p) + '%</b></span></span><span class="msplit"><u style="width:' + p + '%"></u></span>';
          } else {
            inner = '<span class="cv">' + cell(f, m) + "</span>";
            if (max > 0) inner += '<span class="cbar' + (two ? " two" : "") + '">' + (isNum(v) ? '<u class="' + (v < 0 ? "dn" : "") + '" style="width:' + Math.max(2, Math.abs(v) / max * (two ? 50 : 100)).toFixed(1) + '%"></u>' : "") + "</span>";
          }
          return '<td style="--c:' + CMP_COLORS[i] + '"' + (best !== null && v === best ? ' class="best"' : "") + ">" + inner + "</td>";
        }).join("") + "</tr>";
      });
    });
    if (!rows) rows = '<tr class="info"><td colspan="' + (n + 1) + '">No hay campos seleccionados. Marca alguno en Elegir campos.</td></tr>';
    return '<div class="cmpx" style="--n:' + n + '"><table><colgroup><col class="lbc">' + fs.map(function () { return "<col>"; }).join("") + "</colgroup><thead>" + head + "</thead><tbody>" + rows + "</tbody></table></div>";
  }

  function cmpIcon(t) {
    var P = { "Rentabilidad": "M3 17l6-6 4 4 8-8M15 7h6v6", "Ratios": "M12 3v18M5 21h14M4 7h16M7 7l-3 7h6zM17 7l-3 7h6z", "Riesgo": "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", "Comportamiento mensual": "M4 6h16v15H4zM4 10h16M8 3v5M16 3v5", "Cartera": "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" };
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (P[t] || "M5 12h.01M12 12h.01M19 12h.01") + '"/></svg>';
  }
  function cmpChart(fs) { // rentabilidad año a año, en color según el resultado
    var ys = YEARS.slice().reverse().filter(function (y) { return fs.some(function (f) { return annOf(f, y) !== null; }); });
    if (!ys.length) return "";
    return '<div class="chart-card cmpg"><div class="cmpg-h"><p class="label">Rentabilidad por año</p></div><table class="heat"><thead><tr><th scope="col">Año</th>' + fs.map(function (f, i) {
      return '<th scope="col" style="--c:' + CMP_COLORS[i] + '" title="' + esc(f.n) + '">' + fLogo(f.g) + "<span>" + esc(f.n) + "</span></th>";
    }).join("") + "</tr></thead><tbody>" + ys.map(function (y) {
      var vs = fs.map(function (f) { return annOf(f, y); }), nums = vs.filter(isNum), best = nums.length > 1 ? Math.max.apply(null, nums) : null;
      return '<tr><th scope="row">' + esc(yearLabel(y)) + "</th>" + vs.map(function (v) {
        if (v === null) return '<td class="nd">–</td>';
        var a = (0.1 + Math.min(1, Math.abs(v) / 40) * 0.45).toFixed(2);
        return '<td class="' + (v === best ? "best" : "") + '" style="background:rgba(' + (v < 0 ? "205,50,70," : "31,140,85,") + a + ')">' + pct(v, true, 1) + "</td>";
      }).join("") + "</tr>";
    }).join("") + '</tbody></table><p class="note">Verde: año en positivo. Rojo: año en negativo. Con borde, el mejor de cada año.</p></div>';
  }

  // ---------- carteras (se guardan solo en este navegador) ----------
  var PF_KEY = "cf_carteras";
  function loadPf() {
    try { var v = JSON.parse(localStorage.getItem(PF_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  var PF = loadPf();
  function savePf() { try { localStorage.setItem(PF_KEY, JSON.stringify(PF)); } catch (e) { /* sin almacenamiento */ } }
  function uid() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function pfById(id) { return PF.filter(function (p) { return p.id === id; })[0] || null; }
  function sumW(p) { return p.lines.reduce(function (a, l) { return a + (isNum(l.w) ? l.w : 0); }, 0); }
  function wAvg(p, get) {
    var s = 0, c = 0, tot = sumW(p);
    p.lines.forEach(function (l) {
      var f = byId(l.id);
      if (!f || !(l.w > 0)) return;
      var v = get(f);
      if (isNum(v)) { s += l.w * v; c += l.w; }
    });
    return { v: c ? s / c : null, cov: tot ? c / tot : 0 };
  }
  function maxFunds(amount) {
    if (!isNum(amount) || amount <= 0) return null;
    if (amount < 60000) return { n: 6, note: amount >= 50000 ? " (el tramo de 50.000 a 60.000 no está definido, se aplica el de menos de 50.000)" : "" };
    if (amount <= 100000) return { n: 8, note: "" };
    if (amount <= 300000) return { n: 10, note: "" };
    if (amount <= 1000000) return { n: 15, note: "" };
    return { n: null, note: " (por encima de 1.000.000 no hay tramo definido)" };
  }
  function cleanPf(o) {
    if (!o || typeof o.name !== "string" || !Array.isArray(o.lines)) return null;
    var lines = o.lines.filter(function (l) { return l && typeof l.id === "string" && byId(l.id); }).slice(0, 40).map(function (l) {
      var w = parseNum(l.w);
      return { id: l.id, w: w === null ? 0 : Math.max(0, Math.min(100, w)) };
    });
    var a = parseNum(o.amount);
    var out = { id: uid(), name: o.name.slice(0, 80) || "Cartera", amount: a !== null && a > 0 ? a : null, lines: lines };
    var B = o.base;
    if (B && Array.isArray(B.lines)) out.base = { t: String(B.t || ""), amount: parseNum(B.amount), lines: B.lines.filter(function (l) { return l && byId(l.id) && isNum(l.w); }).map(function (l) { return isNum(l.v) ? { id: l.id, w: l.w, v: l.v } : { id: l.id, w: l.w }; }) };
    return out;
  }

  // Importar la cartera desde un PDF de Morningstar (ISIN o nombre del fondo + peso o importe)
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function (ok, ko) {
      var sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      sc.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; ok(window.pdfjsLib); };
      sc.onerror = ko; document.head.appendChild(sc);
    });
  }
  function pdfLines(file) {
    return loadPdfJs().then(function (lib) {
      return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: buf }).promise; });
    }).then(function (doc) {
      var out = [], chain = Promise.resolve();
      for (var n = 1; n <= doc.numPages; n++) (function (n) {
        chain = chain.then(function () { return doc.getPage(n); }).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
          var rows = {};
          tc.items.forEach(function (it) { var y = Math.round(it.transform[5] / 3); (rows[y] = rows[y] || []).push(it); });
          Object.keys(rows).map(Number).sort(function (a, b) { return b - a; }).forEach(function (y) {
            out.push(rows[y].sort(function (a, b) { return a.transform[4] - b.transform[4]; }).map(function (i) { return i.str; }).join(" ").replace(/\s+/g, " ").trim());
          });
        });
      })(n);
      return chain.then(function () { return out; });
    });
  }
  function pdfNums(t) {
    var res = [], re = /(-?\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|-?\d+(?:[.,]\d+)?)(\s?%)?/g, m;
    while ((m = re.exec(t))) {
      var raw = m[1].replace(/\s/g, ""), v = /,/.test(raw) ? parseFloat(raw.replace(/\./g, "").replace(",", ".")) : /^-?\d{1,3}(\.\d{3})+$/.test(raw) ? parseFloat(raw.replace(/\./g, "")) : parseFloat(raw);
      if (isFinite(v)) res.push({ v: v, pct: !!m[2], dec: /[.,]\d{1,4}$/.test(raw) && !/^-?\d{1,3}(\.\d{3})+$/.test(raw) });
    }
    return res;
  }
  function cmp(s) { return norm(s).replace(/[^a-z0-9]/g, ""); }
  function fmtPct(v) { return nf(v, 2) + " %"; }
  // Formato X-Ray de Morningstar: lista "Posiciones de Cartera" (nombres completos) + tabla "Las 10 mayores posiciones" (pesos)
  function xrayImport(L) {
    var iPos = -1, i;
    for (i = 0; i < L.length; i++) if (/Total\s+\d+\s+Posiciones/i.test(L[i])) { iPos = i; break; }
    if (iPos < 0) return null;
    var names = [], types = "Fondo|Acci[oó]n|Acciones|Bono|Bonos|ETF|Efectivo|Otro|Plan de pensiones";
    for (i = iPos + 1; i < L.length; i++) {
      var ln = L[i];
      if (/©|Informe a fecha|Descargo/.test(ln)) break;
      var m = new RegExp("^(.*?)\\s+(?:" + types + ")\\s+(?:\\d{1,2}\\s+\\S+\\s+\\d{4}|no disponible)", "i").exec(ln);
      if (m) {
        var wm = /(\d{1,3},\d{1,2})\s*$/.exec(ln);
        names.push({ n: m[1].trim(), w: wm ? parseNum(wm[1]) : null });
      } else if (names.length && /^[A-Za-zÀ-ÿ.()€ -]{1,25}$/.test(ln.trim()) && !/^(Q{3,5}|-)$/.test(ln.trim())) names[names.length - 1].n += " " + ln.trim();
    }
    if (!names.length) return null;
    var wr = [];
    L.forEach(function (ln) {
      var m = /^\s*(\d{1,2})\s+(.+?)\s+(\d{1,3},\d{2})\s+(-|\d[\d.,]*)\s+(-|\d[\d.,]*)(?:\s|$)/.exec(ln);
      if (m) wr.push({ n: m[2].trim(), w: parseNum(m[3]) });
    });
    var pos = names.map(function (o) { return { n: o.n, c: cmp(o.n), w: o.w, f: null }; });
    wr.forEach(function (r) {
      var trunc = /(\.\.\.|…)\s*$/.test(r.n), c = cmp(r.n.replace(/(\.\.\.|…)\s*$/, "")), hit = pos.filter(function (p) { return p.w === null && (trunc ? p.c.indexOf(c) === 0 : p.c === c); });
      if (hit.length) hit[0].w = r.w;
    });
    pos.forEach(function (p) {
      var best = null;
      FUNDS.forEach(function (f) { var fc = cmp(f.n); if (fc.length >= 15 && p.c.slice(-fc.length) === fc && (!best || fc.length > cmp(best.n).length)) best = f; });
      p.f = best;
    });
    var known = pos.reduce(function (a, p) { return a + (p.w || 0); }, 0), now = pos.filter(function (p) { return p.w === null; });
    var rest = Math.max(0, 100 - known), est = now.length ? rest / now.length : 0, lines = [], miss = [], estim = [], seen = {};
    pos.forEach(function (p) {
      var w = p.w === null ? est : p.w;
      if (p.f && !seen[p.f.id]) { seen[p.f.id] = 1; lines.push({ id: p.f.id, w: Math.round(w * 100) / 100 }); if (p.w === null) estim.push(p.f.n); }
      else if (!p.f) miss.push(p.n + (p.w === null ? "" : " (" + fmtPct(p.w) + ")"));
    });
    var dt = /Informe a fecha de\s+(\d{1,2}\s+\S+\s+\d{4})/.exec(L.join("\n"));
    return { lines: lines, amount: null, miss: miss, est: estim, total: pos.length, estW: est, date: dt ? dt[1] : "" };
  }
  function legacyImport(L) {
    return (function () {
      var found = {}, order = [], miss = [];
      L.forEach(function (ln, i) {
        var f = null, isin = (ln.match(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/g) || []).filter(function (x) { return byId(x); })[0];
        if (isin) f = byId(isin);
        else { var nl = norm(ln); f = FUNDS.filter(function (x) { return norm(x.n).length > 12 && nl.indexOf(norm(x.n)) !== -1; })[0] || null; }
        if (!f) {
          var other = ln.match(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/);
          if (other && miss.indexOf(other[0]) === -1) miss.push(other[0]);
          return;
        }
        var txt = ln.replace(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/g, " "), nums = pdfNums(txt);
        if (!nums.length && L[i + 1]) nums = pdfNums(L[i + 1].replace(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/g, " "));
        var pc = nums.filter(function (x) { return x.pct && x.v > 0 && x.v <= 100; })[0] ||
          nums.filter(function (x) { return !x.pct && x.v > 0 && x.v <= 100 && x.dec; })[0];
        var am = nums.filter(function (x) { return !x.pct && x.v >= 100; })[0];
        if (!found[f.id]) { found[f.id] = { id: f.id, w: pc ? pc.v : null, a: am ? am.v : null }; order.push(f.id); }
      });
      var rows = order.map(function (k) { return found[k]; });
      var tot = rows.reduce(function (a, r) { return a + (r.a || 0); }, 0), haveAmt = rows.every(function (r) { return r.a; });
      rows.forEach(function (r) { if (r.w === null) r.w = haveAmt && tot ? r.a / tot * 100 : 0; });
      var sw = rows.reduce(function (a, r) { return a + r.w; }, 0);
      if (sw > 110) rows.forEach(function (r) { r.w = r.w / sw * 100; });
      return { sumw: Math.min(sw, 100), lines: rows.slice(0, 40).map(function (r) { return { id: r.id, w: Math.round(r.w * 100) / 100 }; }), amount: haveAmt && tot ? tot : null, miss: miss };
    })();
  }

  // Importar posiciones pegadas desde una tabla (Nombre - ISIN, participaciones, precio, valor)
  function esNum(t) {
    var raw = t.replace(/\s/g, "");
    if (/,/.test(raw)) raw = raw.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, "");
    var v = parseFloat(raw);
    return isFinite(v) ? v : null;
  }
  function impOf(p, l) {
    if (l.v && l.w === l.w0) return l.v;
    return p.amount ? p.amount * l.w / 100 : null;
  }
  function addTablePf(r, name, msg) {
    if (!r.total) { msg.textContent = "No he encontrado posiciones. Cada línea necesita el ISIN y, después, participaciones, precio y valor."; return false; }
    if (!r.lines.length) { msg.textContent = "Ningún fondo de la tabla está en la web." + (r.miss.length ? " Sin reconocer: " + r.miss.slice(0, 8).join("; ") + "." : ""); return false; }
    var p = { id: uid(), name: (name || "Cartera importada").slice(0, 80), amount: r.amount, lines: r.lines.map(function (l) { return l.v ? { id: l.id, w: l.w, v: l.v, w0: l.w } : { id: l.id, w: l.w }; }) };
    p.base = snapPf(p);
    PF.push(p); savePf(); viewPortfolios();
    var m = document.getElementById("pfmsg"), sum = p.lines.reduce(function (a, l) { return a + l.w; }, 0);
    m.textContent = "Cartera «" + p.name + "» creada con " + p.lines.length + (p.lines.length === 1 ? " fondo" : " fondos") + " de " + r.total + " posiciones, valor total " + nf(r.amount, 2) + " €. Pesos: " +
      p.lines.map(function (l) { return byId(l.id).n + " " + (l.v ? nf(l.v, 2) + " € " : "") + "(" + fmtPct(l.w) + ")"; }).join("; ") + ". Comprobación: suma de importes " + nf(p.lines.reduce(function (x, l) { return x + (l.v || 0); }, 0) + 0, 2) + " €" + (r.miss.length ? " (más " + r.miss.length + " sin reconocer)" : ", coincide con el total del Excel") + "." +
      (r.miss.length ? " No están en la web y no se han importado: " + r.miss.join("; ") + "." : "");
    return true;
  }

  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (ok, ko) {
      var sc = document.createElement("script");
      sc.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.mini.min.js";
      sc.onload = function () { ok(window.XLSX); }; sc.onerror = ko; document.head.appendChild(sc);
    });
  }
  function cellNum(c) {
    if (typeof c === "number") return isFinite(c) ? c : null;
    if (c == null) return null;
    var t = String(c).replace(/[^\d.,\-]/g, "");
    return /\d/.test(t) ? esNum(t) : null;
  }
  // Excel: una posición por fila; el ISIN puede ir en su propia columna o al final del nombre. El valor es la columna "Valor" o "Importe" (si no, la última cifra).
  function excelImport(rows) {
    var col = -1, ents = [];
    rows.forEach(function (r) {
      if (!r) return;
      var hdr = r.map(function (c) { return String(c == null ? "" : c).toLowerCase(); });
      var ix = hdr.findIndex(function (t) { return /^(valor|importe|valoraci|market value|saldo)/.test(t.trim()); });
      if (ix >= 0 && !r.some(function (c) { return /\b[A-Z]{2}[A-Z0-9]{9}\d\b/.test(String(c == null ? "" : c)); })) col = ix;
    });
    rows.forEach(function (r) {
      if (!r) return;
      var isin = null, nm = "";
      r.forEach(function (c) {
        var m = /\b[A-Z]{2}[A-Z0-9]{9}\d\b/.exec(String(c == null ? "" : c));
        if (m && !isin) { isin = m[0]; nm = String(c).slice(0, m.index).replace(/[\s\-–]+$/, "").trim(); }
      });
      if (!isin) return;
      var v = col >= 0 ? cellNum(r[col]) : null;
      if (!(v > 0)) {
        var nums = r.map(function (c) { return typeof c === "number" ? c : (/^[\s\d.,\-]+(\s*(EUR|€))?$/i.test(String(c == null ? "" : c)) ? cellNum(c) : null); }).filter(function (x) { return x !== null && x > 0; });
        v = nums.length ? nums[nums.length - 1] : null;
      }
      if (v > 0) ents.push({ isin: isin, n: nm, v: v });
    });
    var rowsBy = {}, order = [], totAll = 0, lines = [], miss = [];
    ents.forEach(function (e) { if (!rowsBy[e.isin]) { rowsBy[e.isin] = { isin: e.isin, n: e.n, v: 0 }; order.push(e.isin); } rowsBy[e.isin].v += e.v; totAll += e.v; });
    order.forEach(function (k) {
      var r = rowsBy[k], f = byId(k);
      if (f) lines.push({ id: f.id, w: Math.round(r.v / totAll * 10000) / 100, v: r.v });
      else miss.push((r.n || "Sin nombre") + " (" + r.isin + ", " + nf(r.v / totAll * 100, 1) + " %)");
    });
    return { lines: lines, amount: totAll > 0 ? Math.round(totAll * 100) / 100 : null, miss: miss, total: order.length };
  }
  function excelRows(file) {
    return loadXlsx().then(function (X) {
      return file.arrayBuffer().then(function (buf) {
        var wb = X.read(buf, { type: "array" }), out = [];
        wb.SheetNames.forEach(function (n) { out = out.concat(X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null })); });
        return out;
      });
    });
  }

  function importPdf(file) {
    return pdfLines(file).then(function (L) {
      return xrayImport(L) || legacyImport(L);
    });
  }

  function viewPortfolios() {
    setTitle("Carteras");
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Carteras</h1>' +
      '<p class="sub">Crea carteras con fondos de la web y sigue su rentabilidad y riesgo. Las carteras se guardan solo en este navegador, no se envían a ningún sitio. Usa Exportar para guardar una copia.</p>';
    h += '<div class="pf-grid">' + (PF.length ? PF.map(function (p) {
      var a = wAvg(p, function (f) { return f.ret.ytd; });
      return '<a class="pfcard" href="#/cartera/' + encodeURIComponent(p.id) + '"><b>' + esc(p.name) + "</b><small>" + p.lines.length +
        (p.lines.length === 1 ? " fondo" : " fondos") + (p.amount ? " · " + nf(p.amount, 0) + " €" : "") + "</small><span>" +
        (a.v === null ? '<span class="muted">Sin datos</span>' : ret(a.v) + ' <small>en el año</small>') + "</span></a>";
    }).join("") : '<div class="empty box">Todavía no hay carteras. Crea la primera aquí abajo.</div>') + "</div>";
    h += '<form class="newpf" id="newpf"><p class="label">Nueva cartera</p><div class="row">' +
      '<input class="inp grow" id="npn" placeholder="Nombre (por ejemplo, Cartera moderada)" maxlength="80" required aria-label="Nombre de la cartera">' +
      '<input class="inp amt" id="npa" type="number" min="0" step="1000" placeholder="Importe (€), opcional" aria-label="Importe en euros">' +
      '<button class="btn" type="submit">Crear cartera</button></div></form>';
    h += '<div class="row tools2">' +
      '<label class="btn ghost" for="pfxls">Importar Excel</label><input id="pfxls" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden>' +
            '<label class="btn ghost" for="pfimp">Importar (JSON)</label><input id="pfimp" type="file" accept="application/json,.json" hidden>' +
      '<label class="btn ghost" for="pfpdf">Importar PDF de Morningstar</label><input id="pfpdf" type="file" accept="application/pdf,.pdf" hidden></div><p class="note" id="pfmsg"></p>';
    app.innerHTML = h + footer("rv");

    document.getElementById("newpf").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("npn").value.trim();
      if (!name) return;
      var a = parseNum(document.getElementById("npa").value), p = { id: uid(), name: name, amount: a !== null && a > 0 ? a : null, lines: [] };
      PF.push(p); savePf();
      location.hash = "#/cartera/" + encodeURIComponent(p.id);
    });
    document.getElementById("pfxls").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0], msg = document.getElementById("pfmsg");
      if (!file) return;
      msg.textContent = "Leyendo el Excel…";
      excelRows(file).then(function (rows) {
        addTablePf(excelImport(rows), file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Cartera importada", msg);
      }).catch(function () { msg.textContent = "No se ha podido leer el Excel. Comprueba que el archivo no esté protegido y que tienes conexión (la lectura usa la librería SheetJS)."; });
    });
    var pfe = document.getElementById("pfexp");
    if (pfe) pfe.addEventListener("click", function () {
      download("carteras-cuaderno-de-fondos.json", JSON.stringify({ version: 1, carteras: PF }, null, 1), "application/json");
    });
    document.getElementById("pfpdf").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0], msg = document.getElementById("pfmsg");
      if (!file) return;
      msg.textContent = "Leyendo el PDF…";
      importPdf(file).then(function (r) {
        if (!r.lines.length) { msg.textContent = "No he encontrado ningún fondo de la web en el PDF (busco el ISIN o el nombre del fondo)." + (r.miss.length ? " Sin reconocer: " + r.miss.slice(0, 8).join(", ") + "." : ""); return; }
        var p = { id: uid(), name: r.date ? "Cartera Morningstar " + r.date : (file.name.replace(/\.pdf$/i, "").slice(0, 80) || "Cartera importada"), amount: r.amount, lines: r.lines };
        p.base = snapPf(p);
        PF.push(p); savePf(); viewPortfolios();
        var m = document.getElementById("pfmsg"), sum = r.lines.reduce(function (a, l) { return a + l.w; }, 0);
        m.textContent = "Cartera «" + p.name + "» creada con " + r.lines.length + (r.lines.length === 1 ? " fondo" : " fondos") + (r.total ? " de " + r.total + " posiciones del PDF" : "") + ". Pesos: " +
          r.lines.map(function (l) { var f = byId(l.id); return f.n + " " + fmtPct(l.w); }).join("; ") + " (suman " + fmtPct(sum) + ")." +
          (r.miss && r.miss.length ? " No están en la web y no se han importado: " + r.miss.join("; ") + "." : "") +
          (r.est && r.est.length ? " Sin peso en el PDF (estimado repartiendo el resto, " + fmtPct(r.estW) + " cada uno): " + r.est.join("; ") + "." : "");
      }).catch(function () { msg.textContent = "No se ha podido leer el PDF. Comprueba que no esté protegido y que tienes conexión (la lectura usa la librería pdf.js)."; });
    });
    document.getElementById("pfimp").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0], msg = document.getElementById("pfmsg");
      if (!file) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var data = JSON.parse(String(rd.result)), list = (data && data.carteras) || data;
          if (!Array.isArray(list)) throw new Error("formato");
          var ok = list.map(cleanPf).filter(Boolean);
          PF = PF.concat(ok); savePf();
          msg.textContent = ok.length + (ok.length === 1 ? " cartera importada." : " carteras importadas.");
          viewPortfolios();
          document.getElementById("pfmsg").textContent = ok.length + (ok.length === 1 ? " cartera importada." : " carteras importadas.");
        } catch (err) { msg.textContent = "No se ha podido leer el archivo. Usa un JSON exportado desde esta página."; }
      };
      rd.readAsText(file);
    });
  }

  function viewPortfolio(id) {
    var p = pfById(id);
    if (!p) { viewNotFound(); return; }
    setTitle(p.name);
    var h = '<div class="topbar"><a href="#/carteras">← Carteras</a></div>' +
      '<div class="pfhead"><input class="inp big" id="pfname" value="' + esc(p.name) + '" maxlength="80" aria-label="Nombre de la cartera">' +
      '<label class="amtl"><span class="muted">Importe (€)</span><input class="inp amt" id="pfamt" type="number" min="0" step="1000" value="' + (p.amount || "") + '" placeholder="Opcional"></label></div>' +
      '<nav class="pftabs" role="tablist"><button type="button" role="tab" data-pt="car" class="on" aria-selected="true">Cartera</button><button type="button" role="tab" data-pt="cmb" aria-selected="false">Análisis de cambios <i id="pfnch" hidden></i></button></nav><div id="pt-car">' +
      '<div class="search tight">' + icon() + '<input id="pq" type="search" autocomplete="off" placeholder="Añadir fondo por nombre o ISIN" aria-label="Añadir fondo a la cartera"></div><div class="results" id="pres"></div>' +
      '<div id="pftable"></div><div id="pfsum"></div></div><div id="pt-cmb" hidden></div>' +
      '<div class="row tools2">' +
      '<span id="pfpdfslot"></span>' +
      '<button class="btn ghost" type="button" id="pfdup">Duplicar</button>' +
      '<button class="btn ghost danger" type="button" id="pfdel">Eliminar cartera</button></div>';
    app.innerHTML = h + footer("rv");

    var pdfb = deckBtn(function () { var nm = document.getElementById("pfname"), am = document.getElementById("pfamt"); deckPortfolio(nm && nm.value || p.name, "", am && am.value ? +am.value : 0, p.lines); });
    var mailb = mailBtn(function () {
      var nm = document.getElementById("pfname"), am = document.getElementById("pfamt"), name = nm && nm.value || p.name;
      return mailOfChange() ? chMail(name, p) : pfMail(name, am && am.value ? +am.value : 0, p.lines);
    });
    function mailOfChange() { return tab === "cmb" && !!p.base && sumW(p) > 0 && pfChanged(pfDiff(p)).length > 0; }
    var slot = document.getElementById("pfpdfslot"); slot.replaceWith(pdfb); if (unlocked()) pdfb.parentNode.insertBefore(mailb, pdfb);
    function save() { savePf(); }
    var tab = "car";
    function drawChanges() {
      var badge = document.getElementById("pfnch"), box = document.getElementById("pt-cmb");
      if (!box) return;
      var n = p.base ? pfChanged(pfDiff(p)).length : 0;
      badge.textContent = n; badge.hidden = !n;
      mailb.textContent = mailOfChange() ? "Correo del cambio" : "Correo";
      if (tab !== "cmb") return;
      box.innerHTML = p.base ? changesHtml(p) : '<div class="empty box chempty">Esta cartera no tiene guardada su versión original. Vuelve a importar el Excel o fija la cartera actual como punto de partida: a partir de ahí se compararán los cambios.<br><button class="btn" type="button" id="chfix">Fijar la actual como original</button></div>';
      var fix = document.getElementById("chfix");
      if (fix) fix.addEventListener("click", function () {
        if (p.base && fix.getAttribute("data-sure") !== "1") { fix.setAttribute("data-sure", "1"); fix.textContent = "Pulsa otra vez para confirmar"; return; }
        p.base = snapPf(p); save(); drawChanges();
      });
    }
    app.querySelectorAll("[data-pt]").forEach(function (bt) {
      bt.addEventListener("click", function () {
        tab = bt.getAttribute("data-pt");
        app.querySelectorAll("[data-pt]").forEach(function (o) { var on = o === bt; o.classList.toggle("on", on); o.setAttribute("aria-selected", String(on)); });
        document.getElementById("pt-car").hidden = tab !== "car";
        document.getElementById("pt-cmb").hidden = tab !== "cmb";
        drawChanges();
      });
    });
    function renderTable() {
      var t = document.getElementById("pftable");
      if (!p.lines.length) { t.innerHTML = '<div class="table-wrap" style="margin-top:14px"><div class="empty">Busca un fondo arriba y añádelo para empezar.</div></div>'; document.getElementById("pfsum").innerHTML = ""; setCmp(); drawChanges(); return; }
      t.innerHTML = '<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th scope="col">Fondo</th><th scope="col">Peso %</th><th scope="col">Importe</th><th scope="col">Año</th><th scope="col">1 año</th><th scope="col">Vol. 1 año</th><th scope="col">Sharpe 1 año</th><th scope="col">Aporta al año</th><th scope="col"><span class="sr">Quitar</span></th></tr></thead><tbody>' +
        p.lines.map(function (l, i) {
          var f = byId(l.id);
          return '<tr data-i="' + i + '" class="pfrow" style="--c:' + (f.t === "rf" ? "#a3173f" : "#2a5ca8") + '"><td class="fund"><div class="pfn"><span class="pfl">' + logoOrInit(f.g) + '</span><div class="pft"><a href="#/fondo/' + encodeURIComponent(f.id) + '"><b>' + esc(f.n) + (f.idx ? '<span class="tag">Indexado</span>' : "") + "</b></a><small>" + esc(f.g) + " · " + esc(f.c) + vlTag(f) + "</small></div></div></td>" +
            '<td class="pfw"><input class="inp w" type="number" min="0" max="100" step="0.5" value="' + (l.w || 0) + '" data-w="' + i + '" aria-label="Peso de ' + esc(f.n) + '"><span class="wbar"><i style="width:' + Math.min(100, l.w || 0) + '%"></i></span></td>' +
            '<td class="num" data-imp="' + i + '"></td><td>' + ret(f.ret.ytd) + "</td><td>" + ret(f.ret.y1) + '</td><td class="num">' + pct(f.vol[0], false, 1) + '</td><td class="num">' + dec(f.sharpe[0]) + '</td><td class="num" data-ap="' + i + '"></td>' +
            '<td><button type="button" class="x" data-del="' + i + '" aria-label="Quitar ' + esc(f.n) + '">×</button></td></tr>';
        }).join("") + '</tbody><tfoot><tr><td><b>Cartera</b></td><td class="num" id="tw"></td><td class="num" id="ti"></td><td id="ty"></td><td id="t1"></td><td class="num" id="tv"></td><td class="num" id="ts"></td><td class="num" id="ta"></td><td></td></tr></tfoot></table></div>';
      t.querySelectorAll("[data-w]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var w = parseNum(inp.value);
          p.lines[+inp.getAttribute("data-w")].w = w === null ? 0 : Math.max(0, Math.min(100, w));
          var wb = inp.parentNode.querySelector(".wbar i"); if (wb) wb.style.width = Math.min(100, p.lines[+inp.getAttribute("data-w")].w) + "%";
          save(); refresh();
        });
      });
      t.querySelectorAll("[data-del]").forEach(function (b) {
        b.addEventListener("click", function () { p.lines.splice(+b.getAttribute("data-del"), 1); save(); renderTable(); });
      });
      refresh(); setCmp();
    }
    function setCmp() {
      var ids = p.lines.slice(0, CMP_MAX).map(function (l) { return l.id; });
      var cm = document.getElementById("pfcmp"); if (cm) cm.setAttribute("href", hashFor(ids));
    }
    function refresh() {
      var tot = sumW(p);
      p.lines.forEach(function (l, i) {
        var f = byId(l.id), im = document.querySelector('[data-imp="' + i + '"]'), ap = document.querySelector('[data-ap="' + i + '"]');
        if (im) { var iv = impOf(p, l); im.textContent = iv !== null ? nf(iv, 2) + " €" : "–"; }
        if (ap) ap.innerHTML = isNum(f.ret.ytd) ? ret(f.ret.ytd * l.w / 100) : '<span class="muted">–</span>';
      });
      var y = wAvg(p, function (f) { return f.ret.ytd; }), y1 = wAvg(p, function (f) { return f.ret.y1; }),
        v = wAvg(p, function (f) { return f.vol[0]; }), s = wAvg(p, function (f) { return f.sharpe[0]; });
      var q = function (id) { return document.getElementById(id); };
      if (!q("tw")) return;
      q("tw").textContent = nf(tot, 1) + "%";
      q("ti").textContent = p.amount ? nf(p.lines.reduce(function (a, l) { return a + (impOf(p, l) || 0); }, 0), 2) + " €" : "–";
      q("ty").innerHTML = ret(y.v); q("t1").innerHTML = ret(y1.v);
      q("tv").textContent = pct(v.v, false, 1); q("ts").textContent = dec(s.v);
      q("ta").innerHTML = y.v === null ? "–" : ret(y.v * tot / 100);
      if (q("aptrfrv")) q("aptrfrv").innerHTML = aportaRfRv(p);
      document.getElementById("pfsum").innerHTML = summary(p);
      drawChanges();
    }

    document.getElementById("pfname").addEventListener("input", function (e) { p.name = e.target.value.slice(0, 80) || "Cartera"; save(); });
    document.getElementById("pfamt").addEventListener("input", function (e) {
      var a = parseNum(e.target.value); p.amount = a !== null && a > 0 ? a : null; save(); refresh();
    });
    var pq = document.getElementById("pq");
    pq.addEventListener("input", function () {
      var v = pq.value.trim(), res = document.getElementById("pres");
      if (!v) { res.innerHTML = ""; return; }
      res.innerHTML = pickList(v, p.lines.map(function (l) { return l.id; }), function (f) {
        return '<a href="#" data-add="' + esc(f.id) + '">' + esc(f.n) + "<small>" + esc(f.g) + " · " + esc(f.c) + "</small></a>";
      });
      res.querySelectorAll("[data-add]").forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          if (p.lines.length >= 40) return;
          var rest = Math.max(0, Math.round((100 - sumW(p)) * 100) / 100);
          p.lines.push({ id: a.getAttribute("data-add"), w: rest });
          save(); pq.value = ""; res.innerHTML = ""; renderTable();
        });
      });
    });
    var csvb = document.getElementById("pfcsv");
    if (csvb) csvb.addEventListener("click", function () {
      var rows = [["ISIN", "Fondo", "Gestora", "Peso (%)", "Importe (EUR)"]].concat(p.lines.map(function (l) {
        var f = byId(l.id);
        return [f.id, f.n, f.g, String(l.w).replace(".", ","), p.amount ? String(Math.round(impOf(p, l) * 100) / 100).replace(".", ",") : ""];
      }));
      var csv = "﻿" + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(";"); }).join("\r\n");
      download((p.name || "cartera").replace(/[^\w\-]+/g, "_") + ".csv", csv, "text/csv;charset=utf-8");
    });
    document.getElementById("pfdup").addEventListener("click", function () {
      var c = cleanPf({ name: p.name + " (copia)", amount: p.amount, lines: p.lines, base: p.base });
      PF.push(c); save(); location.hash = "#/cartera/" + encodeURIComponent(c.id);
    });
    var del = document.getElementById("pfdel");
    del.addEventListener("click", function () {
      if (del.getAttribute("data-sure") !== "1") { del.setAttribute("data-sure", "1"); del.textContent = "Pulsa otra vez para eliminar"; return; }
      PF = PF.filter(function (x) { return x.id !== p.id; }); savePf(); location.hash = "#/carteras";
    });
    renderTable();
  }

  function aportaRfRv(p) {
    var A = { rf: { w: 0, y: 0, y1: 0 }, rv: { w: 0, y: 0, y1: 0 } };
    p.lines.forEach(function (l) {
      var f = byId(l.id); if (!f) return;
      var a = A[f.t === "rf" ? "rf" : "rv"];
      a.w += l.w; if (isNum(f.ret.ytd)) a.y += f.ret.ytd * l.w / 100; if (isNum(f.ret.y1)) a.y1 += f.ret.y1 * l.w / 100;
    });
    var tw = A.rf.w + A.rv.w, ty = A.rf.y + A.rv.y, t1 = A.rf.y1 + A.rv.y1;
    function card(n, a, col) {
      var share = ty ? Math.max(0, Math.min(100, a.y / ty * 100)) : 0;
      return '<div class="apc" style="--c:' + col + '"><div class="apt"><span>' + n + '</span><small>' + fmtPct(a.w) + ' del peso</small></div><div class="apv">' + ret(a.y) + '<small>aporta en el año</small></div>' +
        '<div class="apbar"><i style="width:' + share.toFixed(1) + '%"></i></div><div class="apf"><span>' + (ty ? nf(share, 0) + " % de la rentabilidad del año" : "–") + "</span><span>1 año: <b>" + ret(a.y1) + "</b></span></div></div>";
    }
    return '<section class="block apw"><h3>Aportación por tipo de activo</h3><div class="aptot">Cartera: <b>' + ret(ty) + "</b> en el año · <b>" + ret(t1) + "</b> en 1 año · peso " + fmtPct(tw) + '</div><div class="apgrid">' + card("Renta fija", A.rf, "#a3173f") + card("Renta variable", A.rv, "#2a5ca8") + "</div></section>";
  }

  // ---------- análisis de cambios frente a la cartera original ----------
  function snapPf(p) {
    return { t: new Date().toISOString(), amount: p.amount, lines: p.lines.map(function (l) { return l.v && l.w === l.w0 ? { id: l.id, w: l.w, v: l.v } : { id: l.id, w: l.w }; }) };
  }
  function pfDiff(p) {
    var B = p.base, old = {}, now = {}, ids = [];
    B.lines.forEach(function (l) { if (byId(l.id)) { old[l.id] = l; ids.push(l.id); } });
    p.lines.forEach(function (l) { now[l.id] = l; if (!old[l.id]) ids.push(l.id); });
    var sameAmt = (p.amount || 0) === (B.amount || 0);
    return ids.map(function (id) {
      var a = old[id], b = now[id], w0 = a ? a.w : 0, w1 = b ? b.w : 0, dw = Math.round((w1 - w0) * 100) / 100;
      var e0 = a ? (a.v ? a.v : (B.amount ? B.amount * a.w / 100 : null)) : (B.amount ? 0 : null);
      var e1 = b ? impOf(p, b) : (p.amount ? 0 : null);
      if (a && b && !dw && sameAmt && e0 !== null) e1 = e0;
      var de = e0 !== null && e1 !== null ? Math.round((e1 - e0) * 100) / 100 : null;
      if (de !== null && Math.abs(de) < 0.005) de = 0;
      var k = (!a || w0 <= 0) && w1 > 0 ? "in" : w0 > 0 && w1 <= 0 ? "out" : dw > 0 ? "up" : dw < 0 ? "down" : "same";
      return { f: byId(id), w0: w0, w1: w1, dw: dw, e0: e0, e1: e1, de: de, k: k };
    });
  }
  function pfChanged(D) { return D.filter(function (d) { return d.k !== "same" || d.de; }); }
  var CHK = { "in": "Entra", out: "Sale", up: "Sube", down: "Baja", same: "Sin cambio de peso" };
  function eur(v, signed) { return isNum(v) ? (signed && v > 0 ? "+" : "") + nf(v, 2) + " €" : "–"; }
  function pp(v) { return isNum(v) ? (v > 0 ? "+" : "") + nf(v, 2) + " pp" : "–"; }
  // sentido: 1 mejor si sube, -1 mejor si baja, 0 neutro
  function chDelta(a, b, sense, unit) {
    if (!isNum(a) || !isNum(b)) return '<span class="muted">–</span>';
    var d = Math.round((b - a) * 100) / 100;
    if (!d) return '<span class="chd">=</span>';
    var c = !sense ? "" : d * sense > 0 ? " good" : " bad";
    return '<span class="chd' + c + '">' + (d > 0 ? "▲ +" : "▼ ") + nf(d, 2) + (unit ? " " + unit : "") + "</span>";
  }
  // participaciones aproximadas del importe movido (solo valor liquidativo en euros)
  function chUnits(d) {
    var m = /^EUR\s*([\d.,]+)/.exec(String(d.f.nav || "")), v = m ? parseFloat(m[1].replace(/,/g, "")) : 0;
    return v > 0 && d.de ? Math.abs(d.de) / v : null;
  }
  function chMetrics() {
    return [
      { n: "Rentabilidad del año", g: function (f) { return f.ret.ytd; }, s: 1, pc: 1 },
      { n: "Rentabilidad 1 mes", g: function (f) { return f.ret.m1; }, s: 1, pc: 1 },
      { n: "Rentabilidad 1 año", g: function (f) { return f.ret.y1; }, s: 1, pc: 1 },
      { n: "Rentabilidad 3 años (anualizada)", g: function (f) { return f.ret.y3; }, s: 1, pc: 1 },
      { n: "Rentabilidad 5 años (anualizada)", g: function (f) { return f.ret.y5; }, s: 1, pc: 1 },
      { n: "Volatilidad 1 año", g: function (f) { return f.vol[0]; }, s: -1, pc: 1 },
      { n: "Volatilidad 3 años", g: function (f) { return f.vol[1]; }, s: -1, pc: 1 },
      { n: "Caída máxima 3 años", g: function (f) { return f.dd && f.dd[1]; }, s: 1, pc: 1 },
      { n: "Sharpe 1 año", g: function (f) { return f.sharpe[0]; }, s: 1 },
      { n: "Sharpe 3 años", g: function (f) { return f.sharpe[1]; }, s: 1 },
      { n: "Sortino 1 año", g: function (f) { return f.sortino && f.sortino[0]; }, s: 1 },
      { n: "Ratio MAR 1 año", g: function (f) { return f.mar && f.mar[0]; }, s: 1 }
    ];
  }
  function chLegend() { return '<div class="chleg"><span><i class="a"></i>Original</span><span><i class="b"></i>Nueva</span></div>'; }
  // barras horizontales emparejadas: [nombre, antes, ahora]
  function chPairs(items) {
    var mx = Math.max.apply(null, items.map(function (x) { return Math.max(Math.abs(x[1] || 0), Math.abs(x[2] || 0)); })) || 1;
    function bar(c, v) { return '<div class="chb"><span><i class="' + c + '" style="width:' + (Math.max(0, v) / mx * 100).toFixed(1) + '%"></i></span><b>' + pct(v, false, 1) + "</b></div>"; }
    return chLegend() + items.map(function (x) { return '<div class="chp"><div class="chpn"><span>' + esc(x[0]) + "</span>" + chDelta(x[1], x[2], 0, "pp") + "</div>" + bar("a", x[1]) + bar("b", x[2]) + "</div>"; }).join("");
  }
  // columnas emparejadas por periodo: [etiqueta, antes, ahora]
  function chColumns(items, label) {
    var W = 560, H = 260, mx = Math.max.apply(null, items.map(function (x) { return Math.max(Math.abs(x[1]), Math.abs(x[2])); })) || 1;
    var neg = items.some(function (x) { return x[1] < 0 || x[2] < 0; }), base = neg ? 130 : 205, ph = neg ? 92 : 165, cw = (W - 20) / items.length, bw = Math.min(30, cw * 0.36);
    return chLegend() + '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="' + label + '"><line x1="10" x2="' + (W - 10) + '" y1="' + base + '" y2="' + base + '" stroke="#bbb"/>' + items.map(function (x, k) {
      var cx = 10 + k * cw + cw / 2;
      return [1, 2].map(function (j) {
        var v = x[j], h = Math.max(1.5, Math.abs(v) / mx * ph), bx = cx + (j === 1 ? -bw - 1 : 1), up = v >= 0;
        return '<rect x="' + bx.toFixed(1) + '" y="' + (up ? base - h : base).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + (j === 1 ? "#b4b7c0" : "#a3173f") + '"><title>' + (j === 1 ? "Original: " : "Nueva: ") + pct(v, true, 2) + "</title></rect>" +
          '<text x="' + (bx + bw / 2).toFixed(1) + '" y="' + (up ? base - h - (j === 1 ? 5 : 17) : base + h + (j === 1 ? 13 : 25)).toFixed(1) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + (j === 1 ? "#666a73" : "#a3173f") + '">' + nf(v, 1) + "</text>";
      }).join("") + '<text x="' + cx.toFixed(1) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="11" fill="#555">' + esc(x[0]) + "</text>";
    }).join("") + "</svg>";
  }
  function changesHtml(p) {
    var D = pfDiff(p), C = pfChanged(D), B = p.base;
    var when = new Date(B.t), whenTxt = isNaN(when) ? "" : " guardada el " + when.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    var bar = '<div class="chbar"><span>Comparada con la cartera original' + whenTxt + '.</span>' + (C.length ? '<button class="btn ghost sm" type="button" id="chfix">Tomar la actual como original</button>' : "") + "</div>";
    if (!C.length) return bar + '<div class="empty box chempty">Todavía no hay cambios. Modifica pesos, añade o quita fondos en la pestaña Cartera y aquí verás lo que supone.</div>';
    var a = { lines: B.lines.filter(function (l) { return byId(l.id); }) }, b = { lines: p.lines };
    function both(g) { return [wAvg(a, g), wAvg(b, g)]; }
    var h = bar, tw0 = sumW(a), tw1 = sumW(b);
    if (Math.abs(tw1 - 100) >= 0.05) h += '<p class="chwarn">Los pesos de la cartera nueva suman ' + nf(tw1, 2) + "% (" + (tw1 < 100 ? "falta " + nf(100 - tw1, 2) + "% por asignar" : "sobra " + nf(tw1 - 100, 2) + "%") + "). Las medias se calculan sobre el peso asignado.</p>";
    if (Math.abs(tw0 - 100) >= 0.05) h += '<p class="note">Los pesos de la cartera original suman ' + nf(tw0, 2) + "%.</p>";

    var M = chMetrics().map(function (m) { var r = both(m.g); return { m: m, a: r[0], b: r[1] }; });
    function row(n) { return M.filter(function (x) { return x.m.n === n; })[0]; }
    h += '<div class="kpis chk">' + ["Rentabilidad del año", "Rentabilidad 1 año", "Volatilidad 1 año", "Sharpe 1 año"].map(function (n) {
      var r = row(n), fm = function (v) { return r.m.pc ? pct(v, n.indexOf("Rent") === 0, 2) : dec(v); };
      return '<div class="kpi"><small>' + n + "</small><span>" + fm(r.b.v) + '</span><em class="ksub">Antes ' + fm(r.a.v) + "</em>" + chDelta(r.a.v, r.b.v, r.m.s, r.m.pc ? "pp" : "") + "</div>";
    }).join("") + "</div>";

    // resumen en frases
    var n = { "in": 0, out: 0, up: 0, down: 0 }; C.forEach(function (d) { if (n[d.k] !== undefined) n[d.k]++; });
    var buy = 0, sell = 0, wb = 0, ws = 0, hasE = C.every(function (d) { return d.de !== null; });
    C.forEach(function (d) { if (d.de > 0) buy += d.de; else if (d.de < 0) sell -= d.de; if (d.dw > 0) wb += d.dw; else ws -= d.dw; });
    function plural(k, s, pl) { return k + " " + (k === 1 ? s : pl); }
    var parts = [];
    if (n.in) parts.push(plural(n.in, "fondo entra", "fondos entran"));
    if (n.out) parts.push(plural(n.out, "sale", "salen"));
    if (n.up) parts.push(plural(n.up, "sube de peso", "suben de peso"));
    if (n.down) parts.push(plural(n.down, "baja de peso", "bajan de peso"));
    var S = [];
    S.push("<b>Movimientos:</b> " + (parts.join(", ") || "cambia el importe de la cartera") + ". " + (hasE ? "Compras por " + eur(buy) + " y ventas por " + eur(sell) + "." : "Se compra un " + pct(wb, false, 2) + " y se vende un " + pct(ws, false, 2) + " del peso."));
    function share(q, t) { return q.lines.reduce(function (s, l) { var f = byId(l.id); return s + (f.t === t ? l.w : 0); }, 0); }
    function rep(t) { var x = share(a, t), y = share(b, t); return Math.abs(y - x) < 0.005 ? "se mantiene en el " + pct(x, false, 2) : "pasa del " + pct(x, false, 2) + " al " + pct(y, false, 2); }
    S.push("<b>Reparto:</b> la renta variable " + rep("rv") + " y la renta fija " + rep("rf") + ".");
    var r1 = row("Rentabilidad 1 año");
    if (isNum(r1.a.v) && isNum(r1.b.v)) {
      var d1 = r1.b.v - r1.a.v, amt = p.amount || B.amount;
      S.push("<b>Rentabilidad:</b> con los nuevos pesos, la rentabilidad a 1 año habría sido " + (Math.abs(d1) < 0.005 ? "la misma." : nf(Math.abs(d1), 2) + " puntos " + (d1 > 0 ? "mayor" : "menor") + (amt ? " (unos " + nf(Math.abs(d1) * amt / 100, 0) + " € sobre " + nf(amt, 0) + " €)." : ".")));
    }
    var rv = row("Volatilidad 1 año"), rs = row("Sharpe 1 año");
    function mov(r, u) { var d = Math.round((r.b.v - r.a.v) * 100) / 100; return !d ? "se mantiene en " + nf(r.b.v, 2) + u : (d > 0 ? "sube" : "baja") + " de " + nf(r.a.v, 2) + u + " a " + nf(r.b.v, 2) + u; }
    if (isNum(rv.a.v) && isNum(rv.b.v) && isNum(rs.a.v) && isNum(rs.b.v)) S.push("<b>Riesgo:</b> la volatilidad " + mov(rv, "%") + " y el Sharpe " + mov(rs, "") + ".");
    h += '<section class="block chsec"><h3>Qué supone el cambio</h3><ul class="chsum"><li>' + S.join("</li><li>") + "</li></ul></section>";

    // cambio de peso por fondo
    var mxd = Math.max.apply(null, C.map(function (d) { return Math.abs(d.dw); })) || 1;
    var ord = C.slice().sort(function (x, y) { return y.dw - x.dw; });
    h += '<section class="block chsec"><h3>Cambio de peso por fondo</h3>' + ord.map(function (d) {
      var w = (Math.abs(d.dw) / mxd * 50).toFixed(1);
      return '<div class="chw"><div class="chwn"><b>' + esc(d.f.n) + '</b><small><span class="chtag ' + d.k + '">' + CHK[d.k] + "</span> " + pct(d.w0, false, 2) + " → " + pct(d.w1, false, 2) + '</small></div><div class="chwb"><i class="' + (d.dw < 0 ? "neg" : "pos") + '" style="width:' + w + '%"></i></div><div class="chwv ' + cls(d.dw) + '">' + pp(d.dw) + "</div></div>";
    }).join("") + "</section>";

    // operaciones
    var rank = { out: 0, down: 1, "in": 2, up: 3, same: 4 };
    function parts_(d) {
      var u = chUnits(d);
      if (u === null) return "–";
      if (d.k === "out") return "Total";
      return (d.de > 0 ? "+" : "-") + nf(u, 2);
    }
    h += '<section class="block chsec"><h3>Detalle de las operaciones</h3><div class="table-wrap"><table class="chtable"><thead><tr><th scope="col">Fondo</th><th scope="col">Movimiento</th><th scope="col">Peso antes</th><th scope="col">Peso ahora</th><th scope="col">Importe antes</th><th scope="col">Importe ahora</th><th scope="col">Compra o venta</th><th scope="col">Particip. aprox.</th></tr></thead><tbody>' +
      D.slice().sort(function (x, y) { return rank[x.k] - rank[y.k]; }).map(function (d) {
        return '<tr class="' + (d.k === "same" && !d.de ? "chsame" : "") + '"><td><a href="#/fondo/' + encodeURIComponent(d.f.id) + '">' + esc(d.f.n) + '</a></td><td><span class="chtag ' + d.k + '">' + CHK[d.k] + "</span></td><td>" + pct(d.w0, false, 2) + "</td><td><b>" + pct(d.w1, false, 2) + "</b></td><td>" + eur(d.e0) + "</td><td><b>" + eur(d.e1) + '</b></td><td class="' + cls(d.de) + '">' + (d.de ? eur(d.de, true) : "–") + "</td><td>" + parts_(d) + "</td></tr>";
      }).join("") + "</tbody>" + (hasE ? '<tfoot><tr><td colspan="6"><b>Neto</b> (compras ' + eur(buy) + ", ventas " + eur(sell) + ')</td><td class="' + cls(Math.round((buy - sell) * 100) / 100) + '"><b>' + eur(Math.round((buy - sell) * 100) / 100, true) + "</b></td><td></td></tr></tfoot>" : "") + '</table></div><p class="note">Participaciones estimadas con el último valor liquidativo publicado en la web; en fondos con valor liquidativo en otra divisa no se calculan. Confírmalas con la posición real antes de ordenar traspasos.</p></section>';

    // comparativa cuantitativa
    h += '<section class="block chsec"><h3>Comparativa cuantitativa</h3><div class="table-wrap"><table class="chtable"><thead><tr><th scope="col">Medida</th><th scope="col">Original</th><th scope="col">Nueva</th><th scope="col">Diferencia</th></tr></thead><tbody>' +
      M.filter(function (r) { return isNum(r.a.v) || isNum(r.b.v); }).map(function (r) {
        var partial = (isNum(r.a.v) && r.a.cov < 0.999) || (isNum(r.b.v) && r.b.cov < 0.999);
        var fm = function (v) { return r.m.pc ? pct(v, /^(Rent|Caída)/.test(r.m.n), 2) : dec(v); };
        return "<tr><td>" + r.m.n + (partial ? " *" : "") + "</td><td>" + fm(r.a.v) + "</td><td><b>" + fm(r.b.v) + "</b></td><td>" + chDelta(r.a.v, r.b.v, r.m.s, r.m.pc ? "pp" : "") + "</td></tr>";
      }).join("") + "<tr><td>Número de fondos</td><td>" + a.lines.filter(function (l) { return l.w > 0; }).length + "</td><td><b>" + b.lines.filter(function (l) { return l.w > 0; }).length + '</b></td><td></td></tr></tbody></table></div><p class="note">Verde mejora, rojo empeora. Medias ponderadas por peso con datos de Morningstar; la volatilidad y la caída máxima no tienen en cuenta las correlaciones. Las rentabilidades pasadas aplican los pesos a los fondos, no son la rentabilidad obtenida por el cliente. * Algún fondo no tiene ese dato.</p></section>';

    // lo que se vende frente a lo que se compra
    function side(title, list) {
      if (!list.length) return "";
      var q = { lines: list.map(function (d) { return { id: d.f.id, w: Math.abs(d.de !== null && hasE ? d.de : d.dw) }; }) };
      function av(g) { return wAvg(q, g).v; }
      var cols = [function (f) { return f.ret.ytd; }, function (f) { return f.ret.y1; }, function (f) { return f.ret.y3; }, function (f) { return f.vol[0]; }, function (f) { return f.sharpe[0]; }];
      function cells(get) { return cols.map(function (c, i) { var v = get(c); return "<td>" + (i < 3 ? ret(v) : i === 4 ? dec(v) : pct(v, false, 2)) + "</td>"; }).join(""); }
      return '<h4 class="chh4">' + title + '</h4><div class="table-wrap"><table class="chtable"><thead><tr><th scope="col">Fondo</th><th scope="col">' + (hasE ? "Importe movido" : "Peso movido") + '</th><th scope="col">Año</th><th scope="col">1 año</th><th scope="col">3 años</th><th scope="col">Vol. 1 año</th><th scope="col">Sharpe 1 año</th></tr></thead><tbody>' +
        list.map(function (d, i) { return "<tr><td>" + esc(d.f.n) + "<small>" + esc(d.f.c) + "</small></td><td>" + (hasE ? eur(q.lines[i].w) : pct(q.lines[i].w, false, 2)) + "</td>" + cells(function (c) { return c(d.f); }) + "</tr>"; }).join("") +
        '</tbody><tfoot><tr><td><b>Media ponderada</b></td><td><b>' + (hasE ? eur(sumW(q)) : pct(sumW(q), false, 2)) + "</b></td>" + cells(av) + "</tr></tfoot></table></div>";
    }
    function dir(d) { return d.de !== null && hasE ? d.de : d.dw; }
    var sold = C.filter(function (d) { return dir(d) < 0; }), bought = C.filter(function (d) { return dir(d) > 0; });
    h += '<section class="block chsec"><h3>Lo que se vende frente a lo que se compra</h3>' + side("Se vende", sold) + side("Se compra", bought) + "</section>";

    // gráficos
    h += '<div class="grid2 chgrid">';
    var per = [["Año", "Rentabilidad del año"], ["1 mes", "Rentabilidad 1 mes"], ["1 año", "Rentabilidad 1 año"], ["3 años", "Rentabilidad 3 años (anualizada)"], ["5 años", "Rentabilidad 5 años (anualizada)"]].map(function (x) { var r = row(x[1]); return isNum(r.a.v) && isNum(r.b.v) ? [x[0], r.a.v, r.b.v] : null; }).filter(Boolean);
    if (per.length) h += '<section class="block"><h3>Rentabilidad por plazo (%)</h3>' + chColumns(per, "Rentabilidad por plazo antes y después") + "</section>";
    var yrs = YEARS.map(function (y) { var r = both(function (f) { return annOf(f, y); }); return r[0].cov > 0.999 && r[1].cov > 0.999 ? [y === 2026 ? "2026*" : String(y), r[0].v, r[1].v] : null; }).filter(Boolean);
    if (yrs.length) h += '<section class="block"><h3>Rentabilidad por año (%)</h3>' + chColumns(yrs, "Rentabilidad por año antes y después") + '<p class="note">Solo años en los que todos los fondos tienen dato. * Hasta ' + esc(String(META.annDate || "").slice(0, 5)) + ".</p></section>";
    function mixOf(q) { return [0, 1, 2, 3].map(function (i) { return wAvg(q, function (f) { return f.mix[i]; }).v; }); }
    var m0 = mixOf(a), m1 = mixOf(b), mi = ["Acciones", "Bonos", "Efectivo", "Otros"].map(function (l, i) { return [l, m0[i] || 0, m1[i] || 0]; }).filter(function (x) { return Math.abs(x[1]) >= 0.05 || Math.abs(x[2]) >= 0.05; });
    if (mi.length) h += '<section class="block"><h3>Composición por activo</h3>' + chPairs(mi) + "</section>";
    function group(key) {
      var o = {};
      [a, b].forEach(function (q, j) { q.lines.forEach(function (l) { var k = byId(l.id)[key]; (o[k] = o[k] || [0, 0])[j] += l.w; }); });
      return Object.keys(o).map(function (k) { return [k, o[k][0], o[k][1]]; }).filter(function (x) { return x[1] > 0 || x[2] > 0; }).sort(function (x, y) { return Math.max(y[1], y[2]) - Math.max(x[1], x[2]); });
    }
    h += '<section class="block"><h3>Peso por categoría</h3>' + chPairs(group("c")) + "</section>";
    return h + "</div>";
  }

  // correo sobre el cambio propuesto y sus implicaciones
  function chMail(name, p) {
    var D = pfDiff(p), C = pfChanged(D), B = p.base;
    var a = { lines: B.lines.filter(function (l) { return byId(l.id); }) }, b = { lines: p.lines };
    var hasE = C.every(function (d) { return d.de !== null; }), amt = p.amount;
    function dir(d) { return hasE ? d.de : d.dw; }
    var sold = C.filter(function (d) { return dir(d) < 0; }).sort(function (x, y) { return (y.k === "out") - (x.k === "out") || Math.abs(dir(y)) - Math.abs(dir(x)); }), bought = C.filter(function (d) { return dir(d) > 0; });
    function p2(v) { return pct(v, false, 2); }
    function eu(v) { return nf(Math.abs(v), 0) + " €"; }
    var M = chMetrics().map(function (m) { return { m: m, a: wAvg(a, m.g), b: wAvg(b, m.g) }; });
    function full(r) { return isNum(r.a.v) && isNum(r.b.v) && r.a.cov > 0.999 && r.b.cov > 0.999; }
    var USE = [["Rentabilidad del año", "Rentabilidad en el año", "la rentabilidad en el año"], ["Rentabilidad 1 año", "Rentabilidad a 1 año", "la rentabilidad a 1 año"], ["Rentabilidad 3 años (anualizada)", "Rentabilidad anual a 3 años", "la rentabilidad anual a 3 años"], ["Rentabilidad 5 años (anualizada)", "Rentabilidad anual a 5 años", "la rentabilidad anual a 5 años"],
      ["Volatilidad 1 año", "Volatilidad a 1 año", "la volatilidad"], ["Caída máxima 3 años", "Caída máxima en 3 años", "la caída máxima"], ["Sharpe 1 año", "Sharpe a 1 año", "el Sharpe a 1 año"], ["Sharpe 3 años", "Sharpe a 3 años", "el Sharpe a 3 años"]];
    var rows = [], missing = [];
    USE.forEach(function (u) {
      var r = M.filter(function (x) { return x.m.n === u[0]; })[0];
      var dd = u[0] === "Caída máxima 3 años", x = dd ? Math.abs(r.a.v) : r.a.v, z = dd ? Math.abs(r.b.v) : r.b.v;
      if (full(r)) rows.push({ n: u[1], s: u[2], a: x, b: z, raw: z - x, d: Math.round((z - x) * 100) / 100, sense: dd ? -1 : r.m.s, pc: r.m.pc });
      else missing.push(u[2]);
    });
    function val(r, v) { return r.pc ? p2(v) : nf(v, 2); }

    function fundLine(d) {
      var f = d.f, t = "• " + f.n + " (" + f.c + "): ", u = chUnits(d), money = "";
      if (hasE && d.de < 0 && d.k !== "out") money = u !== null ? " (traspaso de unas " + nf(u, 2) + " participaciones, alrededor de " + eu(d.de) + ")" : " (unos " + eu(d.de) + ", las participaciones se confirmarán al ordenar)";
      else if (hasE && d.de) money = " (unos " + eu(d.de) + ")";
      if (d.k === "out") t += "salida total, hoy pesa un " + p2(d.w0) + money + ".";
      else if (d.k === "in") t += "nueva posición con un " + p2(d.w1) + money + ".";
      else if (d.k === "same") t += "mantiene su peso del " + p2(d.w1) + " y " + (d.de < 0 ? "se reduce" : "aumenta") + " su importe" + money + ".";
      else t += (d.dw < 0 ? "baja" : "sube") + " del " + p2(d.w0) + " al " + p2(d.w1) + money + ".";
      var s = [];
      if (isNum(f.ret.y1)) s.push("rentabilidad a 1 año " + p2(f.ret.y1));
      if (isNum(f.vol && f.vol[0])) s.push("volatilidad " + p2(f.vol[0]));
      if (isNum(f.sharpe && f.sharpe[0])) s.push("Sharpe " + nf(f.sharpe[0], 2));
      return t + (s.length && d.k !== "same" ? "\n   En cifras: " + s.join(", ") + "." : "");
    }

    var cart = "la cartera \"" + (name || p.name) + "\"" + (amt > 0 ? " (importe de " + nf(amt, 0) + " euros)" : "");
    var L = ["Hola,", "", pick(["Te escribo para proponerte unos cambios en " + cart, "He revisado " + cart + " y quiero proponerte unos cambios"]) + ". Te detallo qué cambiaría y lo que supone, con datos de Morningstar a " + dlong(META && (META.rv || META.rf)) + ".", ""];
    if (sold.length) L.push("Lo que se vende", sold.map(fundLine).join("\n"), "");
    if (bought.length) L.push("Lo que se compra", bought.map(fundLine).join("\n"), "");

    // implicaciones en la composición
    var I = [];
    function share(q, t) { return q.lines.reduce(function (s, l) { var f = byId(l.id); return s + (f && f.t === t ? l.w : 0); }, 0); }
    function rep(t) { var x = share(a, t), y = share(b, t); return Math.abs(y - x) < 0.005 ? "se mantiene en el " + p2(x) : "pasa del " + p2(x) + " al " + p2(y); }
    I.push("• Reparto: la renta variable " + rep("rv") + " y la renta fija " + rep("rf") + ".");
    function shifts(key, min) {
      var o = {};
      [a, b].forEach(function (q, j) { q.lines.forEach(function (l) { var f = byId(l.id); if (!f) return; (o[f[key]] = o[f[key]] || [0, 0])[j] += l.w; }); });
      return Object.keys(o).map(function (k) { return [k, o[k][0], o[k][1]]; }).filter(function (x) { return Math.abs(x[2] - x[1]) >= min; })
        .sort(function (x, y) { return Math.abs(y[2] - y[1]) - Math.abs(x[2] - x[1]); }).slice(0, 4)
        .map(function (x) { return x[0] + " del " + p2(x[1]) + " al " + p2(x[2]); });
    }
    var sc = shifts("c", 0.5);
    if (sc.length) I.push("• Por categorías: " + listJoin(sc) + ".");
    var n0 = a.lines.filter(function (l) { return l.w > 0; }).length, n1 = b.lines.filter(function (l) { return l.w > 0; }).length;
    I.push("• Número de fondos: " + (n0 === n1 ? "se mantiene en " + n1 : "pasa de " + n0 + " a " + n1) + ".");
    L.push("Cómo cambia la composición", I.join("\n"), "");

    if (rows.length) {
      L.push("Antes y después", rows.map(function (r) { return "• " + r.n + ": " + (r.d ? "pasa del " + val(r, r.a) + " al " + val(r, r.b) : "se mantiene en el " + val(r, r.b)) + "."; }).join("\n"), "");
    }

    // años naturales completos con dato en todos los fondos
    var yrs = YEARS.filter(function (y) { return y < mailYear(); }).map(function (y) {
      var x = wAvg(a, function (f) { return annOf(f, y); }), z = wAvg(b, function (f) { return annOf(f, y); });
      return x.cov > 0.999 && z.cov > 0.999 ? { y: y, a: x.v, b: z.v } : null;
    }).filter(Boolean).sort(function (x, y) { return x.y - y.y; });
    if (yrs.length) L.push("Año a año", yrs.map(function (r) { return "• " + r.y + ": actual " + p2(r.a) + ", propuesta " + p2(r.b) + "."; }).join("\n"), "");

    // balance: lo que mejora y lo que empeora
    var up = [], down = [], flat = [];
    rows.forEach(function (r) {
      if (!r.sense) return;
      if (Math.abs(r.d) < 0.05) { flat.push(r.s); return; }
      var t = r.s + " (" + nf(Math.abs(r.d), 2) + (r.pc ? " puntos " : " ") + (r.d > 0 ? "más" : "menos") + ")";
      (r.d * r.sense > 0 ? up : down).push(t);
    });
    var won = yrs.filter(function (r) { return r.b - r.a > 0.005; }).length, lost = yrs.filter(function (r) { return r.a - r.b > 0.005; }).length;
    var bal = [];
    if (up.length) bal.push("Con los datos disponibles mejora " + listJoin(up) + ".");
    else if (rows.length) bal.push("Con los datos disponibles ninguna de las medidas comparadas mejora de forma apreciable.");
    if (down.length) bal.push((up.length ? "A cambio, empeora " : "Empeora ") + listJoin(down) + ".");
    if (flat.length) bal.push("Apenas hay diferencia en " + listJoin(flat) + ".");
    if (yrs.length) bal.push("Aplicando los pesos a los " + yrs.length + " años completos con datos, la propuesta habría rentado más en " + won + " y menos en " + lost + ".");
    var r1 = rows.filter(function (r) { return r.n === "Rentabilidad a 1 año"; })[0];
    if (r1 && r1.d && amt > 0) bal.push("En euros, la diferencia a 1 año equivale a unos " + eu(r1.raw * amt / 100) + (r1.d > 0 ? " más" : " menos") + " sobre el importe de la cartera.");
    if (missing.length) bal.push("No comparo " + listJoin(missing) + " porque algún fondo no tiene ese dato.");
    L.push("Qué supone el cambio", bal.join(" "), "");

    var end = [];
    var tw = sumW(b);
    if (Math.abs(tw - 100) >= 0.05) end.push("Los pesos propuestos suman " + p2(tw) + ".");
    if (hasE) end.push("Los importes y las participaciones son aproximados y se confirmarán con tu posición real antes de ordenar los traspasos.");
    if (end.length) L.push("A tener en cuenta", end.join(" "), "");
    L.push(pick(["Si te parece, lo comentamos y, con tu visto bueno, preparo los cambios. Quedo a tu disposición para cualquier duda.", "Cuando te venga bien lo vemos juntos antes de hacer nada. Quedo a tu disposición para cualquier duda."]));
    return { subject: mailClean("Cambios propuestos en tu cartera: " + (name || p.name || "")), body: mailClean(L.join("\n")) + MAIL_PIE, chart: function () { return mcChanges(name || p.name, rows, C); } };
  }
  function mcChanges(name, rows, C) {
    var H = 190 + 62 + rows.length * 48 + 70 + C.length * 82 + 90, cg = mcCanvas(H), c = cg[0], g = cg[1];
    mcTitle(g, name || "Cartera", "Cambios propuestos: cartera actual frente a propuesta");
    function text(t, x, y, col, font, al) { g.fillStyle = col; g.font = font; g.textAlign = al || "left"; g.fillText(t, x, y); }
    var y = 188, F = "24px Arial, sans-serif", FB = "bold 24px Arial, sans-serif", FH = "bold 20px Arial, sans-serif";
    text("LA CARTERA", 50, y, MC.br, FH); text("ACTUAL", 720, y, MC.mut, FH, "right"); text("PROPUESTA", 920, y, MC.br, FH, "right"); text("CAMBIO", 1150, y, MC.mut, FH, "right");
    g.fillStyle = MC.br; g.fillRect(50, y + 12, 1100, 2); y += 56;
    rows.forEach(function (r) {
      function v(x) { return r.pc ? pct(x, false, 2) : nf(x, 2); }
      text(r.n, 50, y, MC.ink, F); text(v(r.a), 720, y, MC.mut, F, "right"); text(v(r.b), 920, y, MC.ink, FB, "right");
      text(r.d ? (r.d > 0 ? "+" : "") + nf(r.d, 2) : "=", 1150, y, !r.d || !r.sense ? MC.mut : r.d * r.sense > 0 ? MC.pos : MC.neg, FB, "right");
      g.fillStyle = MC.line; g.fillRect(50, y + 15, 1100, 1); y += 48;
    });
    y += 38;
    text("PESO DE LOS FONDOS QUE CAMBIAN", 50, y, MC.br, FH); text("gris: actual · granate: propuesta", 1150, y, MC.mut, "19px Arial, sans-serif", "right");
    g.fillStyle = MC.br; g.fillRect(50, y + 12, 1100, 2); y += 48;
    var mx = 1; C.forEach(function (d) { mx = Math.max(mx, d.w0, d.w1); });
    C.slice().sort(function (p, q) { return q.dw - p.dw; }).forEach(function (d) {
      var nm = d.f.n.length > 42 ? d.f.n.slice(0, 41) + "…" : d.f.n;
      text(nm, 50, y + 16, MC.ink, "22px Arial, sans-serif");
      [[d.w0, "#b4b7c0", MC.mut, 0], [d.w1, MC.br, MC.ink, 30]].forEach(function (z) {
        g.fillStyle = MC.trk; mcRR(g, 580, y - 4 + z[3], 450, 20, 10); g.fill();
        if (z[0] > 0) { g.fillStyle = z[1]; mcRR(g, 580, y - 4 + z[3], Math.max(8, z[0] / mx * 450), 20, 10); g.fill(); }
        text(nf(z[0], 2) + "%", 1150, y + 14 + z[3], z[2], "bold 21px Arial, sans-serif", "right");
      });
      y += 82;
    });
    mcFoot(g, H, "Datos de Morningstar. La rentabilidad pasada no garantiza resultados futuros.");
    return c.toDataURL("image/png");
  }

  function summary(p) {
    var tot = sumW(p), n = p.lines.length;
    var y = wAvg(p, function (f) { return f.ret.ytd; }), y1 = wAvg(p, function (f) { return f.ret.y1; }),
      v = wAvg(p, function (f) { return f.vol[0]; }), s = wAvg(p, function (f) { return f.sharpe[0]; });
    var h = '<div class="kpis" style="margin-top:26px">' + kpi("Rentabilidad del año", ret(y.v), true) + kpi("Rentabilidad 1 año", ret(y1.v), true) +
      kpi("Volatilidad 1 año", pct(v.v, false, 1)) + kpi("Sharpe 1 año", dec(s.v)) + "</div>" + '<div id="aptrfrv" style="margin-top:18px">' + aportaRfRv(p) + "</div>";
    h += '<p class="note">Medias ponderadas por el peso de cada fondo con los datos de Morningstar. Rentabilidad pasada, no garantiza resultados futuros. La volatilidad no tiene en cuenta las correlaciones entre fondos, así que la de la cartera real suele ser menor.</p>';

    // Comprobaciones
    var ck = [];
    if (Math.abs(tot - 100) < 0.05) ck.push(["ok", "Los pesos suman 100%."]);
    else ck.push(["warn", "Los pesos suman " + nf(tot, 1) + "%, no 100%."]);
    var mf = maxFunds(p.amount);
    if (mf && mf.n !== null) ck.push([n <= mf.n ? "ok" : "warn", n + (n === 1 ? " fondo" : " fondos") + ": el máximo para " + nf(p.amount, 0) + " € es " + mf.n + "." + mf.note]);
    else if (mf) ck.push(["info", "Importe de " + nf(p.amount, 0) + " €" + mf.note + "."]);
    else ck.push(["info", "Indica el importe para comprobar el número máximo de fondos."]);
    var idx = p.lines.filter(function (l) { return byId(l.id).idx; }).map(function (l) { return byId(l.id).n; });
    ck.push(idx.length ? ["warn", "Incluye fondos indexados: " + idx.join(", ") + "."] : ["ok", "No incluye fondos indexados."]);
    var byCat = {};
    p.lines.forEach(function (l) { var f = byId(l.id); (byCat[f.c] = byCat[f.c] || []).push(f.n); });
    Object.keys(byCat).filter(function (c) { return byCat[c].length > 1; }).forEach(function (c) {
      ck.push(["info", byCat[c].length + " fondos en la categoría " + c + ": posible solapamiento."]);
    });
    var sorted = p.lines.slice().sort(function (a, b) { return b.w - a.w; });
    if (sorted.length) {
      var top3 = sorted.slice(0, 3).reduce(function (a, l) { return a + l.w; }, 0);
      ck.push(["info", "Mayor posición: " + byId(sorted[0].id).n + " (" + nf(sorted[0].w, 1) + "%). Las tres mayores suman " + nf(top3, 1) + "%."]);
    }
    var missing = p.lines.filter(function (l) { var f = byId(l.id); return !isNum(f.ret.y1) || !isNum(f.vol[0]); }).map(function (l) { return byId(l.id).n; });
    if (missing.length) ck.push(["warn", "Faltan datos de 1 año en: " + missing.join(", ") + ". Las medias usan solo los fondos con dato."]);

    h += '<div class="grid2">';
    // Composición
    var labels = ["Acciones", "Bonos", "Efectivo", "Otros"], colors = ["#2a5ca8", "#a3173f", "#bfc3c9", "#f2b705"];
    var mix = [0, 1, 2, 3].map(function (i) { return wAvg(p, function (f) { return f.mix[i]; }).v; });
    if (mix.some(isNum)) {
      var pos = mix.reduce(function (a, x) { return a + (isNum(x) && x > 0 ? x : 0); }, 0) || 1, acc0 = 0;
      var grad = mix.map(function (v, i) { if (!(isNum(v) && v > 0)) return null; var a0 = acc0; acc0 += v / pos * 100; return colors[i] + " " + a0.toFixed(2) + "% " + acc0.toFixed(2) + "%"; }).filter(Boolean).join(",");
      h += '<section class="block"><h3>Composición</h3><div class="donutw"><div class="donut" role="img" aria-label="Composición de la cartera" style="background:conic-gradient(' + grad + ')"><i>' + nf(Math.max(mix[0] || 0, mix[1] || 0), 0) + "%<small>" + (mix[0] >= mix[1] ? "Acciones" : "Bonos") + '</small></i></div><ul class="legv">' + mix.map(function (x, i) {
        return isNum(x) && Math.abs(x) >= 0.05 ? '<li style="--c:' + colors[i] + '"><span>' + labels[i] + "</span><b>" + pct(x, false, 1) + "</b></li>" : "";
      }).join("") + "</ul></div></section>";
    }
    // Por categoría
    var cw = {};
    p.lines.forEach(function (l) { var f = byId(l.id); cw[f.c] = (cw[f.c] || 0) + l.w; });
    var items = Object.keys(cw).map(function (c) { return [c, cw[c]]; }).sort(function (a, b) { return b[1] - a[1]; });
    h += '<section class="block"><h3>Peso por categoría</h3>' + bars(items, Math.max.apply(null, items.map(function (x) { return x[1]; })) || 1, false) + "</section>";
    // Por año
    var yrs = YEARS.map(function (yy) { var a = wAvg(p, function (f) { return annOf(f, yy); }); return a.cov > 0.999 ? [yearLabel(yy), a.v] : null; }).filter(function (x) { return x && isNum(x[1]); });
    if (yrs.length) {
      var yW = 560, yH = 250, ymax = Math.max.apply(null, yrs.map(function (x) { return Math.abs(x[1]); })) || 1, yneg = yrs.some(function (x) { return x[1] < 0; }), yb = yneg ? 130 : 190, yph = yneg ? 96 : 150, ycw = (yW - 20) / yrs.length;
      h += '<section class="block"><h3>Rentabilidad por año</h3><svg viewBox="0 0 ' + yW + " " + yH + '" width="100%" role="img" aria-label="Rentabilidad por año de la cartera"><line x1="10" x2="' + (yW - 10) + '" y1="' + yb + '" y2="' + yb + '" stroke="#bbb"/>' + yrs.map(function (y, k) {
        var hh = Math.max(2, Math.abs(y[1]) / ymax * yph), x = 10 + k * ycw + ycw * 0.18, w = ycw * 0.64, up = y[1] >= 0;
        return '<rect x="' + x.toFixed(1) + '" y="' + (up ? yb - hh : yb).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="3" fill="' + (up ? "#1e7a4a" : "#b3261e") + '"/>' +
          '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (up ? yb - hh - 6 : yb + hh + 14).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#222">' + nf(y[1], 1) + "%</text>" +
          '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (yH - 6) + '" text-anchor="middle" font-size="11" fill="#666">' + esc(String(y[0]).replace(/ \(.*$/, "*")) + "</text>";
      }).join("") + '</svg><p class="note">Solo años en los que todos los fondos tienen dato. * Año en curso.</p></section>';
    }
    // Métricas ponderadas
    var mw = [["Rentabilidad 3 años", "y3", true], ["Rentabilidad 5 años", "y5", true], ["Volatilidad 3 años", "vol3"], ["Sharpe 3 años", "sh3"], ["Sortino 1 año", "so1"], ["MAR 1 año", "mar1"]].map(function (x) {
      var m = metric(x[1]), a = wAvg(p, m.v);
      if (a.v === null) return "";
      var txt = x[2] ? pct(a.v, true, 2) : fmtMetric(m, a.v);
      return '<div class="mc"><small>' + x[0] + "</small><b>" + txt + "</b>" + (a.cov < 0.999 ? '<em>' + nf(a.cov * 100, 0) + "% del peso</em>" : "") + "</div>";
    }).join("");
    if (mw) h += '<section class="block"><h3>Otras métricas ponderadas</h3><div class="mcards">' + mw + "</div></section>";
    return h + "</div>";
  }

  function rankScore(f) { return (isNum(f.score && f.score[3]) ? f.score[3] : -99) + (f.stars || 0) / 100; }

  // ---------- categorías ----------
  var cs = { cat: null, sort: "ytd", dir: -1, pick: false };
  function allCats(t) {
    var m = {};
    ofType(t).forEach(function (f) { m[f.c] = (m[f.c] || 0) + 1; });
    return Object.keys(m).sort(function (x, y) { return m[y] - m[x] || x.localeCompare(y, "es"); }).map(function (c) { return [c, m[c]]; });
  }
  function catType(c) { var f = FUNDS.filter(function (x) { return x.c === c; })[0]; return f ? f.t : null; }

  function viewCategories(raw) {
    var want = null;
    try { want = raw ? decodeURIComponent(raw) : null; } catch (e) { want = null; }
    if (want && catType(want)) cs.cat = want;
    setTitle(cs.cat ? cs.cat : "Categorías");
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Categorías</h1>' +
      '<p class="sub">Elige una categoría Morningstar para ver todos sus fondos con sus métricas. Pulsa el título de una columna para ordenar y usa Columnas para elegir qué métricas ver.</p>';
    [["rf", "Renta fija"], ["rv", "Renta variable"]].forEach(function (g) {
      h += '<p class="label" style="margin-top:18px">' + g[1] + '</p><div class="chips cats">' + allCats(g[0]).map(function (x) {
        return '<button type="button" class="chip" data-cat="' + esc(x[0]) + '" aria-pressed="' + (cs.cat === x[0]) + '">' + esc(x[0]) + ' <small>' + x[1] + "</small></button>";
      }).join("") + "</div>";
    });
    h += '<div id="catbody"></div>';
    app.innerHTML = h + footer("rv");
    app.querySelectorAll("[data-cat]").forEach(function (b) {
      b.addEventListener("click", function () {
        var c = b.getAttribute("data-cat");
        cs.cat = cs.cat === c ? null : c;
        history.replaceState(null, "", cs.cat ? "#/categorias/" + encodeURIComponent(cs.cat) : "#/categorias");
        viewCategories(cs.cat ? encodeURIComponent(cs.cat) : null);
      });
    });
    renderCat();
  }

  function renderCat() {
    var el = document.getElementById("catbody");
    if (!cs.cat) { el.innerHTML = '<p class="muted" style="margin-top:22px">Selecciona una categoría para ver sus fondos.</p>'; return; }
    var t = catType(cs.cat), s = state[t], list = ofType(t).filter(function (f) { return f.c === cs.cat; }), cl = cols(t);
    if (cs.sort !== "n" && !cl.some(function (x) { return x.k === cs.sort; })) { cs.sort = cl.length ? cl[0].k : "n"; cs.dir = -1; }
    var cur = cl.filter(function (x) { return x.k === cs.sort; })[0], get = cs.sort === "n" || !cur ? function (f) { return f.n; } : cur.v;
    var rows = list.slice().sort(function (a, b) {
      var x = get(a), y = get(b), nx = x == null || x === "" || (typeof x === "number" && !isNum(x)), ny = y == null || y === "" || (typeof y === "number" && !isNum(y));
      if (nx && ny) return 0; if (nx) return 1; if (ny) return -1;
      return typeof x === "string" ? cs.dir * x.localeCompare(y, "es") : cs.dir * (x - y);
    });
    function th(k, l) {
      var on = cs.sort === k;
      return '<th scope="col"' + (on ? ' aria-sort="' + (cs.dir > 0 ? "ascending" : "descending") + '"' : "") + '><button type="button" data-csort="' + k + '">' + l + (on ? (cs.dir > 0 ? " ↑" : " ↓") : "") + "</button></th>";
    }
    var avg = cl.map(function (c) {
      var m = metric(c.k);
      if (m.txt) return "<td></td>";
      var vals = list.map(c.v).filter(isNum);
      return "<td>" + (vals.length ? cell({}, { v: function () { return vals.reduce(function (p, q) { return p + q; }, 0) / vals.length; }, u: m.u, d: m.d, sg: m.sg, txt: false }) : "–") + "</td>";
    }).join("");
    el.innerHTML = '<div class="page-head" style="margin-top:26px"><h2 class="cat-h">' + esc(cs.cat) + ' <small class="muted">' + list.length + (list.length === 1 ? " fondo" : " fondos") + '</small></h2>' +
      '<div class="tools"><label class="axis"><span class="muted">Ordenar por</span><select id="csel" aria-label="Ordenar por"><option value="n"' + (cs.sort === "n" ? " selected" : "") + ">Nombre</option>" +
      cl.map(function (c) { return '<option value="' + c.k + '"' + (cs.sort === c.k ? " selected" : "") + ">" + esc(c.l) + "</option>"; }).join("") + "</select></label>" +
      '<button type="button" class="chip" id="cdir" aria-label="Cambiar sentido">' + (cs.dir > 0 ? "Ascendente ↑" : "Descendente ↓") + "</button>" +
      '<button type="button" class="chip" id="cpick" aria-expanded="' + cs.pick + '">Columnas</button></div></div>' +
      '<div class="picker" id="cpicker"' + (cs.pick ? "" : " hidden") + "></div>" +
      '<div class="table-wrap"><table><thead><tr>' + th("n", "Fondo") + cl.map(function (c) { return th(c.k, c.l); }).join("") + "</tr></thead><tbody>" +
      rows.map(function (f) {
        return '<tr data-id="' + esc(f.id) + '" tabindex="0"><td class="fund"><b>' + esc(f.n) + (f.idx ? '<span class="tag">Indexado</span>' : "") + "</b><small>" + esc(f.g) + "</small></td>" +
          cl.map(function (c) { return "<td>" + c.r(f) + "</td>"; }).join("") + "</tr>";
      }).join("") + '</tbody><tfoot><tr><td><b>Media de la categoría</b></td>' + avg + "</tr></tfoot></table></div>";
    el.querySelectorAll("[data-csort]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-csort");
        if (cs.sort === k) cs.dir = -cs.dir; else { cs.sort = k; cs.dir = k === "n" || k === "cal" ? 1 : -1; }
        renderCat();
      });
    });
    document.getElementById("csel").addEventListener("change", function (e) { cs.sort = e.target.value; cs.dir = cs.sort === "n" || cs.sort === "cal" ? 1 : -1; renderCat(); });
    document.getElementById("cdir").addEventListener("click", function () { cs.dir = -cs.dir; renderCat(); });
    var pb = document.getElementById("cpick"), pk = document.getElementById("cpicker");
    function drawPicker() {
      var ms = metricsFor(t);
      pk.innerHTML = GROUPS.map(function (g) {
        var l = ms.filter(function (m) { return m.g === g; });
        return l.length ? '<div class="pgroup"><p class="label">' + g + '</p><div class="chips">' + l.map(function (m) {
          return '<button type="button" class="chip" data-col="' + m.k + '" aria-pressed="' + (s.cols.indexOf(m.k) !== -1) + '">' + esc(m.l) + "</button>";
        }).join("") + "</div></div>" : "";
      }).join("") + '<button type="button" class="chip" id="creset">Restablecer columnas</button>';
      pk.querySelectorAll("[data-col]").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = b.getAttribute("data-col"), i = s.cols.indexOf(k);
          if (i !== -1) { if (s.cols.length > 1) s.cols.splice(i, 1); } else s.cols.push(k);
          saveCols(t); renderCat();
        });
      });
      document.getElementById("creset").addEventListener("click", function () { s.cols = DEFAULTS[t].slice(); saveCols(t); renderCat(); });
    }
    if (cs.pick) drawPicker();
    pb.addEventListener("click", function () { cs.pick = !cs.pick; renderCat(); });
    el.querySelectorAll("tbody tr").forEach(function (tr) {
      function go() { location.hash = "#/fondo/" + encodeURIComponent(tr.getAttribute("data-id")); }
      tr.addEventListener("click", go);
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    });
  }

  // ---------- construcción de cartera ----------
  var BUCKETS = [
    { k: "corto", n: "RF corto plazo", g: "Renta fija", d: "Liquidez y baja volatilidad" },
    { k: "corp", n: "RF corporativa y flexible", g: "Renta fija", d: "Crédito de calidad y gestión flexible" },
    { k: "hy", n: "RF high yield y emergente", g: "Renta fija", d: "Más rentabilidad y más riesgo de crédito" },
    { k: "alt", n: "Alternativos y mixtos", g: "Otros", d: "Macro y mixtos flexibles" },
    { k: "eur", n: "RV Europa y zona euro", g: "Renta variable", d: "" },
    { k: "usa", n: "RV Estados Unidos", g: "Renta variable", d: "" },
    { k: "glob", n: "RV Global", g: "Renta variable", d: "Global, dividendo, pequeñas y medianas" },
    { k: "em", n: "RV emergentes y Asia", g: "Renta variable", d: "" },
    { k: "sec", n: "RV sectorial y temática", g: "Renta variable", d: "Tecnología, salud, industria, recursos" }
  ];
  var BPROF = {
    conservador: { n: "Conservador", rv: [15, 30], r: { corto: [15, 40], corp: [20, 45], hy: [0, 10], alt: [0, 10], eur: [0, 10], usa: [0, 10], glob: [5, 20], em: [0, 5], sec: [0, 5] }, w: { corto: 25, corp: 35, hy: 5, alt: 5, eur: 5, usa: 5, glob: 20, em: 0, sec: 0 } },
    moderado: { n: "Moderado", rv: [35, 55], r: { corto: [5, 20], corp: [15, 30], hy: [0, 10], alt: [0, 10], eur: [5, 15], usa: [5, 20], glob: [10, 25], em: [0, 10], sec: [0, 10] }, w: { corto: 15, corp: 25, hy: 5, alt: 5, eur: 10, usa: 10, glob: 20, em: 5, sec: 5 } },
    dinamico: { n: "Dinámico", rv: [65, 90], r: { corto: [0, 10], corp: [5, 15], hy: [0, 10], alt: [0, 10], eur: [5, 20], usa: [10, 25], glob: [15, 35], em: [0, 15], sec: [0, 15] }, w: { corto: 5, corp: 10, hy: 5, alt: 0, eur: 15, usa: 20, glob: 30, em: 10, sec: 5 } }
  };
  var RVB = ["eur", "usa", "glob", "em", "sec"];
  function bucketOf(f) {
    if (f.t === "rf") return /Corto Plazo/.test(f.c) ? "corto" : /High Yield|Emergente/.test(f.c) ? "hy" : /Alt -/.test(f.c) ? "alt" : "corp";
    if (/Mixtos/.test(f.c)) return "alt";
    if (/Emergente|Asia/.test(f.c)) return "em";
    if (/Sector/.test(f.c)) return "sec";
    if (/USA/.test(f.c)) return "usa";
    if (/Europa|Zona Euro/.test(f.c)) return "eur";
    return "glob";
  }
  function candidates(k) {
    return FUNDS.filter(function (f) { return !f.idx && bucketOf(f) === k; })
      .sort(function (a, b) { return rankScore(b) - rankScore(a); }).slice(0, 5);
  }
  var bld = null;
  function bldReset(profile, keep) {
    var pr = BPROF[profile];
    bld = { profile: profile, name: keep ? bld.name : "", amount: keep ? bld.amount : null, w: {}, sel: {} };
    BUCKETS.forEach(function (b) { bld.w[b.k] = pr.w[b.k]; bld.sel[b.k] = []; });
  }
  function bldLines() {
    var lines = [];
    BUCKETS.forEach(function (b) {
      var w = bld.w[b.k] || 0, ids = bld.sel[b.k];
      if (!(w > 0) || !ids.length) return;
      var each = Math.round(w / ids.length * 10) / 10, used = 0;
      ids.forEach(function (id, i) {
        var x = i === ids.length - 1 ? Math.round((w - used) * 10) / 10 : each;
        used += x; lines.push({ id: id, w: x });
      });
    });
    return lines;
  }
  // composición final de la cartera construida: cada fondo con su peso, importe, rentabilidad y riesgo
  function bldFinal(lines, amount) {
    var q = { lines: lines }, amt = amount > 0 ? amount : 0, tw = lines.reduce(function (a, l) { return a + l.w; }, 0), partial = false;
    function money0(v) { return nf(v, 0) + " €"; }
    function wcell(w) { return '<td class="num bfw"><b>' + nf(w, 1) + '%</b><i><u style="width:' + Math.min(100, w) + '%"></u></i></td>'; }
    var groups = ["Renta fija", "Otros", "Renta variable"].map(function (g) {
      var rows = lines.map(function (l) { var f = byId(l.id); return { l: l, f: f, k: bucketOf(f) }; })
        .filter(function (x) { return BUCKETS.some(function (b) { return b.k === x.k && b.g === g; }); })
        .sort(function (a, b) { return b.l.w - a.l.w; });
      return { n: g === "Otros" ? "Alternativos y mixtos" : g, c: g === "Renta fija" ? "g-rf" : g === "Otros" ? "g-alt" : "g-rv", rows: rows, w: rows.reduce(function (a, x) { return a + x.l.w; }, 0) };
    }).filter(function (g) { return g.rows.length; });
    function name(x, extra) { return '<td class="fund"><div class="bfn"><span class="flogo" aria-hidden="true">' + logoOrInit(x.f.g) + '</span><span class="ftxt"><b><a href="#/fondo/' + encodeURIComponent(x.f.id) + '">' + esc(x.f.n) + "</a></b><small>" + extra + "</small></span></div></td>"; }
    // 1. pesos e importes
    var cols = amt ? 5 : 3;
    var t1 = groups.map(function (g) {
      return '<tr class="bfg ' + g.c + '"><td>' + g.n + "</td>" + wcell(g.w) + (amt ? '<td class="num"><b>' + money0(amt * g.w / 100) + "</b></td><td></td>" : "") + "<td></td></tr>" +
        g.rows.map(function (x) {
          var de = amt * x.l.w / 100, u = amt ? chUnits({ f: x.f, de: de }) : null;
          return '<tr class="' + g.c + '">' + name(x, esc(bname(x.k)) + " · " + esc(x.f.g) + " · " + esc(x.f.id)) + wcell(x.l.w) +
            (amt ? '<td class="num">' + money0(de) + '</td><td class="num">' + (u ? nf(u, 2) : "–") + "</td>" : "") +
            '<td class="mst">' + (x.f.stars ? stars(x.f.stars) : '<span class="muted">–</span>') + "</td></tr>";
        }).join("");
    }).join("");
    // 2. rentabilidad y riesgo
    var M = [
      { g: "Rentabilidad", l: "Año", v: function (f) { return f.ret.ytd; }, r: 1 }, { g: "Rentabilidad", l: "1 año", v: function (f) { return f.ret.y1; }, r: 1 },
      { g: "Rentabilidad", l: "3 años", v: function (f) { return f.ret.y3; }, r: 1 }, { g: "Rentabilidad", l: "5 años", v: function (f) { return f.ret.y5; }, r: 1 },
      { g: "Volatilidad", l: "1 año", v: function (f) { return f.vol && f.vol[0]; } }, { g: "Volatilidad", l: "3 años", v: function (f) { return f.vol && f.vol[1]; } }, { g: "Volatilidad", l: "5 años", v: function (f) { return f.vol && f.vol[2]; } },
      { g: "Caída máxima", l: "3 años", v: function (f) { return f.dd && f.dd[1]; } }, { g: "Caída máxima", l: "5 años", v: function (f) { return f.dd && f.dd[2]; } },
      { g: "Sharpe", l: "1 año", v: function (f) { return f.sharpe && f.sharpe[0]; }, d: 1 }
    ];
    function val(m, v) { return !isNum(v) ? '<span class="muted">–</span>' : m.r ? ret(v) : '<span class="num">' + (m.d ? dec(v) : pct(v, false, 1)) + "</span>"; }
    var h1 = "", h2 = "";
    M.forEach(function (m, i) {
      var first = !i || M[i - 1].g !== m.g;
      if (first) h1 += '<th scope="colgroup" class="bfh" colspan="' + M.filter(function (z) { return z.g === m.g; }).length + '">' + m.g + "</th>";
      h2 += '<th scope="col"' + (first ? ' class="bfs"' : "") + ">" + m.l + "</th>";
    });
    function cells(fn) { return M.map(function (m, i) { return "<td" + (!i || M[i - 1].g !== m.g ? ' class="bfs"' : "") + ">" + fn(m) + "</td>"; }).join(""); }
    var t2 = groups.map(function (g) {
      return '<tr class="bfg ' + g.c + '"><td>' + g.n + '</td><td colspan="' + M.length + '"></td></tr>' +
        g.rows.map(function (x) { return "<tr>" + name(x, nf(x.l.w, 1) + "% de la cartera") + cells(function (m) { return val(m, m.v(x.f)); }) + "</tr>"; }).join("");
    }).join("");
    var tot = cells(function (m) {
      var a = wAvg(q, m.v), part = a.v !== null && a.cov < 0.999;
      if (part) partial = true;
      return val(m, a.v) + (part ? '<small class="bfp">' + nf(a.cov * 100, 0) + "% del peso</small>" : "");
    });
    return '<section class="block" style="margin-top:22px" id="bcomp"><h3>Composición final de la cartera</h3><p class="note" style="margin-top:0">' + lines.length + (lines.length === 1 ? " fondo" : " fondos") + (amt ? " · " + money0(amt) : "") + " · Perfil " + esc(BPROF[bld.profile].n.toLowerCase()) +
      (Math.abs(tw - 100) < 0.05 ? "" : ' · <b class="neg">Sin terminar: los pesos suman ' + nf(tw, 1) + "%</b>") + '</p><div class="table-wrap"><table class="bft"><thead><tr><th scope="col">Fondo</th><th scope="col">Peso</th>' +
      (amt ? '<th scope="col">Importe</th><th scope="col">Particip. aprox.</th>' : "") + '<th scope="col">Morningstar</th></tr></thead><tbody>' + t1 +
      '</tbody><tfoot><tr><td><b>Total cartera</b></td><td class="num"><b>' + nf(tw, 1) + "%</b></td>" + (amt ? '<td class="num"><b>' + money0(amt * tw / 100) + "</b></td><td></td>" : "") + "<td></td></tr></tfoot></table></div>" +
      '<p class="note">' + (amt ? "Participaciones estimadas con el último valor liquidativo publicado en la web (no se calculan si está en otra divisa)." : "Indica el importe arriba para ver los euros y las participaciones de cada fondo.") + "</p>" +
      '<h4 class="bft-t">Rentabilidad y riesgo</h4><div class="table-wrap"><table class="bft bfr"><thead><tr><th scope="col" rowspan="2">Fondo</th>' + h1 + "</tr><tr>" + h2 + "</tr></thead><tbody>" + t2 +
      "</tbody><tfoot><tr><td><b>Total cartera</b></td>" + tot + "</tr></tfoot></table></div>" +
      '<p class="note">Rentabilidades a 3 y 5 años anualizadas. La fila total es la media ponderada por peso' + (partial ? " (cuando falta el dato de algún fondo, solo con la parte indicada)" : "") + ". La volatilidad y la caída máxima totales no tienen en cuenta las correlaciones, así que no son las de la cartera en conjunto. Rentabilidad pasada, no garantiza resultados futuros.</p></section>";
  }
  function bandStyle(r) {
    return "background:linear-gradient(to right,#e0e0e0 0," + r[0] + "%,#f0c9b0 " + r[0] + "%," + r[1] + "%,#e0e0e0 " + r[1] + "%,#e0e0e0 100%)";
  }

  function viewBuild() {
    setTitle("Construir cartera");
    if (!bld) bldReset("moderado", false);
    var GC = { "Renta fija": "g-rf", "Otros": "g-alt", "Renta variable": "g-rv" }, GN = { "Renta fija": "Renta fija", "Otros": "Alternativos y mixtos", "Renta variable": "Renta variable" };
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Construir cartera</h1>' +
      '<p class="sub">Elige el perfil, ajusta el porcentaje de cada categoría dentro de su horquilla y selecciona los fondos propuestos. La franja de color de cada barra es la horquilla recomendada para el perfil.</p>' +
      '<div class="bhead"><label class="fld"><span class="muted">Nombre de la cartera</span><input class="inp" id="bname" maxlength="80" placeholder="Por ejemplo, Cartera cliente" value="' + esc(bld.name) + '"></label>' +
      '<label class="fld"><span class="muted">Importe (€)</span><input class="inp amt" id="bamt" type="number" min="0" step="1000" placeholder="Opcional" value="' + (bld.amount || "") + '"></label>' +
      '<div class="fld"><span class="muted">Perfil</span><div class="seg" role="group" aria-label="Perfil">' + Object.keys(BPROF).map(function (k) {
        return '<button type="button" data-prof="' + k + '" aria-pressed="' + (bld.profile === k) + '">' + BPROF[k].n + "</button>";
      }).join("") + "</div></div></div>" +
      '<div id="bbands"></div>';
    var last = "";
    BUCKETS.forEach(function (b) {
      if (b.g !== last) { h += '<div class="bgh ' + GC[b.g] + '"><h2>' + GN[b.g] + '</h2><b data-gt="' + b.g + '"></b></div>'; last = b.g; }
      h += '<div class="bk ' + GC[b.g] + '" id="bk-' + b.k + '"><div class="bkh"><div><b>' + esc(b.n) + "</b>" + (b.d ? "<small>" + esc(b.d) + "</small>" : "") + '</div>' +
        '<div class="bkw"><input class="inp w" type="number" min="0" max="100" step="1" data-n="' + b.k + '" aria-label="Porcentaje de ' + esc(b.n) + '"><span>%</span></div></div>' +
        '<input type="range" min="0" max="100" step="1" class="rng" data-r="' + b.k + '" aria-label="Peso de ' + esc(b.n) + '">' +
        '<p class="bkm"><span data-hq="' + b.k + '"></span><span class="bst" data-st="' + b.k + '"></span></p><div class="cands" id="c-' + b.k + '"></div></div>';
    });
    h += '<div id="bsum"></div><div id="bfinal"></div><div class="row tools2"><button type="button" class="btn" id="bsave">Guardar en mis carteras</button>' +
      '<button type="button" class="btn ghost" id="bmail">Correo</button><button type="button" class="btn ghost" id="bpdf">Descargar PDF</button><button type="button" class="btn ghost" id="bnorm">Ajustar a 100%</button><button type="button" class="btn ghost" id="breset">Valores del perfil</button></div>';
    app.innerHTML = '<div class="bpage">' + h + "</div>" + footer("rv") + '<div class="bleft-sp"></div><div id="bleft" role="status" aria-live="polite"></div>';

    function total() { return BUCKETS.reduce(function (a, b) { return a + (bld.w[b.k] || 0); }, 0); }
    // aviso fijo con el peso que falta (o sobra) para llegar al 100%
    function drawLeft() {
      var t = total(), d = Math.round((100 - t) * 10) / 10, el = document.getElementById("bleft"), dc = d % 1 ? 1 : 0;
      var n = bldLines().length, mf = maxFunds(bld.amount), mx = mf && mf.n !== null ? mf.n : null;
      el.className = d > 0 ? "falta" : d < 0 ? "sobra" : "ok";
      el.innerHTML = "<div><b>" + (d > 0 ? "Falta " + nf(d, dc) + "% para el 100%" : d < 0 ? "Sobra " + nf(-d, dc) + "%: pasa del 100%" : "Cartera completa al 100%") + "</b><span>Asignado " + nf(t, t % 1 ? 1 : 0) + "% · " + n + (n === 1 ? " fondo" : " fondos") + (mx !== null ? (n > mx ? ' <em class="bmx">máximo ' + mx + "</em>" : " (máximo " + mx + ")") : "") + '</span></div><i><u style="width:' + Math.min(100, t) + '%"></u></i>';
    }
    function drawBands() {
      var pr = BPROF[bld.profile], rv = RVB.reduce(function (a, k) { return a + (bld.w[k] || 0); }, 0);
      var rf = ["corto", "corp", "hy"].reduce(function (a, k) { return a + (bld.w[k] || 0); }, 0), ot = bld.w.alt || 0;
      var ok = rv >= pr.rv[0] && rv <= pr.rv[1];
      function tile(c, n, w) { return '<div class="btl ' + c + '"><small>' + n + "</small><b>" + nf(w, 0) + "%</b>" + (bld.amount ? "<span>" + nf(bld.amount * w / 100, 0) + " €</span>" : "") + "</div>"; }
      document.getElementById("bbands").innerHTML = '<div class="bband"><div class="btls">' + tile("g-rf", "Renta fija", rf) + tile("g-alt", "Alternativos y mixtos", ot) + tile("g-rv", "Renta variable", rv) + '</div><div class="stack"><i class="g-rf" style="width:' + rf + '%"></i><i class="g-alt" style="width:' + ot + '%"></i><i class="g-rv" style="width:' + rv + '%"></i></div>' +
        '<p class="' + (ok ? "okt" : "badt") + '">Renta variable recomendada para el perfil ' + BPROF[bld.profile].n.toLowerCase() + ": " + pr.rv[0] + " a " + pr.rv[1] + "%. " + (ok ? "Dentro de la horquilla." : "Ahora está fuera.") + "</p></div>";
    }
    function drawBucket(b) {
      var r = BPROF[bld.profile].r[b.k], w = bld.w[b.k] || 0, el = document.getElementById("bk-" + b.k);
      el.querySelector("[data-n]").value = w;
      var rng = el.querySelector("[data-r]"); rng.value = w; rng.setAttribute("style", bandStyle(r));
      el.querySelector("[data-hq]").textContent = "Horquilla del perfil: " + r[0] + " a " + r[1] + "%";
      var st = el.querySelector("[data-st]"), inr = w >= r[0] && w <= r[1];
      st.textContent = w === 0 && r[0] > 0 ? "Por debajo, el mínimo es " + r[0] + "%" : inr ? "Dentro" : w < r[0] ? "Por debajo" : "Por encima";
      st.className = "bst " + (inr ? "in" : "out");
      var box = document.getElementById("c-" + b.k);
      el.classList.toggle("off", !(w > 0));
      if (!(w > 0)) { bld.sel[b.k] = []; box.innerHTML = ""; return; }
      var cs = candidates(b.k);
      bld.sel[b.k] = bld.sel[b.k].filter(function (id) { return cs.some(function (f) { return f.id === id; }); });
      if (!bld.sel[b.k].length && cs.length) bld.sel[b.k] = [cs[0].id];
      box.innerHTML = cs.length ? '<p class="label">Fondos propuestos (ordenados por puntuación Morningstar)</p>' + cs.map(function (f) {
        var on = bld.sel[b.k].indexOf(f.id) !== -1;
        function stat(l, v) { return "<span><small>" + l + "</small><b>" + v + "</b></span>"; }
        return '<label class="cand' + (on ? " on" : "") + '"><input type="checkbox" data-f="' + esc(f.id) + '" data-b="' + b.k + '"' + (on ? " checked" : "") + '><span class="flogo" aria-hidden="true">' + logoOrInit(f.g) + '</span><span class="ct"><b>' + esc(f.n) + "</b><small>" + esc(f.g) + " · " + esc(f.c) + "</small>" + (f.stars ? '<span class="cst" role="img" aria-label="' + f.stars + ' de 5 estrellas">' + stars(f.stars) + "</span>" : "") + '</span><span class="cm">' +
          stat("Año", ret(f.ret.ytd, 1)) + stat("1 año", ret(f.ret.y1, 1)) + stat("3 años", ret(f.ret.y3, 1)) + stat("Vol. 1 a.", pct(f.vol[0], false, 1)) + "</span></label>";
      }).join("") : '<p class="muted">No hay fondos en esta categoría.</p>';
      box.querySelectorAll("[data-f]").forEach(function (c) {
        c.addEventListener("change", function () {
          var id = c.getAttribute("data-f"), list = bld.sel[b.k], i = list.indexOf(id);
          if (c.checked && i === -1) list.push(id); else if (!c.checked && i !== -1) { if (list.length > 1) list.splice(i, 1); else c.checked = true; }
          drawBucket(b); drawTotals();
        });
      });
    }
    function drawTotals() {
      var lines = bldLines(), n = lines.length;
      drawBands();
      Object.keys(GN).forEach(function (g) {
        var w = BUCKETS.filter(function (b) { return b.g === g; }).reduce(function (a, b) { return a + (bld.w[b.k] || 0); }, 0);
        app.querySelector('[data-gt="' + g + '"]').textContent = nf(w, 0) + "%" + (bld.amount ? " · " + nf(bld.amount * w / 100, 0) + " €" : "");
      });
      drawLeft();
      document.getElementById("bsum").innerHTML = n ? summary({ id: "tmp", name: bld.name, amount: bld.amount, lines: lines }) : "";
      document.getElementById("bfinal").innerHTML = n ? bldFinal(lines, bld.amount) : "";
    }
    function drawAll() { BUCKETS.forEach(drawBucket); drawTotals(); }
    function setW(k, v) { bld.w[k] = Math.max(0, Math.min(100, isFinite(v) ? Math.round(v) : 0)); drawBucket(BUCKETS.filter(function (b) { return b.k === k; })[0]); drawTotals(); }
    app.querySelectorAll("[data-r]").forEach(function (r) { r.addEventListener("input", function () { setW(r.getAttribute("data-r"), parseFloat(r.value)); }); });
    app.querySelectorAll("[data-n]").forEach(function (r) { r.addEventListener("change", function () { setW(r.getAttribute("data-n"), parseFloat(r.value)); }); });
    app.querySelectorAll("[data-prof]").forEach(function (b) { b.addEventListener("click", function () { bldReset(b.getAttribute("data-prof"), true); viewBuild(); }); });
    document.getElementById("bname").addEventListener("input", function (e) { bld.name = e.target.value.slice(0, 80); });
    document.getElementById("bamt").addEventListener("input", function (e) { var a = parseNum(e.target.value); bld.amount = a !== null && a > 0 ? a : null; drawTotals(); });
    document.getElementById("breset").addEventListener("click", function () { bldReset(bld.profile, true); viewBuild(); });
    document.getElementById("bnorm").addEventListener("click", function () {
      var t = total(); if (!t) return;
      var keys = BUCKETS.map(function (b) { return b.k; }), sum = 0, big = keys[0];
      keys.forEach(function (k) { bld.w[k] = Math.round(bld.w[k] / t * 100); sum += bld.w[k]; if (bld.w[k] > bld.w[big]) big = k; });
      bld.w[big] += 100 - sum; drawAll();
    });
    document.getElementById("bmail").addEventListener("click", function () { var nm = document.getElementById("bname"), am = document.getElementById("bamt"); mailModal(pfMail(nm && nm.value || bld.name, am && am.value ? +am.value : 0, bldLines(), "Perfil: " + BPROF[bld.profile].n.toLowerCase() + ".")); });
    document.getElementById("bpdf").addEventListener("click", function () { var nm = document.getElementById("bname"), am = document.getElementById("bamt"); deckPortfolio(nm && nm.value || bld.name || "Cartera", BPROF[bld.profile].n, am && am.value ? +am.value : 0, bldLines()); });
    document.getElementById("bsave").addEventListener("click", function () {
      var lines = bldLines();
      if (!lines.length) return;
      var c = cleanPf({ name: bld.name || ("Cartera " + BPROF[bld.profile].n.toLowerCase()), amount: bld.amount, lines: lines });
      PF.push(c); savePf(); location.hash = "#/cartera/" + encodeURIComponent(c.id);
    });
    drawAll();
  }

  // ---------- gestión de carteras (análisis de la cartera actual del cliente) ----------
  var gc = { name: "", profile: "moderado", lines: [] };
  function bname(k) { return BUCKETS.filter(function (b) { return b.k === k; })[0].n; }
  function sumOf(o) { return Object.keys(o).reduce(function (a, k) { return a + o[k]; }, 0); }
  function gcTotal() { return gc.lines.reduce(function (a, l) { return a + gcEff(l); }, 0); }
  function gcLines() {
    var t = gcTotal();
    return gc.lines.map(function (l) {
      var f = l.id ? byId(l.id) : null, amt = gcEff(l), nav = f ? navOf(f) : null;
      return { id: f ? f.id : null, name: f ? f.n : l.name, bucket: f ? bucketOf(f) : l.bucket, amt: amt, nav: nav, units: f && nav ? (l.part > 0 ? l.part : (amt > 0 ? amt / nav : null)) : null, w: t && amt > 0 ? amt / t * 100 : 0 };
    }).filter(function (l) { return l.w > 0; });
  }
  function altFor(f, taken) {
    return FUNDS.filter(function (g) { return g.id !== f.id && !g.idx && g.c === f.c && taken.indexOf(g.id) === -1; })
      .sort(function (a, b) { return rankScore(b) - rankScore(a); })[0] || null;
  }
  function topCand(k, taken) {
    return candidates(k).filter(function (g) { return taken.indexOf(g.id) === -1; })[0] || null;
  }
  function posInCat(f) {
    var cat = FUNDS.filter(function (g) { return g.c === f.c; }).sort(function (a, b) { return rankScore(b) - rankScore(a); });
    return [cat.map(function (g) { return g.id; }).indexOf(f.id) + 1, cat.length];
  }
  function gcInfo(L) {
    var taken = L.map(function (l) { return l.id; }).filter(Boolean);
    return L.map(function (l) {
      var f = l.id ? byId(l.id) : null, o = { l: l, f: f, k: l.bucket, v: "Mantener", why: "", alt: null };
      if (!f) {
        o.v = "Sustituir"; o.why = "No está en la web, sin datos para analizarlo";
        o.alt = topCand(l.bucket, taken);
      } else {
        var alt = altFor(f, taken), better = alt && rankScore(alt) > rankScore(f) + 0.3;
        if (f.idx) { o.v = "Sustituir"; o.why = "Fondo indexado"; o.alt = alt || topCand(o.k, taken); }
        else if (better) { o.v = "Sustituir"; o.why = "En su categoría hay un fondo con mejor puntuación Morningstar"; o.alt = alt; }
        else if ((f.stars && f.stars <= 2) || (isNum(f.sharpe[1]) && f.sharpe[1] < 0)) { o.v = "Revisar"; o.why = f.stars && f.stars <= 2 ? "Rating Morningstar bajo" : "Sharpe a 3 años negativo"; }
        else o.why = "Buena posición dentro de su categoría";
      }
      if (o.alt) taken.push(o.alt.id);
      return o;
    });
  }
  function gcTargets(cur, r) {
    var t = {};
    BUCKETS.forEach(function (b) { t[b.k] = Math.min(r[b.k][1], Math.max(r[b.k][0], cur[b.k] || 0)); });
    for (var i = 0; i < 30; i++) {
      var d = 100 - sumOf(t);
      if (Math.abs(d) < 0.01) break;
      var room = {}, tr = 0, pass;
      for (pass = 0; pass < 2 && tr <= 0; pass++) {
        tr = 0;
        BUCKETS.forEach(function (b) {
          var el = pass === 1 || (cur[b.k] || 0) > 0 || r[b.k][0] > 0;
          room[b.k] = el ? (d > 0 ? r[b.k][1] - t[b.k] : t[b.k] - r[b.k][0]) : 0; tr += room[b.k];
        });
      }
      if (tr <= 0) break;
      BUCKETS.forEach(function (b) { t[b.k] += (d > 0 ? 1 : -1) * Math.min(room[b.k], Math.abs(d) * room[b.k] / tr); });
    }
    return t;
  }
  function gcPropose(info, pr, amount) {
    var lines = {}, order = [];
    function add(id, w, note) {
      if (!lines[id]) { lines[id] = { id: id, w: 0, notes: [] }; order.push(id); }
      lines[id].w += w; if (note) lines[id].notes.push(note);
    }
    info.forEach(function (o) {
      if (o.v === "Sustituir" && o.alt) add(o.alt.id, o.l.w, "Sustituye a " + o.l.name);
      else if (o.f) add(o.f.id, o.l.w, "");
    });
    var taken = order.slice(), cur = {};
    order.forEach(function (id) { var k = bucketOf(byId(id)); cur[k] = (cur[k] || 0) + lines[id].w; });
    var t = gcTargets(cur, pr.r), out = [];
    BUCKETS.forEach(function (b) {
      var ids = order.filter(function (id) { return bucketOf(byId(id)) === b.k; }), tw = t[b.k];
      if (!(tw > 0.05)) return;
      if (!ids.length) {
        var c = topCand(b.k, taken);
        if (c) { taken.push(c.id); out.push({ id: c.id, w: tw, notes: ["Nuevo: cubre " + b.n] }); }
        return;
      }
      var cw = ids.reduce(function (a, id) { return a + lines[id].w; }, 0);
      ids.forEach(function (id) { out.push({ id: id, w: lines[id].w / cw * tw, notes: lines[id].notes }); });
    });
    var mf = maxFunds(amount);
    while (mf && mf.n !== null && out.length > mf.n) {
      out.sort(function (a, b) { return a.w - b.w; });
      var s = out.filter(function (x) { return out.some(function (y) { return y !== x && bucketOf(byId(y.id)) === bucketOf(byId(x.id)); }); })[0];
      if (!s) break;
      var big = out.filter(function (y) { return y !== s && bucketOf(byId(y.id)) === bucketOf(byId(s.id)); }).sort(function (a, b) { return b.w - a.w; })[0];
      big.w += s.w; big.notes = big.notes.concat(["Absorbe a " + byId(s.id).n + " para respetar el máximo de fondos"]);
      out.splice(out.indexOf(s), 1);
    }
    var tot = out.reduce(function (a, x) { return a + x.w; }, 0);
    out.forEach(function (x) { x.w = Math.round(x.w / tot * 1000) / 10; });
    var diff = Math.round((100 - out.reduce(function (a, x) { return a + x.w; }, 0)) * 10) / 10;
    if (out.length) { out.sort(function (a, b) { return b.w - a.w; }); out[0].w = Math.round((out[0].w + diff) * 10) / 10; }
    return { lines: out, targets: t, cur: cur };
  }

  // ---------- correlaciones y comentario de gestión ----------
  function pearson(xs, ys) {
    var n = xs.length, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
    mx /= n; my /= n;
    var sxy = 0, sxx = 0, syy = 0;
    for (i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); syy += (ys[i] - my) * (ys[i] - my); }
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
  }
  function estCorr(ka, kb) {
    var rv = function (k) { return RVB.indexOf(k) !== -1; };
    if (ka === kb) return ka === "corto" ? 0.8 : 0.85;
    if (rv(ka) && rv(kb)) return (ka === "sec" || kb === "sec" || ka === "em" || kb === "em") ? 0.7 : 0.85;
    if (ka === "alt" || kb === "alt") return 0.35;
    if (!rv(ka) && !rv(kb)) return (ka === "corto" || kb === "corto") ? 0.35 : (ka === "hy" || kb === "hy") ? 0.55 : 0.65;
    return (ka === "hy" || kb === "hy") ? 0.5 : 0.25;
  }
  function corrPair(a, b) {
    if (a.id && b.id) {
      var fa = byId(a.id), fb = byId(b.id), xs = [], ys = [];
      for (var y = 2026; y >= 2019; y--) {
        var x1 = annOf(fa, y), x2 = annOf(fb, y);
        if (x1 !== null && x2 !== null) { xs.push(x1); ys.push(x2); }
      }
      if (xs.length >= 5) { var r = pearson(xs, ys); if (r !== null) return { v: r, est: false, n: xs.length }; }
    }
    return { v: estCorr(a.bucket, b.bucket), est: true, n: 0 };
  }
  function heat(v) {
    return v >= 0 ? "rgba(133,26,46," + (Math.max(0, v) * 0.5).toFixed(2) + ")" : "rgba(30,122,74," + (Math.min(1, -v) * 0.5).toFixed(2) + ")";
  }
  function gcCorr(L) {
    var n = L.length, M = [], high = [], i, j;
    for (i = 0; i < n; i++) { M.push([]); for (j = 0; j < n; j++) M[i].push(i === j ? { v: 1, est: false, n: 0 } : (j < i ? M[j][i] : corrPair(L[i], L[j]))); }
    var avg = L.map(function (l, i) {
      var s = 0, c = 0;
      for (j = 0; j < n; j++) if (j !== i) { s += M[i][j].v * L[j].w; c += L[j].w; }
      return c ? s / c : null;
    });
    var wavg = 0, wsum = 0;
    for (i = 0; i < n; i++) if (avg[i] !== null) { wavg += avg[i] * L[i].w; wsum += L[i].w; }
    wavg = wsum ? wavg / wsum : null;
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) if (M[i][j].v >= 0.85) high.push([L[i].name, L[j].name, M[i][j].v, M[i][j].est]);
    var anyEst = false;
    var html = '<section class="block corr" style="margin-top:22px"><h3>Correlaciones entre los fondos de la cartera</h3>';
    if (n < 2) return { html: html + '<p class="muted">Hacen falta al menos dos fondos.</p></section>', high: [], avg: null };
    html += '<div class="table-wrap"><table><thead><tr><th scope="col">Fondo</th>' + L.map(function (l, k) { return '<th scope="col" title="' + esc(l.name) + '">' + (k + 1) + "</th>"; }).join("") + '<th scope="col">Media</th></tr></thead><tbody>' +
      L.map(function (l, r) {
        return '<tr><td class="fund"><b>' + (r + 1) + ". " + esc(l.name) + "</b></td>" + M[r].map(function (c, k) {
          if (c.est) anyEst = true;
          return '<td class="cc' + (c.est ? " est" : "") + '" style="background:' + (r === k ? "transparent" : heat(c.v)) + '" title="' + (r === k ? "" : c.est ? "Estimada por tipo de fondo" : "Calculada con " + c.n + " rentabilidades anuales") + '">' + (r === k ? "1,00" : (c.est ? "~" : "") + nf(c.v, 2)) + "</td>";
        }).join("") + '<td class="cc"><b>' + (avg[r] === null ? "–" : nf(avg[r], 2)) + "</b></td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<p class="note">Correlación de Pearson calculada con las rentabilidades anuales de 2019 a 2026 (como máximo 8 datos, así que es orientativa). Cuando dos fondos no tienen al menos 5 años en común, el valor lleva el signo ~ y es una estimación según el tipo de fondo, no una medición. Una correlación alta (rojo) indica que los fondos se mueven parecido y diversifican poco entre sí; las bajas o negativas (verde) diversifican más.' + (wavg !== null ? " Correlación media ponderada de la cartera: <b>" + nf(wavg, 2) + "</b>." : "") + "</p>";
    if (high.length) html += '<p class="label" style="margin-top:14px">Pares muy correlacionados (0,85 o más)</p><ul class="checks">' + high.map(function (x) { return '<li class="warn"><i></i><span>' + esc(x[0]) + " y " + esc(x[1]) + ": " + (x[3] ? "~" : "") + nf(x[2], 2) + ". Aportan poca diversificación entre sí.</span></li>"; }).join("") + "</ul>";
    return { html: html + "</section>", high: high, avg: wavg };
  }

  function numOf(s) { var v = parseFloat(String(s == null ? "" : s).replace(/,/g, "")); return isFinite(v) ? v : null; }
  function yearsSince(d) {
    var m = /(\d+)\/(\d+)\/(\d+)/.exec(String(d || ""));
    return m ? (new Date(2026, 10, 21) - new Date(+m[3], +m[2] - 1, +m[1])) / 31557600000 : null;
  }
  function fundComment(f) {
    var s = [], yrs = yearsSince(f.cre), aum = numOf(f.aumc), ps = posInCat(f);
    if (isNum(yrs)) s.push(yrs < 3 ? "Fondo joven (" + nf(yrs, 1) + " años de historia): sus ratios a varios años aún no son fiables." : "Cuenta con " + nf(yrs, 0) + " años de historia.");
    if (isNum(aum)) s.push(aum < 50 ? "El patrimonio de la clase es pequeño (" + nf(aum, 0) + " M€), lo que puede afectar a la liquidez y a la continuidad." : aum > 1500 ? "Tiene un patrimonio de la clase muy grande (" + nf(aum, 0) + " M€), lo que da estabilidad pero puede limitar la agilidad." : "Patrimonio de la clase de " + nf(aum, 0) + " M€.");
    if (f.t === "rv") {
      if (isNum(f.top10)) s.push(f.top10 > 45 ? "Cartera concentrada: las 10 mayores posiciones pesan el " + nf(f.top10, 0) + "%" + (isNum(f.nEq) ? " en " + nf(f.nEq, 0) + " valores." : ".") : "Cartera diversificada: las 10 mayores posiciones suman el " + nf(f.top10, 0) + "%" + (isNum(f.nEq) ? " en " + nf(f.nEq, 0) + " valores." : "."));
      if (f.reg && f.reg[1] > 55) s.push("Sesgo geográfico a " + f.reg[0] + " (" + nf(f.reg[1], 0) + "%).");
      if (f.sec && f.sec[1] > 30) s.push("Sesgo sectorial a " + f.sec[0].toLowerCase() + " (" + nf(f.sec[1], 0) + "%).");
      if (f.cap && isNum(f.cap[2]) && f.cap[2] + (f.cap[3] || 0) + (f.cap[4] || 0) > 40) s.push("Peso relevante en medianas y pequeñas compañías, con más riesgo y menos liquidez.");
    } else {
      if (isNum(f.dur)) s.push("Duración de " + nf(f.dur, 2) + " años" + (f.dur >= 5 ? ", sensible a los tipos de interés." : f.dur <= 2 ? ", poco sensible a los tipos." : "."));
      if (f.cal) s.push(/^(AAA|AA|A|BBB)$/.test(f.cal) ? "Calidad crediticia media " + f.cal + " (grado de inversión)." : "Calidad crediticia media " + f.cal + ", por debajo de grado de inversión: asume más riesgo de crédito.");
    }
    if (isNum(f.alpha)) s.push(f.alpha >= 2 ? "Gestión que ha aportado valor: alpha de " + nf(f.alpha, 1) + "% sobre su índice a 3 años." : f.alpha <= -1 ? "Ha restado valor frente a su índice a 3 años (alpha de " + nf(f.alpha, 1) + "%)." : "Rinde en línea con su índice a 3 años (alpha de " + nf(f.alpha, 1) + "%).");
    if (isNum(f.r2)) s.push(f.r2 >= 95 ? "Replica casi mecánicamente a su índice (R² de " + nf(f.r2, 0) + "), con poca gestión activa." : f.r2 < 75 ? "Se aparta bastante de su índice (R² de " + nf(f.r2, 0) + "), lo que indica gestión activa y diferenciada." : "");
    if (isNum(f.sharpe[1])) s.push(f.sharpe[1] >= 1 ? "Buena relación rentabilidad riesgo a 3 años (Sharpe " + dec(f.sharpe[1]) + ")." : f.sharpe[1] < 0.3 ? "Relación rentabilidad riesgo débil a 3 años (Sharpe " + dec(f.sharpe[1]) + ")." : "Relación rentabilidad riesgo aceptable a 3 años (Sharpe " + dec(f.sharpe[1]) + ").");
    if (isNum(f.dd && f.dd[4])) s.push("Caída máxima histórica de " + pct(f.dd[4], false, 1) + (isNum(f.pos && f.pos[0]) ? " y " + nf(f.pos[0], 0) + "% de meses positivos en el último año." : "."));
    if (isNum(f.skew && f.skew[0]) && f.skew[0] < -1) s.push("Distribución con colas negativas marcadas: los meses malos pueden ser peores de lo que sugiere la volatilidad.");
    s.push("Ocupa el puesto " + ps[0] + " de " + ps[1] + " en su categoría por puntuación Morningstar" + (f.stars ? " y tiene " + f.stars + " estrellas." : "."));
    return s.filter(Boolean).join(" ");
  }
  function gcComments(info) {
    var h = '<section class="block" style="margin-top:22px"><h3>Comentario sobre la gestión de cada fondo</h3>';
    info.forEach(function (o) {
      var f = o.f;
      h += '<div class="fcm"><p class="fcm-h"><b>' + esc(o.l.name) + "</b>" + (f ? " · " + esc(f.g) : "") + "</p>";
      if (!f) { h += '<p class="muted">Fondo fuera de la web: no hay datos para valorar su gestión.</p></div>'; return; }
      h += "<p>" + esc(fundComment(f)) + "</p>";
      var cm = (window.COMMENTS && window.COMMENTS[f.id]) || [];
      if (cm.length) h += '<p class="fcm-g"><b>Último comentario de la gestora (' + esc(cm[0].d || "") + "):</b> " + esc(cm[0].t || "") + "</p>";
      h += "</div>";
    });
    return h + '<p class="note">Valoración automática a partir de los datos de Morningstar de cada fondo. No recoge la opinión de la gestora salvo que se haya cargado en la ficha del fondo, ni sustituye el análisis del equipo gestor.</p></section>';
  }

  // ---------- traspasos, pruebas de estrés y referencia ----------
  function navOf(f) { return numOf(String(f.nav == null ? "" : f.nav).replace(/[A-Za-z\s]/g, "")); }
  function gcEff(l) {
    var f = l.id ? byId(l.id) : null, nav = f ? navOf(f) : null;
    return f && nav && l.part > 0 ? l.part * nav : (l.amt > 0 ? l.amt : 0);
  }
  function gcTransfers(L, prop, tot) {
    var tgt = {}, curById = {}, sells = [], buys = [], rows = [];
    prop.lines.forEach(function (x) { tgt[x.id] = tot * x.w / 100; });
    L.forEach(function (l) { if (l.id) curById[l.id] = l.amt; });
    L.forEach(function (l) {
      var target = l.id && tgt[l.id] ? tgt[l.id] : 0, diff = l.amt - target;
      if (diff > 1) sells.push({ name: l.name, nav: l.nav, units: l.units, amt: diff, left: diff, all: target === 0 });
    });
    prop.lines.forEach(function (x) { var need = tgt[x.id] - (curById[x.id] || 0); if (need > 1) buys.push({ name: byId(x.id).n, need: need, left: need }); });
    var ts = sells.reduce(function (s, x) { return s + x.amt; }, 0), tb = buys.reduce(function (s, x) { return s + x.need; }, 0);
    if (tb > 0 && ts > 0) buys.forEach(function (b) { b.left = b.need * ts / tb; });
    sells.sort(function (a, b) { return b.amt - a.amt; }); buys.sort(function (a, b) { return b.left - a.left; });
    sells.forEach(function (s) {
      var ul = s.all ? s.units : (s.nav ? s.amt / s.nav : null), j = 0, first = rows.length;
      if (ul !== null && ul !== undefined) ul = Math.round(ul * 10000) / 10000; else ul = null;
      while (s.left > 1 && j < buys.length) {
        var b = buys[j];
        if (b.left <= 1) { j++; continue; }
        var take = Math.min(s.left, b.left), last = s.left - take <= 1, u = null;
        if (ul !== null) { u = last ? ul : Math.round(take / s.nav * 100) / 100; ul = Math.round((ul - u) * 10000) / 10000; }
        rows.push({ from: s.name, units: u, amt: take, to: b.name, kind: s.all ? (last ? (rows.length === first ? "Total" : "Total (resto)") : "Parcial") : "Parcial" });
        b.left -= take; s.left -= take;
      }
    });
    return rows;
  }
  function gcTransfersHtml(L, prop, tot) {
    var rows = gcTransfers(L, prop, tot), moved = rows.reduce(function (s, r) { return s + r.amt; }, 0);
    var h = '<h2 class="gh">5. Traspasos necesarios</h2><section class="block">';
    if (!rows.length) return h + '<p>La cartera actual ya coincide con la propuesta: no hacen falta traspasos.</p></section>';
    h += '<div class="table-wrap"><table><thead><tr><th scope="col">Nº</th><th scope="col">Traspasar desde</th><th scope="col">Participaciones</th><th scope="col">Importe aprox.</th><th scope="col">Hacia</th><th scope="col">Tipo</th></tr></thead><tbody>' +
      rows.map(function (r, i) { return "<tr><td>" + (i + 1) + '</td><td class="fund"><b>' + esc(r.from) + '</b></td><td class="num">' + (r.units === null ? "n.d." : nf(r.units, r.units % 1 ? 2 : 0)) + '</td><td class="num">' + nf(r.amt, 0) + ' €</td><td class="fund"><b>' + esc(r.to) + "</b></td><td>" + r.kind + "</td></tr>"; }).join("") +
      '</tbody><tfoot><tr><td></td><td><b>Total movido</b></td><td></td><td class="num">' + nf(moved, 0) + " €</td><td>" + nf(tot ? moved / tot * 100 : 0, 0) + "% de la cartera</td><td></td></tr></tfoot></table></div>" +
      '<p class="note">Los traspasos se indican por participaciones, y por la totalidad de las participaciones cuando se sale del fondo, para que las operaciones cuadren. Los importes son aproximados al último valor liquidativo disponible; la ejecución se hace al valor liquidativo del día de la operación, así que conviene recalcular el día antes. Pendiente de revisar con el cliente: si cada traspaso mantiene el diferimiento fiscal (sobre todo en fondos extranjeros), comisiones de reembolso, importes mínimos y plusvalías latentes. "n.d." indica que falta el valor liquidativo o las participaciones del fondo.</p></section>';
    return h;
  }

  function refAvg(pr, get) {
    var s = 0, c = 0;
    BUCKETS.forEach(function (b) {
      var w = pr.w[b.k]; if (!w) return;
      var v = FUNDS.filter(function (f) { return !f.idx && bucketOf(f) === b.k; }).map(get).filter(isNum);
      if (v.length) { s += w * v.reduce(function (a, x) { return a + x; }, 0) / v.length; c += w; }
    });
    return c ? s / c : null;
  }
  var SCEN = [
    { k: "bolsa", n: "Caída de las bolsas", d: "Renta variable −20%, high yield −6%, renta fija corporativa −2%, alternativos −5%", s: { rv: -20, hy: -6, corp: -2, corto: 0, alt: -5 } },
    { k: "credito", n: "Crisis de crédito", d: "Renta variable −15%, high yield −10%, corporativa −5%, corto plazo −1%, alternativos −6%", s: { rv: -15, hy: -10, corp: -5, corto: -1, alt: -6 } },
    { k: "tipos", n: "Subida de tipos de 1 punto", d: "Renta fija: pérdida igual a su duración por 1%; renta variable −3%; alternativos −2%", s: {} },
    { k: "rally", n: "Rally bursátil", d: "Renta variable +15%, high yield +4%, corporativa +1%, corto plazo +0,3%, alternativos +3%", s: { rv: 15, hy: 4, corp: 1, corto: 0.3, alt: 3 } }
  ];
  function shockOf(l, sc) {
    var f = l.id ? byId(l.id) : null, k = l.bucket, isRv = RVB.indexOf(k) !== -1;
    if (sc.k === "tipos") { if (isRv) return -3; if (k === "alt") return -2; return -(f && isNum(f.dur) ? f.dur : (k === "corto" ? 1 : 3)); }
    var t = isRv ? "rv" : k; return sc.s[t] !== undefined ? sc.s[t] : 0;
  }
  function scenImpact(lines, sc) { return lines.reduce(function (s, l) { return s + l.w * shockOf(l, sc) / 100; }, 0); }
  function portYear(lines, y) {
    var s = 0, c = 0, tw = 0;
    lines.forEach(function (l) { tw += l.w; var f = l.id ? byId(l.id) : null, r = f ? annOf(f, y) : null; if (r !== null) { s += l.w * r; c += l.w; } });
    return tw && c / tw >= 0.8 ? s / c : null;
  }
  function gcStressHtml(L, prop, tot, pr) {
    var PL = prop.lines.map(function (x) { return { id: x.id, w: x.w, bucket: bucketOf(byId(x.id)) }; });
    var h = '<h2 class="gh">6. Pruebas de estrés y comparación con la referencia</h2><div class="grid2"><section class="block"><h3>Rentabilidad por año</h3><div class="table-wrap"><table><thead><tr><th scope="col">Año</th><th scope="col">Actual</th><th scope="col">Propuesta</th><th scope="col">Referencia</th></tr></thead><tbody>';
    YEARS.slice().reverse().forEach(function (y) {
      var a = portYear(L, y), b = portYear(PL, y), r = refAvg(pr, function (f) { return annOf(f, y); });
      if (a === null && b === null) return;
      h += "<tr><td>" + esc(yearLabel(y)) + "</td><td>" + (a === null ? "–" : ret(a)) + "</td><td>" + (b === null ? "–" : "<b>" + ret(b) + "</b>") + "</td><td>" + (r === null ? "–" : ret(r)) + "</td></tr>";
    });
    h += '</tbody></table></div><p class="note">Con las rentabilidades anuales de cada fondo y los pesos actuales o propuestos de hoy (no son rentabilidades reales de la cartera, que habría cambiado de pesos). Solo se muestran los años con datos para al menos el 80% del peso.</p></section>';
    var k = function (lines, get) { return wAvg({ lines: lines }, get).v; };
    var cmp = [["Rentabilidad del año", function (f) { return f.ret.ytd; }, 1], ["Rentabilidad 1 año", function (f) { return f.ret.y1; }, 1], ["Rentabilidad 3 años", function (f) { return f.ret.y3; }, 1], ["Volatilidad 1 año", function (f) { return f.vol[0]; }, 0], ["Sharpe 1 año", function (f) { return f.sharpe[0]; }, 2], ["Caída máxima (aprox., prudente)", function (f) { return f.dd[4]; }, 0]];
    h += '<section class="block"><h3>Frente a la cartera de referencia del perfil ' + pr.n.toLowerCase() + '</h3><div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Actual</th><th scope="col">Propuesta</th><th scope="col">Referencia</th></tr></thead><tbody>' +
      cmp.map(function (c) {
        var fmt = function (v) { return v === null ? "–" : c[2] === 1 ? ret(v) : c[2] === 2 ? dec(v) : pct(v, false, 1); };
        return "<tr><td>" + c[0] + "</td><td>" + fmt(k(L, c[1])) + "</td><td><b>" + fmt(k(PL, c[1])) + "</b></td><td>" + fmt(refAvg(pr, c[1])) + "</td></tr>";
      }).join("") + '</tbody></table></div><p class="note">La referencia es el reparto central del perfil aplicado a la media de los fondos no indexados de cada categoría de inversión de tu universo. No es un índice de mercado. La caída máxima ponderada es una cota prudente: la de la cartera real suele ser menor.</p></section></div>';
    h += '<section class="block" style="margin-top:22px"><h3>Escenarios de estrés ilustrativos</h3><div class="table-wrap"><table><thead><tr><th scope="col">Escenario</th><th scope="col">Actual</th><th scope="col">Propuesta</th></tr></thead><tbody>' +
      SCEN.map(function (sc) {
        var a = scenImpact(L, sc), b = scenImpact(PL, sc);
        var f2 = function (v) { return ret(v) + (tot ? ' <small>' + (v >= 0 ? "+" : "−") + nf(Math.abs(tot * v / 100), 0) + " €</small>" : ""); };
        return '<tr><td class="fund"><b>' + sc.n + "</b><small>" + esc(sc.d) + "</small></td><td>" + f2(a) + "</td><td><b>" + f2(b) + "</b></td></tr>";
      }).join("") + '</tbody></table></div><p class="note">Los escenarios son ilustrativos y parten de supuestos propios, por categoría de inversión y, en renta fija, por la duración de cada fondo. No son previsiones ni tienen en cuenta correlaciones ni gestión activa.</p></section>';
    return h;
  }

  function gcAnalyze() {
    var L = gcLines(), tot = gcTotal(), pr = BPROF[gc.profile], p = { lines: L };
    if (!L.length) return '<p class="muted" style="margin-top:22px">Añade los fondos de la cartera actual con su importe para ver el análisis.</p>';
    var n = L.length, info = gcInfo(L), prop = gcPropose(info, pr, tot);
    function kp(lines) {
      var q = { lines: lines }, g = function (fn) { return wAvg(q, fn).v; };
      return { y: g(function (f) { return f.ret.ytd; }), y1: g(function (f) { return f.ret.y1; }), y3: g(function (f) { return f.ret.y3; }), v: g(function (f) { return f.vol[0]; }), s: g(function (f) { return f.sharpe[0]; }), sc: g(function (f) { return f.score && f.score[3]; }) };
    }
    var a = kp(L), b = kp(prop.lines), cov = wAvg(p, function (f) { return f.ret.ytd; }).cov;
    var bw = {}; L.forEach(function (l) { bw[l.bucket] = (bw[l.bucket] || 0) + l.w; });
    var rvw = RVB.reduce(function (s, k) { return s + (bw[k] || 0); }, 0);
    var pw = L.map(function (l) { return l.w / 100; }), hhi = pw.reduce(function (s, x) { return s + x * x; }, 0), eff = 1 / hhi;
    var gw = {}; L.forEach(function (l) { var f = l.id ? byId(l.id) : null; if (f) gw[f.g] = (gw[f.g] || 0) + l.w; });
    var gtop = Object.keys(gw).sort(function (x, y) { return gw[y] - gw[x]; })[0];
    var sorted = L.slice().sort(function (x, y) { return y.w - x.w; }), top3 = sorted.slice(0, 3).reduce(function (s, l) { return s + l.w; }, 0);
    var noData = L.filter(function (l) { return !l.id; }), idxs = info.filter(function (o) { return o.f && o.f.idx; });
    var mf = maxFunds(tot), implied = rvw < 30 ? "conservador" : rvw <= 60 ? "moderado" : "dinámico";
    var volCap = { conservador: 6, moderado: 11, dinamico: 16 }[gc.profile];

    var h = '<div class="kpis" style="margin-top:26px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' + kpi("Importe total", nf(tot, 0) + " €", true) + kpi("Rentabilidad del año", ret(a.y), true) + kpi("Rentabilidad 1 año", ret(a.y1)) + kpi("Volatilidad 1 año", pct(a.v, false, 1)) + kpi("Sharpe 1 año", dec(a.s)) + "</div>" +
      '<p class="note">Medias ponderadas con datos de Morningstar' + (cov < 0.999 ? " (" + nf(cov * 100, 0) + "% del importe tiene datos)" : "") + ". La volatilidad no tiene en cuenta las correlaciones. Rentabilidad pasada, no garantiza resultados futuros.</p>";

    // por categoría de inversión
    h += '<h2 class="gh">1. Análisis cuantitativo</h2><div class="grid2"><section class="block"><h3>Reparto frente a la horquilla del perfil ' + pr.n.toLowerCase() + "</h3><div class=\"table-wrap\"><table><thead><tr><th scope=\"col\">Categoría</th><th scope=\"col\">Actual</th><th scope=\"col\">Horquilla</th><th scope=\"col\">Estado</th></tr></thead><tbody>" +
      BUCKETS.map(function (bk) {
        var w = bw[bk.k] || 0, r = pr.r[bk.k], st = w < r[0] - 0.05 ? ["Por debajo", "out"] : w > r[1] + 0.05 ? ["Por encima", "out"] : ["Dentro", "in"];
        return "<tr><td>" + esc(bk.n) + '</td><td class="num">' + nf(w, 1) + '%</td><td class="num">' + r[0] + " a " + r[1] + '%</td><td><span class="bst ' + st[1] + '">' + st[0] + "</span></td></tr>";
      }).join("") + "</tbody></table></div></section>";
    var mix = [0, 1, 2, 3].map(function (i) { return wAvg(p, function (f) { return f.mix[i]; }).v; }), labels = ["Acciones", "Bonos", "Efectivo", "Otros"], colors = ["#851a2e", "#3b3b3b", "#b9b9b9", "#f0c9b0"];
    var posm = mix.reduce(function (s, x) { return s + (isNum(x) && x > 0 ? x : 0); }, 0) || 1;
    h += '<section class="block"><h3>Composición real de la cartera</h3><div class="stack">' + mix.map(function (x, i) { return isNum(x) && x > 0 ? '<i style="width:' + (x / posm * 100).toFixed(2) + "%;background:" + colors[i] + '"></i>' : ""; }).join("") +
      '</div><div class="keys">' + mix.map(function (x, i) { return isNum(x) && Math.abs(x) >= 0.05 ? '<span style="--c:' + colors[i] + '">' + labels[i] + " <b>" + pct(x, false, 1) + "</b></span>" : ""; }).join("") + "</div>" +
      '<dl class="facts" style="margin-top:16px">' + fact("Renta variable (categorías)", nf(rvw, 1) + "%") + fact("Número de fondos", String(n)) + fact("Fondos efectivos (concentración)", nf(eff, 1)) + fact("Mayor posición", esc(sorted[0].name) + " (" + nf(sorted[0].w, 1) + "%)") + fact("Tres mayores posiciones", nf(top3, 1) + "%") + (gtop ? fact("Gestora principal", esc(gtop) + " (" + nf(gw[gtop], 1) + "%)") : "") + "</dl></section></div>";

    // por fondo
    h += '<section class="block" style="margin-top:22px"><h3>Análisis por fondo</h3><div class="table-wrap"><table><thead><tr><th scope="col">Fondo</th><th scope="col">Peso</th><th scope="col">Año</th><th scope="col">1 año</th><th scope="col">3 años</th><th scope="col">Vol. 1 a.</th><th scope="col">Sharpe 1 a.</th><th scope="col">Rating</th><th scope="col">Puesto en su categoría</th><th scope="col">Valoración</th></tr></thead><tbody>' +
      info.map(function (o) {
        var f = o.f, cls2 = o.v === "Mantener" ? "keep" : o.v === "Revisar" ? "rev" : "sub", ps = f ? posInCat(f) : null;
        return '<tr><td class="fund"><b>' + esc(o.l.name) + (f && f.idx ? '<span class="tag">Indexado</span>' : "") + "</b><small>" + (f ? esc(f.g) + " · " + esc(f.c) : "Fuera de la web · " + esc(bname(o.k))) + '</small></td><td class="num">' + nf(o.l.w, 1) + "%</td>" +
          (f ? "<td>" + ret(f.ret.ytd) + "</td><td>" + ret(f.ret.y1) + "</td><td>" + ret(f.ret.y3) + '</td><td class="num">' + pct(f.vol[0], false, 1) + '</td><td class="num">' + dec(f.sharpe[0]) + "</td><td>" + (f.stars ? stars(f.stars) : "–") + '</td><td class="num">' + ps[0] + " de " + ps[1] + "</td>" : '<td colspan="7" class="muted">Sin datos</td>') +
          '<td><span class="vd ' + cls2 + '">' + o.v + "</span><small>" + esc(o.why) + "</small></td></tr>";
      }).join("") + "</tbody></table></div></section>";

    var cr = gcCorr(L);
    h += cr.html;
    // cualitativo
    var good = [], bad = [];
    var ok = BUCKETS.filter(function (bk) { var w = bw[bk.k] || 0, r = pr.r[bk.k]; return w >= r[0] - 0.05 && w <= r[1] + 0.05; }).length;
    (implied === gc.profile ? good : bad).push(implied === gc.profile ? "La proporción de renta variable (" + nf(rvw, 0) + "%) es coherente con un perfil " + pr.n.toLowerCase() + "." : "La cartera tiene un " + nf(rvw, 0) + "% en renta variable, más propia de un perfil " + implied + " que del " + pr.n.toLowerCase() + " elegido.");
    (ok === BUCKETS.length ? good : bad).push(ok === BUCKETS.length ? "Todas las categorías de inversión están dentro de la horquilla del perfil." : ok + " de " + BUCKETS.length + " categorías están dentro de la horquilla del perfil; el resto está desajustado.");
    (eff >= n * 0.7 ? good : bad).push(eff >= n * 0.7 ? "El peso está bien repartido entre los fondos (equivalen a " + nf(eff, 1) + " fondos de igual peso)." : "El peso está concentrado: " + n + " fondos que equivalen a " + nf(eff, 1) + " de igual peso, y las tres mayores posiciones suman " + nf(top3, 0) + "%.");
    if (gtop && gw[gtop] > 40) bad.push("Dependencia alta de una gestora: " + gtop + " representa el " + nf(gw[gtop], 0) + "% de la cartera.");
    if (isNum(a.v)) (a.v <= volCap ? good : bad).push(a.v <= volCap ? "La volatilidad aproximada (" + pct(a.v, false, 1) + ") es razonable para el perfil." : "La volatilidad aproximada (" + pct(a.v, false, 1) + ") es alta para un perfil " + pr.n.toLowerCase() + ".");
    var good4 = info.filter(function (o) { return o.f && o.f.stars >= 4; }).reduce(function (s, o) { return s + o.l.w; }, 0);
    (good4 >= 60 ? good : bad).push("El " + nf(good4, 0) + "% del importe está en fondos con 4 o 5 estrellas Morningstar" + (good4 >= 60 ? "." : ", por debajo de lo deseable."));
    if (idxs.length) bad.push("Incluye fondos indexados (" + idxs.map(function (o) { return o.l.name; }).join(", ") + "), que no entran en la selección de fondos que haces con tus clientes.");
    if (noData.length) bad.push(noData.length + (noData.length === 1 ? " fondo no está" : " fondos no están") + " en la web, así que no se pueden medir.");
    if (mf && mf.n !== null && n > mf.n) bad.push("Tiene " + n + " fondos para " + nf(tot, 0) + " €, por encima del máximo de " + mf.n + ".");
    if (cr.high.length) bad.push("Hay " + cr.high.length + (cr.high.length === 1 ? " par" : " pares") + " de fondos muy correlacionados (0,85 o más), que diversifican poco entre sí.");
    h += '<h2 class="gh">2. Análisis cualitativo</h2><div class="grid2"><section class="block"><h3>Puntos fuertes</h3><ul class="checks">' + (good.length ? good.map(function (s) { return '<li class="ok"><i></i><span>' + esc(s) + "</span></li>"; }).join("") : '<li class="info"><i></i><span>No se han detectado puntos fuertes claros.</span></li>') +
      '</ul></section><section class="block"><h3>Puntos débiles</h3><ul class="checks">' + (bad.length ? bad.map(function (s) { return '<li class="warn"><i></i><span>' + esc(s) + "</span></li>"; }).join("") : '<li class="ok"><i></i><span>No se han detectado puntos débiles.</span></li>') + "</ul></section></div>" + gcComments(info);

    // mejoras
    var acts = [];
    info.forEach(function (o) {
      if (o.v === "Sustituir" && o.alt) {
        var al = o.alt, f = o.f;
        acts.push("Sustituir " + o.l.name + " por " + al.n + " (" + al.g + "). " + (f ? "Puntuación Morningstar " + dec(f.score && f.score[3]) + " frente a " + dec(al.score && al.score[3]) + ", Sharpe 1 año " + dec(f.sharpe[0]) + " frente a " + dec(al.sharpe[0]) + ", 1 año " + pct(f.ret.y1, true, 1) + " frente a " + pct(al.ret.y1, true, 1) + "." : "Es el fondo mejor puntuado de " + bname(o.k) + "."));
      } else if (o.v === "Sustituir") acts.push(o.l.name + ": " + o.why.toLowerCase() + " y no hay alternativa disponible en su categoría.");
      else if (o.v === "Revisar") acts.push("Revisar " + o.l.name + ": " + o.why.toLowerCase() + ".");
    });
    BUCKETS.forEach(function (bk) {
      var c = bw[bk.k] || 0, t2 = prop.targets[bk.k] || 0;
      if (Math.abs(t2 - c) >= 1) acts.push((t2 > c ? "Aumentar " : "Reducir ") + bk.n + " del " + nf(c, 0) + "% al " + nf(t2, 0) + "% (horquilla " + pr.r[bk.k][0] + " a " + pr.r[bk.k][1] + "%).");
    });
    if (mf && mf.n !== null && n > mf.n) acts.push("Reducir el número de fondos de " + n + " a " + mf.n + " como máximo.");
    h += '<h2 class="gh">3. Mejoras propuestas</h2><section class="block"><ol class="acts">' + (acts.length ? acts.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") : "<li>La cartera está bien construida para el perfil; no se proponen cambios.</li>") + "</ol></section>";

    // cartera propuesta
    var pn = prop.lines.length, cmpRows = [["Rentabilidad del año", ret(a.y), ret(b.y)], ["Rentabilidad 1 año", ret(a.y1), ret(b.y1)], ["Rentabilidad 3 años", ret(a.y3), ret(b.y3)], ["Volatilidad 1 año", pct(a.v, false, 1), pct(b.v, false, 1)], ["Sharpe 1 año", dec(a.s), dec(b.s)], ["Puntuación Morningstar media", dec(a.sc), dec(b.sc)], ["Número de fondos", String(n), String(pn)]];
    var gone = info.filter(function (o) { return o.v === "Sustituir" && o.alt; }).map(function (o) { return o.l.name; });
    h += '<h2 class="gh">4. Cartera propuesta</h2><div class="grid2"><section class="block"><h3>Composición propuesta</h3><div class="table-wrap"><table><thead><tr><th scope="col">Fondo</th><th scope="col">Peso</th><th scope="col">Importe</th></tr></thead><tbody>' +
      prop.lines.map(function (x) { var f = byId(x.id); return '<tr><td class="fund"><a href="#/fondo/' + encodeURIComponent(f.id) + '"><b>' + esc(f.n) + "</b></a><small>" + esc(f.g) + " · " + esc(bname(bucketOf(f))) + (x.notes.length ? " · " + esc(x.notes.join("; ")) : "") + '</small></td><td class="num">' + nf(x.w, 1) + '%</td><td class="num">' + (tot ? nf(tot * x.w / 100, 0) + " €" : "–") + "</td></tr>"; }).join("") +
      '</tbody></table></div></section><section class="block"><h3>Antes y después</h3><div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Actual</th><th scope="col">Propuesta</th></tr></thead><tbody>' +
      cmpRows.map(function (r) { return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td><b>" + r[2] + "</b></td></tr>"; }).join("") + '</tbody></table></div><p class="note">Los cambios se hacen manteniendo el peso de cada categoría dentro de la horquilla del perfil y sustituyendo solo los fondos marcados. Para el traspaso, calcula las participaciones por fondo.</p></section></div>' +
      '<div class="row tools2"><button type="button" class="btn" id="gcsave">Guardar propuesta en mis carteras</button><button type="button" class="btn ghost" id="gcmail">Correo</button><button type="button" class="btn ghost" id="gcprint">Descargar informe en PDF</button></div>' +
      '<p class="note">Análisis automático y orientativo con datos de Morningstar y reglas propias. Antes de proponer nada al cliente hay que revisar su idoneidad, su horizonte y su fiscalidad, y las plusvalías latentes que genere cada traspaso.</p>';
    h += gcTransfersHtml(L, prop, tot) + gcStressHtml(L, prop, tot, pr);
    gcLast = { prop: prop, tot: tot, acts: acts, cmp: cmpRows.map(function (r) { return [r[0], String(r[1]).replace(/<[^>]*>/g, ""), String(r[2]).replace(/<[^>]*>/g, "")]; }) };
    return h;
  }
  var gcLast = null;

  function viewGestion() {
    setTitle("Gestión de carteras");
    var h = '<div id="printhead" class="printhead"></div><div class="topbar"><a href="#/">← Inicio</a></div><h1>Gestión de carteras</h1>' +
      '<p class="sub">Introduce la cartera actual del cliente con el importe de cada fondo. La web hace un análisis cuantitativo y cualitativo y propone mejoras sobre los fondos del universo. Los datos de la cartera solo viven en este navegador mientras la página esté abierta y no se guardan en ningún sitio.</p>' +
      '<div class="bhead"><label class="fld"><span class="muted">Nombre de la cartera</span><input class="inp" id="gname" maxlength="80" placeholder="Por ejemplo, Cartera actual" value="' + esc(gc.name) + '"></label>' +
      '<div class="fld"><span class="muted">Perfil del cliente</span><div class="seg" role="group" aria-label="Perfil">' + Object.keys(BPROF).map(function (k) { return '<button type="button" data-gp="' + k + '" aria-pressed="' + (gc.profile === k) + '">' + BPROF[k].n + "</button>"; }).join("") + "</div></div></div>" +
      '<div class="search tight">' + icon() + '<input id="gq" type="search" autocomplete="off" placeholder="Añadir fondo de la cartera por nombre o ISIN" aria-label="Añadir fondo"></div><div class="results" id="gres"></div>' +
      '<details class="manual"><summary>El fondo no está en la web</summary><div class="row" style="margin-top:10px"><input class="inp grow" id="mname" placeholder="Nombre del fondo" maxlength="80"><select class="inp" id="mb">' + BUCKETS.map(function (b) { return '<option value="' + b.k + '">' + esc(b.n) + "</option>"; }).join("") + '</select><button type="button" class="btn ghost" id="madd">Añadir</button></div></details>' +
      '<div id="gtable"></div><div id="gout" class="gest"></div>';
    app.innerHTML = h + footer("rv");

    function drawTable() {
      var el = document.getElementById("gtable");
      if (!gc.lines.length) { el.innerHTML = ""; return; }
      el.innerHTML = '<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th scope="col">Fondo</th><th scope="col">Participaciones</th><th scope="col">Importe (€)</th><th scope="col">Peso</th><th scope="col"><span class="sr">Quitar</span></th></tr></thead><tbody>' +
        gc.lines.map(function (l, i) {
          var f = l.id ? byId(l.id) : null;
          return '<tr><td class="fund"><b>' + esc(f ? f.n : l.name) + "</b><small>" + (f ? esc(f.g) + " · " + esc(f.c) : "Fuera de la web · " + esc(bname(l.bucket))) + '</small></td><td><input class="inp amt" type="number" min="0" step="0.01" value="' + (l.part || "") + '" data-part="' + i + '"' + (f && navOf(f) ? "" : " disabled") + ' aria-label="Participaciones de ' + esc(f ? f.n : l.name) + '" placeholder="' + (f && navOf(f) ? "opcional" : "n.d.") + '"></td><td><input class="inp amt" type="number" min="0" step="100" value="' + (gcEff(l) ? Math.round(gcEff(l) * 100) / 100 : "") + '" data-amt="' + i + '" aria-label="Importe de ' + esc(f ? f.n : l.name) + '"></td><td class="num" data-pw="' + i + '"></td><td><button type="button" class="x" data-rm="' + i + '" aria-label="Quitar">×</button></td></tr>';
        }).join("") + '</tbody><tfoot><tr><td><b>Total</b></td><td></td><td class="num" id="gtot"></td><td></td><td></td></tr></tfoot></table></div>';
      el.querySelectorAll("[data-amt]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var v = parseNum(inp.value), i = inp.getAttribute("data-amt"), l = gc.lines[+i];
          l.amt = v !== null && v > 0 ? v : 0; l.part = null;
          var pi = el.querySelector('[data-part="' + i + '"]'); if (pi) pi.value = "";
          drawOut();
        });
      });
      el.querySelectorAll("[data-part]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var v = parseNum(inp.value), i = inp.getAttribute("data-part"), l = gc.lines[+i];
          l.part = v !== null && v > 0 ? v : null;
          if (l.part) { l.amt = Math.round(gcEff(l) * 100) / 100; var ai = el.querySelector('[data-amt="' + i + '"]'); if (ai) ai.value = l.amt; }
          drawOut();
        });
      });
      el.querySelectorAll("[data-rm]").forEach(function (b) { b.addEventListener("click", function () { gc.lines.splice(+b.getAttribute("data-rm"), 1); drawTable(); drawOut(); }); });
    }
    function drawOut() {
      var t = gcTotal();
      document.querySelectorAll("[data-pw]").forEach(function (c) { var l = gc.lines[+c.getAttribute("data-pw")]; c.textContent = t && gcEff(l) > 0 ? nf(gcEff(l) / t * 100, 1) + "%" : "–"; });
      var tt = document.getElementById("gtot"); if (tt) tt.textContent = nf(t, 0) + " €";
      document.getElementById("gout").innerHTML = gc.lines.length ? gcAnalyze() : "";
      var ph = document.getElementById("printhead");
      if (ph) ph.innerHTML = "<h1>Informe de análisis de cartera</h1><p><b>" + esc(gc.name || "Cartera del cliente") + "</b> · Perfil " + esc(BPROF[gc.profile].n.toLowerCase()) + " · " + new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) + " · Datos Morningstar a " + esc(META.rv || META.rf || "") + "</p>";
      var pb2 = document.getElementById("gcprint");
      if (pb2) pb2.addEventListener("click", function () { window.print(); });
      var mb2 = document.getElementById("gcmail");
      if (mb2) mb2.addEventListener("click", function () {
        if (!gcLast) return;
        var ex = "Mejoras propuestas:\n" + (gcLast.acts.length ? gcLast.acts.map(function (a, i) { return (i + 1) + ". " + a; }).join("\n") : "La cartera está bien construida para el perfil; no se proponen cambios.") +
          "\n\nAntes y después (actual frente a propuesta):\n" + gcLast.cmp.map(function (r) { return "• " + r[0] + ": " + r[1] + " frente a " + r[2]; }).join("\n");
        var m = pfMail((gc.name || "Cartera del cliente") + " (propuesta de revisión)", gcLast.tot || 0, gcLast.prop.lines.map(function (x) { return { id: x.id, w: x.w }; }), "Perfil " + BPROF[gc.profile].n.toLowerCase() + ".\n\n" + ex);
        mailModal(m);
      });
      var sv = document.getElementById("gcsave");
      if (sv) sv.addEventListener("click", function () {
        var c = cleanPf({ name: (gc.name || "Cartera") + " (propuesta)", amount: gcLast.tot || null, lines: gcLast.prop.lines.map(function (x) { return { id: x.id, w: x.w }; }) });
        PF.push(c); savePf(); location.hash = "#/cartera/" + encodeURIComponent(c.id);
      });
    }
    document.getElementById("gname").addEventListener("input", function (e) { gc.name = e.target.value.slice(0, 80); });
    app.querySelectorAll("[data-gp]").forEach(function (b) { b.addEventListener("click", function () { gc.profile = b.getAttribute("data-gp"); app.querySelectorAll("[data-gp]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); drawOut(); }); });
    var gq = document.getElementById("gq");
    gq.addEventListener("input", function () {
      var v = gq.value.trim(), res = document.getElementById("gres");
      if (!v) { res.innerHTML = ""; return; }
      res.innerHTML = pickList(v, gc.lines.map(function (l) { return l.id; }).filter(Boolean), function (f) { return '<a href="#" data-add="' + esc(f.id) + '">' + esc(f.n) + "<small>" + esc(f.g) + " · " + esc(f.c) + "</small></a>"; });
      res.querySelectorAll("[data-add]").forEach(function (a) {
        a.addEventListener("click", function (e) { e.preventDefault(); gc.lines.push({ id: a.getAttribute("data-add"), amt: 0 }); gq.value = ""; res.innerHTML = ""; drawTable(); drawOut(); });
      });
    });
    document.getElementById("madd").addEventListener("click", function () {
      var nm = document.getElementById("mname").value.trim();
      if (!nm) return;
      gc.lines.push({ id: null, name: nm.slice(0, 80), bucket: document.getElementById("mb").value, amt: 0 });
      document.getElementById("mname").value = ""; drawTable(); drawOut();
    });
    drawTable(); drawOut();
  }

  // ---------- acciones (fichas de MarketSurge) ----------
  var ST = { q: "", sort: "n", dir: 1 };
  var STCOLS = [["comp", "Composite"], ["eps", "EPS"], ["rs", "RS"], ["smr", "SMR"], ["ad", "A/D"], ["peg", "PEG"]];
  function stocks() { return window.STOCKS || []; }
  function stockBy(t) { return stocks().filter(function (s) { return s.t === t; })[0] || null; }
  function rcell(k, v) {
    if (v == null || v === "") return '<span class="muted">–</span>';
    if (k === "peg") return '<span class="num">' + dec(v) + "</span>";
    if (typeof v === "number") return '<span class="rt ' + (v >= 90 ? "r-hi" : v >= 80 ? "r-mid" : "r-lo") + '">' + v + "</span>";
    return '<span class="rt ' + (/^[AB]/.test(v) ? "r-hi" : /^C/.test(v) ? "r-mid" : "r-lo") + '">' + esc(v) + "</span>";
  }
  function stockLogo(s) {
    var slug = (s.n || s.t).toLowerCase().replace(/&/g, "and").replace(/\b(inc|corp|corporation|ltd|limited|plc|co|company|holdings?|group|sa|nv|ag|class [a-z])\b\.?/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    var src = s.logo || "https://s3-symbol-logo.tradingview.com/" + slug + "--big.svg", ini = esc((s.t || "?").slice(0, 2));
    var hue = 0; for (var i = 0; i < (s.t || "").length; i++) hue = (hue * 31 + s.t.charCodeAt(i)) % 360;
    return '<span class="slogo" style="--h:' + hue + '"><img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"><em>' + ini + "</em></span>";
  }
  function viewStocks() {
    setTitle("Stocks");
    var all = stocks();
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Stocks</h1>' +
      '<p class="sub">Fichas de acciones individuales con un bloque técnico para tu análisis y un bloque en lenguaje cliente. ' + (all.length ? all.length + (all.length === 1 ? " ficha." : " fichas.") : "") + "</p>";
    if (!all.length) {
      app.innerHTML = h + '<div class="empty box" style="margin-top:18px;padding:34px 20px">Todavía no hay fichas. Envíale a Claude las capturas o el Excel de MarketSurge y se añadirán aquí, con su bloque técnico, su bloque cliente y el PEG calculado.</div>' + footer("rv");
      return;
    }
    h += '<div class="filters"><div class="search tight" style="margin-top:0">' + icon() + '<input id="stq" type="search" autocomplete="off" placeholder="Buscar por ticker, nombre o grupo" value="' + esc(ST.q) + '" aria-label="Buscar acción"></div></div><div id="stbody"></div>';
    app.innerHTML = h + footer("rv");
    var q = document.getElementById("stq");
    q.addEventListener("input", function () { ST.q = q.value; draw(); });
    function draw() {
      var list = all.filter(function (s) { return matches({ n: s.n + " " + s.t, id: s.t, g: s.g || "", c: "" }, ST.q); });
      var get = ST.sort === "n" ? function (s) { return s.n; } : ST.sort === "g" ? function (s) { return s.g || ""; } : ST.sort === "f" ? function (s) { var m = /(\d+)\/(\d+)\/(\d+)/.exec(s.f || ""); return m ? +m[3] * 10000 + +m[2] * 100 + +m[1] : null; } : function (s) { return s[ST.sort]; };
      list = list.slice().sort(function (a, b) {
        var x = get(a), y = get(b), nx = x == null || x === "", ny = y == null || y === "";
        if (nx && ny) return 0; if (nx) return 1; if (ny) return -1;
        return typeof x === "string" ? ST.dir * x.localeCompare(y, "es") : ST.dir * (x - y);
      });
      function th(k, l) { var on = ST.sort === k; return '<th scope="col"' + (on ? ' aria-sort="' + (ST.dir > 0 ? "ascending" : "descending") + '"' : "") + '><button type="button" data-ss="' + k + '">' + l + (on ? (ST.dir > 0 ? " ↑" : " ↓") : "") + "</button></th>"; }
      var b = document.getElementById("stbody");
      b.innerHTML = list.length ? '<div class="table-wrap"><table><thead><tr>' + th("n", "Stock") + th("g", "Grupo industrial") + STCOLS.map(function (c) { return th(c[0], c[1]); }).join("") + th("f", "Ficha") + "</tr></thead><tbody>" +
        list.map(function (s) {
          return '<tr data-t="' + esc(s.t) + '" tabindex="0"><td class="fund">' + stockLogo(s) + '<span class="ftxt"><b>' + esc(s.t) + "</b><small>" + esc(s.n) + '</small></span></td><td class="muted">' + esc(s.g || "–") + "</td>" + STCOLS.map(function (c) { return "<td>" + rcell(c[0], s[c[0]]) + "</td>"; }).join("") + '<td class="muted">' + esc(s.f || "–") + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<div class="table-wrap"><div class="empty">Sin resultados</div></div>';
      b.querySelectorAll("[data-ss]").forEach(function (x) { x.addEventListener("click", function () { var k = x.getAttribute("data-ss"); if (ST.sort === k) ST.dir = -ST.dir; else { ST.sort = k; ST.dir = k === "n" || k === "g" ? 1 : -1; } draw(); }); });
      b.querySelectorAll("tbody tr").forEach(function (tr) { function go() { location.hash = "#/accion/" + encodeURIComponent(tr.getAttribute("data-t")); } tr.addEventListener("click", go); tr.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); }); });
    }
    draw();
  }
  function cotBlock(t) {
    var q = (window.COT || {})[t];
    if (!q || !q.h || q.h.length < 2) return "";
    var W = 760, H = 220, L = 44, R = 12, T = 14, B = 26, v = q.h.map(function (p) { return p[1]; });
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), sp = (hi - lo) || 1;
    var X = function (i) { return L + (W - L - R) * i / (v.length - 1); }, Y = function (x) { return T + (H - T - B) * (1 - (x - lo) / sp); };
    var line = v.map(function (x, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(x).toFixed(1); }).join(" ");
    var area = line + " L" + X(v.length - 1).toFixed(1) + " " + (H - B) + " L" + L + " " + (H - B) + " Z";
    var grid = [0, .5, 1].map(function (k) { var x = lo + sp * k, y = Y(x); return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#e3e8ee"/><text x="' + (L - 6) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="#777">' + nf(x, 0) + "</text>"; }).join("");
    var ms = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], last = "", xl = "";
    q.h.forEach(function (p, i) { var m = p[0].slice(0, 7); if (m !== last) { last = m; if (i && i < v.length - 2) xl += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="#777">' + ms[+p[0].slice(5, 7) - 1] + "</text>"; } });
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="Cotización de un año">' + grid +
      '<path d="' + area + '" fill="#2a5ca8" opacity=".10"/><path d="' + line + '" fill="none" stroke="#2a5ca8" stroke-width="2"/>' + xl +
      '<circle cx="' + X(v.length - 1).toFixed(1) + '" cy="' + Y(v[v.length - 1]).toFixed(1) + '" r="3.5" fill="#111"/></svg>';
    var d = q.d, cls = d > 0 ? "pos" : d < 0 ? "neg" : "";
    return '<section class="block" style="margin-top:22px"><h3>Cotización</h3><div class="kpis kp6">' +
      kpi("Último precio", dec(q.px)) + kpi("Variación del día", '<span class="' + cls + '">' + (d > 0 ? "+" : "") + nf(d, 2) + "%</span>") +
      kpi("Mínimo 52 semanas", dec(q.mn)) + kpi("Máximo 52 semanas", dec(q.mx)) + "</div>" +
      '<div style="margin-top:14px">' + svg + '</div><p class="note">Cierre del ' + esc(q.f) + ". Gráfico de un año con cierres semanales. Fuente: Interactive Brokers. Datos posiblemente diferidos.</p></section>";
  }

  function viewStock(t) {
    var s = stockBy(t);
    if (!s) { viewNotFound(); return; }
    setTitle(s.n);
    var h = '<div class="topbar"><a href="#/acciones">← Stocks</a></div><div class="fhead"><h1>' + stockLogo(s) + esc(s.n) + '</h1><p class="muted">' + esc(s.t) + (s.g ? " · " + esc(s.g) : "") + (s.px != null ? " · Precio " + dec(s.px) : "") + (s.f ? " · Ficha del " + esc(s.f) : "") + "</p></div>" +
      '<div class="kpis kp6">' + STCOLS.map(function (c) { return kpi(c[1], rcell(c[0], s[c[0]])); }).join("") + "</div>" +
      '<div class="grid2" style="margin-top:22px"><section class="block"><h3>Bloque técnico</h3>' +
      ((s.tec && s.tec.length) ? '<dl class="facts">' + s.tec.map(function (r) { return fact(r[0], esc(r[1])); }).join("") + "</dl>" : "") +
      (s.tecTxt ? '<p class="stxt">' + esc(s.tecTxt) + "</p>" : "") + (!(s.tec && s.tec.length) && !s.tecTxt ? '<p class="muted">Sin datos técnicos.</p>' : "") +
      '</section><section class="block"><h3>Bloque cliente</h3><p class="stxt">' + esc(s.cli || "Sin texto para el cliente.") + "</p></section></div>" +
      cotBlock(s.t) +
      (s.img ? '<section class="block" style="margin-top:22px"><h3>Captura de MarketSurge</h3><a href="' + esc(s.img) + '" target="_blank" rel="noopener"><img class="fichaimg" src="' + esc(s.img) + '" alt="Captura de MarketSurge de ' + esc(s.n) + '" loading="lazy"></a></section>' : "") +
      '<p class="note">Ficha elaborada a partir de los datos de MarketSurge (IBD) que has enviado. Información orientativa, no es una recomendación personalizada de inversión.</p>';
    app.innerHTML = h + footer("rv");
  }

  function viewAgenda() {
    setTitle("Agenda semanal");
    var A = window.AGENDA || { dias: [] };
    var lab = { sub: "Deuda", res: "Resultados", key: "Clave", mac: "Macro", bc: "Banco central" };
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Agenda semanal</h1>' +
      '<p class="sub">Semana del ' + esc(A.semana || "") + '. Actualizada el ' + esc(A.actualizado || "") + '.</p>';
    if (!A.dias.length) { app.innerHTML = h + '<div class="empty box" style="margin-top:18px;padding:34px 20px">Todavía no hay agenda.</div>' + footer("rv"); return; }
    A.dias.forEach(function (d) {
      h += '<div class="box" style="margin-top:14px;padding:16px 18px"><h2 style="margin:0 0 8px;font-size:1.05rem">' + esc(d.d) + '</h2>';
      d.e.forEach(function (x) {
        h += '<div class="agrow"><span class="agtag ag-' + esc(x[0]) + '">' + esc(lab[x[0]] || x[0]) + '</span><span>' + esc(x[1]) + '</span></div>';
      });
      h += '</div>';
    });
    if (A.clave) h += '<div class="box" style="margin-top:14px;padding:16px 18px"><h2 style="margin:0 0 6px;font-size:1.05rem">Qué puede mover las carteras</h2><p style="margin:0">' + esc(A.clave) + '</p></div>';
    if (A.pendiente) h += '<p class="sub" style="margin-top:12px">' + esc(A.pendiente) + '</p>';
    app.innerHTML = h + footer("rv");
  }

  // Sigmas: movimiento del periodo medido en desviaciones típicas del propio fondo
  var SIG_MIN = 2.5; // a partir de este valor absoluto se resalta
  var ESS = { k: "sw", dir: 1, t: "rv" };
  function sigNum(v) { var n = v == null || v === "" ? NaN : parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; }
  function sigBig(v) { var n = sigNum(v); return n !== null && Math.abs(n) >= SIG_MIN; }
  function sigTxt(n) { return (n > 0 ? "+" : "") + nf(n, 1); }
  function sigTag(v) {
    var n = sigNum(v);
    if (n === null) return '<span class="muted">–</span>';
    return '<span class="sig' + (sigBig(v) ? (n < 0 ? " dn" : " up") : "") + '">' + sigTxt(n) + "</span>";
  }
  // barra desde el cero, con las líneas del umbral a ambos lados
  function sigBar(v, max, label) {
    var n = sigNum(v), thr = (SIG_MIN / max * 50).toFixed(2);
    var bar = n === null ? "" : '<i class="' + (n < 0 ? "dn" : "up") + (sigBig(v) ? " big" : "") + '" style="width:' + (Math.min(Math.abs(n), max) / max * 50).toFixed(2) + '%"></i>';
    return '<div class="esm"><small>' + label + '</small><div class="estrack"><em style="left:' + (50 - thr) + '%"></em><em style="left:' + (50 + +thr) + '%"></em><s></s>' + bar + "</div>" + sigTag(v) + "</div>";
  }
  // Sigmas calculadas en vivo con los datos de la web: rentabilidad del periodo entre la volatilidad normal del fondo para ese periodo
  var ESP = [["d1", "Día", 252, "D"], ["w1", "Semana", 52, "S"], ["m1", "Mes", 12, "M"], ["m3", "3 meses", 4, "3M"]];
  function esPer(k) { for (var i = 0; i < ESP.length; i++) if (ESP[i][0] === k) return ESP[i]; return ESP[1]; }
  function esVol(f) { var v = f.vol && (isNum(f.vol[1]) ? f.vol[1] : f.vol[0]); return isNum(v) && v > 0 ? v : null; }
  function esSig(f, p) { var r = f.ret && f.ret[p[0]], v = esVol(f); return isNum(r) && v !== null ? r / (v / Math.sqrt(p[2])) : null; }
  function esMed(a) { a = a.filter(isNum).sort(function (x, y) { return x - y; }); var n = a.length; return !n ? null : n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; }
  function esRel(f, p) {
    var peers = FUNDS.filter(function (g) { return g.c === f.c && isNum(g.ret && g.ret[p[0]]); });
    if (peers.length < 3 || !isNum(f.ret[p[0]])) return null;
    return f.ret[p[0]] - esMed(peers.map(function (g) { return g.ret[p[0]]; }));
  }
  function esSg(n) { return n === null ? "–" : (n > 0 ? "+" : n < 0 ? "−" : "") + nf(Math.abs(n), 1); }
  function esPc(n) { return n === null || n === undefined ? "–" : (n > 0 ? "+" : n < 0 ? "−" : "") + nf(Math.abs(n), 1) + "%"; }
  function esLvl(n) { return n === null ? "" : Math.abs(n) >= SIG_MIN ? " l2" : Math.abs(n) >= 1.5 ? " l1" : ""; }
  function esLast() { var m = ""; FUNDS.forEach(function (f) { var d = String(f.nd || "").split("/").reverse().join(""); if (d > m) m = d; }); return m ? m.slice(6) + "/" + m.slice(4, 6) + "/" + m.slice(0, 4) : ""; }
  var ESS2 = { p: "w1", o: "dn", t: "rv" };
  function esDist(rows) {
    var v = rows.filter(function (x) { return x.s !== null; }).map(function (x) { return x.s; });
    if (!v.length) return "";
    var M = Math.max(SIG_MIN + 0.5, Math.ceil(Math.max.apply(null, v.map(Math.abs)) + 0.3)), W = 520, H = 74, px = function (n) { return 10 + (n + M) / (2 * M) * (W - 20); };
    var bins = {}, dots = v.slice().sort(function (a, b) { return a - b; }).map(function (n) { var k = Math.round(px(n) / 9); bins[k] = (bins[k] || 0) + 1; return '<circle cx="' + px(n).toFixed(1) + '" cy="' + (46 - (bins[k] - 1) * 8).toFixed(1) + '" r="3.6" fill="' + (n <= -SIG_MIN ? "#b3283d" : n >= SIG_MIN ? "#1f7a4d" : n < 0 ? "#c98a96" : "#8fb9a2") + '" fill-opacity=".9"/>'; }).join("");
    var tk = []; for (var t = -Math.floor(M); t <= Math.floor(M); t++) tk.push('<text x="' + px(t).toFixed(1) + '" y="70" text-anchor="middle" font-size="10" fill="#888">' + (t > 0 ? "+" : "") + t + "</text>");
    var md = esMed(v);
    return '<svg class="esdist" viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="Distribución de sigmas de los fondos">' +
      '<rect x="10" y="12" width="' + (px(-SIG_MIN) - 10).toFixed(1) + '" height="40" fill="#8a8490" fill-opacity=".08"/><rect x="' + px(SIG_MIN).toFixed(1) + '" y="12" width="' + (W - 10 - px(SIG_MIN)).toFixed(1) + '" height="40" fill="#8a8490" fill-opacity=".08"/>' +
      '<line x1="10" x2="' + (W - 10) + '" y1="52" y2="52" stroke="#d9d3d7"/><line x1="' + px(0) + '" x2="' + px(0) + '" y1="12" y2="52" stroke="#bbb" stroke-dasharray="3 3"/>' + dots +
      '<path d="M' + px(md).toFixed(1) + ' 8 l-4 -7 h8z" fill="#1c1c26"/>' + tk.join("") + "</svg>";
  }
  function viewEstado() {
    setTitle("Estado de fondos");
    var E = window.ESTADO || {}, P = esPer(ESS2.p), shown = FUNDS.filter(function (f) { return ESS2.t === "all" || f.t === ESS2.t; });
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Estado de fondos</h1>' +
      '<p class="sub">Cuánto se ha movido cada fondo frente a lo normal en él. Una sigma es su volatilidad habitual (a 3 años) ajustada al periodo; con ' + nf(SIG_MIN, 1) + " sigmas o más el movimiento es poco común. Datos con VL a " + esc(esLast()) + ".</p>";
    var rows = shown.map(function (f) { return { f: f, s: esSig(f, P), r: f.ret[P[0]], rel: esRel(f, P) }; });
    var tot = 0, dn = 0, up = 0;
    rows.forEach(function (x) { if (x.s === null) return; tot++; if (x.s <= -SIG_MIN) dn++; else if (x.s >= SIG_MIN) up++; });
    var med = esMed(rows.map(function (x) { return x.r; })), gen = tot && Math.max(dn, up) / tot >= 0.4;
    var ctx = !tot ? "" : gen
      ? "Movimiento generalizado: " + Math.max(dn, up) + " de " + tot + " fondos se mueven a la vez, así que la señal es de mercado. Para ver qué fondos se desvían de verdad, mira la columna «Frente a su categoría»."
      : (dn + up ? "Movimiento selectivo: solo " + (dn + up) + " de " + tot + " fondos se salen de lo normal, y merecen revisión individual." : "Sin movimientos fuera de lo normal en este periodo.");
    h += '<div class="es2t"><div class="es2pills" role="tablist">' + ESP.map(function (p) { return '<button type="button" class="es2p' + (p[0] === ESS2.p ? " on" : "") + '" data-p="' + p[0] + '">' + p[1] + "</button>"; }).join("") + "</div>" +
      '<label for="estipo">Tipo</label><select id="estipo" class="inp">' + [["rv", "Renta variable"], ["rf", "Renta fija"], ["all", "Todos"]].map(function (o) { return '<option value="' + o[0] + '"' + (ESS2.t === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>" +
      '<label for="esord">Ordenar</label><select id="esord" class="inp">' + [["dn", "Mayores caídas"], ["up", "Mayores subidas"], ["rel", "Más lejos de su categoría"], ["n", "Nombre"]].map(function (o) { return '<option value="' + o[0] + '"' + (ESS2.o === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>";
    function seg(c, k) { return k ? '<i class="' + c + '" style="flex:' + k + '"></i>' : ""; }
    h += '<div class="es2sum"><div class="es2k"><span>Mediana de los fondos</span><b class="' + (med < 0 ? "dn" : "up") + '">' + esPc(med) + "</b><em>" + P[1].toLowerCase() + "</em></div>" +
      '<div class="es2k"><span>Caídas poco comunes</span><b class="dn">' + dn + '</b><em>de ' + tot + " fondos</em></div>" +
      '<div class="es2k"><span>Subidas poco comunes</span><b class="up">' + up + '</b><em>de ' + tot + " fondos</em></div>" +
      '<div class="es2m">' + esDist(rows) + "<p>" + esc(ctx) + "</p></div></div>";
    var max = Math.max(SIG_MIN + 1, Math.ceil(Math.max.apply(null, [0].concat(rows.map(function (x) { return Math.abs(x.s || 0); })))));
    [["rv", "Renta variable"], ["rf", "Renta fija"]].filter(function (g) { return ESS2.t === "all" || ESS2.t === g[0]; }).forEach(function (g) {
      var items = rows.filter(function (x) { return x.f.t === g[0]; });
      items.sort(function (a, b) {
        if (ESS2.o === "n") return a.f.n.localeCompare(b.f.n, "es");
        var k = ESS2.o === "rel" ? "rel" : "s", x = a[k], y = b[k];
        if (x === null && y === null) return 0; if (x === null) return 1; if (y === null) return -1;
        return ESS2.o === "up" ? y - x : ESS2.o === "rel" ? Math.abs(y) - Math.abs(x) : x - y;
      });
      h += '<h2 class="sec">' + g[1] + ' <small class="muted">' + items.length + " fondos</small></h2><div class=\"es2l\"><div class=\"es2h\"><span>Fondo</span><span>" + P[1] + " (sigmas)</span><span>Frente a su categoría</span><span>Día, semana, mes, 3 meses</span></div>" + items.map(function (x) {
        var f = x.f, s = x.s, big = s !== null && Math.abs(s) >= SIG_MIN, w = s === null ? 0 : Math.min(Math.abs(s), max) / max * 50;
        var chips = ESP.map(function (p) { var q = esSig(f, p); return '<span class="es2c' + esLvl(q) + (q !== null && q < 0 ? " dn" : " up") + '" title="' + p[1] + ": " + esPc(f.ret[p[0]]) + (q === null ? "" : " (" + esSg(q) + " sigmas)") + '"><i>' + p[3] + "</i>" + esSg(q) + "</span>"; }).join("");
        return '<a class="es2r' + (big ? (s < 0 ? " big dn" : " big up") : "") + '" href="#/fondo/' + encodeURIComponent(f.id) + '"><span class="esf"><span class="flogo" aria-hidden="true">' + logoOrInit(f.g) + '</span><span class="ftxt"><b>' + esc(f.n) + "</b><small>" + esc(f.c) + "</small></span></span>" +
          '<span class="es2b"><span class="es2tr"><em style="left:' + (50 - SIG_MIN / max * 50) + '%"></em><em style="left:' + (50 + SIG_MIN / max * 50) + '%"></em><s></s>' + (s === null ? "" : '<i class="' + (s < 0 ? "dn" : "up") + '" style="' + (s < 0 ? "right" : "left") + ":50%;width:" + w.toFixed(2) + '%"></i>') + '</span><span class="es2n"><b>' + esSg(s) + "</b> · " + esPc(x.r) + "</span></span>" +
          '<span class="es2rel' + (x.rel === null ? "" : x.rel < 0 ? " dn" : " up") + '">' + (x.rel === null ? "–" : (x.rel > 0 ? "+" : x.rel < 0 ? "−" : "") + nf(Math.abs(x.rel), 1) + " pp") + '</span><span class="es2cs">' + chips + "</span></a>";
      }).join("") + "</div>";
    });
    if (E.resumen) h += '<div class="box" style="margin-top:18px;padding:16px 18px"><h2 style="margin:0 0 6px;font-size:1.05rem">Resumen del informe semanal (' + esc(E.fecha || "") + ")</h2><p class=\"stxt\">" + esc(E.resumen) + "</p></div>";
    h += '<p class="note">La sigma divide la rentabilidad del periodo entre la volatilidad a 3 años del fondo ajustada a ese periodo. «Frente a su categoría» resta la mediana de los fondos de la misma categoría de esta web (solo si hay 3 o más). Se recalcula con cada actualización de datos.</p>';
    app.innerHTML = h + footer("rv");
    document.getElementById("estipo").addEventListener("change", function (e) { ESS2.t = e.target.value; viewEstado(); });
    document.getElementById("esord").addEventListener("change", function (e) { ESS2.o = e.target.value; viewEstado(); });
    Array.prototype.forEach.call(document.querySelectorAll(".es2p"), function (b) { b.addEventListener("click", function () { ESS2.p = b.getAttribute("data-p"); viewEstado(); }); });
  }

  /* ---- Macro ---- */
  var MX = { br: "#a3173f", bl: "#2a5ca8", ink: "#1c1c26", mut: "#717171", trk: "#ece8ea", up: "#a3173f", dn: "#2a5ca8" };
  var MXG = [["inf", "Inflación"], ["tip", "Tipos de interés"], ["bon", "Bonos"], ["act", "Actividad"]];
  function mxData() { return window.MACRO || { vars: [], lecturas: {}, expect: [] }; }
  function mxV(id) { var a = mxData().vars || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function mxNum(x, v) { if (x.vt && v === x.v) return x.vt; var d = x.dec == null ? 1 : x.dec; return nf(v, d) + (x.u === "%" ? "%" : x.u === "pb" ? " pb" : ""); }
  function mxDelta(x) {
    if (!isNum(x.p)) return null;
    var dl = x.v - x.p, d = x.dec == null ? 1 : x.dec;
    if (Math.abs(dl) < Math.pow(10, -d) / 2) return { s: 0, t: "sin cambios" };
    return { s: dl > 0 ? 1 : -1, t: (dl > 0 ? "+" : "−") + nf(Math.abs(dl), d) + (x.u === "%" ? " pp" : x.u === "pb" ? " pb" : "") };
  }
  function mxArrow(dl) { return !dl ? "" : dl.s > 0 ? "▲" : dl.s < 0 ? "▼" : "="; }
  function mxBars(rows, o) {
    o = o || {};
    var W = 680, bx = 230, bw = 320, rh = 46, H = rows.length * rh + 6, mx = o.max || 0, any = false;
    rows.forEach(function (r) { mx = Math.max(mx, r.v, isNum(r.p) ? r.p : 0); if (isNum(r.p)) any = true; });
    mx = (o.max || mx * 1.12) || 1;
    var s = '<svg class="mxsvg" viewBox="0 0 ' + W + " " + (H + (any ? 22 : 0)) + '" role="img" aria-label="' + esc(o.label || "Gráfico") + '" font-family="Arial, Helvetica, sans-serif">';
    rows.forEach(function (r, i) {
      var cy = i * rh + 26, w = Math.max(5, r.v / mx * bw);
      s += '<text x="0" y="' + (cy + 5) + '" font-size="15" fill="' + MX.ink + '">' + esc(r.n) + "</text>" +
        '<rect x="' + bx + '" y="' + (cy - 9) + '" width="' + bw + '" height="18" rx="9" fill="' + MX.trk + '"/>' +
        '<rect x="' + bx + '" y="' + (cy - 9) + '" width="' + w + '" height="18" rx="9" fill="' + (r.c || MX.br) + '"/>';
      if (isNum(r.p)) { var px = bx + Math.min(r.p, mx) / mx * bw; s += '<line x1="' + px + '" y1="' + (cy - 14) + '" x2="' + px + '" y2="' + (cy + 14) + '" stroke="' + MX.ink + '" stroke-width="2.5" stroke-linecap="round"/>'; }
      s += '<text x="' + (bx + bw + 16) + '" y="' + (cy + 6) + '" font-size="17" font-weight="700" fill="' + MX.ink + '">' + esc(r.t) + "</text>";
    });
    if (any) s += '<line x1="' + bx + '" y1="' + (H + 8) + '" x2="' + bx + '" y2="' + (H + 20) + '" stroke="' + MX.ink + '" stroke-width="2.5" stroke-linecap="round"/><text x="' + (bx + 12) + '" y="' + (H + 19) + '" font-size="12.5" fill="' + MX.mut + '">Marca negra: dato anterior</text>';
    return s + "</svg>";
  }
  function mxRows(ids, color) {
    return ids.map(function (id) { var x = mxV(id); return x ? { n: x.short || x.n, v: x.v, p: x.p, t: mxNum(x, x.v), c: color } : null; }).filter(Boolean);
  }
  function mxSpark(x) {
    var s = x.ser || []; if (s.length < 3) return "";
    var mn = Infinity, mxx = -Infinity, w = 92, h = 26;
    s.forEach(function (p) { mn = Math.min(mn, p[1]); mxx = Math.max(mxx, p[1]); });
    var pts = s.map(function (p, i) { return (3 + i / (s.length - 1) * (w - 6)).toFixed(1) + "," + (h - 4 - (mxx === mn ? 0.5 : (p[1] - mn) / (mxx - mn)) * (h - 8)).toFixed(1); });
    var last = pts[pts.length - 1].split(",");
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '"><polyline points="' + pts.join(" ") + '" fill="none" stroke="' + MX.br + '" stroke-width="2" stroke-linejoin="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="' + MX.br + '"/></svg>';
  }
  function mxTiles(ids) {
    return '<div class="mxtiles">' + ids.map(function (id) {
      var x = mxV(id); if (!x) return "";
      var dl = mxDelta(x);
      return '<div class="mxtile"><span>' + esc(x.short || x.n) + "</span><b>" + esc(mxNum(x, x.v)) + "</b><em>" + (dl ? '<i class="mxd s' + dl.s + '">' + mxArrow(dl) + " " + esc(dl.t) + "</i>" : "") + " " + esc(x.d) + "</em></div>";
    }).join("") + "</div>";
  }
  function mxExpect() {
    var e = mxData().expect || []; if (!e.length) return "";
    return '<h4 class="mxh">Probabilidad que descuenta el mercado</h4>' + mxBars(e.map(function (z) { return { n: z.n, v: z.v, t: z.v + "%", c: MX.bl }; }), { max: 100, label: "Probabilidad de subida de tipos" });
  }
  function mxChartFor(g) {
    if (g === "inf") return mxBars(mxRows(["ipc_es", "ipc_ez", "ipc_us", "pce_us"], MX.br), { label: "Inflación por zona" });
    if (g === "tip") return mxBars(mxRows(["bce", "fed", "estr", "eur12"], MX.bl), { label: "Tipos de interés" }) + mxExpect();
    if (g === "bon") return mxBars(mxRows(["es10", "bund", "ust10"], MX.br), { label: "Rentabilidad de los bonos a 10 años" }) + mxTiles(["pr_es", "pend"]);
    return mxTiles(["pmi_ez", "paro_us"]);
  }
  function mxTable() {
    var vs = mxData().vars || [], sp = vs.some(function (x) { return (x.ser || []).length >= 3; });
    return '<div class="table-wrap"><table class="mxtbl"><thead><tr><th>Variable</th><th>Dato</th><th>Periodo</th><th>Anterior</th><th>Cambio</th>' + (sp ? "<th>Evolución</th>" : "") + "</tr></thead><tbody>" +
      MXG.map(function (g) {
        return '<tr class="mxgr"><td colspan="' + (sp ? 6 : 5) + '">' + g[1] + "</td></tr>" + vs.filter(function (x) { return x.g === g[0]; }).map(function (x) {
          var dl = mxDelta(x);
          return "<tr><td>" + esc(x.n) + "</td><td><b>" + esc(mxNum(x, x.v)) + "</b></td><td>" + esc(x.d) + "</td><td>" + (isNum(x.p) ? esc(mxNum(x, x.p)) + ' <small>' + esc(x.pd || "") + "</small>" : "–") + "</td><td>" + (dl ? '<span class="mxd s' + dl.s + '">' + mxArrow(dl) + " " + esc(dl.t) + "</span>" : "–") + "</td>" + (sp ? "<td>" + mxSpark(x) + "</td>" : "") + "</tr>";
        }).join("");
      }).join("") + "</tbody></table></div>";
  }
  function viewMacro() {
    setTitle("Macro");
    var M = mxData(), h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Macro</h1>' +
      '<p class="sub">El entorno económico en cuatro gráficas: inflación, tipos de interés, bonos y actividad. Datos a ' + esc(M.fecha || "") + ".</p>";
    if (!(M.vars || []).length) { app.innerHTML = h + '<div class="empty box" style="margin-top:18px;padding:34px 20px">Todavía no hay datos macro publicados.</div>' + footer("rv"); return; }
    h += '<div class="row tools2" id="mxtools"></div><div class="mxtop">' + mxTiles(["ipc_ez", "ipc_us", "bce", "fed", "bund", "pmi_ez"]) + '</div><div class="mxgrid">';
    MXG.forEach(function (g) {
      h += '<section class="block mxcard mx-' + g[0] + '"><h3>' + g[1] + '</h3><p class="mxread">' + esc((M.lecturas || {})[g[0]] || "") + "</p>" + mxChartFor(g[0]) + "</section>";
    });
    h += '</div><h2 class="sec">Todas las variables</h2>' + mxTable() +
      '<p class="note">Fuentes: ' + esc(M.fuentes || "") + ". Información orientativa, no constituye asesoramiento personalizado. Más contexto cada día en la <a href=\"#/nota\">Nota diaria</a>.</p>";
    app.innerHTML = h + footer("rv");
    var t = document.getElementById("mxtools");
    t.appendChild(deckBtn(function () { deckMacro(); }));
    t.appendChild(mailBtn(function () { return macroMail(); }));
  }
  function deckMacro() {
    var M = mxData(), S = [], n = 2, g = {}, e = mxV("ipc_ez"), b = mxV("bce"), u = mxV("bund");
    MXG.forEach(function (x) { g[x[0]] = x[1]; });
    S.push(dkCover("Entorno macroeconómico", "Macro: así está el entorno", "Datos a " + (M.fecha || "") + " · " + dkDate(), [["IPC zona euro", e ? mxNum(e, e.v) : "n.d."], ["Tipo BCE", b ? mxNum(b, b.v) : "n.d."], ["Bund 10 años", u ? mxNum(u, u.v) : "n.d."]]));
    function rd(k) { return '<div class="dk-read"><h4>Lectura</h4><p>' + esc((M.lecturas || {})[k] || "") + "</p></div>"; }
    S.push(dkSlide("Inflación", "Variación anual de los precios", '<div class="dk-two"><div class="dk-l">' + mxChartFor("inf") + '</div><div class="dk-r">' + rd("inf") + "</div></div>", n++));
    S.push(dkSlide("Tipos de interés", "Política monetaria y mercado monetario", '<div class="dk-two"><div class="dk-l">' + mxChartFor("tip") + '</div><div class="dk-r">' + rd("tip") + "</div></div>", n++));
    S.push(dkSlide("Bonos y actividad", "Rentabilidad de la deuda a 10 años y señales de actividad", '<div class="dk-two"><div class="dk-l">' + mxChartFor("bon") + '</div><div class="dk-r">' + rd("bon") + mxChartFor("act") + rd("act") + "</div></div>", n++));
    S.push(dkSlide("Resumen de variables", "Dato más reciente frente al anterior", mxTable().replace('class="table-wrap"', 'class="dk-mxw"'), n++));
    dkPrint(S.join(""), "Fuentes: " + (M.fuentes || ""));
  }
  function macroMail() {
    var M = mxData(), L = ["Hola,", "", pick(["Te comparto una foto del entorno macroeconómico con los últimos datos disponibles.", "Te hago llegar un resumen del entorno macro con los datos más recientes.", "Te envío una visión rápida de cómo está el entorno macroeconómico."]) + " Datos a " + dlong(M.fecha) + ".", ""];
    MXG.forEach(function (g) { L.push(g[1], (M.lecturas || {})[g[0]] || "", ""); });
    var k = [];
    ["ipc_ez", "ipc_es", "ipc_us", "bce", "fed", "bund", "ust10", "pr_es"].forEach(function (id) { var x = mxV(id); if (x) k.push("• " + (x.short || x.n) + ": " + mxNum(x, x.v) + " (" + x.d + ")"); });
    L.push("Datos clave", k.join("\n"), "", "Si te parece, lo comentamos y vemos cómo afecta a tu cartera según tu perfil y tu horizonte de inversión. Quedo a tu disposición.");
    return { subject: "Entorno macroeconómico: resumen a " + dlong(M.fecha), body: mailClean(L.join("\n")) + MAIL_PIE_MACRO, chart: function () { return mcMacro(); } };
  }
  var MAIL_PIE_MACRO = "\n\nComo siempre, te recuerdo que esta información es orientativa y no constituye asesoramiento personalizado ni una recomendación de inversión. Las rentabilidades pasadas no garantizan resultados futuros.";
  function viewNota() {
    setTitle("Nota diaria");
    var N = window.NOTA || {}, a = N.actual;
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Nota diaria</h1>';
    if (!a) { app.innerHTML = h + '<div class="empty box" style="margin-top:18px;padding:34px 20px">Todavía no hay nota publicada. Aparecerá tras la próxima ejecución diaria.</div>' + footer("rv"); return; }
    h += '<p class="sub">' + esc(a.titulo || "") + (a.fecha ? " (" + esc(a.fecha) + ")" : "") + ". Material de análisis, no una recomendación.</p>";
    h += '<div class="ntemas">';
    (a.temas || []).forEach(function (t, i) { h += '<article class="ntema"><span class="nnum">' + (i + 1) + '</span><div><h2>' + esc(t.t) + '</h2><p class="stxt">' + esc(t.r) + "</p></div></article>"; });
    h += "</div>";
    if ((a.calendario || []).length) h += '<section class="ncal"><h2>Calendario del día</h2>' + a.calendario.map(function (x) {
      var m = /^(\d{1,2}:\d{2})\s+(.*)$/.exec(x), k = /^(Por la mañana|Publicado|Domingo \d+|Sentimiento|Mañana|Tarde)[:,]?\s*(.*)$/i.exec(x);
      return '<div class="ncr"><b class="nct' + (m ? "" : " alt") + '">' + esc(m ? m[1] : /^Publicado/i.test(x) ? "Publicado" : /^Domingo/i.test(x) ? "Domingo" : "Hoy") + "</b><span>" + esc(m ? m[2] : /^Publicado:\s*/i.test(x) ? x.replace(/^Publicado:\s*/i, "") : /^Domingo \d+:\s*/i.test(x) ? x.replace(/^Domingo \d+:\s*/i, "") : x) + "</span></div>";
    }).join("") + "</section>";
    function pn(t) { var n = parseFloat(String(t).replace("%", "").replace("+", "").replace(",", ".")); return isNaN(n) ? null : n; }
    function pcs(t) { var n = pn(t); return n === null ? esc(t) : '<span class="' + (n < 0 ? "dn" : "up") + '">' + esc(t) + "</span>"; }
    function tbl(title, rows, bars) {
      if (!rows || !rows.length) return "";
      var mx = Math.max.apply(null, rows.map(function (r) { return Math.abs(pn(r[2]) || 0); }).concat([0.5]));
      if (!bars) return '<h3 class="es-cat">' + esc(title) + '</h3><div class="ntiles">' + rows.map(function (r) {
        var n = pn(r[2]); return '<div class="ntile ' + (n < 0 ? "dn" : "up") + '"><span>' + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b><em>" + pcs(r[2]) + ' <small>día</small></em><small class="yy">' + pcs(r[3]) + " en el año</small></div>";
      }).join("") + "</div>";
      return '<h3 class="es-cat">' + esc(title) + '</h3><div class="nsec"><div class="nsh"><span></span><span></span><b>Día</b><em>Año</em></div>' + rows.map(function (r) {
        var n = pn(r[2]) || 0, w = Math.abs(n) / mx * 50;
        return '<div class="nsr"><span class="nsn">' + esc(r[0]) + '</span><span class="nsb"><i class="' + (n < 0 ? "dn" : "up") + '" style="' + (n < 0 ? "right:50%" : "left:50%") + ";width:" + w.toFixed(1) + '%"></i></span><b>' + pcs(r[2]) + '</b><em>' + pcs(r[3]) + "</em></div>";
      }).join("") + "</div>";
    }
    var u = a.usa || {};
    if (u.sesion) h += '<p class="sub" style="margin-top:18px">Sesión americana del ' + esc(u.sesion) + " (vía ETF).</p>";
    h += tbl("Índices y mega caps", u.indices, false) + tbl("Sectores", u.sectores, true);
    (u.notas || []).forEach(function (x) { h += '<p class="note">' + esc(x) + "</p>"; });
    if (false && (a.ibex || []).length) h += '<div class="box" style="margin-top:14px;padding:16px 18px"><h2 style="margin:0 0 8px;font-size:1.05rem">Apuntes del Ibex 35</h2>' + a.ibex.map(function (x) { return '<div class="agrow"><span>' + esc(x) + "</span></div>"; }).join("") + "</div>";
    if (false) {
      h += '<h3 class="es-cat">Días anteriores</h3>' + N.historial.map(function (d) {
        return '<details class="box" style="margin-top:8px;padding:10px 16px"><summary><b>' + esc(d.fecha) + "</b> " + esc((d.temas || []).map(function (t) { return t.t; }).join(" · ")) + "</summary>" +
          (d.temas || []).map(function (t) { return '<p class="stxt" style="margin:8px 0 0"><b>' + esc(t.t) + ".</b> " + esc(t.r) + "</p>"; }).join("") + "</details>";
      }).join("");
    }
    app.innerHTML = h + footer("rv");
  }

  // ---------- router ----------
  // Cabecera tipo banner en todas las páginas interiores
  var decorating = false;
  function decorate() {
    if (decorating) return;
    var kids = app.children, h1 = null, fh = null;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].classList.contains("hero") || kids[i].classList.contains("phero")) return;
      if (kids[i].tagName === "H1") { h1 = kids[i]; break; }
      if (kids[i].classList.contains("fhead") || kids[i].classList.contains("page-head")) { fh = kids[i]; break; }
    }
    decorating = true;
    try {
      if (fh) { fh.classList.add("phero"); return; }
      if (!h1) return;
      var w = document.createElement("header"); w.className = "phero";
      app.insertBefore(w, h1); w.appendChild(h1);
      while (w.nextElementSibling && w.nextElementSibling.matches("p.sub, .sel")) w.appendChild(w.nextElementSibling);
    } finally { decorating = false; }
  }
  if (window.MutationObserver) new MutationObserver(decorate).observe(app, { childList: true });

  // ---------- candado (acceso privado) ----------
  var LOCK = { salt: "ec5a57c6e2be789b", hash: "e906eba26cf1faf0dcf2cda16ab9de1bd6b1f1d5ea178b80ed5966c6305b090b", key: "cf_unlock" };
  function sha(txt) {
    var enc = new TextEncoder().encode(txt);
    return crypto.subtle.digest("SHA-256", enc).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    });
  }
  function unlocked() { try { return localStorage.getItem(LOCK.key) === LOCK.hash; } catch (e) { return false; } }
  function gate(id, title, view) {
    if (unlocked()) return view();
    setTitle(title);
    app.innerHTML = '<header class="phero"><h1>🔒 ' + esc(title) + '</h1><p class="sub">Apartado privado. Introduce la contraseña para usarlo.</p></header>' +
      '<form class="lockbox" id="lockf"><label class="muted" for="lockpw">Contraseña</label><input id="lockpw" type="password" autocomplete="current-password" autofocus>' +
      '<button type="submit" class="btn primary">Desbloquear</button><p class="lockerr" id="lockerr" hidden>Contraseña incorrecta</p></form>' + footer("rv");
    document.getElementById("lockf").addEventListener("submit", function (e) {
      e.preventDefault();
      sha(LOCK.salt + document.getElementById("lockpw").value).then(function (h) {
        if (h === LOCK.hash) { try { localStorage.setItem(LOCK.key, h); } catch (x) { /* sin almacenamiento */ } route(); setNav(); }
        else document.getElementById("lockerr").hidden = false;
      });
    });
  }
  function setNav() { /* el menú no cambia */ }
  function viewAcceso() {
    setTitle("Acceso privado");
    app.innerHTML = '<div class="topbar"><a href="#/">← Inicio</a></div><header class="phero"><h1>🔓 Acceso privado activo</h1><p class="sub">En este navegador tienes desbloqueadas las funciones privadas (por ejemplo, el botón Correo en fondos y carteras, Construir cartera y la revisión de cartera). Los demás visitantes no las ven.</p></header>' +
      '<div class="row tools2"><button type="button" class="btn ghost" id="privout">Cerrar acceso privado</button></div>' + footer("rv");
    document.getElementById("privout").addEventListener("click", function () { try { localStorage.removeItem(LOCK.key); } catch (e) { /* sin almacenamiento */ } location.hash = "#/"; route(); });
  }

  // ---------- ETF: seguimiento y caídas (privado) ----------
  function viewETF() {
    setTitle("ETF");
    var E = window.ETFS || { list: [] }, head = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>🔒 ETF</h1>' +
      '<p class="sub">Seguimiento de ETF de renta variable cotizados en EE. UU., solo para clientes profesionales. En dólares y con dividendos. Datos a cierre del ' + esc(E.f || "") + ".</p>";
    if (!E.list.length) { app.innerHTML = head + '<div class="empty box">No hay datos de ETF publicados todavía.</div>' + footer("rv"); return; }
    var L = E.list, all = L.concat([E.ref]), sel = L.filter(function (x) { return x.sel; });
    var worst = L.slice().sort(function (a, b) { return a.cur - b.cur; })[0], best = L.slice().sort(function (a, b) { return b.cur - a.cur; })[0];
    var w = sel.reduce(function (s, x) { return s + x.sel; }, 0), sy = sel.reduce(function (s, x) { return s + x.sel * x.y1; }, 0) / (w || 1);
    function p1(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + nf(Math.abs(v), 1) + "%"; }
    function cell(v) { return '<td class="' + (v < 0 ? "neg" : "pos") + '">' + p1(v) + "</td>"; }
    function name(x) { return '<td class="etfn"><b>' + esc(x.t) + (x.sel ? ' <span class="etfsel">' + x.sel + "%</span>" : "") + "</b><small>" + esc(x.n) + "</small></td>"; }
    function kpi(l, v, s) { return '<div class="kpi"><small>' + esc(l) + "</small><span>" + esc(v) + '</span><small class="etfk">' + esc(s) + "</small></div>"; }
    var mx = Math.max.apply(null, all.map(function (x) { return -x.mdd; }));
    var bars = all.slice().sort(function (a, b) { return a.cur - b.cur; }).map(function (x) {
      return '<div class="etfrow"><b>' + esc(x.t) + '</b><span class="etfbar" aria-hidden="true"><i class="m" style="width:' + (-x.mdd / mx * 100).toFixed(1) + '%"></i><i class="c" style="width:' + (-x.cur / mx * 100).toFixed(1) + '%"></i></span><span class="etfv"><em>' + p1(x.cur) + "</em> / " + p1(x.mdd) + "</span></div>";
    }).join("");
    var dd = all.map(function (x) {
      return "<tr>" + name(x) + cell(x.cur) + cell(x.mdd) + "<td>" + esc(x.per) + "</td><td>" + (x.extra === undefined ? "" : p1(x.extra)) + "</td><td>" + (x.athd ? nf(x.ath, 2) + " $<small>" + esc(x.athd) + "</small>" : "") + "</td><td>" + esc(x.desde) + "</td></tr>";
    }).join("");
    var rt = all.map(function (x) { return "<tr>" + name(x) + "<td>" + nf(x.px, 2) + " $</td>" + cell(x.mes) + cell(x.ytd) + cell(x.y1) + "</tr>"; }).join("");
    app.innerHTML = head +
      '<div class="kpis etfkp">' + kpi("Mayor caída actual", p1(worst.cur), worst.t) + kpi("Más cerca de máximos", p1(best.cur), best.t) +
      kpi("Selección EE. UU., 1 año", p1(sy), "ponderada " + sel.map(function (x) { return x.t; }).join(", ")) + kpi("S&P 500, 1 año", p1(E.ref.y1), "SPY, caída actual " + p1(E.ref.cur)) + "</div>" +
      '<h2 class="sec">Caída actual frente a la máxima histórica</h2><div class="box etfbars"><p class="note"><span class="etfkey c"></span> Caída actual <span class="etfkey m"></span> Máxima caída desde que cotiza</p>' + bars + "</div>" +
      '<h2 class="sec">Detalle de caídas</h2><div class="table-wrap etft"><table><thead><tr><th>ETF</th><th>Caída actual</th><th>Máxima caída</th><th>Cuándo</th><th title="Caída adicional si desde hoy volviera a su peor nivel relativo">Si repite la peor</th><th>Máximo</th><th>Datos desde</th></tr></thead><tbody>' + dd + "</tbody></table></div>" +
      '<h2 class="sec">Rentabilidad</h2><div class="table-wrap etft etfr"><table><thead><tr><th>ETF</th><th>Precio</th><th>Mes</th><th>Año</th><th>1 año</th></tr></thead><tbody>' + rt + "</tbody></table></div>" +
      '<p class="note">El porcentaje junto al nombre es el peso en la selección para aprovechar el crecimiento de EE. UU. «Si repite la peor» es lo que aún caería desde hoy hasta igualar su máxima caída histórica. Caídas calculadas con cierres semanales desde que cotiza cada ETF (S&P 500 con cierres mensuales desde 2007, por lo que no es del todo comparable). CGDV, CGGR, CGXU y AVLV no vivieron la caída de 2020 y ninguno de los diez la de 2008. La rentabilidad a 1 año se mide desde el cierre de mes más próximo a hace un año.</p>' +
      '<p class="note">ETF sin documento de datos fundamentales europeo (KID): solo para clientes profesionales. Tienen riesgo de divisa, no son traspasables y pueden tributar en EE. UU. por herencia a partir de 60.000 $. Fuente: Interactive Brokers. No es una recomendación de inversión.</p>' +
      footer("rv").replace(/Datos Morningstar a [^<]*/, "Datos Interactive Brokers a " + esc(E.f || ""));
  }

  // ---------- amplitud de mercado (datos cifrados) ----------
  var AMP = { data: null, range: 126 };
  function b64(x) { var b = atob(x), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function ampDecrypt(pw) {
    var E = window.AMPLITUD_ENC;
    return crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]).then(function (k) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(E.s), iterations: E.it, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    }).then(function (key) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(E.i) }, key, b64(E.c)); })
      .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }
  function sma(a, n) { return a.map(function (_, i) { if (i < n - 1) return null; var s = 0; for (var j = i - n + 1; j <= i; j++) s += a[j]; return s / n; }); }
  function lineChart(dates, series, o) {
    o = o || {};
    var W = 640, H = o.h || 240, L = 48, R = 12, T = 12, B = 26, all = [];
    series.forEach(function (s) { s.v.forEach(function (v) { if (v !== null && v !== undefined) all.push(v); }); });
    (o.lines || []).forEach(function (l) { all.push(l.y); });
    var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all), pad = (mx - mn) * 0.06 || 1;
    if (o.min !== undefined) mn = o.min; else mn -= pad;
    if (o.max !== undefined) mx = o.max; else mx += pad;
    var n = dates.length;
    function X(i) { return L + i / Math.max(1, n - 1) * (W - L - R); }
    function Y(v) { return T + (mx - v) / (mx - mn) * (H - T - B); }
    var g = "", tk = ticks(mn, mx, 4), d = dd(tk);
    tk.forEach(function (v) { g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="#e6e2e8"/><text x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#717171">' + nf(v, d) + "</text>"; });
    (o.lines || []).forEach(function (l) { g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(l.y).toFixed(1) + '" y2="' + Y(l.y).toFixed(1) + '" stroke="' + (l.c || "#b01030") + '" stroke-dasharray="5 4" opacity=".7"/><text x="' + (W - R - 2) + '" y="' + (Y(l.y) - 4).toFixed(1) + '" text-anchor="end" font-size="10.5" fill="' + (l.c || "#b01030") + '">' + esc(l.t || "") + "</text>"; });
    var step = Math.max(1, Math.round(n / 6));
    for (var i = 0; i < n; i += step) { var p = dates[i].split("-"); g += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#717171">' + p[2] + "/" + p[1] + "/" + p[0].slice(2) + "</text>"; }
    series.forEach(function (s) {
      var pts = [], pen = "";
      s.v.forEach(function (v, i) { if (v === null || v === undefined) { pen = ""; return; } pts.push((pen ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)); pen = "1"; });
      g += '<path d="' + pts.join("") + '" fill="none" stroke="' + s.c + '" stroke-width="' + (s.w || 1.8) + '"' + (s.dash ? ' stroke-dasharray="5 4"' : "") + ' stroke-linejoin="round"/>';
    });
    return '<svg class="amp-svg" viewBox="0 0 ' + W + " " + H + '" data-n="' + n + '" role="img">' + g + '<line class="xh" y1="' + T + '" y2="' + (H - B) + '" stroke="#1a1220" stroke-opacity=".35" style="display:none"/></svg>';
  }
  function viewAmplitud() {
    setTitle("Amplitud");
    var head = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>🔒 Amplitud de mercado</h1><p class="sub">NYSE: línea avance/descenso, RASI, McClellan, Summation y porcentaje de valores sobre sus medias. Apartado privado.</p>';
    if (AMP.data) return ampRender(head);
    var saved = ""; try { saved = sessionStorage.getItem("cf_amp") || ""; } catch (e) { /* sin almacenamiento */ }
    function open(pw, bad) {
      return ampDecrypt(pw).then(function (d) { AMP.data = d; try { sessionStorage.setItem("cf_amp", pw); } catch (e) { /* sin almacenamiento */ } ampRender(head); }).catch(function () { if (bad) bad(); });
    }
    function form(err) {
      app.innerHTML = head + '<form class="lockbox" id="ampf"><label class="muted" for="amppw">Contraseña</label><input id="amppw" type="password" autocomplete="current-password" autofocus>' +
        '<button type="submit" class="btn primary">Desbloquear</button><p class="lockerr" id="amperr"' + (err ? "" : " hidden") + '>Contraseña incorrecta</p></form>' + footer("rv");
      document.getElementById("ampf").addEventListener("submit", function (e) {
        e.preventDefault();
        open(document.getElementById("amppw").value, function () { document.getElementById("amperr").hidden = false; });
      });
    }
    if (!window.AMPLITUD_ENC) { app.innerHTML = head + '<div class="empty box">No hay datos de amplitud publicados todavía.</div>' + footer("rv"); return; }
    if (saved) open(saved, function () { form(false); }); else form(false);
  }
  function ampRender(head) {
    var D = AMP.data, all = D.rows, n = Math.min(AMP.range, all.length), sl = all.slice(all.length - n);
    var col = function (k) { var j = D.cols.indexOf(k); return sl.map(function (r) { return r[j]; }); };
    var full = function (k) { var j = D.cols.indexOf(k); return all.map(function (r) { return r[j]; }); };
    var last = all[all.length - 1], c = function (k) { return last[D.cols.indexOf(k)]; };
    var nyseAll = full("nyse"), s200 = sma(nyseAll, 200).slice(all.length - n), mx12 = Math.max.apply(null, nyseAll.slice(-252)), caida = (1 - c("nyse") / mx12) * 100;
    var dt = last[0].split("-"), fecha = dt[2] + "/" + dt[1] + "/" + dt[0];
    function kp(l, v, sub) { return '<div class="kpi"><small>' + esc(l) + "</small><span>" + v + "</span>" + (sub ? '<em class="ksub">' + sub + "</em>" : "") + "</div>"; }
    var p200 = c("p200"), p50 = c("p50"), ad = c("ad"), wma = c("wma");
    var kp8 = kp("NYSE", nf(c("nyse"), 0), "caída " + nf(caida, 1) + "% desde el máximo de 12 meses") + kp("% sobre media 200", p200 === null ? "–" : nf(p200, 1) + "%", p200 !== null && p200 < 50 ? "por debajo de 50: debilidad" : "por encima de 50") +
      kp("% sobre media 50", p50 === null ? "–" : nf(p50, 1) + "%", p50 !== null && p50 < 20 ? "sobrevendido" : p50 !== null && p50 > 80 ? "sobrecomprado" : "zona normal") +
      kp("Línea AD", nf(ad, 0), ad < wma ? "bajo su media de 150 (WMA150)" : "sobre su media de 150") +
      kp("RASI", nf(c("rasi"), 0), "") + kp("McClellan", nf(c("mcos"), 0), "") + kp("Summation", nf(c("sum"), 0), "") + kp("Máx. / mín. 52 sem.", nf(c("nmax"), 0) + " / " + nf(c("nmin"), 0), c("nmin") > c("nmax") ? "más mínimos que máximos" : "más máximos que mínimos");
    var dates = col("f");
    var rng = [[63, "3 meses"], [126, "6 meses"], [252, "1 año"], [all.length, "Todo"]].map(function (r) { return '<button type="button" class="catchip" data-r="' + r[0] + '" aria-pressed="' + (AMP.range === r[0]) + '">' + r[1] + "</button>"; }).join("");
    function card(t, svg, leg) { return '<section class="block amp-card"><h3>' + t + '</h3><div class="amp-wrap">' + svg + '<div class="amp-tip"></div></div><div class="legend">' + leg + "</div></section>"; }
    function lg(items) { return items.map(function (i) { return '<span><i style="background:' + i[0] + '"></i>' + i[1] + "</span>"; }).join(""); }
    var col1 = "#b01030", col2 = "#1b3a5c", col3 = "#12806e", col4 = "#c8a04a";
    var charts = [
      card("NYSE y media de 200 sesiones", lineChart(dates, [{ v: col("nyse"), c: col1 }, { v: s200, c: col4, dash: true }]), lg([[col1, "NYSE"], [col4, "Media 200"]])),
      card("Línea avance/descenso y su media de 150", lineChart(dates, [{ v: col("ad"), c: col2 }, { v: col("wma"), c: col4, dash: true }]), lg([[col2, "Línea AD"], [col4, "WMA150"]])),
      card("Valores sobre su media de 50 y de 200 sesiones (%)", lineChart(dates, [{ v: col("p50"), c: col3 }, { v: col("p200"), c: col1 }], { min: 0, max: 100, lines: [{ y: 20, c: "#12806e", t: "20 sobrevendido" }, { y: 50, c: "#717171", t: "50" }, { y: 80, c: "#b01030", t: "80 sobrecomprado" }] }), lg([[col3, "% sobre media 50"], [col1, "% sobre media 200"]])),
      card("RASI y Summation Index", lineChart(dates, [{ v: col("rasi"), c: col1 }, { v: col("sum"), c: col2 }], { lines: [{ y: 0, c: "#717171" }] }), lg([[col1, "RASI"], [col2, "Summation"]])),
      card("Oscilador McClellan", lineChart(dates, [{ v: col("mcos"), c: col3 }], { lines: [{ y: 0, c: "#717171" }] }), lg([[col3, "McClellan"]])),
      card("Nuevos máximos y mínimos de 52 semanas", lineChart(dates, [{ v: col("nmax"), c: col3 }, { v: col("nmin"), c: col1 }]), lg([[col3, "Nuevos máximos"], [col1, "Nuevos mínimos"]]))
    ];
    app.innerHTML = head + '<p class="note">Datos de amplitud del NYSE a ' + fecha + '. Los porcentajes sobre medias pueden revisarse al alza o a la baja el día siguiente.</p><div class="kpis kp8">' + kp8 + '</div>' +
      '<div class="catbar" role="group" aria-label="Periodo">' + rng + '</div><div class="amp-grid">' + charts.join("") + "</div>" +
      '<p class="note">Lectura orientativa de datos pasados, no una recomendación. Fuente: amplitudmercado.com.</p>' + footer("rv");
    app.querySelectorAll("[data-r]").forEach(function (b) { b.addEventListener("click", function () { AMP.range = +b.getAttribute("data-r"); ampRender(head); }); });
    app.querySelectorAll(".amp-wrap").forEach(function (w, ci) {
      var svg = w.querySelector("svg"), tip = w.querySelector(".amp-tip"), xh = svg.querySelector(".xh");
      var defs = [["nyse", "NYSE", "s200"], ["ad", "Línea AD", "wma"], ["p50", "% media 50", "p200"], ["rasi", "RASI", "sum"], ["mcos", "McClellan"], ["nmax", "Máximos", "nmin"]][ci];
      w.addEventListener("mousemove", function (e) {
        var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 640, i = Math.round((x - 48) / (640 - 60) * (dates.length - 1));
        if (i < 0 || i >= dates.length) { tip.style.display = "none"; xh.style.display = "none"; return; }
        var f = dates[i].split("-"), txt = "<b>" + f[2] + "/" + f[1] + "/" + f[0] + "</b>";
        var a = col(defs[0])[i]; txt += "<br>" + defs[1] + ": " + (a === null ? "–" : nf(a, 1));
        if (defs[2]) { var b2 = defs[2] === "s200" ? s200[i] : col(defs[2])[i], nm = { s200: "Media 200", wma: "WMA150", p200: "% media 200", sum: "Summation", nmin: "Mínimos" }[defs[2]]; txt += "<br>" + nm + ": " + (b2 === null || b2 === undefined ? "–" : nf(b2, 1)); }
        tip.innerHTML = txt; tip.style.display = "block";
        tip.style.left = Math.min(e.clientX - r.left + 14, r.width - 150) + "px"; tip.style.top = "8px";
        var px = 48 + i / Math.max(1, dates.length - 1) * (640 - 60); xh.setAttribute("x1", px); xh.setAttribute("x2", px); xh.style.display = "";
      });
      w.addEventListener("mouseleave", function () { tip.style.display = "none"; xh.style.display = "none"; });
    });
  }

  // ---------- colores de la gestora ----------
  var GCOL = {
    "Renta 4": ["#c8102e", "#6e0a1c"], "Morgan Stanley IM": ["#0b5fa5", "#052e57"], "Man Group": ["#00706a", "#00383a"], "Algebris": ["#1f3a5f", "#0d1b2e"],
    "PIMCO": ["#0a4a82", "#001a33"], "Buy & Hold": ["#8b5a3c", "#3e2616"], "Vontobel": ["#d9467a", "#6e1b3f"], "M&G": ["#00a37a", "#00473a"], "Amundi": ["#0066b3", "#003561"],
    "MFS": ["#0c6e7d", "#053840"], "BlackRock": ["#262626", "#000000"], "T. Rowe Price": ["#0a3d91", "#051f4a"], "Alger": ["#1c3d6e", "#0d1f38"], "JPMorgan AM": ["#6b4a2b", "#33220f"],
    "Jupiter": ["#2b3a8f", "#141b47"], "Findlay Park": ["#1f4e3d", "#0d241b"], "Groupama": ["#2e8b57", "#124a2c"], "Nomura": ["#c1002a", "#600015"], "DNB": ["#007272", "#003a3a"],
    "Federated Hermes": ["#0a2a5e", "#04132b"], "DWS": ["#1a3ccf", "#0a1b6b"], "Goldman Sachs AM": ["#5b8db8", "#1f4466"], "Goehring & Rozencwajg": ["#7a5c1e", "#3a2b0c"],
    "Fidelity": ["#3f9a2d", "#1c4a14"], "Robeco": ["#008a92", "#00464a"], "Eleva": ["#e0572d", "#7a2a12"], "Wellington": ["#00205b", "#000f2e"], "Columbia Threadneedle": ["#0076c0", "#003a60"],
    "Polar Capital": ["#00305e", "#00172e"], "Vanguard": ["#96151d", "#4a0a0e"], "Allianz GI": ["#003781", "#001b40"], "La Financière de l'Echiquier": ["#0b3d5c", "#051e2e"], "Edmond de Rothschild": ["#5a1f35", "#2b0f19"]
  };
  function mixHex(h, k) {
    var n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function m(c) { return Math.round(c + (255 - c) * k); }
    return "rgb(" + m(r) + "," + m(g) + "," + m(b) + ")";
  }
  function gTheme(id) {
    var f = id ? byId(id) : null, c = f && GCOL[f.g];
    app.classList.remove("gtheme"); app.style.removeProperty("--brand"); app.style.removeProperty("--brand-2"); app.style.removeProperty("--brand-soft"); app.style.removeProperty("--gd");
    if (!c) return;
    app.classList.add("gtheme");
    app.style.setProperty("--brand", c[0]); app.style.setProperty("--brand-2", c[1]); app.style.setProperty("--brand-soft", mixHex(c[0], 0.9)); app.style.setProperty("--gd", c[1]);
  }

  function markNav() {
    var h = location.hash || "#/", seg = h.split("/")[1] || "";
    var map = { fondo: null, resumen: null };
    document.querySelectorAll(".site nav a").forEach(function (l) {
      var s = (l.getAttribute("href").split("/")[1] || "");
      l.classList.toggle("on", s === seg);
    });
    document.querySelectorAll(".site nav details").forEach(function (d) { d.classList.toggle("on", !!d.querySelector("a.on")); d.removeAttribute("open"); });
  }
  function route() {
    markNav();
    var h = (location.hash || "#/").replace(/^#/, ""), p = h.split("/").filter(Boolean);
    window.scrollTo(0, 0);
    gTheme(null);
    if (!p.length) return viewHome();
    if ((p[0] === "rf" || p[0] === "rv") && !p[1]) return viewList(p[0]);
    if ((p[0] === "rf" || p[0] === "rv") && p[1] === "resumen") return viewOverview(p[0]);
    if (p[0] === "fondo" && p[1]) { var fid = decodeURIComponent(p[1]); viewFund(fid); return; }
    if (p[0] === "comparar") return viewCompare(p[1]);
    if (p[0] === "carteras") return viewPortfolios();
    if (p[0] === "acciones") return viewStocks();
    if (p[0] === "agenda") { location.hash = "#/nota"; return; }
    if (p[0] === "estado") return viewEstado();
    if (p[0] === "nota") return viewNota();
    if (p[0] === "macro") return viewMacro();
    if (p[0] === "accion" && p[1]) return viewStock(decodeURIComponent(p[1]));
    if (p[0] === "gestora" && p[1] && window.BUSCA) return window.BUSCA.gestora(app, setTitle, decodeURIComponent(p[1]));
    if (p[0] === "acceso") return gate("acceso", "Acceso privado", viewAcceso);
    if (p[0] === "amplitud") return viewAmplitud();
    if (p[0] === "etf") return gate("etf", "ETF", viewETF);
    if (p[0] === "gestion") return viewGestion();
    if (p[0] === "newsletter" && window.NEWSLETTER) return window.NEWSLETTER.view(app, setTitle);
    if (p[0] === "privacidad" && window.NEWSLETTER) return window.NEWSLETTER.privacy(app, setTitle);
    if (p[0] === "construir") return gate("construir", "Construir cartera", viewBuild);
    if (p[0] === "categorias") { location.replace("#/"); return; }
    if (p[0] === "cartera" && p[1]) return viewPortfolio(decodeURIComponent(p[1]));
    return viewNotFound();
  }
  window.CFUI = { vl: vlTag, logo: logoOrInit, stockLogo: stockLogo, rcell: rcell, ret: ret, pct: pct, dec: dec, footer: footer };
  window.addEventListener("hashchange", route);
  route();
})();
