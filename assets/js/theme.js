// Theme (light/dark) + keyboard support for the mobile menu button.
(function () {
  var root = document.documentElement, KEY = "theme";

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function systemDark() { return !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches); }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var b = document.getElementById("theme-toggle");
    if (!b) return;
    var dark = theme === "dark";
    b.setAttribute("aria-pressed", String(dark));
    b.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    var i = b.querySelector("i");
    if (i) i.className = dark ? "fas fa-sun" : "fas fa-moon";
  }

  // set before first paint to avoid a flash
  apply(stored() || (systemDark() ? "dark" : "light"));

  document.addEventListener("DOMContentLoaded", function () {
    apply(root.getAttribute("data-theme"));

    var b = document.getElementById("theme-toggle");
    if (b) b.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch (e) {}
      apply(next);
    });

    var m = document.getElementById("menu");
    if (m) {
      m.setAttribute("role", "button");
      m.setAttribute("tabindex", "0");
      m.setAttribute("aria-label", "Toggle menu");
      m.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); m.click(); }
      });
    }
  });
})();
