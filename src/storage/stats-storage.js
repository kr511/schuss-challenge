/* ─── STATS STORAGE ────────────────────────
 *
 * Wrapper für Game/Weapon-Stats in localStorage.
 * Verwendet StorageManager + scheduleCloudSync (in app.js definiert).
 */

function loadGameStats() {
  try { return JSON.parse(localStorage.getItem('sd_gamestats') || '{}'); }
  catch (e) { return {}; }
}

function saveGameStats(s) {
  StorageManager.set('gamestats', s);
  scheduleCloudSync('gamestats_changed');
}

function loadWeaponStats(w) {
  try { return JSON.parse(localStorage.getItem(`sd_wstats_${w}`) || '{"wins":0,"losses":0,"draws":0}'); }
  catch (e) { return { wins: 0, losses: 0, draws: 0 }; }
}

function saveWeaponStats(w, s) {
  StorageManager.set(`wstats_${w}`, s);
  scheduleCloudSync(`weapon_stats_${w}`);
}
