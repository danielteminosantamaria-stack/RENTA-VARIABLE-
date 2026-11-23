/* Suscripción a la newsletter. Rellena NEWSLETTER.action con la dirección del formulario de MailerLite. */
(function () {
  "use strict";
  var NL = window.NEWSLETTER = window.NEWSLETTER || {};
  /* ---- Configuración (editar aquí) ---- */
  NL.action = NL.action || "https://assets.mailerlite.com/jsonp/2818689/forms/204946817986594131/subscribe";
  NL.emailField = NL.emailField || "fields[email]";
  NL.extra = NL.extra || { "ml-submit": "1", "anticsrf": "true" };
  NL.responsable = NL.responsable || "";          // nombre del titular (opcional, se muestra en privacidad)
  NL.contacto = NL.contacto || "";                // correo de contacto para derechos RGPD (opcional)
  NL.proveedor = NL.proveedor || "MailerLite";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var activo = function () { return /^https:\/\//.test(NL.action); };
  var uid = 0;

  function form(compact) {
    var id = "nl" + (++uid);
    return '<form class="nlform' + (compact ? " mini" : "") + '" novalidate data-nl>' +
      '<div class="nlrow"><label class="sr" for="' + id + 'e">Correo electrónico</label>' +
      '<input id="' + id + 'e" type="email" name="email" placeholder="Tu correo electrónico" autocomplete="email" required maxlength="120"' + (activo() ? "" : " disabled") + '>' +
      '<button type="submit"' + (activo() ? "" : " disabled") + '>Suscribirme</button></div>' +
      '<input type="text" name="web" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<label class="nlck"><input type="checkbox" name="ok" required' + (activo() ? "" : " disabled") + '> He leído la <a href="#/privacidad">política de privacidad</a> y acepto recibir la newsletter.</label>' +
      '<p class="nlmsg" role="status" aria-live="polite">' + (activo() ? "" : "La suscripción se activará en breve.") + "</p></form>";
  }

  NL.mini = function () {
    return '<section class="nlmini"><div><b>Newsletter</b><span>Resumen periódico con lo más relevante de fondos y mercados.</span></div>' + form(true) + "</section>";
  };

  NL.view = function (app, setTitle) {
    setTitle("Newsletter");
    app.innerHTML = '<div class="topbar"><a href="#/">← Inicio</a></div><h1>Newsletter</h1>' +
      '<p class="sub">Recibe en tu correo un resumen periódico con lo más relevante de los fondos y los mercados.</p>' +
      '<section class="nlbox"><h3>Suscríbete</h3>' + form(false) +
      '<ul class="nllist"><li>Un correo cada cierto tiempo, sin spam.</li><li>Puedes darte de baja cuando quieras desde cualquier correo.</li><li>No compartimos tu dirección con nadie más.</li></ul></section>' +
      '<p class="note">Contenido informativo. No constituye asesoramiento personalizado ni recomendación de inversión. Las rentabilidades pasadas no garantizan resultados futuros.</p>';
  };

  NL.privacy = function (app, setTitle) {
    setTitle("Privacidad");
    var resp = NL.responsable ? esc(NL.responsable) : "el titular de esta web", cont = NL.contacto ? "<b>" + esc(NL.contacto) + "</b>" : "el correo de contacto indicado en la web";
    app.innerHTML = '<div class="topbar"><a href="#/newsletter">← Newsletter</a></div><h1>Política de privacidad</h1>' +
      '<section class="nlbox legal"><h3>Quién trata tus datos</h3><p>El responsable del tratamiento es ' + resp + ". Para ejercer tus derechos puedes escribir a " + cont + ".</p>" +
      "<h3>Qué datos recogemos y para qué</h3><p>Solo tu dirección de correo electrónico, para enviarte la newsletter de esta web. No usamos tus datos para ninguna otra finalidad.</p>" +
      "<h3>Base legal</h3><p>Tu consentimiento, que das al marcar la casilla y suscribirte. Puedes retirarlo en cualquier momento.</p>" +
      "<h3>Con quién se comparten</h3><p>Con " + esc(NL.proveedor) + ", la plataforma que gestiona los envíos y que actúa como encargado del tratamiento. No se ceden a otras empresas.</p>" +
      "<h3>Cuánto tiempo se conservan</h3><p>Hasta que te des de baja. Después se eliminan o se conservan bloqueados el tiempo legalmente exigible.</p>" +
      "<h3>Tus derechos</h3><p>Puedes acceder a tus datos, rectificarlos, suprimirlos, oponerte, limitar su tratamiento y pedir su portabilidad escribiendo a " + cont + ". También puedes presentar una reclamación ante la Agencia Española de Protección de Datos (aepd.es).</p>" +
      "<h3>Cómo darte de baja</h3><p>Con el enlace de baja que aparece al final de cada correo, o escribiendo a la dirección de contacto.</p>" +
      '<p class="note">La web no usa cookies de seguimiento ni de publicidad.</p></section>';
  };

  document.addEventListener("submit", function (e) {
    var f = e.target.closest && e.target.closest("form[data-nl]"); if (!f) return;
    e.preventDefault();
    var msg = f.querySelector(".nlmsg"), em = f.querySelector('input[name="email"]'), ok = f.querySelector('input[name="ok"]'), btn = f.querySelector("button");
    function say(t, bad) { msg.textContent = t; msg.className = "nlmsg" + (bad ? " bad" : " good"); }
    if (!activo()) return say("La suscripción aún no está activada.", true);
    if (f.querySelector('input[name="web"]').value) return;
    var v = em.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return say("Escribe un correo válido.", true);
    if (!ok.checked) return say("Marca la casilla para aceptar la política de privacidad.", true);
    var fd = new FormData(); fd.append(NL.emailField, v);
    Object.keys(NL.extra || {}).forEach(function (k) { fd.append(k, NL.extra[k]); });
    btn.disabled = true; say("Enviando…");
    fetch(NL.action, { method: "POST", mode: "no-cors", body: fd }).then(function () {
      say("Casi listo. Revisa tu correo y confirma la suscripción (mira también en spam).");
      em.value = ""; ok.checked = false; btn.disabled = false;
    }).catch(function () { say("No se ha podido enviar. Inténtalo de nuevo en unos minutos.", true); btn.disabled = false; });
  });
})();
