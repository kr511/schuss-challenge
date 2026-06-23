/* ─── TÄGLICHE LOGIN-BELOHNUNGEN ───────────
 *
 * Vergibt Bonus-XP für aufeinanderfolgende Besuchstage.
 * Verwendet awardFlatXP (xp-system.js) für tatsächliche XP-Vergabe.
 */

function getLocalDayStart(timestamp) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function initDailyLoginRewards() {
  const rawLastVisit = Number(localStorage.getItem('sd_last_visit') || '0');
  const lastVisit = Number.isFinite(rawLastVisit) ? rawLastVisit : 0;
  const today = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Wenn kein letzter Besuch gespeichert, heute als ersten Besuch markieren
  if (lastVisit === 0) {
    localStorage.setItem('sd_last_visit', today.toString());
    localStorage.setItem('sd_login_streak', '1');
    awardLoginReward(1);
    return;
  }

  // Prüfen, ob seit letztem Besuch ein Tag vergangen ist
  const daysDiff = Math.round((getLocalDayStart(today) - getLocalDayStart(lastVisit)) / oneDay);

  if (daysDiff <= 0) {
    // Heute schon belohnt bekommen
    return;
  } else if (daysDiff === 1) {
    // Aufeinanderfolgender Tag
    const currentStreak = parseInt(localStorage.getItem('sd_login_streak') || '0');
    const newStreak = currentStreak + 1;
    localStorage.setItem('sd_login_streak', newStreak.toString());
    localStorage.setItem('sd_last_visit', today.toString());
    awardLoginReward(newStreak);
  } else {
    // Streak unterbrochen (mehr als 1 Tag Lücke)
    localStorage.setItem('sd_last_visit', today.toString());
    localStorage.setItem('sd_login_streak', '1');
    awardLoginReward(1); // Belohnung für den Neustart
  }
}

function awardLoginReward(streak) {
  let rewardXP = streak > 1 ? 5 : 0; // Kein XP am 1. Tag, 5 XP als Basis danach
  let hasMysteryBonus = false;

  // Streak-Boni (nur der höchste Bonus zählt)
  if (streak >= 30) rewardXP += 50;      // Monatsbonus
  else if (streak >= 14) rewardXP += 20; // Zweiwochenbonus
  else if (streak >= 7) rewardXP += 10;  // Wochenbonus

  // Zufällige Mystery-Belohnung alle 10 Tage
  if (streak % 10 === 0 && Math.random() < 0.3) {
    rewardXP += 25; // Mystery-Bonus
    hasMysteryBonus = true;
  }

  const gained = awardFlatXP(rewardXP);
  if (gained <= 0) return;

  const labelParts = [];
  if (streak > 1) labelParts.push(`${streak}-Tag-Streak`);
  if (hasMysteryBonus) labelParts.push('Mystery-Bonus');

  const suffix = labelParts.length ? ` (${labelParts.join(' · ')})` : '';
  showLoginBonus(`+${gained} XP${suffix}`);
}

function showLoginBonus(message) {
  // Erstelle eine temporäre Benachrichtigung
  const bonusEl = document.createElement('div');
  bonusEl.className = 'login-bonus-popup';
  bonusEl.innerHTML = `
        <div class="login-bonus-content">
          <div class="login-bonus-icon">🎁</div>
          <div class="login-bonus-text">${message}</div>
        </div>
      `;

  document.body.appendChild(bonusEl);

  // Animation: Einblenden, warten, Ausblenden
  setTimeout(() => {
    bonusEl.style.opacity = '1';
    bonusEl.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    bonusEl.style.opacity = '0';
    bonusEl.style.transform = 'translateY(-20px)';
  }, 2500);

  setTimeout(() => {
    if (bonusEl.parentElement) {
      bonusEl.parentElement.removeChild(bonusEl);
    }
  }, 3000);
}
