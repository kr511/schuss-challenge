/* ═══════════════════════════════════════════════════════
   MODERNES LEADERBOARD: Weltrangliste mit Glassmorphism
   - Erweiterte Statistiken
   - Suchfunktion
   - Filter nach Waffe/Disziplin
   - Zeitraum: Heute / Woche / Gesamt (via Worker API)
   - Friends-only Scope
   - Top 3 Medaillen mit spezieller Hervorhebung
   ═══════════════════════════════════════════════════════ */

const LeaderboardModern = {
  // ─── State ───
  allEntries: [],        // Alle geladenen Einträge
  filteredEntries: [],   // Nach Filter/Suche
  currentFilter: 'all',  // 'all', 'lg', 'kk'
  currentPeriod: 'all',  // 'daily' | 'weekly' | 'all'
  friendsOnly: false,
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
  async load(scope = 'global', period = null) {
    if (this.isLoading) return;
    this.isLoading = true;

    const resolvedPeriod = period || this.currentPeriod;

    const container = document.querySelector('.lb-panel[data-lb-list]');
    if (!container) {
      this.isLoading = false;
      return;
    }

    container.innerHTML = '<div class="lb-modern-loading">⏳ Lade Ranking...</div>';

    try {
      if (resolvedPeriod !== 'all') {
        // Worker API für Daily/Weekly
        const res = await fetch(`/api/leaderboard?period=${resolvedPeriod}&mode=standard`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        this.allEntries = (data.leaderboard || []).map(e => ({
          uid: e.userId,
          name: e.displayName,
          score: e.bestScore,
          gamesPlayed: e.gamesPlayed,
          weapon: null, // D1-Leaderboard hat kein Weapon-Feld
          xp: 0,
          wins: 0,
          losses: 0,
          streak: 0,
          rankIcon: '🎯',
          rank: 'Schütze',
        }));
      } else {
        // Firebase für All-Time (bestehende Logik)
        const waitForFirebase = async (maxRetries = 10) => {
          for (let i = 0; i < maxRetries; i++) {
            if (typeof fbReady !== 'undefined' && fbReady && typeof fbDb !== 'undefined' && fbDb) return true;
            await new Promise(r => setTimeout(r, 500));
          }
          return false;
        };

        const fbIsReady = await waitForFirebase();
        if (!fbIsReady) {
          container.innerHTML = `
            <div class="lb-modern-error">
              🔌 Firebase nicht bereit.<br>
              <small>Bitte Seite neu laden (F5).</small>
            </div>
          `;
          this.isLoading = false;
          return;
        }

        const snapshot = await fbDb.ref('leaderboard_v2')
          .orderByChild('score')
          .limitToLast(100)
          .once('value');

        const entries = [];
        snapshot.forEach(child => entries.push(child.val()));
        entries.reverse();
        this.allEntries = entries;
      }

      console.debug(`[LeaderboardModern] ${this.allEntries.length} Einträge geladen (period=${resolvedPeriod})`);
      this.filteredEntries = this.allEntries;
      this.applyFilters();

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
      let emptyText;
      if (this.friendsOnly) {
        emptyText = '👥 Keine Freunde im Ranking.<br><small>Füge Freunde hinzu, um sie hier zu sehen!</small>';
      } else if (scope !== 'global') {
        emptyText = `Noch keine Einträge für ${this.getScopeLabel(scope)}.`;
      } else {
        emptyText = 'Noch keine Einträge. Sei der Erste! 🏆';
      }
      container.innerHTML = `<div class="lb-modern-empty">${emptyText}</div>`;
      return;
    }

    // Weapon-Filter bei Daily/Weekly ausgrauen (D1 hat kein Weapon-Feld)
    const weaponDisabled = this.currentPeriod !== 'all';

    // Suchleiste + Filter-Panel
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
          <button class="lb-filter-chip ${this.currentFilter === 'all' ? 'active' : ''} ${weaponDisabled ? 'lb-chip-disabled' : ''}"
                  onclick="${weaponDisabled ? '' : "LeaderboardModern.setFilter('all')"}">
            Alle
          </button>
          <button class="lb-filter-chip ${this.currentFilter === 'lg' ? 'active' : ''} ${weaponDisabled ? 'lb-chip-disabled' : ''}"
                  onclick="${weaponDisabled ? '' : "LeaderboardModern.setFilter('lg')"}">
            🌬️ Luftgewehr
          </button>
          <button class="lb-filter-chip ${this.currentFilter === 'kk' ? 'active' : ''} ${weaponDisabled ? 'lb-chip-disabled' : ''}"
                  onclick="${weaponDisabled ? '' : "LeaderboardModern.setFilter('kk')"}">
            🎯 Kleinkaliber
          </button>
        </div>
        <div class="lb-modern-filter-divider"></div>
        <div class="lb-modern-filter-label">Zeitraum</div>
        <div class="lb-modern-filter-chips">
          <button class="lb-filter-chip lb-period-chip ${this.currentPeriod === 'daily' ? 'active' : ''}"
                  onclick="LeaderboardModern.setPeriod('daily')">Heute</button>
          <button class="lb-filter-chip lb-period-chip ${this.currentPeriod === 'weekly' ? 'active' : ''}"
                  onclick="LeaderboardModern.setPeriod('weekly')">Woche</button>
          <button class="lb-filter-chip lb-period-chip ${this.currentPeriod === 'all' ? 'active' : ''}"
                  onclick="LeaderboardModern.setPeriod('all')">Gesamt</button>
        </div>
        <div class="lb-modern-filter-divider"></div>
        <div class="lb-modern-filter-chips">
          <button id="lbFriendsChip" class="lb-filter-chip ${this.friendsOnly ? 'active' : ''}"
                  onclick="LeaderboardModern.toggleFriendsOnly()">👥 Nur Freunde</button>
        </div>
      </div>
    `;

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
    const weaponIcon = entry.weapon === 'kk' ? '🎯' : entry.weapon === 'lg' ? '🌬️' : '🎯';
    const weaponName = entry.weapon === 'kk' ? 'KK' : entry.weapon === 'lg' ? 'LG' : '–';
    const score = Number(entry.score ?? entry.xp ?? 0) || 0;
    const xp = Number(entry.xp ?? 0) || 0;
    const wins = Number(entry.wins ?? 0) || 0;
    const losses = Number(entry.losses ?? 0) || 0;
    const totalGames = wins + losses || Number(entry.gamesPlayed ?? 0) || 0;
    const winrate = totalGames > 0 && wins > 0 ? Math.round((wins / totalGames) * 100) : null;
    const streak = Number(entry.streak ?? 0) || 0;
    const rankIcon = entry.rankIcon || '🎯';
    const rankName = entry.rank || 'Schütze';

    // Top 3 spezielle Klassen
    let rankClass = '';
    let medalIcon = '';
    if (rank === 1) { rankClass = 'top-1'; medalIcon = '🥇'; }
    else if (rank === 2) { rankClass = 'top-2'; medalIcon = '🥈'; }
    else if (rank === 3) { rankClass = 'top-3'; medalIcon = '🥉'; }

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
            ${entry.weapon ? `<span class="lb-modern-stat">${weaponIcon} ${weaponName}</span>` : ''}
            ${winrate !== null ? `<span class="lb-modern-stat">🏆 ${winrate}%</span>` : ''}
            ${streak > 0 ? `<span class="lb-modern-stat">🔥 ${streak}</span>` : ''}
            ${entry.gamesPlayed ? `<span class="lb-modern-stat">🎮 ${entry.gamesPlayed}</span>` : ''}
          </div>
        </div>
        <div class="lb-modern-score">
          <div class="lb-modern-score-value">${score}</div>
          <div class="lb-modern-score-label">Score</div>
          ${xp > 0 ? `<div class="lb-modern-score-sub">${xp} XP</div>` : ''}
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
      panel.style.display = panel.style.display !== 'none' ? 'none' : 'block';
    }
  },

  /** Waffe-Filter setzen */
  setFilter(filter) {
    if (this.currentPeriod !== 'all') return; // Weapon-Filter nur bei All-Time
    this.currentFilter = filter;
    document.querySelectorAll('.lb-filter-chip:not(.lb-period-chip):not(#lbFriendsChip)').forEach(chip => {
      chip.classList.remove('active');
    });
    event.target.classList.add('active');
    this.applyFilters();
  },

  /** Zeitraum-Filter setzen */
  setPeriod(period) {
    this.currentPeriod = period;
    // Wenn Period != all, Waffe-Filter zurücksetzen
    if (period !== 'all') this.currentFilter = 'all';
    this.load();
  },

  /** Friends-only umschalten */
  toggleFriendsOnly() {
    this.friendsOnly = !this.friendsOnly;
    document.getElementById('lbFriendsChip')?.classList.toggle('active', this.friendsOnly);
    this.applyFilters();
  },

  /** Filter anwenden */
  applyFilters() {
    let filtered = this.allEntries;

    // Waffe-Filter (nur bei All-Time sinnvoll)
    if (this.currentPeriod === 'all') {
      if (this.currentFilter === 'lg') {
        filtered = filtered.filter(e => e.weapon !== 'kk');
      } else if (this.currentFilter === 'kk') {
        filtered = filtered.filter(e => e.weapon === 'kk');
      }
    }

    // Friends-only Filter
    if (this.friendsOnly) {
      const myId = typeof getFirebaseOwnerId === 'function' ? getFirebaseOwnerId() : null;
      const friendUids = (typeof SocialSystem !== 'undefined')
        ? SocialSystem.getFriends().map(f => f.uid)
        : [];
      filtered = filtered.filter(e => e.uid === myId || friendUids.includes(e.uid));
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
    const ownerId = typeof getFirebaseOwnerId === 'function' ? getFirebaseOwnerId() : null;
    return (ownerId && entry.uid === ownerId) ||
           (typeof G !== 'undefined' && G.username && (entry.name === G.username || entry.username === G.username));
  },

  /** Scope-Label */
  getScopeLabel(scope) {
    if (scope === 'global') return 'Global';
    if (typeof DISC !== 'undefined') {
      const disc = DISC[scope];
      return disc ? disc.name : scope;
    }
    return scope;
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
