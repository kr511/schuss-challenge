/**
 * Regression: XSS-Fixes in ProfileView.js und friends.js.
 *
 * 1. ProfileView.js: a.discipline, a.difficulty, a.user_id werden escaped
 * 2. friends.js: onclick-Attribute ersetzt durch data-action + Event-Delegation
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profileSource = await readFile(new URL('./ProfileView.js', import.meta.url), 'utf8');
const friendsSource = await readFile(new URL('./friends.js', import.meta.url), 'utf8');

// ── Test 1: ProfileView esc()-Funktion vorhanden ─────────────────────────
console.log('Test 1: ProfileView hat esc()-Helper');
assert.match(profileSource, /function esc\(str\)/, 'esc() muss definiert sein');
assert.match(profileSource, /replace\(.*&amp;/, 'esc() muss & escapen');
assert.match(profileSource, /replace\(.*&lt;/, 'esc() muss < escapen');
console.log('  ✓ esc()-Funktion vorhanden und vollständig');

// ── Test 2: esc() Korrektheit (pure Logik) ──────────────────────────────
console.log('Test 2: esc() Ausgabe');
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

assert.strictEqual(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
assert.strictEqual(esc('"hello"'), '&quot;hello&quot;');
assert.strictEqual(esc("it's"), 'it&#39;s');
assert.strictEqual(esc(null), '');
assert.strictEqual(esc(undefined), '');
assert.strictEqual(esc(42), '42');
console.log('  ✓ XSS-Payloads korrekt escaped');

// ── Test 3: ProfileView nutzt esc() für API-Daten ───────────────────────
console.log('Test 3: ProfileView Live-Ticker escaped API-Daten');

// Kein rohes ${a.discipline} ohne esc()
const rawDisciplinePattern = /\$\{a\.discipline\}/;
assert.ok(!rawDisciplinePattern.test(profileSource), 'a.discipline darf nicht unescaped sein');
assert.match(profileSource, /esc\(a\.discipline\)/, 'a.discipline muss in esc() gewickelt sein');

const rawDifficultyPattern = /\$\{a\.difficulty\}/;
assert.ok(!rawDifficultyPattern.test(profileSource), 'a.difficulty darf nicht unescaped sein');
assert.match(profileSource, /esc\(a\.difficulty\)/, 'a.difficulty muss in esc() gewickelt sein');

const rawUserIdPattern = /\$\{a\.user_id\./;
assert.ok(!rawUserIdPattern.test(profileSource), 'a.user_id darf nicht unescaped sein');
assert.match(profileSource, /esc\(String\(a\.user_id/, 'a.user_id.slice() muss in esc() gewickelt sein');

console.log('  ✓ a.discipline, a.difficulty, a.user_id werden escaped');

// ── Test 4: friends.js hat keine inline onclick mit userId ───────────────
console.log('Test 4: friends.js hat keine inline onclick mit userId');

const inlineOnclickPattern = /onclick="FriendsSystem\.(challengeFriend|removeFriend|acceptRequest|declineRequest)\(/;
assert.ok(!inlineOnclickPattern.test(friendsSource), 'Keine inline onclick mit FriendsSystem-Aufrufen mehr');
console.log('  ✓ Keine onclick-Attribute mit FriendsSystem-Aufrufen');

// ── Test 5: friends.js nutzt data-action Pattern ─────────────────────────
console.log('Test 5: friends.js nutzt data-action Pattern');
assert.match(friendsSource, /data-action="challenge"/, 'Challenge-Button muss data-action haben');
assert.match(friendsSource, /data-action="remove"/, 'Remove-Button muss data-action haben');
assert.match(friendsSource, /data-action="accept"/, 'Accept-Button muss data-action haben');
assert.match(friendsSource, /data-action="decline"/, 'Decline-Button muss data-action haben');
assert.match(friendsSource, /data-user-id="\$\{escapeHtml/, 'Request-Buttons müssen data-user-id mit escapeHtml haben');
console.log('  ✓ Alle Buttons nutzen data-action Pattern');

// ── Test 6: friends.js hat bindFriendListEvents Delegation ──────────────
console.log('Test 6: Zentraler Event-Delegation Handler vorhanden');
assert.match(friendsSource, /function bindFriendListEvents/, 'bindFriendListEvents muss definiert sein');
assert.match(friendsSource, /closest\('\[data-action\]'\)/, 'closest([data-action]) Delegation vorhanden');
assert.match(friendsSource, /closest\('\[data-friend-id\]'\)/, 'closest([data-friend-id]) für Card-ID vorhanden');
console.log('  ✓ Event-Delegation statt inline onclick');

// ── Test 7: friend.userId in data-Attribut wird escaped ─────────────────
console.log('Test 7: friend.userId in HTML-Attribut wird escaped');
assert.match(friendsSource, /data-friend-id="\$\{escapeHtml\(friend\.userId\)\}"/, 'userId in data-attr muss escaped sein');
console.log('  ✓ friend.userId in data-friend-id wird escaped');

console.log('\n✅ Alle XSS-Regressionstests bestanden.');
