/**
 * Freundesliste System (Supabase-only)
 * Freunde hinzufügen, Friend-Requests, Online-Status
 * Nur Supabase + lokaler Read-only Fallback für Gäste
 */

const FriendsSystem = (function() {
  'use strict';

  // State
  const state = {
    friends: [],
    pendingRequests: [],
    sentRequests: [],
    onlineStatusByUserId: {},
    userCode: null,
    currentUserId: null,
    initialized: false,
    bootstrapRetryTimer: null,
    statusHeartbeatId: null,
    requestBusy: false,
  };

  function resolveCurrentUserId() {
    try {
      return (window.SupabaseSession && window.SupabaseSession.user && window.SupabaseSession.user.id) ||
        StorageManager.getRaw('userId') ||
        '';
    } catch (e) {
      console.warn('Freundes-System: User-ID konnte nicht aufgeloest werden:', e);
      return '';
    }
  }

  function isLocalMode() {
    try {
      return window.SchussduellLocalMode === true ||
        window.SchussduellLocalPlay === true ||
        localStorage.getItem('sd_local_mode') === '1' ||
        localStorage.getItem('sd_local_play') === '1';
    } catch (e) {
      return false;
    }
  }

  function isSupabaseSocialAvailable() {
    return !!(
      window.SupabaseSocial &&
      window.SupabaseSession &&
      window.SupabaseSession.user &&
      !isLocalMode()
    );
  }

  function isSupabaseLoggedIn() {
    return !!(window.SupabaseSession && window.SupabaseSession.user);
  }

  function parseRemoteTime(value) {
    if (!value) return Date.now();
    if (typeof value === 'number') return value;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  function syncFromSupabaseState() {
    if (!window.SupabaseSocial || typeof window.SupabaseSocial.getState !== 'function') return;

    const remoteState = window.SupabaseSocial.getState();
    state.userCode = remoteState.friendCode || state.userCode || null;
    state.friends = (remoteState.friends || []).map(friend => ({
      userId: friend.userId,
      username: friend.username || 'Spieler',
      code: friend.code || '',
      avatarUrl: friend.avatarUrl || '',
      addedAt: parseRemoteTime(friend.addedAt),
    }));
    state.pendingRequests = (remoteState.incomingRequests || []).map(req => ({
      id: req.id,
      fromUserId: req.fromUserId,
      fromUsername: req.fromUsername || 'Unbekannt',
      timestamp: parseRemoteTime(req.createdAt),
      status: req.status || 'pending',
    }));
    state.sentRequests = (remoteState.outgoingRequests || []).map(req => ({
      id: req.id,
      userId: req.toUserId,
      username: req.toUsername || 'Unbekannt',
      timestamp: parseRemoteTime(req.createdAt),
      status: req.status || 'pending',
    }));
    state.onlineStatusByUserId = remoteState.onlineStatus || {};

    if (state.userCode) StorageManager.setRaw('friendCode', state.userCode);
    StorageManager.setRaw('friends', JSON.stringify(state.friends));
  }

  async function refreshFromSupabaseSocial() {
    if (!isSupabaseSocialAvailable() || typeof window.SupabaseSocial.refreshAll !== 'function') {
      return false;
    }

    const status = await window.SupabaseSocial.refreshAll();
    syncFromSupabaseState();
    return !!(status && status.available);
  }

  function getSupabaseRequestId(identifier) {
    const request = state.pendingRequests.find(req => req.id === identifier || req.fromUserId === identifier);
    return request ? request.id : identifier;
  }

  function getSupabaseReasonMessage(reason) {
    const messages = {
      'missing-supabase-session': 'Melde dich an, um Freunde zu nutzen.',
      'invalid-code': 'Ungültiger Code',
      'self-code': 'Du kannst dich nicht selbst hinzufügen',
      'code-not-found': 'Code nicht gefunden',
      'already-friend': 'Bereits dein Freund',
      'already-sent': 'Bereits Anfrage gesendet',
    };
    return messages[reason] || 'Aktion konnte nicht ausgeführt werden';
  }

  function scheduleBootstrapRetry() {
    if (state.bootstrapRetryTimer) return;
    state.bootstrapRetryTimer = setTimeout(() => {
      state.bootstrapRetryTimer = null;
      init(true);
    }, 1500);
  }

  function generateUserCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async function init(force = false) {
    const resolvedUserId = resolveCurrentUserId();
    const sameUser = state.initialized && state.currentUserId === resolvedUserId;
    state.currentUserId = resolvedUserId;

    if (sameUser && !force) {
      return true;
    }

    if (isSupabaseSocialAvailable()) {
      try {
        const ready = await refreshFromSupabaseSocial();
        renderFriendCode();
        renderFriendsList();
        renderPendingRequests();
        if (ready) {
          state.initialized = true;
          console.log('FriendsSystem ready (Supabase)');
          return true;
        }
      } catch (e) {
        console.warn('Supabase Freunde-Laden fehlgeschlagen:', e);
      }
    }

    // Fallback für Gäste: lade lokale Freunde (Read-Only)
    if (!isSupabaseLoggedIn()) {
      const localFriends = StorageManager.getRaw('friends');
      state.friends = localFriends ? JSON.parse(localFriends) : [];
      state.pendingRequests = [];
      state.sentRequests = [];
      state.onlineStatusByUserId = {};

      // Zeige Login-Aufforderung wenn der User versucht, Freunde zu nutzen
      renderFriendsLoginPrompt();
      state.initialized = true;
      console.log('FriendsSystem ready (Gast-Modus, Read-only)');
      return true;
    }

    // Fallback: leere Listen für eingeloggte User ohne Supabase-Social
    state.friends = [];
    state.pendingRequests = [];
    state.sentRequests = [];
    state.onlineStatusByUserId = {};
    state.initialized = true;
    console.log('FriendsSystem ready (eingeloggt, Supabase-Social nicht verfügbar)');
    return true;
  }

  async function addFriendByCode(code) {
    if (!code || code.length !== 6) {
      showFriendToast('❌ Ungültiger Code', 'error');
      return false;
    }

    if (!isSupabaseSocialAvailable()) {
      showFriendToast('❌ Melde dich an, um Freunde zu nutzen', 'error');
      return false;
    }

    if (code.toUpperCase() === state.userCode) {
      showFriendToast('❌ Du kannst dich nicht selbst hinzufügen', 'error');
      return false;
    }

    try {
      const result = await window.SupabaseSocial.addFriendByCode(code);
      await loadPendingRequests();
      await loadFriends();
      if (!result || !result.ok) {
        const reason = result && result.reason;
        const type = reason === 'already-friend' || reason === 'already-sent' ? 'info' : 'error';
        showFriendToast((type === 'info' ? 'ℹ️ ' : '❌ ') + getSupabaseReasonMessage(reason), type);
        return false;
      }
      showFriendToast('✅ Anfrage gesendet!', 'success');
      if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
        MobileFeatures.triggerHaptic('medium');
      }
      return true;
    } catch (e) {
      console.error('Supabase Fehler beim Hinzufügen:', e);
      showFriendToast('❌ Fehler aufgetreten', 'error');
      return false;
    }
  }

  async function acceptRequest(fromUserId) {
    if (state.requestBusy) return false;
    if (!isSupabaseSocialAvailable()) {
      showFriendToast('❌ Melde dich an, um Anfragen zu akzeptieren', 'error');
      return false;
    }

    const requestId = getSupabaseRequestId(fromUserId);
    state.requestBusy = true;
    renderPendingRequests();
    try {
      const result = await window.SupabaseSocial.acceptRequest(requestId);
      await loadFriends();
      await loadPendingRequests();
      if (!result || !result.ok) {
        showFriendToast('❌ ' + getSupabaseReasonMessage(result && result.reason), 'error');
        return false;
      }
      showFriendToast('🎉 Anfrage angenommen!', 'success');
      if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
        MobileFeatures.triggerHaptic('strong');
      }
      return true;
    } catch (e) {
      console.error('Supabase Fehler beim Akzeptieren:', e);
      showFriendToast('❌ Fehler aufgetreten', 'error');
      return false;
    } finally {
      state.requestBusy = false;
      renderPendingRequests();
    }
  }

  async function declineRequest(fromUserId) {
    if (state.requestBusy) return false;
    if (!isSupabaseSocialAvailable()) {
      showFriendToast('❌ Melde dich an, um Anfragen zu verwalten', 'error');
      return false;
    }

    const requestId = getSupabaseRequestId(fromUserId);
    state.requestBusy = true;
    renderPendingRequests();
    try {
      const result = await window.SupabaseSocial.declineRequest(requestId);
      await loadPendingRequests();
      if (!result || !result.ok) {
        showFriendToast('❌ ' + getSupabaseReasonMessage(result && result.reason), 'error');
        return false;
      }
      showFriendToast('🗑️ Anfrage abgelehnt', 'info');
      return true;
    } catch (e) {
      console.error('Supabase Fehler beim Ablehnen:', e);
      showFriendToast('❌ Fehler aufgetreten', 'error');
      return false;
    } finally {
      state.requestBusy = false;
      renderPendingRequests();
    }
  }

  async function removeFriend(friendId) {
    if (!isSupabaseSocialAvailable()) {
      showFriendToast('❌ Melde dich an, um Freunde zu verwalten', 'error');
      return false;
    }

    const friend = state.friends.find(f => f.userId === friendId);

    if (!confirm(`Möchtest du ${friend?.username || 'diesen Freund'} wirklich entfernen?`)) {
      return false;
    }

    try {
      const result = await window.SupabaseSocial.removeFriend(friendId);
      await loadFriends();
      if (!result || !result.ok) {
        showFriendToast('❌ ' + getSupabaseReasonMessage(result && result.reason), 'error');
        return false;
      }
      showFriendToast(`👋 ${friend?.username || 'Freund'} entfernt`, 'info');
      return true;
    } catch (e) {
      console.error('Supabase Fehler beim Entfernen:', e);
      showFriendToast('❌ Fehler aufgetreten', 'error');
      return false;
    }
  }

  function updateOnlineStatus() {
    if (isSupabaseSocialAvailable() && typeof window.SupabaseSocial.updateOnlineStatus === 'function') {
      window.SupabaseSocial.updateOnlineStatus(true).catch((e) => {
        console.warn('Supabase Status-Update fehlgeschlagen:', e);
      });
      return;
    }

    // Gäste aktualisieren nicht den Online-Status
  }

  async function loadOnlineStatuses() {
    if (isSupabaseSocialAvailable() && typeof window.SupabaseSocial.loadOnlineStatuses === 'function') {
      try {
        await window.SupabaseSocial.loadOnlineStatuses();
        syncFromSupabaseState();
      } catch (e) {
        console.warn('Supabase Status-Laden fehlgeschlagen:', e);
      }
      renderFriendsList();
      return;
    }

    state.onlineStatusByUserId = {};
    renderFriendsList();
  }

  async function loadFriends() {
    if (isSupabaseSocialAvailable() && typeof window.SupabaseSocial.loadFriends === 'function') {
      try {
        await window.SupabaseSocial.loadFriends();
        syncFromSupabaseState();
        renderFriendsList();
        return;
      } catch (e) {
        console.warn('Supabase Freunde-Laden fehlgeschlagen:', e);
      }
    }

    // Fallback: lokale Read-Only Freunde für Gäste
    const localFriends = StorageManager.getRaw('friends');
    state.friends = localFriends ? JSON.parse(localFriends) : [];
    state.onlineStatusByUserId = {};
    renderFriendsList();
  }

  async function loadPendingRequests() {
    if (isSupabaseSocialAvailable() && typeof window.SupabaseSocial.loadIncomingRequests === 'function') {
      try {
        await Promise.all([
          window.SupabaseSocial.loadIncomingRequests(),
          window.SupabaseSocial.loadOutgoingRequests(),
        ]);
        syncFromSupabaseState();
        renderPendingRequests();
        return;
      } catch (e) {
        console.warn('Supabase Requests-Laden fehlgeschlagen:', e);
      }
    }

    // Gäste haben keine Anfragen
    state.pendingRequests = [];
    state.sentRequests = [];
    renderPendingRequests();
  }

  function renderFriendsList() {
    const container = document.getElementById('friendsListContainer');
    if (!container) return;

    const title = document.getElementById('friendsListTitle');
    if (title) title.textContent = `Deine Freunde (${state.friends.length})`;

    if (state.friends.length === 0) {
      container.innerHTML = `
        <div class="friends-empty">
          <div class="friends-empty-icon">👥</div>
          <div class="friends-empty-text">Noch keine Freunde</div>
          <div class="friends-empty-sub">Teile deinen Code mit Freunden!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      ${state.friends.map(friend => `
        <div class="friend-card" data-friend-id="${friend.userId}">
          <div class="friend-avatar">${getFriendAvatar(friend.username)}</div>
          <div class="friend-info">
            <div class="friend-name">${escapeHtml(friend.username)}</div>
            <div class="friend-status">${getFriendStatus(friend)}</div>
          </div>
          <div class="friend-actions">
            <button class="friend-btn challenge" onclick="FriendsSystem.challengeFriend('${friend.userId}')">⚔️ Duell</button>
            <button class="friend-btn remove" onclick="FriendsSystem.removeFriend('${friend.userId}')">✕</button>
          </div>
        </div>
      `).join('')}
    `;
  }

  function renderPendingRequests() {
    const receivedContainer = document.getElementById('receivedRequestsContainer');
    const sentContainer = document.getElementById('sentRequestsContainer');
    if (!receivedContainer && !sentContainer) return;
    const disabled = state.requestBusy ? ' disabled aria-disabled="true"' : '';

    if (receivedContainer) {
      if (state.pendingRequests.length === 0) {
        receivedContainer.innerHTML = '<div class="requests-empty">Keine ausstehenden Anfragen</div>';
      } else {
        receivedContainer.innerHTML = `
          ${state.pendingRequests.map(req => `
            <div class="request-card">
              <div class="request-avatar">${getFriendAvatar(req.fromUsername)}</div>
              <div class="request-info">
                <div class="request-name">${escapeHtml(req.fromUsername)}</div>
                <div class="request-time">${formatTime(req.timestamp)}</div>
              </div>
              <div class="request-actions">
                <button class="request-btn accept" onclick="FriendsSystem.acceptRequest('${req.fromUserId}')"${disabled}>✓</button>
                <button class="request-btn decline" onclick="FriendsSystem.declineRequest('${req.fromUserId}')"${disabled}>✕</button>
              </div>
            </div>
          `).join('')}
        `;
      }
    }

    if (sentContainer) {
      if (state.sentRequests.length === 0) {
        sentContainer.innerHTML = '<div class="requests-empty">Keine gesendeten Anfragen</div>';
      } else {
        sentContainer.innerHTML = `
          ${state.sentRequests.map(req => `
            <div class="request-card sent">
              <div class="request-avatar">${getFriendAvatar(req.username)}</div>
              <div class="request-info">
                <div class="request-name">${escapeHtml(req.username)}</div>
                <div class="request-status">⏳ Anfrage gesendet</div>
              </div>
            </div>
          `).join('')}
        `;
      }
    }
  }

  function renderFriendsLoginPrompt() {
    const container = document.getElementById('friendsListContainer');
    if (!container) return;

    const title = document.getElementById('friendsListTitle');
    if (title) title.textContent = 'Freunde';

    container.innerHTML = `
      <div class="friends-login-prompt">
        <div class="friends-login-icon">🔐</div>
        <div class="friends-login-text">Melde dich an, um Freunde zu nutzen</div>
        <div class="friends-login-sub">Mit der Anmeldung kannst du Freunde hinzufügen und gemeinsam spielen</div>
        <button class="friends-login-btn" onclick="typeof window.openLoginModal === 'function' && window.openLoginModal()">Anmelden</button>
      </div>
    `;
  }

  function challengeFriend(friendId) {
    const friend = state.friends.find(f => f.userId === friendId);
    if (!friend) {
      showFriendToast('❌ Freund nicht gefunden', 'error');
      return;
    }

    if (isSupabaseSocialAvailable() && typeof window.SupabaseSocial.createChallenge === 'function') {
      window.SupabaseSocial.createChallenge(friendId, {
        discipline: G && G.discipline,
        weapon: G && G.weapon,
        distance: G && G.dist,
        difficulty: G && G.diff,
        shots: G && G.shots,
        burst: G && G.burst,
      }).then((result) => {
        if (result && result.ok) {
          showFriendToast(`⚔️ Herausforderung an ${friend.username} gesendet!`, 'success');
        } else {
          showFriendToast('❌ ' + getSupabaseReasonMessage(result && result.reason), 'error');
        }
      }).catch((e) => {
        console.error('Supabase Challenge-Fehler:', e);
        showFriendToast('❌ Challenge konnte nicht erstellt werden', 'error');
      });

      if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
        MobileFeatures.triggerHaptic('medium');
      }
      return;
    }

    showFriendToast(`⚔️ Herausforderung an ${friend.username} gesendet!`, 'success');
    if (typeof window.createAsyncChallenge === 'function') {
      window.createAsyncChallenge(friendId, friend.username);
    }

    if (typeof MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) {
      MobileFeatures.triggerHaptic('medium');
    }
  }

  function showFriendsOverlay() {
    if (typeof window.openFriendshipsPage === 'function') {
      window.openFriendshipsPage();
      return;
    }

    showFriendToast('👥 Freundschaften werden geladen...', 'info');
    setTimeout(() => {
      if (typeof window.openFriendshipsPage === 'function') {
        window.openFriendshipsPage();
      }
    }, 600);
  }

  function closeFriendsOverlay() {
    if (typeof window.closeFriendshipsPage === 'function') {
      window.closeFriendshipsPage();
      return;
    }
    const overlay = document.getElementById('friendsOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  function createFriendsOverlay() {
    showFriendsOverlay();
    return document.getElementById('friendsOverlay') || document.createElement('div');
  }

  function renderFriendCode() {
    const display = document.getElementById('friendCodeDisplay');
    if (display) display.textContent = state.userCode || '------';
  }

  function copyFriendCode() {
    if (!state.userCode) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(state.userCode).then(() => {
        showFriendToast('📋 Code kopiert!', 'success');
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = state.userCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showFriendToast('📋 Code kopiert!', 'success');
    }
  }

  async function addFriendFromInput() {
    const input = document.getElementById('friendCodeInput') || document.getElementById('fpFriendCodeInput');
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    const success = await addFriendByCode(code);
    if (success) input.value = '';
  }

  function showFriendToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `friend-toast friend-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = toast.style.cssText || '';

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function getFriendAvatar(username) {
    if (!username) return '👤';
    const firstChar = username.charAt(0).toUpperCase();
    const emojis = {
      'A': '🎯', 'B': '🔫', 'C': '⭐', 'D': '🏆', 'E': '💫', 'F': '🎖️', 'G': '🥇', 'H': '🎪',
      'I': '🎨', 'J': '🎭', 'K': '🎬', 'L': '🎤', 'M': '🎧', 'N': '🎸', 'O': '🎺', 'P': '🎻',
      'Q': '🎹', 'R': '🎲', 'S': '🎳', 'T': '🎯', 'U': '🎮', 'V': '🎰', 'W': '🎱', 'X': '🎴',
      'Y': '🎵', 'Z': '🎶',
    };
    return emojis[firstChar] || '👤';
  }

  function getFriendStatus(friend) {
    const presence = state.onlineStatusByUserId[friend && friend.userId];
    if (!presence || typeof presence !== 'object') return 'Offline';

    const lastSeen = Number(presence.lastSeen) || 0;
    const isFresh = lastSeen > 0 && (Date.now() - lastSeen) < 120000;

    if (presence.online && isFresh) return 'Online jetzt';
    if (lastSeen > 0) return `Zuletzt aktiv: ${formatTime(lastSeen)}`;
    return 'Offline';
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;
    if (hours < 24) return `vor ${hours} Std`;
    return `vor ${days} Tagen`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function addFriendsButton() {
    if (document.getElementById('friendsButton')) {
      console.log('✅ Freunde-Button vorhanden');
    } else {
      console.warn('⚠️ Freunde-Button nicht gefunden');
    }
  }

  return {
    init,
    addFriendByCode,
    acceptRequest,
    declineRequest,
    removeFriend,
    challengeFriend,
    showFriendsOverlay,
    closeFriendsOverlay,
    copyFriendCode,
    addFriendFromInput,
    addFriendsButton,
    getState: () => ({ ...state }),
  };
})();

if (typeof window !== 'undefined') {
  const exposeAndInit = () => {
    window.FriendsSystem = FriendsSystem;
    FriendsSystem.init().then(() => {
      FriendsSystem.addFriendsButton();
    });
  };

  window.addEventListener('supabaseAuthReady', () => {
    FriendsSystem.init(true).then(() => {
      FriendsSystem.addFriendsButton();
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', exposeAndInit);
  } else {
    exposeAndInit();
  }
}
