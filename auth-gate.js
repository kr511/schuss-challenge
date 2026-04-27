/* Auth-Gate: Supabase login + remembered local play mode */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://fknftkvozwfkcarldzms.supabase.co';
  var SUPABASE_ANON = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbmZ0a3Zvendma2Nhcmxkem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTYxOTYsImV4cCI6MjA5MTY3MjE5Nn0',
    'pWSR48-XIUYWWO5pPQsGDnE-qxb6c5EiKuTQn2myKRg'
  ].join('.');

  var LOCAL_KEYS = ['sd_local_play', 'sd_local_mode'];
  var client = null;
  var gateEl = null;
  var busy = false;
  var mode = 'signin';
  var finishing = false;
  var PKCE_RECOVERY_MESSAGE = 'Google-Anmeldung konnte nicht abgeschlossen werden. Bitte erneut anmelden oder lokal spielen.';

  function hasLocalMode() {
    return LOCAL_KEYS.some(function (key) {
      return localStorage.getItem(key) === '1' || localStorage.getItem(key) === 'true';
    });
  }

  function rememberLocalMode() {
    LOCAL_KEYS.forEach(function (key) { localStorage.setItem(key, '1'); });
    if (!localStorage.getItem('username')) localStorage.setItem('username', 'Gast');
    if (!localStorage.getItem('sd_username')) localStorage.setItem('sd_username', 'Gast');
    window.SchussduellLocalMode = true;
    window.SchussduellLocalPlay = true;
    window.SupabaseSession = null;
    window.getAuthHeaders = function () { return {}; };
  }

  function appUrl() {
    var path = window.location.pathname || '/';
    if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
    return window.location.origin + path;
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function $(id) { return document.getElementById(id); }

  function removeGate() {
    if (gateEl && gateEl.parentElement) gateEl.remove();
    var existing = $('authGate');
    if (existing && existing.parentElement) existing.remove();
  }

  function enterLocalMode(reload) {
    rememberLocalMode();
    removeGate();
    try {
      window.dispatchEvent(new CustomEvent('supabaseAuthReady', { detail: { session: null, local: true } }));
    } catch (e) {}
    if (reload) setTimeout(function () { window.location.replace(appUrl() + '?local=1'); }, 60);
  }

  function injectStyles() {
    if ($('authGateStyles')) return;
    var style = document.createElement('style');
    style.id = 'authGateStyles';
    style.textContent = '#authGate{position:fixed;inset:0;z-index:99999;background:#0a0a14;display:flex;align-items:center;justify-content:center;font-family:Outfit,-apple-system,BlinkMacSystemFont,sans-serif}.ag-card{background:#13131f;border:1px solid #1f2937;border-radius:20px;padding:34px 30px;width:100%;max-width:400px;margin:16px;box-shadow:0 24px 64px rgba(0,0,0,.6)}.ag-logo{text-align:center;font-size:52px;margin-bottom:8px}.ag-title{text-align:center;font-family:"Bebas Neue",Outfit,sans-serif;font-size:32px;letter-spacing:.12em;color:#f3f4f6;margin-bottom:4px}.ag-sub{text-align:center;font-size:14px;color:#6b7280;margin-bottom:24px}.ag-tabs{display:flex;gap:4px;background:#0d0d1a;border-radius:10px;padding:4px;margin-bottom:20px}.ag-tab{flex:1;padding:9px;border:0;border-radius:7px;font-size:14px;font-weight:700;cursor:pointer;background:transparent;color:#6b7280}.ag-tab.active{background:#1f2937;color:#f3f4f6}.ag-label{display:block;font-size:13px;font-weight:700;color:#9ca3af;margin-bottom:6px}.ag-input{width:100%;padding:12px 14px;background:#0d0d1a;border:1px solid #1f2937;border-radius:10px;color:#f3f4f6;font-size:15px;margin-bottom:14px;box-sizing:border-box}.ag-input:focus{outline:0;border-color:#7ab030;box-shadow:0 0 0 3px rgba(122,176,48,.15)}.ag-btn{width:100%;padding:13px;background:linear-gradient(135deg,#7ab030,#5a8a20);color:#fff;border:0;border-radius:10px;font-size:16px;font-weight:800;cursor:pointer;margin-bottom:12px}.ag-google{width:100%;padding:12px;background:#fff;border:0;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px}.ag-local{width:100%;padding:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#f3f4f6;font-size:14px;font-weight:800;cursor:pointer}.ag-btn:disabled,.ag-google:disabled,.ag-local:disabled{opacity:.5;cursor:not-allowed}.ag-divider{display:flex;align-items:center;gap:10px;color:#374151;font-size:13px;margin:12px 0}.ag-divider:before,.ag-divider:after{content:"";flex:1;height:1px;background:#1f2937}.ag-error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;display:none}.ag-info{background:rgba(122,176,48,.12);border:1px solid rgba(122,176,48,.3);color:#a3d65a;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;display:none;text-align:center}.ag-hint{font-size:12px;line-height:1.35;color:#6b7280;text-align:center;margin-top:9px}.ag-spinner{text-align:center;padding:20px;color:#6b7280;font-size:14px}.ag-form{display:none}';
    document.head.appendChild(style);
  }

  function createGate() {
    if ($('authGate')) { gateEl = $('authGate'); return; }
    gateEl = document.createElement('div');
    gateEl.id = 'authGate';
    gateEl.innerHTML = '<div class="ag-card"><div class="ag-logo">🎯</div><div class="ag-title">SCHUSSDUELL</div><div class="ag-sub">Einmal anmelden oder lokal spielen.</div><div id="agSpinner" class="ag-spinner">⏳ Prüfe Anmeldung…</div><div id="agForm" class="ag-form"><div class="ag-tabs"><button class="ag-tab active" id="agTabSignin" type="button" onclick="__agSetMode(\'signin\')">Anmelden</button><button class="ag-tab" id="agTabSignup" type="button" onclick="__agSetMode(\'signup\')">Registrieren</button></div><div id="agError" class="ag-error"></div><div id="agInfo" class="ag-info"></div><label class="ag-label" for="agEmail">E-Mail-Adresse</label><input id="agEmail" class="ag-input" type="email" placeholder="name@example.com" autocomplete="email"><label class="ag-label" for="agPassword">Passwort</label><input id="agPassword" class="ag-input" type="password" placeholder="Mindestens 6 Zeichen" autocomplete="current-password"><button id="agSubmit" class="ag-btn" type="button" onclick="__agSubmit()">Anmelden</button><div class="ag-divider">oder</div><button id="agGoogle" class="ag-google" type="button" onclick="__agGoogle()">G&nbsp; Mit Google anmelden</button><button id="agLocal" class="ag-local" type="button" onclick="__agLocal()">👤 Ohne Anmeldung spielen</button><div class="ag-hint">Nach dem ersten Start wird diese Auswahl auf diesem Gerät gemerkt.</div></div></div>';
    document.body.insertBefore(gateEl, document.body.firstChild);
    var onKey = function (ev) { if (ev.key === 'Enter') window.__agSubmit(); };
    $('agEmail') && $('agEmail').addEventListener('keydown', onKey);
    $('agPassword') && $('agPassword').addEventListener('keydown', onKey);
  }

  function showForm() {
    var spinner = $('agSpinner');
    var form = $('agForm');
    if (spinner) spinner.style.display = 'none';
    if (form) form.style.display = 'block';
    setBusy(false);
  }

  function showError(message) {
    var error = $('agError');
    var info = $('agInfo');
    if (error) { error.textContent = message || ''; error.style.display = message ? 'block' : 'none'; }
    if (info) info.style.display = 'none';
  }

  function showInfo(message) {
    var info = $('agInfo');
    var error = $('agError');
    if (info) { info.textContent = message || ''; info.style.display = message ? 'block' : 'none'; }
    if (error) error.style.display = 'none';
  }

  function getErrorMessage(err) {
    if (!err) return '';
    if (typeof err === 'string') return err;
    return String(err.message || err.error_description || err.error || err);
  }

  function isPkceVerifierError(err) {
    var msg = getErrorMessage(err).toLowerCase();
    return msg.indexOf('code verifier') !== -1 || msg.indexOf('pkce') !== -1;
  }

  function createPkceRecoveryError(original) {
    if (original && original.recoverablePkce) return original;
    var err = new Error(PKCE_RECOVERY_MESSAGE);
    err.recoverablePkce = true;
    err.originalError = original;
    return err;
  }

  function friendlyAuthError(err, fallback) {
    if (err && err.recoverablePkce) return PKCE_RECOVERY_MESSAGE;
    if (isPkceVerifierError(err)) return PKCE_RECOVERY_MESSAGE;
    return getErrorMessage(err) || fallback || 'Anmeldung konnte nicht geladen werden. Du kannst lokal spielen.';
  }

  function setBusy(value) {
    busy = !!value;
    ['agSubmit', 'agGoogle', 'agLocal'].forEach(function (id) { var n = $(id); if (n) n.disabled = busy && id !== 'agLocal'; });
    var submit = $('agSubmit');
    if (submit) submit.textContent = busy ? '⏳ Bitte warten…' : (mode === 'signin' ? 'Anmelden' : 'Konto erstellen');
  }

  function exposeSession(session) {
    LOCAL_KEYS.forEach(function (key) { localStorage.removeItem(key); });
    window.SupabaseClient = client;
    window.SupabaseSession = session;
    window.SchussduellLocalMode = false;
    window.getAuthHeaders = function () { return { Authorization: 'Bearer ' + session.access_token }; };
    try { window.dispatchEvent(new CustomEvent('supabaseAuthReady', { detail: { session: session } })); } catch (e) {}
    var meta = session.user && session.user.user_metadata ? session.user.user_metadata : {};
    var name = meta.full_name || meta.name;
    if (name && !localStorage.getItem('sd_username')) localStorage.setItem('sd_username', String(name).substring(0, 15));
  }

  function onAuthenticated(session, reload) {
    if (!session || !session.access_token) { showForm(); return; }
    if (finishing && !reload) return;
    exposeSession(session);
    if (reload) {
      finishing = true;
      showInfo('✅ Anmeldung erfolgreich. App wird geladen…');
      removeGate();
      setTimeout(function () { window.location.replace(appUrl()); }, 80);
      return;
    }
    removeGate();
  }

  function waitForSupabase(timeout) {
    timeout = timeout || 10000;
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      var timer = setInterval(function () {
        if (window.supabase && typeof window.supabase.createClient === 'function') { clearInterval(timer); resolve(); return; }
        if (Date.now() - started >= timeout) { clearInterval(timer); reject(new Error('Supabase konnte nicht geladen werden.')); }
      }, 50);
    });
  }

  async function getSession() {
    if (!client) return null;
    var res = await client.auth.getSession();
    if (res.error) throw res.error;
    return res.data && res.data.session ? res.data.session : null;
  }

  function getOAuthParams() {
    var search = new URLSearchParams(window.location.search || '');
    var hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    return {
      code: search.get('code') || hash.get('code'),
      error: search.get('error') || hash.get('error'),
      errorDescription: search.get('error_description') || hash.get('error_description')
    };
  }

  function cleanUrl() {
    try { window.history.replaceState({}, document.title, appUrl()); } catch (e) {}
  }

  async function handleOAuthCallback() {
    var p = getOAuthParams();
    if (p.error) { cleanUrl(); throw new Error(decodeURIComponent(String(p.errorDescription || p.error).replace(/\+/g, ' '))); }
    if (p.code && client.auth.exchangeCodeForSession) {
      try {
        var res = await client.auth.exchangeCodeForSession(p.code);
        cleanUrl();
        if (res.error) {
          if (isPkceVerifierError(res.error)) throw createPkceRecoveryError(res.error);
          throw res.error;
        }
        return (res.data && res.data.session) || await getSession();
      } catch (err) {
        cleanUrl();
        if (isPkceVerifierError(err)) throw createPkceRecoveryError(err);
        throw err;
      }
    }
    return null;
  }

  window.__agSetMode = function (next) {
    mode = next === 'signup' ? 'signup' : 'signin';
    $('agTabSignin') && $('agTabSignin').classList.toggle('active', mode === 'signin');
    $('agTabSignup') && $('agTabSignup').classList.toggle('active', mode === 'signup');
    var password = $('agPassword');
    if (password) password.autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    var submit = $('agSubmit');
    if (submit) submit.textContent = mode === 'signin' ? 'Anmelden' : 'Konto erstellen';
    showError('');
    showInfo('');
  };

  window.__agLocal = function () { enterLocalMode(true); };

  window.__agSubmit = async function () {
    if (busy || !client) return;
    var email = String(($('agEmail') && $('agEmail').value) || '').trim();
    var password = String(($('agPassword') && $('agPassword').value) || '');
    if (!email || !password) { showError('Bitte E-Mail und Passwort eingeben.'); return; }
    if (password.length < 6) { showError('Passwort muss mindestens 6 Zeichen haben.'); return; }
    setBusy(true);
    showError('');
    try {
      var res = mode === 'signup' ? await client.auth.signUp({ email: email, password: password }) : await client.auth.signInWithPassword({ email: email, password: password });
      if (res.error) throw res.error;
      var session = (res.data && res.data.session) || await getSession();
      if (session) onAuthenticated(session, true);
      else { showInfo('✅ Bestätigungs-E-Mail gesendet! Bitte überprüfe deinen Posteingang.'); setBusy(false); }
    } catch (err) {
      var msg = err && err.message ? err.message : 'Unbekannter Fehler';
      if (msg.includes('Invalid login credentials')) msg = 'E-Mail oder Passwort falsch.';
      if (msg.includes('Email not confirmed')) msg = 'Bitte bestätige zuerst deine E-Mail-Adresse.';
      showError(msg);
      setBusy(false);
      finishing = false;
    }
  };

  window.__agGoogle = async function () {
    if (busy || !client) return;
    setBusy(true);
    showInfo('Weiterleitung zu Google…');
    try {
      var res = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: appUrl(), queryParams: { prompt: 'select_account' } } });
      if (res.error) throw res.error;
    } catch (err) {
      showError(friendlyAuthError(err, 'Google-Anmeldung fehlgeschlagen.'));
      setBusy(false);
    }
  };

  async function init() {
    if (hasLocalMode()) { enterLocalMode(false); return; }
    injectStyles();
    createGate();

    // Formular sofort anzeigen — kein blockierender Spinner
    showForm();

    // Session im Hintergrund prüfen (kein await der die UI blockiert)
    (async function checkSession() {
      try {
        await waitForSupabase(6000);
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
        var oauthSession = await handleOAuthCallback();
        if (oauthSession) { onAuthenticated(oauthSession, true); return; }
        client.auth.onAuthStateChange(function (event, session) {
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) onAuthenticated(session, false);
        });
        var session = await Promise.race([
          getSession(),
          new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 5000); })
        ]);
        if (session) { onAuthenticated(session, false); }
      } catch (err) {
        console.warn('[AuthGate] Session-Check fehlgeschlagen:', err);
      }
    })();
  }

  ready(init);
})();
