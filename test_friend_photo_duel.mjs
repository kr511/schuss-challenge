import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const friendsSource = await readFile(new URL('./friends.js', import.meta.url), 'utf8');
const photoDuelSource = await readFile(new URL('./friend-photo-duel.js', import.meta.url), 'utf8');

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
          reject(new Error('Timed out waiting for friend photo duel'));
        }
      } catch (error) {
        clearInterval(timer);
        reject(error);
      }
    }, 20);
  });
}

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => { console.error(error); });

const dom = new JSDOM(`<!doctype html><html><head></head><body>
  <div id="friendCodeDisplay"></div>
  <div id="friendsListContainer"></div>
  <div id="receivedRequestsContainer"></div>
  <div id="sentRequestsContainer"></div>
  <button id="friendsButton"></button>
</body></html>`, {
  url: 'https://kr511.github.io/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
});

const { window } = dom;
const store = new Map();
const calls = [];
const xpCalls = [];
let captureQueue = [];
let photoIncoming = [];
let photoCreated = [];
let latestResults = [];

window.console = { ...console, log() {}, warn() {} };
window.G = {
  username: 'Tester',
  discipline: 'lg40',
  weapon: 'lg',
  dist: '10',
  diff: 'real',
  shots: 40,
  burst: false,
  xp: 0,
};
window.SupabaseSession = { user: { id: 'supabase-user-1' } };
window.SchussduellLocalMode = false;
window.SchussduellLocalPlay = false;
window.StorageManager = {
  get(key, fallback = null) {
    if (!store.has(key)) return fallback;
    return JSON.parse(store.get(key));
  },
  set(key, value) {
    store.set(key, JSON.stringify(value));
    return true;
  },
  getRaw(key, fallback = null) { return store.has(key) ? store.get(key) : fallback; },
  setRaw(key, value) { store.set(key, String(value)); return true; },
};
window.ImageCompare = {
  async captureScore(options) {
    calls.push(['captureScore', options.discipline, options.isKK, options.zIndex, options.submitLabel]);
    const next = captureQueue.shift();
    if (!next) return null;
    return next;
  },
};
window.awardFlatXP = (amount) => {
  xpCalls.push(amount);
  return amount;
};

const remoteState = {
  friendCode: 'SUP123',
  friends: [{ userId: 'friend-1', username: 'Beta', addedAt: '2026-05-05T10:00:00.000Z' }],
  incomingRequests: [],
  outgoingRequests: [],
  onlineStatus: {},
};

window.SupabaseSocial = {
  async refreshAll() { calls.push(['refreshAll']); return { available: true }; },
  async ensureFriendCode() { return remoteState.friendCode; },
  async loadFriends() { return remoteState.friends; },
  async loadIncomingRequests() { return remoteState.incomingRequests; },
  async loadOutgoingRequests() { return remoteState.outgoingRequests; },
  async loadOnlineStatuses() { return remoteState.onlineStatus; },
  getState() { return remoteState; },
  async createChallenge() { throw new Error('generic challenge should not be used'); },
  async createPhotoDuel(friendId, payload) {
    calls.push(['createPhotoDuel', friendId, payload.discipline, payload.score]);
    const challenge = {
      id: 'photo-created-1',
      creator_id: 'supabase-user-1',
      opponent_id: friendId,
      kind: 'photo_duel',
      status: 'pending',
      discipline: payload.discipline,
      xp_reward: 20,
      creator_username: 'Tester',
      opponent_username: 'Beta',
      creator_score: payload.score,
      results: [{ challenge_id: 'photo-created-1', user_id: 'supabase-user-1', score: payload.score }],
    };
    photoCreated = [challenge];
    return { ok: true, challenge };
  },
  async loadIncomingPhotoDuels() { return photoIncoming; },
  async loadCreatedPhotoDuels() { return photoCreated; },
  async acceptPhotoDuel(id) {
    calls.push(['acceptPhotoDuel', id]);
    photoIncoming = photoIncoming.map((duel) => duel.id === id ? { ...duel, status: 'accepted' } : duel);
    return { ok: true, challenge: photoIncoming.find((duel) => duel.id === id) };
  },
  async declinePhotoDuel(id) {
    calls.push(['declinePhotoDuel', id]);
    photoIncoming = photoIncoming.map((duel) => duel.id === id ? { ...duel, status: 'declined' } : duel);
    return { ok: true, challenge: photoIncoming.find((duel) => duel.id === id) };
  },
  async submitPhotoDuelResult(id, payload) {
    calls.push(['submitPhotoDuelResult', id, payload.score]);
    const duel = photoIncoming.find((row) => row.id === id);
    latestResults = [
      { challenge_id: id, user_id: duel.creator_id, score: duel.creator_score },
      { challenge_id: id, user_id: 'supabase-user-1', score: payload.score },
    ];
    const completed = { ...duel, status: 'completed', opponent_score: payload.score, results: latestResults };
    photoIncoming = [completed];
    return { ok: true, challenge: completed, results: latestResults };
  },
  async loadPhotoDuelResults() { return latestResults; },
};

window.eval(friendsSource);
window.eval(photoDuelSource);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

await waitFor(() => window.FriendsSystem && window.document.getElementById('friendsListContainer').textContent.includes('Beta'));

captureQueue = [{ score: 402.4, confidence: 0.91, source: 'ocr-confirmed' }];
window.document.querySelector('.friend-btn.challenge').click();
assert.match(window.document.body.textContent, /Duell gegen Beta/);
window.document.querySelector('[data-fpd-start]').click();

await waitFor(() => calls.some(([name]) => name === 'createPhotoDuel'));
assert.deepEqual(
  calls.find(([name]) => name === 'createPhotoDuel'),
  ['createPhotoDuel', 'friend-1', 'lg40', 402.4],
);
assert.ok(calls.some(([name]) => name === 'captureScore'));
assert.deepEqual(
  calls.find(([name]) => name === 'captureScore'),
  ['captureScore', 'lg40', false, 25000, 'Score für Duell nutzen'],
);

photoIncoming = [{
  id: 'incoming-decline-1',
  creator_id: 'friend-2',
  opponent_id: 'supabase-user-1',
  kind: 'photo_duel',
  status: 'pending',
  discipline: 'lg40',
  xp_reward: 20,
  creator_username: 'Alpha',
  opponent_username: 'Tester',
  creator_score: 401.2,
  results: [{ challenge_id: 'incoming-decline-1', user_id: 'friend-2', score: 401.2 }],
}];

await window.FriendPhotoDuel.refresh();
assert.match(window.document.body.textContent, /Alpha fordert dich heraus/);
window.document.querySelector('[data-fpd-decline]').click();
await waitFor(() => calls.some(([name]) => name === 'declinePhotoDuel'));
assert.deepEqual(calls.find(([name]) => name === 'declinePhotoDuel'), ['declinePhotoDuel', 'incoming-decline-1']);

photoIncoming = [{
  id: 'incoming-accept-1',
  creator_id: 'friend-2',
  opponent_id: 'supabase-user-1',
  kind: 'photo_duel',
  status: 'pending',
  discipline: 'lg40',
  xp_reward: 20,
  creator_username: 'Alpha',
  opponent_username: 'Tester',
  creator_score: 401.2,
  results: [{ challenge_id: 'incoming-accept-1', user_id: 'friend-2', score: 401.2 }],
}];
captureQueue = [{ score: 405.2, confidence: 0.94, source: 'ocr-confirmed' }];

await window.FriendPhotoDuel.refresh();
window.document.querySelector('[data-fpd-accept]').click();
await waitFor(() => calls.some(([name]) => name === 'submitPhotoDuelResult'));

assert.deepEqual(calls.find(([name]) => name === 'acceptPhotoDuel'), ['acceptPhotoDuel', 'incoming-accept-1']);
assert.deepEqual(calls.find(([name]) => name === 'submitPhotoDuelResult'), ['submitPhotoDuelResult', 'incoming-accept-1', 405.2]);
assert.match(window.document.body.textContent, /Du hast gewonnen/);
assert.deepEqual(xpCalls, [15]);

window.FriendPhotoDuel.showResult(photoIncoming[0], latestResults);
assert.deepEqual(xpCalls, [15], 'XP wird pro Duell nur einmal vergeben');

// Verlierer-Pfad: aktueller Nutzer hat den niedrigeren Score -> 5 XP, Titel "Leider verloren".
window.FriendPhotoDuel.showResult(
  { id: 'photo-lost-1', creator_id: 'friend-2', opponent_id: 'supabase-user-1', kind: 'photo_duel', status: 'completed', discipline: 'lg40', creator_username: 'Alpha', opponent_username: 'Tester' },
  [
    { challenge_id: 'photo-lost-1', user_id: 'friend-2', score: 410.0 },
    { challenge_id: 'photo-lost-1', user_id: 'supabase-user-1', score: 399.0 },
  ]
);
assert.deepEqual(xpCalls, [15, 5], 'Verlierer bekommt 5 XP');
assert.match(window.document.body.textContent, /Leider verloren/);

window.FriendPhotoDuel.destroy();
console.log('friend photo duel tests passed');
