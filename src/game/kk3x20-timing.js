/* ─── KK 3×20 TIMING CONFIGURATION ───────────
 *
 * Zeiten und Übergänge für KK-3×20-Disziplin (Kniend/Liegend/Stehend).
 * Abhängigkeiten: G (app.js).
 */

const KK3X20_CFG = {
  probeSecs: 10 * 60,
  transitionPhases: [
    { secs: 10 * 60, label: 'Uebergang Kniend -> Liegend' },
    { secs: 15 * 60, label: 'Uebergang Liegend -> Stehend' }
  ],
  positionTimings: [
    { baseSecs: 72, min: 58, max: 88 },
    { baseSecs: 36, min: 28, max: 48 },
    { baseSecs: 84, min: 68, max: 102 }
  ]
};

function clearBattleTimers() {
  if (G._botStartTimeout) { clearTimeout(G._botStartTimeout); G._botStartTimeout = null; }
  if (G._botInterval) { clearTimeout(G._botInterval); G._botInterval = null; }
  if (G._timerInterval) { clearInterval(G._timerInterval); G._timerInterval = null; }
}

function getKK3x20TimingByPos() {
  const idx = Math.max(0, Math.min(KK3X20_CFG.positionTimings.length - 1, G.posIdx || 0));
  return KK3X20_CFG.positionTimings[idx];
}

function beginKK3x20Transition(nextPosIdx) {
  const phase = KK3X20_CFG.transitionPhases[nextPosIdx - 1];
  if (!phase) return;
  G.transitionSecsLeft = phase.secs;
  G.transitionLabel = phase.label;
}
