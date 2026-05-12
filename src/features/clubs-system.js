/**
 * Vereinsmodus Sprint 1
 * Supabase-only feature module with local/no-login fallbacks.
 */
const ClubsSystem = (function () {
  'use strict';

  const ROLE_LABELS = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Mitglied',
  };

  const DISCIPLINE_LABELS = {
    all: 'Alle Disziplinen',
    lg40: 'LG 40',
    lg60: 'LG 60',
    kk50: 'KK 50',
    kk100: 'KK 100',
    kk3x20: 'KK 3×20',
  };

  const TIME_RANGE_LABELS = {
    week: 'Diese Woche',
    month: 'Dieser Monat',
    season: 'Saison',
    alltime: 'Gesamt',
  };

  const RANKING_FILTERS_KEY = 'clubs_ranking_filters';

  function loadStoredRankingFilters() {
    try {
      const raw = getStorageRaw(RANKING_FILTERS_KEY, '');
      if (!raw) return { discipline: 'all', timeRange: 'alltime' };
      const parsed = JSON.parse(raw);
      return {
        discipline: DISCIPLINE_LABELS[parsed.discipline] ? parsed.discipline : 'all',
        timeRange: TIME_RANGE_LABELS[parsed.timeRange] ? parsed.timeRange : 'alltime',
      };
    } catch (_error) {
      return { discipline: 'all', timeRange: 'alltime' };
    }
  }

  const state = {
    initialized: false,
    loading: false,
    actionBusy: false,
    readyDispatched: false,
    myClub: null,
    members: [],
    leaderboard: [],
    memberCount: 0,
    myRank: null,
    activeTab: 'overview',
    lastError: '',
    currentChallenge: null,
    challengeStandings: [],
    clubRankingFilters: { discipline: 'all', timeRange: 'alltime' },
  };

  function getClient() {
    return window.SupabaseClient || (window.SupabaseAuth && window.SupabaseAuth.client) || null;
  }

  function getSession() {
    if (window.SupabaseSession) return window.SupabaseSession;
    if (window.SupabaseAuth && typeof window.SupabaseAuth.getSession === 'function') {
      return window.SupabaseAuth.getSession();
    }
    return null;
  }

  function getUser() {
    const session = getSession();
    return session && session.user ? session.user : null;
  }

  function getStorageRaw(key, fallback = '') {
    try {
      if (window.StorageManager && typeof window.StorageManager.getRaw === 'function') {
        return window.StorageManager.getRaw(key, fallback);
      }
      return localStorage.getItem('sd_' + key) || fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function isLocalMode() {
    return window.SchussduellLocalMode === true ||
      window.SchussduellLocalPlay === true ||
      getStorageRaw('local_mode') === '1' ||
      getStorageRaw('local_play') === '1';
  }

  function hasRemoteSession() {
    return !!(getClient() && getUser() && !isLocalMode());
  }

  function dispatchReadyOnce() {
    if (state.readyDispatched) return;
    state.readyDispatched = true;
    try {
      window.dispatchEvent(new CustomEvent('featureReady', { detail: { name: 'clubs-system' } }));
    } catch (_error) {}
  }

  function createEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function createButton(label, className, onClick) {
    const button = createEl('button', className, label);
    button.type = 'button';
    if (typeof onClick === 'function') button.addEventListener('click', onClick);
    return button;
  }

  function normalizeClub(row) {
    if (!row) return null;
    return {
      id: row.id || '',
      name: row.name || 'Verein',
      slug: row.slug || '',
      code: row.code || '',
      location: row.location || '',
      createdBy: row.created_by || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
      role: row.role || 'member',
      joinedAt: row.joined_at || '',
    };
  }

  function normalizeMembership(row) {
    if (!row) return null;
    const clubRow = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
    const club = normalizeClub(clubRow);
    if (!club) return null;
    club.role = row.role || club.role || 'member';
    club.joinedAt = row.joined_at || club.joinedAt || '';
    return club;
  }

  function normalizeCode(code) {
    return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function shortUserId(userId) {
    const raw = String(userId || '');
    if (!raw) return 'Unbekannt';
    return raw.length > 10 ? raw.slice(0, 8) + '...' : raw;
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function roleLabel(role) {
    return ROLE_LABELS[role] || 'Mitglied';
  }

  function friendlyError(error) {
    const message = String((error && (error.message || error.details || error.hint)) || error || '');
    if (message.includes('AUTH_REQUIRED') || message.includes('JWT')) return 'Melde dich an, um Vereine zu nutzen.';
    if (message.includes('CLUB_NAME_REQUIRED')) return 'Bitte gib einen Vereinsnamen ein.';
    if (message.includes('CLUB_CODE_INVALID')) return 'Dieser Vereinscode sieht nicht richtig aus.';
    if (message.includes('CLUB_CODE_NOT_FOUND') || message.includes('No rows')) return 'Kein Verein mit diesem Code gefunden.';
    if (message.includes('relation') && message.includes('clubs')) return 'Die Vereins-Migration ist noch nicht in Supabase angewendet.';
    if (message.includes('function') && message.includes('club')) return 'Die Vereins-RPCs sind noch nicht in Supabase angewendet.';
    return message || 'Aktion konnte nicht ausgeführt werden.';
  }

  function showToast(message, type = 'info') {
    const toast = createEl('div', 'club-toast club-toast-' + type, message);
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 260);
    }, 2800);
  }

  function setOverlayMessage(message, type = 'info') {
    const node = document.getElementById('clubOverlayMessage');
    if (!node) return;
    node.className = 'club-message club-message-' + type;
    node.textContent = message || '';
    node.hidden = !message;
  }

  async function init(force = false) {
    if (state.loading && !force) return false;
    state.loading = true;
    state.lastError = '';
    if (!state.initialized) {
      state.clubRankingFilters = loadStoredRankingFilters();
    }
    renderDashboardClubCard();

    try {
      if (!hasRemoteSession()) {
        state.myClub = null;
        state.members = [];
        state.leaderboard = [];
        state.memberCount = 0;
        state.myRank = null;
        state.currentChallenge = null;
        state.challengeStandings = [];
        state.initialized = true;
        return false;
      }

      await refreshClubData();
      state.initialized = true;
      return true;
    } catch (error) {
      state.lastError = friendlyError(error);
      console.warn('[ClubsSystem] init failed:', error);
      return false;
    } finally {
      state.loading = false;
      renderDashboardClubCard();
      if (isOverlayOpen()) renderClubOverlay();
      dispatchReadyOnce();
    }
  }

  async function refreshClubData() {
    const club = await getMyClub();
    state.myClub = club;
    state.members = [];
    state.leaderboard = [];
    state.memberCount = 0;
    state.myRank = null;
    state.currentChallenge = null;
    state.challengeStandings = [];

    if (!club || !club.id) return null;

    state.members = await loadClubMembers(club.id);
    state.memberCount = state.members.length;
    state.leaderboard = await loadClubLeaderboard(club.id, state.clubRankingFilters);
    state.currentChallenge = await loadCurrentClubChallenge(club.id);
    if (state.currentChallenge) {
      state.challengeStandings = await loadChallengeStandings(state.currentChallenge.id);
    }

    const user = getUser();
    const ownEntry = user ? state.leaderboard.find((entry) => entry.userId === user.id) : null;
    state.myRank = ownEntry ? ownEntry.rank : null;
    return club;
  }

  async function getMyClub() {
    const client = getClient();
    const user = getUser();
    if (!client || !user || isLocalMode()) return null;

    const result = await client
      .from('club_members')
      .select('club_id, role, joined_at, clubs(id, name, slug, code, location, created_by, created_at, updated_at)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (result.error) throw result.error;
    return normalizeMembership(result.data);
  }

  async function createClub(payload) {
    if (state.actionBusy) return state.myClub;
    const client = getClient();
    const user = getUser();
    if (!client || !user || isLocalMode()) {
      const message = 'Melde dich an, um einen Verein zu erstellen.';
      setOverlayMessage(message, 'error');
      showToast(message, 'error');
      return null;
    }

    const name = String((payload && payload.name) || '').trim();
    const location = String((payload && payload.location) || '').trim();
    if (name.length < 2) {
      const message = 'Bitte gib einen Vereinsnamen ein.';
      setOverlayMessage(message, 'error');
      return null;
    }

    state.actionBusy = true;
    state.lastError = '';
    setOverlayMessage('Verein wird erstellt...', 'info');

    try {
      const result = await client.rpc('create_club_with_owner', {
        club_name: name,
        club_location: location || null,
      });

      if (result.error) throw result.error;
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      state.myClub = normalizeClub(row);
      state.activeTab = 'overview';
      state.lastError = '';
      await refreshClubData();
      renderDashboardClubCard();
      renderClubOverlay();
      showToast('Verein erstellt.', 'success');
      window.dispatchEvent(new CustomEvent('clubsChanged', { detail: { club: state.myClub } }));
      return state.myClub;
    } catch (error) {
      const message = friendlyError(error);
      state.lastError = message;
      setOverlayMessage(message, 'error');
      showToast(message, 'error');
      throw error;
    } finally {
      state.actionBusy = false;
    }
  }

  async function joinClubByCode(code) {
    if (state.actionBusy) return state.myClub;
    const client = getClient();
    const user = getUser();
    if (!client || !user || isLocalMode()) {
      const message = 'Melde dich an, um einem Verein beizutreten.';
      setOverlayMessage(message, 'error');
      showToast(message, 'error');
      return null;
    }

    const normalized = normalizeCode(code);
    if (normalized.length < 5) {
      const message = 'Bitte gib einen Vereinscode ein.';
      setOverlayMessage(message, 'error');
      return null;
    }

    state.actionBusy = true;
    state.lastError = '';
    setOverlayMessage('Code wird geprüft...', 'info');

    try {
      const result = await client.rpc('join_club_by_code', { join_code: normalized });
      if (result.error) throw result.error;
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      state.myClub = normalizeClub(row);
      state.activeTab = 'overview';
      state.lastError = '';
      await refreshClubData();
      renderDashboardClubCard();
      renderClubOverlay();
      showToast('Verein beigetreten.', 'success');
      window.dispatchEvent(new CustomEvent('clubsChanged', { detail: { club: state.myClub } }));
      return state.myClub;
    } catch (error) {
      const message = friendlyError(error);
      state.lastError = message;
      setOverlayMessage(message, 'error');
      showToast(message, 'error');
      throw error;
    } finally {
      state.actionBusy = false;
    }
  }

  async function loadProfiles(userIds) {
    const client = getClient();
    const ids = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!client || ids.length === 0) return {};

    try {
      const result = await client
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ids);
      if (result.error) throw result.error;

      const byId = {};
      (result.data || []).forEach((profile) => {
        byId[profile.id] = profile;
      });
      return byId;
    } catch (error) {
      console.warn('[ClubsSystem] profiles unavailable:', error);
      return {};
    }
  }

  async function loadClubMembers(clubId) {
    const client = getClient();
    if (!client || !clubId || !hasRemoteSession()) return [];

    const result = await client
      .from('club_members')
      .select('id, club_id, user_id, role, joined_at')
      .eq('club_id', clubId)
      .order('joined_at', { ascending: true });

    if (result.error) throw result.error;

    const rows = result.data || [];
    const profiles = await loadProfiles(rows.map((row) => row.user_id));
    return rows.map((row) => {
      const profile = profiles[row.user_id] || {};
      return {
        id: row.id,
        clubId: row.club_id,
        userId: row.user_id,
        role: row.role || 'member',
        joinedAt: row.joined_at || '',
        displayName: profile.display_name || profile.username || shortUserId(row.user_id),
        avatarUrl: profile.avatar_url || '',
      };
    });
  }

  async function loadClubLeaderboard(clubId, filters) {
    const client = getClient();
    if (!client || !clubId || !hasRemoteSession()) return [];

    const activeFilters = filters || state.clubRankingFilters || { discipline: 'all', timeRange: 'alltime' };
    const members = state.myClub && state.myClub.id === clubId && state.members.length
      ? state.members
      : await loadClubMembers(clubId);
    const memberById = {};
    members.forEach((member) => {
      memberById[member.userId] = member;
    });

    try {
      const rpcResult = await client.rpc('get_club_leaderboard_filtered', {
        p_club_id: clubId,
        p_discipline: activeFilters.discipline || 'all',
        p_time_range: activeFilters.timeRange || 'alltime',
      });

      if (!rpcResult.error && Array.isArray(rpcResult.data)) {
        return rpcResult.data
          .filter((row) => row && row.user_id)
          .map((row) => ({
            userId: row.user_id,
            displayName: (memberById[row.user_id] && memberById[row.user_id].displayName) || shortUserId(row.user_id),
            bestScore: Number(row.best_score) || 0,
            totalSessions: Number(row.session_count) || 0,
            duelWins: Number(row.duel_wins) || 0,
            lastResultAt: row.last_session || '',
          }))
          .sort((a, b) => {
            if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
            if (b.duelWins !== a.duelWins) return b.duelWins - a.duelWins;
            return b.totalSessions - a.totalSessions;
          })
          .map((entry, index) => Object.assign(entry, { rank: index + 1 }));
      }
      if (rpcResult.error) {
        console.warn('[ClubsSystem] filtered leaderboard RPC unavailable, falling back:', rpcResult.error);
      }
    } catch (error) {
      console.warn('[ClubsSystem] filtered leaderboard RPC failed, falling back:', error);
    }

    // Fallback: legacy leaderboard_entries query (no filters, no duel wins)
    const memberIds = members.map((member) => member.userId).filter(Boolean);
    if (memberIds.length === 0) return [];

    try {
      const result = await client
        .from('leaderboard_entries')
        .select('user_id, username, score, xp, weapon, discipline, created_at')
        .in('user_id', memberIds)
        .order('score', { ascending: false })
        .limit(500);

      if (result.error) throw result.error;

      const byUser = {};
      (result.data || []).forEach((row) => {
        const userId = row.user_id;
        if (!userId || !memberById[userId]) return;
        const score = Number(row.score);
        if (!Number.isFinite(score)) return;

        if (!byUser[userId]) {
          byUser[userId] = {
            userId,
            displayName: memberById[userId].displayName || row.username || shortUserId(userId),
            bestScore: score,
            totalSessions: 0,
            duelWins: 0,
            lastResultAt: row.created_at || '',
            weapon: row.weapon || '',
            discipline: row.discipline || '',
          };
        }

        byUser[userId].totalSessions += 1;
        if (score > byUser[userId].bestScore) {
          byUser[userId].bestScore = score;
          byUser[userId].weapon = row.weapon || byUser[userId].weapon;
          byUser[userId].discipline = row.discipline || byUser[userId].discipline;
        }
        if (row.created_at && (!byUser[userId].lastResultAt || Date.parse(row.created_at) > Date.parse(byUser[userId].lastResultAt))) {
          byUser[userId].lastResultAt = row.created_at;
        }
      });

      return Object.values(byUser)
        .sort((a, b) => Number(b.bestScore || 0) - Number(a.bestScore || 0))
        .map((entry, index) => Object.assign(entry, { rank: index + 1 }));
    } catch (error) {
      console.warn('[ClubsSystem] club leaderboard unavailable:', error);
      return [];
    }
  }

  async function loadCurrentClubChallenge(clubId) {
    const client = getClient();
    if (!client || !clubId || !hasRemoteSession()) return null;

    try {
      const result = await client
        .from('club_challenges')
        .select('id, club_id, name, description, difficulty, discipline, weapon, required_score, starts_at, ends_at, created_by, created_at')
        .eq('club_id', clubId)
        .lte('starts_at', new Date().toISOString())
        .gte('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (result.error) {
        if (String(result.error.message || '').includes('relation') || String(result.error.code || '') === '42P01') {
          return null;
        }
        throw result.error;
      }
      if (!result.data) return null;
      return {
        id: result.data.id,
        clubId: result.data.club_id,
        name: result.data.name,
        description: result.data.description || '',
        difficulty: result.data.difficulty || 'real',
        discipline: result.data.discipline,
        weapon: result.data.weapon || '',
        requiredScore: result.data.required_score,
        startsAt: result.data.starts_at,
        endsAt: result.data.ends_at,
        createdBy: result.data.created_by,
        createdAt: result.data.created_at,
      };
    } catch (error) {
      console.warn('[ClubsSystem] club challenge unavailable:', error);
      return null;
    }
  }

  async function loadChallengeStandings(challengeId) {
    const client = getClient();
    if (!client || !challengeId || !hasRemoteSession()) return [];

    try {
      const result = await client
        .from('club_challenge_completions')
        .select('id, user_id, score, completed_at')
        .eq('challenge_id', challengeId)
        .order('score', { ascending: false })
        .limit(50);

      if (result.error) {
        if (String(result.error.code || '') === '42P01') return [];
        throw result.error;
      }
      const memberById = {};
      state.members.forEach((member) => {
        memberById[member.userId] = member;
      });
      return (result.data || []).map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        displayName: (memberById[row.user_id] && memberById[row.user_id].displayName) || shortUserId(row.user_id),
        score: Number(row.score) || 0,
        completedAt: row.completed_at || '',
      }));
    } catch (error) {
      console.warn('[ClubsSystem] challenge standings unavailable:', error);
      return [];
    }
  }

  async function submitChallengeResult(challengeId, score) {
    const client = getClient();
    if (!client || !challengeId || !hasRemoteSession()) return null;
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0) return null;

    try {
      const result = await client.rpc('submit_club_challenge_result', {
        p_challenge_id: challengeId,
        p_score: Math.round(numericScore),
      });
      if (result.error) throw result.error;
      return result.data;
    } catch (error) {
      console.warn('[ClubsSystem] submit challenge result failed:', error);
      throw error;
    }
  }


  function renderDashboardClubCard() {
    const mount = document.getElementById('clubDashboardMount');
    if (!mount) return;

    mount.replaceChildren();

    const card = createEl('section', 'club-dashboard-card');
    const eyebrow = createEl('div', 'club-card-eyebrow', 'Vereinsmodus');
    const title = createEl('h3', 'club-card-title', 'Dein Verein');
    const text = createEl('p', 'club-card-text');
    const actions = createEl('div', 'club-card-actions');

    card.append(eyebrow, title);

    if (state.loading && !state.initialized) {
      text.textContent = 'Vereinsstatus wird geladen...';
      card.append(text, createEl('div', 'club-loading-bar'));
      mount.appendChild(card);
      return;
    }

    if (!hasRemoteSession()) {
      text.textContent = 'Melde dich an, um deinen Schützenverein zu verbinden.';
      actions.appendChild(createButton('Anmelden', 'club-btn club-btn-primary', () => {
        if (typeof window.openLoginModal === 'function') window.openLoginModal();
      }));
      card.append(text, actions);
      mount.appendChild(card);
      return;
    }

    if (state.lastError && !state.myClub) {
      text.textContent = state.lastError;
      actions.appendChild(createButton('Erneut laden', 'club-btn club-btn-secondary', () => init(true)));
      card.append(text, actions);
      mount.appendChild(card);
      return;
    }

    if (!state.myClub) {
      text.textContent = 'Tritt deinem Schützenverein bei oder erstelle einen neuen.';
      actions.append(
        createButton('Verein erstellen', 'club-btn club-btn-primary', () => showClubOverlay('create')),
        createButton('Code eingeben', 'club-btn club-btn-secondary', () => showClubOverlay('join'))
      );
      card.append(text, actions);
      mount.appendChild(card);
      return;
    }

    title.textContent = state.myClub.name;
    text.textContent = state.myClub.location ? state.myClub.location : 'Dein Vereinsbereich ist bereit.';

    const stats = createEl('div', 'club-card-stats');
    const challengeStatus = state.currentChallenge
      ? state.currentChallenge.name
      : 'Keine aktive Challenge';
    stats.append(
      statPill('Dein Rang', state.myRank ? '#' + state.myRank : '-'),
      statPill('Mitglieder', String(state.memberCount || 0)),
      statPill('Wochenstatus', challengeStatus)
    );

    actions.appendChild(createButton('Verein öffnen', 'club-btn club-btn-primary', () => showClubOverlay('overview')));
    card.append(text, stats, actions);
    mount.appendChild(card);
  }

  function statPill(label, value) {
    const item = createEl('div', 'club-stat-pill');
    item.append(createEl('span', 'club-stat-label', label), createEl('strong', '', value));
    return item;
  }

  function ensureOverlay() {
    let overlay = document.getElementById('clubOverlay');
    if (overlay) return overlay;

    overlay = createEl('div', 'club-overlay');
    overlay.id = 'clubOverlay';
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeClubOverlay();
    });

    const sheet = createEl('div', 'club-sheet');
    sheet.id = 'clubSheet';
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
    return overlay;
  }

  function isOverlayOpen() {
    const overlay = document.getElementById('clubOverlay');
    return !!(overlay && overlay.classList.contains('active'));
  }

  function lockBodyScroll() {
    if (document.body.dataset.clubScrollLock === '1') return;
    // Capture previous state synchronously (NOT in rAF - iOS 17 Safari freeze)
    document.body.dataset.clubScrollLock = '1';
    document.body.dataset.clubPrevOverflow = document.body.style.overflow || '';
    document.body.dataset.clubPrevPosition = document.body.style.position || '';
    document.body.dataset.clubPrevTop = document.body.style.top || '';
    document.body.dataset.clubScrollY = String(window.scrollY || 0);
    document.body.style.overflow = 'hidden';
    // position: fixed + top: -scrollY prevents iOS 17 scroll-freeze after modal close
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + (window.scrollY || 0) + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
  }

  function unlockBodyScroll() {
    if (document.body.dataset.clubScrollLock !== '1') return;
    const scrollY = parseInt(document.body.dataset.clubScrollY || '0', 10) || 0;
    // Restore SYNCHRONOUSLY (not in rAF) - iOS 17 Safari requires this
    document.body.style.overflow = document.body.dataset.clubPrevOverflow || '';
    document.body.style.position = document.body.dataset.clubPrevPosition || '';
    document.body.style.top = document.body.dataset.clubPrevTop || '';
    document.body.style.left = '';
    document.body.style.right = '';
    delete document.body.dataset.clubScrollLock;
    delete document.body.dataset.clubPrevOverflow;
    delete document.body.dataset.clubPrevPosition;
    delete document.body.dataset.clubPrevTop;
    delete document.body.dataset.clubScrollY;
    // Force reflow so iOS Safari flushes layout before scroll restore
    void document.body.offsetHeight;
    if (scrollY > 0) {
      window.scrollTo(0, scrollY);
    }
  }

  function showClubOverlay(tab) {
    state.activeTab = tab || (state.myClub ? 'overview' : 'create');
    const overlay = ensureOverlay();
    renderClubOverlay();
    overlay.classList.add('active');
    lockBodyScroll();

    if (state.myClub && (!state.members.length || !state.initialized)) {
      init(true).catch((error) => console.warn('[ClubsSystem] overlay refresh failed:', error));
    }
  }

  function closeClubOverlay() {
    const overlay = document.getElementById('clubOverlay');
    if (overlay) overlay.classList.remove('active');
    unlockBodyScroll();
  }

  function renderClubOverlay() {
    const overlay = ensureOverlay();
    const sheet = overlay.querySelector('#clubSheet');
    if (!sheet) return;

    sheet.replaceChildren();

    const header = createEl('div', 'club-sheet-header');
    const titleWrap = createEl('div', 'club-sheet-titlewrap');
    const title = createEl('h2', 'club-sheet-title', state.myClub ? state.myClub.name : 'Vereinsmodus');
    titleWrap.appendChild(title);
    if (state.myClub && state.myClub.code) {
      titleWrap.appendChild(createEl('div', 'club-sheet-code', state.myClub.code));
    }
    const closeButton = createButton('×', 'club-close-btn', closeClubOverlay);
    closeButton.setAttribute('aria-label', 'Vereinsbereich schließen');
    header.append(titleWrap, closeButton);

    const message = createEl('div', 'club-message');
    message.id = 'clubOverlayMessage';
    message.hidden = !state.lastError;
    if (state.lastError) message.textContent = state.lastError;

    const tabs = createEl('div', 'club-tabs');
    const tabDefs = state.myClub
      ? [
          ['overview', 'Übersicht'],
          ['members', 'Mitglieder'],
          ['leaderboard', 'Rangliste'],
          ['challenge', 'Wochenchallenge'],
        ]
      : [
          ['create', 'Verein erstellen'],
          ['join', 'Code eingeben'],
        ];

    tabDefs.forEach(([key, label]) => {
      const tabButton = createButton(label, 'club-tab' + (state.activeTab === key ? ' active' : ''), () => {
        state.activeTab = key;
        state.lastError = '';
        renderClubOverlay();
      });
      tabs.appendChild(tabButton);
    });

    const body = createEl('div', 'club-sheet-body');
    if (!state.myClub && state.activeTab === 'join') {
      renderJoinForm(body);
    } else if (!state.myClub) {
      renderCreateForm(body);
    } else if (state.activeTab === 'members') {
      renderMembersTab(body);
    } else if (state.activeTab === 'leaderboard') {
      renderLeaderboardTab(body);
    } else if (state.activeTab === 'challenge') {
      renderChallengeTab(body);
    } else {
      renderOverviewTab(body);
    }

    sheet.append(header, tabs, message, body);
  }

  function renderCreateForm(body) {
    const intro = createEl('p', 'club-form-intro', 'Lege deinen Verein an. Du wirst automatisch Vereins-Admin und bekommst einen Code zum Teilen.');
    const form = createEl('form', 'club-form');

    const nameInput = createEl('input', 'club-input');
    nameInput.name = 'clubName';
    nameInput.placeholder = 'Vereinsname';
    nameInput.maxLength = 120;
    nameInput.required = true;

    const locationInput = createEl('input', 'club-input');
    locationInput.name = 'clubLocation';
    locationInput.placeholder = 'Ort oder Kürzel optional';
    locationInput.maxLength = 120;

    const submit = createEl('button', 'club-btn club-btn-primary club-btn-wide', 'Verein erstellen');
    submit.type = 'submit';
    submit.disabled = state.actionBusy;

    form.append(nameInput, locationInput, submit);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      submit.textContent = 'Wird erstellt...';
      try {
        await createClub({ name: nameInput.value, location: locationInput.value });
      } catch (_error) {
        submit.disabled = false;
        submit.textContent = 'Verein erstellen';
      }
    });

    body.append(intro, form);
  }

  function renderJoinForm(body) {
    const intro = createEl('p', 'club-form-intro', 'Gib den Vereinscode ein, den du von deinem Verein erhalten hast.');
    const form = createEl('form', 'club-form');

    const codeInput = createEl('input', 'club-input club-code-input');
    codeInput.name = 'clubCode';
    codeInput.placeholder = 'SVB-4821';
    codeInput.maxLength = 16;
    codeInput.autocapitalize = 'characters';
    codeInput.required = true;

    const submit = createEl('button', 'club-btn club-btn-primary club-btn-wide', 'Beitreten');
    submit.type = 'submit';
    submit.disabled = state.actionBusy;

    form.append(codeInput, submit);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      submit.textContent = 'Wird geprüft...';
      try {
        await joinClubByCode(codeInput.value);
      } catch (_error) {
        submit.disabled = false;
        submit.textContent = 'Beitreten';
      }
    });

    body.append(intro, form);
  }

  function renderOverviewTab(body) {
    const club = state.myClub;
    if (!club) return;

    const challengeLabel = state.currentChallenge
      ? state.currentChallenge.name + ' · ' + (DISCIPLINE_LABELS[state.currentChallenge.discipline] || state.currentChallenge.discipline)
      : 'Noch keine Wochenchallenge';

    const grid = createEl('div', 'club-overview-grid');
    grid.append(
      overviewItem('Vereinscode', club.code || '-'),
      overviewItem('Mitglieder', String(state.memberCount || state.members.length || 0)),
      overviewItem('Deine Rolle', roleLabel(club.role)),
      overviewItem('Wochenchallenge', challengeLabel)
    );

    const codeBox = createEl('div', 'club-code-box');
    const codeText = createEl('div', 'club-code-large', club.code || '-');
    const copyButton = createButton('Code kopieren', 'club-btn club-btn-secondary', () => copyClubCode(club.code));
    codeBox.append(codeText, copyButton);

    body.append(grid, codeBox);
  }

  function overviewItem(label, value) {
    const item = createEl('div', 'club-overview-item');
    item.append(createEl('span', '', label), createEl('strong', '', value));
    return item;
  }

  function renderMembersTab(body) {
    const list = createEl('div', 'club-list');

    if (!state.members.length) {
      list.appendChild(emptyState('Noch keine Mitglieder sichtbar.'));
      body.appendChild(list);
      return;
    }

    state.members.forEach((member) => {
      const row = createEl('div', 'club-member-row');
      const avatar = createEl('div', 'club-member-avatar', (member.displayName || 'S').charAt(0).toUpperCase());
      const info = createEl('div', 'club-member-info');
      info.append(
        createEl('strong', '', member.displayName || shortUserId(member.userId)),
        createEl('span', '', roleLabel(member.role) + (member.joinedAt ? ' seit ' + formatDate(member.joinedAt) : ''))
      );
      row.append(avatar, info);
      list.appendChild(row);
    });

    body.appendChild(list);
  }

  function renderLeaderboardTab(body) {
    const filters = state.clubRankingFilters || { discipline: 'all', timeRange: 'alltime' };

    const filterBar = createEl('div', 'club-filter-bar');

    const disciplineSelect = createEl('select', 'club-filter-select');
    Object.keys(DISCIPLINE_LABELS).forEach((key) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = DISCIPLINE_LABELS[key];
      if (filters.discipline === key) option.selected = true;
      disciplineSelect.appendChild(option);
    });

    const timeSelect = createEl('select', 'club-filter-select');
    Object.keys(TIME_RANGE_LABELS).forEach((key) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = TIME_RANGE_LABELS[key];
      if (filters.timeRange === key) option.selected = true;
      timeSelect.appendChild(option);
    });

    const onFilterChange = async () => {
      const newFilters = {
        discipline: disciplineSelect.value || 'all',
        timeRange: timeSelect.value || 'alltime',
      };
      state.clubRankingFilters = newFilters;
      try {
        if (window.StorageManager && typeof window.StorageManager.setRaw === 'function') {
          window.StorageManager.setRaw(RANKING_FILTERS_KEY, JSON.stringify(newFilters));
        } else {
          localStorage.setItem('sd_' + RANKING_FILTERS_KEY, JSON.stringify(newFilters));
        }
      } catch (_error) {}
      if (state.myClub && state.myClub.id) {
        state.leaderboard = await loadClubLeaderboard(state.myClub.id, newFilters);
        const user = getUser();
        const ownEntry = user ? state.leaderboard.find((entry) => entry.userId === user.id) : null;
        state.myRank = ownEntry ? ownEntry.rank : null;
      }
      renderClubOverlay();
    };
    disciplineSelect.addEventListener('change', onFilterChange);
    timeSelect.addEventListener('change', onFilterChange);

    filterBar.append(disciplineSelect, timeSelect);
    body.appendChild(filterBar);

    const list = createEl('div', 'club-list');

    if (!state.leaderboard.length) {
      list.appendChild(emptyState('Noch keine Vereinsergebnisse für diese Auswahl.'));
      body.appendChild(list);
      return;
    }

    state.leaderboard.forEach((entry) => {
      const row = createEl('div', 'club-rank-row');
      const rank = createEl('div', 'club-rank-number', '#' + entry.rank);
      const info = createEl('div', 'club-rank-info');
      const sessionsText = String(entry.totalSessions || 0) + ' Ergebnisse'
        + (Number(entry.duelWins || 0) > 0 ? ' · ' + entry.duelWins + ' Duell-Siege' : '')
        + (entry.lastResultAt ? ' · ' + formatDate(entry.lastResultAt) : '');
      info.append(
        createEl('strong', '', entry.displayName || shortUserId(entry.userId)),
        createEl('span', '', sessionsText)
      );
      const score = createEl('div', 'club-rank-score');
      score.append(createEl('strong', '', String(entry.bestScore)), createEl('span', '', 'Best'));
      row.append(rank, info, score);
      list.appendChild(row);
    });

    body.appendChild(list);
  }

  function renderChallengeTab(body) {
    const challenge = state.currentChallenge;

    if (!challenge) {
      body.appendChild(emptyState('Aktuell läuft keine Wochenchallenge.'));
      return;
    }

    const card = createEl('div', 'club-challenge-card');
    const title = createEl('h3', 'club-challenge-title', challenge.name);
    card.appendChild(title);

    if (challenge.description) {
      card.appendChild(createEl('p', 'club-challenge-description', challenge.description));
    }

    const metaGrid = createEl('div', 'club-overview-grid');
    metaGrid.append(
      overviewItem('Disziplin', DISCIPLINE_LABELS[challenge.discipline] || challenge.discipline),
      overviewItem('Schwierigkeit', challenge.difficulty || 'real'),
      overviewItem('Zielwertung', challenge.requiredScore != null ? String(challenge.requiredScore) : '-'),
      overviewItem('Endet', formatDate(challenge.endsAt) || '-')
    );
    card.appendChild(metaGrid);

    const submitBox = createEl('div', 'club-challenge-submit');
    const scoreInput = createEl('input', 'club-input');
    scoreInput.type = 'number';
    scoreInput.min = '0';
    scoreInput.max = '6000';
    scoreInput.placeholder = 'Dein Ergebnis (z.B. 387)';

    const submit = createButton('Ergebnis einreichen', 'club-btn club-btn-primary', async () => {
      const value = Number(scoreInput.value);
      if (!Number.isFinite(value) || value < 0 || value > 6000) {
        setOverlayMessage('Bitte gib einen gültigen Score ein.', 'error');
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Wird übertragen...';
      try {
        await submitChallengeResult(challenge.id, value);
        showToast('Ergebnis gespeichert.', 'success');
        scoreInput.value = '';
        state.challengeStandings = await loadChallengeStandings(challenge.id);
        renderClubOverlay();
      } catch (error) {
        const message = friendlyError(error);
        setOverlayMessage(message, 'error');
        showToast(message, 'error');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Ergebnis einreichen';
      }
    });
    submitBox.append(scoreInput, submit);
    card.appendChild(submitBox);

    body.appendChild(card);

    const standingsHeader = createEl('h4', 'club-standings-header', 'Standings');
    body.appendChild(standingsHeader);

    const list = createEl('div', 'club-list');
    if (!state.challengeStandings.length) {
      list.appendChild(emptyState('Noch keine Ergebnisse für diese Challenge.'));
    } else {
      state.challengeStandings.forEach((entry) => {
        const row = createEl('div', 'club-rank-row');
        const rank = createEl('div', 'club-rank-number', '#' + entry.rank);
        const info = createEl('div', 'club-rank-info');
        info.append(
          createEl('strong', '', entry.displayName),
          createEl('span', '', entry.completedAt ? formatDate(entry.completedAt) : '')
        );
        const score = createEl('div', 'club-rank-score');
        score.append(createEl('strong', '', String(entry.score)), createEl('span', '', 'Punkte'));
        row.append(rank, info, score);
        list.appendChild(row);
      });
    }
    body.appendChild(list);
  }

  function emptyState(text) {
    const empty = createEl('div', 'club-empty-state');
    empty.append(createEl('strong', '', text), createEl('span', '', 'Sobald echte Vereinsdaten vorliegen, erscheinen sie hier.'));
    return empty;
  }

  async function copyClubCode(code) {
    const value = String(code || '').trim();
    if (!value) return false;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.left = '-999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      setOverlayMessage('Code kopiert.', 'success');
      showToast('Code kopiert.', 'success');
      return true;
    } catch (error) {
      console.warn('[ClubsSystem] copy failed:', error);
      setOverlayMessage('Code konnte nicht kopiert werden.', 'error');
      return false;
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOverlayOpen()) closeClubOverlay();
  });

  async function recordBotDuel(discipline, playerScore, botScore) {
    const client = getClient();
    const user = getUser();
    if (!client || !user || !state.myClub) return;
    try {
      await client.rpc('record_club_duel', {
        p_club_id: state.myClub.id,
        p_winner_id: user.id,
        p_loser_id: null,
        p_duel_type: 'bot_fight',
        p_discipline: String(discipline),
        p_winner_score: Math.round(Number(playerScore) || 0),
        p_loser_score: Math.round(Number(botScore) || 0),
        p_source_id: `bot_${user.id}_${Date.now()}`,
      });
    } catch (_e) { /* optional, non-blocking */ }
  }

  return {
    init,
    getMyClub,
    createClub,
    joinClubByCode,
    loadClubMembers,
    loadClubLeaderboard,
    loadCurrentClubChallenge,
    loadChallengeStandings,
    submitChallengeResult,
    showClubOverlay,
    renderDashboardClubCard,
    copyClubCode,
    recordBotDuel,
    getState: () => ({
      ...state,
      members: state.members.slice(),
      leaderboard: state.leaderboard.slice(),
      challengeStandings: state.challengeStandings.slice(),
    }),
  };
})();

if (typeof window !== 'undefined') {
  window.ClubsSystem = ClubsSystem;

  const startClubsSystem = () => {
    ClubsSystem.init().catch((error) => {
      console.warn('[ClubsSystem] bootstrap failed:', error);
    });
  };

  window.addEventListener('supabaseAuthReady', () => ClubsSystem.init(true));
  window.addEventListener('supabaseReady', () => ClubsSystem.init(true));
  window.addEventListener('supabaseSessionChanged', () => ClubsSystem.init(true));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startClubsSystem, { once: true });
  } else {
    startClubsSystem();
  }
}
