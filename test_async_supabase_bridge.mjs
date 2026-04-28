import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const source = await readFile(new URL('./src/features/async-challenge.js', import.meta.url), 'utf8');

function waitFor(predicate, timeoutMs = 1500) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      try {
        if (predicate()) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Timed out waiting for async bridge'));
        }
      } catch (error) {
        clearInterval(timer);
        reject(error);
      }
    }, 20);
  });
}

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => {
  console.error(error);
});

const dom = new JSDOM('<!doctype html><html><body><div class="dashboard"></div></body></html>', {
  url: 'https://kr511.github.io/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
});

const { window } = dom;
const calls = [];
window.console = { ...console, log() {}, warn() {} };
window.G = {
  username: 'Tester',
  discipline: 'lg40',
  weapon: 'lg',
  dist: '10',
  diff: 'real',
  shots: 40,
  maxShots: 40,
  playerShotsLeft: 40,
  botShotsLeft: 40,
  burst: false,
};
window.SupabaseSession = { user: { id: 'supabase-user-1' } };
window.SchussduellLocalMode = false;
window.SchussduellLocalPlay = false;
window.startBattle = () => calls.push(['startBattle']);
window.SupabaseSocial = {
  async loadCreatedChallenges() {
    calls.push(['loadCreatedChallenges']);
    return [{
      id: 'created-1',
      creator_id: 'supabase-user-1',
      opponent_id: 'friend-1',
      opponent_username: 'Beta',
      discipline: 'lg40',
      difficulty: 'real',
      shots: 40,
      burst: false,
      status: 'pending',
      created_at: '2026-04-28T13:00:00.000Z',
      expires_at: '2026-05-05T13:00:00.000Z',
    }];
  },
  async loadAvailableChallenges() {
    calls.push(['loadAvailableChallenges']);
    return [{
      id: 'incoming-1',
      creator_id: 'friend-2',
      creator_username: 'Alpha',
      opponent_id: 'supabase-user-1',
      discipline: 'kk50',
      difficulty: 'hard',
      shots: 60,
      burst: false,
      status: 'pending',
      created_at: '2026-04-28T13:05:00.000Z',
      expires_at: '2026-05-05T13:05:00.000Z',
    }];
  },
  async createChallenge(friendId, settings) {
    calls.push(['createChallenge', friendId, settings.discipline, settings.difficulty]);
    return {
      ok: true,
      challenge: {
        id: 'created-2',
        creator_id: 'supabase-user-1',
        opponent_id: friendId,
        discipline: settings.discipline,
        difficulty: settings.difficulty,
        shots: settings.shots,
        burst: settings.burst,
        status: 'pending',
        created_at: '2026-04-28T13:10:00.000Z',
        expires_at: '2026-05-05T13:10:00.000Z',
      },
    };
  },
  async acceptChallenge(id) {
    calls.push(['acceptChallenge', id]);
    return {
      ok: true,
      challenge: {
        id,
        creator_id: 'friend-2',
        creator_username: 'Alpha',
        opponent_id: 'supabase-user-1',
        discipline: 'kk50',
        difficulty: 'hard',
        shots: 60,
        burst: false,
        status: 'accepted',
        created_at: '2026-04-28T13:05:00.000Z',
        accepted_at: '2026-04-28T13:15:00.000Z',
        expires_at: '2026-05-05T13:05:00.000Z',
      },
    };
  },
};

window.eval(source);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

await waitFor(() => window.AsyncChallenge && calls.some(([name]) => name === 'loadAvailableChallenges'));

let state = window.AsyncChallenge.getState();
assert.equal(state.myChallenges[0].id, 'created-1');
assert.equal(state.availableChallenges[0].challengeId, 'incoming-1');

await window.AsyncChallenge.createChallenge('friend-1', 'Beta');
await window.AsyncChallenge.acceptChallenge('incoming-1');

state = window.AsyncChallenge.getState();
assert.equal(state.currentChallenge.challengeId, 'incoming-1');
assert.deepEqual(calls.find(([name]) => name === 'createChallenge'), ['createChallenge', 'friend-1', 'lg40', 'real']);
assert.deepEqual(calls.find(([name]) => name === 'acceptChallenge'), ['acceptChallenge', 'incoming-1']);
assert.ok(calls.some(([name]) => name === 'startBattle'));

console.log('async challenge Supabase bridge tests passed');
