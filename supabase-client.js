/**
 * Supabase Auth facade.
 *
 * auth-gate.js owns sign-in, PKCE callback handling, and local-play mode.
 * This file only exposes a small compatibility wrapper for code that still
 * reads window.SupabaseAuth.
 */
(function () {
  // Public Supabase config. Anon-Key ist designt zum Veröffentlichen
  // (siehe Supabase docs). Die Service-Role darf NIEMALS hier landen.
  const FALLBACK_URL = 'https://fknftkvozwfkcarldzms.supabase.co';
  const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbmZ0a3Zvendma2Nhcmxkem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTYxOTYsImV4cCI6MjA5MTY3MjE5Nn0.pWSR48-XIUYWWO5pPQsGDnE-qxb6c5EiKuTQn2myKRg';

  function readMeta(name) {
    try {
      const el = document.querySelector(`meta[name="${name}"]`);
      return el ? String(el.getAttribute('content') || '').trim() : '';
    } catch (_e) {
      return '';
    }
  }

  function readImportMetaEnv() {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('try { return import.meta && import.meta.env || null; } catch (_e) { return null; }');
      const env = fn();
      if (!env) return null;
      const url = String(env.VITE_SUPABASE_URL || '').trim();
      const anon = String(env.VITE_SUPABASE_ANON_KEY || '').trim();
      return url && anon ? { url, anon } : null;
    } catch (_e) {
      return null;
    }
  }

  function readRuntimeConfig() {
    const primary = window.SCHUETZEN_CHALLENGE_CONFIG || null;
    if (primary && primary.SUPABASE_URL && primary.SUPABASE_ANON_KEY) {
      return { url: primary.SUPABASE_URL, anon: primary.SUPABASE_ANON_KEY, source: 'window.SCHUETZEN_CHALLENGE_CONFIG' };
    }
    const compat = window.__SUPABASE_CONFIG__ || null;
    if (compat && compat.url && compat.anonKey) {
      return { url: compat.url, anon: compat.anonKey, source: 'window.__SUPABASE_CONFIG__' };
    }
    const metaUrl = readMeta('supabase-url');
    const metaAnon = readMeta('supabase-anon-key');
    if (metaUrl && metaAnon) return { url: metaUrl, anon: metaAnon, source: 'meta' };
    const env = readImportMetaEnv();
    if (env) return { url: env.url, anon: env.anon, source: 'import.meta.env' };
    console.warn('[SupabaseAuth] Keine Supabase-Config gefunden. Nutze öffentliche Defaults; lokaler Modus bleibt verfügbar.');
    return { url: FALLBACK_URL, anon: FALLBACK_ANON, source: 'fallback' };
  }

  const RUNTIME_CFG = readRuntimeConfig();
  const SUPABASE_URL = RUNTIME_CFG.url;
  const SUPABASE_ANON = RUNTIME_CFG.anon;

  let fallbackClient = null;
  let session = window.SupabaseSession || null;

  function loadScriptOnce(src, id) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  function loadProfileControls() {
    loadScriptOnce('logout-control.js?v=1.0', 'schussLogoutControlScript');
    loadScriptOnce('profile-settings.js?v=1.0', 'schussProfileSettingsScript');
  }

  function getClient() {
    if (window.SupabaseClient) return window.SupabaseClient;
    if (fallbackClient) return fallbackClient;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('[SupabaseAuth] supabase-js nicht geladen');
      return null;
    }

    fallbackClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });

    fallbackClient.auth.onAuthStateChange((_event, nextSession) => {
      session = nextSession;
      if (!window.SupabaseSession) window.SupabaseSession = nextSession;
      window.dispatchEvent(new CustomEvent('supabaseReady', { detail: { session } }));
    });

    return fallbackClient;
  }

  function setSession(nextSession) {
    session = nextSession || null;
    window.dispatchEvent(new CustomEvent('supabaseReady', { detail: { session } }));
  }

  window.SupabaseAuth = {
    get client() {
      return getClient();
    },

    getSession() {
      return window.SupabaseSession || session;
    },

    getToken() {
      return this.getSession()?.access_token ?? null;
    },

    authHeaders() {
      const token = this.getToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },

    async apiFetch(path, opts = {}) {
      const token = this.getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      return fetch(path, { ...opts, headers });
    },

    async signInWithGoogle() {
      const client = getClient();
      if (!client) throw new Error('Supabase konnte nicht geladen werden.');
      return client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      });
    },

    async signOut() {
      const client = getClient();
      if (client) await client.auth.signOut();
      session = null;
      window.SupabaseSession = null;
    },
  };

  window.addEventListener('supabaseAuthReady', (event) => {
    setSession(event.detail && event.detail.session);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadProfileControls, { once: true });
  else loadProfileControls();

  if (window.SupabaseSession) setSession(window.SupabaseSession);
})();
