// Unit tests for OCR discipline parser (parseDisciplineText)
// Runs without browser/Tesseract — only the pure regex logic.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'src/vision/image-compare.js'), 'utf8');

// Extract the parseDisciplineText function via regex (it is local to the IIFE).
const match = source.match(/function parseDisciplineText\(rawText\) \{[\s\S]*?\n  \}\n/);
if (!match) {
  console.error('FAIL: could not extract parseDisciplineText from image-compare.js');
  process.exit(1);
}

const fnSource = match[0];
const fn = new Function(fnSource + '\nreturn parseDisciplineText;')();

let pass = 0;
let fail = 0;
function assertEq(label, actual, expected) {
  if (actual === expected) {
    console.log('  PASS  ' + label + ' -> ' + JSON.stringify(actual));
    pass++;
  } else {
    console.log('  FAIL  ' + label + ' expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    fail++;
  }
}

console.log('parseDisciplineText:');

// Standard formats
assertEq('LG 40', fn('LG 40'), 'lg40');
assertEq('LG40', fn('LG40'), 'lg40');
assertEq('LG-40', fn('LG-40'), 'lg40');
assertEq('LG 60', fn('LG 60'), 'lg60');
assertEq('KK 50', fn('KK 50'), 'kk50');
assertEq('KK 100', fn('KK 100'), 'kk100');
assertEq('KK 3x20', fn('KK 3x20'), 'kk3x20');
assertEq('KK3X20', fn('KK3X20'), 'kk3x20');
assertEq('KK 3 X 20', fn('KK 3 X 20'), 'kk3x20');

// With surrounding garbage (real OCR scenarios)
assertEq('header garbage', fn('SCHIESSEN  LG 40  STAND 3'), 'lg40');
assertEq('lowercase ok', fn('lg 40'), 'lg40');

// OCR confusion: O→0, I→1
assertEq('LG 4O (O instead of 0)', fn('LG 4O'), 'lg40');
assertEq('LG 6I (I-as-1 not valid for 60)', fn('LG 60'), 'lg60');

// LCD confusion: G→6 in "LG" (gated by valid discipline number)
assertEq('L6 40 (G-as-6)', fn('L6 40'), 'lg40');
assertEq('L640 (G-as-6, no space)', fn('L640'), 'lg40');
assertEq('L6 60 (G-as-6)', fn('L6 60'), 'lg60');
// LCD confusion: X→K in 3x20 separator
assertEq('KK 3K20 (X-as-K)', fn('KK 3K20'), 'kk3x20');
assertEq('KK 3 K 20 (X-as-K, spaced)', fn('KK 3 K 20'), 'kk3x20');

// Negative cases
assertEq('garbage only', fn('XXXX RING ZAHL'), null);
assertEq('empty', fn(''), null);
assertEq('null', fn(null), null);
assertEq('no discipline marker', fn('40'), null);
assertEq('wrong discipline number', fn('LG 50'), null);
assertEq('KK 200 unknown', fn('KK 200'), null);

console.log('');
console.log('Summary: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
