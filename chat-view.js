/* Chat View — slide-up overlay with Supabase real-time messaging */
(function () {
  'use strict';

  const OVERLAY_ID = 'chatOverlay';
  const ANIM_MS = 320;
  const MSG_LIMIT = 100;
  const SUPABASE_URL = (window.SCHUETZEN_CHALLENGE_CONFIG && window.SCHUETZEN_CHALLENGE_CONFIG.SUPABASE_URL)
    || 'https://fknftkvozwfkcarldzms.supabase.co';

  const state = {
    isOpen: false,
    friend: null,
    myId: null,
    client: null,
    realtimeChannel: null,
    popHandler: null,
    scrollY: 0,
    closingFromPop: false,
  };

  function esc(v) {
    const d = document.createElement('div');
    d.textContent = v == null ? '' : String(v);
    return d.innerHTML;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Gestern ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '. ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function toast(msg, type) {
    if (window.FriendsSystem && typeof window.FriendsSystem.showToast === 'function') {
      window.FriendsSystem.showToast(msg, type || 'info');
    }
  }

  function getClient() { return (window.SupabaseAuth && window.SupabaseAuth.client) || null; }
  function getMyId()   {
    const s = (window.SupabaseAuth && window.SupabaseAuth.getSession && window.SupabaseAuth.getSession()) || window.SupabaseSession;
    return (s && s.user && s.user.id) || null;
  }

  /* ─── Supabase ─── */
  async function loadMessages(client, myId, friendId) {
    const filter = `and(sender_id.eq.${myId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${myId})`;
    const { data, error } = await client
      .from('messages')
      .select('id, sender_id, receiver_id, text, created_at')
      .or(filter)
      .order('created_at', { ascending: true })
      .limit(MSG_LIMIT);
    if (error) throw error;
    return data || [];
  }

  async function markRead(client, myId, friendId) {
    try {
      await client
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', friendId)
        .eq('receiver_id', myId)
        .is('read_at', null);
    } catch (err) {
      console.warn('[ChatView] markRead failed:', err && err.message);
    }
  }

  async function insertMessage(client, myId, friendId, text) {
    const { data, error } = await client
      .from('messages')
      .insert({ sender_id: myId, receiver_id: friendId, text })
      .select('id, sender_id, receiver_id, text, created_at')
      .single();
    if (error) throw error;
    return data;
  }

  async function sendPushNotification(friendId, text, senderName) {
    const session = (window.SupabaseAuth && window.SupabaseAuth.getSession && window.SupabaseAuth.getSession()) || window.SupabaseSession;
    const token = session && session.access_token;
    if (!token) return;
    try {
      await fetch(SUPABASE_URL + '/functions/v1/send-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          receiver_id: friendId,
          title: senderName || 'Neue Nachricht',
          message: text,
        }),
      });
    } catch (err) {
      console.warn('[ChatView] push failed:', err && err.message);
    }
  }

  /* ─── Local cache ─── */
  function localKey(id) { return 'sd_chat_' + id; }
  function loadLocalMessages(id) {
    try { const r = localStorage.getItem(localKey(id)); return r ? JSON.parse(r) : []; } catch (_e) { return []; }
  }
  function saveLocalMessages(id, msgs) {
    try { localStorage.setItem(localKey(id), JSON.stringify(msgs.slice(-200))); } catch (_e) { /* quota */ }
  }
  function normalize(msgs, myId) {
    return msgs.map(m => ({
      id: m.id,
      text: m.text,
      from: m.sender_id === myId ? 'me' : 'friend',
      ts: m.created_at,
    }));
  }

  /* ─── Render ─── */
  function renderMsgList(msgs) {
    if (!msgs.length) return '<div class="cv-empty">Noch keine Nachrichten.<br>Schreib etwas! 👋</div>';
    return msgs.map(m => {
      const isMe = m.from === 'me';
      return (
        '<div class="cv-msg ' + (isMe ? 'cv-msg-me' : 'cv-msg-friend') + '" data-msg-id="' + esc(m.id || '') + '">' +
          '<div class="cv-bubble">' + esc(m.text) + '</div>' +
          '<div class="cv-msg-time">' + esc(formatTime(m.ts)) + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function notifNeeded() {
    return ('Notification' in window) && Notification.permission === 'default';
  }

  function renderSkeleton(f) {
    const initial = esc((f.username || '?').charAt(0).toUpperCase());
    const avatar = f.avatarUrl
      ? '<img src="' + esc(f.avatarUrl) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : initial;
    const notifBtn = notifNeeded()
      ? '<button class="cv-notif-btn" data-cv-notif aria-label="Benachrichtigungen aktivieren">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
        '</button>'
      : '<div class="cv-header-spacer"></div>';

    return (
      '<div class="cv-sheet">' +
        '<div class="cv-header">' +
          '<button class="cv-back-btn" data-cv-back aria-label="Zurück">' +
            '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>' +
          '</button>' +
          '<div class="cv-header-friend">' +
            '<div class="cv-header-avatar">' + avatar + '</div>' +
            '<div class="cv-header-name">' + esc(f.username || 'Freund') + '</div>' +
          '</div>' +
          notifBtn +
        '</div>' +
        '<div class="cv-messages" data-cv-messages>' +
          '<div class="cv-loading">Nachrichten werden geladen…</div>' +
        '</div>' +
        '<div class="cv-local-note" data-cv-note style="display:none;"></div>' +
        '<div class="cv-input-bar">' +
          '<textarea class="cv-input" data-cv-input placeholder="Nachricht…" rows="1" maxlength="1000"></textarea>' +
          '<button class="cv-send-btn" data-cv-send aria-label="Senden">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function setMessageList(html, offlineMode) {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov) return;
    const list = ov.querySelector('[data-cv-messages]');
    if (list) {
      list.innerHTML = html;
      list.scrollTop = list.scrollHeight;
    }
    const note = ov.querySelector('[data-cv-note]');
    if (note) {
      if (offlineMode) {
        note.textContent = 'Offline — Nachrichten werden lokal gespeichert';
        note.style.display = '';
      } else {
        note.style.display = 'none';
      }
    }
  }

  function appendMessage(msg) {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov) return;
    const list = ov.querySelector('[data-cv-messages]');
    if (!list) return;
    const empty = list.querySelector('.cv-empty');
    if (empty) empty.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = renderMsgList([msg]);
    while (wrap.firstChild) list.appendChild(wrap.firstChild);
    list.scrollTop = list.scrollHeight;
  }

  /* ─── Realtime ─── */
  function subscribeRealtime(client, myId, friendId) {
    if (state.realtimeChannel) {
      try { client.removeChannel(state.realtimeChannel); } catch (_e) { /* ignore */ }
      state.realtimeChannel = null;
    }
    state.realtimeChannel = client
      .channel('chat-' + friendId + '-' + Date.now())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'receiver_id=eq.' + myId,
      }, (payload) => {
        const m = payload.new;
        if (!m || m.sender_id !== friendId) return;
        appendMessage({ id: m.id, text: m.text, from: 'friend', ts: m.created_at });
        markRead(client, myId, friendId);
      })
      .subscribe();
  }

  function unsubscribeRealtime() {
    if (state.realtimeChannel && state.client) {
      try { state.client.removeChannel(state.realtimeChannel); } catch (_e) { /* ignore */ }
      state.realtimeChannel = null;
    }
  }

  /* ─── Send ─── */
  function sendMessage() {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov || !state.friend) return;
    const input = ov.querySelector('[data-cv-input]');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const friendId = state.friend.userId;
    const myId = state.myId;
    const client = state.client;

    const optimisticId = uid();
    appendMessage({ id: optimisticId, text, from: 'me', ts: new Date().toISOString() });
    input.value = '';
    input.style.height = 'auto';
    if (window.MobileFeatures && window.MobileFeatures.triggerHaptic) window.MobileFeatures.triggerHaptic('light');

    if (client && myId) {
      insertMessage(client, myId, friendId, text)
        .then((saved) => {
          if (saved && saved.id) {
            const el = ov.querySelector('[data-msg-id="' + optimisticId + '"]');
            if (el) el.setAttribute('data-msg-id', saved.id);
          }
          const myName = (window.StorageManager && window.StorageManager.getRaw && window.StorageManager.getRaw('username')) || 'Dein Freund';
          sendPushNotification(friendId, text, myName);
        })
        .catch((err) => {
          console.error('[ChatView] insert failed:', err && err.message);
          const el = ov.querySelector('[data-msg-id="' + optimisticId + '"]');
          if (el) el.remove();
          toast('Nachricht konnte nicht gesendet werden', 'error');
        });
    } else {
      const local = loadLocalMessages(friendId);
      local.push({ id: optimisticId, text, from: 'me', ts: new Date().toISOString() });
      saveLocalMessages(friendId, local);
    }
  }

  /* ─── Actions ─── */
  function wireActions() {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov) return;

    if (!ov._cvClickBound) {
      ov._cvClickBound = true;
      ov.addEventListener('click', (e) => {
      if (e.target.closest('[data-cv-back]')) {
        if (history.state && history.state.chatView) history.back();
        else close('user');
        return;
      }
      if (e.target.closest('[data-cv-send]')) { sendMessage(); return; }
      if (e.target.closest('[data-cv-notif]')) {
        if (window.ChatNotifications && window.ChatNotifications.requestPermission) {
          window.ChatNotifications.requestPermission().then((perm) => {
            const btn = ov.querySelector('[data-cv-notif]');
            if (btn && perm !== 'default') btn.style.display = 'none';
            if (perm === 'granted') toast('Benachrichtigungen aktiviert 🔔', 'success');
            else if (perm === 'denied') toast('Benachrichtigungen blockiert', 'error');
          });
        }
        return;
      }
    });
    }

    const input = ov.querySelector('[data-cv-input]');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
    }
  }

  /* ─── Open / Close ─── */
  function open(friend) {
    if (!friend || !friend.userId) return;
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov) return;

    state.friend = friend;
    state.myId = getMyId();
    state.client = getClient();
    state.isOpen = true;

    ov.innerHTML = renderSkeleton(friend);
    ov.style.display = 'block';
    state.scrollY = window.scrollY || 0;
    document.body.classList.add('cv-scroll-lock');
    requestAnimationFrame(() => ov.classList.add('cv-open'));
    wireActions();

    if (state.client && state.myId) {
      loadMessages(state.client, state.myId, friend.userId)
        .then((raw) => {
          const msgs = normalize(raw, state.myId);
          setMessageList(renderMsgList(msgs), false);
          saveLocalMessages(friend.userId, msgs);
        })
        .catch((err) => {
          console.warn('[ChatView] load failed:', err && err.message);
          const cached = loadLocalMessages(friend.userId);
          setMessageList(renderMsgList(cached), true);
        });
      subscribeRealtime(state.client, state.myId, friend.userId);
      markRead(state.client, state.myId, friend.userId);
    } else {
      const cached = loadLocalMessages(friend.userId);
      setMessageList(renderMsgList(cached), true);
    }

    if (window.ChatBadge && window.ChatBadge.markRead) window.ChatBadge.markRead(friend.userId);

    state.closingFromPop = false;
    try { history.pushState({ chatView: true }, ''); } catch (_e) { /* ignore */ }
    state.popHandler = () => {
      if (state.isOpen) { state.closingFromPop = true; close('pop'); }
    };
    window.addEventListener('popstate', state.popHandler);

    setTimeout(() => {
      const input = ov.querySelector('[data-cv-input]');
      if (input) input.focus();
    }, ANIM_MS + 50);

    // Silent: if permission already granted, just ensure subscription exists
    if (window.ChatNotifications && window.ChatNotifications.getPermission &&
        window.ChatNotifications.getPermission() === 'granted') {
      window.ChatNotifications.subscribe();
    }
  }

  function close(via) {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov || !state.isOpen) return;
    state.isOpen = false;
    ov.classList.remove('cv-open');
    setTimeout(() => { ov.style.display = 'none'; ov.innerHTML = ''; }, ANIM_MS);
    document.body.classList.remove('cv-scroll-lock');
    unsubscribeRealtime();

    if (state.popHandler) {
      window.removeEventListener('popstate', state.popHandler);
      state.popHandler = null;
    }
    if (via === 'user' && !state.closingFromPop) {
      try { if (history.state && history.state.chatView) history.back(); } catch (_e) { /* ignore */ }
    }
    state.friend = null;
    state.myId = null;
    state.client = null;
    state.closingFromPop = false;
  }

  window.ChatView = {
    open: open,
    close: () => close('user'),
    isOpenWith: (id) => state.isOpen && state.friend && state.friend.userId === id,
  };
})();
