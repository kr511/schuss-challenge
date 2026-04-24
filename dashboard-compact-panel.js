/* Compact dashboard panel: local highscores only */
(function () {
  'use strict';

  var PANEL_ID = 'pdCompactChallengeHighscore';
  var STYLE_ID = 'pdCompactChallengeHighscoreStyle';
  var discNames = { lg40: 'LG 40', lg60: 'LG 60', kk50: 'KK 50m', kk100: 'KK 100m', kk3x20: 'KK 3×20', lg: 'LG', kk: 'KK' };

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

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '#' + PANEL_ID + '{margin-bottom:20px}' +
      '#' + PANEL_ID + ' .cp-card{background:linear-gradient(145deg,rgba(45,50,55,.38),rgba(10,12,15,.74));border:1px solid rgba(255,255,255,.07);border-top:1px solid rgba(255,255,255,.13);border-radius:16px;padding:14px;box-shadow:0 8px 24px rgba(0,0,0,.42);min-width:0}' +
      '#' + PANEL_ID + ' .cp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;color:#fff;font-weight:800;font-size:.92rem}' +
      '#' + PANEL_ID + ' .cp-pill{font-size:.64rem;color:rgba(255,255,255,.62);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:3px 7px;white-space:nowrap}' +
      '#' + PANEL_ID + ' .cp-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;padding:8px 0;border-top:1px solid rgba(255,255,255,.055)}' +
      '#' + PANEL_ID + ' .cp-row:first-of-type{border-top:0;padding-top:0}' +
      '#' + PANEL_ID + ' .cp-i{width:26px;height:26px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.055);font-size:.95rem}' +
      '#' + PANEL_ID + ' .cp-name{color:#fff;font-weight:750;font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + PANEL_ID + ' .cp-sub{color:rgba(255,255,255,.38);font-size:.63rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + PANEL_ID + ' .cp-val{color:#7ab030;font-weight:900;font-size:.82rem;text-align:right;white-space:nowrap}' +
      '#pdQuestsContainer{display:none!important}';
    document.head.appendChild(style);
  }

  function scoreOf(game) {
    var score = Number(game.playerScore);
    if (!Number.isFinite(score)) score = Number(game.totalScore);
    if (!Number.isFinite(score)) score = Number(game.score);
    if (!Number.isFinite(score)) return null;
    return score;
  }

  function highscoreRows() {
    var data = json('sd_enhanced_analytics', {});
    var games = Array.isArray(data.games) ? data.games.slice() : [];
    return games
      .map(function (g) {
        var score = scoreOf(g);
        if (score == null) return null;
        return {
          name: (window.G && window.G.username) || localStorage.getItem('username') || 'Du',
          score: score,
          disc: discNames[g.discipline] || discNames[g.weapon] || g.discipline || 'Duell',
          result: g.result || '',
          time: Number(g.timestamp || 0) || 0
        };
      })
      .filter(Boolean)
      .sort(function (a, b) { return b.score - a.score || b.time - a.time; })
      .slice(0, 5);
  }

  function emptyRow(text) {
    return '<div class="cp-row"><div class="cp-i">ℹ️</div><div><div class="cp-name">' + esc(text) + '</div><div class="cp-sub">Nach dem nächsten Duell füllt sich das automatisch.</div></div><div class="cp-val">–</div></div>';
  }

  function render() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    var highs = highscoreRows();
    var medals = ['🥇', '🥈', '🥉', '4', '5'];

    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 10px 0;gap:10px">' +
        '<div><div style="font-size:1.05rem;font-weight:800;color:#fff;line-height:1.2">Highscore</div><div style="font-size:.72rem;color:rgba(255,255,255,.42)">Deine besten Duelle kompakt</div></div>' +
        '<div style="font-size:.68rem;color:rgba(255,255,255,.55);background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:5px 9px;white-space:nowrap">Top 5</div>' +
      '</div>' +
      '<section class="cp-card"><div class="cp-head"><span>🏆 Beste Ergebnisse</span><span class="cp-pill">Lokal</span></div>' +
        (highs.length ? highs.map(function (h, i) {
          return '<div class="cp-row"><div class="cp-i">' + medals[i] + '</div><div style="min-width:0"><div class="cp-name">' + esc(h.name) + '</div><div class="cp-sub">' + esc(h.disc + (h.result ? ' · ' + h.result : '')) + '</div></div><div class="cp-val">' + (Number.isInteger(h.score) ? h.score : h.score.toFixed(1)) + '</div></div>';
        }).join('') : emptyRow('Noch kein Highscore')) +
      '</section>';
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

  onReady(function () {
    hookRefresh();
    mount();
    setTimeout(function () { hookRefresh(); mount(); }, 400);
    setTimeout(function () { hookRefresh(); mount(); }, 1200);
    setInterval(mount, 30000);
    window.addEventListener('storage', mount);
  });
})();
