// Unit tests for the redesigned Daily Challenge pool.
// Runs without a browser — extracts the CHALLENGES array and exercises the pure
// check/checkPhoto logic. Verifies the three product rules:
//   1. All challenges reward a fixed 5–25 XP (no chests).
//   2. Challenges are discipline-/result-based and measured from the player's own
//      result/photo (weapon, discipline, shot count, rings) — never from the bot
//      (no reference to win/lose result or bot difficulty).
//   3. The discipline-play challenges (KK 60, LG 40, KK 3×20, LG 60) exist.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, 'src/game/daily-challenge.js'), 'utf8');

const match = src.match(/const CHALLENGES = (\[[\s\S]*?\n  \]);/);
if (!match) {
  console.error('FAIL: could not extract CHALLENGES from daily-challenge.js');
  process.exit(1);
}
const CHALLENGES = eval('(' + match[1] + ')');
const byId = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));

let pass = 0;
let fail = 0;
function t(label, cond) {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
}

console.log('Daily Challenge pool:');

// Rule 1 — fixed 5–25 XP, no chest rewards
t('all xpReward within 5..25', CHALLENGES.every((c) => c.xpReward >= 5 && c.xpReward <= 25));
t('every challenge has an xpReward', CHALLENGES.every((c) => Number.isFinite(c.xpReward)));

// Rule 3 — discipline-play challenges exist
['play_lg40', 'play_lg60', 'play_kk60', 'play_kk3x20'].forEach((id) =>
  t('challenge exists: ' + id, !!byId[id]));

// Rule 2 — player-only, never bot result/difficulty
const allCheckSrc = CHALLENGES.map((c) => String(c.check) + String(c.checkPhoto)).join('\n');
t('no check references game.result (not from bot)', !/\.result\b/.test(allCheckSrc));
t('no check references game.difficulty (not from bot)', !/\.difficulty\b/.test(allCheckSrc));

// Representative player results (from photo/entry) — duel-game shape (shots are objects)
const lg40 = { weapon: 'lg', discipline: 'lg40', shotCount: 40, totalScore: 385, shots: [{ points: 10.4 }, { points: 9.8 }] };
const lg60 = { weapon: 'lg', discipline: 'lg60', shotCount: 60, totalScore: 585, shots: [{ points: 9.5 }] };
const kk60 = { weapon: 'kk', discipline: 'kk50', shotCount: 60, totalScore: 545, shots: [{ points: 10 }, { points: 8 }] };
const kk3x20 = { weapon: 'kk', discipline: 'kk3x20', shotCount: 60, totalScore: 560, shots: [{ points: 10 }] };

t('play_lg40 matches LG 40', byId.play_lg40.check(lg40) === true);
t('play_lg40 rejects LG 60', byId.play_lg40.check(lg60) === false);
t('play_lg60 matches LG 60', byId.play_lg60.check(lg60) === true);
t('play_kk60 matches KK 60', byId.play_kk60.check(kk60) === true);
t('play_kk60 rejects KK 3×20', byId.play_kk60.check(kk3x20) === false);
t('play_kk3x20 matches KK 3×20', byId.play_kk3x20.check(kk3x20) === true);
t('play_kk3x20 rejects KK 60', byId.play_kk3x20.check(kk60) === false);
t('score_lg_380 matches 385 rings', byId.score_lg_380.check(lg40) === true);
t('score_kk_520 matches 545 / 60 shots', byId.score_kk_520.check(kk60) === true);
t('hit_ten matches a 10', byId.hit_ten.check(kk60) === true);
t('play_two counts any duel', byId.play_two.check(lg40) === true);
t('photo_any not completable via duel (photo only)', byId.photo_any.check(lg40) === false);

// Photo/OCR result shape — shots are plain numbers
const photoLg40 = { weapon: 'lg', discipline: 'lg40', shotCount: 40, totalScore: 385, shots: [10.4, 9.8] };
const photoKk3x20 = { weapon: 'kk', discipline: 'kk3x20', shotCount: 60, totalScore: 560, shots: [10] };
t('play_lg40 photo matches', byId.play_lg40.checkPhoto(photoLg40) === true);
t('play_kk3x20 photo matches', byId.play_kk3x20.checkPhoto(photoKk3x20) === true);
t('photo_any matches a real scheibenfoto', byId.photo_any.checkPhoto(photoLg40) === true);
t('hit_ten photo matches numeric 10', byId.hit_ten.checkPhoto(photoKk3x20) === true);

// Difficulty tiers cover the daily selection patterns (easy/medium/hard)
const tiers = CHALLENGES.reduce((a, c) => { a[c.difficulty] = (a[c.difficulty] || 0) + 1; return a; }, {});
t('has easy + medium + hard tiers', tiers.easy > 0 && tiers.medium > 0 && tiers.hard > 0);

// Runtime contract for the three-task start-page preview and midnight reset.
function createDailyRuntime(fixedTime, previousState) {
  const storage = new Map([['sd_anonymous_id', 'anon_test']]);
  if (previousState) storage.set('sd_daily_challenge', JSON.stringify(previousState));

  const NativeDate = Date;
  class FixedDate extends NativeDate {
    constructor(...args) {
      super(...(args.length ? args : [fixedTime]));
    }
    static now() {
      return fixedTime;
    }
  }

  const events = [];
  const sandbox = {
    console,
    Date: FixedDate,
    Notification: { permission: 'default' },
    CustomEvent: class {
      constructor(type, options) {
        this.type = type;
        this.detail = options && options.detail;
      }
    },
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    document: {
      getElementById: () => null,
      querySelector: () => null
    },
    navigator: { onLine: true },
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    dispatchEvent: (event) => {
      events.push(event.type);
      return true;
    }
  };
  sandbox.window = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { api: sandbox.DailyChallenge, events, storage };
}

const previousIds = ['play_lg40', 'play_lg60', 'play_kk60'];
const previousState = {
  dateId: '2026-06-18',
  challenges: previousIds.map((id) => ({
    id,
    progress: 0,
    completed: false,
    reward: { type: 'xp', amount: 15 }
  })),
  streak: 0,
  toolboxDroppedForDate: ''
};
const fixedTime = new Date(2026, 5, 19, 12, 0, 0).getTime();
const runtime = createDailyRuntime(fixedTime, previousState);
const preview = runtime.api.getPreviewState();

t('start preview exposes exactly 3 tasks', preview.challenges.length === 3);
t('start preview tasks are unique', new Set(preview.challenges.map((c) => c.id)).size === 3);
t('start preview includes progress, text and XP', preview.challenges.every((c) =>
  typeof c.description === 'string'
  && Number.isFinite(c.progress)
  && Number.isFinite(c.target)
  && Number.isFinite(c.xpReward)
));
t('midnight reset replaces all 3 previous tasks', preview.challenges.every((c) => !previousIds.includes(c.id)));
t('reset countdown uses HH:MM format', /^\d{2}:\d{2}$/.test(preview.resetCountdown));
t('daily challenge update event is dispatched', runtime.events.includes('dailyChallengesUpdated'));

console.log('');
console.log('Summary: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
