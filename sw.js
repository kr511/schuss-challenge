// Schützen Challenge – Service Worker
// Strategie:
//   • Navigation (HTML): network-first, fällt bei Offline auf offline.html zurück.
//   • /api/, Supabase, Auth-Tokens: NIE über den Service Worker (passthrough, kein Cache).
//   • JS/CSS: passthrough an Netzwerk; KEIN aggressives Cache-Locking, damit Updates
//     nicht hängen bleiben (Stale-Bug aus früheren Versionen).
//   • Bei Aktivierung werden alte Caches mit anderem Versionsnamen gelöscht.
// Hinweis: Bei Releases CACHE_VERSION erhöhen UND ?v=X.X in index.html bumpen.

const CACHE_VERSION = 'sc-shell-v1';
const OFFLINE_URL = './offline.html';
const PRECACHE_URLS = [
  OFFLINE_URL,
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.all(
        // Per-URL hinzufügen: einzelne Cache-Misses dürfen Install nicht abbrechen.
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' }))
          .catch((err) => console.warn('[SW] Precache fehlgeschlagen:', url, err && err.message)))
      ))
      .catch((err) => console.warn('[SW] Cache.open fehlgeschlagen:', err && err.message))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isApiOrAuthRequest(url) {
  if (!url || url.protocol === 'chrome-extension:') return true;
  if (url.pathname.startsWith('/api/')) return true;
  // Supabase Auth/Storage/REST – niemals cachen.
  if (url.hostname.endsWith('supabase.co')) return true;
  if (url.hostname.endsWith('supabase.in')) return true;
  // OAuth-Provider und Token-Endpoints
  if (url.hostname.endsWith('googleapis.com')) return true;
  if (url.hostname.endsWith('accounts.google.com')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (_) { return; }

  // Andere Origins (CDNs, Fonts) und API/Auth: nicht abfangen.
  if (url.origin !== self.location.origin) return;
  if (isApiOrAuthRequest(url)) return;

  // Navigation: network-first → offline.html als Fallback.
  const accept = request.headers.get('accept') || '';
  const isHtmlNavigation =
    request.mode === 'navigate' ||
    (request.destination === 'document') ||
    accept.includes('text/html');

  if (isHtmlNavigation) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL).then((res) => res || new Response(
          '<h1>Offline</h1><p>Schützen Challenge ist offline.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )))
    );
    return;
  }

  // Statische Shell-Assets (manifest, icons): cache-first für Stabilität.
  if (PRECACHE_URLS.some((p) => url.pathname.endsWith(p.replace('./', '/')))) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }
  // Alles andere: dem Netzwerk überlassen (kein Stale-Bug).
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
