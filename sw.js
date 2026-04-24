// Schussduell Service Worker
// Offline-first Cache + kleines HTML-Cleanup für veraltete Script-Tags.

const CACHE_VERSION = 'v5.5'; // updates dropdown outside-click fix
const CACHE_NAME = `schussduell-${CACHE_VERSION}`;

const NORMALIZED_SCRIPTS = [
  'site-cleanup.js?v=1.2',
  'duel-setup-runtime.js?v=4.5',
  'duel-scroll-lock.js?v=4.9',
  'duel-result-screen.js?v=5.1',
  'duel-distance-guard.js?v=4.7',
  'qa-test-suite.js?v=4.1'
];

const PRECACHE = [
  './',
  './index.html',
  './app.js',
  './site-cleanup.js',
  './site-cleanup.js?v=1.2',
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
  './duel-setup-runtime.js?v=4.5',
  './duel-scroll-lock.js',
  './duel-scroll-lock.js?v=4.9',
  './duel-result-screen.js',
  './duel-result-screen.js?v=5.1',
  './duel-distance-guard.js',
  './duel-distance-guard.js?v=4.7',
  './performance-config.js',
  './battle-balance.js',
  './qa-test-suite.js',
  './qa-test-suite.js?v=4.1',
  './styles.css',
  './duel-setup.css',
  './duel-setup.css?v=4.5',
  './image-compare.css',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap'
];

const NEVER_CACHE = [
  'firebasedatabase.app',
  'firebaseio.com',
  'googleapis.com/identitytoolkit',
  'googleapis.com/firebase',
  'generativelanguage.googleapis.com'
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeScriptByFile(html, fileName) {
  const re = new RegExp(`\\s*<script\\s+[^>]*src=["'][^"']*${escapeRegExp(fileName)}(?:\\?v=[^"']*)?["'][^>]*><\\/script>`, 'g');
  return html.replace(re, '');
}

function removeLegacyScripts(html) {
  let nextHtml = html;
  nextHtml = removeScriptByFile(nextHtml, 'gemini-ai.js');
  nextHtml = removeScriptByFile(nextHtml, 'duel-discipline-filter.js');
  nextHtml = nextHtml.replace(/\\s*<!-- Google Sign-In Provider -->\\s*<script\\s+defer\\s+src=["']https:\\/\\/www\\.gstatic\\.com\\/firebasejs\\/9\\.23\\.0\\/firebase-auth-compat\\.js["']\\s+data-provider=["']google["']><\\/script>/g, '');
  return nextHtml;
}

function normalizeRuntimeScripts(html) {
  let nextHtml = html;
  const files = NORMALIZED_SCRIPTS.map(src => src.split('?')[0]);

  files.forEach(file => {
    nextHtml = removeScriptByFile(nextHtml, file);
  });

  const block = NORMALIZED_SCRIPTS
    .map(src => `  <script src="${src}" defer></script>`)
    .join('\n');

  if (nextHtml.includes('</head>')) {
    return nextHtml.replace('</head>', `${block}\n</head>`);
  }

  return `${nextHtml}\n${block}`;
}

function enhanceIndexHtml(html) {
  return normalizeRuntimeScripts(removeLegacyScripts(html));
}

async function indexResponseWithRuntime(response) {
  if (!response || response.status !== 200) return response;

  const html = await response.clone().text();
  const enhancedHtml = enhanceIndexHtml(html);
  const enhancedResponse = new Response(enhancedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
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
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();

  console.log(`🔄 Service Worker ${CACHE_VERSION} aktiviert`);
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
  });
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  if (NEVER_CACHE.some(domain => url.includes(domain))) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.method !== 'GET') return;
  if (url.includes('workers.dev') || url.includes('/api/')) return;

  if (event.request.mode === 'navigate' || url.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(async response => {
          const enhancedResponse = await indexResponseWithRuntime(response);
          if (enhancedResponse && enhancedResponse.status === 200) {
            const clone = enhancedResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return enhancedResponse;
        })
        .catch(() => caches.match(event.request).then(async cached => {
          if (cached) return indexResponseWithRuntime(cached);
          const fallback = await caches.match('./index.html');
          return fallback ? indexResponseWithRuntime(fallback) : fallback;
        }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
