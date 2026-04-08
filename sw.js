// Schussduell Service Worker
// Cacht alle lokalen Assets für Offline-Nutzung.
// Firebase-Requests werden NICHT gecacht (immer live).

// Dynamische Versionskonstante für Cache-Name
const CACHE_VERSION = 'v2.6';
const CACHE_NAME = `schussduell-${CACHE_VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  // Alle lokalen JS-Dateien
  './app.js',
  './adaptive-bot.js',
  './physics-engine.js',
  './daily-challenge.js',
  './enhanced-achievements.js',
  './feature-fallback.js',
  './haptics.js',
  './image-compare.js',
  './image-compare-brain.js',
  './contextual-ocr.js',
  './enhanced-analytics.js',
  './mobile-features.js',
  './multi-score-detection.js',
  './training-modes.js',
  './sounds.js',
  './tutorial.js',
  './storage-manager.js',
  // Lokale CSS-Dateien
  './styles.css',
  './image-compare.css',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap',
];

// Firebase-Domains nie cachen
const NEVER_CACHE = [
  'firebasedatabase.app',
  'firebaseio.com',
  'googleapis.com/identitytoolkit',
  'googleapis.com/firebase',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();

  console.log(`🔄 Service Worker ${CACHE_VERSION} aktiviert`);
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Never cache Firebase or external auth requests
  if (NEVER_CACHE.some(domain => url.includes(domain))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for local assets, network-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache valid same-origin or CORS responses
        if (
          response &&
          response.status === 200 &&
          (response.type === 'basic' || response.type === 'cors')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
