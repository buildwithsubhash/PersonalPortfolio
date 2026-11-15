// Site settings. Fill these in to turn features on; leave empty to keep them off.
window.SITE_CONFIG = {
  email: "subhash.thakur.tech@gmail.com",

  // Contact form via EmailJS (https://www.emailjs.com). If empty, the form opens the visitor's mail app instead.
  emailjs: { publicKey: "", serviceId: "", templateId: "" },

  // Live chat via Tawk.to (https://www.tawk.to). If empty, no chat widget is loaded.
  tawk: { propertyId: "", widgetId: "" }
};

(function () {
  var t = window.SITE_CONFIG.tawk;
  if (!t || !t.propertyId || !t.widgetId) return;
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://embed.tawk.to/" + t.propertyId + "/" + t.widgetId;
  s.charset = "UTF-8";
  s.setAttribute("crossorigin", "*");
  document.head.appendChild(s);
})();
