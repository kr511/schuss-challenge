/* ─── UI STATE SYNCHRONIZATION ──────────────
 *
 * Funktionen zum Aktualisieren von DOM-Elementen nach Spielzustand-Änderungen.
 * Abhängigkeiten: getRank (xp-system.js), DOM (app.js), G (app.js), localStorage.
 */

function updateProfileMenu() {
  if (!DOM.profileMenu) return;
  const { rank } = getRank(G.xp);
  const bestStreak = Math.max(
    parseInt(localStorage.getItem('sd_lg_best') || '0') || 0,
    parseInt(localStorage.getItem('sd_kk_best') || '0') || 0
  );
  if (DOM.profileIcon) DOM.profileIcon.textContent = rank.icon;
  if (DOM.profileRank) DOM.profileRank.textContent = rank.name;
  if (DOM.pmRank) DOM.pmRank.textContent = rank.icon + ' ' + rank.name;
  if (DOM.pmLevel) DOM.pmLevel.textContent = (getRank(G.xp).idx + 1);
  if (DOM.pmXP) DOM.pmXP.textContent = G.xp;
  if (DOM.pmStreak) DOM.pmStreak.textContent = bestStreak > 0 ? '🔥 ' + bestStreak : '–';
}

function updateXPCorner() {
  const corner = DOM.streakCorner;
  if (!corner) return;

  const { rank, idx } = getRank(G.xp);

  corner.classList.remove('silver', 'gold', 'red', 'purple');
  if (idx >= 5) corner.classList.add('purple');
  else if (idx >= 4) corner.classList.add('red');
  else if (idx >= 3) corner.classList.add('gold');
  else if (idx >= 2) corner.classList.add('silver');

  if (DOM.scFire) DOM.scFire.textContent = rank.icon;
  if (DOM.scN) DOM.scN.textContent = G.xp;
  if (DOM.scLbl) DOM.scLbl.textContent = 'XP';
}
