/**
 * Auth-Gate — Supabase-Authentifizierung
 * Zeigt einen Login-Screen bevor der User die App nutzen kann.
 * Unterstützt: E-Mail + Passwort, Google OAuth.
 * Legt window.SupabaseClient + window.SupabaseSession fest.
 */
(function () {
  'use strict';

  const SUPABASE_URL  = 'https://fknftkvozwfkcarldzms.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbmZ0a3Zvendma2Nhcmxkem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTYxOTYsImV4cCI6MjA5MTY3MjE5Nn0.pWSR48-XIUYWWO5pPQsGDnE-qxb6c5EiKuTQn2myKRg';

  // ── CSS ──────────────────────────────────────────────────────────────────────
  const css = `
    #authGate {
      position: fixed; inset: 0; z-index: 99999;
      background: #0a0a14;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      transition: opacity 0.4s ease;
    }
    #authGate.fade-out { opacity: 0; pointer-events: none; }

    .ag-card {
      background: #13131f;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 40px 36px;
      width: 100%;
      max-width: 400px;
      margin: 16px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    }

    .ag-logo { text-align: center; font-size: 52px; margin-bottom: 8px; }
    .ag-title {
      text-align: center;
      font-family: 'Bebas Neue', 'Outfit', sans-serif;
      font-size: 32px;
      letter-spacing: .12em;
      color: #f3f4f6;
      margin-bottom: 4px;
    }
    .ag-sub {
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 28px;
    }

    .ag-tabs {
      display: flex;
      gap: 4px;
      background: #0d0d1a;
      border-radius: 10px;
      padding: 4px;
      margin-bottom: 24px;
    }
    .ag-tab {
      flex: 1; padding: 9px; border: none; border-radius: 7px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      transition: all 0.2s;
      background: transparent; color: #6b7280;
    }
    .ag-tab.active { background: #1f2937; color: #f3f4f6; }

    .ag-label {
      display: block;
      font-size: 13px; font-weight: 600;
      color: #9ca3af;
      margin-bottom: 6px;
    }
    .ag-input {
      width: 100%; padding: 12px 14px;
      background: #0d0d1a;
      border: 1px solid #1f2937;
      border-radius: 10px;
      color: #f3f4f6;
      font-size: 15px;
      font-family: inherit;
      margin-bottom: 14px;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .ag-input:focus { outline: none; border-color: #7ab030; box-shadow: 0 0 0 3px rgba(122,176,48,0.15); }

    .ag-btn {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg, #7ab030, #5a8a20);
      color: #fff;
      border: none; border-radius: 10px;
      font-size: 16px; font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
      margin-bottom: 16px;
    }
    .ag-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .ag-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .ag-divider {
      display: flex; align-items: center; gap: 10px;
      color: #374151; font-size: 13px;
      margin-bottom: 16px;
    }
    .ag-divider::before, .ag-divider::after {
      content: ''; flex: 1; height: 1px; background: #1f2937;
    }

    .ag-google {
      width: 100%; padding: 12px;
      background: #fff;
      border: none; border-radius: 10px;
      font-size: 15px; font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      transition: opacity 0.2s;
    }
    .ag-google:hover:not(:disabled) { opacity: 0.9; }
    .ag-google:disabled { opacity: 0.5; cursor: not-allowed; }
    .ag-google-icon { width: 20px; height: 20px; }

    .ag-error {
      background: rgba(239,68,68,0.12);
      border: 1px solid rgba(239,68,68,0.3);
      color: #fca5a5;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 14px;
      display: none;
    }
    .ag-info {
      background: rgba(122,176,48,0.12);
      border: 1px solid rgba(122,176,48,0.3);
      color: #a3d65a;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 14px;
      display: none;
      text-align: center;
    }

    .ag-spinner {
      text-align: center; padding: 20px; color: #6b7280; font-size: 14px;
    }
    .ag-form { display: none; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── HTML ─────────────────────────────────────────────────────────────────────
  const gateEl = document.createElement('div');
  gateEl.id = 'authGate';
  gateEl.innerHTML = `
    <div class="ag-card">
      <div class="ag-logo">🎯</div>
      <div class="ag-title">SCHUSSDUELL</div>
      <div class="ag-sub">Melde dich an um loszulegen</div>

      <div id="agSpinner" class="ag-spinner">⏳ Prüfe Anmeldung…</div>

      <div id="agForm" class="ag-form">
        <div class="ag-tabs">
          <button class="ag-tab active" id="agTabSignin" onclick="__agSetMode('signin')">Anmelden</button>
          <button class="ag-tab"        id="agTabSignup" onclick="__agSetMode('signup')">Registrieren</button>
        </div>

        <div id="agError" class="ag-error"></div>
        <div id="agInfo"  class="ag-info"></div>

        <label class="ag-label">E-Mail-Adresse</label>
        <input  id="agEmail" class="ag-input" type="email" placeholder="name@example.com" autocomplete="email">

        <label class="ag-label">Passwort</label>
        <input  id="agPassword" class="ag-input" type="password" placeholder="Mindestens 6 Zeichen" autocomplete="current-password">

        <button id="agSubmit" class="ag-btn" onclick="__agSubmit()">Anmelden</button>

        <div class="ag-divider">oder</div>

        <button id="agGoogle" class="ag-google" onclick="__agGoogle()">
          <svg class="ag-google-icon" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
            <path fill="#FBBC05" d="M10.5 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.8-6.1z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.3-7.7 2.3-6.2 0-11.5-4.2-13.4-9.8l-7.8 6C6.7 42.6 14.7 48 24 48z"/>
          </svg>
          Mit Google anmelden
        </button>
      </div>
    </div>
  `;
  document.body.insertBefore(gateEl, document.body.firstChild);

  // ── State ─────────────────────────────────────────────────────────────────────
  let client = null;
  let currentMode = 'signin';
  let busy = false;

  function el(id) { return document.getElementById(id); }

  function showError(msg) {
    const e = el('agError'), i = el('agInfo');
    e.textContent = msg; e.style.display = msg ? 'block' : 'none';
    i.style.display = 'none';
  }
  function showInfo(msg) {
    const i = el('agInfo'), e = el('agError');
    i.textContent = msg; i.style.display = msg ? 'block' : 'none';
    e.style.display = 'none';
  }
  function setBusy(v) {
    busy = v;
    el('agSubmit').disabled = v;
    el('agGoogle').disabled = v;
    el('agSubmit').textContent = v ? '⏳ Bitte warten…' : (currentMode === 'signin' ? 'Anmelden' : 'Konto erstellen');
  }

  function showForm() {
    el('agSpinner').style.display = 'none';
    el('agForm').style.display = 'block';
  }

  function hideGate() {
    gateEl.classList.add('fade-out');
    setTimeout(() => gateEl.remove(), 420);
  }

  function onAuthenticated(session) {
    window.SupabaseClient  = client;
    window.SupabaseSession = session;
    // Expose helper used by api fetch calls
    window.getAuthHeaders = () => ({
      Authorization: `Bearer ${session.access_token}`,
    });
    window.dispatchEvent(new CustomEvent('supabaseAuthReady', { detail: { session } }));

    // Pre-fill username from Google display name if not set
    const name = session.user?.user_metadata?.full_name || session.user?.user_metadata?.name;
    if (name && !localStorage.getItem('sd_username')) {
      localStorage.setItem('sd_username', name.substring(0, 15));
    }

    hideGate();
  }

  // ── Public mode toggle ────────────────────────────────────────────────────────
  window.__agSetMode = function (mode) {
    currentMode = mode;
    el('agTabSignin').classList.toggle('active', mode === 'signin');
    el('agTabSignup').classList.toggle('active', mode === 'signup');
    el('agPassword').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    el('agSubmit').textContent = mode === 'signin' ? 'Anmelden' : 'Konto erstellen';
    showError(''); showInfo('');
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  window.__agSubmit = async function () {
    if (busy || !client) return;
    const email    = el('agEmail').value.trim();
    const password = el('agPassword').value;

    if (!email || !password) { showError('Bitte E-Mail und Passwort eingeben.'); return; }
    if (password.length < 6) { showError('Passwort muss mindestens 6 Zeichen haben.'); return; }

    setBusy(true); showError('');

    try {
      if (currentMode === 'signup') {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          onAuthenticated(data.session);
        } else {
          // E-Mail-Bestätigung erforderlich
          showInfo('✅ Bestätigungs-E-Mail gesendet! Bitte überprüfe deinen Posteingang und klicke den Link.');
          setBusy(false);
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthenticated(data.session);
      }
    } catch (err) {
      const msg = err.message || 'Unbekannter Fehler';
      if (msg.includes('Invalid login credentials')) showError('E-Mail oder Passwort falsch.');
      else if (msg.includes('Email not confirmed'))  showError('Bitte bestätige zuerst deine E-Mail-Adresse.');
      else if (msg.includes('User already registered')) showError('Diese E-Mail ist bereits registriert. Melde dich an.');
      else showError(msg);
      setBusy(false);
    }
  };

  // ── Google OAuth ──────────────────────────────────────────────────────────────
  window.__agGoogle = async function () {
    if (busy || !client) return;
    setBusy(true); showError('');
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      });
      if (error) throw error;
      // Browser wird weitergeleitet — kein weiterer Code nötig
    } catch (err) {
      showError(err.message || 'Google-Anmeldung fehlgeschlagen.');
      setBusy(false);
    }
  };

  // ── Enter key on inputs ───────────────────────────────────────────────────────
  function onKey(e) { if (e.key === 'Enter') window.__agSubmit(); }

  // ── Init ──────────────────────────────────────────────────────────────────────
  async function init() {
    // Warten bis supabase-js verfügbar ist
    if (typeof window.supabase === 'undefined') {
      setTimeout(init, 30);
      return;
    }

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

    // Auth-State-Listener (fängt OAuth-Redirect auf)
    client.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        if (document.getElementById('authGate')) onAuthenticated(session);
      }
    });

    // Prüfe bestehende Session
    const { data } = await client.auth.getSession();
    if (data.session) {
      onAuthenticated(data.session);
      return;
    }

    // Kein Session → Login-Form zeigen
    showForm();

    // Enter-Taste
    el('agEmail')   ?.addEventListener('keydown', onKey);
    el('agPassword')?.addEventListener('keydown', onKey);
  }

  // Starte sobald DOM bereit ist
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
