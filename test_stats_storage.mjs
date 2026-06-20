import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const values = new Map();
const localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
const context = { window: {}, localStorage, StorageManager: {}, scheduleCloudSync() {}, console };
vm.runInNewContext(readFileSync('src/storage/stats-storage.js', 'utf8'), context);
const stats = context.window.StatsStorage;

const normalized = stats.normalizeHistoryEntry({
  timestamp: 1000,
  discipline: 'lg40',
  playerPts: 400,
  botPts: 390,
  result: 'loss',
  maxShots: 40,
  shots: [{ pts: 9.8 }, { pts: 10.4 }],
});
assert.equal(normalized.totalScore, 400);
assert.equal(normalized.averagePerShot, 10);
assert.equal(normalized.bestShot, 10.4);
assert.equal(normalized.result, 'lose');
assert.equal(normalized.shots, 40);

localStorage.setItem('sd_history', JSON.stringify([
  { timestamp: 2000, discipline: 'KK 3×20', playerPts: 560 },
  { timestamp: 1000, discipline: 'lg60', playerPts: 600 },
]));
const history = stats.readHistory();
assert.equal(history.length, 2);
assert.equal(history[0].discipline, 'kk3x20');
assert.equal(history[1].averagePerShot, 10);
assert.equal(stats.average([9.5, null, 10]), 9.75);

console.log('stats storage tests passed');
