/**
 * Friends-System Bridge-Tests
 *
 * Testet FriendsSystem (friends.js) gegen einen gemockten SupabaseSocial-Adapter.
 * Prüft:
 *   - Happy Path: init, Code anzeigen, Freundesliste, Anfragen
 *   - Anfrage senden, annehmen, ablehnen, Freund entfernen, Challenge
 *   - Fehler-/Edge-Cases: ungültiger Code, Self-Code, nicht eingeloggt, Duplikat
 *   - Kein Fake-Erfolg: schlägt SupabaseSocial fehl, zeigt FriendsSystem keinen Erfolg
 */
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

// ─── DOM + Globals einrichten ────────────────────────────────────────────────

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => { console.error(error); });

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
  getRaw(key, fallback = null) { return store.has(key) ? store.get(key) : fallback; },
  setRaw(key, value) { store.set(key, String(value)); return true; },
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
    if (code === 'SELF12') return { ok: false, reason: 'self-code' };
    if (code === 'NOTFND') return { ok: false, reason: 'code-not-found' };
    if (code === 'ALRFND') return { ok: false, reason: 'already-friend' };
    if (code === 'ALRSNT') return { ok: false, reason: 'already-sent' };
    if (code === 'RCDCLN') return { ok: false, reason: 'recently-declined' };
    return { ok: true, requestId: 'request-3' };
  },
  async acceptRequest(id) {
    calls.push(['acceptRequest', id]);
    return { ok: true };
  },
  async declineRequest(id) {
    calls.push(['declineRequest', id]);
    if (id === 'BADREQ') return { ok: false, reason: 'request-not-found' };
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
  getState() { return remoteState; },
};

// ─── FriendsSystem laden und initialisieren ──────────────────────────────────

window.eval(source);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

await waitFor(() => window.FriendsSystem && calls.some(([name]) => name === 'refreshAll'));

// ─── 1. Happy-Path: Init, Code, Listen ──────────────────────────────────────

assert.equal(
  window.document.getElementById('friendCodeDisplay').textContent,
  'SUP123',
  'Eigener Freundes-Code wird korrekt angezeigt'
);

const state = window.FriendsSystem.getState();
assert.equal(state.currentUserId, 'supabase-user-1', 'currentUserId korrekt');
assert.equal(state.friends[0].userId, 'friend-1', 'Freund-ID korrekt');
assert.equal(state.pendingRequests[0].id, 'request-1', 'Eingehende Anfrage-ID korrekt');
assert.equal(state.pendingRequests[0].fromUserId, 'sender-1', 'Anfrage-Sender-ID korrekt');
assert.equal(state.sentRequests[0].userId, 'receiver-1', 'Gesendete Anfrage-Empfänger-ID korrekt');
assert.equal(state.onlineStatusByUserId['friend-1'].online, true, 'Online-Status korrekt');
assert.match(
  window.document.getElementById('friendsListContainer').textContent,
  /Beta/,
  'Freundesliste enthält Freund Beta'
);
assert.match(
  window.document.getElementById('receivedRequestsContainer').textContent,
  /Alpha/,
  'Eingehende Anfragen-Container enthält Alpha'
);

// ─── 2. Anfrage senden – Happy Path ─────────────────────────────────────────

const addOk = await window.FriendsSystem.addFriendByCode('ABCDEF');
assert.equal(addOk, true, 'addFriendByCode gibt true zurück bei Erfolg');
assert.deepEqual(
  calls.find(([name]) => name === 'addFriendByCode'),
  ['addFriendByCode', 'ABCDEF'],
  'SupabaseSocial.addFriendByCode wird mit normalisiiertem Code aufgerufen'
);

// ─── 3. Edge-Cases: Fehler bei addFriendByCode ──────────────────────────────

// Zu kurzer Code
const addTooShort = await window.FriendsSystem.addFriendByCode('ABC');
assert.equal(addTooShort, false, 'Zu kurzer Code wird abgelehnt (false)');

// Self-Code (eigener Code: SUP123 — nur wenn state.userCode gesetzt)
// Hinweis: state.userCode = 'SUP123', also:
const addSelf = await window.FriendsSystem.addFriendByCode('SUP123');
assert.equal(addSelf, false, 'Eigenen Code hinzufügen wird abgelehnt (false)');

// Self-Code via SupabaseSocial (Backend-Fehler)
const addSelfBackend = await window.FriendsSystem.addFriendByCode('SELF12');
assert.equal(addSelfBackend, false, 'self-code vom Backend wird als false zurückgegeben');

// Code nicht gefunden
const addNotFound = await window.FriendsSystem.addFriendByCode('NOTFND');
assert.equal(addNotFound, false, 'code-not-found vom Backend wird als false zurückgegeben');

// Bereits Freund
const addAlreadyFriend = await window.FriendsSystem.addFriendByCode('ALRFND');
assert.equal(addAlreadyFriend, false, 'already-friend vom Backend wird als false zurückgegeben');

// Anfrage bereits gesendet
const addAlreadySent = await window.FriendsSystem.addFriendByCode('ALRSNT');
assert.equal(addAlreadySent, false, 'already-sent vom Backend wird als false zurückgegeben');

// ─── 4. Nicht eingeloggt – alle Aktionen sollen false zurückgeben ────────────

const savedSession = window.SupabaseSession;
window.SupabaseSession = null; // ausgeloggt simulieren

// FriendsSystem benutzt isSupabaseSocialAvailable() – braucht SupabaseSession
const addNoLogin = await window.FriendsSystem.addFriendByCode('ABCDEF');
assert.equal(addNoLogin, false, 'addFriendByCode gibt false zurück wenn nicht eingeloggt');

const acceptNoLogin = await window.FriendsSystem.acceptRequest('request-1');
assert.equal(acceptNoLogin, false, 'acceptRequest gibt false zurück wenn nicht eingeloggt');

const declineNoLogin = await window.FriendsSystem.declineRequest('request-1');
assert.equal(declineNoLogin, false, 'declineRequest gibt false zurück wenn nicht eingeloggt');

const removeNoLogin = await window.FriendsSystem.removeFriend('friend-1');
assert.equal(removeNoLogin, false, 'removeFriend gibt false zurück wenn nicht eingeloggt');

window.SupabaseSession = savedSession; // zurücksetzen

// ─── 5. Anfrage annehmen ─────────────────────────────────────────────────────

const acceptOk = await window.FriendsSystem.acceptRequest('sender-1');
assert.equal(acceptOk, true, 'acceptRequest gibt true zurück bei Erfolg');
assert.deepEqual(
  calls.find(([name]) => name === 'acceptRequest'),
  ['acceptRequest', 'request-1'],
  'acceptRequest löst SupabaseSocial.acceptRequest mit Request-ID auf (nicht User-ID)'
);

// ─── 6. Anfrage ablehnen ─────────────────────────────────────────────────────

const declineOk = await window.FriendsSystem.declineRequest('sender-1');
assert.equal(declineOk, true, 'declineRequest gibt true zurück bei Erfolg');
assert.deepEqual(
  calls.find(([name]) => name === 'declineRequest'),
  ['declineRequest', 'request-1'],
  'declineRequest löst SupabaseSocial.declineRequest mit Request-ID auf'
);

// Anfrage bereits verarbeitet / nicht gefunden → kein Absturz, false zurück
const declineBad = await window.FriendsSystem.declineRequest('BADREQ');
assert.equal(declineBad, false, 'declineRequest gibt false zurück wenn Anfrage nicht gefunden (request-not-found)');

// ─── 7. Freund entfernen ─────────────────────────────────────────────────────

const removeOk = await window.FriendsSystem.removeFriend('friend-1');
assert.equal(removeOk, true, 'removeFriend gibt true zurück bei Erfolg');
assert.deepEqual(
  calls.find(([name]) => name === 'removeFriend'),
  ['removeFriend', 'friend-1'],
  'removeFriend übergibt korrekte User-ID an SupabaseSocial'
);

// ─── 8. Challenge ────────────────────────────────────────────────────────────

window.FriendsSystem.challengeFriend('friend-1');
await waitFor(() => calls.some(([name]) => name === 'createChallenge'));
assert.deepEqual(
  calls.find(([name]) => name === 'createChallenge'),
  ['createChallenge', 'friend-1', 'lg40', 'real'],
  'challengeFriend übergibt korrekte Disziplin und Schwierigkeit'
);

// ─── 9. Kein Fake-Erfolg: SupabaseSocial.acceptRequest schlägt fehl ──────────

window.SupabaseSocial.acceptRequest = async function (id) {
  calls.push(['acceptRequest-fail', id]);
  return { ok: false, reason: 'unknown-error' };
};
const acceptFail = await window.FriendsSystem.acceptRequest('sender-1');
assert.equal(acceptFail, false, 'FriendsSystem gibt false zurück wenn SupabaseSocial.acceptRequest fehlschlägt');

// Restore acceptRequest for remaining tests
window.SupabaseSocial.acceptRequest = async function (id) {
  calls.push(['acceptRequest', id]);
  return { ok: true };
};

// ─── Re-Request-Regel (7 Szenarien) ──────────────────────────────────────────
// Szenario 1: Anfrage senden → B sieht incoming request
// (bereits in Szenario 2/5 getestet über remoteState.incomingRequests)

// Szenario 2: B lehnt ab → recently-declined wird korrekt gemeldet
const declineRes = await window.FriendsSystem.declineRequest('sender-1');
assert.equal(declineRes, true, 'S2: decline erfolgreich');

// Szenario 3: A versucht innerhalb 24h nochmal → recently-declined, false zurück, kein Toast-Erfolg
const rcdclnRes = await window.FriendsSystem.addFriendByCode('RCDCLN');
assert.equal(rcdclnRes, false, 'S3: recently-declined gibt false zurück');
assert.ok(
  calls.some(([name, code]) => name === 'addFriendByCode' && code === 'RCDCLN'),
  'S3: SupabaseSocial.addFriendByCode mit RCDCLN aufgerufen'
);

// Szenario 4 + 5: Nach 24h kann A erneut anfragen
// (die re-request Logik liegt in supabase-social.js und wird im Direkttest mit echter DB geprüft;
//  hier im Mock-Test prüfen wir, dass ein normaler addFriendByCode nach Ablauf des Cooldowns
//  wieder { ok: true } liefert — Mock gibt bei 'ABCDEF' immer ok:true zurück)
const reRequestRes = await window.FriendsSystem.addFriendByCode('ABCDEF');
assert.equal(reRequestRes, true, 'S4+5: Nach Cooldown kann A erneut anfragen (ok:true)');

// Szenario 6: B nimmt an → true zurück (Friend-Rows A→B und B→A im Direkttest geprüft)
const acceptAgainRes = await window.FriendsSystem.acceptRequest('sender-1');
assert.equal(acceptAgainRes, true, 'S6: acceptRequest nach re-request erfolgreich');

// Szenario 7: A darf eigene Anfrage nicht per declineRequest ablehnen → request-not-found
// Der Mock simuliert das Verhalten: 'BADREQ' (kein to_user_id-Match) → { ok:false, reason:'request-not-found' }
const senderDeclineOwnRes = await window.FriendsSystem.declineRequest('BADREQ');
assert.equal(senderDeclineOwnRes, false, 'S7: Sender kann eigene Anfrage nicht ablehnen (request-not-found)');

console.log('friends Supabase bridge tests passed ✓');
