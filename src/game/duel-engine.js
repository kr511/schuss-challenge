/**
 * Schuss Challenge – Duel Engine
 *
 * Phase-3: central game loop abstraction (player vs bot)
 */
(function attachDuelEngine(global) {
  'use strict';

  function createEngine(state = global.G) {
    if (!state) throw new Error('Game state missing');

    function startNewDuel() {
      if (!global.SchussGameState) throw new Error('GameState utils required');

      const patch = global.SchussGameState.getRoundResetPatch(state);
      global.SchussGameState.applyPatch(state, patch);

      state._gameStartTime = Date.now();

      return {
        ok: true,
        message: 'New duel started'
      };
    }

    function registerPlayerShot(score) {
      const value = Number(score) || 0;
      state.playerShots.push(value);
      state.playerTotal += value;
      state.playerShotsLeft = Math.max(0, state.playerShotsLeft - 1);
      state._lastPlayerShotAt = Date.now();

      return value;
    }

    function registerBotShot(score) {
      const value = Number(score) || 0;
      state.botShots.push(value);
      state.botTotal += value;
      state.botShotsLeft = Math.max(0, state.botShotsLeft - 1);
      return value;
    }

    function isFinished() {
      return state.playerShotsLeft <= 0 && state.botShotsLeft <= 0;
    }

    function getResult() {
      if (!isFinished()) return null;

      if (state.playerTotal > state.botTotal) return 'win';
      if (state.playerTotal < state.botTotal) return 'lose';
      return 'draw';
    }

    return {
      startNewDuel,
      registerPlayerShot,
      registerBotShot,
      isFinished,
      getResult
    };
  }

  global.SchussDuelEngine = Object.freeze({
    createEngine
  });

  console.info('⚔️ SchussDuelEngine ready');
})(window);
