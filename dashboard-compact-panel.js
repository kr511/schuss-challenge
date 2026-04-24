/* Compact dashboard panel: daily challenge + local highscores */
(function () {
  'use strict';

  var PANEL_ID = 'pdCompactChallengeHighscore';
  var STYLE_ID = 'pdCompactChallengeHighscoreStyle';
  var labels = {
    win_2_real: ['🏆', '2 Siege ab Mittel', 2],
    play_1_kk: ['🎯', '1 KK-Duell', 1],
    score_above_9: ['📈', 'Ø 9.0+ im Duell', 1],
    win_1_elite: ['💪', '1 Sieg Elite/Profi', 1],
    play_2_lg: ['🌬️', '2 LG-Duelle', 2],
    perfect_shot: ['💎', '1× 10.9 / KK-10', 1],
    consistency_80: ['🧠', '80% Konstanz', 1],
    hit_5_tens: ['🔥', '5× 10.x', 5],
    hit_5_tens_kk: ['🔥', '5× KK-10', 5],
    score_perfect_10: ['🚀', '100.0+ Ergebnis', 1],
    no_loss_streak_3: ['🛡️', '3 ohne Niederlage', 3],
    high_consistency_90: ['🎯', '90% Konstanz', 1],
    win_3_hard: ['👑', '3 Siege ab Mittel', 3]
  };
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

  function pct(value, target) {
    target = Math.max(1, Number(target) || 1);
    return Math.max(0, Math.min(100, Math.round(((Number(value) || 0) / target) * 100)));
  }

  function resetTime() {
    var now = new Date();
    var next = new Date(now);
    next.setHours(24, 0, 0, 0);
    var mins = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 60000));
    return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '#' + PANEL_ID + '{margin-bottom:20px}' +
      '#' + PANEL_ID + ' .cp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '#' + PANEL_ID + ' .cp-card{background:linear-gradient(145deg,rgba(45,50,55,.38),rgba(10,12,15,.74));border:1px solid rgba(255,255,255,.07);border-top:1px solid rgba(255,255,255,.13);border-radius:16px;padding:13px;box-shadow:0 8px 24px rgba(0,0,0,.42);min-width:0}' +
      '#' + PANEL_ID + ' .cp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px;color:#fff;font-weight:800;font-size:.84rem}' +
      '#' + PANEL_ID + ' .cp-pill{font-size:.62rem;color:rgba(255,255,255,.62);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:3px 7px;white-space:nowrap}' +
      '#' + PANEL_ID + ' .cp-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:7px;padding:7px 0;border-top:1px solid rgba(255,255,255,.055)}' +
      '#' + PANEL_ID + ' .cp-row:first-of-type{border-top:0;padding-top:0}' +
      '#' + PANEL_ID + ' .cp-i{width:24px;height:24px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.055);font-size:.9rem}' +
      '#' + PANEL_ID + ' .cp-name{color:#fff;font-weight:700;font-size:.73rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + PANEL_ID + ' .cp-sub{color:rgba(255,255,255,.38);font-size:.61rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + PANEL_ID + ' .cp-val{color:#7ab030;font-weight:900;font-size:.75rem;text-align:right;white-space:nowrap}' +
      '#' + PANEL_ID + ' .cp-bar{height:3px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;margin-top:5px}' +
      '#' + PANEL_ID + ' .cp-fill{height:100%;background:linear-gradient(90deg,#00c3ff,#7ab030);border-radius:999px}' +
      '@media(max-width:390px){#' + PANEL_ID + ' .cp-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function dailyRows() {
    var data = json('sd_daily_challenge', {});
    var list = Array.isArray(data.challenges) ? data.challenges : [];
    return list.slice(0, 3).map(function (q) {
      var meta = labels[q.id] || ['🎯', q.id || 'Tagesziel', q.target || 1];
      var target = Number(q.target || meta[2] || 1) || 1;
      var progress = Math.min(target, Math.max(0, Number(q.progress) || 0));
      var done = q.completed || progress >= target;
      var reward = q.reward && q.reward.type === 'chest' ? 'Kiste' : '+' + ((q.reward && q.reward.amount) || 25) + ' XP';
      return { icon: done ? '✅' : meta[0], name: meta[1], sub: done ? 'Erledigt · ' + reward : reward, val: progress + '/' + target, pct: done ? 100 : pct(progress, target) };
    });
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
      .slice(0, 3);
  }

  function emptyRow(text) {
    return '<div class="cp-row"><div class="cp-i">ℹ️</div><div><div class="cp-name">' + esc(text) + '</div><div class="cp-sub">Nach dem nächsten Duell füllt sich das automatisch.</div></div><div class="cp-val">–</div></div>';
  }

  function render() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    var daily = dailyRows();
    var done = daily.filter(function (r) { return r.pct >= 100; }).length;
    var highs = highscoreRows();
    var medals = ['🥇', '🥈', '🥉'];

    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 10px 0;gap:10px">' +
        '<div><div style="font-size:1.05rem;font-weight:800;color:#fff;line-height:1.2">Challenge-Zentrale</div><div style="font-size:.72rem;color:rgba(255,255,255,.42)">Tagesziel + Highscore kompakt</div></div>' +
        '<div style="font-size:.68rem;color:rgba(255,255,255,.55);background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:5px 9px;white-space:nowrap">Reset ' + resetTime() + '</div>' +
      '</div>' +
      '<div class="cp-grid">' +
        '<section class="cp-card"><div class="cp-head"><span>🎯 Tageschallenge</span><span class="cp-pill">' + (daily.length ? done + '/' + daily.length : 'lädt') + '</span></div>' +
          (daily.length ? daily.map(function (r) {
            return '<div class="cp-row"><div class="cp-i">' + r.icon + '</div><div style="min-width:0"><div class="cp-name">' + esc(r.name) + '</div><div class="cp-sub">' + esc(r.sub) + '</div><div class="cp-bar"><div class="cp-fill" style="width:' + r.pct + '%"></div></div></div><div class="cp-val">' + esc(r.val) + '</div></div>';
          }).join('') : emptyRow('Noch keine Tageschallenge geladen')) +
        '</section>' +
        '<section class="cp-card"><div class="cp-head"><span>🏆 Highscore</span><span class="cp-pill">Top 3</span></div>' +
          (highs.length ? highs.map(function (h, i) {
            return '<div class="cp-row"><div class="cp-i">' + medals[i] + '</div><div style="min-width:0"><div class="cp-name">' + esc(h.name) + '</div><div class="cp-sub">' + esc(h.disc + (h.result ? ' · ' + h.result : '')) + '</div></div><div class="cp-val">' + (Number.isInteger(h.score) ? h.score : h.score.toFixed(1)) + '</div></div>';
          }).join('') : emptyRow('Noch kein Highscore')) +
        '</section>' +
      '</div>';
  }

  function mount() {
    addStyles();
    var dashboard = document.getElementById('premiumDashboard');
    if (!dashboard) return;
    var panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      var quests = document.getElementById('pdQuestsContainer');
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
