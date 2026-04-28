/* Schussduell – Profile Settings Panel */
(function () {
  'use strict';

  var OVERLAY_ID = 'profileSettingsOverlay';
  var STYLE_ID = 'profileSettingsStyles';
  var PROFILE_BUTTON_IDS = ['pdProfileBtn', 'profileIcon'];
  var SOUND_KEY = 'sd_sound_enabled';
  var HAPTIC_KEY = 'sd_haptics_enabled';
  var LOCAL_KEYS = ['sd_local_play', 'sd_local_mode'];

  function $(id) { return document.getElementById(id); }

  function getStoredName() {
    return localStorage.getItem('sd_username') || localStorage.getItem('username') || 'Spieler';
  }

  function sanitizeName(value) {
    return String(value || '')
      .trim()
      .replace(/[.#$/\[\]<>]/g, '_')
      .replace(/\s+/g, ' ')
      .slice(0, 15);
  }

  function isLocalMode() {
    return window.SchussduellLocalMode === true ||
      window.SchussduellLocalPlay === true ||
      LOCAL_KEYS.some(function (key) { return localStorage.getItem(key) === '1'; });
  }

  function hasSession() {
    return Boolean(window.SupabaseSession && window.SupabaseSession.access_token);
  }

  function getAccountLabel() {
    if (isLocalMode()) return 'Lokal';
    if (hasSession()) return 'Online';
    return 'Nicht angemeldet';
  }

  function getUserEmail() {
    var session = window.SupabaseSession;
    return session && session.user && session.user.email ? session.user.email : '';
  }

  function settingEnabled(key, fallback) {
    var value = localStorage.getItem(key);
    if (value === null || value === undefined) return fallback;
    return value === '1' || value === 'true';
  }

  function setSetting(key, enabled) {
    localStorage.setItem(key, enabled ? '1' : '0');
  }

  function injectStyles() {
    if ($(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#profileSettingsOverlay{position:fixed;inset:0;z-index:10040;background:rgba(0,0,0,.58);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:none;align-items:flex-end;justify-content:center;font-family:Outfit,-apple-system,BlinkMacSystemFont,sans-serif}',
      '#profileSettingsOverlay.is-open{display:flex}',
      '.ps-card{width:100%;max-width:520px;max-height:88vh;overflow:auto;background:linear-gradient(180deg,rgba(20,24,34,.98),rgba(8,10,16,.98));border:1px solid rgba(255,255,255,.1);border-radius:26px 26px 0 0;box-shadow:0 -24px 80px rgba(0,0,0,.55);padding:22px 20px 26px;color:#fff}',
      '.ps-grip{width:42px;height:5px;border-radius:99px;background:rgba(255,255,255,.18);margin:0 auto 18px}',
      '.ps-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px}',
      '.ps-title{font-size:1.28rem;font-weight:900;letter-spacing:.02em;margin:0}',
      '.ps-sub{font-size:.82rem;color:rgba(255,255,255,.48);margin-top:4px}',
      '.ps-close{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-weight:900;cursor:pointer}',
      '.ps-section{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:15px;margin-bottom:12px}',
      '.ps-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.42);font-weight:800;margin-bottom:8px}',
      '.ps-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid rgba(255,255,255,.06)}',
      '.ps-row:first-of-type{border-top:0;padding-top:0}',
      '.ps-row-text{min-width:0}',
      '.ps-row-title{font-size:.94rem;font-weight:800;color:#fff}',
      '.ps-row-desc{font-size:.78rem;color:rgba(255,255,255,.45);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ps-input-wrap{display:flex;gap:8px;margin-top:8px}',
      '.ps-input{flex:1;min-width:0;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#fff;padding:12px 12px;font-size:15px;outline:0}',
      '.ps-input:focus{border-color:#7ab030;box-shadow:0 0 0 3px rgba(122,176,48,.16)}',
      '.ps-btn{border:0;border-radius:12px;padding:11px 13px;font-weight:900;cursor:pointer;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.12)}',
      '.ps-btn.primary{background:linear-gradient(135deg,#7ab030,#5a8a20);border-color:rgba(122,176,48,.6)}',
      '.ps-btn.danger{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.35);color:#fecaca;width:100%;margin-top:6px}',
      '.ps-btn.ghost{background:rgba(255,255,255,.045)}',
      '.ps-switch{position:relative;width:52px;height:30px;flex:0 0 auto}',
      '.ps-switch input{opacity:0;width:0;height:0}',
      '.ps-slider{position:absolute;inset:0;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.14);border-radius:99px;cursor:pointer;transition:.18s}',
      '.ps-slider:before{content:"";position:absolute;width:22px;height:22px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.18s;box-shadow:0 3px 10px rgba(0,0,0,.35)}',
      '.ps-switch input:checked+.ps-slider{background:rgba(122,176,48,.45);border-color:rgba(122,176,48,.7)}',
      '.ps-switch input:checked+.ps-slider:before{transform:translateX(22px)}',
      '.ps-pill{display:inline-flex;align-items:center;gap:6px;border-radius:99px;padding:7px 10px;background:rgba(122,176,48,.13);border:1px solid rgba(122,176,48,.28);color:#c9f58b;font-size:.78rem;font-weight:900}',
      '.ps-toast{display:none;margin-top:10px;border-radius:12px;padding:10px 12px;font-size:.82rem;font-weight:800;background:rgba(122,176,48,.12);border:1px solid rgba(122,176,48,.28);color:#c9f58b}',
      '.ps-toast.is-visible{display:block}',
      '@media(min-width:700px){#profileSettingsOverlay{align-items:center}.ps-card{border-radius:26px;max-height:82vh}}'
    ].join('');
    document.head.appendChild(style);
  }

  function makeSwitch(id, checked) {
    return '<label class="ps-switch"><input id="' + id + '" type="checkbox" ' + (checked ? 'checked' : '') + '><span class="ps-slider"></span></label>';
  }

  function renderPanel() {
    injectStyles();
    var overlay = $(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      document.body.appendChild(overlay);
    }

    var name = getStoredName();
    var email = getUserEmail();
    var soundEnabled = settingEnabled(SOUND_KEY, true);
    var hapticEnabled = settingEnabled(HAPTIC_KEY, true);
    var accountLabel = getAccountLabel();

    overlay.innerHTML = '<div class="ps-card" role="dialog" aria-modal="true" aria-label="Profil Einstellungen">' +
      '<div class="ps-grip"></div>' +
      '<div class="ps-head"><div><h2 class="ps-title">Profil & Einstellungen</h2><div class="ps-sub">Passe dein Schussduell-Erlebnis an.</div></div><button class="ps-close" id="psCloseBtn" type="button">×</button></div>' +
      '<div class="ps-section"><div class="ps-label">Konto</div>' +
      '<div class="ps-row"><div class="ps-row-text"><div class="ps-row-title">Status</div><div class="ps-row-desc">' + (email || 'Kein Online-Konto aktiv') + '</div></div><span class="ps-pill">' + accountLabel + '</span></div>' +
      '<div class="ps-input-wrap"><input id="psNameInput" class="ps-input" maxlength="15" value="' + escapeHtml(name) + '" placeholder="Schützenname"><button id="psSaveNameBtn" class="ps-btn primary" type="button">Speichern</button></div><div id="psToast" class="ps-toast"></div></div>' +
      '<div class="ps-section"><div class="ps-label">App</div>' +
      '<div class="ps-row"><div class="ps-row-text"><div class="ps-row-title">Soundeffekte</div><div class="ps-row-desc">Treffer-, Klick- und Sieg-Sounds</div></div>' + makeSwitch('psSoundSwitch', soundEnabled) + '</div>' +
      '<div class="ps-row"><div class="ps-row-text"><div class="ps-row-title">Haptisches Feedback</div><div class="ps-row-desc">Vibrationen auf unterstützten Geräten</div></div>' + makeSwitch('psHapticSwitch', hapticEnabled) + '</div></div>' +
      '<div class="ps-section"><div class="ps-label">Daten</div>' +
      '<div class="ps-row"><div class="ps-row-text"><div class="ps-row-title">Cloud-Sync</div><div class="ps-row-desc">' + (hasSession() ? 'Aktiv für dein Online-Konto' : 'Nur mit Login aktiv') + '</div></div><button id="psSyncBtn" class="ps-btn ghost" type="button">Sync</button></div>' +
      '<div class="ps-row"><div class="ps-row-text"><div class="ps-row-title">Lokaler Modus</div><div class="ps-row-desc">Ohne Konto spielen, keine Cloud-Rangliste</div></div><button id="psLocalBtn" class="ps-btn ghost" type="button">Lokal</button></div></div>' +
      '<button id="psLogoutBtn" class="ps-btn danger" type="button">🚪 Abmelden</button>' +
      '</div>';

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    }, { once: true });

    bindPanelEvents();
    return overlay;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char];
    });
  }

  function showToast(message) {
    var toast = $('psToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    setTimeout(function () { toast.classList.remove('is-visible'); }, 1800);
  }

  function saveName() {
    var input = $('psNameInput');
    var name = sanitizeName(input && input.value);
    if (!name) {
      showToast('Bitte gib einen Namen ein.');
      return;
    }

    localStorage.setItem('sd_username', name);
    localStorage.setItem('username', name);

    var pdName = $('pdUserName');
    if (pdName) pdName.textContent = name;
    var initial = $('pdProfileInitial');
    if (initial) initial.textContent = name.charAt(0).toUpperCase();

    try {
      if (typeof window.refreshStateFromLocalStorage === 'function') window.refreshStateFromLocalStorage();
      if (window.SupabaseBackendSync && typeof window.SupabaseBackendSync.syncProfile === 'function') {
        window.SupabaseBackendSync.syncProfile(name);
      }
    } catch (err) {
      console.warn('[ProfileSettings] profile sync failed:', err);
    }

    showToast('Name gespeichert.');
  }

  function bindPanelEvents() {
    var closeBtn = $('psCloseBtn');
    var saveBtn = $('psSaveNameBtn');
    var nameInput = $('psNameInput');
    var soundSwitch = $('psSoundSwitch');
    var hapticSwitch = $('psHapticSwitch');
    var syncBtn = $('psSyncBtn');
    var localBtn = $('psLocalBtn');
    var logoutBtn = $('psLogoutBtn');

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (saveBtn) saveBtn.addEventListener('click', saveName);
    if (nameInput) nameInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') saveName();
    });
    if (soundSwitch) soundSwitch.addEventListener('change', function () {
      setSetting(SOUND_KEY, soundSwitch.checked);
      try { if (window.Sfx) window.Sfx.muted = !soundSwitch.checked; } catch (e) {}
      showToast(soundSwitch.checked ? 'Sound aktiviert.' : 'Sound deaktiviert.');
    });
    if (hapticSwitch) hapticSwitch.addEventListener('change', function () {
      setSetting(HAPTIC_KEY, hapticSwitch.checked);
      showToast(hapticSwitch.checked ? 'Haptik aktiviert.' : 'Haptik deaktiviert.');
    });
    if (syncBtn) syncBtn.addEventListener('click', function () {
      if (window.SupabaseBackendSync && typeof window.SupabaseBackendSync.syncProfile === 'function') {
        window.SupabaseBackendSync.syncProfile(getStoredName());
        showToast('Profil-Sync gestartet.');
      } else {
        showToast('Cloud-Sync ist gerade nicht verfügbar.');
      }
    });
    if (localBtn) localBtn.addEventListener('click', function () {
      LOCAL_KEYS.forEach(function (key) { localStorage.setItem(key, '1'); });
      window.location.replace(window.location.origin + window.location.pathname + '?local=1');
    });
    if (logoutBtn) logoutBtn.addEventListener('click', function () {
      if (window.SchussLogout && typeof window.SchussLogout.logout === 'function') {
        window.SchussLogout.logout();
      } else if (window.SupabaseAuth && typeof window.SupabaseAuth.signOut === 'function') {
        window.SupabaseAuth.signOut().finally(function () {
          window.location.replace(window.location.origin + window.location.pathname);
        });
      } else {
        window.location.replace(window.location.origin + window.location.pathname);
      }
    });
  }

  function open() {
    var overlay = renderPanel();
    overlay.classList.add('is-open');
  }

  function close() {
    var overlay = $(OVERLAY_ID);
    if (overlay) overlay.classList.remove('is-open');
  }

  function attachProfileButtons() {
    PROFILE_BUTTON_IDS.forEach(function (id) {
      var button = $(id);
      if (!button || button.dataset.profileSettingsHooked === '1') return;
      button.dataset.profileSettingsHooked = '1';
      button.addEventListener('click', function () {
        setTimeout(open, 0);
      });
    });
  }

  function init() {
    injectStyles();
    attachProfileButtons();
    setTimeout(attachProfileButtons, 800);
    setTimeout(attachProfileButtons, 1800);
  }

  window.ProfileSettings = { open: open, close: close, refresh: attachProfileButtons };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
