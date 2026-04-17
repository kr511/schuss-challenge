/**
 * Enhanced Achievement System
 * Erweitertes Achievement-System mit detaillierten Statistiken und Belohnungen
 */

const EnhancedAchievements = (function() {
  'use strict';
  
  // Erweiterte Achievement-Definitionen
  const ADVANCED_ACHIEVEMENTS = {
    // Serien-basierte Achievements
    streak5: {
      id: 'streak5',
      name: 'Aufwärts-Trend',
      description: '5 Siege in Serie',
      icon: '🔥',
      xp: 100,
      category: 'streak',
      tier: 1,
      unlockCondition: function(stats) {
        return stats.currentStreak >= 5;
      }
    },
    
    streak10: {
      id: 'streak10',
      name: 'Serien-Meister',
      description: '10 Siege in Serie',
      icon: '⚡',
      xp: 300,
      category: 'streak',
      tier: 2,
      unlockCondition: function(stats) {
        return stats.currentStreak >= 10;
      }
    },
    
    streak20: {
      id: 'streak20',
      name: 'Unbesiegbar',
      description: '20 Siege in Serie',
      icon: '👑',
      xp: 1000,
      category: 'streak',
      tier: 3,
      unlockCondition: function(stats) {
        return stats.currentStreak >= 20;
      }
    },
    
    // Perfekte Spiele
    perfectGame: {
      id: 'perfectGame',
      name: 'Perfektes Spiel',
      description: 'Alle Schüsse in Ring 9 oder besser',
      icon: '💯',
      xp: 250,
      category: 'precision',
      tier: 2,
      unlockCondition: function(gameData) {
        return gameData.allShots.every(shot => shot.ring >= 9);
      }
    },
    
    perfect10: {
      id: 'perfect10',
      name: 'Bullseye-Meister',
      description: 'Alle Schüsse Ring 10',
      icon: '🎯',
      xp: 500,
      category: 'precision',
      tier: 3,
      unlockCondition: function(gameData) {
        return gameData.allShots.every(shot => shot.ring === 10);
      }
    },
    
    // Comeback-Achievements
    comeback20: {
      id: 'comeback20',
      name: 'Comeback-König',
      description: 'Gewinne nach 20+ Punkten Rückstand',
      icon: '🏆',
      xp: 400,
      category: 'comeback',
      tier: 2,
      unlockCondition: function(gameData) {
        return gameData.maxDeficit >= 20 && gameData.won;
      }
    },
    
    comeback30: {
      id: 'comeback30',
      name: 'Phönix aus der Asche',
      description: 'Gewinne nach 30+ Punkten Rückstand',
      icon: '🔥',
      xp: 800,
      category: 'comeback',
      tier: 3,
      unlockCondition: function(gameData) {
        return gameData.maxDeficit >= 30 && gameData.won;
      }
    },
    
// Konsistenz-Achievements
    consistency80: {
      id: 'consistency80',
      name: 'Steady Shooter',
      description: '80% Konstanz über 10 Spiele',
      icon: '📊',
      xp: 200,
      category: 'consistency',
      tier: 2,
      unlockCondition: function(stats) {
        return stats.consistencyScore >= 80 && stats.gamesPlayed >= 10;
      }
    },
    
    consistency90: {
      id: 'consistency90',
      name: 'Maschine',
      description: '90% Konstanz über 20 Spiele',
      icon: '⚙️',
      xp: 500,
      category: 'consistency',
      tier: 3,
      unlockCondition: function(stats) {
        return stats.consistencyScore >= 90 && stats.gamesPlayed >= 20;
      }
    },
    
    // Disziplin-spezifisch
    lgMaster: {
      id: 'lgMaster',
      name: 'Luftgewehr-Experte',
      description: 'Durchschnitt über 420 in LG',
      icon: '🎯',
      xp: 300,
      category: 'specialization',
      tier: 2,
      unlockCondition: function(stats) {
        return stats.lgAverage >= 420 && stats.lgGames >= 10;
      }
    },
    
    kkMaster: {
      id: 'kkMaster',
      name: 'Kleinkaliber-Experte',
      description: 'Durchschnitt über 520 in KK',
      icon: '🔫',
      xp: 300,
      category: 'specialization',
      tier: 2,
      unlockCondition: function(stats) {
        return stats.kkAverage >= 520 && stats.kkGames >= 10;
      }
    },
    
    // Sondere-Achievements
    speedDemon: {
      id: 'speedDemon',
      name: 'Speed-Demon',
      description: 'Spiel in unter 2 Minuten gewonnen',
      icon: '⚡',
      xp: 150,
      category: 'speed',
      tier: 1,
      unlockCondition: function(gameData) {
        return gameData.duration <= 120 && gameData.won;
      }
    },
    
    marathon: {
      id: 'marathon',
      name: 'Marathon-Schütze',
      description: '50 Spiele an einem Tag',
      icon: '🏃',
      xp: 600,
      category: 'endurance',
      tier: 2,
      unlockCondition: function(stats) {
        return stats.gamesToday >= 50;
      }
    },
    
    // Adaptive Herausforderungen
    adaptiveChampion: {
      id: 'adaptiveChampion',
      name: 'Adaptiver Champion',
      description: 'Gewinne auf höchster Schwierigkeit',
      icon: '🧠',
      xp: 750,
      category: 'adaptive',
      tier: 3,
      unlockCondition: function(stats) {
        return stats.hardestDifficultyWins >= 5;
      }
    }
  };
  
  // Achievement-Fortschritt
  let achievementProgress = {};
  const ACHIEVEMENTS_MOUNT_ID = 'enhancedAchievementsMount';
  
  /**
   * Initialisiert das erweiterte Achievement-System
   */
  function init() {
    loadProgress();
    renderUI();
    console.log('🏆 Enhanced Achievement System initialisiert');
  }
  
  /**
   * Lädt Achievement-Fortschritt
   */
  function loadProgress() {
    try {
      const defaultProgress = {};
      Object.keys(ADVANCED_ACHIEVEMENTS).forEach(key => {
        const achievement = ADVANCED_ACHIEVEMENTS[key];
        defaultProgress[achievement.id] = {
          unlocked: false,
          progress: 0,
          maxProgress: 1,
          lastChecked: null
        };
      });

      const saved = localStorage.getItem('sd_enhanced_achievements');
      if (saved) {
        achievementProgress = {
          ...defaultProgress,
          ...JSON.parse(saved)
        };
      } else {
        // Initialisiere Fortschritt für alle Achievements
        achievementProgress = defaultProgress;
        saveProgress();
      }
    } catch (e) {
      console.warn('⚠️ Konnte Achievement-Fortschritt nicht laden:', e);
    }
  }
  
  /**
   * Speichert Achievement-Fortschritt
   */
  function saveProgress() {
    try {
      localStorage.setItem('sd_enhanced_achievements', JSON.stringify(achievementProgress));
    } catch (e) {
      console.warn('⚠️ Konnte Achievement-Fortschritt nicht speichern:', e);
    }
  }
  
  /**
   * Prüft alle Achievements nach einem Spiel
   */
  function renderUI() {
    const mount = document.getElementById(ACHIEVEMENTS_MOUNT_ID);
    if (!mount) return;
    mount.innerHTML = createAchievementUI();
  }

  function checkAchievementsAfterGame(gameData, stats) {
    const unlocked = [];
    
    // FIX: Erstelle ein einheitliches context-Objekt das beide merged
    const context = {
      ...stats,
      ...gameData,
      allShots: gameData.shots || [],
      won: gameData.result === 'win',
      maxDeficit: gameData.maxDeficit || 0,
      duration: gameData.duration || 0
    };
    
    Object.values(ADVANCED_ACHIEVEMENTS).forEach(achievement => {
      if (achievementProgress[achievement.id].unlocked) return;
      
      if (achievement.unlockCondition(context)) {
        unlockAchievement(achievement);
        unlocked.push(achievement);
      }
    });

    renderUI();
    return unlocked;
  }
  
  /**
   * Schaltet ein Achievement frei
   */
  function unlockAchievement(achievement) {
    achievementProgress[achievement.id] = {
      unlocked: true,
      progress: 1,
      maxProgress: 1,
      unlockedAt: Date.now()
    };
    
    saveProgress();
    
    // Event auslösen
    window.dispatchEvent(new CustomEvent('achievementUnlocked', {
      detail: achievement
    }));
    
    console.log(`🏆 Achievement freigeschaltet: ${achievement.name}`);
  }
  
  /**
   * Berechnet erweiterte Statistiken für Achievements
   */
  function calculateAdvancedStats(games) {
    if (!games || games.length === 0) return {};
    
    const recentGames = games.slice(-20); // Letzte 20 Spiele
    
    // Konstanz-Berechnung
    const scores = recentGames.map(g => g.playerScore).filter(s => s > 0);
    // FIX: Disziplin für calculateConsistency bestimmen
    const discipline = recentGames.length > 0 ? (recentGames[0].discipline || 'default') : 'default';
    const consistencyScore = calculateConsistency(scores, discipline);
    
    // Disziplin-Statistiken
    const lgGames = recentGames.filter(g => g.discipline && g.discipline.startsWith('lg'));
    const kkGames = recentGames.filter(g => g.discipline && g.discipline.startsWith('kk'));
    
    const lgAverage = lgGames.length > 0 ? 
      lgGames.reduce((sum, g) => sum + g.playerScore, 0) / lgGames.length : 0;
    
    const kkAverage = kkGames.length > 0 ? 
      kkGames.reduce((sum, g) => sum + g.playerScore, 0) / kkGames.length : 0;
    
    // Schwierigkeits-Statistiken
    const hardestWins = games.filter(g => g.difficulty === 'elite' && g.result === 'win').length;
    
    // Tages-Statistiken
    const today = new Date().toDateString();
    const gamesToday = games.filter(g => new Date(g.timestamp).toDateString() === today).length;
    
    return {
      consistencyScore: consistencyScore,
      lgAverage: lgAverage,
      kkAverage: kkAverage,
      lgGames: lgGames.length,
      kkGames: kkGames.length,
      hardestDifficultyWins: hardestWins,
      gamesToday: gamesToday,
      gamesPlayed: games.length
    };
  }
  
  /**
   * Berechnet Konstanz-Score (0-100)
   */
  function calculateConsistency(scores, discipline = 'default') {
    if (scores.length < 3) return 0;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // FIX: maxStdDev abhängig von der Disziplin
    const maxStdDevByDiscipline = {
      'lg': 30,      // Luftgewehr: engere Toleranz
      'kk': 50,      // Kleinkaliber: normale Toleranz
      'default': 40  // Standard: mittlere Toleranz
    };
    
    // FIX: Prefix-Check — 'lg40' würde sonst nie auf 'lg' matchen
    const prefix = discipline.startsWith('lg') ? 'lg'
                 : discipline.startsWith('kk') ? 'kk'
                 : 'default';
    const maxReasonableStdDev = maxStdDevByDiscipline[prefix];
    const consistency = Math.max(0, 100 - (standardDeviation / maxReasonableStdDev * 100));
    
    return Math.round(consistency);
  }
  
  /**
   * Erstellt Achievement-Übersicht
   */
  function getAchievementOverview() {
    const total = Object.keys(ADVANCED_ACHIEVEMENTS).length;
    const unlocked = Object.values(achievementProgress).filter(p => p.unlocked).length;
    const byCategory = {};
    
    Object.values(ADVANCED_ACHIEVEMENTS).forEach(achievement => {
      if (!byCategory[achievement.category]) {
        byCategory[achievement.category] = { total: 0, unlocked: 0 };
      }
      byCategory[achievement.category].total++;
      if (achievementProgress[achievement.id].unlocked) {
        byCategory[achievement.category].unlocked++;
      }
    });
    
    return {
      total: total,
      unlocked: unlocked,
      percentage: Math.round((unlocked / total) * 100),
      byCategory: byCategory,
      recentUnlocks: getRecentUnlocks(5)
    };
  }
  
  /**
   * Holt kürzlich freigeschaltete Achievements
   */
  function getRecentUnlocks(count = 5) {
    return Object.values(ADVANCED_ACHIEVEMENTS)
      .filter(achievement => achievementProgress[achievement.id].unlocked)
      .sort((a, b) => (achievementProgress[b.id].unlockedAt || 0) - (achievementProgress[a.id].unlockedAt || 0))
      .slice(0, count);
  }
  
  /**
   * Erstellt Achievement-UI
   */
  function createAchievementUI() {
    return `
      <div class="enhanced-achievements">
        <div class="achievements-header">
          <h3>🏆 Erweiterte Erfolge</h3>
          <div class="achievement-progress">
            <span class="progress-text">${getAchievementOverview().unlocked}/${getAchievementOverview().total}</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${getAchievementOverview().percentage}%"></div>
            </div>
          </div>
        </div>
        
        <div class="achievements-grid">
          ${Object.values(ADVANCED_ACHIEVEMENTS).map(achievement => {
            const progress = achievementProgress[achievement.id];
            const isUnlocked = progress.unlocked;
            
            return `
              <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'} tier-${achievement.tier}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                  <div class="achievement-name">${achievement.name}</div>
                  <div class="achievement-desc">${achievement.description}</div>
                  <div class="achievement-reward">+${achievement.xp} XP</div>
                </div>
                ${isUnlocked ? '<div class="achievement-unlocked">✓</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Öffentliche API
   */
  return {
    init,
    checkAchievementsAfterGame,
    calculateAdvancedStats,
    getAchievementOverview,
    getRecentUnlocks,
    renderUI,
    createAchievementUI,
    ACHIEVEMENTS: ADVANCED_ACHIEVEMENTS
  };
})();

// Initialisierung
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    EnhancedAchievements.init();
  });
}
