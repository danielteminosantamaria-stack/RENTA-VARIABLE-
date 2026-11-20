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
  function viewHome() {
    setTitle("");
    app.innerHTML =
      '<header class="hero"><h1>Cuaderno de fondos</h1></header>' +
      '<div class="cards">' +
      ["rf", "rv"].map(function (t) {
        return '<a class="cat-card" href="#/' + t + '"><div class="row"><div><small>Fondos de</small><h2>' +
          esc(CATS[t].card) + '</h2></div><span class="count">' + ofType(t).length + ' fondos</span></div>' +
          '<span class="arrow" aria-hidden="true">→</span></a>';
      }).join("") + "</div>" +
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
  var state = { rf: { view: "list", g: null, q: "", sort: "n", dir: 1 }, rv: { view: "list", g: null, q: "", sort: "n", dir: 1 } };

  function cols(t) {
    var common = [
      { k: "ytd", l: "Año", v: function (f) { return f.ret.ytd; }, r: function (f) { return ret(f.ret.ytd); } },
      { k: "y1", l: "1 año", v: function (f) { return f.ret.y1; }, r: function (f) { return ret(f.ret.y1); } },
      { k: "y3", l: "3 años", v: function (f) { return f.ret.y3; }, r: function (f) { return ret(f.ret.y3); } },
      { k: "y5", l: "5 años", v: function (f) { return f.ret.y5; }, r: function (f) { return ret(f.ret.y5); } },
      { k: "y10", l: "10 años", v: function (f) { return f.ret.y10; }, r: function (f) { return ret(f.ret.y10); } }
    ];
    var vol = { k: "vol", l: "Vol. 1 año", v: function (f) { return f.vol[0]; }, r: function (f) { return '<span class="num">' + pct(f.vol[0], false, 1) + "</span>"; } };
    if (t === "rf") {
      return [
        { k: "dur", l: "Dur.", v: function (f) { return f.dur; }, r: function (f) { return '<span class="num muted">' + dec(f.dur, 1) + "</span>"; } },
        { k: "cal", l: "Calidad", v: function (f) { return f.cal; }, r: function (f) { return '<span class="muted">' + esc(f.cal || "–") + "</span>"; } }
      ].concat(common, [vol]);
    }
    return common.concat([vol]);
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
      '<div class="topbar"><a href="#/">← Inicio</a><a class="brand" href="#/">Cuaderno de fondos</a></div>' +
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
      '<input id="q" type="search" placeholder="Buscar por nombre o ISIN" value="' + esc(s.q) + '" aria-label="Buscar fondo" autocomplete="off"></div></div>' +
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
    renderBody(t);
  }

  function renderBody(t) {
    var s = state[t], body = document.getElementById("body");
    var list = filtered(t);
    if (!list.length) { body.innerHTML = '<div class="table-wrap"><div class="empty">Sin resultados</div></div>'; return; }
    if (s.view === "chart") { body.innerHTML = chart(t, list); bindChart(t); return; }
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
  function chart(t, list) {
    var pts = list.filter(function (f) { return isNum(f.vol[0]) && isNum(f.ret.y1); });
    if (!pts.length) return '<div class="table-wrap"><div class="empty">No hay datos suficientes para el gráfico</div></div>';
    var W = 820, H = 440, L = 54, R = 18, T = 18, B = 46;
    var xs = pts.map(function (f) { return f.vol[0]; }), ys = pts.map(function (f) { return f.ret.y1; });
    var x0 = 0, x1 = Math.max.apply(null, xs) * 1.08, y0 = Math.min(0, Math.min.apply(null, ys)) * 1.1, y1 = Math.max.apply(null, ys) * 1.1;
    if (y1 === y0) y1 = y0 + 1;
    function X(v) { return L + (v - x0) / (x1 - x0) * (W - L - R); }
    function Y(v) { return H - B - (v - y0) / (y1 - y0) * (H - T - B); }
    var g = "";
    ticks(y0, y1, 5).forEach(function (v) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#242427"/>' +
        '<text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" fill="#8d8d94" font-size="11">' + nf(v, 0) + "%</text>";
    });
    ticks(x0, x1, 6).forEach(function (v) {
      g += '<text x="' + X(v) + '" y="' + (H - B + 18) + '" text-anchor="middle" fill="#8d8d94" font-size="11">' + nf(v, 0) + "%</text>";
    });
    g += '<text x="' + (L + (W - L - R) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" fill="#8d8d94" font-size="11">Volatilidad 1 año</text>';
    g += '<text transform="translate(14 ' + (T + (H - T - B) / 2) + ') rotate(-90)" text-anchor="middle" fill="#8d8d94" font-size="11">Rentabilidad 1 año</text>';
    pts.forEach(function (f) {
      g += '<circle class="dot' + (f.g === "Renta 4" ? " r4" : "") + '" tabindex="0" role="link" aria-label="' + esc(f.n) + '" data-id="' + esc(f.id) +
        '" cx="' + X(f.vol[0]).toFixed(1) + '" cy="' + Y(f.ret.y1).toFixed(1) + '" r="5.5"/>';
    });
    return '<div class="chart-card"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Rentabilidad a 1 año frente a volatilidad">' + g + "</svg>" +
      '<div class="tip" id="tip"></div>' +
      '<div class="legend"><span><i></i>Fondos</span><span><i style="background:var(--pos)"></i>Renta 4</span><span>' + pts.length + " de " + list.length + " fondos con datos</span></div></div>";
  }
  function bindChart() {
    var card = document.querySelector(".chart-card"), tip = document.getElementById("tip");
    if (!card) return;
    card.querySelectorAll(".dot").forEach(function (d) {
      var f = byId(d.getAttribute("data-id"));
      function show(e) {
        var box = card.getBoundingClientRect(), r = d.getBoundingClientRect();
        tip.innerHTML = "<b>" + esc(f.n) + "</b><br>" + esc(f.g) + "<br>1 año " + pct(f.ret.y1, true) + " · Vol. " + pct(f.vol[0], false, 1);
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
      '<div class="topbar"><a href="#/' + t + '">← ' + esc(CATS[t].title) + '</a><a class="brand" href="#/">Cuaderno de fondos</a></div>' +
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
    html += '<div class="topbar"><a href="#/' + f.t + '">← ' + esc(CATS[f.t].title) + '</a><a class="brand" href="#/">Cuaderno de fondos</a></div>';
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
    if (docs.length) html += '<div class="docs">' + docs.join("") + "</div>";

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
    var mix = f.mix, labels = ["Acciones", "Bonos", "Efectivo", "Otros"], colors = ["#c9c9cf", "#7fb996", "#6f8fb5", "#8d8d94"];
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
      ["Peor mes", f.worst, function (v) { return pct(v, false, 1); }],
      ["Meses en positivo", f.pos, function (v) { return pct(v, false, 0); }],
      ["Caída máxima", [f.dd[0], f.dd[1], f.dd[2]], function (v) { return pct(v, false, 1); }]
    ].filter(function (x) { return x[1].some(isNum); });
    if (rows.length) {
      html += '<section class="block"><h3>Riesgo</h3><table class="rtable"><thead><tr><th scope="col"></th><th scope="col">1 año</th><th scope="col">3 años</th><th scope="col">5 años</th></tr></thead><tbody>' +
        rows.map(function (x) { return "<tr><td>" + x[0] + "</td>" + x[1].map(function (v) { return '<td class="num">' + x[2](v) + "</td>"; }).join("") + "</tr>"; }).join("") +
        "</tbody></table><dl class=\"facts\" style=\"margin-top:10px\">" +
        (isNum(f.dd[4]) ? fact("Caída máxima histórica", pct(f.dd[4], false, 1)) : "") +
        (isNum(f.alpha) ? fact("Alpha 3 años", dec(f.alpha)) : "") + (isNum(f.beta) ? fact("Beta 3 años", dec(f.beta)) : "") +
        (isNum(f.r2) ? fact("R² 3 años", dec(f.r2, 1)) : "") + "</dl></section>";
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

    // Datos generales
    html += '<section class="block"><h3>Datos generales</h3><dl class="facts">' +
      fact("Categoría Morningstar", esc(f.c)) + fact("Gestora", esc(f.g)) +
      (f.stars ? fact("Rating Morningstar", stars(f.stars)) : "") +
      (f.cost ? fact("Coste neto", esc(f.cost)) : "") + (f.cre ? fact("Fecha de creación", esc(f.cre)) : "") +
      (f.aum ? fact("Patrimonio del fondo", money(f.aum)) : "") +
      (f.aumc ? fact("Patrimonio de la clase", money(f.aumc)) : "") +
      (f.nav ? fact("Valor liquidativo", money2(f.nav) + ' <span class="muted">(' + esc(f.nd) + ")</span>") : "") + "</dl></section>";

    html += "</div>" + footer(f.t);
    app.innerHTML = html;
  }

  function viewNotFound() {
    setTitle("No encontrado");
    app.innerHTML = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>No encontrado</h1><p class="muted">Este fondo no está en el cuaderno.</p>';
  }

  // ---------- router ----------
  function route() {
    var h = (location.hash || "#/").replace(/^#/, ""), p = h.split("/").filter(Boolean);
    window.scrollTo(0, 0);
    if (!p.length) return viewHome();
    if ((p[0] === "rf" || p[0] === "rv") && !p[1]) return viewList(p[0]);
    if ((p[0] === "rf" || p[0] === "rv") && p[1] === "resumen") return viewOverview(p[0]);
    if (p[0] === "fondo" && p[1]) return viewFund(decodeURIComponent(p[1]));
    return viewNotFound();
  }
  window.addEventListener("hashchange", route);
  route();
})();
