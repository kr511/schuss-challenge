/* ═══════════════════════════════════════════════════════
   MODERNES LEADERBOARD: Weltrangliste mit Glassmorphism
   - Erweiterte Statistiken
   - Suchfunktion
   - Filter nach Waffe/Disziplin
   - Top 3 Medaillen mit spezieller Hervorhebung
   ═══════════════════════════════════════════════════════ */

const LeaderboardModern = {
  // ─── State ───
  allEntries: [],        // Alle geladenen Einträge
  filteredEntries: [],   // Nach Filter/Suche
  currentFilter: 'all',  // 'all', 'lg', 'kk', discipline key
  searchQuery: '',
  isLoading: false,

  // ─── Init ───
  init() {
    console.debug('[LeaderboardModern] Initialisiert');
    this.setupSearchInput();
  },

  // ═══════════════════════════════════════════
  //  LEADERBOARD LADEN & RENDER
  // ═══════════════════════════════════════════

  /** Modernes Leaderboard laden */
  async load(scope = 'global', period = 'alltime') {
    if (this.isLoading) return;
    this.isLoading = true;

    const container = document.querySelector('.lb-panel[data-lb-list]');
    if (!container) {
      this.isLoading = false;
      return;
    }

    container.innerHTML = '<div class="lb-modern-loading">⏳ Lade Weltrangliste...</div>';

    try {
      if (!fbReady || !fbDb) {
        container.innerHTML = '<div class="lb-modern-error">🔌 Offline – Weltrangliste nicht verfügbar.</div>';
        this.isLoading = false;
        return;
      }

      // Lade Top 100 aus Firebase
      const snapshot = await fbDb.ref('leaderboard_v2')
        .orderByChild('score')
        .limitToLast(100)
        .once('value');

      const entries = [];
      snapshot.forEach(child => {
        entries.push(child.val());
      });
      entries.reverse(); // Höchster Score zuerst

      this.allEntries = entries;
      this.filteredEntries = entries;

      // UI rendern
      this.render(entries, scope);

    } catch (error) {
      console.error('[LeaderboardModern] Ladefehler:', error);
      container.innerHTML = `<div class="lb-modern-error">⚠️ Fehler: ${error.message}</div>`;
    }

    this.isLoading = false;
  },

  /** Modernes Leaderboard rendern */
  render(entries, scope = 'global') {
    const container = document.querySelector('.lb-panel[data-lb-list]');
    if (!container) return;

    if (!entries || entries.length === 0) {
      const emptyText = scope === 'global'
        ? 'Noch keine Einträge. Sei der Erste! 🏆'
        : `Noch keine Einträge für ${this.getScopeLabel(scope)}.`;
      container.innerHTML = `<div class="lb-modern-empty">${emptyText}</div>`;
      return;
    }

    // Suchleiste einfügen
    const searchHTML = `
      <div class="lb-modern-search-bar">
        <input 
          type="text" 
          id="lbModernSearch" 
          class="lb-modern-search-input" 
          placeholder="🔍 Spieler suchen..."
          oninput="LeaderboardModern.handleSearch(this.value)"
        >
        <div class="lb-modern-filter-toggle" onclick="LeaderboardModern.toggleFilterPanel()">
          ⚙️
        </div>
      </div>
      <div id="lbModernFilterPanel" style="display:none;">
        <div class="lb-modern-filter-chips">
          <button class="lb-filter-chip ${this.currentFilter === 'all' ? 'active' : ''}" 
                  onclick="LeaderboardModern.setFilter('all')">
            Alle
          </button>
          <button class="lb-filter-chip ${this.currentFilter === 'lg' ? 'active' : ''}" 
                  onclick="LeaderboardModern.setFilter('lg')">
            🌬️ Luftgewehr
          </button>
          <button class="lb-filter-chip ${this.currentFilter === 'kk' ? 'active' : ''}" 
                  onclick="LeaderboardModern.setFilter('kk')">
            🎯 Kleinkaliber
          </button>
        </div>
      </div>
    `;

    // Einträge rendern
    const entriesHTML = entries.map((entry, index) => this.renderEntry(entry, index)).join('');

    container.innerHTML = `
      ${searchHTML}
      <div class="lb-modern-count">${entries.length} Schützen</div>
      <div class="lb-modern-list">
        ${entriesHTML}
      </div>
    `;
  },

  /** Einzelnen Eintrag rendern */
  renderEntry(entry, index) {
    const rank = index + 1;
    const displayName = entry.name || entry.username || 'Anonym';
    const isMe = this.isCurrentUser(entry);
    const weaponIcon = entry.weapon === 'kk' ? '🎯' : '🌬️';
    const weaponName = entry.weapon === 'kk' ? 'KK' : 'LG';
    const score = Number(entry.score ?? entry.xp ?? 0) || 0;
    const xp = Number(entry.xp ?? 0) || 0;
    const wins = Number(entry.wins ?? 0) || 0;
    const losses = Number(entry.losses ?? 0) || 0;
    const totalGames = wins + losses;
    const winrate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const streak = Number(entry.streak ?? 0) || 0;
    const rankIcon = entry.rankIcon || '👤';
    const rankName = entry.rank || 'Schütze';

    // Top 3 spezielle Klassen
    let rankClass = '';
    let medalIcon = '';
    if (rank === 1) {
      rankClass = 'top-1';
      medalIcon = '🥇';
    } else if (rank === 2) {
      rankClass = 'top-2';
      medalIcon = '🥈';
    } else if (rank === 3) {
      rankClass = 'top-3';
      medalIcon = '🥉';
    }

    const meClass = isMe ? 'me' : '';

    return `
      <div class="lb-modern-card ${rankClass} ${meClass}">
        <div class="lb-modern-rank">
          ${medalIcon || rank}
        </div>
        <div class="lb-modern-info">
          <div class="lb-modern-name">
            ${rankIcon} ${this.escapeHtml(displayName)}
            ${isMe ? '<span class="lb-modern-me-badge">Du</span>' : ''}
          </div>
          <div class="lb-modern-stats">
            <span class="lb-modern-stat">${weaponIcon} ${weaponName}</span>
            <span class="lb-modern-stat">🏆 ${winrate}%</span>
            <span class="lb-modern-stat">🔥 ${streak}</span>
          </div>
        </div>
        <div class="lb-modern-score">
          <div class="lb-modern-score-value">${score}</div>
          <div class="lb-modern-score-label">Score</div>
          <div class="lb-modern-score-sub">${xp} XP</div>
        </div>
      </div>
    `;
  },

  // ═══════════════════════════════════════════
  //  SUCHE & FILTER
  // ═══════════════════════════════════════════

  /** Such-Handler */
  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.applyFilters();
  },

  /** Filter-Panel togglen */
  toggleFilterPanel() {
    const panel = document.getElementById('lbModernFilterPanel');
    if (panel) {
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
    }
  },

  /** Filter setzen */
  setFilter(filter) {
    this.currentFilter = filter;

    // UI aktualisieren
    document.querySelectorAll('.lb-filter-chip').forEach(chip => {
      chip.classList.remove('active');
    });
    event.target.classList.add('active');

    this.applyFilters();
  },

  /** Filter anwenden */
  applyFilters() {
    let filtered = this.allEntries;

    // Waffe-Filter
    if (this.currentFilter === 'lg') {
      filtered = filtered.filter(e => e.weapon !== 'kk');
    } else if (this.currentFilter === 'kk') {
      filtered = filtered.filter(e => e.weapon === 'kk');
    }

    // Such-Filter
    if (this.searchQuery) {
      filtered = filtered.filter(e => {
        const name = (e.name || e.username || '').toLowerCase();
        return name.includes(this.searchQuery);
      });
    }

    this.filteredEntries = filtered;
    this.render(filtered);
  },

  // ═══════════════════════════════════════════
  //  HILFSFUNKTIONEN
  // ═══════════════════════════════════════════

  /** Prüfen ob aktueller User */
  isCurrentUser(entry) {
    const ownerId = getFirebaseOwnerId();
    return (ownerId && entry.uid === ownerId) ||
           (G.username && (entry.name === G.username || entry.username === G.username));
  },

  /** Scope-Label */
  getScopeLabel(scope) {
    if (scope === 'global') return 'Global';
    const disc = DISC[scope];
    return disc ? disc.name : scope;
  },

  /** HTML escapen */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /** Such-Input Setup (falls benötigt) */
  setupSearchInput() {
    // Wird dynamisch im render() erstellt
  }
};

// ═══════════════════════════════════════════
//  WINDOW FUNKTIONEN (für onclick)
// ═══════════════════════════════════════════

window.LeaderboardModern = LeaderboardModern;

// Override bestehende loadLeaderboard Funktion
const _originalLoadLeaderboard = window.loadLeaderboard;
window.loadLeaderboard = function(force = false) {
  if (typeof LeaderboardModern !== 'undefined') {
    LeaderboardModern.load();
  } else if (_originalLoadLeaderboard) {
    _originalLoadLeaderboard(force);
  }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (typeof fbReady !== 'undefined' && fbReady) {
      LeaderboardModern.init();
    }
  }, 3000);
});
