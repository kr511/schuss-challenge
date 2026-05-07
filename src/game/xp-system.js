/* ─── XP / RANK FUNCTIONS ───────────────────
 *
 * Globale XP- und Rang-Funktionen. Verwendet folgende Globals (definiert in app.js):
 *   G                    — Game/Player State
 *   RANKS, XP_PER_WIN    — XP-Konstanten (in app.js, da SC_XP-abhängig)
 *   SC_XP                — Optionales SchussChallenge.game.xp Modul
 *   StorageManager       — Storage-Abstraktion
 *   scheduleCloudSync    — Sync-Trigger (in app.js)
 *   loadWeaponStats / saveWeaponStats — Waffen-Stats (in app.js)
 *   updateSchuetzenpass  — UI-Update (in app.js)
 *   spawnConfetti, triggerHaptic, Sounds — UI-Effekte
 *
 * Diese Funktionen werden zur Aufruf-Zeit aufgelöst, nicht zur Definitions-Zeit.
 */

function getRank(xp) {
  if (SC_XP && typeof SC_XP.getRankInfo === 'function') {
    return SC_XP.getRankInfo(xp);
  }
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].min) return { rank: RANKS[i], idx: i };
  }
  return { rank: RANKS[0], idx: 0 };
}

function loadXP() {
  G.xp = StorageManager.get('xp', 0) || 0;
}

function saveXP() {
  StorageManager.set('xp', G.xp);
  scheduleCloudSync('xp_changed');
}

function awardXP(diff) {
  const gained = XP_PER_WIN[diff] || 10;
  const { idx: oldIdx } = getRank(G.xp);
  G.xp += gained;
  saveXP();

  if (G.weapon) {
    const ws = loadWeaponStats(G.weapon);
    ws.xp = (ws.xp || 0) + gained;
    saveWeaponStats(G.weapon, ws);
  }

  updateSchuetzenpass();
  showXPPop(gained);

  // Daily Bonus erst beim 1. Duell-Abschluss prüfen
  if (typeof initDailyLoginRewards === 'function') initDailyLoginRewards();

  // Rank Check
  const { rank: newRank, idx: newIdx } = getRank(G.xp);
  if (newIdx > oldIdx) {
    showLevelUp(newRank);
  } else {
    if (typeof Sounds !== 'undefined') setTimeout(() => Sounds.xp(), 500);
  }

  scheduleCloudSync('profile_changed');
  return gained;
}

function awardFlatXP(amount) {
  const gained = Math.max(0, Math.floor(Number(amount) || 0));
  if (gained <= 0) return 0;

  const { idx: oldIdx } = getRank(G.xp);
  G.xp += gained;
  saveXP();

  if (G.weapon) {
    const ws = loadWeaponStats(G.weapon);
    ws.xp = (ws.xp || 0) + gained;
    saveWeaponStats(G.weapon, ws);
  }

  updateSchuetzenpass();
  showXPPop(gained);

  const { rank: newRank, idx: newIdx } = getRank(G.xp);
  if (newIdx > oldIdx) {
    showLevelUp(newRank);
  } else if (typeof Sounds !== 'undefined') {
    setTimeout(() => Sounds.xp(), 300);
  }

  scheduleCloudSync('profile_changed');
  return gained;
}

function showLevelUp(rank) {
  const overlay = document.getElementById('levelUpOverlay');
  const badge = document.getElementById('luBadge');
  const name = document.getElementById('luRankName');
  if (!overlay) return;

  badge.textContent = rank.icon;
  name.textContent = rank.name;
  overlay.classList.add('active');

  spawnConfetti();
  triggerHaptic();

  if (typeof Sounds !== 'undefined') Sounds.levelUp();
}

window.closeLevelUp = function () {
  const overlay = document.getElementById('levelUpOverlay');
  if (overlay) overlay.classList.remove('active');
};

function showXPPop(amount) {
  const el = document.createElement('div');
  el.className = 'xp-pop';
  el.textContent = '+' + amount + ' XP';
  el.style.left = (Math.random() * 40 + 30) + '%';
  el.style.top = '35%';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}
