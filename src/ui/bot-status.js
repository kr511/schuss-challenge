/* ─── BOT STATUS UI ─────────────────────────
 *
 * Zeigt Persönlichkeit, Mood und Focus-Balken des adaptiven Bots
 * während eines Schussduells. Aktualisiert sich alle 2 Sekunden.
 */

let _botStatusUpdateInterval = null;

function updateBotStatusCard() {
  const card = document.getElementById('botStatusCard');
  if (!card) return;

  // Prüfen ob AdaptiveBotSystem verfügbar ist
  if (typeof AdaptiveBotSystem === 'undefined' || typeof AdaptiveBotSystem.getBotFullStatus !== 'function') {
    card.style.display = 'none';
    return;
  }

  const fullStatus = AdaptiveBotSystem.getBotFullStatus();
  if (!fullStatus) {
    card.style.display = 'none';
    return;
  }

  // Karte anzeigen
  card.style.display = 'block';

  const { personality, mood, stressLevel, fatigue, focus, stateSuffix, stateIcon, progressionText, isImproving, isDegrading } = fullStatus;

  // Elemente aktualisieren
  const iconEl = document.getElementById('botStatusIcon');
  const titleEl = document.getElementById('botStatusTitle');
  const descEl = document.getElementById('botStatusDesc');
  const focusBar = document.getElementById('botFocusBar');
  const focusPct = document.getElementById('botFocusPct');
  const badgeEl = document.getElementById('botPersonalityBadge');

  // Haupt-Icon: Persönlichkeits-Icon + Zustands-Icon
  const mainIcon = stateIcon || personality.icon;
  if (iconEl) iconEl.textContent = mainIcon;

  // Titel: Persönlichkeit + optionaler Zustand
  if (titleEl) {
    titleEl.textContent = personality.name + (stateSuffix ? ` ${stateSuffix}` : '');
    titleEl.style.color = personality.levelColor;
  }

  // Beschreibung: Fehlermuster oder Fortschrittstext
  if (descEl) {
    if (progressionText) {
      descEl.textContent = progressionText;
    } else {
      descEl.textContent = personality.errorPattern;
    }
    descEl.style.color = 'rgba(255,255,255,0.45)';
  }

  // Persönlichkeits-Badge (Level-Anzeige)
  if (badgeEl) {
    badgeEl.textContent = personality.levelText;
    badgeEl.style.color = personality.levelColor;
    badgeEl.style.borderColor = personality.levelColor + '66';
    badgeEl.style.background = personality.levelGlow;
  }

  // Focus-Balken
  if (focusBar) {
    focusBar.style.width = focus + '%';
    focusBar.style.background = `linear-gradient(90deg, ${personality.levelColor}, ${personality.levelColor}88)`;
  }
  if (focusPct) focusPct.textContent = Math.round(focus);

  // Card-Border-Animation für besondere Zustände
  const isExtreme = mood === 'in_the_zone' || mood === 'stressed';
  card.style.borderColor = isExtreme ? personality.levelColor + '44' : 'rgba(255,255,255,0.06)';
  card.style.boxShadow = isExtreme ? `0 0 15px ${personality.levelGlow}, inset 0 0 10px ${personality.levelGlow}` : 'none';

  // Pulsierender Effekt für extreme Zustände
  if (isExtreme) {
    card.style.animation = 'botStatusPulse 2s ease-in-out infinite';
  } else {
    card.style.animation = 'none';
  }
}

// Pulsierende Animation per CSS (einmalig injizieren)
(function injectBotStatusCSS() {
  if (document.getElementById('botStatusCSS')) return;
  const style = document.createElement('style');
  style.id = 'botStatusCSS';
  style.textContent = `
    @keyframes botStatusPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
  `;
  document.head.appendChild(style);
})();

// Bot-Status während des Duells regelmäßig aktualisieren
function startBotStatusUpdates() {
  if (_botStatusUpdateInterval) clearInterval(_botStatusUpdateInterval);
  updateBotStatusCard(); // Sofort initial anzeigen
  _botStatusUpdateInterval = setInterval(updateBotStatusCard, 2000); // Alle 2s aktualisieren
}

function stopBotStatusUpdates() {
  if (_botStatusUpdateInterval) {
    clearInterval(_botStatusUpdateInterval);
    _botStatusUpdateInterval = null;
  }
  const card = document.getElementById('botStatusCard');
  if (card) card.style.display = 'none';
}
