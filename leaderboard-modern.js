/* ═══════════════════════════════════════════════════════
   MODERNES LEADERBOARD: Weltrangliste mit Glassmorphism
   - Nutzt Supabase, Backend API oder lokalen Fallback
   - Erweiterte Statistiken
   - Suchfunktion
   - Filter nach Waffe/Disziplin
   ═══════════════════════════════════════════════════════ */

const LeaderboardModern = {
  allEntries: [],
  filteredEntries: [],
  currentFilter: 'all',
  searchQuery: '',
  isLoading: false,

  init() {
    console.debug('[LeaderboardModern] Initialisiert');
    this.setupSearchInput();
  },

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
      const entries = await this.loadEntries(scope, period);
      this.allEntries = entries;
      this.filteredEntries = entries;
      this.render(entries, scope);
    } catch (error) {
      console.error('[LeaderboardModern] Ladefehler:', error);
      container.innerHTML = `<div class="lb-modern-error">⚠️ Fehler: ${this.escapeHtml(error.message || String(error))}</div>`;
    }

    this.isLoading = false;
  },

  async loadEntries(scope = 'global', period = 'alltime') {
    const remoteEntries = await this.loadRemoteEntries(scope, period);
    if (remoteEntries.length > 0) return remoteEntries;
    return this.loadLocalEntries();
  },

  async loadRemoteEntries(scope = 'global', period = 'alltime') {
    const apiEntries = await this.loadFromBackendApi(scope, period);
    if (apiEntries.length > 0) return apiEntries;

    const supabaseEntries = await this.loadFromSupabase();
    if (supabaseEntries.length > 0) return supabaseEntries;

    return [];
  },

  async loadFromBackendApi(scope = 'global', period = 'alltime') {
    try {
      if (!window.SchussApi || typeof window.SchussApi.fetch !== 'function') return [];
      const result = await window.SchussApi.fetch(`/api/leaderboard?scope=${encodeURIComponent(scope)}&period=${encodeURIComponent(period)}`);
      const entries = Array.isArray(result) ? result : (Array.isArray(result?.entries) ? result.entries : []);
      return this.normalizeEntries(entries);
    } catch (error) {
      console.warn('[LeaderboardModern] Backend-Leaderboard nicht verfügbar:', error?.message || error);
      return [];
    }
  },

  async loadFromSupabase() {
    try {
      const client = window.SupabaseClient || window.SupabaseAuth?.client;
      if (!client || typeof client.from !== 'function') return [];

      const { data, error } = await client
        .from('leaderboard_entries')
        .select('*')
        .order('score', { ascending: false })
        .limit(100);

      if (error) throw error;
      return this.normalizeEntries(data || []);
    } catch (error) {
      console.warn('[LeaderboardModern] Supabase-Leaderboard nicht verfügbar:', error?.message || error);
      return [];
    }
  },

  loadLocalEntries() {
    try {
      const raw = localStorage.getItem('sd_player_highscores') || '[]';
      const entries = JSON.parse(raw);
      return this.normalizeEntries(Array.isArray(entries) ? entries : []);
    } catch (error) {
      console.warn('[LeaderboardModern] Lokaler Leaderboard-Fallback fehlgeschlagen:', error?.message || error);
      return [];
    }
  },

  normalizeEntries(entries) {
    return entries
      .map((entry, index) => {
        const xp = Number(entry.xp ?? entry.score ?? entry.playerScore ?? 0) || 0;
        const score = Number(entry.score ?? entry.playerScore ?? xp) || 0;
        const wins = Number(entry.wins ?? (entry.result === 'win' ? 1 : 0)) || 0;
        const losses = Number(entry.losses ?? (entry.result === 'loss' ? 1 : 0)) || 0;
        return {
          id: entry.id || entry.user_id || entry.uid || `entry_${index}`,
          uid: entry.user_id || entry.uid || entry.id || '',
          name: entry.name || entry.username || entry.display_name || entry.playerName || 'Anonym',
          username: entry.username || entry.name || entry.display_name || entry.playerName || 'Anonym',
          weapon: entry.weapon || '',
          score,
          xp,
          wins,
          losses,
          streak: Number(entry.streak ?? 0) || 0,
          rankIcon: entry.rankIcon || '👤',
          rank: entry.rank || 'Schütze',
          timestamp: Number(entry.timestamp || entry.created_at || Date.now()) || Date.now()
        };
      })
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 100);
  },

  render(entries, scope = 'global') {
    const container = document.querySelector('.lb-panel[data-lb-list]');
    if (!container) return;

    if (!entries || entries.length === 0) {
      const emptyText = scope === 'global'
        ? 'Noch keine Einträge. Sei der Erste! 🏆'
        : `Noch keine Einträge für ${this.getScopeLabel(scope)}.`;
      container.innerHTML = `<div class="lb-modern-empty">${this.escapeHtml(emptyText)}</div>`;
      return;
    }

    const searchHTML = `
      <div class="lb-modern-search-bar">
        <input 
          type="text" 
          id="lbModernSearch" 
          class="lb-modern-search-input" 
          placeholder="🔍 Spieler suchen..."
          oninput="LeaderboardModern.handleSearch(this.value)"
        >
        <div class="lb-modern-filter-toggle" onclick="LeaderboardModern.toggleFilterPanel()">⚙️</div>
      </div>
      <div id="lbModernFilterPanel" style="display:none;">
        <div class="lb-modern-filter-chips">
          <button class="lb-filter-chip ${this.currentFilter === 'all' ? 'active' : ''}" onclick="LeaderboardModern.setFilter('all', event)">Alle</button>
          <button class="lb-filter-chip ${this.currentFilter === 'lg' ? 'active' : ''}" onclick="LeaderboardModern.setFilter('lg', event)">🌬️ Luftgewehr</button>
          <button class="lb-filter-chip ${this.currentFilter === 'kk' ? 'active' : ''}" onclick="LeaderboardModern.setFilter('kk', event)">🎯 Kleinkaliber</button>
        </div>
      </div>
    `;

    const entriesHTML = entries.map((entry, index) => this.renderEntry(entry, index)).join('');

    container.innerHTML = `
      ${searchHTML}
      <div class="lb-modern-count">${entries.length} Schützen</div>
      <div class="lb-modern-list">${entriesHTML}</div>
    `;
  },

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
        <div class="lb-modern-rank">${medalIcon || rank}</div>
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

  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.applyFilters();
  },

  toggleFilterPanel() {
    const panel = document.getElementById('lbModernFilterPanel');
    if (panel) panel.style.display = panel.style.display !== 'none' ? 'none' : 'block';
  },

  setFilter(filter, evt) {
    this.currentFilter = filter;
    document.querySelectorAll('.lb-filter-chip').forEach(chip => chip.classList.remove('active'));
    if (evt?.target) evt.target.classList.add('active');
    this.applyFilters();
  },

  applyFilters() {
    let filtered = this.allEntries;

    if (this.currentFilter === 'lg') {
      filtered = filtered.filter(e => e.weapon !== 'kk');
    } else if (this.currentFilter === 'kk') {
      filtered = filtered.filter(e => e.weapon === 'kk');
    }

    if (this.searchQuery) {
      filtered = filtered.filter(e => {
        const name = (e.name || e.username || '').toLowerCase();
        return name.includes(this.searchQuery);
      });
    }

    this.filteredEntries = filtered;
    this.render(filtered);
  },

  isCurrentUser(entry) {
    const currentId = window.SupabaseSession?.user?.id || '';
    const currentName = window.G?.username || window.G?.name || localStorage.getItem('username') || localStorage.getItem('sd_username') || '';
    return Boolean(
      (currentId && entry.uid === currentId) ||
      (currentName && (entry.name === currentName || entry.username === currentName))
    );
  },

  getScopeLabel(scope) {
    if (scope === 'global') return 'Global';
    const disc = typeof DISC !== 'undefined' ? DISC[scope] : null;
    return disc ? disc.name : scope;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  },

  setupSearchInput() {}
};

window.LeaderboardModern = LeaderboardModern;

const _originalLoadLeaderboard = window.loadLeaderboard;
window.loadLeaderboard = function(force = false) {
  if (typeof LeaderboardModern !== 'undefined') {
    LeaderboardModern.load();
  } else if (_originalLoadLeaderboard) {
    _originalLoadLeaderboard(force);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    LeaderboardModern.init();
  }, 500);
});
