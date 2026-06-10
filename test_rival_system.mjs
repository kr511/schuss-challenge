// Unit-Tests fuer rival-system.js (reine Logik, ohne Browser).
// Laedt das IIFE-Modul in einer Sandbox (window = leeres Objekt + Fake-Storage).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, 'rival-system.js'), 'utf8');

function makeFakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    _map: map
  };
}

function loadModule(windowStub = {}) {
  const factory = new Function('window', 'globalThis', src + '\nreturn window.RivalSystem;');
  return factory(windowStub, windowStub);
}

let pass = 0;
let fail = 0;
function assert(label, cond) {
  if (cond) { console.log('  PASS  ' + label); pass++; }
  else { console.log('  FAIL  ' + label); fail++; }
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_900_000_000_000;

// ─── Laden ohne DOM/Storage ───
const Rival = loadModule({});
assert('Modul laedt ohne DOM/localStorage', !!Rival && typeof Rival.applyDuel === 'function');

// ─── normalizeDifficulty ───
console.log('normalizeDifficulty:');
assert("'REAL ' -> real", Rival.normalizeDifficulty('REAL ') === 'real');
assert("'realistisch' -> real", Rival.normalizeDifficulty('realistisch') === 'real');
assert("'Anfänger' -> easy", Rival.normalizeDifficulty('Anfänger') === 'easy');
assert("'elite' -> elite", Rival.normalizeDifficulty('elite') === 'elite');
assert("'quatsch' -> null", Rival.normalizeDifficulty('quatsch') === null);
assert('undefined -> null', Rival.normalizeDifficulty(undefined) === null);

// ─── applyDuel ───
console.log('applyDuel:');
let state = { byDifficulty: {} };
state = Rival.applyDuel(state, { result: 'loss', difficulty: 'hard', discipline: 'lg40' }, NOW);
state = Rival.applyDuel(state, { result: 'loss', difficulty: 'hard', discipline: 'lg40' }, NOW + 1000);
state = Rival.applyDuel(state, { result: 'win', difficulty: 'hard', discipline: 'lg60' }, NOW + 2000);
state = Rival.applyDuel(state, { result: 'draw', difficulty: 'hard' }, NOW + 3000);

const hard = state.byDifficulty.hard;
assert('2 Niederlagen gezaehlt', hard.losses === 2);
assert('1 Sieg gezaehlt', hard.wins === 1);
assert('1 Unentschieden gezaehlt', hard.draws === 1);
assert('lastDiscipline = zuletzt gespielte (lg60 bleibt nach draw ohne discipline)', hard.lastDiscipline === 'lg60');
assert('History-Reihenfolge l,l,w,d', hard.history.map(h => h.r).join('') === 'llwd');
assert('lastPlayed aktualisiert', hard.lastPlayed === NOW + 3000);

const ignored = Rival.applyDuel(state, { result: 'win', difficulty: 'unbekannt' }, NOW);
assert('Unbekannte Schwierigkeit wird ignoriert', ignored === state);
const ignored2 = Rival.applyDuel(state, { result: 'dnf', difficulty: 'hard' }, NOW);
assert('Unbekanntes Ergebnis wird ignoriert', ignored2 === state);

let capState = { byDifficulty: {} };
for (let i = 0; i < 15; i++) {
  capState = Rival.applyDuel(capState, { result: 'win', difficulty: 'easy' }, NOW + i);
}
assert('History auf 10 Eintraege begrenzt', capState.byDifficulty.easy.history.length === 10);
assert('History behaelt die neuesten', capState.byDifficulty.easy.history[9].t === NOW + 14);

// ─── pickRival ───
console.log('pickRival:');
assert('Leerer State -> null', Rival.pickRival({ byDifficulty: {} }, NOW) === null);

let pick = { byDifficulty: {} };
pick = Rival.applyDuel(pick, { result: 'win', difficulty: 'easy' }, NOW - DAY);
pick = Rival.applyDuel(pick, { result: 'loss', difficulty: 'hard' }, NOW - 2 * DAY);
assert('Schlechteste Bilanz gewinnt (hard)', Rival.pickRival(pick, NOW) === 'hard');

pick = Rival.applyDuel(pick, { result: 'loss', difficulty: 'real' }, NOW - DAY / 2);
assert('Gleichstand -> zuletzt gespielte (real)', Rival.pickRival(pick, NOW) === 'real');

let stale = { byDifficulty: {} };
stale = Rival.applyDuel(stale, { result: 'loss', difficulty: 'elite' }, NOW - 30 * DAY);
assert('Nur alte Spiele -> Fallback auf zuletzt gespielte', Rival.pickRival(stale, NOW) === 'elite');

let leading = { byDifficulty: {} };
leading = Rival.applyDuel(leading, { result: 'win', difficulty: 'real' }, NOW - DAY);
assert('Nur Siege -> trotzdem Rivale (real)', Rival.pickRival(leading, NOW) === 'real');

// ─── Manuell gepinnter Rivale ───
console.log('setRival/pinned:');
let pinState = { byDifficulty: {}, pinned: 'easy' };
pinState = Rival.applyDuel(pinState, { result: 'loss', difficulty: 'hard' }, NOW - DAY);
assert('Pinned schlaegt schlechteste Bilanz', Rival.pickRival(pinState, NOW) === 'easy');
assert('applyDuel erhaelt pinned', pinState.pinned === 'easy');
assert('Pinned ohne Spiele -> trotzdem gewaehlt',
  Rival.pickRival({ byDifficulty: {}, pinned: 'elite' }, NOW) === 'elite');
assert('Ungueltiges pinned -> Automatik',
  Rival.pickRival({ byDifficulty: {}, pinned: 'quatsch' }, NOW) === null);

const winPin = { localStorage: makeFakeStorage() };
const RP = loadModule(winPin);
assert("setRival('hard') -> 'hard'", RP.setRival('hard') === 'hard');
assert('setRival persistiert', RP.getState().pinned === 'hard');
assert('setRival(null) -> Automatik', RP.setRival(null) === '' && RP.getState().pinned === '');
RP.recordDuel({ result: 'win', difficulty: 'easy' });
RP.setRival('elite');
assert('Bilanz bleibt beim Pinnen erhalten', RP.getState().byDifficulty.easy.wins === 1);

// ─── recordDuel + Storage-Roundtrip ───
console.log('recordDuel/Storage:');
const win1 = { localStorage: makeFakeStorage() };
const R1 = loadModule(win1);
assert('recordDuel speichert', R1.recordDuel({ result: 'loss', difficulty: 'elite', discipline: 'kk50' }) === true);
assert('Ungueltiges Duell -> false', R1.recordDuel({ result: 'loss', difficulty: 'nope' }) === false);
const stored = JSON.parse(win1.localStorage.getItem('sd_rival_state'));
assert('State liegt im Storage', stored.byDifficulty.elite.losses === 1);

const win2 = { localStorage: win1.localStorage };
const R2 = loadModule(win2);
const roundtrip = R2.getState();
assert('Roundtrip: zweiter Load liest Bilanz', roundtrip.byDifficulty.elite.losses === 1
  && roundtrip.byDifficulty.elite.lastDiscipline === 'kk50');

win1.localStorage.setItem('sd_rival_state', '{kaputt');
const R3 = loadModule({ localStorage: win1.localStorage });
assert('Kaputter Storage -> leerer State', R3.pickRival(R3.getState(), NOW) === null);

// ─── UI-Feature-Flag (Standard: aus) ───
console.log('UI-Flag:');
assert('Ohne Storage: UI aus', loadModule({}).uiEnabled() === false);
const winFlag = { localStorage: makeFakeStorage() };
const RF = loadModule(winFlag);
assert('Default: UI aus', RF.uiEnabled() === false);
assert('enableUI schaltet ein', RF.enableUI() === true && RF.uiEnabled() === true);
assert('Flag liegt im Storage', winFlag.localStorage.getItem('sd_ff_rival_ui') === '1');
assert('disableUI schaltet aus', RF.disableUI() === false && RF.uiEnabled() === false);

console.log(`Summary: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
