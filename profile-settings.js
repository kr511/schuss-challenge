/* Schussduell - Settings tab inside the profile sheet */
(function () {
  'use strict';

  var PANEL_ID = 'psPanel-settings';
  var STYLE_ID = 'profileSettingsTabStyles';
  var SOUND_KEY = 'sd_sound';
  var HAPTIC_KEY = 'sd_haptics_enabled';
  var PRIVACY_KEY = 'sd_profile_privacy';
  var SYNC_META_KEY = 'sd_cloud_sync_meta_v1';
  var LOCAL_KEYS = ['sd_local_play', 'sd_local_mode'];

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function getStorageRaw(key, fallback) {
    try {
      if (window.StorageManager && typeof window.StorageManager.getRaw === 'function') {
        var value = window.StorageManager.getRaw(key);
        return value == null || value === '' ? fallback : value;
      }
      return localStorage.getItem('sd_' + key) || localStorage.getItem(key) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setStorageRaw(key, value) {
    try {
      if (window.StorageManager && typeof window.StorageManager.setRaw === 'function') {
        window.StorageManager.setRaw(key, value);
      } else {
        localStorage.setItem('sd_' + key, value);
      }
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function getStoredName() {
    return getStorageRaw('username', 'Spieler');
  }

  function sanitizeName(value) {
    return String(value || '')
      .trim()
      .replace(/[.#$/\[\]<>]/g, '_')
      .replace(/\s+/g, ' ')
      .slice(0, 15);
  }

  function getSession() {
    try {
      if (window.SupabaseAuth && typeof window.SupabaseAuth.getSession === 'function') {
        return window.SupabaseAuth.getSession() || window.SupabaseSession || null;
      }
    } catch (e) {}
    return window.SupabaseSession || null;
  }

  function isLocalMode() {
    try {
      return window.SchussduellLocalMode === true ||
        window.SchussduellLocalPlay === true ||
        LOCAL_KEYS.some(function (key) { return localStorage.getItem(key) === '1'; });
    } catch (e) {
      return false;
    }
  }

  function hasSession() {
    var session = getSession();
    return !!(session && session.access_token && !isLocalMode());
  }

  function getAccountLabel() {
    if (isLocalMode()) return 'Lokal';
    if (hasSession()) return 'Online';
    return 'Gast';
  }

  function getUserEmail() {
    var session = getSession();
    return session && session.user && session.user.email ? session.user.email : '';
  }

  function getPrivacy() {
    return localStorage.getItem(PRIVACY_KEY) === 'private' ? 'private' : 'public';
  }

  function setPrivacy(value) {
    localStorage.setItem(PRIVACY_KEY, value === 'private' ? 'private' : 'public');
  }

  function getSoundEnabled() {
    if (window.Sounds && typeof window.Sounds.enabled === 'boolean') return window.Sounds.enabled;
    return localStorage.getItem(SOUND_KEY) !== '0';
  }

  function setSoundEnabled(enabled) {
    if (window.Sounds && typeof window.Sounds.setEnabled === 'function') window.Sounds.setEnabled(enabled);
    else localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
    if (window.Sfx) window.Sfx.muted = !enabled;
    var oldButton = $('soundToggleBtn');
    if (oldButton) oldButton.textContent = enabled ? '🔊  Sound: AN' : '🔇  Sound: AUS';
  }

  function getHapticsEnabled() {
    var value = localStorage.getItem(HAPTIC_KEY);
    return value == null ? true : value === '1' || value === 'true';
  }

  function setHapticsEnabled(enabled) {
    localStorage.setItem(HAPTIC_KEY, enabled ? '1' : '0');
  }

  function readSyncMeta() {
    try {
      var raw = localStorage.getItem(SYNC_META_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeSyncMeta(patch) {
    var meta = Object.assign({}, readSyncMeta(), patch || {});
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  }

  function formatTime(value) {
    var ts = Number(value) || 0;
    return ts > 0 ? new Date(ts).toLocaleString('de-DE') : 'noch nie';
  }

  function getSyncStatusText() {
    if (isLocalMode()) return 'Lokaler Gastmodus. Keine Cloud-Synchronisierung.';
    if (!hasSession()) return 'Melde dich an, um Cloud-Sync zu nutzen.';
    var meta = readSyncMeta();
    if (meta.lastSyncOkAt) return 'Zuletzt synchronisiert: ' + formatTime(meta.lastSyncOkAt);
    if (meta.lastSyncAttemptAt) return 'Letzter Versuch: ' + formatTime(meta.lastSyncAttemptAt);
    return 'Bereit. Noch kein letzter Sync gespeichert.';
  }

  function injectStyles() {
    if ($(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.settings-tab{display:flex;flex-direction:column;gap:14px;color:#fff}',
      '.settings-tab-head{padding:2px 2px 4px}',
      '.settings-tab-title{font-size:1.05rem;font-weight:900;letter-spacing:.02em;color:#9cc4ff;text-transform:uppercase}',
      '.settings-tab-sub{margin-top:5px;font-size:.78rem;color:rgba(255,255,255,.48)}',
      '.settings-block{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:15px 16px}',
      '.settings-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.42);font-weight:900;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.06)}',
      '.settings-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 0;border-top:1px solid rgba(255,255,255,.06)}',
      '.settings-row.first{border-top:0;padding-top:0}',
      '.settings-copy{min-width:0;line-height:1.2}',
      '.settings-title{font-size:.94rem;font-weight:900;color:#fff}',
      '.settings-desc{font-size:.76rem;color:rgba(255,255,255,.45);margin-top:3px;overflow:hidden;text-overflow:ellipsis}',
      '.settings-input-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;margin-top:10px}',
      '.settings-input{min-width:0;width:100%;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#fff;padding:12px 12px;font-size:.95rem;outline:0}',
      '.settings-input:focus{border-color:#7ab030;box-shadow:0 0 0 3px rgba(122,176,48,.16)}',
      '.settings-btn{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 13px;font-weight:900;cursor:pointer;background:rgba(255,255,255,.08);color:#fff;white-space:nowrap}',
      '.settings-btn.primary{background:linear-gradient(135deg,#7ab030,#5c9228);border-color:rgba(122,176,48,.62)}',
      '.settings-btn.warn{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.35);color:#fde68a}',
      '.settings-btn.danger{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.35);color:#fecaca;width:100%;margin-top:4px}',
      '.settings-btn:disabled{opacity:.5;cursor:not-allowed}',
      '.settings-pill{display:inline-flex;align-items:center;border-radius:999px;padding:7px 10px;background:rgba(122,176,48,.13);border:1px solid rgba(122,176,48,.35);color:#c9f58b;font-size:.78rem;font-weight:900;white-space:nowrap}',
      '.settings-pill.private{background:rgba(59,130,246,.13);border-color:rgba(59,130,246,.35);color:#bfdbfe}',
      '.settings-switch{position:relative;width:52px;height:30px;flex:0 0 auto}',
      '.settings-switch input{opacity:0;width:0;height:0}',
      '.settings-slider{position:absolute;inset:0;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.14);border-radius:999px;cursor:pointer;transition:.18s}',
      '.settings-slider:before{content:"";position:absolute;width:22px;height:22px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.18s;box-shadow:0 3px 10px rgba(0,0,0,.35)}',
      '.settings-switch input:checked+.settings-slider{background:rgba(122,176,48,.45);border-color:rgba(122,176,48,.7)}',
      '.settings-switch input:checked+.settings-slider:before{transform:translateX(22px)}',
      '.settings-toast{display:none;margin-top:10px;border-radius:12px;padding:10px 12px;font-size:.82rem;font-weight:800;background:rgba(122,176,48,.12);border:1px solid rgba(122,176,48,.28);color:#c9f58b}',
      '.settings-toast.is-visible{display:block}',
      '@media(max-width:420px){.settings-input-row{grid-template-columns:1fr}.settings-row{align-items:flex-start}.settings-btn{width:100%}}'
    ].join('');
    document.head.appendChild(style);
  }

  function makeSwitch(id, checked) {
    return '<label class="settings-switch"><input id="' + id + '" type="checkbox" ' + (checked ? 'checked' : '') + '><span class="settings-slider"></span></label>';
  }

  function render() {
    var panel = $(PANEL_ID);
    if (!panel) return false;
    injectStyles();

    var name = getStoredName();
    var email = getUserEmail();
    var privacy = getPrivacy();
    var privacyPublic = privacy === 'public';
    var privacyLabel = privacyPublic ? 'Öffentlich' : 'Privat';

    panel.innerHTML = [
      '<div class="settings-tab">',
      '<div class="settings-tab-head"><div class="settings-tab-title">Profil & Einstellungen</div><div class="settings-tab-sub">Passe dein Schussduell-Erlebnis an.</div></div>',
      '<section class="settings-block"><div class="settings-label">Konto</div>',
      '<div class="settings-row first"><div class="settings-copy"><div class="settings-title">Status</div><div class="settings-desc">' + escapeHtml(email || 'Kein Online-Konto aktiv') + '</div></div><span class="settings-pill">' + escapeHtml(getAccountLabel()) + '</span></div>',
      '<div class="settings-input-row"><input id="settingsNameInput" class="settings-input" maxlength="15" value="' + escapeHtml(name) + '" placeholder="Schützenname"><button id="settingsSaveNameBtn" class="settings-btn primary" type="button">Speichern</button></div><div id="settingsToast" class="settings-toast"></div>',
      '</section>',
      '<section class="settings-block"><div class="settings-label">Datenschutz</div>',
      '<div class="settings-row first"><div class="settings-copy"><div class="settings-title">Profil-Sichtbarkeit</div><div class="settings-desc">Öffentlich zeigt dich in Ranglisten; Privat reduziert Sichtbarkeit.</div></div><span id="settingsPrivacyPill" class="settings-pill ' + (privacyPublic ? '' : 'private') + '">' + privacyLabel + '</span></div>',
      '<div class="settings-row"><div class="settings-copy"><div class="settings-title">Öffentliches Profil</div><div class="settings-desc">Kann später für globale Profile und Freunde genutzt werden.</div></div>' + makeSwitch('settingsPrivacySwitch', privacyPublic) + '</div>',
      '</section>',
      '<section class="settings-block"><div class="settings-label">App</div>',
      '<div class="settings-row first"><div class="settings-copy"><div class="settings-title">Soundeffekte</div><div class="settings-desc">Treffer-, Klick- und Sieg-Sounds</div></div>' + makeSwitch('settingsSoundSwitch', getSoundEnabled()) + '</div>',
      '<div class="settings-row"><div class="settings-copy"><div class="settings-title">Haptisches Feedback</div><div class="settings-desc">Vibrationen auf unterstützten Geräten</div></div>' + makeSwitch('settingsHapticSwitch', getHapticsEnabled()) + '</div>',
      '</section>',
      '<section class="settings-block"><div class="settings-label">Cloud</div>',
      '<div class="settings-row first"><div class="settings-copy"><div class="settings-title">Cloud-Sync</div><div class="settings-desc" id="settingsSyncStatus">' + escapeHtml(getSyncStatusText()) + '</div></div><button id="settingsSyncBtn" class="settings-btn" type="button">Sync</button></div>',
      '</section>',
      '<section class="settings-block"><div class="settings-label">Gerätedaten</div>',
      '<div class="settings-row first"><div class="settings-copy"><div class="settings-title">Lokale Daten exportieren</div><div class="settings-desc">Speichert deine App-Daten als JSON-Datei.</div></div><button id="settingsExportBtn" class="settings-btn" type="button">Export</button></div>',
      '<div class="settings-row"><div class="settings-copy"><div class="settings-title">Lokaler Modus</div><div class="settings-desc">Ohne Konto spielen, keine Cloud-Rangliste.</div></div><button id="settingsLocalBtn" class="settings-btn" type="button">Lokal</button></div>',
      '<button id="settingsLogoutBtn" class="settings-btn danger" type="button">Abmelden</button>',
      '</section>',
      '</div>'
    ].join('');

    bindEvents();
    return true;
  }

  function showToast(message) {
    var toast = $('settingsToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    setTimeout(function () { toast.classList.remove('is-visible'); }, 2200);
  }

  function updateSyncText() {
    var node = $('settingsSyncStatus');
    if (node) node.textContent = getSyncStatusText();
  }

  function saveName() {
    var input = $('settingsNameInput');
    var name = sanitizeName(input && input.value);
    if (!name) {
      showToast('Bitte gib einen Namen ein.');
      return;
    }

    var saved = false;
    if (typeof window.applyProfileNameChange === 'function') {
      saved = window.applyProfileNameChange(name, { notify: false });
    } else {
      setStorageRaw('username', name);
      saved = true;
    }

    if (!saved) return;
    showToast('Name gespeichert.');
    render();
  }

  function setPrivacyUi(isPublic) {
    setPrivacy(isPublic ? 'public' : 'private');
    var pill = $('settingsPrivacyPill');
    if (pill) {
      pill.textContent = isPublic ? 'Öffentlich' : 'Privat';
      pill.classList.toggle('private', !isPublic);
    }
    showToast(isPublic ? 'Profil ist öffentlich.' : 'Profil ist privat.');
    syncProfile();
  }

  function syncProfile() {
    writeSyncMeta({ lastSyncAttemptAt: Date.now(), lastSyncReason: 'settings_tab' });
    updateSyncText();
    if (window.SupabaseBackendSync && typeof window.SupabaseBackendSync.syncProfile === 'function' && hasSession()) {
      try {
        window.SupabaseBackendSync.syncProfile(getStoredName());
        writeSyncMeta({ lastSyncOkAt: Date.now() });
        updateSyncText();
        showToast('Profil synchronisiert.');
        return;
      } catch (error) {
        console.warn('[ProfileSettings] Sync fehlgeschlagen:', error && error.message ? error.message : error);
      }
    }
    showToast('Lokal gespeichert.');
  }

  function exportLocalData() {
    var data = { exportedAt: new Date().toISOString(), app: 'schuss-challenge', localStorage: {} };
    for (var i = 0; i < localStorage.length; i += 1) {
      var key = localStorage.key(i);
      if (!key || key.indexOf('sb-') === 0 || key.toLowerCase().indexOf('auth-token') !== -1) continue;
      data.localStorage[key] = localStorage.getItem(key);
    }
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'schussduell-daten-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    showToast('Export erstellt.');
  }

  function enterLocalMode() {
    LOCAL_KEYS.forEach(function (key) { localStorage.setItem(key, '1'); });
    window.location.replace(window.location.origin + window.location.pathname + '?local=1');
  }

  function logout() {
    if (window.SchussLogout && typeof window.SchussLogout.logout === 'function') {
      window.SchussLogout.logout();
      return;
    }
    if (typeof window.logoutEmail === 'function') {
      window.logoutEmail();
      return;
    }
    if (window.SupabaseAuth && typeof window.SupabaseAuth.signOut === 'function') {
      window.SupabaseAuth.signOut().finally(function () {
        window.location.replace(window.location.origin + window.location.pathname);
      });
    }
  }

  function bindEvents() {
    var saveBtn = $('settingsSaveNameBtn');
    var nameInput = $('settingsNameInput');
    var privacySwitch = $('settingsPrivacySwitch');
    var soundSwitch = $('settingsSoundSwitch');
    var hapticSwitch = $('settingsHapticSwitch');
    var syncBtn = $('settingsSyncBtn');
    var exportBtn = $('settingsExportBtn');
    var localBtn = $('settingsLocalBtn');
    var logoutBtn = $('settingsLogoutBtn');

    if (saveBtn) saveBtn.addEventListener('click', saveName);
    if (nameInput) nameInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') saveName();
    });
    if (privacySwitch) privacySwitch.addEventListener('change', function () { setPrivacyUi(privacySwitch.checked); });
    if (soundSwitch) soundSwitch.addEventListener('change', function () {
      setSoundEnabled(soundSwitch.checked);
      showToast(soundSwitch.checked ? 'Sound aktiviert.' : 'Sound deaktiviert.');
    });
    if (hapticSwitch) hapticSwitch.addEventListener('change', function () {
      setHapticsEnabled(hapticSwitch.checked);
      showToast(hapticSwitch.checked ? 'Haptik aktiviert.' : 'Haptik deaktiviert.');
    });
    if (syncBtn) syncBtn.addEventListener('click', syncProfile);
    if (exportBtn) exportBtn.addEventListener('click', exportLocalData);
    if (localBtn) localBtn.addEventListener('click', enterLocalMode);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  function open() {
    var overlay = $('profileOverlay');
    if (overlay && !overlay.classList.contains('active') && typeof window.toggleProfileMenu === 'function') {
      window.toggleProfileMenu();
    }
    render();
    if (typeof window.switchProfileTab === 'function') window.switchProfileTab('settings');
  }

  function init() {
    render();
    window.addEventListener('supabaseAuthReady', render);
    window.addEventListener('supabaseSessionChanged', render);
  }

  window.ProfileSettings = { open: open, refresh: render, render: render };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
