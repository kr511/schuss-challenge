/**
 * Duel Result Screen
 *
 * Strict flow:
 * 1) start duel
 * 2) show existing Ergebnis-eingeben screen
 * 3) wait for player confirmation via Vergleich / Foto / Gewonnen / Verloren
 * 4) then show this result overlay.
 */
(function () {
  'use strict';

  const VERSION = '5.1';
  if (window.DuelResultScreen?.version === VERSION) return;

  const XP_REWARD = { easy: 10, real: 20, hard: 40, elite: 75 };
  const DIFFICULTY_LABELS = { easy: 'Einfach', real: 'Mittel', hard: 'Elite', elite: 'Profi' };
  const DISCIPLINE_LABELS = { lg40: 'LG 40', lg60: 'LG 60', kk50: 'KK 50m', kk100: 'KK 100m', kk3x20: 'KK 3×20' };
  const DISTANCE_BY_DISCIPLINE = { lg40: '10', lg60: '10', kk50: '50', kk100: '100', kk3x20: '50' };

  const state = {
    active: false,
    pollTimer: null,
    patched: false,
    startedAt: 0,
    lastConfig: null,
    lastSignature: '',
    lastPlayerSignature: '',
    stablePlayerTicks: 0,
    playerSubmissionConfirmed: false,
    confirmationSource: ''
  };

  function getGame() {
    try {
      // eslint-disable-next-line no-undef
      return typeof G !== 'undefined' ? G : null;
    } catch (e) {
      return null;
    }
  }

  function number(value, fallback = 0) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function html(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function ensureStyles() {
    let style = document.getElementById('duelResultScreenStyles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'duelResultScreenStyles';
      document.head.appendChild(style);
    }
    style.textContent = `
      .duel-result-overlay{position:fixed;inset:0;z-index:2147483100;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:env(safe-area-inset-top,20px) 20px calc(20px + env(safe-area-inset-bottom));font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:#fff}
      .duel-result-overlay.win{background:radial-gradient(ellipse 90% 55% at 50% 0%,rgba(34,197,94,.18) 0%,transparent 60%),#0a0a0a}
      .duel-result-overlay.lose{background:radial-gradient(ellipse 70% 45% at 50% 0%,rgba(255,255,255,.04) 0%,transparent 60%),#0a0a0a}
      .duel-result-overlay.draw{background:radial-gradient(ellipse 70% 45% at 50% 0%,rgba(0,195,255,.08) 0%,transparent 60%),#0a0a0a}
      .drs-hero{text-align:center;padding:22px 0 16px}
      .drs-title{font-family:'Bebas Neue',sans-serif;letter-spacing:.09em;color:#fff;font-size:30px;line-height:1}
      .drs-title.lose{font-size:26px;letter-spacing:.08em}
      .drs-xp{font-size:18px;font-weight:700;margin-top:5px}
      .drs-xp.win{color:#4ade80;text-shadow:0 0 14px rgba(74,222,128,.5)}
      .drs-xp.lose,.drs-xp.draw{color:rgba(255,255,255,.4);font-size:15px;font-weight:600}
      .drs-card{width:100%;background:rgba(18,18,18,.95);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:16px;margin-bottom:12px}
      .drs-diff-pill{display:flex;justify-content:center;margin-bottom:14px}
      .drs-pill{border-radius:100px;padding:4px 14px;font-size:12px;font-weight:800;letter-spacing:.04em}
      .drs-pill.win{background:#22c55e;color:#000}
      .drs-pill.lose,.drs-pill.draw{background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);font-weight:700}
      .drs-scores{display:flex;align-items:center}
      .drs-col{flex:1;text-align:center}
      .drs-col-lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:6px}
      .drs-score{font-family:'Bebas Neue',sans-serif;letter-spacing:.02em;line-height:1}
      .drs-score.winner{font-size:50px;color:#4ade80;text-shadow:0 0 20px rgba(34,197,94,.4)}
      .drs-score.loser{font-size:36px;color:rgba(255,255,255,.45)}
      .drs-score.player-loser{font-size:40px;color:rgba(255,255,255,.45)}
      .drs-score.draw-val{font-size:44px;color:rgba(255,255,255,.8)}
      .drs-score.bot-winner{font-size:50px;color:rgba(255,255,255,.9);letter-spacing:.02em}
      .drs-col-sub{font-size:11px;color:rgba(255,255,255,.4);margin-top:2px}
      .drs-divider{width:1px;height:56px;background:rgba(255,255,255,.1);flex-shrink:0}
      .drs-dist-card{width:100%;background:rgba(18,18,18,.95);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:13px 15px;margin-bottom:12px}
      .drs-dist-lbl{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.3);font-weight:600;margin-bottom:10px}
      .drs-dist-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
      .drs-dist-key{font-size:11px;color:rgba(255,255,255,.4);width:30px;text-align:right;flex-shrink:0}
      .drs-dist-track{flex:1;height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden}
      .drs-dist-fill{height:100%;border-radius:3px}
      .drs-dist-fill.t10{background:#22c55e}
      .drs-dist-fill.t9{background:rgba(34,197,94,.6)}
      .drs-dist-fill.t8{background:rgba(34,197,94,.3)}
      .drs-dist-fill.tlow{background:rgba(255,149,0,.4)}
      .drs-dist-count{font-size:11px;width:18px;text-align:right;flex-shrink:0}
      .drs-dist-count.t10{color:#22c55e}
      .drs-dist-count.t9{color:rgba(255,255,255,.5)}
      .drs-dist-count.t8,.drs-dist-count.tlow{color:rgba(255,255,255,.35)}
      .drs-stats-row{display:flex;gap:10px;margin-bottom:12px}
      .drs-stat{flex:1;background:rgba(18,18,18,.95);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:11px 10px;text-align:center}
      .drs-stat-lbl{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.3);font-weight:600}
      .drs-stat-val{font-family:'DM Mono',monospace;font-size:15px;font-weight:500;color:#fff;margin-top:4px}
      .drs-xp-wrap{width:100%;margin-bottom:16px}
      .drs-xp-hdr{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
      .drs-rank-lbl{font-size:12px;font-weight:700;color:#22c55e}
      .drs-xp-lbl{font-family:'DM Mono',monospace;font-size:11px;color:rgba(255,255,255,.4)}
      .drs-xp-track{height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}
      .drs-xp-fill{height:100%;background:linear-gradient(90deg,#16a34a,#4ade80);border-radius:3px;box-shadow:0 0 8px rgba(34,197,94,.4)}
      .drs-actions{width:100%;display:flex;flex-direction:column;gap:10px}
      .drs-btn-primary{width:100%;padding:15px;background:#22c55e;color:#000;border:none;border-radius:14px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:800;letter-spacing:.06em;cursor:pointer;box-shadow:0 4px 20px rgba(34,197,94,.3)}
      .drs-btn-ghost{width:100%;padding:13px;background:transparent;color:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.12);border-radius:14px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;cursor:pointer}
      .drs-btn-ghost-row{display:flex;gap:10px}
      .drs-btn-ghost-row .drs-btn-ghost{flex:1}
      .drs-motivate{font-size:13px;color:rgba(34,197,94,.5);text-align:center;margin-bottom:14px}
    `;
  }

  function scoreFromGame(side) {
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

  function shotValue(shot) {
    if (typeof shot === 'number') return shot;
    if (!shot || typeof shot !== 'object') return NaN;
    return number(shot.score ?? shot.value ?? shot.points ?? shot.ring ?? shot.total ?? shot.pts ?? shot.wholePts, NaN);
  }

  function shotValues(side) {
    const game = getGame();
    const key = side === 'bot' ? 'botShots' : 'playerShots';
    if (!game || !Array.isArray(game[key])) return [];
    return game[key].map(shotValue).filter(Number.isFinite);
  }

  function normalizeDiscipline(discipline, weapon) {
    if (DISCIPLINE_LABELS[discipline]) return discipline;
    return weapon === 'kk' ? 'kk50' : 'lg40';
  }

  function captureConfig() {
    const game = getGame();
    if (!game) return state.lastConfig;
    const discipline = normalizeDiscipline(game.discipline || state.lastConfig?.discipline || 'lg40', game.weapon);
    const difficulty = game.diff || state.lastConfig?.difficulty || 'easy';
    const shots = Number(game.maxShots || game.shots || state.lastConfig?.shots || 40) || 40;
    return {
      discipline,
      difficulty,
      shots,
      distance: DISTANCE_BY_DISCIPLINE[discipline] || game.dist || state.lastConfig?.distance || '10',
      weapon: game.weapon || (discipline.startsWith('lg') ? 'lg' : 'kk')
    };
  }

  function targetLabel(discipline, difficulty) {
    const target = window.BattleBalance?.getBalanceTarget?.(discipline, difficulty) ||
      window.BattleBalance?.BALANCE_TARGETS?.[discipline]?.[difficulty];
    if (!target) return '—';
    if (target.floor !== undefined) return `≥${target.floor}`;
    if (target.min !== undefined && target.max !== undefined) return `${target.min}–${target.max}`;
    return '—';
  }

  function hasPlayerResult() {
    const game = getGame();
    const playerScore = scoreFromGame('player');
    const playerValues = shotValues('player');
    if (playerScore > 0) return true;
    if (playerValues.length > 0 && playerValues.some((value) => value > 0)) return true;
    if (game?.playerResultSubmitted === true || game?.playerScoreSubmitted === true || game?.ocrConfirmed === true || game?.manualScoreSubmitted === true) return true;
    return false;
  }

  function markSubmissionConfirmed(source = 'unknown') {
    state.playerSubmissionConfirmed = true;
    state.confirmationSource = source;
    const game = getGame();
    if (game) {
      game.playerResultSubmitted = true;
      if (source === 'manual' || source === 'compare') game.manualScoreSubmitted = true;
      if (source === 'photo') game.ocrConfirmed = true;
    }
    state.active = true;
    if (!state.startedAt) state.startedAt = Date.now();
    setTimeout(tryShowConfirmedResult, 180);
    setTimeout(tryShowConfirmedResult, 650);
    setTimeout(tryShowConfirmedResult, 1300);
  }

  function isConfirmedByGameFlags() {
    const game = getGame();
    return Boolean(
      state.playerSubmissionConfirmed ||
      game?.playerResultSubmitted === true ||
      game?.playerScoreSubmitted === true ||
      game?.ocrConfirmed === true ||
      game?.manualScoreSubmitted === true
    );
  }

  function isPlayerResultStable() {
    const signature = `${scoreFromGame('player')}:${shotValues('player').join(',')}`;
    if (!hasPlayerResult()) {
      state.lastPlayerSignature = '';
      state.stablePlayerTicks = 0;
      return false;
    }
    if (signature === state.lastPlayerSignature) {
      state.stablePlayerTicks += 1;
    } else {
      state.lastPlayerSignature = signature;
      state.stablePlayerTicks = 0;
    }
    return state.stablePlayerTicks >= 2;
  }

  function isFinished() {
    const game = getGame();
    if (!game) return false;
    if (!isConfirmedByGameFlags()) return false;
    if (!hasPlayerResult()) return false;

    const config = captureConfig() || {};
    const expectedShots = Number(config.shots || game.maxShots || game.shots || 0);
    const playerLeft = Number(game.playerShotsLeft);
    const playerValues = shotValues('player');

    if (game.playerResultSubmitted === true || game.playerScoreSubmitted === true || game.ocrConfirmed === true || game.manualScoreSubmitted === true) return true;
    if (game.battleFinished === true || game.duelFinished === true || game.gameOver === true || game.isFinished === true || game.dnf === true) return true;
    if (Number.isFinite(playerLeft) && playerLeft <= 0) return true;
    if (expectedShots > 0 && playerValues.length >= expectedShots) return true;
    return isPlayerResultStable();
  }

  function bestSeries(values, score, shots) {
    if (!values.length) return Math.round(score / Math.max(1, shots) * Math.min(10, Math.max(1, shots)));
    let best = 0;
    for (let i = 0; i < values.length; i += 10) {
      best = Math.max(best, values.slice(i, i + 10).reduce((sum, value) => sum + value, 0));
    }
    return Math.round(best || 0);
  }

  function resultPayload() {
    const config = captureConfig() || {};
    const playerScore = scoreFromGame('player');
    const botScore = scoreFromGame('bot');
    const diff = playerScore - botScore;
    const discipline = config.discipline || 'lg40';
    const difficulty = config.difficulty || 'easy';
    const shots = Number(config.shots || 40) || 40;
    const playerValues = shotValues('player');
    return {
      result: diff > 0 ? 'win' : diff < 0 ? 'lose' : 'draw',
      playerScore,
      botScore,
      diff,
      diffAbs: Math.abs(diff),
      discipline,
      difficulty,
      shots,
      distance: DISTANCE_BY_DISCIPLINE[discipline] || config.distance || '10',
      targetRange: targetLabel(discipline, difficulty),
      bestSeries: bestSeries(playerValues, playerScore, shots),
      average: (playerScore / Math.max(1, shots)).toFixed(2)
    };
  }

  function buildDist(values, shots, result) {
    if (!values.length) return '';
    const total = shots || values.length || 1;
    const isLose = result === 'lose';
    const bucket = (lo, hi) => values.filter(v => {
      const w = typeof v === 'number' ? Math.floor(v) : 0;
      return w >= lo && w <= hi;
    }).length;
    // Handoff loss screen uses muted grey fills; win uses green
    const fillStyle = isLose
      ? { t10: 'rgba(255,255,255,0.30)', t9: 'rgba(255,255,255,0.25)', t8: 'rgba(255,255,255,0.18)', tlow: 'rgba(255,255,255,0.12)' }
      : { t10: '', t9: '', t8: '', tlow: '' };
    const countColor = isLose
      ? { t10: 'rgba(255,255,255,0.4)', t9: 'rgba(255,255,255,0.4)', t8: 'rgba(255,255,255,0.3)', tlow: 'rgba(255,255,255,0.25)' }
      : null;
    const rows = [
      { key: '10er', cnt: bucket(10, 10), cls: 't10' },
      { key: '9er',  cnt: bucket(9, 9),   cls: 't9' },
      { key: '8er',  cnt: bucket(8, 8),   cls: 't8' },
      { key: '<8',   cnt: bucket(0, 7),   cls: 'tlow' },
    ];
    return rows.filter(r => r.cnt > 0).map(r => {
      const pct = Math.round((r.cnt / total) * 100);
      const fillInline = fillStyle[r.cls] ? `style="width:${pct}%;background:${fillStyle[r.cls]}"` : `style="width:${pct}%"`;
      const countInline = countColor ? `style="color:${countColor[r.cls]}"` : '';
      return `<div class="drs-dist-row"><div class="drs-dist-key">${html(r.key)}</div><div class="drs-dist-track"><div class="drs-dist-fill ${r.cls}" ${fillInline}></div></div><div class="drs-dist-count ${r.cls}" ${countInline}>${r.cnt}</div></div>`;
    }).join('');
  }

  function xpMeta() {
    const game = getGame();
    const xp = number(game?.xp, 0);
    const rankList = window.RANKS || [
      { name: 'Anfänger', min: 0, max: 99 },
      { name: 'Schütze', min: 100, max: 299 },
      { name: 'Fortgeschr.', min: 300, max: 599 },
      { name: 'Meister', min: 600, max: 999 },
      { name: 'Großmeister', min: 1000, max: 1999 },
      { name: 'Legende', min: 2000, max: Infinity }
    ];
    const idx = rankList.findIndex(r => xp >= r.min && xp <= r.max);
    const rank = rankList[idx >= 0 ? idx : 0];
    const nextRank = rankList[idx + 1] || null;
    const pct = nextRank
      ? Math.min(100, Math.round(((xp - rank.min) / (nextRank.min - rank.min)) * 100))
      : 100;
    const xpLabel = nextRank ? `${xp} / ${nextRank.min} XP` : `${xp} XP`;
    return { rankName: rank.name, xpLabel, pct };
  }

  function resultText(result, diffAbs) {
    if (result === 'win') return `Stark geschossen — du hast den Bot um ${diffAbs} Punkte geschlagen.`;
    if (result === 'lose') return `Knapp daneben — dir fehlen ${diffAbs} Punkte zur Revanche.`;
    return 'Exakt gleich stark. Revanche?';
  }

  function rewardText(result, difficulty, diffAbs) {
    if (result === 'win') return `<strong>+${XP_REWARD[difficulty] || 10} XP</strong> · Sieg-Bonus erhalten.`;
    if (result === 'draw') return '<strong>+10 XP</strong> · Starkes Duell, keine Niederlage.';
    if (diffAbs <= 5) return '<strong>+5 XP</strong> · Knapp verloren, Revanche lohnt sich.';
    return '<strong>+5 XP</strong> · Erfahrung gesammelt. Nächste Runde wird besser.';
  }

  function showResult(payload) {
    if (!payload || payload.playerScore <= 0 || !isConfirmedByGameFlags()) return false;
    ensureStyles();
    const signature = [payload.result, payload.playerScore, payload.botScore, payload.discipline, payload.difficulty, payload.shots].join('|');
    if (signature === state.lastSignature && document.querySelector('.duel-result-overlay')) return true;
    state.lastSignature = signature;

    document.querySelectorAll('.duel-result-overlay').forEach((node) => node.remove());

    const isWin = payload.result === 'win';
    const isDraw = payload.result === 'draw';
    const isLose = payload.result === 'lose';
    const disciplineLabel = DISCIPLINE_LABELS[payload.discipline] || payload.discipline;
    const difficultyLabel = DIFFICULTY_LABELS[payload.difficulty] || payload.difficulty;
    const xpGained = isWin ? (XP_REWARD[payload.difficulty] || 10) : isDraw ? 10 : 5;
    const playerValues = shotValues('player');

    const title = isWin ? '🏆 GEWONNEN' : isDraw ? '🤝 UNENTSCHIEDEN' : 'KNAPP VERLOREN';
    const xpLine = isWin
      ? `+${xpGained} XP ✨`
      : isDraw
      ? `+10 XP · Starkes Duell`
      : `+${xpGained} XP Trost-Punkte`;

    const diffAbs = Math.abs(payload.diff);
    const diffSign = payload.diff > 0 ? '+' : '';
    const diffLabel = `${diffSign}${typeof payload.diff === 'number' ? payload.diff.toFixed(1).replace('.', ',') : payload.diff} Ringe`;

    const playerScoreCls = isWin ? 'winner' : isDraw ? 'draw-val' : 'player-loser';
    const botScoreCls = isLose ? 'bot-winner' : isDraw ? 'draw-val' : 'loser';

    const distRows = buildDist(playerValues, payload.shots, payload.result);
    const xp = xpMeta();

    const xpFillStyle = (isWin || isDraw)
      ? 'background:linear-gradient(90deg,#16a34a,#4ade80);box-shadow:0 0 8px rgba(34,197,94,.4)'
      : 'background:linear-gradient(90deg,rgba(80,80,80,.6),rgba(140,140,140,.5))';
    const rankStyle = (isWin || isDraw) ? 'color:#22c55e' : 'color:rgba(255,255,255,.45)';
    const xpLblStyle = (isWin || isDraw) ? '' : 'color:rgba(255,255,255,.35)';

    const motivateLine = isLose
      ? `<div class="drs-motivate">Noch ${typeof diffAbs === 'number' ? diffAbs.toFixed(1).replace('.', ',') : diffAbs} Ringe gefehlt 🎯</div>`
      : '';

    const primaryLabel = isLose ? 'REVANCHE' : 'NOCHMAL';

    const overlay = document.createElement('div');
    overlay.className = `duel-result-overlay ${payload.result}`;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Duell Ergebnis');
    overlay.innerHTML = `
      <div class="drs-hero">
        <div class="drs-title">${html(title)}</div>
        <div class="drs-xp ${payload.result}">${html(xpLine)}</div>
      </div>
      <div class="drs-card">
        <div class="drs-diff-pill"><div class="drs-pill ${payload.result}">${html(diffLabel)}</div></div>
        <div class="drs-scores">
          <div class="drs-col">
            <div class="drs-col-lbl">Du</div>
            <div class="drs-score ${playerScoreCls}">${html(payload.playerScore)}</div>
            <div class="drs-col-sub">Ringe</div>
          </div>
          <div class="drs-divider"></div>
          <div class="drs-col">
            <div class="drs-col-lbl">Bot</div>
            <div class="drs-score ${botScoreCls}">${html(payload.botScore)}</div>
            <div class="drs-col-sub">Ringe</div>
          </div>
        </div>
      </div>
      ${distRows ? `<div class="drs-dist-card"><div class="drs-dist-lbl">Verteilung</div>${distRows}</div>` : ''}
      <div class="drs-stats-row">
        <div class="drs-stat"><div class="drs-stat-lbl">Disziplin</div><div class="drs-stat-val">${html(disciplineLabel)}</div></div>
        <div class="drs-stat"><div class="drs-stat-lbl">Modus</div><div class="drs-stat-val">${html(difficultyLabel)}</div></div>
        <div class="drs-stat"><div class="drs-stat-lbl">${html(payload.shots)} Schuss · ${html(payload.distance)} m</div><div class="drs-stat-val">Beste Serie: ${html(payload.bestSeries)}</div></div>
      </div>
      <div class="drs-xp-wrap">
        <div class="drs-xp-hdr">
          <div class="drs-rank-lbl" style="${rankStyle}">Rang: ${html(xp.rankName)}</div>
          <div class="drs-xp-lbl" style="${xpLblStyle}">${html(xp.xpLabel)}</div>
        </div>
        <div class="drs-xp-track"><div class="drs-xp-fill" style="width:${xp.pct}%;${xpFillStyle}"></div></div>
      </div>
      ${motivateLine}
      <div class="drs-actions">
        <button class="drs-btn-primary" type="button" onclick="DuelResultScreen.rematch()">${html(primaryLabel)}</button>
        <button class="drs-btn-ghost" type="button" onclick="DuelResultScreen.close()">Profil</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('duel-result-open');
    return true;
  }

  function close() {
    document.querySelectorAll('.duel-result-overlay').forEach((node) => node.remove());
    document.body.classList.remove('duel-result-open');
  }

  function resetRunState() {
    state.stablePlayerTicks = 0;
    state.lastPlayerSignature = '';
    state.playerSubmissionConfirmed = false;
    state.confirmationSource = '';
  }

  function tryShowConfirmedResult() {
    if (!state.active) return false;
    if (!isFinished()) return false;
    const payload = resultPayload();
    const didShow = showResult(payload);
    if (didShow) {
      state.active = false;
      stopPolling();
    }
    return didShow;
  }

  function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(() => {
      if (!state.active) return;
      if (Date.now() - state.startedAt < 1000) return;
      tryShowConfirmedResult();
    }, 500);
  }

  function stopPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
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
    if (typeof window.openDuelSetup === 'function') window.openDuelSetup();
  }

  function patchStartBattle() {
    if (state.patched || typeof window.startBattle !== 'function') return Boolean(state.patched);
    const originalStartBattle = window.startBattle;
    window.startBattle = function patchedStartBattle(...args) {
      close();
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

  function isConfirmationText(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim().toUpperCase();
    return (
      t.includes('VERGLEICH') ||
      t.includes('GEWONNEN') ||
      t.includes('VERLOREN') ||
      t.includes('FOTO VERGLEICHEN') ||
      t.includes('WETTKAMPF-FOTO')
    );
  }

  function sourceFromText(text) {
    const t = String(text || '').toUpperCase();
    if (t.includes('FOTO')) return 'photo';
    if (t.includes('VERGLEICH')) return 'compare';
    if (t.includes('GEWONNEN')) return 'direct-win';
    if (t.includes('VERLOREN')) return 'direct-lose';
    return 'manual';
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, [role="button"], label, input[type="button"], input[type="submit"]');
    if (!target) return;
    const text = target.value || target.textContent || target.getAttribute('aria-label') || '';
    if (!isConfirmationText(text)) return;
    markSubmissionConfirmed(sourceFromText(text));
  }, true);

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
    hasPlayerResult,
    confirmSubmission: markSubmissionConfirmed,
    getState: () => ({ ...state })
  };
})();
