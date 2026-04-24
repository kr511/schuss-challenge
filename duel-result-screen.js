/**
 * Duel Result Screen
 *
 * Mobile-first result overlay for bot duels. It observes the existing global duel
 * state after startBattle() and displays a richer result summary when both sides
 * have finished shooting.
 */
(function () {
  'use strict';

  const VERSION = '4.8';
  if (window.DuelResultScreen?.version === VERSION) return;

  const XP_REWARD = { easy: 10, real: 20, hard: 40, elite: 75 };
  const DIFFICULTY_LABELS = {
    easy: 'Einfach',
    real: 'Mittel',
    hard: 'Elite',
    elite: 'Profi'
  };
  const DISCIPLINE_LABELS = {
    lg40: 'LG 40',
    lg60: 'LG 60',
    kk50: 'KK 50m',
    kk100: 'KK 100m',
    kk3x20: 'KK 3×20'
  };
  const DISTANCE_BY_DISCIPLINE = {
    lg40: '10',
    lg60: '10',
    kk50: '50',
    kk100: '100',
    kk3x20: '50'
  };

  const state = {
    active: false,
    pollTimer: null,
    lastSignature: '',
    lastConfig: null,
    patched: false,
    startedAt: 0,
    stableFinishedTicks: 0,
    lastScorePair: ''
  };

  function getGame() {
    try {
      // eslint-disable-next-line no-undef
      return typeof G !== 'undefined' ? G : null;
    } catch (e) {
      return null;
    }
  }

  function ensureStyles() {
    if (document.getElementById('duelResultScreenStyles')) return;

    const style = document.createElement('style');
    style.id = 'duelResultScreenStyles';
    style.textContent = `
      .duel-result-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483100;
        display: grid;
        place-items: end center;
        padding: 16px 14px calc(18px + env(safe-area-inset-bottom));
        background:
          radial-gradient(circle at 18% 12%, rgba(0,195,255,.16), transparent 34%),
          radial-gradient(circle at 90% 42%, rgba(169,239,58,.12), transparent 42%),
          rgba(2, 4, 7, .94);
        color: #f3f6f8;
        font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      .duel-result-card {
        width: min(100%, 560px);
        max-height: 94dvh;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        border: 1px solid rgba(120,144,160,.34);
        border-radius: 28px;
        padding: 18px;
        background: linear-gradient(180deg, rgba(16,25,34,.98), rgba(8,13,19,.985));
        box-shadow: 0 24px 80px rgba(0,0,0,.66), inset 0 1px 0 rgba(255,255,255,.04);
      }

      .duel-result-card.win { border-color: rgba(169,239,58,.68); box-shadow: 0 0 42px rgba(169,239,58,.12), 0 24px 80px rgba(0,0,0,.66); }
      .duel-result-card.lose { border-color: rgba(255,110,110,.52); }
      .duel-result-card.draw { border-color: rgba(22,215,236,.64); }

      .duel-result-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 14px;
      }

      .duel-result-kicker {
        color: rgba(230,238,244,.55);
        font-size: .76rem;
        font-weight: 950;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      .duel-result-title {
        margin: 3px 0 5px;
        font-size: clamp(2rem, 10vw, 3rem);
        line-height: .95;
        font-weight: 950;
        letter-spacing: .02em;
        text-transform: uppercase;
      }

      .duel-result-card.win .duel-result-title { color: #a9ef3a; }
      .duel-result-card.lose .duel-result-title { color: #ff8c8c; }
      .duel-result-card.draw .duel-result-title { color: #16d7ec; }

      .duel-result-subtitle {
        color: rgba(230,238,244,.74);
        font-size: .92rem;
        font-weight: 800;
        line-height: 1.3;
      }

      .duel-result-close {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 50%;
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.78);
        font-size: 1.15rem;
        font-weight: 900;
        cursor: pointer;
      }

      .duel-score-card {
        padding: 15px;
        border: 1px solid rgba(66,108,126,.72);
        border-radius: 19px;
        background:
          linear-gradient(90deg, rgba(8,18,24,.96), rgba(8,41,54,.82)),
          radial-gradient(circle at 96% 12%, rgba(0,195,255,.14), transparent 48%);
      }

      .duel-score-row {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 12px;
      }

      .duel-score-side {
        padding: 12px 10px;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 16px;
        background: rgba(255,255,255,.04);
        text-align: center;
      }

      .duel-score-side.winner {
        border-color: rgba(169,239,58,.78);
        background: rgba(169,239,58,.10);
        box-shadow: 0 0 24px rgba(169,239,58,.14);
      }

      .duel-score-label {
        color: rgba(230,238,244,.55);
        font-size: .74rem;
        font-weight: 950;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .duel-score-value {
        margin-top: 5px;
        color: #f5f8fa;
        font-size: clamp(2.1rem, 11vw, 3.25rem);
        line-height: .95;
        font-weight: 950;
      }

      .duel-score-side.winner .duel-score-value { color: #a9ef3a; }

      .duel-score-vs {
        color: rgba(230,238,244,.42);
        font-size: .86rem;
        font-weight: 950;
        letter-spacing: .1em;
      }

      .duel-diff-line {
        margin-top: 12px;
        color: rgba(230,238,244,.74);
        text-align: center;
        font-size: .94rem;
        font-weight: 850;
      }

      .duel-result-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }

      .duel-result-stat {
        min-height: 84px;
        padding: 12px;
        border: 1px solid rgba(117,137,154,.30);
        border-radius: 16px;
        background: linear-gradient(145deg, rgba(21,31,42,.95), rgba(9,16,23,.96));
      }

      .duel-result-stat-label {
        color: rgba(230,238,244,.52);
        font-size: .72rem;
        font-weight: 950;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .duel-result-stat-value {
        margin-top: 8px;
        color: #16d7ec;
        font-size: 1.28rem;
        font-weight: 950;
        line-height: 1.1;
      }

      .duel-result-reward {
        margin-top: 14px;
        padding: 13px 14px;
        border: 1px solid rgba(169,239,58,.34);
        border-radius: 16px;
        background: rgba(169,239,58,.08);
        color: rgba(235,255,220,.9);
        font-weight: 850;
        line-height: 1.35;
      }

      .duel-result-reward strong {
        color: #a9ef3a;
        font-size: 1.1rem;
      }

      .duel-result-actions {
        display: grid;
        grid-template-columns: 1fr;
        gap: 9px;
        margin-top: 14px;
      }

      .duel-result-btn {
        min-height: 56px;
        border: 0;
        border-radius: 16px;
        color: #031219;
        background: linear-gradient(135deg, #18d7ed 0%, #19bbd6 55%, #0ee2ea 100%);
        box-shadow: 0 0 0 1px rgba(143,250,255,.55), 0 12px 28px rgba(0,195,255,.20);
        font-size: .98rem;
        font-weight: 950;
        letter-spacing: .08em;
        cursor: pointer;
      }

      .duel-result-btn.secondary {
        color: #f3f6f8;
        background: rgba(255,255,255,.075);
        border: 1px solid rgba(255,255,255,.13);
        box-shadow: none;
      }

      @media (min-width: 440px) {
        .duel-result-actions { grid-template-columns: 1fr 1fr 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function html(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function number(value, fallback = 0) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function getScore(side) {
    const game = getGame();
    if (!game) return 0;
    const prefix = side === 'bot' ? 'bot' : 'player';

    const intScore = number(game[`${prefix}TotalInt`], NaN);
    if (Number.isFinite(intScore) && intScore > 0) return Math.round(intScore);

    const total = number(game[`${prefix}Total`], NaN);
    if (Number.isFinite(total) && total > 0) return Math.round(total);

    const tenths = number(game[`_${prefix}TotalTenths`], NaN);
    if (Number.isFinite(tenths) && tenths > 0) return Math.round(tenths / 10);

    return 0;
  }

  function getTargetLabel(discipline, difficulty) {
    let target = null;
    try {
      target = window.BattleBalance?.getBalanceTarget?.(discipline, difficulty) ||
        window.BattleBalance?.BALANCE_TARGETS?.[discipline]?.[difficulty];
    } catch (e) {
      target = null;
    }

    if (!target) return '—';
    if (target.floor !== undefined) return `≥${target.floor}`;
    if (target.min !== undefined && target.max !== undefined) return `${target.min}–${target.max}`;
    return '—';
  }

  function shotValue(shot) {
    if (typeof shot === 'number') return shot;
    if (!shot || typeof shot !== 'object') return NaN;
    return number(shot.score ?? shot.value ?? shot.points ?? shot.ring ?? shot.total, NaN);
  }

  function getShotValues(side) {
    const game = getGame();
    const key = side === 'bot' ? 'botShots' : 'playerShots';
    if (!game || !Array.isArray(game[key])) return [];
    return game[key].map(shotValue).filter(Number.isFinite);
  }

  function getPlayerShotValues() {
    return getShotValues('player');
  }

  function bestSeries(values, score, shots) {
    if (!values.length) {
      const safeShots = Math.max(1, Number(shots) || 1);
      return Math.round(score / safeShots * Math.min(10, safeShots));
    }

    let best = 0;
    for (let i = 0; i < values.length; i += 10) {
      const series = values.slice(i, i + 10).reduce((sum, value) => sum + value, 0);
      best = Math.max(best, series);
    }
    return Math.round(best || 0);
  }

  function formatAverage(score, shots) {
    const safeShots = Math.max(1, Number(shots) || 1);
    return (score / safeShots).toFixed(2);
  }

  function getResultText(result, diffAbs) {
    if (result === 'win') return `Stark geschossen — du hast den Bot um ${diffAbs} Punkte geschlagen.`;
    if (result === 'lose') return `Knapp daneben — dir fehlen ${diffAbs} Punkte zur Revanche.`;
    return 'Exakt gleich stark. Revanche?';
  }

  function getRewardText(result, difficulty, diffAbs) {
    if (result === 'win') return `<strong>+${XP_REWARD[difficulty] || 10} XP</strong> · Sieg-Bonus erhalten.`;
    if (result === 'draw') return '<strong>+10 XP</strong> · Starkes Duell, keine Niederlage.';
    if (diffAbs <= 5) return '<strong>+5 XP</strong> · Knapp verloren, Revanche lohnt sich.';
    return '<strong>+5 XP</strong> · Erfahrung gesammelt. Nächste Runde wird besser.';
  }

  function normalizeDiscipline(discipline, weapon) {
    if (DISCIPLINE_LABELS[discipline]) return discipline;
    if (weapon === 'kk') return 'kk50';
    return 'lg40';
  }

  function captureConfig() {
    const game = getGame();
    if (!game) return null;

    const discipline = normalizeDiscipline(game.discipline || 'lg40', game.weapon);
    const difficulty = game.diff || 'easy';
    const shots = Number(game.maxShots || game.shots || game.playerShots?.length || 40) || 40;
    return {
      discipline,
      difficulty,
      shots,
      distance: DISTANCE_BY_DISCIPLINE[discipline] || game.dist || (discipline.startsWith('lg') ? '10' : '50'),
      weapon: game.weapon || (discipline.startsWith('lg') ? 'lg' : 'kk')
    };
  }

  function isFinished() {
    const game = getGame();
    if (!game) return false;

    const config = captureConfig() || state.lastConfig || {};
    const expectedShots = Number(config.shots || game.maxShots || game.shots || 0);
    const playerLeft = Number(game.playerShotsLeft);
    const botLeft = Number(game.botShotsLeft);
    const playerValues = getShotValues('player');
    const botValues = getShotValues('bot');
    const playerScore = getScore('player');
    const botScore = getScore('bot');
    const hasScore = playerScore > 0 || botScore > 0;
    const scorePair = `${playerScore}:${botScore}:${playerValues.length}:${botValues.length}`;

    if (!hasScore) return false;
    if (game.dnf === true || game.battleFinished === true || game.duelFinished === true || game.gameOver === true || game.isFinished === true) return true;
    if (Number.isFinite(playerLeft) && Number.isFinite(botLeft) && playerLeft <= 0 && botLeft <= 0) return true;
    if (expectedShots > 0 && playerValues.length >= expectedShots && botValues.length >= expectedShots) return true;

    // Fallback: if both totals are stable for several polls after all known shots are gone,
    // show the result instead of silently failing because one internal flag is missing.
    if (scorePair === state.lastScorePair) {
      state.stableFinishedTicks += 1;
    } else {
      state.lastScorePair = scorePair;
      state.stableFinishedTicks = 0;
    }

    const noKnownShotsLeft = (!Number.isFinite(playerLeft) || playerLeft <= 0) && (!Number.isFinite(botLeft) || botLeft <= 0);
    return noKnownShotsLeft && state.stableFinishedTicks >= 3;
  }

  function resultPayload() {
    const game = getGame();
    const config = captureConfig() || state.lastConfig || {};
    const playerScore = getScore('player');
    const botScore = getScore('bot');
    const diff = playerScore - botScore;
    const diffAbs = Math.abs(diff);
    const result = diff > 0 ? 'win' : diff < 0 ? 'lose' : 'draw';
    const values = getPlayerShotValues();
    const shots = config.shots || Number(game?.maxShots || game?.shots || 40) || 40;
    const discipline = config.discipline || normalizeDiscipline(game?.discipline || 'lg40', game?.weapon);
    const difficulty = config.difficulty || game?.diff || 'easy';

    return {
      result,
      playerScore,
      botScore,
      diff,
      diffAbs,
      discipline,
      difficulty,
      shots,
      distance: DISTANCE_BY_DISCIPLINE[discipline] || config.distance || game?.dist || '10',
      targetRange: getTargetLabel(discipline, difficulty),
      bestSeries: bestSeries(values, playerScore, shots),
      average: formatAverage(playerScore, shots)
    };
  }

  function signature(payload) {
    return [payload.result, payload.playerScore, payload.botScore, payload.discipline, payload.difficulty, payload.shots].join('|');
  }

  function showResult(payload) {
    ensureStyles();
    const sig = signature(payload);
    if (sig === state.lastSignature && document.querySelector('.duel-result-overlay')) return;
    state.lastSignature = sig;

    document.querySelectorAll('.duel-result-overlay').forEach((node) => node.remove());

    const title = payload.result === 'win' ? '🏆 SIEG!' : payload.result === 'lose' ? '😔 NIEDERLAGE' : '🤝 UNENTSCHIEDEN';
    const disciplineLabel = DISCIPLINE_LABELS[payload.discipline] || payload.discipline;
    const difficultyLabel = DIFFICULTY_LABELS[payload.difficulty] || payload.difficulty;
    const winnerPlayer = payload.result === 'win';
    const winnerBot = payload.result === 'lose';

    const overlay = document.createElement('div');
    overlay.className = 'duel-result-overlay';
    overlay.innerHTML = `
      <div class="duel-result-card ${payload.result}" role="dialog" aria-modal="true" aria-label="Duell Ergebnis">
        <div class="duel-result-top">
          <div>
            <div class="duel-result-kicker">DUELL ERGEBNIS</div>
            <div class="duel-result-title">${html(title)}</div>
            <div class="duel-result-subtitle">${html(disciplineLabel)} · ${html(difficultyLabel)} · ${html(payload.shots)} Schuss<br>${html(getResultText(payload.result, payload.diffAbs))}</div>
          </div>
          <button class="duel-result-close" type="button" onclick="DuelResultScreen.close()">×</button>
        </div>

        <div class="duel-score-card">
          <div class="duel-score-row">
            <div class="duel-score-side ${winnerPlayer ? 'winner' : ''}">
              <div class="duel-score-label">DU</div>
              <div class="duel-score-value">${html(payload.playerScore)}</div>
            </div>
            <div class="duel-score-vs">VS</div>
            <div class="duel-score-side ${winnerBot ? 'winner' : ''}">
              <div class="duel-score-label">BOT</div>
              <div class="duel-score-value">${html(payload.botScore)}</div>
            </div>
          </div>
          <div class="duel-diff-line">Differenz: ${payload.diff > 0 ? '+' : ''}${html(payload.diff)}</div>
        </div>

        <div class="duel-result-grid">
          <div class="duel-result-stat"><div class="duel-result-stat-label">Beste Serie</div><div class="duel-result-stat-value">${html(payload.bestSeries)}</div></div>
          <div class="duel-result-stat"><div class="duel-result-stat-label">Durchschnitt</div><div class="duel-result-stat-value">${html(payload.average)}</div></div>
          <div class="duel-result-stat"><div class="duel-result-stat-label">Bot-Zielbereich</div><div class="duel-result-stat-value">${html(payload.targetRange)}</div></div>
          <div class="duel-result-stat"><div class="duel-result-stat-label">Entfernung</div><div class="duel-result-stat-value">${html(payload.distance)} m</div></div>
        </div>

        <div class="duel-result-reward">${getRewardText(payload.result, payload.difficulty, payload.diffAbs)}</div>

        <div class="duel-result-actions">
          <button class="duel-result-btn" type="button" onclick="DuelResultScreen.rematch()">🔁 REVANCHE</button>
          <button class="duel-result-btn secondary" type="button" onclick="DuelResultScreen.newSettings()">⚙️ NEU</button>
          <button class="duel-result-btn secondary" type="button" onclick="DuelResultScreen.close()">🏠 DASHBOARD</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('duel-result-open');
  }

  function close() {
    document.querySelectorAll('.duel-result-overlay').forEach((node) => node.remove());
    document.body.classList.remove('duel-result-open');
  }

  function resetRunState() {
    state.stableFinishedTicks = 0;
    state.lastScorePair = '';
  }

  function rematch() {
    close();
    resetRunState();
    state.active = true;
    state.startedAt = Date.now();
    state.lastConfig = captureConfig() || state.lastConfig;
    if (typeof window.startBattle === 'function') {
      window.startBattle();
      startPolling();
    }
  }

  function newSettings() {
    close();
    if (typeof window.openDuelSetup === 'function') {
      window.openDuelSetup();
    }
  }

  function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(() => {
      if (!state.active) return;
      if (Date.now() - state.startedAt < 1500) return;
      if (!isFinished()) return;

      const payload = resultPayload();
      state.active = false;
      stopPolling();
      setTimeout(() => showResult(payload), 450);
    }, 500);
  }

  function stopPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  function patchStartBattle() {
    if (state.patched || typeof window.startBattle !== 'function') return Boolean(state.patched);

    const originalStartBattle = window.startBattle;
    window.startBattle = function patchedStartBattle(...args) {
      resetRunState();
      state.lastConfig = captureConfig();
      state.active = true;
      state.startedAt = Date.now();
      const result = originalStartBattle.apply(this, args);
      state.lastConfig = captureConfig() || state.lastConfig;
      startPolling();
      return result;
    };

    state.patched = true;
    return true;
  }

  function waitForStartBattle(attempt = 0) {
    if (patchStartBattle()) return;
    if (attempt > 120) {
      console.warn('⚠️ DuelResultScreen: startBattle() nicht gefunden');
      return;
    }
    setTimeout(() => waitForStartBattle(attempt + 1), 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureStyles();
      waitForStartBattle();
    });
  } else {
    ensureStyles();
    waitForStartBattle();
  }

  window.DuelResultScreen = {
    initialized: true,
    version: VERSION,
    show: showResult,
    close,
    rematch,
    newSettings,
    patchStartBattle,
    getState: () => ({ ...state })
  };
})();
