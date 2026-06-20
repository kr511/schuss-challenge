/* Persönliches 24-Stunden-Ziel pro Waffe und Disziplin. */
const DailyGoal = (function () {
  'use strict';

  const KEY = 'sd_dailyGoal';
  const TTL_MS = 24 * 60 * 60 * 1000;
  const CONFIG = {
    lg40: { weapon: 'lg', name: 'LG 40', shots: 40, max: 436 },
    lg60: { weapon: 'lg', name: 'LG 60', shots: 60, max: 654 },
    kk50: { weapon: 'kk', name: 'KK 50m', shots: 60, max: 654 },
    kk100: { weapon: 'kk', name: 'KK 100m', shots: 60, max: 654 },
    kk3x20: { weapon: 'kk', name: 'KK 3×20', shots: 60, max: 600 },
  };

  function readRaw() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch (_e) { return null; }
  }

  function normalize(data, now) {
    if (!data || data.version !== 2) return null;
    const config = CONFIG[data.discipline];
    const targetRings = Math.round(Number(data.targetRings));
    const createdAt = Number(data.createdAt);
    const expiresAt = Number(data.expiresAt);
    if (!config || config.weapon !== data.weapon) return null;
    if (!Number.isFinite(targetRings) || targetRings < 1 || targetRings > config.max) return null;
    if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || expiresAt !== createdAt + TTL_MS) return null;
    if (now >= expiresAt) return null;
    return {
      version: 2,
      weapon: data.weapon,
      discipline: data.discipline,
      targetRings,
      createdAt,
      expiresAt,
      achieved: data.achieved === true,
      achievedAt: Number(data.achievedAt) || null,
    };
  }

  function get(now = Date.now()) {
    const data = readRaw();
    const goal = normalize(data, now);
    if (!goal && data) {
      try { localStorage.removeItem(KEY); } catch (_e) {}
    }
    return goal;
  }

  function create(input, now = Date.now()) {
    const config = CONFIG[input && input.discipline];
    const weapon = String((input && input.weapon) || '');
    const targetRings = Math.round(Number(input && input.targetRings));
    if (!config || config.weapon !== weapon) throw new Error('Ungültige Disziplin');
    if (!Number.isFinite(targetRings) || targetRings < 1 || targetRings > config.max) {
      throw new Error('Ungültiges Ringziel');
    }
    const activeGoal = get(now);
    const createdAt = activeGoal ? activeGoal.createdAt : now;
    const goal = {
      version: 2,
      weapon,
      discipline: input.discipline,
      targetRings,
      createdAt,
      expiresAt: createdAt + TTL_MS,
      achieved: activeGoal ? activeGoal.achieved : false,
      achievedAt: activeGoal ? activeGoal.achievedAt : null,
    };
    localStorage.setItem(KEY, JSON.stringify(goal));
    return goal;
  }

  function getProgress(goal, history, now = Date.now()) {
    if (!goal || now < goal.createdAt || now >= goal.expiresAt) return 0;
    const sessions = Array.isArray(history) ? history : [];
    return sessions.reduce((best, session) => {
      const normalized = window.StatsStorage && window.StatsStorage.normalizeHistoryEntry
        ? window.StatsStorage.normalizeHistoryEntry(session)
        : session;
      if (!normalized || normalized.discipline !== goal.discipline) return best;
      const timestamp = Number(normalized.timestamp);
      const score = Number(normalized.totalScore ?? normalized.playerPts ?? normalized.score);
      if (!Number.isFinite(timestamp) || timestamp < goal.createdAt || timestamp > goal.expiresAt) return best;
      return Number.isFinite(score) ? Math.max(best, Math.floor(score)) : best;
    }, 0);
  }

  function markAchieved(goal, now = Date.now()) {
    const current = get(now);
    if (!current || current.createdAt !== goal.createdAt || current.achieved) return false;
    current.achieved = true;
    current.achievedAt = now;
    localStorage.setItem(KEY, JSON.stringify(current));
    return true;
  }

  function disciplinesFor(weapon) {
    return Object.entries(CONFIG)
      .filter(([, config]) => config.weapon === weapon)
      .map(([id, config]) => ({ id, ...config }));
  }

  return { KEY, TTL_MS, CONFIG, get, create, getProgress, markAchieved, disciplinesFor };
})();

if (typeof window !== 'undefined') window.DailyGoal = DailyGoal;
