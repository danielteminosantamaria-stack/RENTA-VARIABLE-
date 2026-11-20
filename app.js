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
    if (w.length === 1) return w[0].slice(0, 2);
    return (w[0][0] + w[1][0]).toUpperCase();
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
  function setTitle(t) { document.title = t ? t + " · Cuaderno de fondos" : "Cuaderno de fondos"; }

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
      '<header class="hero"><h1>Cuaderno de fondos</h1><p>Rentabilidad, riesgo y ratios de los fondos en seguimiento, con datos de Morningstar.</p></header>' +
      '<div class="cards">' +
      ["rf", "rv"].map(function (t) {
        return '<a class="cat-card" href="#/' + t + '"><div class="row"><div><small>Fondos de</small><h2>' +
          esc(CATS[t].card) + '</h2></div><span class="count">' + ofType(t).length + ' fondos</span></div>' +
          '<span class="arrow" aria-hidden="true">→</span></a>';
      }).join("") + "</div>" +
      '<div class="cards" style="margin-top:14px">' +
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
          '<span class="mono" aria-hidden="true">' + esc(initials(g)) + "</span><span><b>" + esc(g) + "</b><small>" +
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
    app.innerHTML = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>No encontrado</h1><p class="muted">Este fondo no está en el cuaderno.</p>';
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
      '<p class="sub">Crea carteras con fondos del cuaderno y sigue su rentabilidad y riesgo. Las carteras se guardan solo en este navegador, no se envían a ningún sitio. Usa Exportar para guardar una copia.</p>';
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
      '<button class="btn ghost" type="button" id="pfdup">Duplicar</button>' +
      '<button class="btn ghost danger" type="button" id="pfdel">Eliminar cartera</button></div>';
    app.innerHTML = h + footer("rv");

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
      '<p class="sub">Tres carteras de 6 fondos por perfil, construidas con los datos del cuaderno. Criterio: mejor puntuación Morningstar total (rating como desempate), un fondo por categoría, sin fondos indexados y con un tope de volatilidad a 1 año según el perfil (en la conservadora y la moderada, sin fondos sectoriales ni high yield).</p>' +
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
    if (p[0] === "recomendadas") return viewRecommended();
    if (p[0] === "cartera" && p[1]) return viewPortfolio(decodeURIComponent(p[1]));
    return viewNotFound();
  }
  window.addEventListener("hashchange", route);
  route();
})();
