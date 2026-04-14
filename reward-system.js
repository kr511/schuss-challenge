/**
 * REWARD SYSTEM - Erweitertes Belohnungssystem
 * Lootboxen, Streak-Belohnungen, zufällige Drops
 */

(function () {
  'use strict';

  const RewardSystem = {
    // Konfiguration
    config: {
      lootboxInterval: 5, // Alle 5 Duelle eine Lootbox
      streakBonusThreshold: 3, // Ab 3 Siegen in Folge
      rareDropChance: 0.15, // 15% Chance auf seltene Belohnung
      epicDropChance: 0.05, // 5% Chance auf epische Belohnung
    },

    // Belohnungs-Tabellen
    rewards: {
      common: [
        { icon: '🎯', title: 'Kleine Belohnung', description: '+10 XP Bonus', xp: 10 },
        { icon: '🔫', title: 'Münzfund', description: '+15 XP Bonus', xp: 15 },
        { icon: '⭐', title: 'Sternschnuppe', description: '+20 XP Bonus', xp: 20 },
      ],
      rare: [
        { icon: '💎', title: 'Seltener Fund!', description: '+50 XP Bonus', xp: 50 },
        { icon: '🏅', title: 'Medaille', description: '+75 XP Bonus', xp: 75 },
        { icon: '🎁', title: 'Überraschung!', description: '+60 XP Bonus', xp: 60 },
      ],
      epic: [
        { icon: '👑', title: 'LEGENDÄR!', description: '+150 XP Bonus', xp: 150 },
        { icon: '🔥', title: 'Feuerwerk!', description: '+200 XP Bonus', xp: 200 },
        { icon: '💫', title: 'Sternenregen', description: '+100 XP Bonus', xp: 100 },
      ],
      streak: [
        { icon: '🔥', title: '3er Streak!', description: '+30 XP Streak-Bonus', xp: 30, minStreak: 3 },
        { icon: '⚡', title: '5er Streak!', description: '+75 XP Streak-Bonus', xp: 75, minStreak: 5 },
        { icon: '👑', title: '10er Streak!', description: '+200 XP Streak-Bonus', xp: 200, minStreak: 10 },
      ],
    },

    // Zustand
    state: {
      duelsSinceLastLootbox: 0,
      currentStreak: 0,
      totalLootboxesOpened: 0,
      totalXPFromRewards: 0,
    },

    /**
     * Initialisiert das Belohnungssystem
     */
    init() {
      console.log('[RewardSystem] Initialisiert...');
      this.loadState();
      this.setupEventListeners();
      console.log('[RewardSystem] ✓ Bereit!');
    },

    /**
     * Lädt den gespeicherten Zustand
     */
    loadState() {
      try {
        const saved = localStorage.getItem('sd_reward_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.state = { ...this.state, ...parsed };
        }
      } catch (e) {
        console.warn('[RewardSystem] Fehler beim Laden:', e);
      }
    },

    /**
     * Speichert den aktuellen Zustand
     */
    saveState() {
      try {
        localStorage.setItem('sd_reward_state', JSON.stringify(this.state));
      } catch (e) {
        console.warn('[RewardSystem] Fehler beim Speichern:', e);
      }
    },

    /**
     * Richtet Event-Listener ein
     */
    setupEventListeners() {
      // Auf Duell-Ende hören
      window.addEventListener('duelEnded', (e) => {
        this.onDuelEnded(e.detail);
      });
    },

    /**
     * Wird aufgerufen wenn ein Duell endet
     */
    onDuelEnded(gameData) {
      const { result, difficulty, streak } = gameData;

      // Streak aktualisieren
      this.state.currentStreak = streak || 0;

      // Lootbox-Zähler erhöhen
      this.state.duelsSinceLastLootbox++;

      // Prüfen ob Lootbox fällig
      if (this.state.duelsSinceLastLootbox >= this.config.lootboxInterval) {
        this.state.duelsSinceLastLootbox = 0;
        this.dropLootbox();
      }

      // Streak-Bonus prüfen
      if (result === 'win' && this.state.currentStreak >= this.config.streakBonusThreshold) {
        this.checkStreakBonus();
      }

      this.saveState();
    },

    /**
     * Lässt eine Lootbox fallen
     */
    dropLootbox() {
      console.log('[RewardSystem] 🎁 Lootbox verfügbar!');

      // Belohnung basierend auf Wahrscheinlichkeit wählen
      const reward = this.selectReward();

      // Lootbox-Animation anzeigen
      if (window.ModernUX && typeof window.ModernUX.animateLootbox === 'function') {
        // Lootbox-Element erstellen
        const lootbox = this.createLootboxElement();
        document.body.appendChild(lootbox);

        // Animation abspielen
        window.ModernUX.animateLootbox(lootbox, reward).then(() => {
          // XP gutschreiben
          this.awardRewardXP(reward.xp);
          this.state.totalLootboxesOpened++;
          lootbox.remove();
        });
      } else {
        // Fallback: Direkt Belohnung anzeigen
        this.showRewardDirect(reward);
      }
    },

    /**
     * Wählt eine Belohnung basierend auf Wahrscheinlichkeiten
     */
    selectReward() {
      const roll = Math.random();

      let pool;
      if (roll < this.config.epicDropChance) {
        pool = this.rewards.epic;
      } else if (roll < this.config.epicDropChance + this.config.rareDropChance) {
        pool = this.rewards.rare;
      } else {
        pool = this.rewards.common;
      }

      // Zufällige Belohnung aus Pool
      return pool[Math.floor(Math.random() * pool.length)];
    },

    /**
     * Prüft Streak-Bonus
     */
    checkStreakBonus() {
      const streakReward = this.rewards.streak
        .slice()
        .reverse()
        .find(r => this.state.currentStreak >= r.minStreak);

      if (streakReward) {
        console.log(`[RewardSystem] 🔥 Streak-Bonus: ${streakReward.title}`);
        this.showRewardDirect(streakReward);
        this.awardRewardXP(streakReward.xp);
      }
    },

    /**
     * Erstellt Lootbox-Element
     */
    createLootboxElement() {
      const el = document.createElement('div');
      el.className = 'lootbox';
      el.style.cssText = `
        position: fixed;
        bottom: 20%;
        left: 50%;
        transform: translateX(-50%);
        width: 150px;
        height: 150px;
        background: linear-gradient(145deg, #8B6914, #C5961F);
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 4rem;
        cursor: pointer;
        z-index: 9998;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      `;
      el.textContent = '🎁';
      return el;
    },

    /**
     * Zeigt Belohnung direkt
     */
    showRewardDirect(reward) {
      if (window.ModernUX && typeof window.ModernUX.showReward === 'function') {
        window.ModernUX.showReward(reward);
      } else {
        alert(`${reward.icon} ${reward.title}\n${reward.description}`);
      }
    },

    /**
     * Schreibt XP gut
     */
    awardRewardXP(amount) {
      if (typeof G !== 'undefined' && typeof awardFlatXP === 'function') {
        awardFlatXP(amount);
        this.state.totalXPFromRewards += amount;
        console.log(`[RewardSystem] ✨ +${amount} XP gutgeschrieben`);
      }
    },

    /**
     * Öffentliche API: Manuelle Lootbox auslösen
     */
    forceLootbox() {
      this.state.duelsSinceLastLootbox = this.config.lootboxInterval;
      this.dropLootbox();
    },

    /**
     * Öffentliche API: Status anzeigen
     */
    getStatus() {
      return {
        duelsUntilNextLootbox: this.config.lootboxInterval - this.state.duelsSinceLastLootbox,
        currentStreak: this.state.currentStreak,
        totalLootboxesOpened: this.state.totalLootboxesOpened,
        totalXPFromRewards: this.state.totalXPFromRewards,
      };
    },

    /**
     * Integration mit app.js: recordGameResult
     */
    trackGame(result, difficulty, streak) {
      this.onDuelEnded({ result, difficulty, streak });
    },
  };

  // Automatisch initialisieren
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RewardSystem.init());
  } else {
    setTimeout(() => RewardSystem.init(), 200);
  }

  // Global verfügbar machen
  window.RewardSystem = RewardSystem;

})();
