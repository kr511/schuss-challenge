/* Schützen Challenge — Einstellungsseite (komplett neu)
 *
 * Eigenständige, markentreue Settings-Seite (eine Seite, keine Tabs) auf
 * Design-System-Basis: Sport-Grün #22c55e auf fast-schwarz. Ersetzt das alte
 * 4-Tab-„Schützenpass"-Sheet im Nutzerfluss. Die echten, funktionierenden
 * Settings-Logiken (Sound, Haptik, Privatsphäre, Cloud-Sync, Export, Lokaler
 * Modus, Logout, Name) bleiben erhalten.
 */
(function () {
  'use strict';

  var OVERLAY_ID = 'settingsOverlay';
  var STYLE_ID = 'settingsPageStyles';
  var SOUND_KEY = 'sd_sound';
  var HAPTIC_KEY = 'sd_haptics_enabled';
  var PRIVACY_KEY = 'sd_profile_privacy';
  var SYNC_META_KEY = 'sd_cloud_sync_meta_v1';
  var LOCAL_KEYS = ['sd_local_play', 'sd_local_mode'];
  var AVATARS = ['🎯', '🔫', '⭐', '🏆', '💫', '🔥', '🎮', '🦅', '🐺', '🎖️', '🛡️', '👑'];

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  /* ── Storage helpers ──────────────────────────────────────────── */
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

  function getStoredName() { return getStorageRaw('username', 'Spieler'); }
  function getStoredAvatar() { return getStorageRaw('avatar', '🎯'); }

  function sanitizeName(value) {
    return String(value || '')
      .trim()
      .replace(/[.#$/\[\]<>]/g, '_')
      .replace(/\s+/g, ' ')
      .slice(0, 15);
  }

  /* ── Account / session ────────────────────────────────────────── */
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

  function getAccountState() {
    if (hasSession()) return { key: 'online', label: 'Online' };
    if (isLocalMode()) return { key: 'local', label: 'Lokal' };
    return { key: 'guest', label: 'Gast' };
  }

  function getUserEmail() {
    var session = getSession();
    return session && session.user && session.user.email ? session.user.email : '';
  }

  /* ── Preferences ──────────────────────────────────────────────── */
  function getPrivacy() { return localStorage.getItem(PRIVACY_KEY) === 'private' ? 'private' : 'public'; }
  function setPrivacy(value) { localStorage.setItem(PRIVACY_KEY, value === 'private' ? 'private' : 'public'); }

  function getSoundEnabled() {
    if (window.Sounds && typeof window.Sounds.enabled === 'boolean') return window.Sounds.enabled;
    return localStorage.getItem(SOUND_KEY) !== '0';
  }
  function setSoundEnabled(enabled) {
    if (window.Sounds && typeof window.Sounds.setEnabled === 'function') window.Sounds.setEnabled(enabled);
    else localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
    if (window.Sfx) window.Sfx.muted = !enabled;
  }

  function getHapticsEnabled() {
    var value = localStorage.getItem(HAPTIC_KEY);
    return value == null ? true : value === '1' || value === 'true';
  }
  function setHapticsEnabled(enabled) { localStorage.setItem(HAPTIC_KEY, enabled ? '1' : '0'); }

  /* ── Cloud-Sync meta ──────────────────────────────────────────── */
  function readSyncMeta() {
    try { var raw = localStorage.getItem(SYNC_META_KEY); return raw ? JSON.parse(raw) : {}; }
    catch (e) { return {}; }
  }
  function writeSyncMeta(patch) {
    var meta = Object.assign({}, readSyncMeta(), patch || {});
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  }

  /* ── Push-Benachrichtigungen ──────────────────────────────────── */
  function notifSupported() {
    return ('Notification' in window) && ('serviceWorker' in navigator);
  }
  function notifPermission() {
    return ('Notification' in window) ? Notification.permission : 'unsupported';
  }
  // iOS/iPadOS: Web-Push gibt es nur in einer installierten PWA (Home-Bildschirm).
  function isIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
  }
  function notifState() {
    if (!notifSupported()) {
      if (isIOS() && !isStandalone()) return { key: 'ios-install', label: 'Zum Home-Bildschirm' };
      return { key: 'unsupported', label: 'Nicht unterstützt' };
    }
    var p = notifPermission();
    if (p === 'granted') return { key: 'granted', label: 'Aktiv' };
    if (p === 'denied') return { key: 'denied', label: 'Blockiert' };
    if (isIOS() && !isStandalone()) return { key: 'ios-install', label: 'Zum Home-Bildschirm' };
    return { key: 'default', label: 'Aktivieren' };
  }
  function notifDesc(st) {
    if (st.key === 'granted') return 'Du erhältst Hinweise zu Anfragen, Duellen und Challenges.';
    if (st.key === 'denied') return 'In den Browser-/System-Einstellungen wieder erlauben.';
    if (st.key === 'ios-install') return 'Auf dem iPhone: „Teilen → Zum Home-Bildschirm", dann hier aktivieren.';
    if (st.key === 'unsupported') return 'Dieses Gerät unterstützt keine Web-Benachrichtigungen.';
    return 'Anfragen, Duelle und Challenges sofort erfahren.';
  }
  async function enableNotifications() {
    // Bevorzugt das zentrale Push-System (abonniert auch Web-Push).
    try {
      if (window.ChatNotifications && typeof window.ChatNotifications.requestPermission === 'function') {
        var res = await window.ChatNotifications.requestPermission();
        return res;
      }
      if ('Notification' in window) {
        var perm = await Notification.requestPermission();
        return perm;
      }
    } catch (e) { /* ignore */ }
    return 'unsupported';
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

  /* ── Styles (Design-System, self-contained) ───────────────────── */
  function injectStyles() {
    if ($(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#settingsOverlay{position:fixed;inset:0;z-index:2147483400;display:none}',
      '#settingsOverlay.active{display:block}',
      '#settingsOverlay .set-sheet{position:absolute;inset:0;display:flex;flex-direction:column;opacity:0;transform:translateY(14px);transition:opacity .2s ease,transform .26s cubic-bezier(.32,1.2,.64,1);',
      'background:radial-gradient(ellipse 85% 42% at 50% 0%,rgba(34,197,94,.10),transparent 60%),linear-gradient(180deg,#0c0c0c 0%,#070707 100%);color:#e8e8e0;font-family:"Outfit",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#settingsOverlay.active .set-sheet{opacity:1;transform:none}',
      '.set-header{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:12px;',
      'padding:calc(env(safe-area-inset-top,0px) + 16px) 18px 14px;background:rgba(10,10,10,.82);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border-bottom:1px solid rgba(255,255,255,.06)}',
      '.set-h-title{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;color:#fff;line-height:1.1}',
      '.set-h-sub{font-size:.74rem;color:rgba(255,255,255,.4);margin-top:2px}',
      '.set-close{width:42px;height:42px;min-width:42px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.82);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;-webkit-tap-highlight-color:transparent;transition:transform .12s,background .15s;padding:0}',
      '.set-close:active{transform:scale(.92);background:rgba(255,255,255,.14)}',
      '.set-close svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}',
      '.set-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;width:100%;max-width:560px;margin:0 auto;',
      'padding:16px 16px calc(env(safe-area-inset-bottom,0px) + 36px);display:flex;flex-direction:column;gap:14px}',
      '.set-card{background:rgba(18,18,18,.92);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:6px 16px;box-shadow:0 8px 24px rgba(0,0,0,.35)}',
      '.set-eyebrow{font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.4);font-weight:700;margin:4px 2px 2px}',
      '.set-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-top:1px solid rgba(255,255,255,.06)}',
      '.set-row:first-child{border-top:0}',
      '.set-copy{min-width:0}',
      '.set-title{font-size:.94rem;font-weight:700;color:#fff}',
      '.set-desc{font-size:.74rem;color:rgba(255,255,255,.45);margin-top:3px;line-height:1.35}',
      /* account */
      '.set-account{display:flex;align-items:center;gap:14px;padding:16px 0}',
      '.set-avatar{width:62px;height:62px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:1.85rem;background:linear-gradient(135deg,#1e3a1e,#14532d);border:2.5px solid #22c55e;box-shadow:0 0 18px rgba(34,197,94,.25);cursor:pointer;position:relative}',
      '.set-avatar .set-av-edit{position:absolute;right:-2px;bottom:-2px;width:22px;height:22px;border-radius:50%;background:#22c55e;border:2px solid #0a0a0a;display:flex;align-items:center;justify-content:center}',
      '.set-avatar .set-av-edit svg{width:11px;height:11px;stroke:#04130a;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}',
      '.set-acc-info{min-width:0;flex:1}',
      '.set-acc-name{font-size:1.25rem;font-weight:800;color:#fff;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.set-acc-meta{font-size:.74rem;color:rgba(255,255,255,.45);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.set-badge{display:inline-flex;align-items:center;gap:5px;font-size:.58rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:4px 9px;border-radius:999px;margin-top:7px}',
      '.set-badge.online{background:rgba(34,197,94,.15);color:#4ade80;border:1px solid rgba(34,197,94,.3)}',
      '.set-badge.local{background:rgba(0,195,255,.12);color:#70aaf0;border:1px solid rgba(0,195,255,.28)}',
      '.set-badge.guest{background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.14)}',
      '.set-namebar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:0 0 14px}',
      '.set-input{min-width:0;width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#fff;padding:12px;font-size:16px;font-family:inherit;outline:0}',
      '.set-input:focus{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.16)}',
      '.set-btn{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:11px 16px;font-weight:700;font-size:.86rem;cursor:pointer;background:rgba(255,255,255,.07);color:#fff;font-family:inherit;white-space:nowrap;transition:transform .12s,background .15s;-webkit-tap-highlight-color:transparent}',
      '.set-btn:active{transform:scale(.97)}',
      '.set-btn.primary{background:#22c55e;color:#000;border-color:transparent;box-shadow:0 4px 16px rgba(34,197,94,.28)}',
      '.set-btn.danger{background:rgba(255,74,74,.12);border-color:rgba(255,74,74,.32);color:#ff8a8a;width:100%}',
      '.set-pill{display:inline-flex;align-items:center;font-size:.72rem;font-weight:800;padding:7px 12px;border-radius:999px;background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.32);color:#86e29b;white-space:nowrap}',
      '.set-pill.private{background:rgba(0,195,255,.12);border-color:rgba(0,195,255,.3);color:#9fd0f5}',
      /* switch */
      '.set-switch{position:relative;width:50px;height:30px;flex:0 0 auto}',
      '.set-switch input{opacity:0;width:0;height:0}',
      '.set-slider{position:absolute;inset:0;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.14);border-radius:999px;cursor:pointer;transition:.18s}',
      '.set-slider:before{content:"";position:absolute;width:22px;height:22px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.18s;box-shadow:0 3px 8px rgba(0,0,0,.4)}',
      '.set-switch input:checked+.set-slider{background:rgba(34,197,94,.5);border-color:rgba(34,197,94,.7)}',
      '.set-switch input:checked+.set-slider:before{transform:translateX(20px);background:#eafff0}',
      '.set-foot{text-align:center;font-size:.66rem;color:rgba(255,255,255,.3);letter-spacing:.04em;padding:8px 0 2px}',
      '#settingsToast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 26px);transform:translateX(-50%) translateY(12px);z-index:2147483500;background:rgba(20,20,20,.97);border:1px solid rgba(34,197,94,.32);color:#c9f5b6;font-size:.82rem;font-weight:700;padding:11px 16px;border-radius:12px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;box-shadow:0 10px 30px rgba(0,0,0,.55);max-width:calc(100vw - 32px);text-align:center}',
      '#settingsToast.show{opacity:1;transform:translateX(-50%)}',
      '@media(max-width:420px){.set-namebar{grid-template-columns:1fr}.set-btn{width:100%}}'
    ].join('');
    document.head.appendChild(style);
  }

  function makeSwitch(id, checked) {
    return '<label class="set-switch"><input id="' + id + '" type="checkbox" ' + (checked ? 'checked' : '') + '><span class="set-slider"></span></label>';
  }

  /* ── Build overlay shell (once) ───────────────────────────────── */
  function buildOverlay() {
    injectStyles();
    var ov = $(OVERLAY_ID);
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = OVERLAY_ID;
    ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML =
      '<div class="set-sheet" role="dialog" aria-label="Einstellungen">' +
        '<header class="set-header">' +
          '<div><div class="set-h-title">Einstellungen</div><div class="set-h-sub">Konto, Sound &amp; App</div></div>' +
          '<button class="set-close" type="button" aria-label="Schließen" data-set-close>' +
            '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</header>' +
        '<div class="set-scroll" id="settingsScroll"></div>' +
      '</div>';
    document.body.appendChild(ov);

    var toast = document.createElement('div');
    toast.id = 'settingsToast';
    document.body.appendChild(toast);

    ov.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-set-close]')) close();
    });
    return ov;
  }

  /* ── Render the page content ──────────────────────────────────── */
  function render() {
    buildOverlay();
    var scroll = $('settingsScroll');
    if (!scroll) return false;

    var name = getStoredName();
    var avatar = getStoredAvatar();
    var email = getUserEmail();
    var acc = getAccountState();
    var privacy = getPrivacy();
    var privacyPublic = privacy === 'public';
    var meta = acc.label + (email ? ' · ' + email : (acc.key === 'guest' ? ' · Nicht angemeldet' : ''));
    var version = (window.APP_VERSION || (window.UpdatesSystem && window.UpdatesSystem.version) || '');

    scroll.innerHTML = [
      // Account
      '<section class="set-card">',
        '<div class="set-account">',
          '<div class="set-avatar" id="settingsAvatar" title="Avatar ändern">' + escapeHtml(avatar) +
            '<span class="set-av-edit"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>' +
          '</div>',
          '<div class="set-acc-info">',
            '<div class="set-acc-name">' + escapeHtml(name) + '</div>',
            '<div class="set-acc-meta">' + escapeHtml(meta) + '</div>',
            '<span class="set-badge ' + acc.key + '">' + escapeHtml(acc.label) + '</span>',
          '</div>',
        '</div>',
        '<div class="set-namebar">',
          '<input id="settingsNameInput" class="set-input" type="text" maxlength="15" placeholder="Dein Schützenname" value="' + escapeHtml(name) + '">',
          '<button id="settingsSaveNameBtn" class="set-btn primary" type="button">Speichern</button>',
        '</div>',
      '</section>',

      // Präferenzen
      '<div class="set-eyebrow">Präferenzen</div>',
      '<section class="set-card">',
        (function () {
          var st = notifState();
          var btn = st.key === 'granted'
            ? '<span class="set-pill">✓ ' + escapeHtml(st.label) + '</span>'
            : '<button id="settingsNotifBtn" class="set-btn' + (st.key === 'default' ? ' primary' : '') + '" type="button"' + (st.key === 'denied' || st.key === 'unsupported' ? ' disabled' : '') + '>' + escapeHtml(st.label) + '</button>';
          return '<div class="set-row"><div class="set-copy"><div class="set-title">Benachrichtigungen</div><div class="set-desc" id="settingsNotifDesc">' + escapeHtml(notifDesc(st)) + '</div></div>' + btn + '</div>';
        })(),
        '<div class="set-row"><div class="set-copy"><div class="set-title">Soundeffekte</div><div class="set-desc">Treffer-, Klick- und Sieg-Sounds</div></div>' + makeSwitch('settingsSoundSwitch', getSoundEnabled()) + '</div>',
        '<div class="set-row"><div class="set-copy"><div class="set-title">Haptisches Feedback</div><div class="set-desc">Vibrationen auf unterstützten Geräten</div></div>' + makeSwitch('settingsHapticSwitch', getHapticsEnabled()) + '</div>',
      '</section>',

      // Datenschutz
      '<div class="set-eyebrow">Datenschutz</div>',
      '<section class="set-card">',
        '<div class="set-row"><div class="set-copy"><div class="set-title">Profil-Sichtbarkeit</div><div class="set-desc">Öffentlich zeigt dich in Ranglisten; Privat reduziert die Sichtbarkeit.</div></div><span id="settingsPrivacyPill" class="set-pill ' + (privacyPublic ? '' : 'private') + '">' + (privacyPublic ? 'Öffentlich' : 'Privat') + '</span></div>',
        '<div class="set-row"><div class="set-copy"><div class="set-title">Öffentliches Profil</div><div class="set-desc">Für globale Profile und Freunde sichtbar.</div></div>' + makeSwitch('settingsPrivacySwitch', privacyPublic) + '</div>',
      '</section>',

      // Cloud
      '<div class="set-eyebrow">Cloud</div>',
      '<section class="set-card">',
        '<div class="set-row"><div class="set-copy"><div class="set-title">Cloud-Sync</div><div class="set-desc" id="settingsSyncStatus">' + escapeHtml(getSyncStatusText()) + '</div></div><button id="settingsSyncBtn" class="set-btn" type="button">Sync</button></div>',
      '</section>',

      // Daten
      '<div class="set-eyebrow">Gerätedaten</div>',
      '<section class="set-card">',
        '<div class="set-row"><div class="set-copy"><div class="set-title">Lokale Daten exportieren</div><div class="set-desc">Speichert deine App-Daten als JSON-Datei.</div></div><button id="settingsExportBtn" class="set-btn" type="button">Export</button></div>',
        '<div class="set-row"><div class="set-copy"><div class="set-title">Lokaler Modus</div><div class="set-desc">Ohne Konto spielen, keine Cloud-Rangliste.</div></div><button id="settingsLocalBtn" class="set-btn" type="button">Lokal</button></div>',
      '</section>',

      // Fortschritt
      '<div class="set-eyebrow">Fortschritt</div>',
      '<section class="set-card">',
        '<div class="set-row"><div class="set-copy"><div class="set-title">Auszeichnungen &amp; Fortschritt</div><div class="set-desc">Auszeichnungen müssen verdient werden. Setzt XP, Rang, Auszeichnungen, Tages-Challenges, Statistiken, Verlauf &amp; Streaks zurück. Name, Avatar und Login bleiben erhalten.</div></div></div>',
        '<button id="settingsResetBtn" class="set-btn danger" type="button">Gesamten Fortschritt zurücksetzen</button>',
      '</section>',

      // Konto-Aktion
      '<div class="set-eyebrow">Konto</div>',
      '<section class="set-card">',
        '<div class="set-row"><div class="set-copy"><div class="set-title">' + (acc.key === 'online' ? 'Abmelden' : 'Konto') + '</div><div class="set-desc">' + (acc.key === 'online' ? 'Von diesem Gerät abmelden.' : 'Du spielst ohne Cloud-Konto.') + '</div></div></div>',
        '<button id="settingsLogoutBtn" class="set-btn danger" type="button">' + (acc.key === 'online' ? 'Abmelden' : 'Anmeldung / Konto') + '</button>',
      '</section>',

      '<div class="set-foot">🎯 Schützen Challenge' + (version ? ' · v' + escapeHtml(String(version)) : '') + ' · Beta</div>'
    ].join('');

    bindEvents();
    return true;
  }

  /* ── Toast ────────────────────────────────────────────────────── */
  function showToast(message) {
    var toast = $('settingsToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  function updateSyncText() {
    var node = $('settingsSyncStatus');
    if (node) node.textContent = getSyncStatusText();
  }

  /* ── Actions ──────────────────────────────────────────────────── */
  function saveName() {
    var input = $('settingsNameInput');
    var name = sanitizeName(input && input.value);
    if (!name) { showToast('Bitte gib einen Namen ein.'); return; }

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
    writeSyncMeta({ lastSyncAttemptAt: Date.now(), lastSyncReason: 'settings_page' });
    updateSyncText();
    if (window.SupabaseBackendSync && typeof window.SupabaseBackendSync.syncProfile === 'function' && hasSession()) {
      try {
        window.SupabaseBackendSync.syncProfile(getStoredName());
        writeSyncMeta({ lastSyncOkAt: Date.now() });
        updateSyncText();
        showToast('Profil synchronisiert.');
        return;
      } catch (error) {
        console.warn('[Settings] Sync fehlgeschlagen:', error && error.message ? error.message : error);
      }
    }
    showToast(hasSession() ? 'Lokal gespeichert.' : 'Lokal gespeichert (kein Konto).');
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

  /* Setzt den gesamten lokalen Spielfortschritt zurück. Identität (Name/Avatar),
     Einstellungen, Modus und Login bleiben erhalten – Auszeichnungen, XP, Rang,
     Tages-Challenges, Statistiken, Verlauf und Streaks werden gelöscht. */
  function resetProgress() {
    var ok = window.confirm(
      'Wirklich den GESAMTEN Fortschritt zurücksetzen?\n\n' +
      'XP, Rang, Auszeichnungen, Tages-Challenges, Statistiken, Verlauf und Streaks werden gelöscht.\n' +
      'Name, Avatar und Login bleiben erhalten.\n\n' +
      'Dies kann nicht rückgängig gemacht werden.'
    );
    if (!ok) return;

    // Schlüssel (ohne sd_-Prefix), die NICHT gelöscht werden.
    var keep = [
      'username', 'avatar', 'userId', 'local_user_id', 'anonymous_id', 'userEmail',
      'clubName', 'clubId', 'club',
      'sound', 'haptics_enabled', 'profile_privacy',
      'local_play', 'local_mode', 'cloud_sync_meta_v1',
      'tutorial_done', 'onboarded', 'welcome_seen'
    ];

    try {
      if (window.StorageManager && typeof window.StorageManager.clearAll === 'function') {
        window.StorageManager.clearAll(keep);
      } else {
        // Fallback: alle sd_*-Schlüssel außer keep entfernen (Auth-Tokens sb-* bleiben).
        var keepFull = keep.map(function (k) { return 'sd_' + k; });
        var toRemove = [];
        for (var i = 0; i < localStorage.length; i += 1) {
          var k = localStorage.key(i);
          if (k && k.indexOf('sd_') === 0 && keepFull.indexOf(k) === -1) toRemove.push(k);
        }
        toRemove.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      }
      showToast('Fortschritt zurückgesetzt. App wird neu geladen …');
      setTimeout(function () { window.location.reload(); }, 700);
    } catch (e) {
      showToast('Zurücksetzen fehlgeschlagen.');
    }
  }

  function logout() {
    if (window.SchussLogout && typeof window.SchussLogout.logout === 'function') { window.SchussLogout.logout(); return; }
    if (typeof window.logoutEmail === 'function') { window.logoutEmail(); return; }
    if (window.SupabaseAuth && typeof window.SupabaseAuth.signOut === 'function') {
      window.SupabaseAuth.signOut().finally(function () {
        window.location.replace(window.location.origin + window.location.pathname);
      });
      return;
    }
    // Gast/Lokal ohne Session -> Auswahl zurücksetzen, App neu laden
    LOCAL_KEYS.forEach(function (key) { localStorage.removeItem(key); });
    window.location.replace(window.location.origin + window.location.pathname);
  }

  function changeAvatar() {
    if (typeof window.openAvatarPicker === 'function') { close(); window.openAvatarPicker(); return; }
    // Fallback: simple Rotation durch die Avatar-Liste
    var current = getStoredAvatar();
    var idx = AVATARS.indexOf(current);
    var next = AVATARS[(idx + 1) % AVATARS.length];
    setStorageRaw('avatar', next);
    var ptAvatar = document.getElementById('ptProfileAvatar');
    if (ptAvatar) ptAvatar.textContent = next;
    render();
    showToast('Avatar geändert.');
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
    var resetBtn = $('settingsResetBtn');
    var logoutBtn = $('settingsLogoutBtn');
    var avatarBtn = $('settingsAvatar');

    if (saveBtn) saveBtn.addEventListener('click', saveName);
    if (nameInput) nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveName(); });
    if (privacySwitch) privacySwitch.addEventListener('change', function () { setPrivacyUi(privacySwitch.checked); });
    if (soundSwitch) soundSwitch.addEventListener('change', function () {
      setSoundEnabled(soundSwitch.checked); showToast(soundSwitch.checked ? 'Sound aktiviert.' : 'Sound deaktiviert.');
    });
    if (hapticSwitch) hapticSwitch.addEventListener('change', function () {
      setHapticsEnabled(hapticSwitch.checked); showToast(hapticSwitch.checked ? 'Haptik aktiviert.' : 'Haptik deaktiviert.');
    });
    if (syncBtn) syncBtn.addEventListener('click', syncProfile);
    if (exportBtn) exportBtn.addEventListener('click', exportLocalData);
    if (localBtn) localBtn.addEventListener('click', enterLocalMode);
    if (resetBtn) resetBtn.addEventListener('click', resetProgress);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (avatarBtn) avatarBtn.addEventListener('click', changeAvatar);

    var notifBtn = $('settingsNotifBtn');
    if (notifBtn) notifBtn.addEventListener('click', async function () {
      notifBtn.disabled = true;
      var prev = notifBtn.textContent;
      notifBtn.textContent = '…';
      var res = await enableNotifications();
      if (res === 'granted') {
        showToast('🔔 Benachrichtigungen aktiviert.');
      } else if (res === 'denied') {
        showToast('Benachrichtigungen wurden blockiert.');
      } else if (res === 'unsupported') {
        showToast('Dieses Gerät unterstützt keine Benachrichtigungen.');
      } else {
        showToast('Benachrichtigungen nicht aktiviert.');
      }
      notifBtn.disabled = false;
      notifBtn.textContent = prev;
      render(); // Status neu zeichnen (Aktiv/Blockiert/…)
    });
  }

  /* ── Open / Close ─────────────────────────────────────────────── */
  function open() {
    buildOverlay();
    render();
    var ov = $(OVERLAY_ID);
    if (!ov) return;
    ov.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // force reflow so the slide-up transition plays
    void ov.offsetWidth;
    ov.classList.add('active');
    if (typeof window.triggerHaptic === 'function') window.triggerHaptic();
  }

  function close() {
    var ov = $(OVERLAY_ID);
    if (!ov) return;
    ov.classList.remove('active');
    ov.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function init() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var ov = $(OVERLAY_ID);
        if (ov && ov.classList.contains('active')) close();
      }
    });
    window.addEventListener('supabaseAuthReady', function () { if ($(OVERLAY_ID) && $(OVERLAY_ID).classList.contains('active')) render(); });
    window.addEventListener('supabaseSessionChanged', function () { if ($(OVERLAY_ID) && $(OVERLAY_ID).classList.contains('active')) render(); });
  }

  window.ProfileSettings = { open: open, close: close, refresh: render, render: render };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
