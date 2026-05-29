/* ─── STREAK MANAGEMENT ──────────────────────
 *
 * Siegesserie-Tracking und -Persistierung pro Waffe.
 * Abhängigkeiten: STREAK_CACHE (app.js), StorageManager,
 * G, scheduleCloudSync, updateXPCorner (ui-sync.js).
 */

function loadAllStreaks() {
  ['lg', 'kk'].forEach(w => loadStreakForWeapon(w));
  updateXPCorner();
}

function loadStreakForWeapon(w) {
  const streak = StorageManager.get(`${w}_streak`, 0);
  const best = StorageManager.get(`${w}_best`, 0);
  STREAK_CACHE[w] = { streak, best };
}

function updateStreakCorner() {
  updateXPCorner();
}

function updateWinStreak(won) {
  const w = G.weapon;
  let { streak, best } = STREAK_CACHE[w] || { streak: 0, best: 0 };

  if (won) {
    streak++;
  } else {
    streak = 0;
  }

  const newBest = Math.max(streak, best);
  StorageManager.set(`${w}_streak`, streak);
  StorageManager.set(`${w}_best`, newBest);
  scheduleCloudSync(`streak_${w}`);

  STREAK_CACHE[w] = { streak, best: newBest };
  G.streak = streak;
}
