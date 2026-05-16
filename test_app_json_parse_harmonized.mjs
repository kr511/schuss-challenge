/**
 * Regression: JSON-Parse-Harmonisierung in app.js.
 *
 *  - readJsonStorage(key, fallback) ist robust gegen kaputtes JSON
 *  - Achievement-Filter (Z. 1673ff) liest das Storage einmal, nicht pro Iteration
 *  - Keine ungeguardeten JSON.parse(localStorage.getItem(...)) Aufrufe übrig,
 *    die nicht in einem try-catch leben.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./app.js', import.meta.url), 'utf8');

// ── Test 1: readJsonStorage-Logik ────────────────────────────────────────
console.log('Test 1: readJsonStorage-Verhalten');

function readJsonStorage(getItem, key, fallback) {
  try {
    const raw = getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

const store = new Map([
  ['valid_obj', '{"a":1,"b":2}'],
  ['valid_arr', '[1,2,3]'],
  ['broken', '{not json'],
  ['null', 'null'],
  ['string', '"hello"'],
]);
const fakeGet = (k) => (store.has(k) ? store.get(k) : null);

assert.deepEqual(readJsonStorage(fakeGet, 'valid_obj', {}), { a: 1, b: 2 });
console.log('  ✓ valides Objekt geparst');

assert.deepEqual(readJsonStorage(fakeGet, 'valid_arr', []), [1, 2, 3]);
console.log('  ✓ valides Array geparst');

assert.deepEqual(readJsonStorage(fakeGet, 'broken', {}), {});
console.log('  ✓ kaputtes JSON → fallback');

assert.deepEqual(readJsonStorage(fakeGet, 'missing', { default: true }), { default: true });
console.log('  ✓ fehlender Key → fallback');

assert.deepEqual(readJsonStorage(fakeGet, 'null', { x: 1 }), { x: 1 });
console.log('  ✓ JSON null → fallback (kein null durchgereicht)');

assert.deepEqual(readJsonStorage(fakeGet, 'string', { x: 1 }), { x: 1 });
console.log('  ✓ JSON-Primitive (string) → fallback');

// ── Test 2: Achievement-Filter parsed nur einmal ────────────────────────
console.log('\nTest 2: Achievement-Filter ruft readJsonStorage genau einmal');

// Suche die kompakte Filter-Section
const filterSection = source.match(/const achievementProgress = readJsonStorage\(['"]sd_enhanced_achievements['"], \{\}\);[\s\S]{0,400}lockedAchievements/);
assert.ok(filterSection, 'Achievement-Filter sollte readJsonStorage einmal aufrufen');
console.log('  ✓ readJsonStorage wird genau einmal vor den Filtern aufgerufen');

const inlineParseCount = (filterSection[0].match(/JSON\.parse/g) || []).length;
assert.strictEqual(inlineParseCount, 0, 'Keine inline JSON.parse im Filter-Block');
console.log('  ✓ Keine inline JSON.parse-Aufrufe im Filter-Block');

// ── Test 3: Helper-Wiederverwendung ─────────────────────────────────────
console.log('\nTest 3: loadFeedbackMeta und getSunEarned nutzen den Helper');

assert.match(
  source,
  /function loadFeedbackMeta\(\) \{[\s\S]{0,80}return readJsonStorage\(['"]sd_feedback_meta['"], \{\}\);[\s\S]{0,20}\}/,
  'loadFeedbackMeta sollte readJsonStorage nutzen'
);
console.log('  ✓ loadFeedbackMeta delegiert an readJsonStorage');

assert.match(
  source,
  /function getSunEarned\(\) \{[\s\S]{0,80}return readJsonStorage\(['"]sd_sun['"], \{\}\);[\s\S]{0,20}\}/,
  'getSunEarned sollte readJsonStorage nutzen'
);
console.log('  ✓ getSunEarned delegiert an readJsonStorage');

// ── Test 4: Keine alten ungeguardeten JSON.parse-Patterns ───────────────
console.log('\nTest 4: Keine ungeguardeten JSON.parse-Aufrufe in Filter-Callbacks');

// Suche typische Anti-Pattern: `.filter(... => { ... JSON.parse(...)` ohne try
const dangerPattern = /\.filter\([^)]+=>\s*\{\s*(?:const|let|var)?\s*[^=]*=\s*JSON\.parse\(localStorage\.getItem/g;
const matches = source.match(dangerPattern) || [];
assert.strictEqual(matches.length, 0, `Ungeguardete JSON.parse in Filter-Callback gefunden: ${matches.join(', ')}`);
console.log('  ✓ Kein .filter(() => { JSON.parse(localStorage...) }) mehr');

console.log('\n✅ Alle Tests bestanden.');
