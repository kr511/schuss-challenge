/* Chat Badge — unread message badge on the Freunde tab */
(function () {
  'use strict';

  const state = {
    unread: {}, // { [senderId]: count }
    channel: null,
    initialized: false,
  };

  function ensureBadgeEl() {
    const btn = document.querySelector('.bn-tab[data-tab="freunde"]');
    if (!btn) return null;
    const wrap = btn.querySelector('.bn-icon-wrap');
    if (!wrap) return null;
    let badge = wrap.querySelector('.chat-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'chat-badge';
      badge.style.display = 'none';
      wrap.appendChild(badge);
    }
    return badge;
  }

  function update() {
    const total = Object.values(state.unread).reduce((a, b) => a + b, 0);
    const badge = ensureBadgeEl();
    if (!badge) return;
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : String(total);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  async function loadInitial(client, myId) {
    try {
      const { data, error } = await client
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', myId)
        .is('read_at', null);
      if (error) throw error;
      const counts = {};
      (data || []).forEach((m) => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
      state.unread = counts;
      update();
    } catch (err) {
      console.warn('[ChatBadge] loadInitial failed:', err && err.message);
    }
  }

  function subscribe(client, myId) {
    if (state.channel) {
      try { client.removeChannel(state.channel); } catch (_e) { /* ignore */ }
      state.channel = null;
    }
    state.channel = client
      .channel('chat-inbox-' + myId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'receiver_id=eq.' + myId,
      }, (payload) => {
        const senderId = payload.new && payload.new.sender_id;
        if (!senderId) return;
        if (window.ChatView && window.ChatView.isOpenWith && window.ChatView.isOpenWith(senderId)) {
          return; // chat is open — mark-read fires automatically
        }
        state.unread[senderId] = (state.unread[senderId] || 0) + 1;
        update();
      })
      .subscribe();
  }

  function markRead(friendId) {
    if (state.unread[friendId]) {
      delete state.unread[friendId];
      update();
    }
  }

  function init(client, myId) {
    if (state.initialized) return;
    state.initialized = true;
    loadInitial(client, myId);
    subscribe(client, myId);
  }

  function tryInit() {
    const session = (window.SupabaseAuth && window.SupabaseAuth.getSession && window.SupabaseAuth.getSession())
      || window.SupabaseSession;
    const myId = session && session.user && session.user.id;
    const client = window.SupabaseAuth && window.SupabaseAuth.client;
    if (myId && client) init(client, myId);
  }

  window.ChatBadge = {
    markRead,
    getCount: () => Object.values(state.unread).reduce((a, b) => a + b, 0),
  };

  window.addEventListener('supabaseReady', tryInit);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit, { once: true });
  } else {
    tryInit();
  }
})();
