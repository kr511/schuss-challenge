import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const source = await readFile(new URL('./friends.js', import.meta.url), 'utf8');

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
          reject(new Error('Timed out waiting for friends bridge'));
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

const dom = new JSDOM(`<!doctype html><html><body>
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
const remoteState = {
  friendCode: 'SUP123',
  friends: [{
    userId: 'friend-1',
    username: 'Beta',
    addedAt: '2026-04-28T13:00:00.000Z',
  }],
  incomingRequests: [{
    id: 'request-1',
    fromUserId: 'sender-1',
    fromUsername: 'Alpha',
    createdAt: '2026-04-28T13:05:00.000Z',
    status: 'pending',
  }],
  outgoingRequests: [{
    id: 'request-2',
    toUserId: 'receiver-1',
    toUsername: 'Gamma',
    createdAt: '2026-04-28T13:06:00.000Z',
    status: 'pending',
  }],
  onlineStatus: {
    'friend-1': { online: true, lastSeen: Date.now(), username: 'Beta' },
  },
};

window.console = { ...console, warn() {}, log() {} };
window.G = {
  username: 'Tester',
  discipline: 'lg40',
  weapon: 'lg',
  dist: '10',
  diff: 'real',
  shots: 40,
  burst: false,
};
window.SupabaseSession = { user: { id: 'supabase-user-1' } };
window.SchussduellLocalMode = false;
window.SchussduellLocalPlay = false;
window.confirm = () => true;
window.StorageManager = {
  getRaw(key, fallback = null) {
    return store.has(key) ? store.get(key) : fallback;
  },
  setRaw(key, value) {
    store.set(key, String(value));
    return true;
  },
};
window.SupabaseSocial = {
  async refreshAll() {
    calls.push(['refreshAll']);
    return { available: true };
  },
  async ensureFriendCode() {
    calls.push(['ensureFriendCode']);
    return remoteState.friendCode;
  },
  async loadFriends() {
    calls.push(['loadFriends']);
    return remoteState.friends;
  },
  async loadIncomingRequests() {
    calls.push(['loadIncomingRequests']);
    return remoteState.incomingRequests;
  },
  async loadOutgoingRequests() {
    calls.push(['loadOutgoingRequests']);
    return remoteState.outgoingRequests;
  },
  async loadOnlineStatuses() {
    calls.push(['loadOnlineStatuses']);
    return remoteState.onlineStatus;
  },
  async addFriendByCode(code) {
    calls.push(['addFriendByCode', code]);
    return { ok: true, requestId: 'request-3' };
  },
  async acceptRequest(id) {
    calls.push(['acceptRequest', id]);
    return { ok: true };
  },
  async declineRequest(id) {
    calls.push(['declineRequest', id]);
    return { ok: true };
  },
  async removeFriend(id) {
    calls.push(['removeFriend', id]);
    return { ok: true };
  },
  async updateOnlineStatus(online) {
    calls.push(['updateOnlineStatus', online]);
    return true;
  },
  async createChallenge(id, settings) {
    calls.push(['createChallenge', id, settings.discipline, settings.difficulty]);
    return { ok: true, challenge: { id: 'challenge-1' } };
  },
  getState() {
    return remoteState;
  },
};

window.eval(source);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

await waitFor(() => window.FriendsSystem && calls.some(([name]) => name === 'refreshAll'));

assert.equal(window.document.getElementById('friendCodeDisplay').textContent, 'SUP123');

const state = window.FriendsSystem.getState();
assert.equal(state.currentUserId, 'supabase-user-1');
assert.equal(state.friends[0].userId, 'friend-1');
assert.equal(state.pendingRequests[0].id, 'request-1');
assert.equal(state.sentRequests[0].userId, 'receiver-1');
assert.equal(state.onlineStatusByUserId['friend-1'].online, true);
assert.match(window.document.getElementById('friendsListContainer').textContent, /Beta/);

await window.FriendsSystem.addFriendByCode('ABCDEF');
await window.FriendsSystem.acceptRequest('sender-1');
await window.FriendsSystem.declineRequest('sender-1');
await window.FriendsSystem.removeFriend('friend-1');
window.FriendsSystem.challengeFriend('friend-1');

await waitFor(() => calls.some(([name]) => name === 'createChallenge'));

assert.deepEqual(calls.find(([name]) => name === 'addFriendByCode'), ['addFriendByCode', 'ABCDEF']);
assert.deepEqual(calls.find(([name]) => name === 'acceptRequest'), ['acceptRequest', 'request-1']);
assert.deepEqual(calls.find(([name]) => name === 'declineRequest'), ['declineRequest', 'request-1']);
assert.deepEqual(calls.find(([name]) => name === 'removeFriend'), ['removeFriend', 'friend-1']);
assert.deepEqual(calls.find(([name]) => name === 'createChallenge'), ['createChallenge', 'friend-1', 'lg40', 'real']);

console.log('friends Supabase bridge tests passed');
