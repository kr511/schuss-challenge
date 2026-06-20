import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const values = new Map();
const localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
const window = {
  StatsStorage: {
    normalizeHistoryEntry: entry => ({
      discipline: entry.discipline,
      timestamp: entry.timestamp,
      totalScore: entry.playerPts,
    }),
  },
};
vm.runInNewContext(readFileSync('src/features/daily-goal.js', 'utf8'), { window, localStorage, console });
const daily = window.DailyGoal;
const now = 1_750_000_000_000;

localStorage.setItem(daily.KEY, JSON.stringify({ value: 95, date: 'legacy' }));
assert.equal(daily.get(now), null);
assert.equal(localStorage.getItem(daily.KEY), null);

const goal = daily.create({ weapon: 'lg', discipline: 'lg40', targetRings: 390 }, now);
assert.equal(goal.expiresAt - goal.createdAt, 24 * 60 * 60 * 1000);
assert.equal(daily.getProgress(goal, [
  { discipline: 'lg40', playerPts: 388.9, timestamp: now + 1000 },
  { discipline: 'lg60', playerPts: 620, timestamp: now + 2000 },
  { discipline: 'lg40', playerPts: 400, timestamp: now - 1 },
], now + 3000), 388);
assert.equal(daily.markAchieved(goal, now + 3000), true);
assert.equal(daily.markAchieved(goal, now + 4000), false);
const editedGoal = daily.create({ weapon: 'lg', discipline: 'lg40', targetRings: 380 }, now + 5000);
assert.equal(editedGoal.createdAt, goal.createdAt);
assert.equal(editedGoal.achieved, true);
assert.equal(daily.get(goal.expiresAt), null);

assert.throws(() => daily.create({ weapon: 'lg', discipline: 'kk50', targetRings: 500 }, now));
assert.throws(() => daily.create({ weapon: 'lg', discipline: 'lg40', targetRings: 437 }, now));

console.log('daily goal tests passed');
