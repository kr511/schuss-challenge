#!/usr/bin/env node
/**
 * Modell-Drop-in
 *
 * Uebernimmt einen fertigen TFJS-Export (aus notebooks/train-vision-model.ipynb)
 * automatisch ins Repo – inkl. der fehleranfaelligen Handarbeit:
 *   1) model.json + alle referenzierten Shards + metadata.yaml ins Repo-Root kopieren
 *   2) veraltete Shards entfernen (andere Anzahl als der neue weightsManifest)
 *   3) VISION_MODEL.version (image-compare-brain.js) hochzaehlen
 *   4) Cache-Busting anheben (sw.js CACHE_VERSION + ?v= in index.html)
 *   5) `check:vision-model` ausfuehren
 *
 * Danach nur noch pruefen, committen, pushen.
 *
 * Nutzung:
 *   node scripts/apply-model-export.mjs <pfad/zum/export-ordner>
 *   (Ordner mit model.json + group1-shard*.bin [+ metadata.yaml],
 *    z. B. das entpackte vision_model_dropin.zip)
 */

import {
  readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync, rmSync, statSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const log = (m) => console.log('  ' + m);
const die = (m) => { console.error('FEHLER: ' + m); process.exit(1); };

const srcDir = process.argv[2];
if (!srcDir) die('Bitte den Export-Ordner angeben: node scripts/apply-model-export.mjs <ordner>');
const exportDir = resolve(srcDir); // handhabt absolute UND relative Pfade korrekt
if (!existsSync(exportDir) || !statSync(exportDir).isDirectory()) {
  die('Export-Ordner nicht gefunden: ' + srcDir);
}

console.log('Modell-Drop-in aus:', exportDir, '\n');

// 1) model.json validieren + Shard-Liste aus dem weightsManifest lesen.
const newModelPath = join(exportDir, 'model.json');
if (!existsSync(newModelPath)) die('model.json fehlt im Export-Ordner');
let model;
try {
  model = JSON.parse(readFileSync(newModelPath, 'utf8'));
} catch (e) {
  die('model.json ist kein gueltiges JSON: ' + e.message);
}
const manifest = Array.isArray(model.weightsManifest) ? model.weightsManifest : [];
const newShards = manifest.flatMap((g) => (Array.isArray(g.paths) ? g.paths : []));
if (!newShards.length) die('Keine Shards im weightsManifest der neuen model.json');

// Alle referenzierten Shards muessen im Export liegen.
for (const shard of newShards) {
  if (!existsSync(join(exportDir, shard))) die('Referenzierter Shard fehlt im Export: ' + shard);
}

// 2) Veraltete Shards im Root sammeln (vor dem Kopieren).
const oldShards = readdirSync(root).filter((f) => /^group1-shard.*\.bin$/.test(f));
const stale = oldShards.filter((f) => !newShards.includes(f));

console.log('Kopiere Modell-Dateien ins Repo-Root:');
copyFileSync(newModelPath, join(root, 'model.json'));
log('+ model.json');
for (const shard of newShards) {
  copyFileSync(join(exportDir, shard), join(root, shard));
  log('+ ' + shard);
}
const metaSrc = join(exportDir, 'metadata.yaml');
if (existsSync(metaSrc)) {
  copyFileSync(metaSrc, join(root, 'metadata.yaml'));
  log('+ metadata.yaml');
} else {
  log('! metadata.yaml nicht im Export – Klassen-Abgleich ggf. uebersprungen');
}

if (stale.length) {
  console.log('Entferne veraltete Shards:');
  for (const f of stale) { rmSync(join(root, f)); log('- ' + f); }
}

// 3)–4) Versionen/Cache-Busting anheben. Jeweils tolerant: nur warnen, nicht abbrechen.
const bumpFile = (file, label, fn) => {
  const p = join(root, file);
  if (!existsSync(p)) { log('! ' + file + ' nicht gefunden – ' + label + ' uebersprungen'); return; }
  const before = readFileSync(p, 'utf8');
  const after = fn(before);
  if (after && after !== before) { writeFileSync(p, after); log('+ ' + label); }
  else log('! ' + label + ' nicht angepasst (Muster nicht gefunden) – bitte manuell pruefen');
};

console.log('Versionen / Cache-Busting:');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '.'); // YYYY.MM.DD

// VISION_MODEL.version (erste version:'...' in der Datei == VISION_MODEL).
bumpFile('image-compare-brain.js', 'VISION_MODEL.version -> ' + stamp + '-monitor', (s) =>
  s.replace(/(version:\s*')[^']*(')/, `$1${stamp}-monitor$2`));

// sw.js: sc-shell-vN -> v(N+1)
bumpFile('sw.js', 'CACHE_VERSION', (s) =>
  s.replace(/(CACHE_VERSION\s*=\s*'sc-shell-v)(\d+)(')/, (_m, a, n, b) => a + (Number(n) + 1) + b));

// index.html: ?v=X.Y der Vision-Skripte hochzaehlen (Minor).
const bumpQuery = (s, fileName) =>
  s.replace(new RegExp('(' + fileName.replace(/[.]/g, '\\$&') + '\\?v=)(\\d+)\\.(\\d+)'),
    (_m, a, maj, min) => a + maj + '.' + (Number(min) + 1));
bumpFile('index.html', 'index.html ?v= (Vision-Skripte)', (s) =>
  bumpQuery(bumpQuery(s, 'image-compare-brain.js'), 'v2-vision-engine.js'));

// 5) Validieren.
console.log('\nValidierung (check:vision-model):');
try {
  execFileSync('node', [join(root, 'scripts/check-vision-model.mjs')], { stdio: 'inherit' });
} catch (_e) {
  die('check:vision-model ist fehlgeschlagen – bitte Ausgabe oben pruefen.');
}

console.log('\nDrop-in fertig. Naechste Schritte:');
console.log('  1) git diff durchsehen  (Modell-Dateien + Versionen)');
console.log('  2) npm test');
console.log('  3) committen & pushen');
