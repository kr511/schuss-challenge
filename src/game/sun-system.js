/* ─── SUN SYSTEM ────────────────────────────
 *
 * Achievement-System: SUN_ACHIEVEMENTS-Definition, checkSunAchievements,
 * renderSunGrid und zugehörige Helfer. Abhängigkeiten: stats-storage.js,
 * G, STREAK_CACHE, Sounds/Haptics, syncAchievementWithBackend (app.js).
 */

function getBestStreak() {
  const lgBest = STREAK_CACHE.lg?.best || 0;
  const kkBest = STREAK_CACHE.kk?.best || 0;
  return Math.max(lgBest, kkBest);
}

const SUN_ACHIEVEMENTS = [
  // Basic
  { id: 'first_game', group: 'basic', icon: '🎯', name: 'Erster Schuss', desc: '1 Duell gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 1 },
  { id: 'first_win', group: 'basic', icon: '🏆', name: 'Erster Sieg', desc: '1 Duell gewonnen', check: () => (loadGameStats().wins || 0) >= 1 },
  { id: 'five_games', group: 'basic', icon: '🔢', name: 'Fünf Duelle', desc: '5 Spiele gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 5 },
  { id: 'xp_100', group: 'basic', icon: '⭐', name: '100 XP', desc: '100 XP verdient', check: () => G.xp >= 100 },
  { id: 'streak_3', group: 'basic', icon: '🔥', name: 'Heiß!', desc: '3er Siegesserie', check: () => getBestStreak() >= 3 },
  // Battle
  { id: 'beat_hard', group: 'battle', icon: '💀', name: 'Harter Brocken', desc: 'Elite-Bot besiegt', check: () => !!(localStorage.getItem('sd_beat_hard')) },
  { id: 'beat_elite', group: 'battle', icon: '💫', name: 'Legende', desc: 'Profi-Bot besiegt', check: () => !!(localStorage.getItem('sd_beat_elite')) },
  { id: 'ten_wins', group: 'battle', icon: '🥇', name: '10 Siege', desc: '10 Duelle gewonnen', check: () => (loadGameStats().wins || 0) >= 10 },
  { id: 'twenty_five_wins', group: 'battle', icon: '🎖️', name: '25 Siege', desc: '25 Duelle gewonnen', check: () => (loadGameStats().wins || 0) >= 25 },
  { id: 'both_weapons', group: 'battle', icon: '⚔️', name: 'Allrounder', desc: 'LG & KK je 1 Sieg', check: () => (loadWeaponStats('lg').wins || 0) >= 1 && (loadWeaponStats('kk').wins || 0) >= 1 },
  { id: 'streak_7', group: 'battle', icon: '🌟', name: 'Unaufhaltsam', desc: '7er Siegesserie', check: () => getBestStreak() >= 7 },
  // Master
  { id: 'xp_500', group: 'master', icon: '🏅', name: 'Meister', desc: '500 XP verdient', check: () => G.xp >= 500 },
  { id: 'xp_1000', group: 'master', icon: '🏆', name: 'Großmeister', desc: '1000 XP verdient', check: () => G.xp >= 1000 },
  { id: 'streak_14', group: 'master', icon: '🔥🔥', name: '14er Streak', desc: '14er Siegesserie', check: () => getBestStreak() >= 14 },
  { id: 'fifty_games', group: 'master', icon: '🎖️', name: '50 Duelle', desc: '50 Spiele gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 50 },
  { id: 'one_hundred_games', group: 'master', icon: '💯', name: 'Hundert Duelle', desc: '100 Spiele gespielt', check: () => (loadGameStats().wins || 0) + (loadGameStats().losses || 0) + (loadGameStats().draws || 0) >= 100 },
  { id: 'xp_2000', group: 'master', icon: '💫', name: 'Legende', desc: '2000 XP – Legendenstatus', check: () => G.xp >= 2000 },
  { id: 'xp_5000', group: 'master', icon: '👑', name: 'König', desc: '5000 XP – Wahre Größe', check: () => G.xp >= 5000 },
];

function checkSunAchievements() {
  const earned = getSunEarned();
  let newEarned = false;
  SUN_ACHIEVEMENTS.forEach(a => {
    if (!earned[a.id] && a.check()) {
      earned[a.id] = Date.now();
      newEarned = true;
      showSunPop(a);
      // Supabase Worker API: Achievement persistieren (fire-and-forget)
      syncAchievementWithBackend(a.id);
    }
  });
  if (newEarned) saveSunEarned(earned);
}

function getSunEarned() {
  try { return JSON.parse(localStorage.getItem('sd_sun') || '{}'); }
  catch (e) { return {}; }
}

function saveSunEarned(e) {
  try { localStorage.setItem('sd_sun', JSON.stringify(e)); } catch (_) { }
}

function showSunPop(achievement) {
  if (typeof Sounds !== 'undefined') Sounds.achievement();
  if (typeof Haptics !== 'undefined') Haptics.achievement();
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
        background:linear-gradient(135deg,rgba(60,50,10,.95),rgba(80,70,15,.95));
        border:1px solid rgba(200,160,40,.5);border-radius:12px;padding:12px 18px;
        display:flex;align-items:center;gap:10px;z-index:9999;
        box-shadow:0 4px 24px rgba(0,0,0,.6);animation:sheetUp .3s ease;
        font-family:'Outfit',sans-serif;max-width:280px;`;
  el.innerHTML = `<span style="font-size:1.6rem">${achievement.icon}</span>
        <div><div style="font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(220,180,80,.6);font-weight:700;">⭐ SUN-Stern verdient!</div>
        <div style="font-size:.85rem;font-weight:700;color:#ffc840;margin-top:2px;">${achievement.name}</div>
        <div style="font-size:.65rem;color:rgba(200,180,100,.5);margin-top:1px;">${achievement.desc}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400); }, 3000);
}

function renderSunGrid() {
  const earned = getSunEarned();
  const groups = { basic: 'sunGrid-basic', battle: 'sunGrid-battle', master: 'sunGrid-master' };
  let totalEarned = 0;

  Object.entries(groups).forEach(([group, gridId]) => {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const items = SUN_ACHIEVEMENTS.filter(a => a.group === group);
    grid.innerHTML = items.map(a => {
      const isEarned = !!earned[a.id];
      if (isEarned) totalEarned++;
      return `<div class="sun-card ${isEarned ? 'earned' : 'locked'}">
            ${isEarned ? '<span class="sun-check">✓</span>' : ''}
            <div class="sun-icon">${a.icon}</div>
            <div class="sun-name">${a.name}</div>
            <div class="sun-desc">${a.desc}</div>
          </div>`;
    }).join('');
  });

  const total = SUN_ACHIEVEMENTS.length;
  const el = document.getElementById('sunTotalVal');
  if (el) el.textContent = `${totalEarned} / ${total}`;

  // Stars (5 stars, each = total/5 achievements)
  const starsRow = document.getElementById('sunStarsRow');
  if (starsRow) {
    const perStar = total / 5;
    starsRow.querySelectorAll('.sun-star').forEach((s, i) => {
      s.classList.toggle('lit', totalEarned >= Math.round((i + 1) * perStar));
    });
  }
}
