/**
 * Lite-Modus: schlanke Mobile-Version (nur Bot-Duell + Freunde/Challenges).
 *
 * Standard ist Lite. Die volle App lässt sich per ?full=1 einschalten
 * (wird gemerkt), ?full=0 schaltet zurück auf Lite.
 *
 * Optionale Feature-Scripts werden in index.html über scOptionalScript()
 * eingebunden und im Lite-Modus gar nicht erst geladen. document.write
 * während des Parsens erhält Reihenfolge und defer-Verhalten der Tags.
 */
(function () {
  'use strict';
  var full = false;
  try {
    var q = new URLSearchParams(location.search).get('full');
    if (q === '1') localStorage.setItem('sd_full_app', '1');
    if (q === '0') localStorage.removeItem('sd_full_app');
    full = localStorage.getItem('sd_full_app') === '1';
  } catch (e) { /* Storage blockiert → Lite */ }

  window.SC_LITE = !full;
  if (window.SC_LITE) document.documentElement.classList.add('sc-lite');

  window.scOptionalScript = function (src, defer) {
    if (window.SC_LITE) return;
    document.write('<script src="' + src + '"' + (defer ? ' defer' : '') + '><\/script>');
  };
})();
