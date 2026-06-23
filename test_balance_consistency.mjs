/**
 * Drift-Guard: Die Balance-Targets existieren bewusst zweimal —
 *   - src/bot/battle-balance.js  (IIFE/global, klassisches Script in index.html,
 *     volle Engine inkl. Schussplan-Generierung; von verify-balance.js geprueft)
 *   - src/bot/battleBalance.js   (ES-Modul, schlanke Tabelle + Info-Helfer,
 *     via src/main.js -> window.SchussChallenge.bot.battleBalance)
 *
 * Dieser Test stellt sicher, dass beide Quellen NIE auseinanderlaufen.
 * Wer Targets aendert, muss beide Dateien anfassen — sonst schlaegt dieser
 * Test fehl.
 */
import assert from 'node:assert/strict';

import './src/bot/battle-balance.js';
import {
  BALANCE_TARGETS as MODULE_TARGETS,
  DIFFICULTY_ORDER as MODULE_ORDER,
  getBalanceTarget as moduleGetBalanceTarget
} from './src/bot/battleBalance.js';

const BB = globalThis.BattleBalance;
assert.ok(BB, 'globalThis.BattleBalance fehlt (battle-balance.js nicht geladen?)');

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('  PASS ' + name);
}

console.log('Balance-Konsistenz: battle-balance.js (IIFE) vs. battleBalance.js (ESM)');

check('DIFFICULTY_ORDER identisch', () => {
  assert.deepEqual([...MODULE_ORDER], [...BB.DIFFICULTY_ORDER]);
});

check('Gleiche Disziplinen in BALANCE_TARGETS', () => {
  assert.deepEqual(
    Object.keys(MODULE_TARGETS).sort(),
    Object.keys(BB.BALANCE_TARGETS).sort()
  );
});

check('BALANCE_TARGETS Werte identisch', () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(MODULE_TARGETS)),
    JSON.parse(JSON.stringify(BB.BALANCE_TARGETS))
  );
});

check('getBalanceTarget liefert in beiden Implementierungen dasselbe', () => {
  for (const discipline of Object.keys(MODULE_TARGETS)) {
    for (const difficulty of MODULE_ORDER) {
      assert.deepEqual(
        JSON.parse(JSON.stringify(moduleGetBalanceTarget(discipline, difficulty))),
        JSON.parse(JSON.stringify(BB.getBalanceTarget(discipline, difficulty))),
        `${discipline}/${difficulty}`
      );
    }
  }
});

check('Unbekannte Disziplin/Schwierigkeit -> null (beide)', () => {
  assert.equal(moduleGetBalanceTarget('lp40', 'easy'), null);
  assert.equal(BB.getBalanceTarget('lp40', 'easy') ?? null, null);
  assert.equal(moduleGetBalanceTarget('lg40', 'impossible'), null);
});

console.log(`Summary: ${passed} passed, 0 failed`);
