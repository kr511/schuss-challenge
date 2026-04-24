// Schussduell Service Worker
// Cacht alle lokalen Assets für Offline-Nutzung.
// Firebase-Requests werden NICHT gecacht (immer live).

// Dynamische Versionskonstante für Cache-Name
const CACHE_VERSION = 'v4.0'; // Duel Setup mobile scroll lock
const CACHE_NAME = `schussduell-${CACHE_VERSION}`;
const DUEL_RUNTIME_SCRIPT = '<script src="duel-setup-runtime.js?v=3.9" defer></script>';
const DUEL_SCROLL_LOCK_SCRIPT = '<script src="duel-scroll-lock.js?v=4.0" defer></script>';
const QA_SCRIPT_VERSIONED = '<script src="qa-test-suite.js?v=3.9" defer></script>';
const DUEL_RUNTIME_RE = /<script\s+src=["']duel-setup-runtime\.js(?:\?v=[^"']*)?["']\s+defer><\/script>/g;
const DUEL_SCROLL_LOCK_RE = /<script\s+src=["']duel-scroll-lock\.js(?:\?v=[^"']*)?["']\s+defer><\/script>/g;
const QA_SCRIPT_RE = /<script\s+src=["']qa-test-suite\.js(?:\?v=[^"']*)?["']\s+defer><\/script>/g;

const PRECACHE = [
  './',
  './index.html',
  // Alle lokalen JS-Dateien
  './app.js',
  './adaptive-bot.js',
  './daily-challenge.js',
  './enhanced-achievements.js',
  './feature-fallback.js',
  './haptics.js',
  './image-compare.js',
  './image-compare-brain.js',
  './contextual-ocr.js',
  './enhanced-analytics.js',
  './mobile-features.js',
  './mobile-responsive.js',
  './multi-score-detection.js',
  './training-modes.js',
  './sounds.js',
  './tutorial.js',
  './storage-manager.js',
  './async-challenge.js',
  './duel-setup-runtime.js',
  './duel-setup-runtime.js?v=3.9',
  './duel-scroll-lock.js',
  './duel-scroll-lock.js?v=4.0',
  './performance-config.js',
  './battle-balance.js',
  './qa-test-suite.js',
  './qa-test-suite.js?v=3.9',
  // Lokale CSS-Dateien
  './styles.css',
  './duel-setup.css',
  './duel-setup.css?v=3.9',
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

function resetRegexes() {
  DUEL_RUNTIME_RE.lastIndex = 0;
  DUEL_SCROLL_LOCK_RE.lastIndex = 0;
  QA_SCRIPT_RE.lastIndex = 0;
}

function enhanceIndexHtml(html) {
  let nextHtml = html;
  resetRegexes();

  const hasRuntime = DUEL_RUNTIME_RE.test(nextHtml);
  resetRegexes();

  if (hasRuntime) {
    nextHtml = nextHtml.replace(DUEL_RUNTIME_RE, DUEL_RUNTIME_SCRIPT);
  } else if (QA_SCRIPT_RE.test(nextHtml)) {
    resetRegexes();
    nextHtml = nextHtml.replace(QA_SCRIPT_RE, `${DUEL_RUNTIME_SCRIPT}\n  ${QA_SCRIPT_VERSIONED}`);
  } else if (nextHtml.includes('</head>')) {
    nextHtml = nextHtml.replace('</head>', `  ${DUEL_RUNTIME_SCRIPT}\n  ${QA_SCRIPT_VERSIONED}\n</head>`);
  }

  resetRegexes();
  const hasScrollLock = DUEL_SCROLL_LOCK_RE.test(nextHtml);
  resetRegexes();

  if (hasScrollLock) {
    nextHtml = nextHtml.replace(DUEL_SCROLL_LOCK_RE, DUEL_SCROLL_LOCK_SCRIPT);
  } else if (nextHtml.includes(QA_SCRIPT_VERSIONED)) {
    nextHtml = nextHtml.replace(QA_SCRIPT_VERSIONED, `${DUEL_SCROLL_LOCK_SCRIPT}\n  ${QA_SCRIPT_VERSIONED}`);
  } else if (nextHtml.includes(DUEL_RUNTIME_SCRIPT)) {
    nextHtml = nextHtml.replace(DUEL_RUNTIME_SCRIPT, `${DUEL_RUNTIME_SCRIPT}\n  ${DUEL_SCROLL_LOCK_SCRIPT}`);
  } else if (nextHtml.includes('</head>')) {
    nextHtml = nextHtml.replace('</head>', `  ${DUEL_SCROLL_LOCK_SCRIPT}\n</head>`);
  }

  resetRegexes();
  nextHtml = nextHtml.replace(QA_SCRIPT_RE, QA_SCRIPT_VERSIONED);
  resetRegexes();

  return nextHtml;
}

async function indexResponseWithRuntime(response) {
  if (!response || response.status !== 200) return response;

  const html = await response.clone().text();
  const enhancedHtml = enhanceIndexHtml(html);
  const enhancedResponse = new Response(enhancedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  enhancedResponse.headers.set('content-type', 'text/html; charset=UTF-8');
  return enhancedResponse;
}

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
  
  // Benachrichtige alle Clients über neues Update
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
    });
  });
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Never cache Firebase or external auth requests
  if (NEVER_CACHE.some(domain => url.includes(domain))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip non-GET requests (POST, PUT, DELETE, etc.) - don't cache API calls
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests to external domains (Worker API)
  if (event.request.url.includes('workers.dev') || event.request.url.includes('/api/')) {
    return;
  }

  // Network-first for HTML (index.html) - always check for updates!
  if (event.request.mode === 'navigate' || url.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(async response => {
          const enhancedResponse = await indexResponseWithRuntime(response);
          // Cache successful HTML responses after runtime injection
          if (enhancedResponse && enhancedResponse.status === 200) {
            const clone = enhancedResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return enhancedResponse;
        })
        .catch(() => {
          // Offline fallback: use cached HTML
          return caches.match(event.request).then(async cached => {
            if (cached) return indexResponseWithRuntime(cached);
            const fallback = await caches.match('./index.html');
            return fallback ? indexResponseWithRuntime(fallback) : fallback;
          });
        })
    );
    return;
  }

  // Cache-first for all other assets (JS, CSS, images, fonts)
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
          return caches.match('./index.html').then(fallback => fallback ? indexResponseWithRuntime(fallback) : fallback);
        }
      });
    })
  );
});
