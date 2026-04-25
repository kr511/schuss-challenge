export const XP_PER_WIN = Object.freeze({ easy: 10, real: 20, hard: 40, elite: 75 });

export const RANKS = Object.freeze([
  { name: 'Anfänger', min: 0, max: 99, icon: '🎯' },
  { name: 'Schütze', min: 100, max: 299, icon: '🔫' },
  { name: 'Fortgeschr.', min: 300, max: 599, icon: '⭐' },
  { name: 'Meister', min: 600, max: 999, icon: '🏅' },
  { name: 'Großmeister', min: 1000, max: 1999, icon: '🏆' },
  { name: 'Legende', min: 2000, max: Infinity, icon: '💫' }
]);

export function getRankInfo(xp) {
  const safeXp = Number(xp) || 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (safeXp >= RANKS[i].min) return { rank: RANKS[i], idx: i };
  }
  return { rank: RANKS[0], idx: 0 };
}

export function getXpForDifficulty(diff) {
  return XP_PER_WIN[diff] || XP_PER_WIN.easy;
}

export function calcXpProgress(xp) {
  const safeXp = Number(xp) || 0;
  const { rank, idx } = getRankInfo(safeXp);
  const nextRank = RANKS[idx + 1] || null;
  const xpInRank = safeXp - rank.min;
  const xpNeeded = nextRank ? (nextRank.min - rank.min) : 1;
  const pct = nextRank ? Math.min(100, (xpInRank / xpNeeded) * 100) : 100;
  return { rank, idx, nextRank, xpInRank, xpNeeded, pct };
}

export const XpSystem = { XP_PER_WIN, RANKS, getRankInfo, getXpForDifficulty, calcXpProgress };
