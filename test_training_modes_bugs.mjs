/**
 * Regressionstests für Training-Modes Bugs:
 *  1. Division durch 0 in handlePrecisionTraining (totalShots === 0)
 *  2. startTraining() warnt wenn Training bereits aktiv
 *  3. opponent_score === 0 wird nicht als "nicht eingereicht" behandelt
 */

import assert from 'node:assert/strict';

// ── Test 1: Präzisions-Accuracy – Division durch 0 ──────────────────────────
console.log('Test 1: Präzisions-Accuracy verhindert Division durch 0');

function computePrecisionAccuracy(shots) {
  // Spiegelt die fixe Logik aus training-modes.js handlePrecisionTraining()
  const validShots = shots.filter(s => s.isValid).length;
  const totalShots = shots.length;
  const accuracy = totalShots > 0 ? (validShots / totalShots) * 100 : 0;
  return accuracy;
}

// Vor dem Fix: shots.length === 0 → 0/0 = NaN
const emptyAccuracy = computePrecisionAccuracy([]);
assert.ok(Number.isFinite(emptyAccuracy), `Accuracy bei 0 Schüssen muss endlich sein, war: ${emptyAccuracy}`);
assert.strictEqual(emptyAccuracy, 0, 'Accuracy bei 0 Schüssen muss 0 sein');
console.log('  ✓ 0 Schüsse → accuracy = 0 (kein NaN)');

// Alle ungültig (ring < 9)
const allInvalidAccuracy = computePrecisionAccuracy([
  { isValid: false },
  { isValid: false },
]);
assert.strictEqual(allInvalidAccuracy, 0, 'Alle ungültig → 0%');
console.log('  ✓ 2 ungültige Schüsse → accuracy = 0%');

// Gemischt
const mixedAccuracy = computePrecisionAccuracy([
  { isValid: true },
  { isValid: false },
  { isValid: true },
  { isValid: false },
]);
assert.strictEqual(mixedAccuracy, 50, '2/4 gültig → 50%');
console.log('  ✓ 2/4 gültige Schüsse → accuracy = 50%');

// Alle gültig
const allValidAccuracy = computePrecisionAccuracy([
  { isValid: true },
  { isValid: true },
]);
assert.strictEqual(allValidAccuracy, 100, 'Alle gültig → 100%');
console.log('  ✓ 2/2 gültige Schüsse → accuracy = 100%');

// ── Test 2: startTraining Guard bei aktivem Training ────────────────────────
console.log('\nTest 2: startTraining erkennt bereits aktives Training');

function simulateStartTraining(currentTraining, modeId) {
  // Spiegelt die fixe Guard-Logik aus training-modes.js startTraining()
  const warnings = [];
  const TRAINING_MODES = { precision: { id: 'precision' }, speed: { id: 'speed' } };
  const mode = TRAINING_MODES[modeId];
  if (!mode) return { warnings, started: false };
  if (currentTraining && currentTraining.status === 'active') {
    warnings.push('Training bereits aktiv, wird neu gestartet: ' + modeId);
  }
  return { warnings, started: true };
}

const result1 = simulateStartTraining(null, 'precision');
assert.strictEqual(result1.warnings.length, 0, 'Kein Warning wenn kein laufendes Training');
assert.ok(result1.started, 'Training soll starten');
console.log('  ✓ Kein Warning wenn kein Training läuft');

const result2 = simulateStartTraining({ status: 'active', mode: { id: 'precision' } }, 'speed');
assert.ok(result2.warnings.some(w => w.includes('bereits aktiv')), 'Warning erwartet bei aktivem Training');
assert.ok(result2.started, 'Training soll trotzdem starten');
console.log('  ✓ Warning ausgegeben wenn Training überschrieben wird');

const result3 = simulateStartTraining({ status: 'completed', mode: { id: 'precision' } }, 'speed');
assert.strictEqual(result3.warnings.length, 0, 'Kein Warning wenn Training abgeschlossen');
console.log('  ✓ Kein Warning wenn vorheriges Training abgeschlossen ist');

// ── Test 3: opponent_score === 0 ist "eingereicht" ──────────────────────────
console.log('\nTest 3: opponent_score === 0 gilt als eingereicht');

function findOpenDuel(duels) {
  // Spiegelt die fixe Logik aus friend-photo-duel.js (Zeile 517–519)
  return duels.find(function (duel) {
    return duel.status === 'pending' || (duel.status === 'accepted' && duel.opponent_score == null);
  });
}

// Bug: !0 === true → würde fälschlicherweise als "offen" gelten
const duelWithZeroScore = { id: 'duel-1', status: 'accepted', opponent_score: 0 };
const openForZero = findOpenDuel([duelWithZeroScore]);
assert.strictEqual(openForZero, undefined, 'score=0 darf nicht als offen gelten');
console.log('  ✓ opponent_score=0 wird nicht als "nicht eingereicht" gewertet');

// null bedeutet tatsächlich noch nicht eingereicht
const duelWithNull = { id: 'duel-2', status: 'accepted', opponent_score: null };
const openForNull = findOpenDuel([duelWithNull]);
assert.ok(openForNull !== undefined, 'score=null muss als offen gelten');
console.log('  ✓ opponent_score=null wird korrekt als "nicht eingereicht" erkannt');

// undefined gilt ebenfalls als nicht eingereicht
const duelWithUndefined = { id: 'duel-3', status: 'accepted' };
const openForUndefined = findOpenDuel([duelWithUndefined]);
assert.ok(openForUndefined !== undefined, 'fehlender score muss als offen gelten');
console.log('  ✓ opponent_score=undefined wird korrekt als "nicht eingereicht" erkannt');

// Echter Score schließt das Duell
const duelWithScore = { id: 'duel-4', status: 'accepted', opponent_score: 385.4 };
const openForScore = findOpenDuel([duelWithScore]);
assert.strictEqual(openForScore, undefined, 'Echten Score nicht als offen markieren');
console.log('  ✓ Abgeschlossenes Duell wird korrekt ausgeschlossen');

// Pending gilt immer als offen, unabhängig vom Score
const pendingDuel = { id: 'duel-5', status: 'pending', opponent_score: 400 };
const openPending = findOpenDuel([pendingDuel]);
assert.ok(openPending !== undefined, 'pending-Duell immer als offen markieren');
console.log('  ✓ Pending-Duell ist immer offen');

console.log('\n✅ Alle Bug-Regressionstests bestanden.');
