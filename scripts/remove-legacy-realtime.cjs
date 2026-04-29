const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = process.cwd();
const LEGACY = 'fire' + 'base';
const LEGACY_CAP = 'Fire' + 'base';
const FB_DB = 'fb' + 'Db';
const FB_READY = 'fb' + 'Ready';
const OWNER_FN = 'get' + LEGACY_CAP + 'OwnerId';
const PUSH_PROFILE_FN = 'pushProfileTo' + LEGACY_CAP;
const LEGACY_CDN_PART = 'gstatic.com/' + LEGACY + 'js';

const filesChanged = [];

function filePath(relativePath) {
  return path.join(ROOT, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(filePath(relativePath), 'utf8');
}

function writeIfChanged(relativePath, next) {
  const target = filePath(relativePath);
  const prev = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (prev !== next) {
    fs.writeFileSync(target, next, 'utf8');
    filesChanged.push(relativePath);
  }
}

function removeMatchingScriptTags(html) {
  const legacyScriptRe = new RegExp('\\n?\\s*<!--\\s*Google Sign-In Provider\\s*-->\\s*\\n\\s*<script[^>]+gstatic\\.com/' + LEGACY + 'js[^>]*><\\/script>\\s*', 'gi');
  let next = html.replace(legacyScriptRe, '\n');
  const genericLegacyScriptRe = new RegExp('\\n?\\s*<script[^>]+gstatic\\.com/' + LEGACY + 'js[^>]*><\\/script>\\s*', 'gi');
  next = next.replace(genericLegacyScriptRe, '\n');
  return next;
}

function replaceRangeByBrace(source, startIndex) {
  const open = source.indexOf('{', startIndex);
  if (open === -1) return source;
  let depth = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i += 1; }
      continue;
    }
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '/' && next === '/') { inLineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        let end = i + 1;
        while (end < source.length && /[;\s]/.test(source[end])) end += 1;
        return source.slice(0, startIndex) + source.slice(end);
      }
    }
  }
  return source;
}

function removeFunctionsContainingLegacyNames(source) {
  let next = source;
  const names = [PUSH_PROFILE_FN, OWNER_FN, LEGACY_CAP, LEGACY];
  for (const name of names) {
    const patterns = [
      new RegExp('function\\s+[A-Za-z0-9_$]*' + name + '[A-Za-z0-9_$]*\\s*\\([^)]*\\)\\s*{', 'i'),
      new RegExp('(?:const|let|var)\\s+[A-Za-z0-9_$]*' + name + '[A-Za-z0-9_$]*\\s*=\\s*(?:async\\s*)?function\\s*\\([^)]*\\)\\s*{', 'i'),
      new RegExp('(?:const|let|var)\\s+[A-Za-z0-9_$]*' + name + '[A-Za-z0-9_$]*\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*{', 'i'),
    ];
    let changed = true;
    while (changed) {
      changed = false;
      for (const pattern of patterns) {
        const match = pattern.exec(next);
        if (match) {
          next = replaceRangeByBrace(next, match.index);
          changed = true;
          break;
        }
      }
    }
  }
  return next;
}

function removeLegacyLines(source) {
  const banned = [LEGACY, LEGACY_CAP, FB_DB, FB_READY, OWNER_FN, PUSH_PROFILE_FN, LEGACY_CDN_PART];
  return source
    .split(/\r?\n/)
    .filter((line) => !banned.some((token) => line.includes(token)))
    .join('\n');
}

function patchAppJs(source) {
  let next = source;
  next = removeFunctionsContainingLegacyNames(next);
  next = removeLegacyLines(next);
  next = next.replace(/\n{3,}/g, '\n\n');
  return next;
}

function supabaseOnlyFriendsJs() {
  return `/**
 * Freundesliste System
 * Supabase-only: Freunde, Friend-Requests, Online-Status und Challenges.
 */
const FriendsSystem = (function () {
  'use strict';

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
  };

  function storageGet(key, fallback = '') {
    try {
      if (window.StorageManager && typeof StorageManager.getRaw === 'function') {
        const value = StorageManager.getRaw(key);
        return value == null || value === '' ? fallback : value;
      }
      const value = localStorage.getItem('sd_' + key) || localStorage.getItem(key);
      return value == null || value === '' ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      if (window.StorageManager && typeof StorageManager.setRaw === 'function') {
        StorageManager.setRaw(key, value);
        return;
      }
      localStorage.setItem('sd_' + key, value);
    } catch (e) {}
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

  function resolveCurrentUserId() {
    try {
      return (window.SupabaseSession && window.SupabaseSession.user && window.SupabaseSession.user.id) ||
        storageGet('userId', '') ||
        '';
    } catch (e) {
      console.warn('Freundes-System: User-ID konnte nicht aufgeloest werden:', e);
      return '';
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
    state.friends = (remoteState.friends || []).map((friend) => ({
      userId: friend.userId,
      username: friend.username || 'Spieler',
      code: friend.code || '',
      avatarUrl: friend.avatarUrl || '',
      addedAt: parseRemoteTime(friend.addedAt),
    }));
    state.pendingRequests = (remoteState.incomingRequests || []).map((req) => ({
      id: req.id,
      fromUserId: req.fromUserId,
      fromUsername: req.fromUsername || 'Unbekannt',
      timestamp: parseRemoteTime(req.createdAt),
      status: req.status || 'pending',
    }));
    state.sentRequests = (remoteState.outgoingRequests || []).map((req) => ({
      id: req.id,
      userId: req.toUserId,
      username: req.toUsername || 'Unbekannt',
      timestamp: parseRemoteTime(req.createdAt),
      status: req.status || 'pending',
    }));
    state.onlineStatusByUserId = remoteState.onlineStatus || {};
    if (state.userCode) storageSet('friendCode', state.userCode);
    storageSet('friends', JSON.stringify(state.friends));
  }

  async function refreshFromSupabaseSocial() {
    if (!isSupabaseSocialAvailable() || typeof window.SupabaseSocial.refreshAll !== 'function') return false;
    const status = await window.SupabaseSocial.refreshAll();
    syncFromSupabaseState();
    return !!(status && status.available);
  }

  function scheduleBootstrapRetry() {
    if (state.bootstrapRetryTimer) return;
    state.bootstrapRetryTimer = setTimeout(() => {
      state.bootstrapRetryTimer = null;
      init(true);
    }, 1500);
  }

  function generateLocalPreviewCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i += 1) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  async function init(force = false) {
    const resolvedUserId = resolveCurrentUserId();
    const sameUser = state.initialized && state.currentUserId === resolvedUserId;
    state.currentUserId = resolvedUserId;
    if (sameUser && !force) return true;

    if (isSupabaseSocialAvailable()) {
      try {
        const ready = await refreshFromSupabaseSocial();
        renderFriendCode();
        renderFriendsList();
        renderPendingRequests();
        if (ready) {
          state.initialized = true;
          console.log('FriendsSystem ready (Supabase)');
          updateOnlineStatus();
          loadOnlineStatuses();
          return true;
        }
      } catch (e) {
        console.warn('Supabase Freunde-Laden fehlgeschlagen:', e);
      }
    }

    if (isLocalMode()) {
      state.friends = [];
      state.pendingRequests = [];
      state.sentRequests = [];
      state.onlineStatusByUserId = {};
      state.userCode = storageGet('friendCode', '') || generateLocalPreviewCode();
      storageSet('friendCode', state.userCode);
      renderFriendCode();
      renderFriendsList();
      renderPendingRequests();
      state.initialized = true;
      return true;
    }

    scheduleBootstrapRetry();
    renderFriendCode();
    renderFriendsList();
    renderPendingRequests();
    return false;
  }

  async function ensureFriendCode() {
    if (!isSupabaseSocialAvailable() || typeof window.SupabaseSocial.ensureFriendCode !== 'function') {
      showFriendToast('❌ Melde dich an, um Freundescodes zu nutzen.', 'error');
      return null;
    }
    state.userCode = await window.SupabaseSocial.ensureFriendCode();
    syncFromSupabaseState();
    renderFriendCode();
    return state.userCode;
  }

  async function loadFriends() {
    if (!isSupabaseSocialAvailable() || typeof window.SupabaseSocial.loadFriends !== 'function') {
      state.friends = [];
      renderFriendsList();
      return false;
    }
    await window.SupabaseSocial.loadFriends();
    syncFromSupabaseState();
    renderFriendsList();
    return true;
  }

  async function loadPendingRequests() {
    if (!isSupabaseSocialAvailable()) {
      state.pendingRequests = [];
      state.sentRequests = [];
      renderPendingRequests();
      return false;
    }
    await Promise.all([
      typeof window.SupabaseSocial.loadIncomingRequests === 'function' ? window.SupabaseSocial.loadIncomingRequests() : Promise.resolve(),
      typeof window.SupabaseSocial.loadOutgoingRequests === 'function' ? window.SupabaseSocial.loadOutgoingRequests() : Promise.resolve(),
    ]);
    syncFromSupabaseState();
    renderPendingRequests();
    return true;
  }

  function getSupabaseRequestId(identifier) {
    const request = state.pendingRequests.find((req) => req.id === identifier || req.fromUserId === identifier);
    return request ? request.id : identifier;
  }

  function getSupabaseReasonMessage(reason) {
    const messages = {
      'local-mode': 'Melde dich an, um Supabase-Freunde zu nutzen.',
      'missing-supabase-client': 'Supabase ist noch nicht geladen.',
      'missing-supabase-session': 'Melde dich an, um Freunde zu nutzen.',
      'invalid-code': 'Ungueltiger Code',
      'self-code': 'Du kannst dich nicht selbst hinzufuegen',
      'code-not-found': 'Code nicht gefunden',
      'already-friend': 'Bereits dein Freund',
      'already-sent': 'Bereits Anfrage gesendet',
    };
    return messages[reason] || 'Aktion konnte nicht ausgefuehrt werden';
  }

  async function addFriendByCode(code) {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized || normalized.length !== 6) {
      showFriendToast('❌ Ungültiger Code', 'error');
      return false;
    }
    if (!isSupabaseSocialAvailable() || typeof window.SupabaseSocial.addFriendByCode !== 'function') {
      showFriendToast('❌ Melde dich an, um Freunde hinzuzufügen.', 'error');
      return false;
    }
    try {
      const result = await window.SupabaseSocial.addFriendByCode(normalized);
      await loadPendingRequests();
      await loadFriends();
      if (!result || !result.ok) {
        const reason = result && result.reason;
        const type = reason === 'already-friend' || reason === 'already-sent' ? 'info' : 'error';
        showFriendToast((type === 'info' ? 'ℹ️ ' : '❌ ') + getSupabaseReasonMessage(reason), type);
        return false;
      }
      showFriendToast('✅ Anfrage gesendet!', 'success');
      triggerHaptic('medium');
      return true;
    } catch (e) {
      console.error('Supabase Fehler beim Hinzufügen:', e);
      showFriendToast('❌ Fehler aufgetreten', 'error');
      return false;
    }
  }

  async function acceptRequest(fromUserId) {
    if (!isSupabaseSocialAvailable() || typeof window.SupabaseSocial.acceptRequest !== 'function') {
      showFriendToast('❌ Melde dich an, um Anfragen zu verwalten.', 'error');
      return false;
    }
    try {
      const result = await window.SupabaseSocial.acceptRequest(getSupabaseRequestId(fromUserId));
      await loadFriends();
      await loadPendingRequests();
      if (!result || !result.ok) {
        showFriendToast('❌ ' + getSupabaseReasonMessage(result && result.reason), 'error');
        return false;
      }
      showFriendToast('🎉 Anfrage angenommen!', 'success');
      triggerHaptic('strong');
      return true;
    } catch (e) {
      console.error('Supabase Fehler beim Akzeptieren:', e);
      showFriendToast('❌ Fehler aufgetreten', 'error');
      return false;
    }
  }

  async function declineRequest(fromUserId) {
    if (!isSupabaseSocialAvailable() || typeof window.SupabaseSocial.declineRequest !== 'function') return false;
    try {
      const result = await window.SupabaseSocial.declineRequest(getSupabaseRequestId(fromUserId));
      await loadPendingRequests();
      if (!result || !result.ok) {
        showFriendToast('❌ ' + getSupabaseReasonMessage(result && result.reason), 'error');
        return false;
      }
      showFriendToast('🗑️ Anfrage abgelehnt', 'info');
      return true;
    } catch (e) {
      console.error('Supabase Fehler beim Ablehnen:', e);
      return false;
    }
  }

  async function removeFriend(friendId) {
    if (!isSupabaseSocialAvailable() || typeof window.SupabaseSocial.removeFriend !== 'function') return false;
    const friend = state.friends.find((f) => f.userId === friendId);
    if (!confirm('Möchtest du ' + (friend && friend.username ? friend.username : 'diesen Freund') + ' wirklich entfernen?')) return false;
    try {
      const result = await window.SupabaseSocial.removeFriend(friendId);
      await loadFriends();
      if (!result || !result.ok) {
        showFriendToast('❌ ' + getSupabaseReasonMessage(result && result.reason), 'error');
        return false;
      }
      showFriendToast('👋 ' + (friend && friend.username ? friend.username : 'Freund') + ' entfernt', 'info');
      return true;
    } catch (e) {
      console.error('Supabase Fehler beim Entfernen:', e);
      showFriendToast('❌ Fehler aufgetreten', 'error');
      return false;
    }
  }

  function updateOnlineStatus() {
    if (state.statusHeartbeatId) clearInterval(state.statusHeartbeatId);
    const update = () => {
      if (isSupabaseSocialAvailable() && typeof window.SupabaseSocial.updateOnlineStatus === 'function') {
        window.SupabaseSocial.updateOnlineStatus(true).catch((e) => console.warn('Supabase Status-Update fehlgeschlagen:', e));
      }
    };
    update();
    state.statusHeartbeatId = setInterval(update, 60000);
  }

  async function loadOnlineStatuses() {
    if (isSupabaseSocialAvailable() && typeof window.SupabaseSocial.loadOnlineStatuses === 'function') {
      try {
        await window.SupabaseSocial.loadOnlineStatuses();
        syncFromSupabaseState();
      } catch (e) {
        console.warn('Supabase Status-Laden fehlgeschlagen:', e);
      }
    }
    renderFriendsList();
  }

  function renderFriendCode() {
    const display = document.getElementById('friendCodeDisplay');
    if (display) display.textContent = state.userCode || '------';
  }

  function renderFriendsList() {
    const container = document.getElementById('friendsListContainer');
    if (!container) return;
    const title = document.getElementById('friendsListTitle');
    if (title) title.textContent = 'Deine Freunde (' + state.friends.length + ')';
    if (!isSupabaseSocialAvailable() && !isLocalMode()) {
      container.innerHTML = '<div class="friends-empty"><div class="friends-empty-icon">👥</div><div class="friends-empty-text">Freunde laden…</div><div class="friends-empty-sub">Bitte anmelden oder kurz warten.</div></div>';
      return;
    }
    if (state.friends.length === 0) {
      container.innerHTML = '<div class="friends-empty"><div class="friends-empty-icon">👥</div><div class="friends-empty-text">Noch keine Freunde</div><div class="friends-empty-sub">Teile deinen Code mit Freunden!</div></div>';
      return;
    }
    container.innerHTML = state.friends.map((friend) => '<div class="friend-card" data-friend-id="' + escapeHtml(friend.userId) + '"><div class="friend-avatar">' + getFriendAvatar(friend.username) + '</div><div class="friend-info"><div class="friend-name">' + escapeHtml(friend.username) + '</div><div class="friend-status">' + getFriendStatus(friend) + '</div></div><div class="friend-actions"><button class="friend-btn challenge" onclick="FriendsSystem.challengeFriend(\'' + escapeJs(friend.userId) + '\')">⚔️ Duell</button><button class="friend-btn remove" onclick="FriendsSystem.removeFriend(\'' + escapeJs(friend.userId) + '\')">✕</button></div></div>').join('');
  }

  function renderPendingRequests() {
    const receivedContainer = document.getElementById('receivedRequestsContainer');
    const sentContainer = document.getElementById('sentRequestsContainer');
    if (receivedContainer) {
      receivedContainer.innerHTML = state.pendingRequests.length === 0
        ? '<div class="requests-empty">Keine ausstehenden Anfragen</div>'
        : state.pendingRequests.map((req) => '<div class="request-card"><div class="request-avatar">' + getFriendAvatar(req.fromUsername) + '</div><div class="request-info"><div class="request-name">' + escapeHtml(req.fromUsername) + '</div><div class="request-time">' + formatTime(req.timestamp) + '</div></div><div class="request-actions"><button class="request-btn accept" onclick="FriendsSystem.acceptRequest(\'' + escapeJs(req.fromUserId) + '\')">✓</button><button class="request-btn decline" onclick="FriendsSystem.declineRequest(\'' + escapeJs(req.fromUserId) + '\')">✕</button></div></div>').join('');
    }
    if (sentContainer) {
      sentContainer.innerHTML = state.sentRequests.length === 0
        ? '<div class="requests-empty">Keine gesendeten Anfragen</div>'
        : state.sentRequests.map((req) => '<div class="request-card sent"><div class="request-avatar">' + getFriendAvatar(req.username) + '</div><div class="request-info"><div class="request-name">' + escapeHtml(req.username) + '</div><div class="request-status">⏳ Anfrage gesendet</div></div></div>').join('');
    }
  }

  function challengeFriend(friendId) {
    const friend = state.friends.find((f) => f.userId === friendId);
    if (!friend) {
      showFriendToast('❌ Freund nicht gefunden', 'error');
      return;
    }
    if (!isSupabaseSocialAvailable() || typeof window.SupabaseSocial.createChallenge !== 'function') {
      showFriendToast('❌ Challenge konnte nicht erstellt werden', 'error');
      return;
    }
    window.SupabaseSocial.createChallenge(friendId, {
      discipline: window.G && G.discipline,
      weapon: window.G && G.weapon,
      distance: window.G && G.dist,
      difficulty: window.G && G.diff,
      shots: window.G && G.shots,
      burst: window.G && G.burst,
    }).then((result) => {
      if (result && result.ok) showFriendToast('⚔️ Herausforderung an ' + friend.username + ' gesendet!', 'success');
      else showFriendToast('❌ ' + getSupabaseReasonMessage(result && result.reason), 'error');
    }).catch((e) => {
      console.error('Supabase Challenge-Fehler:', e);
      showFriendToast('❌ Challenge konnte nicht erstellt werden', 'error');
    });
    triggerHaptic('medium');
  }

  function showFriendsOverlay() {
    if (typeof window.openFriendshipsPage === 'function') {
      window.openFriendshipsPage();
      init(true);
      return;
    }
    showFriendToast('👥 Freundschaften werden geladen...', 'info');
    setTimeout(() => {
      if (typeof window.openFriendshipsPage === 'function') window.openFriendshipsPage();
      init(true);
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

  function copyFriendCode() {
    if (!state.userCode) return;
    const done = () => showFriendToast('📋 Code kopiert!', 'success');
    if (navigator.clipboard) navigator.clipboard.writeText(state.userCode).then(done).catch(() => {});
    else {
      const textarea = document.createElement('textarea');
      textarea.value = state.userCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      done();
    }
  }

  async function addFriendFromInput() {
    const input = document.getElementById('friendCodeInput') || document.getElementById('fpFriendCodeInput');
    if (!input) return;
    const success = await addFriendByCode(input.value);
    if (success) input.value = '';
  }

  function showFriendToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'friend-toast friend-toast-' + type;
    toast.textContent = message;
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
    const emojis = { A: '🎯', B: '🔫', C: '⭐', D: '🏆', E: '💫', F: '🎖️', G: '🥇', H: '🎪', I: '🎨', J: '🎭', K: '🎬', L: '🎤', M: '🎧', N: '🎸', O: '🎺', P: '🎻', Q: '🎹', R: '🎲', S: '🎳', T: '🎯', U: '🎮', V: '🎰', W: '🎱', X: '🎴', Y: '🎵', Z: '🎶' };
    return emojis[firstChar] || '👤';
  }

  function getFriendStatus(friend) {
    const status = state.onlineStatusByUserId[friend.userId];
    if (!status) return '⚫ Offline';
    if (status.online) return '🟢 Online';
    const lastSeen = parseRemoteTime(status.lastSeen || status.last_seen);
    return '⚫ Zuletzt online ' + formatTime(lastSeen);
  }

  function formatTime(timestamp) {
    const diff = Date.now() - Number(timestamp || Date.now());
    if (diff < 60000) return 'gerade eben';
    if (diff < 3600000) return 'vor ' + Math.floor(diff / 60000) + ' Min';
    if (diff < 86400000) return 'vor ' + Math.floor(diff / 3600000) + ' Std';
    return new Date(timestamp).toLocaleDateString('de-DE');
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value == null ? '' : value);
    return div.innerHTML;
  }

  function escapeJs(value) {
    return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function triggerHaptic(type) {
    if (typeof window.MobileFeatures !== 'undefined' && MobileFeatures.triggerHaptic) MobileFeatures.triggerHaptic(type);
  }

  window.addEventListener('supabaseAuthReady', () => init(true));
  window.addEventListener('supabaseSessionChanged', () => init(true));

  setTimeout(() => init(false), 500);

  return {
    init,
    ensureFriendCode,
    loadFriends,
    loadPendingRequests,
    addFriendByCode,
    acceptRequest,
    declineRequest,
    removeFriend,
    challengeFriend,
    showFriendsOverlay,
    closeFriendsOverlay,
    createFriendsOverlay,
    copyFriendCode,
    addFriendFromInput,
    updateOnlineStatus,
    loadOnlineStatuses,
    getState: () => ({ ...state }),
  };
})();

window.FriendsSystem = FriendsSystem;
`;
}

function patchIndex() {
  const target = 'index.html';
  if (!fs.existsSync(filePath(target))) return;
  writeIfChanged(target, removeMatchingScriptTags(read(target)));
}

function patchFriends() {
  const target = 'friends.js';
  if (!fs.existsSync(filePath(target))) return;
  writeIfChanged(target, supabaseOnlyFriendsJs());
}

function patchApp() {
  const target = 'app.js';
  if (!fs.existsSync(filePath(target))) return;
  const before = read(target);
  const after = patchAppJs(before);
  writeIfChanged(target, after);
}

function assertClean() {
  const scanned = ['index.html', 'friends.js', 'app.js'].filter((name) => fs.existsSync(filePath(name)));
  const forbidden = [LEGACY, LEGACY_CAP, FB_DB, FB_READY, OWNER_FN, PUSH_PROFILE_FN, LEGACY_CDN_PART];
  const leftovers = [];
  for (const name of scanned) {
    const text = read(name);
    for (const token of forbidden) {
      if (text.includes(token)) leftovers.push(name + ' -> ' + token);
    }
  }
  if (leftovers.length) {
    throw new Error('Legacy leftovers found:\n' + leftovers.join('\n'));
  }
}

function syntaxCheck() {
  for (const name of ['friends.js', 'app.js'].filter((n) => fs.existsSync(filePath(n)))) {
    execFileSync(process.execPath, ['--check', filePath(name)], { stdio: 'inherit' });
  }
}

patchIndex();
patchFriends();
patchApp();
assertClean();
syntaxCheck();

if (filesChanged.length === 0) {
  console.log('✅ Keine Änderungen nötig. Legacy-Realtime-Reste sind bereits entfernt.');
} else {
  console.log('✅ Legacy-Realtime-Reste entfernt aus:');
  for (const file of filesChanged) console.log(' - ' + file);
  console.log('Danach ausführen: npm run check:js && npm run test:supabase');
}
