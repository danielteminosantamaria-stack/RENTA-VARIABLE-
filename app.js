(function () {
  "use strict";

  var DATA = window.DATA || { funds: [], meta: {} };
  var FUNDS = DATA.funds;
  var META = DATA.meta || {};
  var app = document.getElementById("app");

  var CATS = {
    rf: { title: "Renta fija", card: "Renta fija", top: "Renta fija" },
    rv: { title: "Renta variable y mixtos", card: "Renta variable y mixtos", top: "Renta variable y mixtos" }
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
  function logoOrInit(g) {
    var L = window.LOGOS || {}, D = window.LOGODOM || {}, src = L[g] ? "logos/" + L[g] : D[g] ? "https://www.google.com/s2/favicons?sz=128&domain=" + encodeURIComponent(D[g]) : null;
    return src ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.textContent=\'' + esc(initials(g)) + '\'">' : esc(initials(g));
  }
  function icon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  }
  function footer(t) {
    var date = (t && META[t]) || META.rf || META.rv || "";
    return '<footer class="foot"><span>Datos Morningstar a ' + esc(date) + '</span>' +
      '<span>Información orientativa. Las rentabilidades pasadas no garantizan resultados futuros.</span></footer>';
  }
  function matches(f, q) {
    var n = norm(q);
    if (!n) return true;
    return norm(f.n + " " + f.id + " " + f.g + " " + f.c).indexOf(n) !== -1;
  }
  function setTitle(t) { document.title = t ? t + " · GESTION DE CARTERAS - DANIEL TEMIÑO" : "GESTION DE CARTERAS - DANIEL TEMIÑO"; }

  // ---------- inicio ----------
  function topFive(t) {
    return ofType(t).filter(function (f) { return isNum(f.ret.ytd); })
      .sort(function (a, b) { return b.ret.ytd - a.ret.ytd; }).slice(0, 5);
  }
  function topList(t) {
    return '<div><p class="label">Top 5 en el año · ' + esc(CATS[t].top) + '</p><div class="list">' +
      topFive(t).map(function (f) {
        return '<a href="#/fondo/' + encodeURIComponent(f.id) + '"><span>' + esc(f.n) + '</span>' + ret(f.ret.ytd) + "</a>";
      }).join("") + "</div></div>";
  }
  function weekList(t, best) {
    var l = ofType(t).filter(function (f) { return isNum(f.ret.w1); })
      .sort(function (a, b) { return best ? b.ret.w1 - a.ret.w1 : a.ret.w1 - b.ret.w1; }).slice(0, 5);
    return "<div><p class=\"label\">" + (best ? "5 mejores" : "5 peores") + " de la semana · " + esc(CATS[t].top) + '</p><div class="list">' +
      l.map(function (f) { return '<a href="#/fondo/' + encodeURIComponent(f.id) + '"><span>' + esc(f.n) + "</span>" + ret(f.ret.w1) + "</a>"; }).join("") + "</div></div>";
  }
  function viewHome() {
    setTitle("");
    app.innerHTML =
      '<header class="hero"><h1>GESTION DE CARTERAS - DANIEL TEMIÑO</h1><p>Rentabilidad, riesgo y ratios de los fondos en seguimiento, con datos de Morningstar.</p></header>' +
      '<div class="cards">' +
      ["rf", "rv"].map(function (t) {
        return '<a class="cat-card" href="#/' + t + '"><div class="row"><div><small>Fondos de</small><h2>' +
          esc(CATS[t].card) + '</h2></div><span class="count">' + ofType(t).length + ' fondos</span></div>' +
          '<span class="arrow" aria-hidden="true">→</span></a>';
      }).join("") + "</div>" +
      '<div class="cards" style="margin-top:14px">' +
      '<a class="cat-card" href="#/categorias"><div class="row"><div><small>Explorar</small><h2>Categorías</h2></div><span class="count">' + (allCats("rf").length + allCats("rv").length) + ' categorías</span></div><span class="arrow" aria-hidden="true">→</span></a>' +
      '<a class="cat-card" href="#/gestion"><div class="row"><div><small>Herramienta</small><h2>Gestión de carteras</h2></div><span class="count">analizar la del cliente</span></div><span class="arrow" aria-hidden="true">→</span></a>' +
      '<a class="cat-card" href="#/acciones"><div class="row"><div><small>Explorar</small><h2>Acciones MarketSurge</h2></div><span class="count">' + stocks().length + (stocks().length === 1 ? " ficha" : " fichas") + '</span></div><span class="arrow" aria-hidden="true">→</span></a>' +
      '<a class="cat-card" href="#/agenda"><div class="row"><div><small>Semana</small><h2>Agenda semanal</h2></div><span class="count">mercado y deuda</span></div><span class="arrow" aria-hidden="true">→</span></a>' +
      '<a class="cat-card" href="#/construir"><div class="row"><div><small>Herramienta</small><h2>Construir cartera</h2></div><span class="count">con el cliente</span></div><span class="arrow" aria-hidden="true">→</span></a>' +
      '<a class="cat-card" href="#/comparar"><div class="row"><div><small>Herramienta</small><h2>Comparador de fondos</h2></div><span class="count">hasta ' + CMP_MAX + ' fondos</span></div><span class="arrow" aria-hidden="true">→</span></a>' +
      '<a class="cat-card" href="#/carteras"><div class="row"><div><small>Herramienta</small><h2>Carteras</h2></div><span class="count">' + PF.length + (PF.length === 1 ? " cartera" : " carteras") + '</span></div><span class="arrow" aria-hidden="true">→</span></a>' +
      '<a class="cat-card" href="#/recomendadas"><div class="row"><div><small>Herramienta</small><h2>Carteras recomendadas</h2></div><span class="count">3 perfiles</span></div><span class="arrow" aria-hidden="true">→</span></a></div>' +
      '<div class="tops">' + weekList("rf", true) + weekList("rv", true) + "</div>" +
      '<div class="tops">' + weekList("rf", false) + weekList("rv", false) + "</div>" +
      '<div class="tops">' + topList("rf") + topList("rv") + "</div>" +
      '<div class="search">' + icon() +
      '<input id="q" type="search" placeholder="Buscar por nombre o ISIN" autocomplete="off" aria-label="Buscar fondo"></div>' +
      '<div class="results" id="res"></div>' + footer("rf");
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
    P("dur", "Duración", "Cartera", function (f) { return f.dur; }, { d: 1, only: "rf" }),
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
    P("worst1", "Peor mes 1 año", "Riesgo", function (f) { return f.worst[0]; }, { u: "%", d: 1 }),
    P("pos1", "Meses en positivo 1 año", "Riesgo", function (f) { return f.pos[0]; }, { u: "%", d: 0 }),
    P("skew1", "Asimetría 1 año", "Distribución", function (f) { return f.skew[0]; }),
    P("skew3", "Asimetría 3 años", "Distribución", function (f) { return f.skew[1]; }),
    P("kurt1", "Curtosis 1 año", "Distribución", function (f) { return f.kurt[0]; }),
    P("kurt3", "Curtosis 3 años", "Distribución", function (f) { return f.kurt[1]; }),
    P("top10", "Peso top 10", "Otros", function (f) { return f.top10; }, { u: "%", d: 1 }),
    P("cost", "Coste neto", "Otros", function (f) { var n = parseFloat(String(f.cost || "").replace(",", ".")); return isFinite(n) ? n : null; }, { u: "%", d: 2 })
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
    rf: { view: "list", g: null, q: "", sort: "n", dir: 1, pick: false, cols: loadCols("rf") },
    rv: { view: "list", g: null, q: "", sort: "n", dir: 1, pick: false, cols: loadCols("rv") },
    cx: "vol1", cy: "y1"
  };

  function cols(t) {
    return state[t].cols.map(metric).filter(Boolean).map(function (m) {
      return { k: m.k, l: m.l, v: m.v, r: function (f) { return cell(f, m); } };
    });
  }

  function filtered(t) {
    var s = state[t];
    return ofType(t).filter(function (f) { return (!s.g || f.g === s.g) && matches(f, s.q); });
  }
  function sorted(t, list) {
    var s = state[t], c = cols(t).filter(function (x) { return x.k === s.sort; })[0];
    var get = s.sort === "n" ? function (f) { return f.n; } : c ? c.v : function (f) { return f.n; };
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
    var names = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b, "es"); });

    app.innerHTML =
      '<div class="topbar"><a href="#/">← Inicio</a></div>' +
      '<div class="page-head"><h1>' + esc(CATS[t].title) + '</h1><div class="tools">' +
      '<div class="seg" role="group" aria-label="Vista">' +
      '<button type="button" data-view="list" aria-pressed="' + (s.view === "list") + '">Lista</button>' +
      '<button type="button" data-view="chart" aria-pressed="' + (s.view === "chart") + '">Gráfico</button></div>' +
      '<a class="link" href="#/' + t + '/resumen">Visión general</a></div></div>' +
      '<div class="folders">' + names.map(function (g) {
        return '<button type="button" class="folder" data-g="' + esc(g) + '" aria-pressed="' + (s.g === g) + '">' +
          '<span class="mono" aria-hidden="true">' + logoOrInit(g) + "</span><span><b>" + esc(g) + "</b><small>" +
          groups[g] + (groups[g] === 1 ? " fondo" : " fondos") + "</small></span></button>";
      }).join("") + "</div>" +
      '<div class="filters"><div class="search">' + icon() +
      '<input id="q" type="search" placeholder="Buscar por nombre o ISIN" value="' + esc(s.q) + '" aria-label="Buscar fondo" autocomplete="off"></div>' +
      (s.view === "list" ? '<button type="button" class="chip" id="pickBtn" aria-expanded="' + s.pick + '">Columnas</button>' : "") + "</div>" +
      '<div class="picker" id="picker"' + (s.pick && s.view === "list" ? "" : " hidden") + "></div>" +
      '<div id="body"></div>' + footer(t);

    app.querySelectorAll("[data-view]").forEach(function (b) {
      b.addEventListener("click", function () { s.view = b.getAttribute("data-view"); viewList(t); });
    });
    app.querySelectorAll(".folder").forEach(function (b) {
      b.addEventListener("click", function () {
        var g = b.getAttribute("data-g");
        s.g = s.g === g ? null : g;
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
        if (s.sort !== "n" && s.cols.indexOf(s.sort) === -1) { s.sort = "n"; s.dir = 1; }
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
      bindChart(t);
      return;
    }
    var c = cols(t), rows = sorted(t, list);
    function th(k, l, first) {
      var on = s.sort === k;
      return '<th scope="col"' + (on ? ' aria-sort="' + (s.dir > 0 ? "ascending" : "descending") + '"' : "") + '><button type="button" data-sort="' + k + '">' +
        l + (on ? (s.dir > 0 ? " ↑" : " ↓") : "") + "</button></th>";
    }
    body.innerHTML = '<div class="table-wrap"><table><thead><tr>' + th("n", "Fondo") +
      c.map(function (x) { return th(x.k, x.l); }).join("") + "</tr></thead><tbody>" +
      rows.map(function (f) {
        return '<tr data-id="' + esc(f.id) + '" tabindex="0"><td class="fund"><b>' + esc(f.n) +
          (f.idx ? '<span class="tag">Indexado</span>' : "") + "</b><small>" + esc(f.g) + (t === "rv" ? " · " + esc(f.c) : "") +
          "</small></td>" + c.map(function (x) { return "<td>" + x.r(f) + "</td>"; }).join("") + "</tr>";
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
    return '<div class="axes">' + sel("cx", "Eje X", state.cx) + sel("cy", "Eje Y", state.cy) + "</div>";
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
    pts.forEach(function (f) {
      g += '<circle class="dot' + (f.g === "Renta 4" ? " r4" : "") + '" tabindex="0" role="link" aria-label="' + esc(f.n) + '" data-id="' + esc(f.id) +
        '" cx="' + X(mx.v(f)).toFixed(1) + '" cy="' + Y(my.v(f)).toFixed(1) + '" r="5.5"/>';
    });
    return '<div class="chart-card"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(my.l) + " frente a " + esc(mx.l) + '">' + g + "</svg>" +
      '<div class="tip" id="tip"></div>' +
      '<div class="legend"><span><i></i>Fondos</span><span><i style="background:var(--brand)"></i>Renta 4</span><span>' + pts.length + " de " + list.length + " fondos con datos</span></div></div>";
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
    var r = f.ret, html = "";
    html += '<div class="topbar"><a href="#/' + f.t + '">← ' + esc(CATS[f.t].title) + '</a></div>';
    html += "<h1>" + esc(f.n) + "</h1>";
    html += '<p class="sub">' + esc(f.g) + " · " + esc(f.id) + " · " + esc(f.c) + (f.idx ? ' <span class="tag">Indexado</span>' : "") + "</p>";
    html += '<div class="kpis">' +
      kpi("Vol. 1 año", pct(f.vol[0], false, 1), true) + kpi("Sharpe 1 año", dec(f.sharpe[0]), true) +
      kpi("Último mes", ret(r.m1)) + kpi("Año", ret(r.ytd)) + kpi("1 año", ret(r.y1)) +
      kpi("3 años", ret(r.y3)) + kpi("5 años", ret(r.y5)) + kpi("10 años", ret(r.y10)) + "</div>";
    html += '<p class="note">Rentabilidad de la clase en euros. A 3, 5 y 10 años, anualizada. Fuente: Morningstar, valor liquidativo a ' + esc(f.nd) + ".</p>";

    var docs = [["ficha", "Ficha (KID)", "Documento oficial"], ["informe", "Informe periódico", "Documento oficial"], ["xray", "X-Ray", "Morningstar"], ["ms", "Morningstar", "Ficha online"]]
      .filter(function (d) { return safeUrl(f[d[0]]); })
      .map(function (d) { return '<a class="doc" href="' + esc(f[d[0]]) + '" target="_blank" rel="noopener noreferrer">' + d[1] + "<small>" + d[2] + "</small></a>"; });
    docs.push('<a class="doc" href="#/comparar/' + encodeURIComponent(f.id) + '">Comparar<small>Con otros fondos</small></a>');
    docs.push(PF.length
      ? '<span class="doc addpf">Añadir a cartera<small><select id="addpf" aria-label="Cartera">' + PF.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + "</option>"; }).join("") + '</select> <button type="button" id="addpfBtn" class="btn sm">Añadir</button></small></span>'
      : '<a class="doc" href="#/carteras">Carteras<small>Crear una cartera</small></a>');
    html += '<div class="docs">' + docs.join("") + "</div>";

    html += '<div class="grid2">';

    // Rentabilidad por año
    if (f.ann && f.ann.some(isNum)) {
      var years = [], base = 2025;
      f.ann.forEach(function (v, i) { years.push([i === 0 ? "2026 (" + String(META.annDate || "").slice(0, 5) + ")" : String(base - (i - 1)), v]); });
      var mx = Math.max.apply(null, years.map(function (y) { return isNum(y[1]) ? Math.abs(y[1]) : 0; })) || 1;
      html += '<section class="block"><h3>Rentabilidad por año</h3><div class="bars">' + years.filter(function (y) { return isNum(y[1]); }).map(function (y) {
        return bar(y[0], y[1], mx, y[1] < 0 ? "neg" : "pos", '<span class="' + cls(y[1]) + '">' + pct(y[1], true, 1) + "</span>");
      }).join("") + "</div></section>";
    }

    // Composición
    var mix = f.mix, labels = ["Acciones", "Bonos", "Efectivo", "Otros"], colors = ["#851a2e", "#3b3b3b", "#b9b9b9", "#f0c9b0"];
    if (mix.some(isNum)) {
      var tot = mix.reduce(function (a, v) { return a + (isNum(v) && v > 0 ? v : 0); }, 0) || 1;
      var odd = mix.some(function (v) { return isNum(v) && v < 0; }) || Math.abs(mix.reduce(function (a, v) { return a + (isNum(v) ? v : 0); }, 0) - 100) > 2;
      html += '<section class="block"><h3>Composición de la cartera</h3><div class="stack" role="img" aria-label="Composición">' + mix.map(function (v, i) {
        return isNum(v) && v > 0 ? '<i style="width:' + (v / tot * 100).toFixed(2) + "%;background:" + colors[i] + '"></i>' : "";
      }).join("") + '</div><div class="keys">' + mix.map(function (v, i) {
        return isNum(v) && Math.abs(v) >= 0.05 ? '<span style="--c:' + colors[i] + '">' + labels[i] + " <b>" + pct(v, false, 1) + "</b></span>" : "";
      }).join("") + "</div>" +
        (odd ? '<p class="note">Posiciones netas: pueden incluir derivados y apalancamiento, por lo que no suman 100%.</p>' : "") +
        "<dl class=\"facts\" style=\"margin-top:14px\">" +
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
      ["Caída máxima", [f.dd[0], f.dd[1], f.dd[2]], function (v) { return pct(v, false, 1); }],
      ["Asimetría", f.skew, function (v) { return dec(v); }],
      ["Curtosis", f.kurt, function (v) { return dec(v); }]
    ].filter(function (x) { return x[1].some(isNum); });
    if (rows.length) {
      html += '<section class="block"><h3>Riesgo</h3><table class="rtable"><thead><tr><th scope="col"></th><th scope="col">1 año</th><th scope="col">3 años</th><th scope="col">5 años</th></tr></thead><tbody>' +
        rows.map(function (x) { return "<tr><td>" + x[0] + "</td>" + x[1].map(function (v) { return '<td class="num">' + x[2](v) + "</td>"; }).join("") + "</tr>"; }).join("") +
        "</tbody></table><dl class=\"facts\" style=\"margin-top:10px\">" +
        (isNum(f.dd[4]) ? fact("Caída máxima histórica", pct(f.dd[4], false, 1)) : "") +
        (isNum(f.alpha) ? fact("Alpha 3 años", dec(f.alpha)) : "") + (isNum(f.beta) ? fact("Beta 3 años", dec(f.beta)) : "") +
        (isNum(f.r2) ? fact("R² 3 años", dec(f.r2, 1)) : "") +
        (isNum(f.rmed) ? fact("Rentabilidad media 3 años", pct(f.rmed, false, 2)) : "") +
        (f.score && isNum(f.score[3]) ? fact("Score", dec(f.score[3]) + ' <span class="muted">(1A ' + dec(f.score[0]) + " · 3A " + dec(f.score[1]) + " · 5A " + dec(f.score[2]) + ")</span>") : "") +
        (f.mrent ? fact("Rentabilidad Morningstar", esc(f.mrent)) : "") + (f.mris ? fact("Riesgo Morningstar", esc(f.mris)) : "") + "</dl></section>";
    }

    // Específico por tipo
    if (f.t === "rf" && (isNum(f.dur) || isNum(f.vto) || f.cal)) {
      html += '<section class="block"><h3>Cartera de bonos</h3><dl class="facts">' +
        (isNum(f.dur) ? fact("Duración, años", dec(f.dur, 1)) : "") + (isNum(f.vto) ? fact("Vencimiento medio, años", dec(f.vto, 1)) : "") +
        (f.cal ? fact("Calidad crediticia media", esc(f.cal)) : "") + "</dl></section>";
    }
    if (f.t === "rv" && (f.cap.some(isNum) || f.reg || f.sec || isNum(f.per))) {
      var cl = ["Gigante", "Grande", "Mediana", "Pequeña", "Micro"], capm = Math.max.apply(null, f.cap.map(function (v) { return isNum(v) ? v : 0; })) || 1;
      html += '<section class="block"><h3>Estilo de la cartera</h3>' + (f.cap.some(isNum) ? '<div class="bars">' + f.cap.map(function (v, i) {
        return isNum(v) ? bar(cl[i], v, capm, "", pct(v, false, 1)) : "";
      }).join("") + "</div>" : "") + '<dl class="facts" style="margin-top:14px">' +
        (isNum(f.per) ? fact("PER", dec(f.per, 1)) : "") + (isNum(f.pcf) ? fact("Precio / flujo de caja", dec(f.pcf, 1)) : "") +
        (isNum(f.gro) ? fact("Crecimiento esperado", pct(f.gro, false, 1)) : "") +
        (f.reg ? fact("Región principal", esc(f.reg[0]) + " " + pct(f.reg[1], false, 1)) : "") +
        (f.sec ? fact("Sector principal", esc(f.sec[0]) + " " + pct(f.sec[1], false, 1)) : "") + "</dl></section>";
    }

    // Evolución reciente
    html += '<section class="block"><h3>Evolución reciente</h3><dl class="facts">' +
      [["1 día", r.d1], ["1 semana", r.w1], ["1 mes", r.m1], ["3 meses", r.m3], ["6 meses", r.m6]].map(function (x) {
        return fact(x[0], ret(x[1]));
      }).join("") + "</dl></section>";

    // Datos generales
    html += '<section class="block"><h3>Datos generales</h3><dl class="facts">' +
      fact("Categoría Morningstar", esc(f.c)) + fact("Gestora", esc(f.g)) +
      (f.stars ? fact("Rating Morningstar", stars(f.stars)) : "") +
      (f.cost ? fact("Coste neto", esc(f.cost)) : "") + (f.cre ? fact("Fecha de creación", esc(f.cre)) : "") +
      (f.aum ? fact("Patrimonio del fondo", money(f.aum)) : "") +
      (f.aumc ? fact("Patrimonio de la clase", money(f.aumc)) : "") +
      (f.nav ? fact("Valor liquidativo", money2(f.nav) + ' <span class="muted">(' + esc(f.nd) + ")</span>") : "") + "</dl></section>";

    var cm = (window.COMMENTS && window.COMMENTS[f.id]) || [];
    html += '<section class="block" style="margin-top:28px"><h3>Comentarios de la gestora</h3>' + (cm.length
      ? cm.map(function (c) { return '<div class="comment"><p class="cm-h"><b>' + esc(c.d || "") + "</b>" + (c.s ? " · " + esc(c.s) : "") + '</p><p class="cm-t">' + esc(c.t || "") + "</p></div>"; }).join("")
      : '<p class="muted">Todavía no hay comentarios de la gestora para este fondo.</p>') + "</section>";
    html += "</div>" + footer(f.t);
    app.innerHTML = html;
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
    hi: "w1 m1 m3 m6 ytd y1 y3 y5 y10 rmed sh1 sh3 sh5 so1 so3 so5 mar1 mar3 mar5 alpha score ddmax worst1 pos1".split(" "),
    lo: "vol1 vol3 vol5 cost".split(" ")
  };
  var CMP_MAX = 4;
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

  function viewCompare(raw) {
    setTitle("Comparador de fondos");
    var ids = (raw ? raw.split(",") : []).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } })
      .filter(function (id, i, a) { return byId(id) && a.indexOf(id) === i; }).slice(0, CMP_MAX);
    var fs = ids.map(byId);
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Comparador de fondos</h1>' +
      '<p class="sub">Elige entre 2 y ' + CMP_MAX + ' fondos para ver sus métricas una al lado de otra. En cada fila se marca el mejor valor.</p>';
    h += '<div class="sel">' + fs.map(function (f, i) {
      var rest = ids.filter(function (x) { return x !== f.id; });
      return '<a class="selchip" href="' + hashFor(rest) + '" style="--c:' + CMP_COLORS[i] + '" title="Quitar de la comparación">' + esc(f.n) + " <b>×</b></a>";
    }).join("") + "</div>";
    if (ids.length < CMP_MAX) {
      h += '<div class="search tight">' + icon() + '<input id="cq" type="search" autocomplete="off" placeholder="Añadir fondo por nombre o ISIN" aria-label="Añadir fondo"></div><div class="results" id="cres"></div>';
    }
    h += fs.length >= 2 ? cmpTable(fs) + cmpChart(fs) : '<p class="muted" style="margin-top:20px">Añade al menos 2 fondos para compararlos.</p>';
    app.innerHTML = h + footer("rv");
    if (fs.length >= 2) { var cb = printBar(function () { return ["Comparativa de fondos", fs.map(function (f) { return f.n; }).join(", ")]; }); var tb = document.createElement("div"); tb.className = "row tools2"; tb.appendChild(cb); app.appendChild(tb); }
    var cq = document.getElementById("cq");
    if (cq) cq.addEventListener("input", function () {
      var v = cq.value.trim(), res = document.getElementById("cres");
      res.innerHTML = v ? pickList(v, ids, function (f) {
        return '<a href="' + hashFor(ids.concat(f.id)) + '">' + esc(f.n) + "<small>" + esc(f.g) + " · " + esc(f.c) + "</small></a>";
      }) : "";
    });
  }

  function cmpTable(fs) {
    var n = fs.length, rows = "";
    var head = "<tr><th scope=\"col\"></th>" + fs.map(function (f, i) {
      return '<th scope="col" class="ch"><a href="#/fondo/' + encodeURIComponent(f.id) + '" style="--c:' + CMP_COLORS[i] + '"><i></i>' + esc(f.n) + "</a><small>" + esc(f.g) + "</small></th>";
    }).join("") + "</tr>";
    function textRow(label, fn) { return "<tr><td>" + label + "</td>" + fs.map(function (f) { return "<td>" + fn(f) + "</td>"; }).join("") + "</tr>"; }
    rows += '<tr class="grp"><td colspan="' + (n + 1) + '">General</td></tr>' +
      textRow("Categoría Morningstar", function (f) { return '<span class="cat">' + esc(f.c) + "</span>"; }) +
      textRow("Rating Morningstar", function (f) { return f.stars ? stars(f.stars) : '<span class="muted">–</span>'; }) +
      textRow("Patrimonio de la clase", function (f) { return f.aumc ? money(f.aumc) : "–"; });
    GROUPS.forEach(function (g) {
      var ms = METRICS.filter(function (m) {
        return m.g === g && fs.some(function (f) { var v = m.v(f); return m.txt ? !!v : isNum(v); });
      });
      if (!ms.length) return;
      rows += '<tr class="grp"><td colspan="' + (n + 1) + '">' + g + "</td></tr>";
      ms.forEach(function (m) {
        var vals = fs.map(function (f) { return m.v(f); });
        var dir = BETTER.hi.indexOf(m.k) !== -1 ? 1 : BETTER.lo.indexOf(m.k) !== -1 ? -1 : 0;
        var nums = m.txt ? [] : vals.filter(isNum), best = null;
        if (dir && nums.length > 1) best = dir > 0 ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
        rows += "<tr><td>" + esc(m.l) + "</td>" + fs.map(function (f, i) {
          return '<td' + (best !== null && vals[i] === best ? ' class="best"' : "") + ">" + cell(f, m) + "</td>";
        }).join("") + "</tr>";
      });
    });
    return '<div class="table-wrap cmp"><table><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
  }

  function cmpChart(fs) {
    var vals = [];
    YEARS.forEach(function (y) { fs.forEach(function (f) { var v = annOf(f, y); if (v !== null) vals.push(v); }); });
    if (!vals.length) return "";
    var W = 820, H = 320, L = 48, R = 12, T = 14, B = 34;
    var lo = Math.min(0, Math.min.apply(null, vals)) * 1.1, hi = Math.max(0.1, Math.max.apply(null, vals) * 1.1);
    function Y(v) { return H - B - (v - lo) / (hi - lo) * (H - T - B); }
    var gw = (W - L - R) / YEARS.length, bw = Math.min(24, gw * 0.8 / fs.length), g = "", t = ticks(lo, hi, 5), d = dd(t);
    t.forEach(function (v) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + (v === 0 ? "#bdbdbd" : "#e0e0e0") + '"/>' +
        '<text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" fill="#717171" font-size="11">' + nf(v, d) + "%</text>";
    });
    YEARS.forEach(function (y, gi) {
      var x0 = L + gi * gw + (gw - bw * fs.length) / 2;
      fs.forEach(function (f, i) {
        var v = annOf(f, y);
        if (v === null) return;
        var top = Y(Math.max(v, 0)), hgt = Math.max(1, Math.abs(Y(v) - Y(0)));
        g += '<rect x="' + (x0 + i * bw).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="2" fill="' + CMP_COLORS[i] + '"><title>' + esc(f.n) + " " + yearLabel(y) + ": " + pct(v, true, 1) + "</title></rect>";
      });
      g += '<text x="' + (L + gi * gw + gw / 2) + '" y="' + (H - 12) + '" text-anchor="middle" fill="#717171" font-size="11">' + esc(yearLabel(y)) + "</text>";
    });
    return '<div class="chart-card" style="margin-top:22px"><p class="label">Rentabilidad por año</p><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Rentabilidad por año de los fondos comparados">' + g + "</svg>" +
      '<div class="legend">' + fs.map(function (f, i) { return '<span><i style="background:' + CMP_COLORS[i] + '"></i>' + esc(f.n) + "</span>"; }).join("") + "</div></div>";
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
    return { id: uid(), name: o.name.slice(0, 80) || "Cartera", amount: a !== null && a > 0 ? a : null, lines: lines };
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
    h += '<div class="row tools2"><button class="btn ghost" type="button" id="pfexp"' + (PF.length ? "" : " disabled") + '>Exportar todas</button>' +
      '<label class="btn ghost" for="pfimp">Importar</label><input id="pfimp" type="file" accept="application/json,.json" hidden></div><p class="note" id="pfmsg"></p>';
    app.innerHTML = h + footer("rv");

    document.getElementById("newpf").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("npn").value.trim();
      if (!name) return;
      var a = parseNum(document.getElementById("npa").value), p = { id: uid(), name: name, amount: a !== null && a > 0 ? a : null, lines: [] };
      PF.push(p); savePf();
      location.hash = "#/cartera/" + encodeURIComponent(p.id);
    });
    document.getElementById("pfexp").addEventListener("click", function () {
      download("carteras-cuaderno-de-fondos.json", JSON.stringify({ version: 1, carteras: PF }, null, 1), "application/json");
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
      '<div class="search tight">' + icon() + '<input id="pq" type="search" autocomplete="off" placeholder="Añadir fondo por nombre o ISIN" aria-label="Añadir fondo a la cartera"></div><div class="results" id="pres"></div>' +
      '<div id="pftable"></div><div id="pfsum"></div>' +
      '<div class="row tools2"><a class="btn ghost" id="pfcmp" href="#/comparar">Comparar fondos</a>' +
      '<button class="btn ghost" type="button" id="pfcsv">Exportar CSV</button>' +
      '<span id="pfpdfslot"></span>' +
      '<button class="btn ghost" type="button" id="pfdup">Duplicar</button>' +
      '<button class="btn ghost danger" type="button" id="pfdel">Eliminar cartera</button></div>';
    app.innerHTML = h + footer("rv");

    var pdfb = printBar(function () { var nm = document.getElementById("pfname"); var am = document.getElementById("pfamt"); return ["Cartera: " + (nm && nm.value || p.name), (am && am.value ? nf(+am.value, 0) + " €" : "Sin importe indicado")]; });
    document.getElementById("pfpdfslot").replaceWith(pdfb);
    function save() { savePf(); }
    function renderTable() {
      var t = document.getElementById("pftable");
      if (!p.lines.length) { t.innerHTML = '<div class="table-wrap" style="margin-top:14px"><div class="empty">Busca un fondo arriba y añádelo para empezar.</div></div>'; document.getElementById("pfsum").innerHTML = ""; setCmp(); return; }
      t.innerHTML = '<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th scope="col">Fondo</th><th scope="col">Peso %</th><th scope="col">Importe</th><th scope="col">Año</th><th scope="col">1 año</th><th scope="col">Vol. 1 año</th><th scope="col">Sharpe 1 año</th><th scope="col">Aporta al año</th><th scope="col"><span class="sr">Quitar</span></th></tr></thead><tbody>' +
        p.lines.map(function (l, i) {
          var f = byId(l.id);
          return '<tr data-i="' + i + '" class="pfrow"><td class="fund"><a href="#/fondo/' + encodeURIComponent(f.id) + '"><b>' + esc(f.n) + (f.idx ? '<span class="tag">Indexado</span>' : "") + "</b></a><small>" + esc(f.g) + " · " + esc(f.c) + "</small></td>" +
            '<td><input class="inp w" type="number" min="0" max="100" step="0.5" value="' + (l.w || 0) + '" data-w="' + i + '" aria-label="Peso de ' + esc(f.n) + '"></td>' +
            '<td class="num" data-imp="' + i + '"></td><td>' + ret(f.ret.ytd) + "</td><td>" + ret(f.ret.y1) + '</td><td class="num">' + pct(f.vol[0], false, 1) + '</td><td class="num">' + dec(f.sharpe[0]) + '</td><td class="num" data-ap="' + i + '"></td>' +
            '<td><button type="button" class="x" data-del="' + i + '" aria-label="Quitar ' + esc(f.n) + '">×</button></td></tr>';
        }).join("") + '</tbody><tfoot><tr><td><b>Cartera</b></td><td class="num" id="tw"></td><td class="num" id="ti"></td><td id="ty"></td><td id="t1"></td><td class="num" id="tv"></td><td class="num" id="ts"></td><td class="num" id="ta"></td><td></td></tr></tfoot></table></div>';
      t.querySelectorAll("[data-w]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var w = parseNum(inp.value);
          p.lines[+inp.getAttribute("data-w")].w = w === null ? 0 : Math.max(0, Math.min(100, w));
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
      document.getElementById("pfcmp").setAttribute("href", hashFor(ids));
    }
    function refresh() {
      var tot = sumW(p);
      p.lines.forEach(function (l, i) {
        var f = byId(l.id), im = document.querySelector('[data-imp="' + i + '"]'), ap = document.querySelector('[data-ap="' + i + '"]');
        if (im) im.textContent = p.amount ? nf(p.amount * l.w / 100, 0) + " €" : "–";
        if (ap) ap.innerHTML = isNum(f.ret.ytd) ? ret(f.ret.ytd * l.w / 100) : '<span class="muted">–</span>';
      });
      var y = wAvg(p, function (f) { return f.ret.ytd; }), y1 = wAvg(p, function (f) { return f.ret.y1; }),
        v = wAvg(p, function (f) { return f.vol[0]; }), s = wAvg(p, function (f) { return f.sharpe[0]; });
      var q = function (id) { return document.getElementById(id); };
      if (!q("tw")) return;
      q("tw").textContent = nf(tot, 1) + "%";
      q("ti").textContent = p.amount ? nf(p.amount * tot / 100, 0) + " €" : "–";
      q("ty").innerHTML = ret(y.v); q("t1").innerHTML = ret(y1.v);
      q("tv").textContent = pct(v.v, false, 1); q("ts").textContent = dec(s.v);
      q("ta").innerHTML = y.v === null ? "–" : ret(y.v * tot / 100);
      document.getElementById("pfsum").innerHTML = summary(p);
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
    document.getElementById("pfcsv").addEventListener("click", function () {
      var rows = [["ISIN", "Fondo", "Gestora", "Peso (%)", "Importe (EUR)"]].concat(p.lines.map(function (l) {
        var f = byId(l.id);
        return [f.id, f.n, f.g, String(l.w).replace(".", ","), p.amount ? String(Math.round(p.amount * l.w) / 100).replace(".", ",") : ""];
      }));
      var csv = "﻿" + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(";"); }).join("\r\n");
      download((p.name || "cartera").replace(/[^\w\-]+/g, "_") + ".csv", csv, "text/csv;charset=utf-8");
    });
    document.getElementById("pfdup").addEventListener("click", function () {
      var c = cleanPf({ name: p.name + " (copia)", amount: p.amount, lines: p.lines });
      PF.push(c); save(); location.hash = "#/cartera/" + encodeURIComponent(c.id);
    });
    var del = document.getElementById("pfdel");
    del.addEventListener("click", function () {
      if (del.getAttribute("data-sure") !== "1") { del.setAttribute("data-sure", "1"); del.textContent = "Pulsa otra vez para eliminar"; return; }
      PF = PF.filter(function (x) { return x.id !== p.id; }); savePf(); location.hash = "#/carteras";
    });
    renderTable();
  }

  function summary(p) {
    var tot = sumW(p), n = p.lines.length;
    var y = wAvg(p, function (f) { return f.ret.ytd; }), y1 = wAvg(p, function (f) { return f.ret.y1; }),
      v = wAvg(p, function (f) { return f.vol[0]; }), s = wAvg(p, function (f) { return f.sharpe[0]; });
    var h = '<div class="kpis" style="margin-top:26px">' + kpi("Rentabilidad del año", ret(y.v), true) + kpi("Rentabilidad 1 año", ret(y1.v), true) +
      kpi("Volatilidad 1 año", pct(v.v, false, 1)) + kpi("Sharpe 1 año", dec(s.v)) + "</div>";
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
    h += '<section class="block" style="margin-top:26px"><h3>Comprobaciones</h3><ul class="checks">' + ck.map(function (c) { return '<li class="' + c[0] + '"><i></i><span>' + esc(c[1]) + "</span></li>"; }).join("") + "</ul></section>";

    h += '<div class="grid2">';
    // Composición
    var labels = ["Acciones", "Bonos", "Efectivo", "Otros"], colors = ["#851a2e", "#3b3b3b", "#b9b9b9", "#f0c9b0"];
    var mix = [0, 1, 2, 3].map(function (i) { return wAvg(p, function (f) { return f.mix[i]; }).v; });
    if (mix.some(isNum)) {
      var pos = mix.reduce(function (a, x) { return a + (isNum(x) && x > 0 ? x : 0); }, 0) || 1;
      h += '<section class="block"><h3>Composición</h3><div class="stack">' + mix.map(function (x, i) {
        return isNum(x) && x > 0 ? '<i style="width:' + (x / pos * 100).toFixed(2) + "%;background:" + colors[i] + '"></i>' : "";
      }).join("") + '</div><div class="keys">' + mix.map(function (x, i) {
        return isNum(x) && Math.abs(x) >= 0.05 ? '<span style="--c:' + colors[i] + '">' + labels[i] + " <b>" + pct(x, false, 1) + "</b></span>" : "";
      }).join("") + "</div></section>";
    }
    // Por categoría
    var cw = {};
    p.lines.forEach(function (l) { var f = byId(l.id); cw[f.c] = (cw[f.c] || 0) + l.w; });
    var items = Object.keys(cw).map(function (c) { return [c, cw[c]]; }).sort(function (a, b) { return b[1] - a[1]; });
    h += '<section class="block"><h3>Peso por categoría</h3>' + bars(items, Math.max.apply(null, items.map(function (x) { return x[1]; })) || 1, false) + "</section>";
    // Por año
    var yrs = YEARS.map(function (yy) { var a = wAvg(p, function (f) { return annOf(f, yy); }); return a.cov > 0.999 ? [yearLabel(yy), a.v] : null; }).filter(function (x) { return x && isNum(x[1]); });
    if (yrs.length) {
      h += '<section class="block"><h3>Rentabilidad por año</h3>' + bars(yrs, Math.max.apply(null, yrs.map(function (x) { return Math.abs(x[1]); })) || 1, true) +
        '<p class="note">Solo años en los que todos los fondos tienen dato.</p></section>';
    }
    // Métricas ponderadas
    var mw = [["Rentabilidad 3 años", "y3", true], ["Rentabilidad 5 años", "y5", true], ["Volatilidad 3 años", "vol3"], ["Sharpe 3 años", "sh3"], ["Sortino 1 año", "so1"], ["MAR 1 año", "mar1"], ["Coste neto", "cost"]].map(function (x) {
      var m = metric(x[1]), a = wAvg(p, m.v);
      if (a.v === null) return "";
      var txt = x[2] ? pct(a.v, true, 2) : fmtMetric(m, a.v);
      return fact(x[0], txt + (a.cov < 0.999 ? ' <span class="muted">(' + nf(a.cov * 100, 0) + "% del peso)</span>" : ""));
    }).join("");
    if (mw) h += '<section class="block"><h3>Otras métricas ponderadas</h3><dl class="facts">' + mw + "</dl></section>";
    return h + "</div>";
  }

  // ---------- carteras recomendadas ----------
  var PROFILES = [
    { k: "conservador", n: "Conservadora", d: "Predomina la renta fija.", rf: 4, rv: 2, wrf: 70, rfVol: 4, rfNo: /High Yield|Emergente|Alt -|Otros/, rvVol: 16, rvNo: /Sector|Oro|Emergente|Small|Med\/Peq/ },
    { k: "moderado", n: "Moderada", d: "Mitad renta fija, mitad renta variable.", rf: 3, rv: 3, wrf: 50, rfVol: 6, rfNo: /High Yield|Otros/, rvVol: 20, rvNo: /Sector|Oro/ },
    { k: "dinamico", n: "Dinámica", d: "Predomina la renta variable.", rf: 1, rv: 5, wrf: 20, rfVol: 6, rfNo: /High Yield|Otros/, rvNo: /Oro|Recursos|Otros|Infraestructura/ }
  ];
  function rankScore(f) { return (isNum(f.score && f.score[3]) ? f.score[3] : -99) + (f.stars || 0) / 100; }
  function pickBest(t, n, maxVol, no) {
    var seen = {}, out = [];
    ofType(t).filter(function (f) {
      return !f.idx && isNum(f.score && f.score[3]) && !(no && no.test(f.c)) && !(maxVol && !(isNum(f.vol[0]) && f.vol[0] <= maxVol));
    })
      .sort(function (a, b) { return rankScore(b) - rankScore(a); })
      .forEach(function (f) { if (out.length < n && !seen[f.c]) { seen[f.c] = 1; out.push(f); } });
    return out;
  }
  function buildProfile(pr) {
    var rf = pickBest("rf", pr.rf, pr.rfVol, pr.rfNo), rv = pickBest("rv", pr.rv, pr.rvVol, pr.rvNo), lines = [], tot = 0;
    [[rf, pr.wrf], [rv, 100 - pr.wrf]].forEach(function (g) {
      g[0].forEach(function (f) { var w = Math.round(g[1] / g[0].length * 10) / 10; lines.push({ id: f.id, w: w }); tot += w; });
    });
    if (lines.length) lines[lines.length - 1].w = Math.round((lines[lines.length - 1].w + 100 - tot) * 10) / 10;
    return { id: "rec-" + pr.k, name: "Cartera " + pr.n.toLowerCase(), amount: null, lines: lines };
  }
  function viewRecommended() {
    setTitle("Carteras recomendadas");
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Carteras recomendadas</h1>' +
      '<p class="sub">Tres carteras de 6 fondos por perfil, construidas con los datos de la web. Criterio: mejor puntuación Morningstar total (rating como desempate), un fondo por categoría, sin fondos indexados y con un tope de volatilidad a 1 año según el perfil (en la conservadora y la moderada, sin fondos sectoriales ni high yield).</p>' +
      '<p class="note">Propuesta orientativa y automática, no es asesoramiento personalizado. Rentabilidad pasada no garantiza resultados futuros.</p>';
    var built = PROFILES.map(buildProfile);
    PROFILES.forEach(function (pr, i) {
      var p = built[i];
      h += '<section class="rec"><div class="rechead"><div><h2>' + esc(pr.n) + '</h2><p class="muted">' + esc(pr.d) + " " + pr.wrf + "% renta fija, " + (100 - pr.wrf) + '% renta variable.</p></div>' +
        '<button type="button" class="btn" data-copy="' + i + '">Copiar a mis carteras</button></div>' +
        '<div class="table-wrap"><table><thead><tr><th scope="col">Fondo</th><th scope="col">Peso %</th><th scope="col">Año</th><th scope="col">1 año</th><th scope="col">Vol. 1 año</th><th scope="col">Rating</th></tr></thead><tbody>' +
        p.lines.map(function (l) {
          var f = byId(l.id);
          return '<tr><td class="fund"><a href="#/fondo/' + encodeURIComponent(f.id) + '"><b>' + esc(f.n) + "</b></a><small>" + esc(f.g) + " · " + esc(f.c) + "</small></td><td class=\"num\">" + nf(l.w, 1) + "</td><td>" + ret(f.ret.ytd) + "</td><td>" + ret(f.ret.y1) + '</td><td class="num">' + pct(f.vol[0], false, 1) + "</td><td>" + (f.stars ? stars(f.stars) : "–") + "</td></tr>";
        }).join("") + "</tbody></table></div>" + summary(p) + "</section>";
    });
    app.innerHTML = h + footer("rv");
    app.querySelectorAll("[data-copy]").forEach(function (b) {
      b.addEventListener("click", function () {
        var c = cleanPf({ name: built[+b.getAttribute("data-copy")].name, amount: null, lines: built[+b.getAttribute("data-copy")].lines });
        PF.push(c); savePf(); location.hash = "#/cartera/" + encodeURIComponent(c.id);
      });
    });
  }

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
  function bandStyle(r) {
    return "background:linear-gradient(to right,#e0e0e0 0," + r[0] + "%,#f0c9b0 " + r[0] + "%," + r[1] + "%,#e0e0e0 " + r[1] + "%,#e0e0e0 100%)";
  }

  function viewBuild() {
    setTitle("Construir cartera");
    if (!bld) bldReset("moderado", false);
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
      if (b.g !== last) { h += '<p class="label bgl">' + b.g + "</p>"; last = b.g; }
      h += '<div class="bk" id="bk-' + b.k + '"><div class="bkh"><div><b>' + esc(b.n) + "</b>" + (b.d ? "<small>" + esc(b.d) + "</small>" : "") + '</div>' +
        '<div class="bkw"><input class="inp w" type="number" min="0" max="100" step="1" data-n="' + b.k + '" aria-label="Porcentaje de ' + esc(b.n) + '"><span>%</span></div></div>' +
        '<input type="range" min="0" max="100" step="1" class="rng" data-r="' + b.k + '" aria-label="Peso de ' + esc(b.n) + '">' +
        '<p class="bkm"><span data-hq="' + b.k + '"></span><span class="bst" data-st="' + b.k + '"></span></p><div class="cands" id="c-' + b.k + '"></div></div>';
    });
    h += '<div id="btotal"></div><div id="bsum"></div><div class="row tools2"><button type="button" class="btn" id="bsave">Guardar en mis carteras</button>' +
      '<button type="button" class="btn ghost" id="bnorm">Ajustar a 100%</button><button type="button" class="btn ghost" id="breset">Valores del perfil</button></div>';
    app.innerHTML = h + footer("rv");

    function total() { return BUCKETS.reduce(function (a, b) { return a + (bld.w[b.k] || 0); }, 0); }
    function drawBands() {
      var pr = BPROF[bld.profile], rv = RVB.reduce(function (a, k) { return a + (bld.w[k] || 0); }, 0);
      var rf = ["corto", "corp", "hy"].reduce(function (a, k) { return a + (bld.w[k] || 0); }, 0), ot = bld.w.alt || 0;
      var ok = rv >= pr.rv[0] && rv <= pr.rv[1];
      document.getElementById("bbands").innerHTML = '<div class="bband"><div class="stack"><i style="width:' + rf + '%;background:#3b3b3b"></i><i style="width:' + ot + '%;background:#b9b9b9"></i><i style="width:' + rv + '%;background:#851a2e"></i></div>' +
        '<div class="keys"><span style="--c:#3b3b3b">Renta fija <b>' + nf(rf, 0) + '%</b></span><span style="--c:#b9b9b9">Alternativos y mixtos <b>' + nf(ot, 0) + '%</b></span><span style="--c:#851a2e">Renta variable <b>' + nf(rv, 0) + "%</b></span></div>" +
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
      if (!(w > 0)) { bld.sel[b.k] = []; box.innerHTML = ""; return; }
      var cs = candidates(b.k);
      bld.sel[b.k] = bld.sel[b.k].filter(function (id) { return cs.some(function (f) { return f.id === id; }); });
      if (!bld.sel[b.k].length && cs.length) bld.sel[b.k] = [cs[0].id];
      box.innerHTML = cs.length ? '<p class="label">Fondos propuestos (ordenados por puntuación Morningstar)</p>' + cs.map(function (f) {
        var on = bld.sel[b.k].indexOf(f.id) !== -1;
        return '<label class="cand' + (on ? " on" : "") + '"><input type="checkbox" data-f="' + esc(f.id) + '" data-b="' + b.k + '"' + (on ? " checked" : "") + '><span class="ct"><b>' + esc(f.n) + "</b><small>" + esc(f.g) + " · " + esc(f.c) + '</small></span><span class="cm">' + (f.stars ? stars(f.stars) : "") + "<small>Año " + pct(f.ret.ytd, true, 1) + " · 1 a. " + pct(f.ret.y1, true, 1) + " · Vol. " + pct(f.vol[0], false, 1) + "</small></span></label>";
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
      var t = total(), lines = bldLines(), n = lines.length, mf = maxFunds(bld.amount);
      var msgs = [];
      msgs.push([Math.abs(t - 100) < 0.05 ? "ok" : "warn", "Los porcentajes suman " + nf(t, 0) + "%" + (Math.abs(t - 100) < 0.05 ? "." : ", deben sumar 100%.")]);
      var out = BUCKETS.filter(function (b) { var r = BPROF[bld.profile].r[b.k], w = bld.w[b.k] || 0; return w < r[0] || w > r[1]; }).map(function (b) { return b.n; });
      msgs.push([out.length ? "warn" : "ok", out.length ? "Fuera de horquilla: " + out.join(", ") + "." : "Todas las categorías están dentro de su horquilla."]);
      if (mf && mf.n !== null) msgs.push([n <= mf.n ? "ok" : "warn", n + " fondos seleccionados: el máximo para " + nf(bld.amount, 0) + " € es " + mf.n + "."]);
      else msgs.push(["info", n + " fondos seleccionados. Indica el importe para comprobar el máximo."]);
      document.getElementById("btotal").innerHTML = '<section class="block" style="margin-top:22px"><h3>Control</h3><ul class="checks">' + msgs.map(function (m) { return '<li class="' + m[0] + '"><i></i><span>' + esc(m[1]) + "</span></li>"; }).join("") + "</ul></section>";
      drawBands();
      document.getElementById("bsum").innerHTML = n ? summary({ id: "tmp", name: bld.name, amount: bld.amount, lines: lines }) : "";
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
    var s = [], yrs = yearsSince(f.cre), aum = numOf(f.aumc), cost = metric("cost").v(f), ps = posInCat(f);
    if (isNum(yrs)) s.push(yrs < 3 ? "Fondo joven (" + nf(yrs, 1) + " años de historia): sus ratios a varios años aún no son fiables." : "Cuenta con " + nf(yrs, 0) + " años de historia.");
    if (isNum(aum)) s.push(aum < 50 ? "El patrimonio de la clase es pequeño (" + nf(aum, 0) + " M€), lo que puede afectar a la liquidez y a la continuidad." : aum > 1500 ? "Tiene un patrimonio de la clase muy grande (" + nf(aum, 0) + " M€), lo que da estabilidad pero puede limitar la agilidad." : "Patrimonio de la clase de " + nf(aum, 0) + " M€.");
    if (f.t === "rv") {
      if (isNum(f.top10)) s.push(f.top10 > 45 ? "Cartera concentrada: las 10 mayores posiciones pesan el " + nf(f.top10, 0) + "%" + (isNum(f.nEq) ? " en " + nf(f.nEq, 0) + " valores." : ".") : "Cartera diversificada: las 10 mayores posiciones suman el " + nf(f.top10, 0) + "%" + (isNum(f.nEq) ? " en " + nf(f.nEq, 0) + " valores." : "."));
      if (f.reg && f.reg[1] > 55) s.push("Sesgo geográfico a " + f.reg[0] + " (" + nf(f.reg[1], 0) + "%).");
      if (f.sec && f.sec[1] > 30) s.push("Sesgo sectorial a " + f.sec[0].toLowerCase() + " (" + nf(f.sec[1], 0) + "%).");
      if (f.cap && isNum(f.cap[2]) && f.cap[2] + (f.cap[3] || 0) + (f.cap[4] || 0) > 40) s.push("Peso relevante en medianas y pequeñas compañías, con más riesgo y menos liquidez.");
    } else {
      if (isNum(f.dur)) s.push("Duración de " + nf(f.dur, 1) + " años" + (f.dur >= 5 ? ", sensible a los tipos de interés." : f.dur <= 2 ? ", poco sensible a los tipos." : "."));
      if (f.cal) s.push(/^(AAA|AA|A|BBB)$/.test(f.cal) ? "Calidad crediticia media " + f.cal + " (grado de inversión)." : "Calidad crediticia media " + f.cal + ", por debajo de grado de inversión: asume más riesgo de crédito.");
    }
    if (isNum(f.alpha)) s.push(f.alpha >= 2 ? "Gestión que ha aportado valor: alpha de " + nf(f.alpha, 1) + "% sobre su índice a 3 años." : f.alpha <= -1 ? "Ha restado valor frente a su índice a 3 años (alpha de " + nf(f.alpha, 1) + "%)." : "Rinde en línea con su índice a 3 años (alpha de " + nf(f.alpha, 1) + "%).");
    if (isNum(f.r2)) s.push(f.r2 >= 95 ? "Replica casi mecánicamente a su índice (R² de " + nf(f.r2, 0) + "), con poca gestión activa." : f.r2 < 75 ? "Se aparta bastante de su índice (R² de " + nf(f.r2, 0) + "), lo que indica gestión activa y diferenciada." : "");
    if (isNum(f.sharpe[1])) s.push(f.sharpe[1] >= 1 ? "Buena relación rentabilidad riesgo a 3 años (Sharpe " + dec(f.sharpe[1]) + ")." : f.sharpe[1] < 0.3 ? "Relación rentabilidad riesgo débil a 3 años (Sharpe " + dec(f.sharpe[1]) + ")." : "Relación rentabilidad riesgo aceptable a 3 años (Sharpe " + dec(f.sharpe[1]) + ").");
    if (isNum(f.dd && f.dd[4])) s.push("Caída máxima histórica de " + pct(f.dd[4], false, 1) + (isNum(f.pos && f.pos[0]) ? " y " + nf(f.pos[0], 0) + "% de meses positivos en el último año." : "."));
    if (isNum(f.skew && f.skew[0]) && f.skew[0] < -1) s.push("Distribución con colas negativas marcadas: los meses malos pueden ser peores de lo que sugiere la volatilidad.");
    if (isNum(cost)) s.push(cost > 1.8 ? "Coste neto elevado (" + pct(cost, false, 2) + ")." : cost < 0.8 ? "Coste neto bajo (" + pct(cost, false, 2) + ")." : "Coste neto de " + pct(cost, false, 2) + ".");
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
    var n = L.length, info = gcInfo(L), prop = gcPropose(info, pr, tot), cost = metric("cost").v;
    function kp(lines) {
      var q = { lines: lines }, g = function (fn) { return wAvg(q, fn).v; };
      return { y: g(function (f) { return f.ret.ytd; }), y1: g(function (f) { return f.ret.y1; }), y3: g(function (f) { return f.ret.y3; }), v: g(function (f) { return f.vol[0]; }), s: g(function (f) { return f.sharpe[0]; }), c: g(cost), sc: g(function (f) { return f.score && f.score[3]; }) };
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

    var h = '<div class="kpis" style="margin-top:26px">' + kpi("Importe total", nf(tot, 0) + " €", true) + kpi("Rentabilidad del año", ret(a.y), true) + kpi("Rentabilidad 1 año", ret(a.y1)) + kpi("Volatilidad 1 año", pct(a.v, false, 1)) + kpi("Sharpe 1 año", dec(a.s)) + kpi("Coste neto medio", isNum(a.c) ? pct(a.c, false, 2) : "–") + "</div>" +
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
    if (isNum(a.c)) (a.c <= 1.5 ? good : bad).push(a.c <= 1.5 ? "El coste neto medio (" + pct(a.c, false, 2) + ") es contenido." : "El coste neto medio (" + pct(a.c, false, 2) + ") es elevado; conviene comprobar si compensa con la rentabilidad.");
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
    var pn = prop.lines.length, cmpRows = [["Rentabilidad del año", ret(a.y), ret(b.y)], ["Rentabilidad 1 año", ret(a.y1), ret(b.y1)], ["Rentabilidad 3 años", ret(a.y3), ret(b.y3)], ["Volatilidad 1 año", pct(a.v, false, 1), pct(b.v, false, 1)], ["Sharpe 1 año", dec(a.s), dec(b.s)], ["Coste neto medio", isNum(a.c) ? pct(a.c, false, 2) : "–", isNum(b.c) ? pct(b.c, false, 2) : "–"], ["Puntuación Morningstar media", dec(a.sc), dec(b.sc)], ["Número de fondos", String(n), String(pn)]];
    var gone = info.filter(function (o) { return o.v === "Sustituir" && o.alt; }).map(function (o) { return o.l.name; });
    h += '<h2 class="gh">4. Cartera propuesta</h2><div class="grid2"><section class="block"><h3>Composición propuesta</h3><div class="table-wrap"><table><thead><tr><th scope="col">Fondo</th><th scope="col">Peso</th><th scope="col">Importe</th></tr></thead><tbody>' +
      prop.lines.map(function (x) { var f = byId(x.id); return '<tr><td class="fund"><a href="#/fondo/' + encodeURIComponent(f.id) + '"><b>' + esc(f.n) + "</b></a><small>" + esc(f.g) + " · " + esc(bname(bucketOf(f))) + (x.notes.length ? " · " + esc(x.notes.join("; ")) : "") + '</small></td><td class="num">' + nf(x.w, 1) + '%</td><td class="num">' + (tot ? nf(tot * x.w / 100, 0) + " €" : "–") + "</td></tr>"; }).join("") +
      '</tbody></table></div></section><section class="block"><h3>Antes y después</h3><div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Actual</th><th scope="col">Propuesta</th></tr></thead><tbody>' +
      cmpRows.map(function (r) { return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td><b>" + r[2] + "</b></td></tr>"; }).join("") + '</tbody></table></div><p class="note">Los cambios se hacen manteniendo el peso de cada categoría dentro de la horquilla del perfil y sustituyendo solo los fondos marcados. Para el traspaso, calcula las participaciones por fondo.</p></section></div>' +
      '<div class="row tools2"><button type="button" class="btn" id="gcsave">Guardar propuesta en mis carteras</button><button type="button" class="btn ghost" id="gcprint">Descargar informe en PDF</button></div>' +
      '<p class="note">Análisis automático y orientativo con datos de Morningstar y reglas propias. Antes de proponer nada al cliente hay que revisar su idoneidad, su horizonte y su fiscalidad, y las plusvalías latentes que genere cada traspaso.</p>';
    h += gcTransfersHtml(L, prop, tot) + gcStressHtml(L, prop, tot, pr);
    gcLast = { prop: prop, tot: tot };
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
  function viewStocks() {
    setTitle("Acciones MarketSurge");
    var all = stocks();
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Acciones MarketSurge</h1>' +
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
      b.innerHTML = list.length ? '<div class="table-wrap"><table><thead><tr>' + th("n", "Acción") + th("g", "Grupo industrial") + STCOLS.map(function (c) { return th(c[0], c[1]); }).join("") + th("f", "Ficha") + "</tr></thead><tbody>" +
        list.map(function (s) {
          return '<tr data-t="' + esc(s.t) + '" tabindex="0"><td class="fund"><b>' + esc(s.n) + "</b><small>" + esc(s.t) + '</small></td><td class="muted">' + esc(s.g || "–") + "</td>" + STCOLS.map(function (c) { return "<td>" + rcell(c[0], s[c[0]]) + "</td>"; }).join("") + '<td class="muted">' + esc(s.f || "–") + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<div class="table-wrap"><div class="empty">Sin resultados</div></div>';
      b.querySelectorAll("[data-ss]").forEach(function (x) { x.addEventListener("click", function () { var k = x.getAttribute("data-ss"); if (ST.sort === k) ST.dir = -ST.dir; else { ST.sort = k; ST.dir = k === "n" || k === "g" ? 1 : -1; } draw(); }); });
      b.querySelectorAll("tbody tr").forEach(function (tr) { function go() { location.hash = "#/accion/" + encodeURIComponent(tr.getAttribute("data-t")); } tr.addEventListener("click", go); tr.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); }); });
    }
    draw();
  }
  function viewStock(t) {
    var s = stockBy(t);
    if (!s) { viewNotFound(); return; }
    setTitle(s.n);
    var h = '<div class="topbar"><a href="#/acciones">← Acciones</a></div><div class="fhead"><h1>' + esc(s.n) + '</h1><p class="muted">' + esc(s.t) + (s.g ? " · " + esc(s.g) : "") + (s.px != null ? " · Precio " + dec(s.px) : "") + (s.f ? " · Ficha del " + esc(s.f) : "") + "</p></div>" +
      '<div class="kpis kp6">' + STCOLS.map(function (c) { return kpi(c[1], rcell(c[0], s[c[0]])); }).join("") + "</div>" +
      '<div class="grid2" style="margin-top:22px"><section class="block"><h3>Bloque técnico</h3>' +
      ((s.tec && s.tec.length) ? '<dl class="facts">' + s.tec.map(function (r) { return fact(r[0], esc(r[1])); }).join("") + "</dl>" : "") +
      (s.tecTxt ? '<p class="stxt">' + esc(s.tecTxt) + "</p>" : "") + (!(s.tec && s.tec.length) && !s.tecTxt ? '<p class="muted">Sin datos técnicos.</p>' : "") +
      '</section><section class="block"><h3>Bloque cliente</h3><p class="stxt">' + esc(s.cli || "Sin texto para el cliente.") + "</p></section></div>" +
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

  // ---------- router ----------
  function route() {
    var h = (location.hash || "#/").replace(/^#/, ""), p = h.split("/").filter(Boolean);
    window.scrollTo(0, 0);
    if (!p.length) return viewHome();
    if ((p[0] === "rf" || p[0] === "rv") && !p[1]) return viewList(p[0]);
    if ((p[0] === "rf" || p[0] === "rv") && p[1] === "resumen") return viewOverview(p[0]);
    if (p[0] === "fondo" && p[1]) return viewFund(decodeURIComponent(p[1]));
    if (p[0] === "comparar") return viewCompare(p[1]);
    if (p[0] === "carteras") return viewPortfolios();
    if (p[0] === "acciones") return viewStocks();
    if (p[0] === "agenda") return viewAgenda();
    if (p[0] === "accion" && p[1]) return viewStock(decodeURIComponent(p[1]));
    if (p[0] === "gestion") return viewGestion();
    if (p[0] === "construir") return viewBuild();
    if (p[0] === "categorias") return viewCategories(p[1]);
    if (p[0] === "recomendadas") return viewRecommended();
    if (p[0] === "cartera" && p[1]) return viewPortfolio(decodeURIComponent(p[1]));
    return viewNotFound();
  }
  window.addEventListener("hashchange", route);
  route();
})();
