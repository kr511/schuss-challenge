// Zentrale HTML-Escape-Funktion. Wird als globale Funktion gesetzt damit
// alle IIFE-Module sie ohne lokale Kopie verwenden können.
// Escapet: & < > " ' ` /
function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
    .replace(/\//g, '&#47;');
}
