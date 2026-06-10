/**
 * Rivalen-System (Prototyp)
 *
 * Macht aus den Bot-Schwierigkeitsgraden benannte Rivalen und fuehrt eine
 * Bilanz pro Rivale (Siege/Niederlagen/letzte Duelle). Auf dem Dashboard
 * erscheint eine Rivalen-Karte mit Revanche-Button, der das Duell-Setup
 * mit der passenden Schwierigkeit (und zuletzt gespielter Disziplin)
 * vorkonfiguriert oeffnet.
 *
 * Integration:
 *  - app.js ruft RivalSystem.recordDuel({...}) am Duell-Ende auf
 *  - Karte mountet sich in #premiumDashboard (nach dem Highscore-Panel)
 *
 * Reine Logik (normalizeDifficulty, applyDuel, pickRival) ist DOM-frei und
 * wird von test_rival_system.mjs in einer Sandbox getestet.
 *
 * window.RivalSystem
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'sd_rival_state';
  var HISTORY_LIMIT = 10;
  var RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 Tage
  var PANEL_ID = 'rivalSystemPanel';
  var STYLE_ID = 'rivalSystemStyles';

  var RIVALS = {
    easy:  { name: 'Jonas',  icon: '🐣', label: 'Anfänger' },
    real:  { name: 'Markus', icon: '🎯', label: 'Realistisch' },
    hard:  { name: 'Sabine', icon: '🦅', label: 'Schwer' },
    elite: { name: 'Viktor', icon: '👑', label: 'Elite' }
  };
  var DIFFICULTIES = ['easy', 'real', 'hard', 'elite'];

  // ─── Reine Logik (testbar, ohne DOM/Storage) ───

  function normalizeDifficulty(value) {
    var v = String(value || '').trim().toLowerCase();
    if (DIFFICULTIES.indexOf(v) !== -1) return v;
    if (v === 'realistic' || v === 'realistisch' || v === 'medium') return 'real';
    if (v === 'anfaenger' || v === 'anfänger' || v === 'beginner') return 'easy';
    if (v === 'schwer') return 'hard';
    return null;
  }

  function emptyTally() {
    return { wins: 0, losses: 0, draws: 0, lastPlayed: 0, lastDiscipline: '', history: [] };
  }

  function emptyState() {
    return { byDifficulty: {} };
  }

  /**
   * Wendet ein Duell-Ergebnis auf einen State an (mutiert NICHT, gibt neuen
   * State zurueck). result: 'win' | 'loss' | 'draw' (alles andere -> ignoriert).
   */
  function applyDuel(state, duel, now) {
    var diff = normalizeDifficulty(duel && duel.difficulty);
    var result = String((duel && duel.result) || '').toLowerCase();
    if (!diff) return state;
    if (result !== 'win' && result !== 'loss' && result !== 'draw') return state;

    var ts = Number(now) || Date.now();
    var next = { byDifficulty: {} };
    var key;
    for (key in state.byDifficulty) {
      if (Object.prototype.hasOwnProperty.call(state.byDifficulty, key)) {
        next.byDifficulty[key] = state.byDifficulty[key];
      }
    }

    var prev = next.byDifficulty[diff] || emptyTally();
    var tally = {
      wins: prev.wins + (result === 'win' ? 1 : 0),
      losses: prev.losses + (result === 'loss' ? 1 : 0),
      draws: prev.draws + (result === 'draw' ? 1 : 0),
      lastPlayed: ts,
      lastDiscipline: String((duel && duel.discipline) || prev.lastDiscipline || ''),
      history: prev.history.concat([{
        r: result === 'win' ? 'w' : (result === 'loss' ? 'l' : 'd'),
        t: ts
      }]).slice(-HISTORY_LIMIT)
    };
    next.byDifficulty[diff] = tally;
    return next;
  }

  /**
   * Waehlt den aktuellen Rivalen:
   *  1. Unter den in den letzten 14 Tagen gespielten Schwierigkeiten die mit
   *     der schlechtesten Bilanz (losses - wins maximal).
   *  2. Gleichstand -> zuletzt gespielte.
   *  3. Nichts Aktuelles -> insgesamt zuletzt gespielte Schwierigkeit.
   *  4. Nie gespielt -> null.
   */
  function pickRival(state, now) {
    var ts = Number(now) || Date.now();
    var best = null;
    var bestScore = -Infinity;
    var fallback = null;

    for (var i = 0; i < DIFFICULTIES.length; i++) {
      var diff = DIFFICULTIES[i];
      var tally = state.byDifficulty[diff];
      if (!tally || !tally.lastPlayed) continue;

      if (!fallback || tally.lastPlayed > state.byDifficulty[fallback].lastPlayed) {
        fallback = diff;
      }
      if (ts - tally.lastPlayed > RECENT_WINDOW_MS) continue;

      var score = tally.losses - tally.wins;
      if (score > bestScore || (score === bestScore && best !== null
          && tally.lastPlayed > state.byDifficulty[best].lastPlayed)) {
        best = diff;
        bestScore = score;
      }
    }

    return best || fallback;
  }

  // ─── Storage ───

  var memoryState = emptyState();

  function getStorage() {
    try {
      if (typeof root.localStorage !== 'undefined' && root.localStorage) return root.localStorage;
    } catch (_e) { /* z.B. Privacy-Mode */ }
    return null;
  }

  function loadState() {
    var storage = getStorage();
    if (!storage) return memoryState;
    try {
      var raw = storage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || typeof parsed.byDifficulty !== 'object' || !parsed.byDifficulty) {
        return emptyState();
      }
      var clean = emptyState();
      for (var i = 0; i < DIFFICULTIES.length; i++) {
        var diff = DIFFICULTIES[i];
        var t = parsed.byDifficulty[diff];
        if (!t || typeof t !== 'object') continue;
        clean.byDifficulty[diff] = {
          wins: Math.max(0, Number(t.wins) || 0),
          losses: Math.max(0, Number(t.losses) || 0),
          draws: Math.max(0, Number(t.draws) || 0),
          lastPlayed: Math.max(0, Number(t.lastPlayed) || 0),
          lastDiscipline: typeof t.lastDiscipline === 'string' ? t.lastDiscipline : '',
          history: Array.isArray(t.history) ? t.history.slice(-HISTORY_LIMIT) : []
        };
      }
      return clean;
    } catch (e) {
      console.warn('[RivalSystem] State konnte nicht geladen werden:', e);
      return emptyState();
    }
  }

  function saveState(state) {
    memoryState = state;
    var storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[RivalSystem] State konnte nicht gespeichert werden:', e);
    }
  }

  // ─── Oeffentliche API ───

  function recordDuel(duel) {
    var state = loadState();
    var next = applyDuel(state, duel, Date.now());
    if (next === state) return false;
    saveState(next);
    scheduleRender();
    return true;
  }

  function getState() {
    return JSON.parse(JSON.stringify(loadState()));
  }

  // ─── UI (nur im Browser) ───

  function hasDom() {
    return typeof document !== 'undefined' && document && typeof document.createElement === 'function';
  }

  function esc(s) {
    if (typeof root.escHtml === 'function') return root.escHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + PANEL_ID + '{margin:14px 0 0 0}',
      '#' + PANEL_ID + ' .rv-card{background:linear-gradient(135deg,rgba(255,77,77,.10),rgba(255,255,255,.04));',
      'border:1px solid rgba(255,77,77,.25);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px}',
      '#' + PANEL_ID + ' .rv-icon{font-size:2rem;line-height:1}',
      '#' + PANEL_ID + ' .rv-name{font-weight:800;color:#fff;font-size:1rem;line-height:1.2}',
      '#' + PANEL_ID + ' .rv-sub{font-size:.72rem;color:rgba(255,255,255,.5);margin-top:2px}',
      '#' + PANEL_ID + ' .rv-dots{letter-spacing:2px;font-size:.7rem;margin-top:4px}',
      '#' + PANEL_ID + ' .rv-dot-w{color:#4ade80}',
      '#' + PANEL_ID + ' .rv-dot-l{color:#f87171}',
      '#' + PANEL_ID + ' .rv-dot-d{color:rgba(255,255,255,.4)}',
      '#' + PANEL_ID + ' .rv-cta{margin-left:auto;flex-shrink:0;background:rgba(255,77,77,.85);color:#fff;border:none;',
      'border-radius:12px;padding:10px 14px;font-weight:800;font-size:.78rem;cursor:pointer}',
      '#' + PANEL_ID + ' .rv-cta:active{transform:scale(.96)}',
      '#' + PANEL_ID + ' .rv-head{font-size:1.05rem;font-weight:800;color:#fff;margin:0 0 10px 0}'
    ].join('');
    document.head.appendChild(style);
  }

  function tauntFor(tally) {
    var lead = tally.wins - tally.losses;
    if (lead > 0) return 'Du führst — verteidige deinen Vorsprung!';
    if (lead < 0) return 'Zeit für Revanche!';
    return 'Gleichstand — das nächste Duell entscheidet.';
  }

  function dotsFor(tally) {
    var html = '';
    var recent = tally.history.slice(-5);
    for (var i = 0; i < recent.length; i++) {
      var r = recent[i].r;
      if (r === 'w') html += '<span class="rv-dot-w">●</span>';
      else if (r === 'l') html += '<span class="rv-dot-l">●</span>';
      else html += '<span class="rv-dot-d">●</span>';
    }
    return html;
  }

  function startRevanche(diff, discipline) {
    try {
      var runtime = root.DuelSetupRuntime;
      if (runtime && typeof runtime.setDifficulty === 'function') runtime.setDifficulty(diff);
      if (discipline && runtime && typeof runtime.setDiscipline === 'function') runtime.setDiscipline(discipline);
      if (typeof root.openDuelSetup === 'function') {
        root.openDuelSetup();
        return;
      }
      if (typeof root.switchTab === 'function') root.switchTab('start');
    } catch (e) {
      console.warn('[RivalSystem] Revanche-Start fehlgeschlagen:', e);
    }
  }

  function render() {
    if (!hasDom()) return;
    var dashboard = document.getElementById('premiumDashboard');
    if (!dashboard) return;
    addStyles();

    var panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      var anchor = document.getElementById('pdCompactChallengeHighscore');
      if (anchor) anchor.insertAdjacentElement('afterend', panel);
      else dashboard.appendChild(panel);
    }

    var state = loadState();
    var diff = pickRival(state, Date.now());

    if (!diff) {
      panel.innerHTML =
        '<div class="rv-head">🥊 Dein Rivale</div>' +
        '<div class="rv-card">' +
          '<div class="rv-icon">❓</div>' +
          '<div><div class="rv-name">Noch kein Rivale</div>' +
          '<div class="rv-sub">Spiel ein Duell gegen den Bot — wer dich schlägt, wird dein Rivale.</div></div>' +
          '<button class="rv-cta" type="button" data-rv-action="start">Duell starten</button>' +
        '</div>';
    } else {
      var rival = RIVALS[diff];
      var tally = state.byDifficulty[diff];
      panel.innerHTML =
        '<div class="rv-head">🥊 Dein Rivale</div>' +
        '<div class="rv-card">' +
          '<div class="rv-icon">' + esc(rival.icon) + '</div>' +
          '<div style="min-width:0">' +
            '<div class="rv-name">' + esc(rival.name) + ' <span style="font-weight:600;color:rgba(255,255,255,.45)">· ' + esc(rival.label) + '</span></div>' +
            '<div class="rv-sub">Bilanz <b style="color:#4ade80">' + tally.wins + 'S</b> : <b style="color:#f87171">' + tally.losses + 'N</b>' +
              (tally.draws ? ' : ' + tally.draws + 'U' : '') + ' — ' + esc(tauntFor(tally)) + '</div>' +
            '<div class="rv-dots">' + dotsFor(tally) + '</div>' +
          '</div>' +
          '<button class="rv-cta" type="button" data-rv-action="revanche" data-rv-diff="' + esc(diff) + '" data-rv-disc="' + esc(tally.lastDiscipline) + '">Revanche</button>' +
        '</div>';
    }

    if (!panel.dataset.rvBound) {
      panel.dataset.rvBound = '1';
      panel.addEventListener('click', function (ev) {
        var btn = ev.target.closest('[data-rv-action]');
        if (!btn) return;
        startRevanche(btn.dataset.rvDiff || 'real', btn.dataset.rvDisc || '');
      });
    }
  }

  var renderQueued = false;
  function scheduleRender() {
    if (!hasDom() || renderQueued) return;
    renderQueued = true;
    setTimeout(function () { renderQueued = false; render(); }, 0);
  }

  function hookDashboardRefresh() {
    var original = root.refreshPremiumDashboard;
    if (typeof original !== 'function' || original.__rivalWrapped) return;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      scheduleRender();
      return result;
    };
    wrapped.__rivalWrapped = true;
    root.refreshPremiumDashboard = wrapped;
  }

  function init() {
    if (!hasDom()) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { render(); hookDashboardRefresh(); });
    } else {
      render();
      hookDashboardRefresh();
    }
  }

  root.RivalSystem = {
    RIVALS: RIVALS,
    normalizeDifficulty: normalizeDifficulty,
    applyDuel: applyDuel,
    pickRival: pickRival,
    recordDuel: recordDuel,
    getState: getState,
    render: render
  };

  init();
})(typeof window !== 'undefined' ? window : globalThis);
