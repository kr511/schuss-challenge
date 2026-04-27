/* Shared Supabase runtime for auth-gate, Worker API calls and social features. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://fknftkvozwfkcarldzms.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbmZ0a3Zvendma2Nhcmxkem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTYxOTYsImV4cCI6MjA5MTY3MjE5Nn0.pWSR48-XIUYWWO5pPQsGDnE-qxb6c5EiKuTQn2myKRg';
  var WORKER_API_BASE = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
    ? ''
    : 'https://schuss-challenge.eliaskummel.workers.dev';

  var client = null;
  var session = null;
  var initPromise = null;

  function waitForSupabase(timeout) {
    timeout = timeout || 10000;
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      var timer = setInterval(function () {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - started >= timeout) {
          clearInterval(timer);
          reject(new Error('Supabase konnte nicht geladen werden.'));
        }
      }, 50);
    });
  }

  async function ensureClient() {
    if (client) return client;
    if (initPromise) return initPromise;

    initPromise = (async function () {
      await waitForSupabase();
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        }
      });
      window.SupabaseClient = client;
      return client;
    })().finally(function () {
      initPromise = null;
    });

    return initPromise;
  }

  function setSession(nextSession, detail) {
    session = nextSession || null;
    window.SupabaseSession = session;
    window.SupabaseClient = client || window.SupabaseClient || null;
    window.SchussduellLocalMode = detail && detail.local === true;
    window.SchussduellLocalPlay = detail && detail.local === true;

    try {
      window.dispatchEvent(new CustomEvent('supabaseSessionChanged', {
        detail: {
          session: session,
          local: detail && detail.local === true
        }
      }));
    } catch (e) {}
  }

  function clearSession(detail) {
    setSession(null, detail || {});
  }

  function getClient() {
    return client || window.SupabaseClient || null;
  }

  function getSession() {
    return session || window.SupabaseSession || null;
  }

  function getUserId() {
    var current = getSession();
    return current && current.user ? current.user.id : '';
  }

  function getAccessToken() {
    var current = getSession();
    return current && current.access_token ? current.access_token : '';
  }

  function authHeaders(extra) {
    var token = getAccessToken();
    return Object.assign({}, extra || {}, token ? { Authorization: 'Bearer ' + token } : {});
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    var headers = Object.assign(
      {},
      opts.body !== undefined ? { 'Content-Type': 'application/json' } : {},
      opts.headers || {},
      authHeaders()
    );
    var url = /^https?:\/\//i.test(path) ? path : (path.indexOf('/api/') === 0 ? WORKER_API_BASE + path : path);
    var res = await fetch(url, Object.assign({}, opts, { headers: headers }));
    var contentType = res.headers.get('content-type') || '';
    var data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      var message = data && typeof data === 'object' && data.message ? data.message : res.statusText;
      throw Object.assign(new Error(message), {
        status: res.status,
        code: data && typeof data === 'object' ? data.code : undefined,
        body: data
      });
    }
    return data;
  }

  function exposeCompatibility() {
    window.getAuthHeaders = function () { return authHeaders(); };
    window.SchussApi = window.SchussApi || {};
    window.SchussApi.fetch = apiFetch;
    window.SupabaseAuth = {
      get client() { return getClient(); },
      getSession: getSession,
      getToken: getAccessToken,
      authHeaders: authHeaders,
      apiFetch: apiFetch,
      signInWithGoogle: async function () {
        var currentClient = await ensureClient();
        return currentClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + window.location.pathname }
        });
      },
      signOut: async function () {
        var currentClient = await ensureClient();
        await currentClient.auth.signOut();
        clearSession({ local: false });
      }
    };
  }

  window.SupabaseRuntime = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON,
    apiBase: WORKER_API_BASE,
    ensureClient: ensureClient,
    getClient: getClient,
    setSession: setSession,
    clearSession: clearSession,
    getSession: getSession,
    getUserId: getUserId,
    getAccessToken: getAccessToken,
    authHeaders: authHeaders,
    apiFetch: apiFetch
  };

  exposeCompatibility();
})();
