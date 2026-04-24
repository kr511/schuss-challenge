/* Compact dashboard panel: clickable local player highscores only */
(function () {
  'use strict';

  var PANEL_ID = 'pdCompactChallengeHighscore';
  var STYLE_ID = 'pdCompactChallengeHighscoreStyle';
  var OVERLAY_ID = 'pdHighscoreOverlay';
  var discNames = { lg40: 'LG 40', lg60: 'LG 60', kk50: 'KK 50m', kk100: 'KK 100m', kk3x20: 'KK 3×20', lg: 'LG', kk: 'KK' };
  var lastRows = [];

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function esc(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function json(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function fmtScore(score) {
    return Number.isInteger(score) ? String(score) : score.toFixed(1);
  }

  function fmtDate(time) {
    if (!time) return 'Kein Datum';
    try {
      return new Date(time).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Kein Datum';
    }
  }

  function playerName() {
    try {
      if (window.G && window.G.username) return window.G.username;
      if (typeof StorageManager !== 'undefined' && StorageManager.getRaw) {
        var stored = StorageManager.getRaw('username');
        if (stored) return stored;
      }
      return localStorage.getItem('username') || localStorage.getItem('sd_username') || 'Spieler';
    } catch (e) {
      return 'Spieler';
    }
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '#' + PANEL_ID + '{margin-bottom:20px}' +
      '#' + PANEL_ID + ' .cp-card{background:linear-gradient(145deg,rgba(45,50,55,.38),rgba(10,12,15,.74));border:1px solid rgba(255,255,255,.07);border-top:1px solid rgba(255,255,255,.13);border-radius:16px;padding:14px;box-shadow:0 8px 24px rgba(0,0,0,.42);min-width:0;cursor:pointer;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}' +
      '#' + PANEL_ID + ' .cp-card:active{transform:scale(.985);border-color:rgba(122,176,48,.35);box-shadow:0 6px 18px rgba(0,0,0,.38)}' +
      '#' + PANEL_ID + ' .cp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:#fff;font-weight:800;font-size:.92rem}' +
      '#' + PANEL_ID + ' .cp-pill{font-size:.64rem;color:rgba(255,255,255,.62);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:3px 7px;white-space:nowrap}' +
      '#' + PANEL_ID + ' .cp-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;padding:8px 0;border-top:1px solid rgba(255,255,255,.055)}' +
      '#' + PANEL_ID + ' .cp-row:first-of-type{border-top:0;padding-top:0}' +
      '#' + PANEL_ID + ' .cp-i{width:26px;height:26px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.055);font-size:.95rem}' +
      '#' + PANEL_ID + ' .cp-name{color:#fff;font-weight:750;font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + PANEL_ID + ' .cp-sub{color:rgba(255,255,255,.38);font-size:.63rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + PANEL_ID + ' .cp-val{color:#7ab030;font-weight:900;font-size:.82rem;text-align:right;white-space:nowrap}' +
      '#pdQuestsContainer{display:none!important}' +
      '#' + OVERLAY_ID + '{position:fixed;inset:0;background:rgba(0,0,0,.58);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:10050;display:none;align-items:flex-end;justify-content:center;padding:0 14px 14px}' +
      '#' + OVERLAY_ID + '.open{display:flex}' +
      '#' + OVERLAY_ID + ' .hs-sheet{width:100%;max-width:520px;max-height:82vh;overflow:auto;background:linear-gradient(180deg,#1e293b,#0f172a);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:18px;box-shadow:0 -12px 45px rgba(0,0,0,.55)}' +
      '#' + OVERLAY_ID + ' .hs-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}' +
      '#' + OVERLAY_ID + ' .hs-title{color:#fff;font-size:1.2rem;font-weight:900}' +
      '#' + OVERLAY_ID + ' .hs-sub{color:rgba(255,255,255,.45);font-size:.76rem;margin-top:2px}' +
      '#' + OVERLAY_ID + ' .hs-close{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-weight:900;font-size:1rem}' +
      '#' + OVERLAY_ID + ' .hs-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:12px 0;border-top:1px solid rgba(255,255,255,.07)}' +
      '#' + OVERLAY_ID + ' .hs-rank{width:34px;height:34px;border-radius:12px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900}' +
      '#' + OVERLAY_ID + ' .hs-name{color:#fff;font-weight:850;font-size:.9rem}' +
      '#' + OVERLAY_ID + ' .hs-meta{color:rgba(255,255,255,.42);font-size:.7rem;margin-top:3px}' +
      '#' + OVERLAY_ID + ' .hs-score{color:#7ab030;font-size:1rem;font-weight:950;text-align:right}' +
      '#' + OVERLAY_ID + ' .hs-note{margin-top:12px;color:rgba(255,255,255,.42);font-size:.72rem;line-height:1.35;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:10px 12px}';
    document.head.appendChild(style);
  }

  function getPlayerScore(obj) {
    if (!obj || typeof obj !== 'object') return null;
    var fields = ['playerScore', 'playerTotal', 'playerTotalInt', '_playerTotalTenths'];
    for (var i = 0; i < fields.length; i++) {
      var n = Number(obj[fields[i]]);
      if (Number.isFinite(n) && n > 0 && n < 1000) {
        if (fields[i] === '_playerTotalTenths') return n / 10;
        return n;
      }
    }
    return null;
  }

  function rowFromGame(game, source) {
    var score = getPlayerScore(game);
    if (score == null) return null;
    var disc = discNames[game.discipline] || discNames[game.weapon] || game.discipline || game.weapon || 'Duell';
    return {
      name: game.playerName || game.username || game.name || playerName(),
      score: score,
      disc: disc,
      result: game.result || game.outcome || '',
      time: Number(game.timestamp || game.date || game.time || game.createdAt || 0) || 0,
      source: source || 'local'
    };
  }

  function collectRowsFromValue(value, source, rows, seen, depth) {
    if (depth > 5 || value == null) return;
    if (Array.isArray(value)) {
      value.forEach(function (item) { collectRowsFromValue(item, source, rows, seen, depth + 1); });
      return;
    }
    if (typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);

    var row = rowFromGame(value, source);
    if (row) rows.push(row);

    Object.keys(value).forEach(function (key) {
      if (/game|duel|match|history|recent|analytics|session|result|stats|entries|items|games/i.test(key)) {
        collectRowsFromValue(value[key], source, rows, seen, depth + 1);
      }
    });
  }

  function highscoreRows(limit) {
    var rows = [];
    var seen = new WeakSet();

    collectRowsFromValue(json('sd_enhanced_analytics', {}), 'analytics', rows, seen, 0);

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || !/sd_|duel|game|match|history|recent|analytics|stats|score/i.test(key)) continue;
        collectRowsFromValue(json(key, null), key, rows, seen, 0);
      }
    } catch (e) {
      console.warn('[Highscore] Local scan failed', e);
    }

    var unique = new Map();
    rows.forEach(function (row) {
      var id = [row.name, row.disc, Math.round(row.score * 10), row.time || row.source].join('|');
      if (!unique.has(id)) unique.set(id, row);
    });

    lastRows = Array.from(unique.values())
      .sort(function (a, b) { return b.score - a.score || b.time - a.time; });

    return lastRows.slice(0, limit || 5);
  }

  function emptyRow(text) {
    return '<div class="cp-row"><div class="cp-i">ℹ️</div><div><div class="cp-name">' + esc(text) + '</div><div class="cp-sub">Nur Spieler-Scores werden gezählt.</div></div><div class="cp-val">–</div></div>';
  }

  function ensureOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeHighscoreOverlay();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function openHighscoreOverlay() {
    var overlay = ensureOverlay();
    var highs = highscoreRows(20);
    var medals = ['🥇', '🥈', '🥉'];
    overlay.innerHTML =
      '<div class="hs-sheet" role="dialog" aria-modal="true" aria-label="Highscore">' +
        '<div class="hs-top"><div><div class="hs-title">🏆 Highscore</div><div class="hs-sub">Nur echte Spieler-Scores · keine Bot-Punkte</div></div><button class="hs-close" type="button" aria-label="Schließen">×</button></div>' +
        (highs.length ? highs.map(function (h, i) {
          var rank = medals[i] || String(i + 1);
          var meta = h.disc + (h.result ? ' · ' + h.result : '') + ' · ' + fmtDate(h.time);
          return '<div class="hs-row"><div class="hs-rank">' + rank + '</div><div><div class="hs-name">' + esc(h.name) + '</div><div class="hs-meta">' + esc(meta) + '</div></div><div class="hs-score">' + fmtScore(h.score) + '</div></div>';
        }).join('') : '<div class="hs-row"><div class="hs-rank">ℹ️</div><div><div class="hs-name">Noch kein Highscore</div><div class="hs-meta">Spiele ein Duell, dann erscheint dein Spieler-Score hier.</div></div><div class="hs-score">–</div></div>') +
        '<div class="hs-note">Wichtig: Gezählt werden nur Spieler-Felder wie <b>playerScore</b> oder <b>playerTotal</b>. <b>botScore</b> und Bot-Werte werden ignoriert.</div>' +
      '</div>';
    var close = overlay.querySelector('.hs-close');
    if (close) close.addEventListener('click', closeHighscoreOverlay);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeHighscoreOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function render() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    var highs = highscoreRows(5);
    var medals = ['🥇', '🥈', '🥉', '4', '5'];

    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 10px 0;gap:10px">' +
        '<div><div style="font-size:1.05rem;font-weight:800;color:#fff;line-height:1.2">Highscore</div><div style="font-size:.72rem;color:rgba(255,255,255,.42)">Antippen für komplette Liste</div></div>' +
        '<button type="button" data-open-hs="1" style="font-size:.68rem;color:rgba(255,255,255,.75);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:6px 10px;white-space:nowrap;font-weight:800">Öffnen</button>' +
      '</div>' +
      '<section class="cp-card" role="button" tabindex="0" aria-label="Highscore öffnen"><div class="cp-head"><span>🏆 Beste Spieler-Ergebnisse</span><span class="cp-pill">Top 5</span></div>' +
        (highs.length ? highs.map(function (h, i) {
          return '<div class="cp-row"><div class="cp-i">' + medals[i] + '</div><div style="min-width:0"><div class="cp-name">' + esc(h.name) + '</div><div class="cp-sub">' + esc(h.disc + (h.result ? ' · ' + h.result : '')) + '</div></div><div class="cp-val">' + fmtScore(h.score) + '</div></div>';
        }).join('') : emptyRow('Noch kein Highscore')) +
      '</section>';

    var card = panel.querySelector('.cp-card');
    var openBtn = panel.querySelector('[data-open-hs]');
    if (card) {
      card.onclick = openHighscoreOverlay;
      card.onkeydown = function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openHighscoreOverlay();
        }
      };
    }
    if (openBtn) openBtn.onclick = openHighscoreOverlay;
  }

  function mount() {
    addStyles();
    var dashboard = document.getElementById('premiumDashboard');
    if (!dashboard) return;

    var quests = document.getElementById('pdQuestsContainer');
    if (quests) quests.style.display = 'none';

    var panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      if (quests) quests.insertAdjacentElement('afterend', panel);
      else dashboard.appendChild(panel);
    }
    render();
  }

  function hookRefresh() {
    var original = window.refreshPremiumDashboard;
    if (typeof original !== 'function' || original.__compactPanelWrapped) return;
    window.refreshPremiumDashboard = function () {
      var result = original.apply(this, arguments);
      setTimeout(mount, 0);
      return result;
    };
    window.refreshPremiumDashboard.__compactPanelWrapped = true;
  }

  window.openPlayerHighscore = openHighscoreOverlay;
  window.closePlayerHighscore = closeHighscoreOverlay;
  window.refreshPlayerHighscorePanel = mount;

  onReady(function () {
    hookRefresh();
    mount();
    setTimeout(function () { hookRefresh(); mount(); }, 400);
    setTimeout(function () { hookRefresh(); mount(); }, 1200);
    setTimeout(function () { hookRefresh(); mount(); }, 2500);
    setInterval(mount, 30000);
    window.addEventListener('storage', mount);
    window.addEventListener('analyticsUpdated', mount);
  });
})();
