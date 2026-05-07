/* ─── UI EFFECTS ───────────────────────────
 *
 * Visuelle und haptische Feedback-Effekte: Konfetti-Animation und
 * Vibration. Werden von XP-System (Level-Up) und Avatar-Picker verwendet.
 */

function spawnConfetti() {
  const colors = ['#ff9600', '#1cb0f6', '#90d838', '#ff4500', '#ffd700', '#ffffff'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = Math.random() * 2 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}

function triggerHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate([30, 20, 30]);
  }
}
