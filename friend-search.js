/* Schützen Challenge — Personensuche (Freunde finden)
 *
 * Eigenständiges, markentreues Such-Overlay. Öffnet über den Such-Button oben
 * rechts im Freunde-Tab. Zeigt VOR der Eingabe schon Spieler (neueste zuerst,
 * je mit Klub/Verein), und sucht live per Name. „Hinzufügen" sendet eine
 * Freundschaftsanfrage. Daten kommen aus window.SupabaseSocial.
 */
(function () {
  'use strict';

  var OVERLAY_ID = 'friendSearchOverlay';
  var STYLE_ID = 'friendSearchStyles';
  var SEARCH_DEBOUNCE = 280;
  var searchTimer = null;
  var reqToken = 0;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function social() { return window.SupabaseSocial || null; }

  function toast(msg) {
    if (typeof window.showEngagementToast === 'function') window.showEngagementToast(msg, 3200);
  }

  function initials(name) {
    var n = String(name || '').trim();
    if (!n) return '🎯';
    var parts = n.split(/\s+/);
    return (parts.length > 1 ? (parts[0][0] + parts[1][0]) : n.slice(0, 2)).toUpperCase();
  }

  function injectStyles() {
    if ($(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#friendSearchOverlay{position:fixed;inset:0;z-index:2147483300;display:none}',
      '#friendSearchOverlay.active{display:block}',
      '#friendSearchOverlay .fs-sheet{position:absolute;inset:0;display:flex;flex-direction:column;opacity:0;transform:translateY(14px);transition:opacity .2s ease,transform .26s cubic-bezier(.32,1.2,.64,1);',
      'background:radial-gradient(ellipse 85% 42% at 50% 0%,rgba(34,197,94,.10),transparent 60%),linear-gradient(180deg,#0c0c0c 0%,#070707 100%);color:#e8e8e0;font-family:"Outfit",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#friendSearchOverlay.active .fs-sheet{opacity:1;transform:none}',
      '.fs-header{position:sticky;top:0;z-index:3;padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 12px;background:rgba(10,10,10,.82);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border-bottom:1px solid rgba(255,255,255,.06)}',
      '.fs-h-row{display:flex;align-items:center;gap:12px}',
      '.fs-h-title{flex:1;font-size:1.4rem;font-weight:800;letter-spacing:-.02em;color:#fff}',
      '.fs-close{width:42px;height:42px;min-width:42px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.82);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;padding:0;-webkit-tap-highlight-color:transparent;transition:transform .12s,background .15s}',
      '.fs-close:active{transform:scale(.92);background:rgba(255,255,255,.14)}',
      '.fs-close svg{width:22px;height:22px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}',
      '.fs-search{position:relative;margin-top:12px}',
      '.fs-search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:18px;height:18px;stroke:rgba(255,255,255,.42);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}',
      '.fs-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:14px;color:#fff;padding:13px 14px 13px 42px;font-size:1rem;font-family:inherit;outline:0}',
      '.fs-input:focus{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.16)}',
      '.fs-input::placeholder{color:rgba(255,255,255,.38)}',
      '.fs-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;width:100%;max-width:560px;margin:0 auto;padding:14px 16px calc(env(safe-area-inset-bottom,0px) + 36px);display:flex;flex-direction:column;gap:10px}',
      '.fs-eyebrow{font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.4);font-weight:700;margin:4px 2px 2px}',
      '.fs-row{display:flex;align-items:center;gap:12px;background:rgba(18,18,18,.92);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:11px 13px}',
      '.fs-av{width:44px;height:44px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:#fff;background:linear-gradient(135deg,rgba(34,197,94,.32),rgba(0,195,255,.26));border:1px solid rgba(255,255,255,.1)}',
      '.fs-info{flex:1;min-width:0}',
      '.fs-name{font-size:.95rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.fs-club{font-size:.74rem;color:rgba(255,255,255,.45);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:5px}',
      '.fs-club.none{color:rgba(255,255,255,.3)}',
      '.fs-add{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(34,197,94,.4);background:rgba(34,197,94,.12);color:#4ade80;border-radius:100px;padding:9px 14px;font-size:.78rem;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent;transition:transform .12s,background .15s}',
      '.fs-add:active{transform:scale(.95)}',
      '.fs-add svg{width:15px;height:15px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}',
      '.fs-add.solid{background:#22c55e;border-color:transparent;color:#000;box-shadow:0 3px 14px rgba(34,197,94,.28)}',
      '.fs-tag{flex:0 0 auto;font-size:.72rem;font-weight:700;padding:8px 12px;border-radius:100px;white-space:nowrap}',
      '.fs-tag.friend{background:rgba(34,197,94,.12);color:#86e29b;border:1px solid rgba(34,197,94,.3)}',
      '.fs-tag.sent{background:rgba(255,255,255,.06);color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.12)}',
      '.fs-tag.self{background:rgba(0,195,255,.1);color:#9fd0f5;border:1px solid rgba(0,195,255,.26)}',
      '.fs-empty{text-align:center;padding:38px 16px;color:rgba(255,255,255,.45)}',
      '.fs-empty .ico{font-size:2rem;margin-bottom:10px;opacity:.6}',
      '.fs-empty .sub{font-size:.74rem;color:rgba(255,255,255,.28);margin-top:5px}',
      '.fs-skeleton{height:66px;border-radius:16px;background:linear-gradient(100deg,rgba(255,255,255,.04) 30%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 70%);background-size:200% 100%;animation:fsShimmer 1.1s linear infinite}',
      '@keyframes fsShimmer{from{background-position:200% 0}to{background-position:-200% 0}}'
    ].join('');
    document.head.appendChild(s);
  }

  function buildOverlay() {
    injectStyles();
    var ov = $(OVERLAY_ID);
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = OVERLAY_ID;
    ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML =
      '<div class="fs-sheet" role="dialog" aria-label="Freunde suchen">' +
        '<div class="fs-header">' +
          '<div class="fs-h-row">' +
            '<div class="fs-h-title">Freunde finden</div>' +
            '<button class="fs-close" type="button" aria-label="Schließen" data-fs-close>' +
              '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="fs-search">' +
            '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
            '<input id="friendSearchInput" class="fs-input" type="text" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Name suchen…" maxlength="40">' +
          '</div>' +
        '</div>' +
        '<div class="fs-scroll" id="friendSearchResults"></div>' +
      '</div>';
    document.body.appendChild(ov);

    ov.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-fs-close]')) close();
    });
    var input = $('friendSearchInput');
    if (input) input.addEventListener('input', onInput);
    return ov;
  }

  function renderSkeletons() {
    var box = $('friendSearchResults');
    if (!box) return;
    var html = '<div class="fs-eyebrow">Lädt…</div>';
    for (var i = 0; i < 5; i += 1) html += '<div class="fs-skeleton"></div>';
    box.innerHTML = html;
  }

  function relationButton(person) {
    if (person.relation === 'self') return '<span class="fs-tag self">Du</span>';
    if (person.relation === 'friend') return '<span class="fs-tag friend">✓ Freund</span>';
    if (person.relation === 'sent') return '<span class="fs-tag sent">Angefragt</span>';
    if (person.relation === 'incoming') {
      return '<button class="fs-add solid" type="button" data-fs-accept="' + escapeHtml(person.userId) + '">Annehmen</button>';
    }
    return '<button class="fs-add" type="button" data-fs-add="' + escapeHtml(person.userId) + '" data-fs-name="' + escapeHtml(person.name) + '">' +
      '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Hinzufügen</button>';
  }

  var PIN_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" style="width:13px;height:13px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  function personRow(p) {
    var clubHtml = p.club
      ? '<div class="fs-club">' + PIN_SVG + '<span>' + escapeHtml(p.club) + (p.clubLocation ? ' · ' + escapeHtml(p.clubLocation) : '') + '</span></div>'
      : '<div class="fs-club none">Kein Verein</div>';
    return '<div class="fs-row" data-uid="' + escapeHtml(p.userId) + '">' +
      '<div class="fs-av">' + (p.avatarUrl ? escapeHtml(p.avatarUrl) : escapeHtml(initials(p.name))) + '</div>' +
      '<div class="fs-info"><div class="fs-name">' + escapeHtml(p.name) + '</div>' + clubHtml + '</div>' +
      relationButton(p) +
    '</div>';
  }

  function renderPeople(people, heading) {
    var box = $('friendSearchResults');
    if (!box) return;
    if (!people || people.length === 0) {
      box.innerHTML = '<div class="fs-empty"><div class="ico">🔍</div><div>Niemand gefunden</div><div class="sub">Versuche einen anderen Namen oder lade per Code ein.</div></div>';
      return;
    }
    box.innerHTML = '<div class="fs-eyebrow">' + escapeHtml(heading || 'Ergebnisse') + '</div>' +
      people.map(personRow).join('');
    bindRowActions();
  }

  function renderUnavailable(reason) {
    var box = $('friendSearchResults');
    if (!box) return;
    var msg = 'Melde dich an, um Spieler zu finden.';
    if (reason === 'local-mode') msg = 'Im lokalen Modus ist die Suche nicht verfügbar. Melde dich an, um Freunde zu finden.';
    box.innerHTML = '<div class="fs-empty"><div class="ico">👥</div><div>Suche nicht verfügbar</div><div class="sub">' + escapeHtml(msg) + '</div></div>';
  }

  function bindRowActions() {
    var box = $('friendSearchResults');
    if (!box) return;
    box.querySelectorAll('[data-fs-add]').forEach(function (btn) {
      btn.addEventListener('click', function () { sendRequest(btn.getAttribute('data-fs-add'), btn.getAttribute('data-fs-name'), btn); });
    });
    box.querySelectorAll('[data-fs-accept]').forEach(function (btn) {
      btn.addEventListener('click', function () { acceptIncoming(btn.getAttribute('data-fs-accept'), btn); });
    });
  }

  async function sendRequest(userId, name, btn) {
    var s = social();
    if (!s || typeof s.sendFriendRequest !== 'function') { toast('Suche nicht verfügbar.'); return; }
    btn.disabled = true;
    btn.textContent = 'Senden…';
    try {
      var res = await s.sendFriendRequest(userId);
      if (res && res.ok) {
        replaceRowTag(btn, 'sent', 'Angefragt');
        toast('Anfrage an ' + (name || 'Spieler') + ' gesendet.');
        if (window.FriendsSystem && typeof window.FriendsSystem.refresh === 'function') window.FriendsSystem.refresh();
      } else {
        var reason = res ? res.reason : '';
        if (reason === 'already-friend') { replaceRowTag(btn, 'friend', '✓ Freund'); toast('Ihr seid bereits Freunde.'); }
        else if (reason === 'already-sent') { replaceRowTag(btn, 'sent', 'Angefragt'); toast('Anfrage läuft bereits.'); }
        else if (reason === 'self') { replaceRowTag(btn, 'self', 'Du'); }
        else { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Hinzufügen'; toast('Konnte Anfrage nicht senden.'); }
      }
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Hinzufügen';
      toast('Fehler beim Senden der Anfrage.');
    }
  }

  async function acceptIncoming(userId, btn) {
    // The incoming request id lives in SupabaseSocial state; map user -> request.
    var s = social();
    if (!s) return;
    var st = typeof s.getState === 'function' ? s.getState() : {};
    var req = (st.incomingRequests || []).find(function (r) { return r.fromUserId === userId; });
    if (!req || typeof s.acceptRequest !== 'function') { toast('Anfrage nicht gefunden.'); return; }
    btn.disabled = true; btn.textContent = 'Annehmen…';
    try {
      var res = await s.acceptRequest(req.id);
      if (res && res.ok) { replaceRowTag(btn, 'friend', '✓ Freund'); toast('Freund hinzugefügt.'); if (window.FriendsSystem && window.FriendsSystem.refresh) window.FriendsSystem.refresh(); }
      else { btn.disabled = false; btn.textContent = 'Annehmen'; toast('Konnte nicht annehmen.'); }
    } catch (e) { btn.disabled = false; btn.textContent = 'Annehmen'; toast('Fehler.'); }
  }

  function replaceRowTag(btn, cls, text) {
    var tag = document.createElement('span');
    tag.className = 'fs-tag ' + cls;
    tag.textContent = text;
    if (btn && btn.parentNode) btn.parentNode.replaceChild(tag, btn);
  }

  function onInput(e) {
    var term = e.target.value;
    if (searchTimer) clearTimeout(searchTimer);
    if (String(term || '').trim().length < 2) {
      searchTimer = setTimeout(loadRecent, 120);
      return;
    }
    renderSkeletons();
    searchTimer = setTimeout(function () { runSearch(term); }, SEARCH_DEBOUNCE);
  }

  async function runSearch(term) {
    var s = social();
    if (!s || typeof s.searchProfiles !== 'function') { renderUnavailable(); return; }
    var token = ++reqToken;
    try {
      var res = await s.searchProfiles(term, 25);
      if (token !== reqToken) return; // stale
      if (!res.ok) { renderUnavailable(res.reason); return; }
      renderPeople(res.people, 'Ergebnisse für „' + term.trim() + '“');
    } catch (e) {
      if (token === reqToken) renderUnavailable();
    }
  }

  async function loadRecent() {
    var s = social();
    if (!s || typeof s.listRecentProfiles !== 'function') { renderUnavailable(); return; }
    var token = ++reqToken;
    renderSkeletons();
    try {
      var res = await s.listRecentProfiles(20);
      if (token !== reqToken) return;
      if (!res.ok) { renderUnavailable(res.reason); return; }
      renderPeople(res.people, 'Spieler entdecken');
    } catch (e) {
      if (token === reqToken) renderUnavailable();
    }
  }

  function open() {
    buildOverlay();
    var ov = $(OVERLAY_ID);
    if (!ov) return;
    var input = $('friendSearchInput');
    if (input) input.value = '';
    ov.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    void ov.offsetWidth;
    ov.classList.add('active');
    loadRecent();
    if (typeof window.triggerHaptic === 'function') window.triggerHaptic();
  }

  function close() {
    var ov = $(OVERLAY_ID);
    if (!ov) return;
    ov.classList.remove('active');
    ov.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var ov = $(OVERLAY_ID); if (ov && ov.classList.contains('active')) close(); }
  });

  window.FriendSearch = { open: open, close: close };
})();
