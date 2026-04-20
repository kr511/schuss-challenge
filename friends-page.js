/**
 * FriendsPage
 * Controller für den dedizierten Freunde-Screen (#screenFriends).
 * Delegiert Geschäftslogik komplett an FriendsSystem (friends.js); hier nur
 * Tabs, Filter der eigenen Liste und Server-Suche nach anderen Usern.
 */
(function () {
  'use strict';

  const TAB_PANEL_ATTR = 'data-tab-panel';
  const SEARCH_MIN_LENGTH = 2;
  const SEARCH_DEBOUNCE_MS = 250;

  let initialized = false;
  let searchAbort = null;
  let searchTimer = null;

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function getAvatarInitial(name) {
    const s = (name || '').trim();
    if (!s) return '?';
    return s.charAt(0).toUpperCase();
  }

  function showToast(message, type) {
    if (window.FriendsSystem && typeof window.FriendsSystem.showFriendToast === 'function') {
      window.FriendsSystem.showFriendToast(message, type);
      return;
    }
    console.log(`[FriendsPage] ${type || 'info'}: ${message}`);
  }

  function activateTab(tabKey) {
    qsa('.friends-tab').forEach((btn) => {
      const active = btn.dataset.tab === tabKey;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    qsa(`[${TAB_PANEL_ATTR}]`).forEach((panel) => {
      panel.hidden = panel.getAttribute(TAB_PANEL_ATTR) !== tabKey;
    });
  }

  function bindTabs() {
    qsa('.friends-tab').forEach((btn) => {
      if (btn.dataset.boundTab === '1') return;
      btn.dataset.boundTab = '1';
      btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });
  }

  function filterOwnFriends(query) {
    const q = (query || '').trim().toLowerCase();
    const cards = qsa('#friendsListContainer .friend-card');
    if (!cards.length) return;
    cards.forEach((card) => {
      const nameEl = card.querySelector('.friend-name');
      const name = nameEl ? nameEl.textContent.toLowerCase() : '';
      card.style.display = (!q || name.includes(q)) ? '' : 'none';
    });
  }

  function bindFilter() {
    const input = qs('#friendsFilterInput');
    if (!input || input.dataset.boundFilter === '1') return;
    input.dataset.boundFilter = '1';
    input.addEventListener('input', (e) => filterOwnFriends(e.target.value));
  }

  function setSearchStatus(message) {
    const el = qs('#friendsSearchStatus');
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = '';
    } else {
      el.hidden = false;
      el.textContent = message;
    }
  }

  function buildApiBase() {
    // Gleiche Logik wie andere Clients: gleiches Origin.
    return '';
  }

  function buildHeaders() {
    const headers = { 'content-type': 'application/json' };
    try {
      const devUserId =
        (window.StorageManager && window.StorageManager.getRaw && window.StorageManager.getRaw('userId')) ||
        (typeof window.getFirebaseOwnerId === 'function' ? window.getFirebaseOwnerId() : '');
      if (devUserId) headers['x-dev-user-id'] = String(devUserId);
    } catch (_) { /* noop */ }
    return headers;
  }

  function renderSkeletons(count) {
    const box = qs('#friendsSearchResults');
    if (!box) return;
    const rows = new Array(count).fill(0).map(() => `
      <div class="fr-skeleton" aria-hidden="true">
        <div class="fr-skeleton-avatar"></div>
        <div class="fr-skeleton-body">
          <div class="fr-skeleton-line" style="width:60%;"></div>
          <div class="fr-skeleton-line" style="width:35%;height:8px;"></div>
        </div>
      </div>
    `).join('');
    box.innerHTML = rows;
  }

  async function runSearch(query) {
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    setSearchStatus('');
    renderSkeletons(3);
    try {
      const url = `${buildApiBase()}/api/friends/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        signal: searchAbort.signal,
        headers: buildHeaders(),
      });
      if (!res.ok) {
        setSearchStatus('Suche fehlgeschlagen.');
        renderResults([]);
        return;
      }
      const data = await res.json().catch(() => ({}));
      const results = Array.isArray(data.results) ? data.results : [];
      renderResults(results);
      setSearchStatus(results.length ? '' : 'Keine Treffer.');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.warn('Freundessuche fehlgeschlagen:', err);
      setSearchStatus('Suche fehlgeschlagen.');
      renderResults([]);
    }
  }

  function renderResults(list) {
    const box = qs('#friendsSearchResults');
    if (!box) return;
    if (!list.length) { box.innerHTML = ''; return; }

    const ownCode = (window.FriendsSystem && FriendsSystem.getState && FriendsSystem.getState().userCode) || '';
    const friendIds = new Set(
      (window.FriendsSystem && FriendsSystem.getState ? FriendsSystem.getState().friends : [])
        .map((f) => f && f.userId).filter(Boolean),
    );

    box.innerHTML = list.map((u) => {
      const displayName = u.display_name || 'Unbekannt';
      const name = escapeHtml(displayName);
      const initial = escapeHtml(getAvatarInitial(displayName));
      const code = (u.friend_code || '').toString().toUpperCase();
      const codeDisplay = code ? `#${escapeHtml(code)}` : '– kein Code –';
      const isSelf = code && ownCode && code === ownCode;
      const isFriend = u.user_id && friendIds.has(u.user_id);
      let button;
      if (isSelf) {
        button = '<button class="friend-search-btn" disabled>Du</button>';
      } else if (isFriend) {
        button = '<button class="friend-search-btn" disabled>✓ Freund</button>';
      } else if (!code) {
        button = '<button class="friend-search-btn" disabled title="Kein Code – User hat Profil nicht synchronisiert">Kein Code</button>';
      } else {
        button = `<button class="friend-search-btn" data-action="add" data-code="${escapeHtml(code)}">➕ Hinzufügen</button>`;
      }
      return `
        <div class="friend-search-item">
          <div class="friend-search-avatar" aria-hidden="true">${initial}</div>
          <div class="friend-search-meta">
            <div class="friend-search-name">${name}</div>
            <div class="friend-search-code">${codeDisplay}</div>
          </div>
          ${button}
        </div>
      `;
    }).join('');
  }

  function bindSearch() {
    const input = qs('#friendsSearchInput');
    if (input && input.dataset.boundSearch !== '1') {
      input.dataset.boundSearch = '1';
      input.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        clearTimeout(searchTimer);
        if (q.length < SEARCH_MIN_LENGTH) {
          renderResults([]);
          setSearchStatus(q.length === 0 ? '' : `Mind. ${SEARCH_MIN_LENGTH} Zeichen eingeben.`);
          return;
        }
        searchTimer = setTimeout(() => runSearch(q), SEARCH_DEBOUNCE_MS);
      });
    }

    const box = qs('#friendsSearchResults');
    if (box && box.dataset.boundResults !== '1') {
      box.dataset.boundResults = '1';
      box.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action="add"]');
        if (!btn) return;
        const code = btn.dataset.code;
        if (!code || !window.FriendsSystem) return;
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = '…';
        try {
          const ok = await FriendsSystem.addFriendByCode(code);
          btn.textContent = ok ? '✓ Angefragt' : originalText;
          btn.disabled = ok;
        } catch (err) {
          console.warn('addFriendByCode fehlgeschlagen:', err);
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });
    }
  }

  function getCounts() {
    const fallback = { friends: 0, received: 0, sent: 0 };
    try {
      if (!window.FriendsSystem || typeof FriendsSystem.getState !== 'function') return fallback;
      const state = FriendsSystem.getState();
      return {
        friends: Array.isArray(state.friends) ? state.friends.length : 0,
        received: Array.isArray(state.pendingRequests) ? state.pendingRequests.length : 0,
        sent: Array.isArray(state.sentRequests) ? state.sentRequests.length : 0,
      };
    } catch (_) {
      return fallback;
    }
  }

  function updateStats() {
    const counts = getCounts();
    const friendsEl = qs('#frStatFriends');
    const receivedEl = qs('#frStatReceived');
    const sentEl = qs('#frStatSent');
    if (friendsEl) friendsEl.textContent = String(counts.friends);
    if (receivedEl) receivedEl.textContent = String(counts.received);
    if (sentEl) sentEl.textContent = String(counts.sent);

    const badge = qs('#friendsReqBadge');
    if (badge) {
      if (counts.received > 0) {
        badge.hidden = false;
        badge.textContent = String(counts.received);
      } else {
        badge.hidden = true;
        badge.textContent = '0';
      }
    }
  }

  function hookFriendsSystemRenders() {
    const fs = window.FriendsSystem;
    if (!fs || fs.__frPageHooked) return;
    fs.__frPageHooked = true;
    ['renderFriendsList', 'renderPendingRequests'].forEach((name) => {
      const orig = fs[name];
      if (typeof orig !== 'function') return;
      fs[name] = function patched() {
        const out = orig.apply(this, arguments);
        try { updateStats(); } catch (_) { /* noop */ }
        return out;
      };
    });
  }

  async function onOpen() {
    if (!window.FriendsSystem) {
      console.warn('FriendsPage: FriendsSystem nicht geladen');
      return;
    }

    if (!initialized) {
      bindTabs();
      bindFilter();
      bindSearch();
      activateTab('list');
      hookFriendsSystemRenders();
      initialized = true;
    }

    try {
      await FriendsSystem.init();
      if (FriendsSystem.renderFriendCode) FriendsSystem.renderFriendCode();
      if (FriendsSystem.renderFriendsList) FriendsSystem.renderFriendsList();
      if (FriendsSystem.renderPendingRequests) FriendsSystem.renderPendingRequests();
    } catch (err) {
      console.warn('FriendsPage: init fehlgeschlagen:', err);
    }

    updateStats();

    // Filter-Input leeren, damit beim Wiederkehren alle Freunde sichtbar sind.
    const filterInput = qs('#friendsFilterInput');
    if (filterInput) { filterInput.value = ''; filterOwnFriends(''); }
  }

  window.FriendsPage = { onOpen, activateTab, updateStats };
})();
