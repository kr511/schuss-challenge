/**
 * Duel Distance Guard
 *
 * Hard rule layer for discipline distances:
 * - LG 40 / LG 60 always 10 m
 * - KK 50m always 50 m
 * - KK 100m always 100 m
 * - KK 3×20 always 50 m
 */
(function () {
  'use strict';

  const VERSION = '4.7';
  if (window.DuelDistanceGuard?.version === VERSION) return;

  const RULES = {
    lg40: { weapon: 'lg', dist: '10', shots: 40, maxShots: 40, is3x20: false },
    lg60: { weapon: 'lg', dist: '10', shots: 60, maxShots: 60, is3x20: false },
    kk50: { weapon: 'kk', dist: '50', shots: 60, maxShots: 60, is3x20: false },
    kk100: { weapon: 'kk', dist: '100', shots: 60, maxShots: 60, is3x20: false },
    kk3x20: { weapon: 'kk', dist: '50', shots: 60, maxShots: 60, is3x20: true }
  };

  const DEFAULT_BY_WEAPON = {
    lg: 'lg40',
    kk: 'kk50'
  };

  const state = {
    patchedStartBattle: false,
    patchedRuntime: false,
    attempts: 0,
    lastApplied: null
  };

  function getGame() {
    try {
      // eslint-disable-next-line no-undef
      return typeof G !== 'undefined' ? G : null;
    } catch (e) {
      return null;
    }
  }

  function pickDiscipline(game) {
    if (!game) return 'lg40';
    if (RULES[game.discipline]) return game.discipline;
    return DEFAULT_BY_WEAPON[game.weapon] || 'lg40';
  }

  function applyRuleToGame() {
    const game = getGame();
    if (!game) return null;

    const discipline = pickDiscipline(game);
    const rule = RULES[discipline] || RULES.lg40;

    game.discipline = discipline;
    game.weapon = rule.weapon;
    game.dist = rule.dist;
    game.shots = rule.shots;
    game.maxShots = rule.maxShots;
    game.is3x20 = rule.is3x20;

    if (!Number.isFinite(Number(game.playerShotsLeft)) || game.playerShotsLeft > rule.maxShots) {
      game.playerShotsLeft = rule.maxShots;
    }
    if (!Number.isFinite(Number(game.botShotsLeft)) || game.botShotsLeft > rule.maxShots) {
      game.botShotsLeft = rule.maxShots;
    }

    state.lastApplied = {
      discipline,
      weapon: rule.weapon,
      dist: rule.dist,
      shots: rule.shots,
      at: Date.now()
    };

    return state.lastApplied;
  }

  function patchRuntime() {
    const api = window.DuelSetupRuntime;
    if (!api || api.__distanceGuardVersion === VERSION) return Boolean(api);

    ['setWeapon', 'setDiscipline', 'setDifficulty', 'renderSettings', 'startDuel'].forEach((name) => {
      const original = api[name];
      if (typeof original !== 'function' || original.__distanceGuardPatched) return;

      const patched = function patchedDistanceGuard(...args) {
        const result = original.apply(this, args);
        applyRuleToGame();
        return result;
      };

      patched.__distanceGuardPatched = true;
      api[name] = patched;
    });

    if (typeof api.startDuel === 'function') {
      window.duelRuntimeFixStart = api.startDuel;
    }

    api.__distanceGuardVersion = VERSION;
    state.patchedRuntime = true;
    applyRuleToGame();
    return true;
  }

  function patchStartBattle() {
    if (state.patchedStartBattle || typeof window.startBattle !== 'function') return Boolean(state.patchedStartBattle);

    const originalStartBattle = window.startBattle;
    window.startBattle = function patchedStartBattleDistanceGuard(...args) {
      applyRuleToGame();
      const result = originalStartBattle.apply(this, args);
      applyRuleToGame();
      return result;
    };

    state.patchedStartBattle = true;
    return true;
  }

  function normalize() {
    patchRuntime();
    patchStartBattle();
    return applyRuleToGame();
  }

  function waitForHooks() {
    normalize();
    state.attempts += 1;

    if (state.patchedRuntime && state.patchedStartBattle) return;
    if (state.attempts > 120) {
      if (!state.patchedStartBattle) console.warn('⚠️ DuelDistanceGuard: startBattle() nicht gefunden');
      if (!state.patchedRuntime) console.warn('⚠️ DuelDistanceGuard: DuelSetupRuntime nicht gefunden');
      return;
    }

    setTimeout(waitForHooks, 50);
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('.duel-start-btn, .duel-pill, .duel-discipline')) {
      normalize();
      setTimeout(normalize, 50);
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForHooks);
  } else {
    waitForHooks();
  }

  window.DuelDistanceGuard = {
    initialized: true,
    version: VERSION,
    normalize,
    getRule: (discipline) => RULES[discipline] || null,
    getState: () => ({ ...state })
  };
})();
