/**
 * Supabase Auth facade.
 *
 * auth-gate.js owns sign-in, PKCE callback handling, and local-play mode.
 * This file only exposes a small compatibility wrapper for code that still
 * reads window.SupabaseAuth.
 */
(function () {
  const SUPABASE_URL = 'https://fknftkvozwfkcarldzms.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbmZ0a3Zvendma2Nhcmxkem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTYxOTYsImV4cCI6MjA5MTY3MjE5Nn0.pWSR48-XIUYWWO5pPQsGDnE-qxb6c5EiKuTQn2myKRg';

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
