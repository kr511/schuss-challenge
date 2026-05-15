/* Chat View — slide-up overlay for messaging a friend */
(function () {
  'use strict';

  const OVERLAY_ID = 'chatOverlay';
  const ANIM_MS = 320;
  const MAX_MSGS = 500;

  const state = {
    isOpen: false,
    friend: null,
    popHandler: null,
    scrollY: 0,
    closingFromPop: false,
  };

  function esc(v) {
    const d = document.createElement('div');
    d.textContent = v == null ? '' : String(v);
    return d.innerHTML;
  }

  function storageKey(friendId) {
    return 'sd_chat_' + friendId;
  }

  function loadMessages(friendId) {
    try {
      const raw = localStorage.getItem(storageKey(friendId));
      return raw ? JSON.parse(raw) : [];
    } catch (_e) {
      return [];
    }
  }

  function saveMessages(friendId, msgs) {
    try {
      // Keep at most MAX_MSGS recent messages
      const trimmed = msgs.length > MAX_MSGS ? msgs.slice(-MAX_MSGS) : msgs;
      localStorage.setItem(storageKey(friendId), JSON.stringify(trimmed));
    } catch (_e) { /* quota ignore */ }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function formatTime(ts) {
    const d = new Date(ts);
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

  function renderMessages(msgs) {
    if (!msgs.length) {
      return '<div class="cv-empty">Noch keine Nachrichten.<br>Schreib etwas! 👋</div>';
    }
    return msgs.map(m => {
      const isMe = m.from === 'me';
      return (
        '<div class="cv-msg ' + (isMe ? 'cv-msg-me' : 'cv-msg-friend') + '">' +
          '<div class="cv-bubble">' + esc(m.text) + '</div>' +
          '<div class="cv-msg-time">' + esc(formatTime(m.ts)) + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function render() {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov || !state.friend) return;

    const f = state.friend;
    const initial = esc((f.username || '?').charAt(0).toUpperCase());
    const avatarHtml = f.avatarUrl
      ? '<img src="' + esc(f.avatarUrl) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : initial;

    const msgs = loadMessages(f.userId);

    ov.innerHTML = (
      '<div class="cv-sheet">' +
        '<div class="cv-header">' +
          '<button class="cv-back-btn" data-cv-back aria-label="Zurück">' +
            '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>' +
          '</button>' +
          '<div class="cv-header-friend">' +
            '<div class="cv-header-avatar">' + avatarHtml + '</div>' +
            '<div class="cv-header-name">' + esc(f.username || 'Freund') + '</div>' +
          '</div>' +
          '<div class="cv-header-spacer"></div>' +
        '</div>' +
        '<div class="cv-messages" data-cv-messages>' +
          renderMessages(msgs) +
        '</div>' +
        '<div class="cv-local-note">Nachrichten lokal gespeichert · Echtzeit-Chat folgt bald</div>' +
        '<div class="cv-input-bar">' +
          '<textarea class="cv-input" data-cv-input placeholder="Nachricht…" rows="1" maxlength="1000"></textarea>' +
          '<button class="cv-send-btn" data-cv-send aria-label="Senden">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>'
    );

    // Scroll to bottom
    const msgList = ov.querySelector('[data-cv-messages]');
    if (msgList) msgList.scrollTop = msgList.scrollHeight;
  }

  function sendMessage() {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov || !state.friend) return;

    const input = ov.querySelector('[data-cv-input]');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const msgs = loadMessages(state.friend.userId);
    msgs.push({ id: uid(), text: text, from: 'me', ts: Date.now() });
    saveMessages(state.friend.userId, msgs);

    const msgList = ov.querySelector('[data-cv-messages]');
    if (msgList) {
      msgList.innerHTML = renderMessages(msgs);
      msgList.scrollTop = msgList.scrollHeight;
    }

    input.value = '';
    input.style.height = 'auto';

    if (window.MobileFeatures && typeof window.MobileFeatures.triggerHaptic === 'function') {
      window.MobileFeatures.triggerHaptic('light');
    }
  }

  function wireActions() {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov) return;

    ov.addEventListener('click', (e) => {
      if (e.target.closest('[data-cv-back]')) {
        if (history.state && history.state.chatView) history.back();
        else close('user');
        return;
      }
      if (e.target.closest('[data-cv-send]')) {
        sendMessage();
        return;
      }
    });

    const input = ov.querySelector('[data-cv-input]');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
    }
  }

  function open(friend) {
    if (!friend || !friend.userId) return;

    const ov = document.getElementById(OVERLAY_ID);
    if (!ov) return;

    state.friend = friend;
    state.isOpen = true;

    render();

    ov.style.display = 'block';
    state.scrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add('cv-scroll-lock');

    requestAnimationFrame(() => {
      ov.classList.add('cv-open');
    });

    wireActions();

    state.closingFromPop = false;
    try {
      history.pushState({ chatView: true }, '');
    } catch (_e) { /* ignore */ }

    state.popHandler = function () {
      if (!state.isOpen) return;
      state.closingFromPop = true;
      close('pop');
    };
    window.addEventListener('popstate', state.popHandler);

    // Focus input after animation
    setTimeout(() => {
      const input = ov.querySelector('[data-cv-input]');
      if (input) input.focus();
    }, ANIM_MS + 50);
  }

  function close(via) {
    const ov = document.getElementById(OVERLAY_ID);
    if (!ov || !state.isOpen) return;

    state.isOpen = false;
    ov.classList.remove('cv-open');

    setTimeout(() => {
      ov.style.display = 'none';
      ov.innerHTML = '';
    }, ANIM_MS);

    document.body.classList.remove('cv-scroll-lock');

    if (state.popHandler) {
      window.removeEventListener('popstate', state.popHandler);
      state.popHandler = null;
    }

    if (via === 'user' && !state.closingFromPop) {
      try {
        if (history.state && history.state.chatView) history.back();
      } catch (_e) { /* ignore */ }
    }

    state.friend = null;
    state.closingFromPop = false;
  }

  window.ChatView = { open: open, close: () => close('user') };
})();
