import './battle-balance.js';

const { BattleBalance } = globalThis;

if (!BattleBalance) {
  console.error('BattleBalance module not loaded.');
  process.exit(1);
}

const report = BattleBalance.runBalanceVerification({ sampleCount: 120, seedPrefix: 'node-verify' });

for (const combo of report.combos) {
  const target = combo.target.floor !== undefined
    ? `>=${combo.target.floor}`
    : `${combo.target.min}-${combo.target.max}`;
  console.log(
    `${combo.discipline.padEnd(6)} ${combo.difficulty.padEnd(5)} avg=${String(combo.average).padStart(6)} min=${String(combo.minimum).padStart(6)} max=${String(combo.maximum).padStart(6)} target=${target}`
  );
}

if (!report.ok) {
  console.error('\nBalance verification failed:');
  for (const failure of report.failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nBalance verification passed.');
