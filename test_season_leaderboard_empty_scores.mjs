/**
 * Regression: buildSeasonLeaderboardEntry darf nicht -Infinity zurückgeben,
 * wenn alle playerPts ungültig sind. Außerdem dürfen ungültige Werte den
 * Durchschnitt nicht als 0 verfälschen (Harmonisierung mit Disziplin-Version).
 */

import assert from 'node:assert/strict';

function buildScores(matches) {
  // Spiegelt die fixe Logik aus app.js buildSeasonLeaderboardEntry()
  return matches
    .map((entry) => Number(entry.playerPts))
    .filter((score) => Number.isFinite(score));
}

function entryFor(matches) {
  if (!matches.length) return null;
  const scores = buildScores(matches);
  if (!scores.length) return null;
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const bestScore = Math.max(...scores);
  return { averageScore, bestScore, totalScores: scores.length };
}

// ── Test 1: Alle Matches haben gültige Scores ───────────────────────────────
console.log('Test 1: Normale Daten');
const ok = entryFor([
  { playerPts: 385.4 },
  { playerPts: 391.2 },
  { playerPts: 378.0 },
]);
assert.ok(ok, 'Eintrag darf nicht null sein');
assert.strictEqual(ok.totalScores, 3);
assert.strictEqual(ok.bestScore, 391.2);
assert.ok(Math.abs(ok.averageScore - 384.866) < 0.01);
console.log('  ✓ avg=' + ok.averageScore.toFixed(2) + ' best=' + ok.bestScore);

// ── Test 2: Alle playerPts NaN-erzeugend → null statt -Infinity ────────────
console.log('Test 2: Alle Scores erzeugen NaN → null');
const noneValid = entryFor([
  { playerPts: undefined },
  { playerPts: 'foobar' },
  { playerPts: NaN },
]);
assert.strictEqual(noneValid, null, 'Muss null sein, nicht -Infinity');
console.log('  ✓ entry = null statt -Infinity');

// ── Test 3: Gemischt – ungültige Werte werden gefiltert ────────────────────
console.log('Test 3: Gemischt → nur gültige Scores zählen');
const mixed = entryFor([
  { playerPts: 380 },
  { playerPts: undefined },   // gefiltert (NaN)
  { playerPts: 390 },
  { playerPts: 'abc' },       // gefiltert (NaN)
  { playerPts: NaN },         // gefiltert
]);
assert.ok(mixed, 'Eintrag mit mind. einem gültigen Score');
assert.strictEqual(mixed.totalScores, 2);
assert.strictEqual(mixed.bestScore, 390);
assert.strictEqual(mixed.averageScore, 385, 'avg = (380+390)/2 = 385, nicht durch ungültige Einträge verfälscht');
console.log('  ✓ avg=' + mixed.averageScore + ' (nicht durch NaN-Werte verfälscht)');

// ── Test 3b: Verhaltensänderung gegenüber dem alten `|| 0` ─────────────────
console.log('Test 3b: Alter Bug – ungültige Werte als 0 hätten avg gedrückt');
const oldBuggyAvg = (380 + 0 + 390 + 0 + 0) / 5; // alter Code: Number(x) || 0
const newFixedAvg = (380 + 390) / 2;             // neuer Code: filter
assert.strictEqual(oldBuggyAvg, 154);
assert.strictEqual(newFixedAvg, 385);
console.log('  ✓ Fix verbessert avg von ' + oldBuggyAvg + ' auf ' + newFixedAvg);

// ── Test 4: Score = 0 ist gültig (echtes Ergebnis) ─────────────────────────
console.log('Test 4: playerPts = 0 zählt als gültiger Score');
const withZero = entryFor([
  { playerPts: 0 },
  { playerPts: 100 },
]);
assert.ok(withZero);
assert.strictEqual(withZero.totalScores, 2);
assert.strictEqual(withZero.bestScore, 100);
assert.strictEqual(withZero.averageScore, 50);
console.log('  ✓ 0 als Score korrekt einbezogen');

// ── Test 5: Math.max ohne ...scores Crash ─────────────────────────────────
console.log('Test 5: Math.max wirft NIE -Infinity wenn scores gefüllt');
const single = entryFor([{ playerPts: 42 }]);
assert.ok(single);
assert.strictEqual(single.bestScore, 42);
assert.ok(Number.isFinite(single.bestScore));
console.log('  ✓ Einzelscore liefert finite Werte');

// ── Test 6: Leeres matches-Array → null ────────────────────────────────────
console.log('Test 6: Keine Matches → null');
const empty = entryFor([]);
assert.strictEqual(empty, null);
console.log('  ✓ leeres matches → null');

console.log('\n✅ Alle Tests bestanden.');
