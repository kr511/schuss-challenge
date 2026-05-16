/**
 * Regression: Batch-Bugfixes (ProfileView, friends, chat-view)
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profileSrc = await readFile(new URL('./ProfileView.js', import.meta.url), 'utf8');
const friendsSrc = await readFile(new URL('./friends.js', import.meta.url), 'utf8');
const chatSrc    = await readFile(new URL('./chat-view.js', import.meta.url), 'utf8');

// ── Bug 1: ProfileView – globale event-Variable ──────────────────────────
console.log('Bug 1: ProfileView switchTab bekommt event als Parameter');

assert.ok(!profileSrc.includes("onclick=\"ProfileView.switchTab('for-you')\""),
  'Tab-Button darf kein rohes onclick ohne event haben');
assert.match(profileSrc, /ProfileView\.switchTab\('for-you', event\)/,
  'Tab-Button muss event durchreichen');
assert.match(profileSrc, /ProfileView\.switchTab\('live', event\)/,
  'Live-Tab muss event durchreichen');
assert.match(profileSrc, /function switchTab\(tabId, e\)/,
  'switchTab muss e-Parameter haben');
assert.ok(!profileSrc.includes('event.target.classList'),
  'Kein globaler event.target Zugriff mehr');
assert.match(profileSrc, /if \(e && e\.target\) e\.target\.classList\.add/,
  'e.target Guard vorhanden');
console.log('  ✓ Kein globaler event-Zugriff mehr');

// ── Bug 2: friends.js – JSON.parse ohne try/catch ────────────────────────
console.log('Bug 2: friends.js JSON.parse abgesichert');

// Alle JSON.parse auf localFriends müssen in try stehen
const jsonParseLines = friendsSrc.split('\n').filter(l => l.includes('JSON.parse(localFriends)'));
assert.ok(jsonParseLines.length === 2, 'Genau 2 JSON.parse(localFriends) erwartet');
jsonParseLines.forEach(line => {
  assert.match(line.trim(), /try\s*\{/,
    `JSON.parse(localFriends) muss in try stehen: "${line.trim()}"`);
});
console.log('  ✓ Beide JSON.parse(localFriends) in try/catch');

// ── Bug 3: friends.js – Clipboard ohne .catch() ──────────────────────────
console.log('Bug 3: Clipboard-Fehler werden abgefangen');

assert.match(friendsSrc, /writeText\(state\.userCode\)\s*\n?\s*\.then\(/,
  'clipboard.writeText muss .then() haben');
assert.match(friendsSrc, /\.catch\(\s*\(\)\s*=>\s*fallbackCopy/,
  '.catch() muss auf fallbackCopy() zeigen');
assert.match(friendsSrc, /function fallbackCopy/,
  'fallbackCopy Funktion muss definiert sein');
console.log('  ✓ Clipboard hat .catch() + fallbackCopy()');

// ── Bug 4: chat-view.js – doppelter Click-Listener ───────────────────────
console.log('Bug 4: Chat-Overlay Click-Listener wird nur einmal gebunden');

assert.match(chatSrc, /ov\._cvClickBound/,
  '_cvClickBound Guard muss vorhanden sein');
assert.match(chatSrc, /if \(!ov\._cvClickBound\)/,
  'Guard muss vor addEventListener stehen');
console.log('  ✓ Click-Listener hat Guard gegen Mehrfachregistrierung');

// ── Bug 5: friends.js – init() Race Condition ────────────────────────────
console.log('Bug 5: init() Race Condition durch _initInProgress abgesichert');

assert.match(friendsSrc, /let _initInProgress = false/,
  '_initInProgress Flag muss definiert sein');
assert.match(friendsSrc, /if \(!force && _initInProgress\) return true/,
  'Early-return bei laufendem init ohne force');
assert.match(friendsSrc, /_initInProgress = true/,
  'Flag muss auf true gesetzt werden');
assert.match(friendsSrc, /finally \{\s*\n?\s*_initInProgress = false/,
  'finally-Block muss Flag zurücksetzen');
console.log('  ✓ init() ist gegen Race Condition abgesichert');

console.log('\n✅ Alle 5 Bug-Regressionstests bestanden.');
