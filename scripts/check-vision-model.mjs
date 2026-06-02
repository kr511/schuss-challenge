#!/usr/bin/env node
/**
 * Vision-Modell-Check
 *
 * Validiert das ausgelieferte YOLO-Detektionsmodell gegen die zentrale
 * Config (VISION_MODEL in image-compare-brain.js). Faengt einen kaputten
 * Modell-Tausch ab: fehlende/umbenannte Shards, Klassen-Mismatch,
 * unplausible Eingabegroesse. Siehe docs/vision-model-upgrade.md.
 *
 * Nutzung: node scripts/check-vision-model.mjs   (bzw. npm run check:vision-model)
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let errors = 0;
let warnings = 0;
const fail = (m) => { console.error('  x ' + m); errors++; };
const warn = (m) => { console.warn('  ! ' + m); warnings++; };
const ok = (m) => console.log('  + ' + m);

console.log('Vision-Modell-Check');

// 1) Zentrale Config aus image-compare-brain.js in einer Sandbox laden.
function loadVisionConfig() {
  const src = readFileSync(join(root, 'image-compare-brain.js'), 'utf8');
  const win = {};
  // Die Datei macht: window.ImageCompareBrain = (function(){...})();
  new Function('window', src + '\nreturn window.ImageCompareBrain;')(win);
  return win.ImageCompareBrain && win.ImageCompareBrain.VISION_MODEL;
}

let cfg;
try {
  cfg = loadVisionConfig();
} catch (e) {
  fail('Konnte image-compare-brain.js nicht auswerten: ' + e.message);
  process.exit(1);
}
if (!cfg) {
  fail('VISION_MODEL Config fehlt in image-compare-brain.js');
  process.exit(1);
}
ok('Config geladen (Version ' + cfg.version + ', Klassen: ' + (cfg.classes || []).join(', ') + ')');

// 2) model.json vorhanden + gueltiges graph-model.
const modelRel = String(cfg.path || './model.json').replace(/^\.\//, '');
const modelFile = join(root, modelRel);
if (!existsSync(modelFile)) {
  fail('Modell-Datei fehlt: ' + modelRel);
  process.exit(1);
}
let model;
try {
  model = JSON.parse(readFileSync(modelFile, 'utf8'));
} catch (e) {
  fail('model.json ist kein gueltiges JSON: ' + e.message);
  process.exit(1);
}
if (model.format === 'graph-model') ok('Format: graph-model');
else warn('Unerwartetes model.json Format: ' + model.format);

// 3) Alle referenzierten Weight-Shards muessen auf der Platte liegen.
const manifest = Array.isArray(model.weightsManifest) ? model.weightsManifest : [];
const paths = manifest.flatMap((g) => (Array.isArray(g.paths) ? g.paths : []));
if (!paths.length) {
  fail('Keine Weight-Shards im weightsManifest gefunden');
} else {
  for (const p of paths) {
    if (existsSync(join(root, p))) ok('Shard vorhanden: ' + p);
    else fail('Shard fehlt: ' + p);
  }
}

// 4) Klassen-Abgleich mit metadata.yaml (Ultralytics-Export), falls vorhanden.
const metaFile = join(root, 'metadata.yaml');
if (existsSync(metaFile)) {
  const meta = readFileSync(metaFile, 'utf8');
  const block = meta.match(/names:\s*([\s\S]*?)(?:\nargs:|\n[A-Za-z_]+:|$)/);
  const names = [];
  if (block) {
    const re = /^\s*(\d+):\s*(.+?)\s*$/gm;
    let mm;
    while ((mm = re.exec(block[1])) !== null) names[Number(mm[1])] = mm[2];
  }
  if (names.length) {
    const expected = (cfg.classes || []).join(',');
    const actual = names.join(',');
    if (expected === actual) ok('Klassen stimmen mit metadata.yaml ueberein: ' + actual);
    else fail('Klassen-Mismatch! Config=[' + expected + '] metadata.yaml=[' + actual + ']');
  } else {
    warn('Konnte "names" aus metadata.yaml nicht lesen');
  }
} else {
  warn('metadata.yaml nicht gefunden - Klassen-Abgleich uebersprungen');
}

// 5) Eingabegroesse plausibel.
if (Number.isFinite(cfg.inputSize) && cfg.inputSize >= 64 && cfg.inputSize <= 1280) {
  ok('inputSize: ' + cfg.inputSize);
} else {
  warn('Ungewoehnliche inputSize: ' + cfg.inputSize);
}

console.log('');
const summary = errors ? errors + ' Fehler' : 'OK';
console.log('Vision-Modell-Check: ' + summary + (warnings ? ', ' + warnings + ' Warnung(en)' : ''));
process.exit(errors ? 1 : 0);
