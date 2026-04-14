/**
 * BOT STATUS PANEL V2 + ADAPTIVE AI 2.0
 * Modernes Bot-Status-Panel mit intelligenter Anpassung
 */

(function () {
  'use strict';

  console.log('[BotPanelV2] Modul geladen');

  // ═══════════════════════════════════════════════════════
  // ADAPTIVE AI 2.0 - Intelligente Bot-Anpassung
  // ═══════════════════════════════════════════════════════

  const AdaptiveAI = {
    // Spieler-Muster erkennen
    playerPatterns: {
      comebackGames: 0,
      totalGames: 0,
      scores: [],
      isConsistent: true,
      isImproving: false,
      avgScore: 0
    },

    // Bot-Anpassungsparameter
    botAdjustments: {
      aggressionLevel: 1.0,
      earlyLeadBonus: 0,
      sigmaMultiplier: 1.0,
      unpredictability: 0,
      scalingFactor: 1.0,
      comebackActive: false,
      comebackBoost: 0,
      comebackDuration: 0
    },

    /**
     * Trackt ein Duell-Ergebnis für Muster-Erkennung
     */
    trackGame(gameData) {
      const { playerScore, botScore, result, maxDeficit } = gameData;

      this.playerPatterns.totalGames++;
      this.playerPatterns.scores.push(playerScore);

      // Max 20 Spiele im Speicher behalten
      if (this.playerPatterns.scores.length > 20) {
        this.playerPatterns.scores.shift();
      }

      // Comeback-Fähigkeit erkennen
      if (maxDeficit > 20 && result === 'win') {
        this.playerPatterns.comebackGames++;
      }

      // Durchschnitt berechnen
      const scores = this.playerPatterns.scores;
      this.playerPatterns.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Konsistenz berechnen
      if (scores.length >= 5) {
        const mean = this.playerPatterns.avgScore;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        this.playerPatterns.isConsistent = variance < 100; // Niedrige Varianz = konsistent
      }

      // Verbesserung erkennen
      if (scores.length >= 10) {
        const first5 = scores.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const last5 = scores.slice(-5).reduce((a, b) => a + b, 0) / 5;
        this.playerPatterns.isImproving = last5 > first5 * 1.05; // +5% Verbesserung
      }

      // Bot anpassen
      this.adaptBot();

      console.debug('[AdaptiveAI] Spieler-Muster:', this.playerPatterns);
    },

    /**
     * Passt den Bot basierend auf Spieler-Mustern an
     */
    adaptBot() {
      const patterns = this.playerPatterns;
      const adjustments = this.botAdjustments;

      // Reset
      adjustments.aggressionLevel = 1.0;
      adjustments.earlyLeadBonus = 0;
      adjustments.sigmaMultiplier = 1.0;
      adjustments.unpredictability = 0;

      // 1. Spieler kommt oft zurück? → Bot aggressiver
      const comebackRate = patterns.comebackGames / Math.max(1, patterns.totalGames);
      if (comebackRate > 0.3) {
        adjustments.aggressionLevel = 1.3; // +30% Aggression
        adjustments.earlyLeadBonus = 0.15; // +15% bei Führung
        console.log('[AdaptiveAI]  Bot wird aggressiver (Comeback-Gefahr erkannt)');
      }

      // 2. Spieler ist konsistent? → Bot unvorhersehbarer
      if (patterns.isConsistent && patterns.totalGames > 5) {
        adjustments.sigmaMultiplier = 1.15; // +15% Varianz
        adjustments.unpredictability = 0.2;
        console.log('[AdaptiveAI] 🎲 Bot wird unvorhersehbarer (konsistenter Spieler)');
      }

      // 3. Spieler wird besser? → Bot skaliert mit
      if (patterns.isImproving) {
        adjustments.scalingFactor = 1.08; // +8% pro 5 Spiele
        console.log('[AdaptiveAI] 📈 Bot skaliert mit (spieler verbessert sich)');
      }
    },

    /**
     * Comeback-Mechanik: Bot reagiert dramatisch auf Rückstand/Führung
     */
    checkComebackMechanic(botScore, playerScore, shotNumber) {
      const deficit = playerScore - botScore;
      const adjustments = this.botAdjustments;

      // Bot liegt deutlich zurück? → Dramatische Aufholjagd!
      if (deficit > 25 && Math.random() < 0.25 && !adjustments.comebackActive) {
        adjustments.comebackActive = true;
        adjustments.comebackBoost = 0.3; // +30% Qualität
        adjustments.comebackDuration = 5; // Für 5 Schüsse

        console.log('[AdaptiveAI] 🔥 COMEBACK! Bot macht Aufholjagd!');
        return {
          activated: true,
          type: 'comeback',
          message: '🔥 Bot macht eine dramatische Aufholjagd!',
          boost: adjustments.comebackBoost,
          duration: adjustments.comebackDuration
        };
      }

      // Bot führt deutlich? → Wird übermütig/nervös
      if (deficit < -35 && Math.random() < 0.35 && !adjustments.comebackActive) {
        adjustments.comebackActive = true;
        adjustments.comebackBoost = -0.2; // -20% Qualität
        adjustments.comebackDuration = 3;

        console.log('[AdaptiveAI] 😰 Bot wird nervös (große Führung)');
        return {
          activated: true,
          type: 'nervous',
          message: '😰 Bot wird nervös und macht Fehler!',
          boost: adjustments.comebackBoost,
          duration: adjustments.comebackDuration
        };
      }

      // Comeback läuft noch?
      if (adjustments.comebackActive && adjustments.comebackDuration > 0) {
        adjustments.comebackDuration--;
        if (adjustments.comebackDuration <= 0) {
          adjustments.comebackActive = false;
          adjustments.comebackBoost = 0;
        }
        return {
          activated: true,
          type: adjustments.comebackBoost > 0 ? 'comeback' : 'nervous',
          boost: adjustments.comebackBoost,
          remaining: adjustments.comebackDuration
        };
      }

      return { activated: false };
    },

    /**
     * Berechnet den finalen Sigma-Multiplier für den Bot
     */
    getFinalSigmaMultiplier() {
      const adj = this.botAdjustments;
      return adj.sigmaMultiplier * adj.scalingFactor * (1 + adj.comebackBoost);
    },

    /**
     * Gibt den aktuellen Anpassungs-Status zurück
     */
    getStatus() {
      return {
        patterns: { ...this.playerPatterns },
        adjustments: { ...this.botAdjustments },
        sigmaMultiplier: this.getFinalSigmaMultiplier()
      };
    }
  };

  // ═══════════════════════════════════════════════════════
  // MODERNES BOT-STATUS-PANEL
  // ═══════════════════════════════════════════════════════

  const BotPanel = {
    updateInterval: null,
    currentBot: null,

    /**
     * Initialisiert das Panel
     */
    init() {
      console.log('[BotPanelV2] Initialisiere...');
      this.createPanelHTML();
      this.startUpdates();
    },

    /**
     * Erstellt das HTML-Panel
     */
    createPanelHTML() {
      // Existierendes Panel entfernen
      const existing = document.getElementById('botStatusPanelV2');
      if (existing) existing.remove();

      // Neues Panel erstellen
      const panel = document.createElement('div');
      panel.id = 'botStatusPanelV2';
      panel.innerHTML = this.getPanelHTML();
      panel.style.display = 'none'; // Anfangs versteckt

      document.body.appendChild(panel);
    },

    /**
     * Returns panel HTML template
     */
    getPanelHTML() {
      return `
        <div class="bot-panel-header">
          <div class="bot-panel-avatar" id="bpAvatar">🤖</div>
          <div class="bot-panel-info">
            <div class="bot-panel-name" id="bpName">Bot lädt...</div>
            <div class="bot-panel-title" id="bpTitle">-</div>
          </div>
          <div class="bot-panel-mood" id="bpMood">➡️</div>
        </div>

        <div class="bot-panel-stats">
          <!-- Form/Tagesform -->
          <div class="bot-panel-stat">
            <div class="bot-panel-stat-label">
              <span>📊 Tagesform</span>
              <span id="bpFormValue">Normal</span>
            </div>
            <div class="bot-panel-bar">
              <div class="bot-panel-bar-fill" id="bpFormBar" style="width:50%;background:linear-gradient(90deg,#2196f3,#00bcd4);"></div>
            </div>
          </div>

          <!-- Fokus -->
          <div class="bot-panel-stat">
            <div class="bot-panel-stat-label">
              <span>🎯 Fokus</span>
              <span id="bpFocusValue">80%</span>
            </div>
            <div class="bot-panel-bar">
              <div class="bot-panel-bar-fill" id="bpFocusBar" style="width:80%;background:linear-gradient(90deg,#7ab030,#a0d84a);"></div>
            </div>
          </div>

          <!-- Stress -->
          <div class="bot-panel-stat">
            <div class="bot-panel-stat-label">
              <span>😰 Stress</span>
              <span id="bpStressValue">15%</span>
            </div>
            <div class="bot-panel-bar">
              <div class="bot-panel-bar-fill" id="bpStressBar" style="width:15%;background:linear-gradient(90deg,#ff9800,#f44336);"></div>
            </div>
          </div>
        </div>

        <!-- Adaptive AI Status -->
        <div class="bot-panel-adaptive" id="bpAdaptive">
          <div class="bot-panel-adaptive-title">🧠 Adaptive KI</div>
          <div class="bot-panel-adaptive-status" id="bpAdaptiveStatus">Analysiere Spieler...</div>
        </div>

        <!-- Comeback Alert -->
        <div class="bot-panel-comeback" id="bpComeback" style="display:none;">
          <div class="bot-panel-comeback-icon">🔥</div>
          <div class="bot-panel-comeback-text" id="bpComebackText">Bot macht Aufholjagd!</div>
        </div>

        <!-- Bot-Verhalten Beschreibung -->
        <div class="bot-panel-behavior" id="bpBehavior">
          <div class="bot-panel-behavior-label">Verhalten:</div>
          <div class="bot-panel-behavior-text" id="bpBehaviorText">Wird geladen...</div>
        </div>
      `;
    },

    /**
     * Startet die Update-Schleife
     */
    startUpdates() {
      if (this.updateInterval) clearInterval(this.updateInterval);
      this.updatePanel(); // Sofort
      this.updateInterval = setInterval(() => this.updatePanel(), 2000);
    },

    /**
     * Stoppt Updates
     */
    stopUpdates() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      const panel = document.getElementById('botStatusPanelV2');
      if (panel) panel.style.display = 'none';
    },

    /**
     * Aktualisiert das Panel mit aktuellen Daten
     */
    updatePanel() {
      const panel = document.getElementById('botStatusPanelV2');
      if (!panel) return;

      // Prüfen ob AdaptiveBotSystem verfügbar
      if (typeof AdaptiveBotSystem === 'undefined' || typeof AdaptiveBotSystem.getBotFullStatus !== 'function') {
        panel.style.display = 'none';
        return;
      }

      const fullStatus = AdaptiveBotSystem.getBotFullStatus();
      if (!fullStatus) {
        panel.style.display = 'none';
        return;
      }

      // Panel anzeigen
      panel.style.display = 'block';

      const { personality, mood, stressLevel, fatigue, focus, stateSuffix, stateIcon, progressionText, isImproving, isDegrading } = fullStatus;
      this.currentBot = personality;

      // Avatar
      const avatar = document.getElementById('bpAvatar');
      if (avatar) avatar.textContent = stateIcon || personality.icon;

      // Name
      const name = document.getElementById('bpName');
      if (name) {
        name.textContent = personality.name;
        name.style.color = personality.levelColor;
      }

      // Titel
      const title = document.getElementById('bpTitle');
      if (title) {
        title.textContent = stateSuffix || personality.desc;
      }

      // Mood
      const moodEl = document.getElementById('bpMood');
      if (moodEl) {
        const moodIcons = {
          focused: '🎯',
          tired: '😴',
          nervous: '😰',
          in_the_zone: '🔥'
        };
        moodEl.textContent = moodIcons[mood] || '➡️';
      }

      // Tagesform
      const formValue = document.getElementById('bpFormValue');
      const formBar = document.getElementById('bpFormBar');
      if (formValue && formBar) {
        const formPercent = Math.max(0, Math.min(100, 100 - fatigue));
        formValue.textContent = formPercent > 70 ? 'Gut' : formPercent > 40 ? 'Normal' : 'Müde';
        formBar.style.width = formPercent + '%';
        formBar.style.background = formPercent > 70 ? 'linear-gradient(90deg,#7ab030,#a0d84a)' :
                                   formPercent > 40 ? 'linear-gradient(90deg,#2196f3,#00bcd4)' :
                                   'linear-gradient(90deg,#ff9800,#f44336)';
      }

      // Fokus
      const focusValue = document.getElementById('bpFocusValue');
      const focusBar = document.getElementById('bpFocusBar');
      if (focusValue && focusBar) {
        focusValue.textContent = Math.round(focus) + '%';
        focusBar.style.width = focus + '%';
      }

      // Stress
      const stressValue = document.getElementById('bpStressValue');
      const stressBar = document.getElementById('bpStressBar');
      if (stressValue && stressBar) {
        stressValue.textContent = Math.round(stressLevel) + '%';
        stressBar.style.width = stressLevel + '%';
      }

      // Adaptive AI Status
      const adaptiveStatus = document.getElementById('bpAdaptiveStatus');
      if (adaptiveStatus) {
        const aiStatus = AdaptiveAI.getStatus();
        const patterns = aiStatus.patterns;

        if (patterns.totalGames < 3) {
          adaptiveStatus.textContent = `Analysiere... (${patterns.totalGames}/3 Spiele)`;
        } else {
          let statusText = [];
          if (patterns.comebackGames > 0) statusText.push(`🔄 ${patterns.comebackGames} Comebacks`);
          if (patterns.isConsistent) statusText.push('📊 Konsistent');
          if (patterns.isImproving) statusText.push('📈 Steigend');
          if (aiStatus.adjustments.comebackActive) statusText.push('🔥 Comeback aktiv!');

          adaptiveStatus.textContent = statusText.length > 0 ? statusText.join(' · ') : 'Normal';
        }
      }

      // Comeback Alert
      const comebackEl = document.getElementById('bpComeback');
      const comebackText = document.getElementById('bpComebackText');
      if (comebackEl && comebackText) {
        const aiStatus = AdaptiveAI.getStatus();
        if (aiStatus.adjustments.comebackActive) {
          comebackEl.style.display = 'flex';
          if (aiStatus.adjustments.comebackBoost > 0) {
            comebackEl.querySelector('.bot-panel-comeback-icon').textContent = '🔥';
            comebackText.textContent = 'Bot macht Aufholjagd!';
          } else {
            comebackEl.querySelector('.bot-panel-comeback-icon').textContent = '😰';
            comebackText.textContent = 'Bot wird nervös!';
          }
        } else {
          comebackEl.style.display = 'none';
        }
      }

      // Verhalten
      const behaviorText = document.getElementById('bpBehaviorText');
      if (behaviorText) {
        if (progressionText) {
          behaviorText.textContent = progressionText;
        } else {
          behaviorText.textContent = personality.errorPattern;
        }
      }

      // Panel-Styling basierend auf Mood
      const isExtreme = mood === 'in_the_zone' || (aiStatus?.adjustments?.comebackActive);
      panel.style.borderColor = isExtreme ? personality.levelColor : 'rgba(255,255,255,0.06)';
      panel.style.boxShadow = isExtreme ? `0 0 20px ${personality.levelGlow}, inset 0 0 10px ${personality.levelGlow}` : '0 6px 20px rgba(0,0,0,0.3)';
    }
  };

  // ═══════════════════════════════════════════════════════
  // GLOBALE API
  // ═══════════════════════════════════════════════════════

  window.BotPanelV2 = {
    init: () => BotPanel.init(),
    stop: () => BotPanel.stopUpdates(),
    adaptiveAI: AdaptiveAI
  };

  // ═══════════════════════════════════════════════════════
  // CSS STYLES INJEKTIEREN
  // ═══════════════════════════════════════════════════════

  function injectCSS() {
    if (document.getElementById('botPanelV2CSS')) return;

    const style = document.createElement('style');
    style.id = 'botPanelV2CSS';
    style.textContent = `
      #botStatusPanelV2 {
        position: fixed;
        top: 80px;
        right: 12px;
        width: 220px;
        background: linear-gradient(145deg, rgba(30,35,40,0.95) 0%, rgba(10,12,15,0.98) 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 16px;
        padding: 14px;
        z-index: 1000;
        transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      }

      /* Header */
      .bot-panel-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }

      .bot-panel-avatar {
        font-size: 2rem;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
        flex-shrink: 0;
      }

      .bot-panel-info {
        flex: 1;
        min-width: 0;
      }

      .bot-panel-name {
        font-size: 0.9rem;
        font-weight: 700;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bot-panel-title {
        font-size: 0.65rem;
        color: rgba(255,255,255,0.45);
        margin-top: 2px;
      }

      .bot-panel-mood {
        font-size: 1.3rem;
        flex-shrink: 0;
      }

      /* Stats */
      .bot-panel-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 10px;
      }

      .bot-panel-stat {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .bot-panel-stat-label {
        display: flex;
        justify-content: space-between;
        font-size: 0.6rem;
        color: rgba(255,255,255,0.4);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .bot-panel-stat-label span:last-child {
        color: rgba(255,255,255,0.7);
        text-transform: none;
        letter-spacing: 0;
      }

      .bot-panel-bar {
        height: 4px;
        background: rgba(255,255,255,0.08);
        border-radius: 2px;
        overflow: hidden;
      }

      .bot-panel-bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Adaptive AI */
      .bot-panel-adaptive {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 10px;
        padding: 8px 10px;
        margin-bottom: 8px;
      }

      .bot-panel-adaptive-title {
        font-size: 0.6rem;
        color: rgba(255,255,255,0.5);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .bot-panel-adaptive-status {
        font-size: 0.7rem;
        color: rgba(255,255,255,0.8);
        line-height: 1.3;
      }

      /* Comeback Alert */
      .bot-panel-comeback {
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(145deg, rgba(255,152,0,0.15) 0%, rgba(244,67,54,0.15) 100%);
        border: 1px solid rgba(255,152,0,0.3);
        border-radius: 10px;
        padding: 8px 10px;
        margin-bottom: 8px;
        animation: comebackPulse 1.5s ease-in-out infinite;
      }

      @keyframes comebackPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }

      .bot-panel-comeback-icon {
        font-size: 1.2rem;
      }

      .bot-panel-comeback-text {
        font-size: 0.75rem;
        font-weight: 600;
        color: #ff9800;
      }

      /* Behavior */
      .bot-panel-behavior {
        font-size: 0.65rem;
        color: rgba(255,255,255,0.45);
        line-height: 1.4;
      }

      .bot-panel-behavior-label {
        font-size: 0.6rem;
        color: rgba(255,255,255,0.3);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 3px;
      }

      .bot-panel-behavior-text {
        color: rgba(255,255,255,0.6);
        font-style: italic;
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        #botStatusPanelV2 {
          top: auto;
          bottom: 80px;
          right: 8px;
          left: 8px;
          width: auto;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════
  // AUTO-INIT
  // ═══════════════════════════════════════════════════════

  function autoInit() {
    injectCSS();
    console.log('[BotPanelV2] ✓ CSS injiziert');

    // Warte auf AdaptiveBotSystem
    const checkInterval = setInterval(() => {
      if (typeof AdaptiveBotSystem !== 'undefined') {
        clearInterval(checkInterval);
        BotPanel.init();
        console.log('[BotPanelV2] ✓ Initialisiert');
      }
    }, 500);

    // Timeout nach 10 Sekunden
    setTimeout(() => clearInterval(checkInterval), 10000);
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})();
