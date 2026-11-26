/* Buscador global y página de gestora. */
(function () {
  "use strict";
  var FUNDS = (window.DATA && window.DATA.funds) || [];
  function UI() { return window.CFUI || {}; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function stocks() { return window.STOCKS || []; }
  function fundBy(id) { for (var i = 0; i < FUNDS.length; i++) if (FUNDS[i].id === id) return FUNDS[i]; return null; }
  function stockBy(t) { var S = stocks(); for (var i = 0; i < S.length; i++) if (S[i].t === t) return S[i]; return null; }

  // ---------- tabla de fondos reutilizable ----------
  var COLS = [
    ["m1", "Mes", function (f) { return f.ret && f.ret.m1; }, "ret"],
    ["ytd", "Año", function (f) { return f.ret && f.ret.ytd; }, "ret"],
    ["y1", "1 año", function (f) { return f.ret && f.ret.y1; }, "ret"],
    ["y3", "3 años", function (f) { return f.ret && f.ret.y3; }, "ret"],
    ["sh", "Sharpe 1a", function (f) { return f.sharpe && f.sharpe[0]; }, "dec"],
    ["vol", "Vol. 1a", function (f) { return f.vol && f.vol[0]; }, "pct"]
  ];
  function cellOf(c, f) {
    var u = UI(), v = c[2](f);
    if (c[3] === "ret") return u.ret ? u.ret(v) : "–";
    if (c[3] === "dec") return u.dec ? u.dec(v) : "–";
    return u.pct ? u.pct(v, false, 1) : "–";
  }
  function fundTable(list, st, redraw) {
    var u = UI();
    var sk = st.sort || "n", dir = st.dir || 1;
    var cc = null;
    for (var i = 0; i < COLS.length; i++) if (COLS[i][0] === sk) cc = COLS[i];
    var rows = list.slice().sort(function (a, b) {
      if (!cc) return dir * a.n.localeCompare(b.n, "es");
      var x = cc[2](a), y = cc[2](b), nx = !isNum(x), ny = !isNum(y);
      if (nx && ny) return 0; if (nx) return 1; if (ny) return -1;
      return dir * (x - y);
    });
    function th(k, l) { var on = sk === k; return '<th scope="col"' + (on ? ' aria-sort="' + (dir > 0 ? "ascending" : "descending") + '"' : "") + '><button type="button" data-fs="' + k + '">' + l + (on ? (dir > 0 ? " ↑" : " ↓") : "") + "</button></th>"; }
    var html = '<div class="table-wrap"><table><thead><tr>' + th("n", "Fondo") + COLS.map(function (c) { return th(c[0], c[1]); }).join("") + "</tr></thead><tbody>" +
      rows.map(function (f) {
        return '<tr data-id="' + esc(f.id) + '" tabindex="0"><td class="fund"><span class="flogo" aria-hidden="true">' + (u.logo ? u.logo(f.g) : "") + '</span><span class="ftxt"><b>' + esc(f.n) + (f.idx ? '<span class="tag">Indexado</span>' : "") + "</b><small>" + esc(f.g) + (f.c ? " · " + esc(f.c) : "") + (u.vl ? u.vl(f) : "") + "</small></span></td>" +
          COLS.map(function (c) { return "<td>" + cellOf(c, f) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
    return { html: html, bind: function (root) {
      root.querySelectorAll("[data-fs]").forEach(function (b) { b.addEventListener("click", function () { var k = b.getAttribute("data-fs"); if (st.sort === k) st.dir = -dir; else { st.sort = k; st.dir = k === "n" ? 1 : -1; } redraw(); }); });
      root.querySelectorAll("tbody tr").forEach(function (tr) { function go() { location.hash = "#/fondo/" + encodeURIComponent(tr.getAttribute("data-id")); } tr.addEventListener("click", go); tr.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); }); });
    } };
  }

  // ---------- página de gestora ----------
  var GS = { sort: "y1", dir: -1 };
  function viewGestora(app, setTitle, name) {
    var u = UI(), list = FUNDS.filter(function (f) { return f.g === name; });
    if (!list.length) { app.innerHTML = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Gestora no encontrada</h1>'; return; }
    setTitle(name);
    var rv = list.filter(function (f) { return f.t === "rv"; }).length, rf = list.length - rv;
    app.innerHTML = '<div class="topbar"><a href="#/">← Inicio</a></div><div class="fhead gh"><span class="flogo big" aria-hidden="true">' + (u.logo ? u.logo(name) : "") + "</span><div><h1>" + esc(name) + '</h1><p class="muted">' + list.length + (list.length === 1 ? " fondo" : " fondos") + " en seguimiento · " + rv + " renta variable y mixtos · " + rf + " renta fija</p></div></div>" +
      '<div id="gbody"></div>' + (u.footer ? u.footer("rv") : "");
    function draw() { var t = fundTable(list, GS, draw), el = document.getElementById("gbody"); el.innerHTML = t.html; t.bind(el); }
    draw();
  }

  // ---------- buscador global ----------
  var ov = null, inp = null, resEl = null, items = [], cur = -1;
  function build() {
    ov = document.createElement("div"); ov.className = "gov"; ov.hidden = true;
    ov.innerHTML = '<div class="gbox" role="dialog" aria-modal="true" aria-label="Buscador"><div class="gin"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="gq" type="search" autocomplete="off" placeholder="Buscar fondo, stock o gestora" aria-label="Buscar"><button type="button" class="gx" aria-label="Cerrar">Esc</button></div><div class="gres" id="gres"></div></div>';
    document.body.appendChild(ov);
    inp = ov.querySelector("#gq"); resEl = ov.querySelector("#gres");
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) close(); });
    ov.querySelector(".gx").addEventListener("click", close);
    inp.addEventListener("input", draw);
    inp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); mark(cur + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); mark(cur - 1); }
      else if (e.key === "Enter") { e.preventDefault(); var it = items[cur >= 0 ? cur : 0]; if (it) go(it); }
    });
    resEl.addEventListener("click", function (e) {
      var r = e.target.closest("[data-i]"); if (r) go(items[+r.getAttribute("data-i")]);
    });
  }
  function open() {
    if (!ov) build();
    ov.hidden = false; document.body.classList.add("gopen");
    inp.value = ""; draw(); inp.focus();
  }
  function close() { if (ov) ov.hidden = true; document.body.classList.remove("gopen"); }
  function go(it) { close(); location.hash = it.href; }
  function mark(i) {
    if (!items.length) return;
    cur = (i + items.length) % items.length;
    var rs = resEl.querySelectorAll("[data-i]");
    for (var j = 0; j < rs.length; j++) rs[j].classList.toggle("on", j === cur);
    if (rs[cur] && rs[cur].scrollIntoView) rs[cur].scrollIntoView({ block: "nearest" });
  }
  function score(hay, toks, head) {
    var s = 0;
    for (var i = 0; i < toks.length; i++) {
      var p = hay.indexOf(toks[i]);
      if (p === -1) return -1;
      s += head.indexOf(toks[i]) === 0 ? 3 : (" " + head).indexOf(" " + toks[i]) !== -1 ? 2 : 1;
    }
    return s;
  }
  function search(q) {
    var toks = norm(q).split(/\s+/).filter(Boolean);
    var out = { f: [], s: [], g: [] };
    if (!toks.length) return out;
    FUNDS.forEach(function (f) { var sc = score(norm(f.n + " " + f.id + " " + f.g + " " + f.c), toks, norm(f.n)); if (sc >= 0) out.f.push([sc, f]); });
    stocks().forEach(function (s) { var sc = score(norm(s.t + " " + s.n + " " + (s.g || "")), toks, norm(s.t + " " + s.n)); if (sc >= 0) out.s.push([sc, s]); });
    var gs = {};
    FUNDS.forEach(function (f) { gs[f.g] = (gs[f.g] || 0) + 1; });
    Object.keys(gs).forEach(function (g) { var sc = score(norm(g), toks, norm(g)); if (sc >= 0) out.g.push([sc, g, gs[g]]); });
    function srt(a, b) { return b[0] - a[0]; }
    out.f.sort(srt); out.s.sort(srt); out.g.sort(srt);
    return out;
  }
  function draw() {
    var q = inp.value, u = UI();
    items = []; cur = -1;
    if (!q.trim()) { resEl.innerHTML = '<p class="gempty">Escribe el nombre de un fondo, el ISIN, un ticker o una gestora. Atajo: pulsa «/» o Ctrl+K desde cualquier página.</p>'; return; }
    var r = search(q), h = "";
    function sec(t, n) { return '<p class="gsec">' + t + " <small>" + n + "</small></p>"; }
    if (r.g.length) {
      h += sec("Gestoras", r.g.length);
      r.g.slice(0, 4).forEach(function (x) { items.push({ href: "#/gestora/" + encodeURIComponent(x[1]) }); h += '<div class="gr" data-i="' + (items.length - 1) + '"><span class="flogo" aria-hidden="true">' + (u.logo ? u.logo(x[1]) : "") + '</span><span class="gt"><b>' + esc(x[1]) + "</b><small>" + x[2] + (x[2] === 1 ? " fondo" : " fondos") + "</small></span></div>"; });
    }
    if (r.f.length) {
      h += sec("Fondos", r.f.length);
      r.f.slice(0, 8).forEach(function (x) { var f = x[1]; items.push({ href: "#/fondo/" + encodeURIComponent(f.id) }); h += '<div class="gr" data-i="' + (items.length - 1) + '"><span class="flogo" aria-hidden="true">' + (u.logo ? u.logo(f.g) : "") + '</span><span class="gt"><b>' + esc(f.n) + "</b><small>" + esc(f.g) + " · " + esc(f.id) + (f.c ? " · " + esc(f.c) : "") + "</small></span>" + "</div>"; });
      if (r.f.length > 8) h += '<p class="gmore">Y ' + (r.f.length - 8) + " fondos más. Afina la búsqueda para verlos.</p>";
    }
    if (r.s.length) {
      h += sec("Stocks", r.s.length);
      r.s.slice(0, 5).forEach(function (x) { var s = x[1]; items.push({ href: "#/accion/" + encodeURIComponent(s.t) }); h += '<div class="gr" data-i="' + (items.length - 1) + '">' + (u.stockLogo ? u.stockLogo(s) : "") + '<span class="gt"><b>' + esc(s.t) + " · " + esc(s.n) + "</b><small>" + esc(s.g || "Stock") + "</small></span>" + "</div>"; });
    }
    if (!items.length) h = '<p class="gempty">Sin resultados para «' + esc(q) + "».</p>";
    resEl.innerHTML = h; mark(0);
  }
  document.addEventListener("keydown", function (e) {
    var tg = e.target, typing = tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.tagName === "SELECT" || tg.isContentEditable);
    if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); open(); }
    else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); open(); }
    else if (e.key === "Escape" && ov && !ov.hidden) close();
  });
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#gbtn")) { e.preventDefault(); open(); } });
  window.addEventListener("hashchange", function () { if (ov && !ov.hidden) close(); });

  window.BUSCA = { gestora: viewGestora, open: open };
})();
