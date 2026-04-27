/**
 * Schuss Challenge – XP System
 *
 * Phase-2.5 extraction from app.js.
 * Pure, testable XP/rank logic with optional adapters for legacy globals.
 */
(function attachXPSystem(global) {
  'use strict';

  const XP_PER_WIN = Object.freeze({
    easy: 10,
    real: 20,
    hard: 40,
    elite: 75
  });

  const RANKS = Object.freeze([
    Object.freeze({ name: 'Anfänger', min: 0, max: 99, icon: '🎯' }),
    Object.freeze({ name: 'Schütze', min: 100, max: 299, icon: '🔫' }),
    Object.freeze({ name: 'Fortgeschr.', min: 300, max: 599, icon: '⭐' }),
    Object.freeze({ name: 'Meister', min: 600, max: 999, icon: '🏅' }),
    Object.freeze({ name: 'Großmeister', min: 1000, max: 1999, icon: '🏆' }),
    Object.freeze({ name: 'Legende', min: 2000, max: Infinity, icon: '💫' })
  ]);

  function toXP(value) {
    const next = Math.floor(Number(value) || 0);
    return Math.max(0, next);
  }

  function normalizeDifficulty(diff) {
    return Object.prototype.hasOwnProperty.call(XP_PER_WIN, diff) ? diff : 'easy';
  }

  function getRank(xp) {
    const safeXP = toXP(xp);
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (safeXP >= RANKS[i].min) return { rank: RANKS[i], idx: i };
    }
    return { rank: RANKS[0], idx: 0 };
  }

  function getNextRankProgress(xp) {
    const safeXP = toXP(xp);
    const current = getRank(safeXP);
    const next = RANKS[current.idx + 1] || null;

    if (!next) {
      return {
        currentRank: current.rank,
        nextRank: null,
        progress: 1,
        percent: 100,
        xpIntoRank: safeXP - current.rank.min,
        xpNeededForNext: 0,
        xpRemaining: 0
      };
    }

    const span = Math.max(1, next.min - current.rank.min);
    const xpIntoRank = Math.max(0, safeXP - current.rank.min);
    const progress = Math.max(0, Math.min(1, xpIntoRank / span));

    return {
      currentRank: current.rank,
      nextRank: next,
      progress,
      percent: Math.round(progress * 100),
      xpIntoRank,
      xpNeededForNext: span,
      xpRemaining: Math.max(0, next.min - safeXP)
    };
  }

  function calculateWinXP(diff) {
    return XP_PER_WIN[normalizeDifficulty(diff)];
  }

  function calculateFlatXP(amount) {
    return toXP(amount);
  }

  function applyXP(currentXP, gainedXP) {
    const before = toXP(currentXP);
    const gained = calculateFlatXP(gainedXP);
    const after = before + gained;
    const oldRank = getRank(before);
    const newRank = getRank(after);

    return {
      before,
      gained,
      after,
      oldRank,
      newRank,
      didLevelUp: newRank.idx > oldRank.idx,
      progress: getNextRankProgress(after)
    };
  }

  function applyWinXP(currentXP, diff) {
    return applyXP(currentXP, calculateWinXP(diff));
  }

  function awardLegacyWinXP(diff, options = {}) {
    if (!global.G) throw new Error('Legacy state G is not available');

    const result = applyWinXP(global.G.xp, diff);
    global.G.xp = result.after;

    if (options.persist !== false && global.StorageManager) {
      global.StorageManager.set('xp', global.G.xp);
    }

    if (typeof options.onAward === 'function') options.onAward(result);
    if (result.didLevelUp && typeof options.onLevelUp === 'function') options.onLevelUp(result.newRank.rank, result);

    return result;
  }

  function awardLegacyFlatXP(amount, options = {}) {
    if (!global.G) throw new Error('Legacy state G is not available');

    const result = applyXP(global.G.xp, amount);
    global.G.xp = result.after;

    if (options.persist !== false && global.StorageManager) {
      global.StorageManager.set('xp', global.G.xp);
    }

    if (typeof options.onAward === 'function') options.onAward(result);
    if (result.didLevelUp && typeof options.onLevelUp === 'function') options.onLevelUp(result.newRank.rank, result);

    return result;
  }

  global.SchussXPSystem = Object.freeze({
    XP_PER_WIN,
    RANKS,
    toXP,
    normalizeDifficulty,
    getRank,
    getNextRankProgress,
    calculateWinXP,
    calculateFlatXP,
    applyXP,
    applyWinXP,
    awardLegacyWinXP,
    awardLegacyFlatXP
  });

  console.info('⭐ SchussXPSystem ready');
})(window);
