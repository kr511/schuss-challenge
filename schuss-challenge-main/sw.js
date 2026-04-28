// Schussduell Service Worker
// EMERGENCY NO-OP VERSION
// Ziel: alte PWA-Caches löschen und keine Requests mehr abfangen.

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Wichtig: Kein fetch-Handler mit respondWith.
// Dadurch lädt die Seite wieder direkt über GitHub Pages, ohne Service-Worker-Cache.
