#!/usr/bin/env node
/**
 * OCR-Erkennungs-Benchmark ("Trainings-/Eval-Harness")
 *
 * Echtes Neutraining des YOLO-Netzes laeuft extern (Colab/GPU, siehe
 * docs/vision-model-upgrade.md). Die *Erkennungs-Intelligenz*, die aus
 * verrauschtem OCR-/Netz-Output das korrekte Ergebnis macht, lebt dagegen in
 * reiner, testbarer Logik (src/vision/ocr-confidence.js + parseDisciplineText).
 *
 * Dieser Benchmark misst genau diese Schicht an einer realistischen Menge
 * typischer Kamera-/7-Segment-Fehllesungen und liefert eine harte Kennzahl:
 *   - Disziplin-Erkennung (verrauschter Text -> Disziplin)
 *   - Score-Recovery (unmoegliche/untypische Lesung -> korrekter Wert)
 *     jeweils BASELINE (nur Dezimal-Shift) vs. VERBESSERT (+ Ziffern-
 *     Verwechslung), damit der Gewinn messbar ist.
 *
 * Faellt unter die Schwellen -> Exit 1 (Regressions-Schutz, in `npm test`).
 *
 * Nutzung: node scripts/ocr-benchmark.mjs   (bzw. npm run bench:ocr)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Pure Logik laden ───────────────────────────────────────────────────────
// 1) ocr-confidence.js als IIFE in einer Sandbox.
const confSrc = readFileSync(join(root, 'src/vision/ocr-confidence.js'), 'utf8');
const OCR = new Function('window', confSrc + '\nreturn window.OCRConfidence;')({});

// 2) parseDisciplineText aus image-compare.js extrahieren (reine Funktion).
const icSrc = readFileSync(join(root, 'src/vision/image-compare.js'), 'utf8');
const dm = icSrc.match(/function parseDisciplineText\(rawText\) \{[\s\S]*?\n {2}\}\n/);
if (!OCR || !dm) {
  console.error('FAIL: konnte Erkennungs-Logik nicht laden (OCRConfidence / parseDisciplineText)');
  process.exit(1);
}
const parseDisciplineText = new Function(dm[0] + '\nreturn parseDisciplineText;')();

// ── Datensatz: Disziplin-Erkennung ─────────────────────────────────────────
// Realistische, verrauschte Trefferanlagen-Beschriftungen -> erwartete Klasse.
const DISCIPLINE_CASES = [
  { raw: 'LG 40', expect: 'lg40' },
  { raw: 'LG40', expect: 'lg40' },
  { raw: 'LG-40', expect: 'lg40' },
  { raw: 'lg 40', expect: 'lg40' },
  { raw: 'LG 4O', expect: 'lg40' },          // O statt 0
  { raw: 'L6 40', expect: 'lg40' },          // G statt 6 (LCD)
  { raw: 'L640', expect: 'lg40' },           // G->6, ohne Space
  { raw: 'SCHIESSEN  LG 40  STAND 3', expect: 'lg40' },
  { raw: 'LG 60', expect: 'lg60' },
  { raw: 'L6 60', expect: 'lg60' },          // G->6
  { raw: 'KK 50', expect: 'kk50' },
  { raw: 'KK-50', expect: 'kk50' },
  { raw: 'KK 100', expect: 'kk100' },
  { raw: 'KK 3x20', expect: 'kk3x20' },
  { raw: 'KK3X20', expect: 'kk3x20' },
  { raw: 'KK 3 X 20', expect: 'kk3x20' },
  { raw: 'KK 3K20', expect: 'kk3x20' },      // X->K (LCD)
  // Negative: darf NICHTS erkennen.
  { raw: 'XXXX RING ZAHL', expect: null },
  { raw: '', expect: null },
  { raw: '40', expect: null },
  { raw: 'LG 50', expect: null },            // ungueltige LG-Zahl
  { raw: 'KK 200', expect: null },           // unbekannte KK-Zahl
];

// ── Datensatz: Score-Recovery ──────────────────────────────────────────────
// "read" = die (fehlerhafte) Zahl aus OCR, "truth" = der echte Wert.
// kind: 'dropped' (fehlende Dezimalstelle, x10) | 'confusion' (1 Ziffer falsch)
//       | 'miss' (bewusst nicht rekonstruierbar -> ehrliche Obergrenze < 100%).
const SCORE_CASES = [
  // Dezimal-Shift (auch Baseline schafft das):
  { read: 40.5, truth: 405, discipline: 'lg40', isKK: false, kind: 'dropped' },
  { read: 57.0, truth: 570, discipline: 'lg60', isKK: false, kind: 'dropped' },
  { read: 56,   truth: 560, discipline: 'kk50', isKK: true,  kind: 'dropped' },
  { read: 55,   truth: 550, discipline: 'kk3x20', isKK: true, kind: 'dropped' },
  { read: 58.8, truth: 588, discipline: 'lg60', isKK: false, kind: 'dropped' },

  // Ziffern-Verwechslung (nur die verbesserte Schicht schafft das):
  { read: 890,   truth: 590,   discipline: 'kk50',   isKK: true,  kind: 'confusion' }, // 8->5
  { read: 690,   truth: 590,   discipline: 'kk50',   isKK: true,  kind: 'confusion' }, // 6->5
  { read: 896,   truth: 596,   discipline: 'kk50',   isKK: true,  kind: 'confusion' }, // 8->5
  { read: 988,   truth: 588,   discipline: 'kk100',  isKK: true,  kind: 'confusion' }, // 9->5
  { read: 980,   truth: 580,   discipline: 'kk3x20', isKK: true,  kind: 'confusion' }, // 9->5
  { read: 482.5, truth: 402.5, discipline: 'lg40',   isKK: false, kind: 'confusion' }, // 8->0
  { read: 982.5, truth: 382.5, discipline: 'lg40',   isKK: false, kind: 'confusion' }, // 9->3
  { read: 698.4, truth: 598.4, discipline: 'lg60',   isKK: false, kind: 'confusion' }, // 6->5
  { read: 988.0, truth: 588.0, discipline: 'lg60',   isKK: false, kind: 'confusion' }, // 9->5

  // Ehrliche Obergrenze: aus diesen Lesungen ist die Wahrheit nicht via
  // Einzel-Ziffer/Dezimal-Shift erreichbar.
  { read: 123, truth: 567, discipline: 'kk50', isKK: true,  kind: 'miss' },
  { read: 200, truth: 405, discipline: 'lg40', isKK: false, kind: 'miss' },
];

const near = (a, b, isKK) => Math.abs(a - b) <= (isKK ? 0.5 : 0.05);

// Kandidaten-Set einer Lesung: Originalwert + (optional) Dezimal-Shift +
// (optional) Ziffern-Verwechslung. `useConfusion=false` = Baseline.
function candidatesFor(c, useConfusion) {
  const set = [Number(c.read)];
  const dd = OCR.suggestDroppedDigit(c.read, c.discipline, c.isKK);
  if (dd != null) set.push(dd);
  if (useConfusion) {
    OCR.suggestConfusedReadings(c.read, c.discipline, c.isKK).forEach((v) => set.push(v));
  }
  return set;
}
const recovers = (c, useConfusion) =>
  candidatesFor(c, useConfusion).some((v) => near(v, c.truth, c.isKK));

// ── Auswertung ─────────────────────────────────────────────────────────────
console.log('OCR-Erkennungs-Benchmark\n');

let discOk = 0;
for (const c of DISCIPLINE_CASES) {
  if (parseDisciplineText(c.raw) === c.expect) discOk++;
}
const discAcc = discOk / DISCIPLINE_CASES.length;
console.log('Disziplin-Erkennung: ' + discOk + '/' + DISCIPLINE_CASES.length +
  ' (' + (discAcc * 100).toFixed(1) + '%)');

let baseOk = 0;
let impOk = 0;
for (const c of SCORE_CASES) {
  if (recovers(c, false)) baseOk++;
  if (recovers(c, true)) impOk++;
}
const baseAcc = baseOk / SCORE_CASES.length;
const impAcc = impOk / SCORE_CASES.length;
console.log('Score-Recovery  BASELINE   (nur Dezimal-Shift): ' + baseOk + '/' +
  SCORE_CASES.length + ' (' + (baseAcc * 100).toFixed(1) + '%)');
console.log('Score-Recovery  VERBESSERT (+ Ziffer-Konfus.) : ' + impOk + '/' +
  SCORE_CASES.length + ' (' + (impAcc * 100).toFixed(1) + '%)');
console.log('  -> Gewinn: +' + ((impAcc - baseAcc) * 100).toFixed(1) +
  ' Prozentpunkte durch Ziffern-Verwechslungs-Korrektur');

// ── Regressions-Schwellen ──────────────────────────────────────────────────
const THRESHOLDS = { discipline: 0.9, scoreImproved: 0.8 };
let failed = false;
const gate = (label, value, floor) => {
  const okFlag = value >= floor;
  console.log((okFlag ? '  + ' : '  x ') + label + ': ' + (value * 100).toFixed(1) +
    '% (Schwelle ' + (floor * 100).toFixed(0) + '%)');
  if (!okFlag) failed = true;
};
console.log('\nSchwellen:');
gate('Disziplin-Erkennung', discAcc, THRESHOLDS.discipline);
gate('Score-Recovery (verbessert)', impAcc, THRESHOLDS.scoreImproved);
// Die verbesserte Schicht muss die Baseline schlagen (sonst kein Mehrwert).
if (impAcc <= baseAcc) {
  console.log('  x Verbesserung gegenueber Baseline: keine (' +
    (impAcc * 100).toFixed(1) + '% <= ' + (baseAcc * 100).toFixed(1) + '%)');
  failed = true;
} else {
  console.log('  + Verbesserung gegenueber Baseline: +' +
    ((impAcc - baseAcc) * 100).toFixed(1) + ' Prozentpunkte');
}

console.log('\nOCR-Benchmark: ' + (failed ? 'FEHLGESCHLAGEN' : 'OK'));
process.exit(failed ? 1 : 0);
