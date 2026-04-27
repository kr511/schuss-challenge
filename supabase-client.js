/**
 * Supabase Auth-Client für die Frontend-Integration.
 * In index.html einbinden wenn User-scoped API-Calls (Sessions, Achievements,
 * Streaks) aktiviert werden sollen.
 *
 * Einbinden: <script src="supabase-client.js?v=1.0"></script>
 */
(function () {
  const SUPABASE_URL  = 'https://fknftkvozwfkcarldzms.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbmZ0a3Zvendma2Nhcmxkem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTYxOTYsImV4cCI6MjA5MTY3MjE5Nn0.pWSR48-XIUYWWO5pPQsGDnE-qxb6c5EiKuTQn2myKRg';

  let _session = null;

  async function init() {
    if (typeof window.supabase === 'undefined') {
      console.warn('[SupabaseClient] supabase-js nicht geladen');
      return;
    }
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

    // Bestehende Session prüfen
    const { data } = await client.auth.getSession();
    _session = data.session;

    // Anonym einloggen wenn keine Session
    if (!_session) {
      const { data: anon } = await client.auth.signInAnonymously();
      _session = anon.session;
    }

    // Session-Updates verfolgen
    client.auth.onAuthStateChange((_event, session) => {
      _session = session;
    });

    window.SupabaseAuth = {
      client,
      getSession: () => _session,
      getToken:   () => _session?.access_token ?? null,

      /** Fügt Authorization-Header zu fetch-Optionen hinzu */
      authHeaders() {
        const token = this.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },

      /** Wrapper um fetch der automatisch den Bearer-Token anhängt */
      async apiFetch(path, opts = {}) {
        const token = this.getToken();
        const headers = {
          'Content-Type': 'application/json',
          ...(opts.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        return fetch(path, { ...opts, headers });
      },

      /** Google Sign-In (ersetzt Firebase Google Auth) */
      async signInWithGoogle() {
        return client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
      },

      async signOut() {
        await client.auth.signOut();
        _session = null;
      },
    };

    console.log('[SupabaseAuth] bereit, User:', _session?.user?.id?.slice(0, 8) + '…');
    window.dispatchEvent(new CustomEvent('supabaseReady', { detail: { session: _session } }));
  }

  // Warten bis supabase-js geladen ist
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
