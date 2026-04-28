/**
 * Schuss Challenge – Game State Utilities
 *
 * Phase-2 bridge module for safely extracting logic from app.js.
 * This file does not mutate the legacy global state unless explicitly asked.
 * It can be loaded before or after app.js and used gradually.
 */
(function attachGameStateUtils(global) {
  'use strict';

  const DEFAULT_GAME_STATE = Object.freeze({
    dist: '10',
    diff: 'easy',
    weapon: 'lg',
    username: '',
    lbScope: 'global',
    lbPeriod: 'alltime',
    discipline: 'lg40',
    shots: 40,
    burst: false,
    targetShots: [],
    botShots: [],
    botPlan: null,
    botTotal: 0,
    botTotalInt: 0,
    _botTotalTenths: 0,
    playerTotal: 0,
    playerTotalInt: 0,
    _playerTotalTenths: 0,
    playerShotsLeft: 40,
    botShotsLeft: 40,
    maxShots: 40,
    xp: 0,
    streak: 0,
    is3x20: false,
    positions: [],
    posIcons: [],
    posIdx: 0,
    posShots: 0,
    perPos: 20,
    posResults: [],
    _botInterval: null,
    _timerInterval: null,
    _timerSecsLeft: 0,
    _botStartTimeout: null,
    dnf: false,
    playerShots: [],
    currentDetectedShots: [],
    _gameStartTime: 0,
    _lastPlayerShotAt: 0,
    probeActive: false,
    probeSecsLeft: 0,
    botStarted: false,
    transitionSecsLeft: 0,
    transitionLabel: ''
  });

  const VALID_WEAPONS = new Set(['lg', 'kk']);
  const VALID_DIFFICULTIES = new Set(['easy', 'real', 'hard', 'elite']);
  const VALID_LEADERBOARD_PERIODS = new Set(['alltime', 'season']);

  function cloneArray(value) {
    return Array.isArray(value) ? value.map(item => {
      if (item && typeof item === 'object') return { ...item };
      return item;
    }) : [];
  }

  function toFiniteNumber(value, fallback = 0) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function toPositiveInteger(value, fallback = 0) {
    const next = Math.floor(toFiniteNumber(value, fallback));
    return next >= 0 ? next : fallback;
  }

  function normalizeWeapon(value) {
    return VALID_WEAPONS.has(value) ? value : DEFAULT_GAME_STATE.weapon;
  }

  function normalizeDifficulty(value) {
    return VALID_DIFFICULTIES.has(value) ? value : DEFAULT_GAME_STATE.diff;
  }

  function normalizeLeaderboardPeriod(value) {
    return VALID_LEADERBOARD_PERIODS.has(value) ? value : DEFAULT_GAME_STATE.lbPeriod;
  }

  function createInitialState(overrides = {}) {
    return sanitizeState({ ...DEFAULT_GAME_STATE, ...overrides });
  }

  function sanitizeState(rawState = {}) {
    const source = rawState && typeof rawState === 'object' ? rawState : {};

    return {
      ...DEFAULT_GAME_STATE,
      ...source,
      dist: String(source.dist ?? DEFAULT_GAME_STATE.dist),
      diff: normalizeDifficulty(source.diff),
      weapon: normalizeWeapon(source.weapon),
      username: String(source.username ?? ''),
      lbScope: String(source.lbScope ?? DEFAULT_GAME_STATE.lbScope),
      lbPeriod: normalizeLeaderboardPeriod(source.lbPeriod),
      discipline: String(source.discipline ?? DEFAULT_GAME_STATE.discipline),
      shots: toPositiveInteger(source.shots, DEFAULT_GAME_STATE.shots),
      burst: Boolean(source.burst),
      targetShots: cloneArray(source.targetShots),
      botShots: cloneArray(source.botShots),
      botPlan: source.botPlan && typeof source.botPlan === 'object' ? { ...source.botPlan } : null,
      botTotal: toFiniteNumber(source.botTotal),
      botTotalInt: toFiniteNumber(source.botTotalInt),
      _botTotalTenths: toFiniteNumber(source._botTotalTenths),
      playerTotal: toFiniteNumber(source.playerTotal),
      playerTotalInt: toFiniteNumber(source.playerTotalInt),
      _playerTotalTenths: toFiniteNumber(source._playerTotalTenths),
      playerShotsLeft: toPositiveInteger(source.playerShotsLeft, DEFAULT_GAME_STATE.playerShotsLeft),
      botShotsLeft: toPositiveInteger(source.botShotsLeft, DEFAULT_GAME_STATE.botShotsLeft),
      maxShots: toPositiveInteger(source.maxShots, DEFAULT_GAME_STATE.maxShots),
      xp: toPositiveInteger(source.xp),
      streak: toPositiveInteger(source.streak),
      is3x20: Boolean(source.is3x20),
      positions: cloneArray(source.positions),
      posIcons: cloneArray(source.posIcons),
      posIdx: toPositiveInteger(source.posIdx),
      posShots: toPositiveInteger(source.posShots),
      perPos: toPositiveInteger(source.perPos, DEFAULT_GAME_STATE.perPos),
      posResults: cloneArray(source.posResults),
      _timerSecsLeft: toPositiveInteger(source._timerSecsLeft),
      dnf: Boolean(source.dnf),
      playerShots: cloneArray(source.playerShots),
      currentDetectedShots: cloneArray(source.currentDetectedShots),
      _gameStartTime: toPositiveInteger(source._gameStartTime),
      _lastPlayerShotAt: toPositiveInteger(source._lastPlayerShotAt),
      probeActive: Boolean(source.probeActive),
      probeSecsLeft: toPositiveInteger(source.probeSecsLeft),
      botStarted: Boolean(source.botStarted),
      transitionSecsLeft: toPositiveInteger(source.transitionSecsLeft),
      transitionLabel: String(source.transitionLabel ?? '')
    };
  }

  function snapshotFromLegacy() {
    return sanitizeState(global.G || {});
  }

  function getScoreSummary(stateLike = global.G) {
    const state = sanitizeState(stateLike || {});
    const playerTotal = state._playerTotalTenths > 0 ? state._playerTotalTenths / 10 : state.playerTotal;
    const botTotal = state._botTotalTenths > 0 ? state._botTotalTenths / 10 : state.botTotal;

    return {
      playerTotal,
      botTotal,
      difference: Number((playerTotal - botTotal).toFixed(1)),
      playerShotsFired: Math.max(0, state.maxShots - state.playerShotsLeft),
      botShotsFired: Math.max(0, state.maxShots - state.botShotsLeft),
      playerShotsLeft: state.playerShotsLeft,
      botShotsLeft: state.botShotsLeft,
      maxShots: state.maxShots,
      isComplete: state.playerShotsLeft <= 0 && state.botShotsLeft <= 0
    };
  }

  function getSessionSummary(stateLike = global.G) {
    const state = sanitizeState(stateLike || {});
    const score = getScoreSummary(state);

    return {
      username: state.username,
      weapon: state.weapon,
      discipline: state.discipline,
      difficulty: state.diff,
      distance: state.dist,
      score,
      xp: state.xp,
      streak: state.streak,
      dnf: state.dnf,
      probeActive: state.probeActive,
      botStarted: state.botStarted
    };
  }

  function getRoundResetPatch(stateLike = global.G) {
    const state = sanitizeState(stateLike || {});
    const maxShots = state.shots || state.maxShots || DEFAULT_GAME_STATE.maxShots;

    return {
      targetShots: [],
      botShots: [],
      botPlan: null,
      botTotal: 0,
      botTotalInt: 0,
      _botTotalTenths: 0,
      playerTotal: 0,
      playerTotalInt: 0,
      _playerTotalTenths: 0,
      playerShotsLeft: maxShots,
      botShotsLeft: maxShots,
      maxShots,
      dnf: false,
      playerShots: [],
      currentDetectedShots: [],
      _gameStartTime: Date.now(),
      _lastPlayerShotAt: 0,
      probeActive: false,
      probeSecsLeft: 0,
      botStarted: false,
      transitionSecsLeft: 0,
      transitionLabel: '',
      posIdx: 0,
      posShots: 0,
      posResults: []
    };
  }

  function applyPatch(target, patch) {
    if (!target || typeof target !== 'object') {
      throw new Error('applyPatch target must be an object');
    }
    if (!patch || typeof patch !== 'object') return target;
    Object.assign(target, patch);
    return target;
  }

  function validateState(stateLike = global.G) {
    const state = sanitizeState(stateLike || {});
    const warnings = [];

    if (!VALID_WEAPONS.has(state.weapon)) warnings.push(`Invalid weapon: ${state.weapon}`);
    if (!VALID_DIFFICULTIES.has(state.diff)) warnings.push(`Invalid difficulty: ${state.diff}`);
    if (state.playerShotsLeft > state.maxShots) warnings.push('playerShotsLeft is greater than maxShots');
    if (state.botShotsLeft > state.maxShots) warnings.push('botShotsLeft is greater than maxShots');
    if (state.is3x20 && state.positions.length === 0) warnings.push('3x20 mode has no positions configured');
    if (state._timerInterval && state._timerSecsLeft <= 0) warnings.push('timer interval exists but timer seconds are zero');

    return {
      ok: warnings.length === 0,
      warnings,
      state
    };
  }

  global.SchussGameState = Object.freeze({
    DEFAULT_GAME_STATE,
    VALID_WEAPONS,
    VALID_DIFFICULTIES,
    VALID_LEADERBOARD_PERIODS,
    createInitialState,
    sanitizeState,
    snapshotFromLegacy,
    getScoreSummary,
    getSessionSummary,
    getRoundResetPatch,
    applyPatch,
    validateState
  });

  if (typeof console !== 'undefined') {
    console.info('🎯 SchussGameState utilities ready');
  }
})(window);
