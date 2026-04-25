/**
 * Auth-Gate — Supabase-Authentifizierung
 *
 * Handles email/password and Google OAuth in a static GitHub Pages/PWA setup.
 * Important: Google OAuth also requires Supabase + Google Cloud redirect settings.
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://fknftkvozwfkcarldzms.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImZrbmZ0a3Zvendma2Nhcmxkem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTYxOTYsImV4cCI6MjA5MTY3MjE5Nn0.pWSR48-XIUYWWO5pPQsGDnE-qxb6c5EiKuTQn2myKRg'.replace('JIUzI1NiIsInJlZiI6','JIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6');

  let client = null;
  let currentMode = 'signin';
  let busy = false;
  let gateEl = null;
  let initialized = false;
  let authFinishing = false;

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function el(id) {
    return document.getElementById(id);
  }

  function getCanonicalRedirectUrl() {
    let path = window.location.pathname || '/';
    if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
    return window.location.origin + path;
  }

  function cleanAuthUrl() {
    try {
      window.history.replaceState({}, document.title, getCanonicalRedirectUrl());
    } catch (e) {
      console.warn('[AuthGate] Could not clean auth URL:', e);
    }
  }

  function getAuthCallbackParams() {
    const search = new URLSearchParams(window.location.search || '');
    const hashText = (window.location.hash || '').replace(/^#/, '');
    const hash = new URLSearchParams(hashText);

    return {
      code: search.get('code') || hash.get('code'),
      accessToken: hash.get('access_token'),
      refreshToken: hash.get('refresh_token'),
      error: search.get('error') || hash.get('error'),
      errorCode: search.get('error_code') || hash.get('error_code'),
      errorDescription: search.get('error_description') || hash.get('error_description')
    };
  }

  function safeSetText(id, text) {
    const node = el(id);
    if (node) node.textContent = text;
  }

  function showError(message) {
    const error = el('agError');
    const info = el('agInfo');
    if (error) {
      error.textContent = message || '';
      error.style.display = message ? 'block' : 'none';
    }
    if (info) info.style.display = 'none';
  }

  function showInfo(message) {
    const info = el('agInfo');
    const error = el('agError');
    if (info) {
      info.textContent = message || '';
      info.style.display = message ? 'block' : 'none';
    }
    if (error) error.style.display = 'none';
  }

  function setBusy(value) {
    busy = Boolean(value);
    const submit = el('agSubmit');
    const google = el('agGoogle');
    if (submit) {
      submit.disabled = busy || !client;
      submit.textContent = busy ? '⏳ Bitte warten…' : (currentMode === 'signin' ? 'Anmelden' : 'Konto erstellen');
    }
    if (google) google.disabled = busy || !client;
  }

  function injectStyles() {
    if (document.getElementById('authGateStyles')) return;

    const style = document.createElement('style');
    style.id = 'authGateStyles';
    style.textContent = `
      #authGate{position:fixed;inset:0;z-index:99999;background:#0a0a14;display:flex;align-items:center;justify-content:center;font-family:'Outfit',-apple-system,BlinkMacSystemFont,sans-serif;transition:opacity .4s ease}
      #authGate.fade-out{opacity:0;pointer-events:none}
      .ag-card{background:#13131f;border:1px solid #1f2937;border-radius:20px;padding:40px 36px;width:100%;max-width:400px;margin:16px;box-shadow:0 24px 64px rgba(0,0,0,.6)}
      .ag-logo{text-align:center;font-size:52px;margin-bottom:8px}.ag-title{text-align:center;font-family:'Bebas Neue','Outfit',sans-serif;font-size:32px;letter-spacing:.12em;color:#f3f4f6;margin-bottom:4px}.ag-sub{text-align:center;font-size:14px;color:#6b7280;margin-bottom:28px}
      .ag-tabs{display:flex;gap:4px;background:#0d0d1a;border-radius:10px;padding:4px;margin-bottom:24px}.ag-tab{flex:1;padding:9px;border:0;border-radius:7px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;background:transparent;color:#6b7280}.ag-tab.active{background:#1f2937;color:#f3f4f6}
      .ag-label{display:block;font-size:13px;font-weight:600;color:#9ca3af;margin-bottom:6px}.ag-input{width:100%;padding:12px 14px;background:#0d0d1a;border:1px solid #1f2937;border-radius:10px;color:#f3f4f6;font-size:15px;font-family:inherit;margin-bottom:14px;box-sizing:border-box;transition:border-color .2s}.ag-input:focus{outline:0;border-color:#7ab030;box-shadow:0 0 0 3px rgba(122,176,48,.15)}
      .ag-btn{width:100%;padding:13px;background:linear-gradient(135deg,#7ab030,#5a8a20);color:#fff;border:0;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;transition:opacity .2s,transform .15s;margin-bottom:16px}.ag-btn:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}.ag-btn:disabled{opacity:.5;cursor:not-allowed}
      .ag-divider{display:flex;align-items:center;gap:10px;color:#374151;font-size:13px;margin-bottom:16px}.ag-divider:before,.ag-divider:after{content:'';flex:1;height:1px;background:#1f2937}
      .ag-google{width:100%;padding:12px;background:#fff;border:0;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:opacity .2s}.ag-google:hover:not(:disabled){opacity:.9}.ag-google:disabled{opacity:.5;cursor:not-allowed}.ag-google-icon{width:20px;height:20px}
      .ag-error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;display:none}.ag-info{background:rgba(122,176,48,.12);border:1px solid rgba(122,176,48,.3);color:#a3d65a;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;display:none;text-align:center}
      .ag-spinner{text-align:center;padding:20px;color:#6b7280;font-size:14px}.ag-form{display:none}
    `;
    document.head.appendChild(style);
  }

  function createGate() {
    if (document.getElementById('authGate')) {
      gateEl = document.getElementById('authGate');
      return;
    }

    gateEl = document.createElement('div');
    gateEl.id = 'authGate';
    gateEl.innerHTML = `
      <div class="ag-card">
        <div class="ag-logo">🎯</div>
        <div class="ag-title">SCHUSSDUELL</div>
        <div class="ag-sub">Melde dich an um loszulegen</div>
        <div id="agSpinner" class="ag-spinner">⏳ Prüfe Anmeldung…</div>
        <div id="agForm" class="ag-form">
          <div class="ag-tabs">
            <button class="ag-tab active" id="agTabSignin" type="button" onclick="__agSetMode('signin')">Anmelden</button>
            <button class="ag-tab" id="agTabSignup" type="button" onclick="__agSetMode('signup')">Registrieren</button>
          </div>
          <div id="agError" class="ag-error"></div>
          <div id="agInfo" class="ag-info"></div>
          <label class="ag-label" for="agEmail">E-Mail-Adresse</label>
          <input id="agEmail" class="ag-input" type="email" placeholder="name@example.com" autocomplete="email">
          <label class="ag-label" for="agPassword">Passwort</label>
          <input id="agPassword" class="ag-input" type="password" placeholder="Mindestens 6 Zeichen" autocomplete="current-password">
          <button id="agSubmit" class="ag-btn" type="button" onclick="__agSubmit()">Anmelden</button>
          <div class="ag-divider">oder</div>
          <button id="agGoogle" class="ag-google" type="button" onclick="__agGoogle()">
            <svg class="ag-google-icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/><path fill="#FBBC05" d="M10.5 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.3-7.7 2.3-6.2 0-11.5-4.2-13.4-9.8l-7.8 6C6.7 42.6 14.7 48 24 48z"/></svg>
            Mit Google anmelden
          </button>
        </div>
      </div>
    `;
    document.body.insertBefore(gateEl, document.body.firstChild);

    const onKey = (event) => {
      if (event.key === 'Enter') window.__agSubmit();
    };
    el('agEmail')?.addEventListener('keydown', onKey);
    el('agPassword')?.addEventListener('keydown', onKey);
  }

  function showForm() {
    const spinner = el('agSpinner');
    const form = el('agForm');
    if (spinner) spinner.style.display = 'none';
    if (form) form.style.display = 'block';
    setBusy(false);
  }

  function hideGate(immediate = false) {
    if (!gateEl) return;
    if (immediate) {
      if (gateEl.parentElement) gateEl.remove();
      return;
    }
    gateEl.classList.add('fade-out');
    setTimeout(() => {
      if (gateEl && gateEl.parentElement) gateEl.remove();
    }, 420);
  }

  function exposeSession(session) {
    window.SupabaseClient = client;
    window.SupabaseSession = session;
    window.getAuthHeaders = () => ({ Authorization: `Bearer ${session.access_token}` });
    window.dispatchEvent(new CustomEvent('supabaseAuthReady', { detail: { session } }));

    try {
      const meta = session.user && session.user.user_metadata ? session.user.user_metadata : {};
      const name = meta.full_name || meta.name;
      if (name && !localStorage.getItem('sd_username')) {
        localStorage.setItem('sd_username', String(name).substring(0, 15));
      }
    } catch (e) {
      console.warn('[AuthGate] Username prefill skipped:', e);
    }
  }

  function reloadCleanlyAfterSignin() {
    const cleanUrl = getCanonicalRedirectUrl();
    setTimeout(() => window.location.replace(cleanUrl), 80);
  }

  function onAuthenticated(session, options = {}) {
    if (!session || !session.access_token) {
      showForm();
      return;
    }

    if (authFinishing && !options.reloadAfterSignin) return;
    exposeSession(session);

    if (options.reloadAfterSignin) {
      authFinishing = true;
      showInfo('✅ Anmeldung erfolgreich. App wird geladen…');
      hideGate(true);
      reloadCleanlyAfterSignin();
      return;
    }

    hideGate();
  }

  function waitForSupabase(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          clearInterval(timer);
          resolve(window.supabase);
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          clearInterval(timer);
          reject(new Error('Supabase konnte nicht geladen werden.'));
        }
      }, 50);
    });
  }

  async function getStoredSession() {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data && data.session ? data.session : null;
  }

  async function processOAuthRedirectIfPresent() {
    const params = getAuthCallbackParams();
    if (params.error || params.errorCode) {
      cleanAuthUrl();
      const msg = params.errorDescription || params.error || params.errorCode || 'Google-Anmeldung wurde abgebrochen oder ist fehlgeschlagen.';
      throw new Error(decodeURIComponent(String(msg).replace(/\+/g, ' ')));
    }

    if (params.code && client.auth.exchangeCodeForSession) {
      const { data, error } = await client.auth.exchangeCodeForSession(params.code);
      cleanAuthUrl();
      if (error) throw error;
      return (data && data.session) || await getStoredSession();
    }

    if (params.accessToken || params.refreshToken || window.location.hash.includes('access_token')) {
      const session = await getStoredSession();
      if (session) cleanAuthUrl();
      return session;
    }

    return null;
  }

  function setMode(mode) {
    currentMode = mode === 'signup' ? 'signup' : 'signin';
    el('agTabSignin')?.classList.toggle('active', currentMode === 'signin');
    el('agTabSignup')?.classList.toggle('active', currentMode === 'signup');
    const password = el('agPassword');
    if (password) password.autocomplete = currentMode === 'signin' ? 'current-password' : 'new-password';
    safeSetText('agSubmit', currentMode === 'signin' ? 'Anmelden' : 'Konto erstellen');
    showError('');
    showInfo('');
  }

  window.__agSetMode = setMode;

  window.__agSubmit = async function () {
    if (busy) return;
    if (!client) {
      showError('Anmeldung ist noch nicht bereit. Bitte kurz warten und erneut versuchen.');
      return;
    }

    const email = String(el('agEmail')?.value || '').trim();
    const password = String(el('agPassword')?.value || '');

    if (!email || !password) {
      showError('Bitte E-Mail und Passwort eingeben.');
      return;
    }
    if (password.length < 6) {
      showError('Passwort muss mindestens 6 Zeichen haben.');
      return;
    }

    setBusy(true);
    showError('');

    try {
      if (currentMode === 'signup') {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        const session = (data && data.session) || await getStoredSession();
        if (session) onAuthenticated(session, { reloadAfterSignin: true });
        else {
          showInfo('✅ Bestätigungs-E-Mail gesendet! Bitte überprüfe deinen Posteingang.');
          setBusy(false);
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const session = (data && data.session) || await getStoredSession();
        if (!session) throw new Error('Anmeldung erfolgreich, aber die Session konnte nicht gespeichert werden. Bitte lade die Seite neu und versuche es erneut.');
        onAuthenticated(session, { reloadAfterSignin: true });
      }
    } catch (err) {
      const message = err && err.message ? err.message : 'Unbekannter Fehler';
      if (message.includes('Invalid login credentials')) showError('E-Mail oder Passwort falsch.');
      else if (message.includes('Email not confirmed')) showError('Bitte bestätige zuerst deine E-Mail-Adresse.');
      else if (message.includes('User already registered')) showError('Diese E-Mail ist bereits registriert. Melde dich an.');
      else showError(message);
      setBusy(false);
      authFinishing = false;
    }
  };

  window.__agGoogle = async function () {
    if (busy) return;
    if (!client) {
      showError('Google-Anmeldung ist noch nicht bereit. Bitte kurz warten und erneut versuchen.');
      return;
    }

    setBusy(true);
    showError('');
    showInfo('Weiterleitung zu Google…');

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getCanonicalRedirectUrl(),
          queryParams: { prompt: 'select_account' }
        }
      });
      if (error) throw error;
    } catch (err) {
      showError((err && err.message) || 'Google-Anmeldung fehlgeschlagen.');
      setBusy(false);
    }
  };

  async function init() {
    if (initialized) return;
    initialized = true;

    injectStyles();
    createGate();
    setBusy(true);

    try {
      await waitForSupabase();
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        }
      });

      const oauthSession = await processOAuthRedirectIfPresent();
      if (oauthSession) {
        onAuthenticated(oauthSession, { reloadAfterSignin: true });
        return;
      }

      client.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) onAuthenticated(session);
      });

      const session = await getStoredSession();
      if (session) {
        onAuthenticated(session);
        return;
      }

      showForm();
    } catch (err) {
      console.warn('[AuthGate] Supabase boot failed:', err);
      showForm();
      showError((err && err.message) || 'Anmeldesystem konnte nicht geladen werden.');
      setBusy(false);
    }
  }

  onReady(init);
})();
