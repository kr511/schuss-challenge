/* Schussduell Debug Panel
 * Opens only when the URL contains ?debug=1 or #debug.
 */
(function () {
  'use strict';

  function shouldOpen() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      return params.get('debug') === '1' || window.location.hash === '#debug';
    } catch (e) {
      return false;
    }
  }

  function boolIcon(value) {
    return value ? '✅' : '❌';
  }

  function getLocalMode() {
    return localStorage.getItem('sd_local_mode') === '1' ||
      localStorage.getItem('sd_local_mode') === 'true' ||
      localStorage.getItem('sd_local_play') === '1' ||
      localStorage.getItem('sd_local_play') === 'true' ||
      window.SchussduellLocalMode === true ||
      window.SchussduellLocalPlay === true;
  }

  function getStatusRows() {
    var supabaseSession = !!(window.SupabaseSession && window.SupabaseSession.access_token);
    var localMode = getLocalMode();
    var authGateVisible = !!document.getElementById('authGate');
    var profileScrollFix = !!document.getElementById('profileScrollFixStyle');
    var featureFallback = !!window.FeatureFallback;
    var firebaseLoaded = !!window.firebase;
    var storageManager = !!window.StorageManager;
    var appReady = typeof window.openDuelSetup === 'function' || !!document.getElementById('screenSetup');

    return [
      ['App sichtbar', appReady, appReady ? 'Setup/App-DOM gefunden' : 'Setup/App-DOM fehlt'],
      ['Local Mode', localMode, localMode ? 'Lokaler Modus aktiv' : 'Nicht aktiv'],
      ['Supabase Session', supabaseSession, supabaseSession ? 'Session vorhanden' : 'Keine Session'],
      ['Auth Gate', !authGateVisible, authGateVisible ? 'Login-Overlay sichtbar' : 'Nicht sichtbar'],
      ['Firebase geladen', firebaseLoaded, firebaseLoaded ? 'window.firebase vorhanden' : 'Nicht geladen'],
      ['StorageManager', storageManager, storageManager ? 'Verfügbar' : 'Nicht verfügbar'],
      ['FeatureFallback', featureFallback, featureFallback ? 'Verfügbar' : 'Nicht verfügbar'],
      ['Profil-Scroll-Fix', profileScrollFix, profileScrollFix ? 'CSS aktiv' : 'Noch nicht aktiv']
    ];
  }

  function getVersionInfo() {
    return {
      url: window.location.href,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      viewport: window.innerWidth + '×' + window.innerHeight,
      localStorageKeys: Object.keys(localStorage).filter(function (key) {
        return key.indexOf('sd_') === 0 || key === 'username';
      }).sort()
    };
  }

  function copyDebugInfo() {
    var payload = {
      timestamp: new Date().toISOString(),
      rows: getStatusRows().map(function (row) {
        return { name: row[0], ok: row[1], detail: row[2] };
      }),
      info: getVersionInfo()
    };

    var text = JSON.stringify(payload, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setPanelMessage('Debug-Info kopiert ✅');
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      setPanelMessage('Debug-Info kopiert ✅');
    } catch (e) {
      setPanelMessage('Kopieren nicht möglich. Konsole prüfen.');
      console.info('[DebugPanel]', text);
    }
    area.remove();
  }

  function setPanelMessage(text) {
    var node = document.getElementById('sdDebugMsg');
    if (node) node.textContent = text || '';
  }

  function render() {
    if (!shouldOpen()) return;
    if (document.getElementById('sdDebugPanel')) return;

    var style = document.createElement('style');
    style.id = 'sdDebugPanelStyle';
    style.textContent = [
      '#sdDebugPanel{position:fixed;left:12px;right:12px;bottom:12px;z-index:999999;background:rgba(10,10,20,.96);border:1px solid rgba(255,255,255,.14);border-radius:18px;color:#f3f4f6;font-family:Outfit,-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.55);overflow:hidden;max-height:72dvh;display:flex;flex-direction:column}',
      '#sdDebugPanel header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04)}',
      '#sdDebugPanel h3{margin:0;font-size:1rem;letter-spacing:.04em}',
      '#sdDebugPanel button{border:0;border-radius:10px;padding:9px 11px;font-weight:800;cursor:pointer}',
      '#sdDebugPanel .sdDbgBody{padding:12px 16px;overflow:auto;-webkit-overflow-scrolling:touch}',
      '#sdDebugPanel .sdDbgRow{display:grid;grid-template-columns:32px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07)}',
      '#sdDebugPanel .sdDbgName{font-weight:800;font-size:.88rem}',
      '#sdDebugPanel .sdDbgDetail{font-size:.76rem;color:rgba(255,255,255,.55);margin-top:2px;word-break:break-word}',
      '#sdDebugPanel .sdDbgActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
      '#sdDebugPanel .sdDbgPrimary{background:#7ab030;color:#081008}',
      '#sdDebugPanel .sdDbgGhost{background:rgba(255,255,255,.08);color:#fff}',
      '#sdDebugMsg{font-size:.78rem;color:#a3d65a;margin-top:10px;min-height:1em}'
    ].join('');
    document.head.appendChild(style);

    var panel = document.createElement('div');
    panel.id = 'sdDebugPanel';
    panel.innerHTML = '<header><h3>🛠️ Schussduell Debug</h3><button class="sdDbgGhost" id="sdDebugClose">Schließen</button></header><div class="sdDbgBody"><div id="sdDebugRows"></div><div class="sdDbgActions"><button class="sdDbgPrimary" id="sdDebugRefresh">Aktualisieren</button><button class="sdDbgGhost" id="sdDebugCopy">Debug kopieren</button><button class="sdDbgGhost" id="sdDebugClearLocal">Local Mode reset</button></div><div id="sdDebugMsg"></div></div>';
    document.body.appendChild(panel);

    document.getElementById('sdDebugClose').addEventListener('click', function () {
      panel.remove();
    });
    document.getElementById('sdDebugRefresh').addEventListener('click', updateRows);
    document.getElementById('sdDebugCopy').addEventListener('click', copyDebugInfo);
    document.getElementById('sdDebugClearLocal').addEventListener('click', function () {
      localStorage.removeItem('sd_local_mode');
      localStorage.removeItem('sd_local_play');
      setPanelMessage('Local Mode Flags gelöscht. Seite neu laden zum Testen.');
      updateRows();
    });

    updateRows();
    setTimeout(updateRows, 500);
    setTimeout(updateRows, 1500);
  }

  function updateRows() {
    var rows = document.getElementById('sdDebugRows');
    if (!rows) return;

    rows.innerHTML = getStatusRows().map(function (row) {
      return '<div class="sdDbgRow"><div>' + boolIcon(row[1]) + '</div><div><div class="sdDbgName">' + row[0] + '</div><div class="sdDbgDetail">' + row[2] + '</div></div></div>';
    }).join('') + '<div class="sdDbgRow"><div>ℹ️</div><div><div class="sdDbgName">URL</div><div class="sdDbgDetail">' + window.location.href + '</div></div></div>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }
})();
