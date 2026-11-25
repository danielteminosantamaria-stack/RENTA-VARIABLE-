/* Buscador global, favoritos y página de gestora. */
(function () {
  "use strict";
  var KEY = "cf_favs";
  var FUNDS = (window.DATA && window.DATA.funds) || [];
  function UI() { return window.CFUI || {}; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function stocks() { return window.STOCKS || []; }
  function fundBy(id) { for (var i = 0; i < FUNDS.length; i++) if (FUNDS[i].id === id) return FUNDS[i]; return null; }
  function stockBy(t) { var S = stocks(); for (var i = 0; i < S.length; i++) if (S[i].t === t) return S[i]; return null; }

  // ---------- favoritos ----------
  function load() {
    try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string"; }) : []; } catch (e) { return []; }
  }
  var FAV = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(FAV)); } catch (e) { /* sin almacenamiento */ } }
  function has(k) { return FAV.indexOf(k) !== -1; }
  function toggle(k) {
    var i = FAV.indexOf(k);
    if (i === -1) FAV.push(k); else FAV.splice(i, 1);
    save();
    paint();
    return i === -1;
  }
  function paint() {
    var els = document.querySelectorAll(".star[data-fav]");
    for (var i = 0; i < els.length; i++) {
      var on = has(els[i].getAttribute("data-fav"));
      els[i].setAttribute("aria-pressed", String(on));
      els[i].title = on ? "Quitar de favoritos" : "Añadir a favoritos";
      els[i].setAttribute("aria-label", els[i].title);
      els[i].textContent = on ? "★" : "☆";
    }
    var n = document.getElementById("favn");
    if (n) { var c = FAV.filter(function (k) { return k.charAt(0) === "f" ? !!fundBy(k.slice(2)) : !!stockBy(k.slice(2)); }).length; n.textContent = c ? String(c) : ""; n.hidden = !c; }
  }
  function star(kind, id) {
    var k = kind + ":" + id, on = has(k), t = on ? "Quitar de favoritos" : "Añadir a favoritos";
    return '<button type="button" class="star" data-fav="' + esc(k) + '" aria-pressed="' + on + '" title="' + t + '" aria-label="' + t + '">' + (on ? "★" : "☆") + "</button>";
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".star[data-fav]");
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    var k = b.getAttribute("data-fav"), was = has(k);
    toggle(k);
    if (location.hash.indexOf("#/favoritos") === 0 && was) route();
  }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.closest && e.target.closest(".star[data-fav]")) e.stopPropagation();
  }, true);
  function route() { window.dispatchEvent(new Event("hashchange")); }

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
    var html = '<div class="table-wrap"><table><thead><tr><th scope="col" class="stc"></th>' + th("n", "Fondo") + COLS.map(function (c) { return th(c[0], c[1]); }).join("") + "</tr></thead><tbody>" +
      rows.map(function (f) {
        return '<tr data-id="' + esc(f.id) + '" tabindex="0"><td class="stc">' + star("f", f.id) + '</td><td class="fund"><span class="flogo" aria-hidden="true">' + (u.logo ? u.logo(f.g) : "") + '</span><span class="ftxt"><b>' + esc(f.n) + (f.idx ? '<span class="tag">Indexado</span>' : "") + "</b><small>" + esc(f.g) + (f.c ? " · " + esc(f.c) : "") + (u.vl ? u.vl(f) : "") + "</small></span></td>" +
          COLS.map(function (c) { return "<td>" + cellOf(c, f) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
    return { html: html, bind: function (root) {
      root.querySelectorAll("[data-fs]").forEach(function (b) { b.addEventListener("click", function () { var k = b.getAttribute("data-fs"); if (st.sort === k) st.dir = -dir; else { st.sort = k; st.dir = k === "n" ? 1 : -1; } redraw(); }); });
      root.querySelectorAll("tbody tr").forEach(function (tr) { function go() { location.hash = "#/fondo/" + encodeURIComponent(tr.getAttribute("data-id")); } tr.addEventListener("click", go); tr.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); }); });
    } };
  }

  // ---------- vista de favoritos ----------
  var FS = { sort: "n", dir: 1 }, SS = { sort: "n", dir: 1 };
  function viewFavs(app, setTitle) {
    var u = UI();
    setTitle("Favoritos");
    var fl = [], sl = [];
    FAV.forEach(function (k) { var id = k.slice(2); if (k.charAt(0) === "f") { var f = fundBy(id); if (f) fl.push(f); } else if (k.charAt(0) === "s") { var s = stockBy(id); if (s) sl.push(s); } });
    var h = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Favoritos</h1><p class="sub">Tu lista de fondos y stocks marcados con la estrella. Se guarda solo en este navegador.</p>';
    if (!fl.length && !sl.length) {
      app.innerHTML = h + '<div class="empty box" style="margin-top:18px;padding:34px 20px">Todavía no tienes favoritos. Pulsa la estrella ☆ junto a un fondo o un stock, o búscalos con el buscador de arriba.</div>' + (u.footer ? u.footer("rv") : "");
      return;
    }
    h += '<div id="favf"></div><div id="favs"></div>';
    app.innerHTML = h + (u.footer ? u.footer("rv") : "");
    function drawF() {
      var el = document.getElementById("favf");
      if (!fl.length) { el.innerHTML = ""; return; }
      var t = fundTable(fl, FS, drawF), ids = fl.slice(0, 6).map(function (f) { return encodeURIComponent(f.id); }).join(",");
      el.innerHTML = '<div class="favhead"><h2 class="sec">Fondos <small>' + fl.length + "</small></h2>" + (fl.length > 1 ? '<a class="btn ghost sm" href="#/comparar/' + ids + '">Comparar' + (fl.length > 6 ? " los 6 primeros" : "") + "</a>" : "") + "</div>" + t.html;
      t.bind(el);
    }
    function drawS() {
      var el = document.getElementById("favs");
      if (!sl.length) { el.innerHTML = ""; return; }
      var rows = sl.slice().sort(function (a, b) {
        var k = SS.sort, x = k === "n" ? a.n : a[k], y = k === "n" ? b.n : b[k], nx = x == null || x === "", ny = y == null || y === "";
        if (nx && ny) return 0; if (nx) return 1; if (ny) return -1;
        return typeof x === "string" ? SS.dir * x.localeCompare(y, "es") : SS.dir * (x - y);
      });
      var cols = [["comp", "Composite"], ["eps", "EPS"], ["rs", "RS"], ["smr", "SMR"], ["ad", "A/D"], ["peg", "PEG"]];
      function th(k, l) { var on = SS.sort === k; return '<th scope="col"' + (on ? ' aria-sort="' + (SS.dir > 0 ? "ascending" : "descending") + '"' : "") + '><button type="button" data-ss2="' + k + '">' + l + (on ? (SS.dir > 0 ? " ↑" : " ↓") : "") + "</button></th>"; }
      el.innerHTML = '<div class="favhead"><h2 class="sec">Stocks <small>' + sl.length + '</small></h2></div><div class="table-wrap"><table><thead><tr><th scope="col" class="stc"></th>' + th("n", "Stock") + cols.map(function (c) { return th(c[0], c[1]); }).join("") + "</tr></thead><tbody>" +
        rows.map(function (s) {
          return '<tr data-t="' + esc(s.t) + '" tabindex="0"><td class="stc">' + star("s", s.t) + '</td><td class="fund">' + (u.stockLogo ? u.stockLogo(s) : "") + '<span class="ftxt"><b>' + esc(s.t) + "</b><small>" + esc(s.n) + "</small></span></td>" + cols.map(function (c) { return "<td>" + (u.rcell ? u.rcell(c[0], s[c[0]]) : "–") + "</td>"; }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>";
      el.querySelectorAll("[data-ss2]").forEach(function (b) { b.addEventListener("click", function () { var k = b.getAttribute("data-ss2"); if (SS.sort === k) SS.dir = -SS.dir; else { SS.sort = k; SS.dir = k === "n" ? 1 : -1; } drawS(); }); });
      el.querySelectorAll("tbody tr").forEach(function (tr) { function go() { location.hash = "#/accion/" + encodeURIComponent(tr.getAttribute("data-t")); } tr.addEventListener("click", go); tr.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); }); });
    }
    drawF(); drawS();
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
      if (e.target.closest(".star")) return;
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
      r.f.slice(0, 8).forEach(function (x) { var f = x[1]; items.push({ href: "#/fondo/" + encodeURIComponent(f.id) }); h += '<div class="gr" data-i="' + (items.length - 1) + '"><span class="flogo" aria-hidden="true">' + (u.logo ? u.logo(f.g) : "") + '</span><span class="gt"><b>' + esc(f.n) + "</b><small>" + esc(f.g) + " · " + esc(f.id) + (f.c ? " · " + esc(f.c) : "") + "</small></span>" + star("f", f.id) + "</div>"; });
      if (r.f.length > 8) h += '<p class="gmore">Y ' + (r.f.length - 8) + " fondos más. Afina la búsqueda para verlos.</p>";
    }
    if (r.s.length) {
      h += sec("Stocks", r.s.length);
      r.s.slice(0, 5).forEach(function (x) { var s = x[1]; items.push({ href: "#/accion/" + encodeURIComponent(s.t) }); h += '<div class="gr" data-i="' + (items.length - 1) + '">' + (u.stockLogo ? u.stockLogo(s) : "") + '<span class="gt"><b>' + esc(s.t) + " · " + esc(s.n) + "</b><small>" + esc(s.g || "Stock") + "</small></span>" + star("s", s.t) + "</div>"; });
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
  window.addEventListener("hashchange", function () { if (ov && !ov.hidden) close(); setTimeout(paint, 0); });
  document.addEventListener("DOMContentLoaded", paint);
  setTimeout(paint, 0);

  window.FAVS = { has: has, toggle: toggle, star: star, paint: paint, view: viewFavs, gestora: viewGestora, open: open, count: function () { return FAV.length; } };
})();
