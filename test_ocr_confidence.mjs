// Unit-Tests fuer src/vision/ocr-confidence.js (reine Logik, ohne Browser).
// Laedt das IIFE-Modul in einer Sandbox (window = leeres Objekt).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, 'src/vision/ocr-confidence.js'), 'utf8');

const factory = new Function('window', src + '\nreturn window.OCRConfidence;');
const OCR = factory({});

let pass = 0;
let fail = 0;
function assert(label, cond) {
  if (cond) { console.log('  PASS  ' + label); pass++; }
  else { console.log('  FAIL  ' + label); fail++; }
}
function assertEq(label, actual, expected) {
  assert(label + ' -> ' + JSON.stringify(actual), actual === expected);
}
function near(a, b, eps = 1e-6) { return Math.abs(a - b) <= eps; }

if (!OCR) {
  console.error('FAIL: OCRConfidence wurde nicht exportiert');
  process.exit(1);
}

console.log('getTypicalRange:');
assertEq('lg40 max', OCR.getTypicalRange('lg40').max, 436);
assertEq('kk50 isInteger', OCR.getTypicalRange('kk50').isInteger, true);
assert('unbekannt -> default', OCR.getTypicalRange('xyz').max === OCR.getTypicalRange().max);

console.log('confidenceTier:');
assertEq('0.9 -> high', OCR.confidenceTier(0.9), 'high');
assertEq('0.7 -> medium', OCR.confidenceTier(0.7), 'medium');
assertEq('0.4 -> low', OCR.confidenceTier(0.4), 'low');

console.log('calibrateConfidence:');
// Gute Aufnahme, typischer Wert, mehrere uebereinstimmende Passes -> hoch
const good = OCR.calibrateConfidence(0.8, {
  value: 400, discipline: 'lg40', isKK: false,
  quality: { blur: 40, rotation: 0, brightness: 50, isUsable: true }, sourceCount: 3
});
assert('gut -> tier high', good.tier === 'high');
assert('gut -> confidence >= raw', good.confidence >= 0.8);

// Unscharfes Foto senkt die Konfidenz + Warnung
const blurry = OCR.calibrateConfidence(0.8, {
  value: 400, discipline: 'lg40', isKK: false,
  quality: { blur: 10, rotation: 0, brightness: 50 }, sourceCount: 1
});
assert('blur -> confidence < raw', blurry.confidence < 0.8);
assert('blur -> Warnung blur', blurry.warnings.some((w) => w.code === 'blur'));

// Wert ueber Maximum -> starke Strafe + Warnung
const tooHigh = OCR.calibrateConfidence(0.9, {
  value: 700, discipline: 'lg60', isKK: false, quality: {}, sourceCount: 1
});
assert('above-max -> Warnung', tooHigh.warnings.some((w) => w.code === 'above-max'));
assert('above-max -> confidence < raw', tooHigh.confidence < 0.9);

// KK mit Dezimalstelle -> non-integer Warnung
const nonInt = OCR.calibrateConfidence(0.8, {
  value: 450.5, discipline: 'kk50', isKK: true, quality: {}, sourceCount: 1
});
assert('kk non-integer -> Warnung', nonInt.warnings.some((w) => w.code === 'non-integer'));

console.log('suggestDroppedDigit:');
assertEq('lg60 57 -> 570', OCR.suggestDroppedDigit(57, 'lg60', false), 570);
assert('lg40 40.5 -> 405', near(OCR.suggestDroppedDigit(40.5, 'lg40', false), 405));
assertEq('kk50 50 -> 500', OCR.suggestDroppedDigit(50, 'kk50', true), 500);
assertEq('lg40 400 (typisch) -> null', OCR.suggestDroppedDigit(400, 'lg40', false), null);
assertEq('lg60 70 -> 700 ausserhalb -> null', OCR.suggestDroppedDigit(70, 'lg60', false), null);
assertEq('lg40 5 -> 50 zu niedrig -> null', OCR.suggestDroppedDigit(5, 'lg40', false), null);

console.log('');
console.log('Summary: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
