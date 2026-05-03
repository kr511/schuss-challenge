/* Premium Dashboard Friendships Section + Page */
(function () {
  'use strict';

  var SECTION_ID = 'pdFriendshipsSection';
  var BUTTON_ID = 'pdFriendsQuickButton';
  var PAGE_ID = 'pdFriendshipsPage';
  var STYLE_ID = 'pdFriendsQuickButtonStyle';
  var retryTimer = null;
  var pollTimer = null;
  var POLL_INTERVAL_MS = 10000; // alle 10s neue Anfragen prüfen während Seite offen

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function esc(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function getFriendsState() {
    try {
      if (window.FriendsSystem && typeof window.FriendsSystem.getState === 'function') {
        return window.FriendsSystem.getState();
      }
    } catch (e) {}
    return { friends: [], pendingRequests: [], sentRequests: [], userCode: null, initialized: false };
  }

  function count(list) {
    return Array.isArray(list) ? list.length : 0;
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '#' + SECTION_ID + '{margin:0 0 20px 0}' +
      '#' + SECTION_ID + ' .fs-heading{font-size:1.05rem;font-weight:800;color:#fff;margin:0 0 10px 0;line-height:1.2}' +
      '#' + BUTTON_ID + ' .fb-card{width:100%;border:1px solid rgba(0,195,255,.18);border-top:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,rgba(0,195,255,.16),rgba(122,176,48,.12) 48%,rgba(10,12,15,.72));border-radius:18px;padding:14px 15px;box-shadow:0 10px 28px rgba(0,0,0,.42),0 0 28px rgba(0,195,255,.08);display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;color:#fff;cursor:pointer;text-align:left;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;-webkit-tap-highlight-color:transparent}' +
      '#' + BUTTON_ID + ' .fb-card:active{transform:scale(.985);border-color:rgba(122,176,48,.45);box-shadow:0 7px 20px rgba(0,0,0,.38)}' +
      '#' + BUTTON_ID + ' .fb-icon{width:42px;height:42px;border-radius:15px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:1.35rem;box-shadow:inset 0 1px 1px rgba(255,255,255,.06)}' +
      '#' + BUTTON_ID + ' .fb-title{font-weight:900;font-size:.98rem;letter-spacing:.01em;line-height:1.15}' +
      '#' + BUTTON_ID + ' .fb-sub{font-size:.68rem;color:rgba(255,255,255,.5);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + BUTTON_ID + ' .fb-meta{display:flex;flex-direction:column;align-items:flex-end;gap:5px}' +
      '#' + BUTTON_ID + ' .fb-pill{font-size:.64rem;color:rgba(255,255,255,.72);background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:4px 8px;font-weight:800;white-space:nowrap}' +
      '#' + BUTTON_ID + ' .fb-arrow{color:#7ab030;font-size:1.15rem;font-weight:900;line-height:1}' +
      '#' + BUTTON_ID + ' .fb-badge{min-width:18px;height:18px;border-radius:9px;background:#ff3b30;color:#fff;font-size:.62rem;font-weight:900;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;margin-left:6px;box-shadow:0 3px 10px rgba(255,59,48,.35)}' +
      '#' + PAGE_ID + '{position:fixed;inset:0;z-index:12050;background:radial-gradient(circle at top left,rgba(0,195,255,.16),transparent 35%),radial-gradient(circle at bottom right,rgba(122,176,48,.12),transparent 40%),#071006;display:none;overflow-y:auto;-webkit-overflow-scrolling:touch;font-family:Outfit,system-ui,sans-serif;color:#fff}' +
      '#' + PAGE_ID + '.active{display:block}' +
      '#' + PAGE_ID + ' .fp-wrap{width:100%;max-width:520px;margin:0 auto;padding:calc(18px + env(safe-area-inset-top)) 18px 110px}' +
      '#' + PAGE_ID + ' .fp-top{display:flex;align-items:center;gap:12px;margin-bottom:18px}' +
      '#' + PAGE_ID + ' .fp-back{width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#fff;font-size:1.15rem;font-weight:900}' +
      '#' + PAGE_ID + ' .fp-title{font-size:1.55rem;font-weight:950;letter-spacing:-.02em;line-height:1.05}' +
      '#' + PAGE_ID + ' .fp-sub{font-size:.78rem;color:rgba(255,255,255,.45);margin-top:4px}' +
      '#' + PAGE_ID + ' .fp-card{background:linear-gradient(145deg,rgba(45,50,55,.38),rgba(10,12,15,.78));border:1px solid rgba(255,255,255,.08);border-top:1px solid rgba(255,255,255,.14);border-radius:20px;padding:15px;box-shadow:0 10px 30px rgba(0,0,0,.42);margin-bottom:14px}' +
      '#' + PAGE_ID + ' .fp-code-label{font-size:.68rem;color:rgba(255,255,255,.42);font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}' +
      '#' + PAGE_ID + ' .fp-code-row{display:flex;align-items:center;gap:10px}' +
      '#' + PAGE_ID + ' .fp-code{flex:1;text-align:center;font-size:1.7rem;font-weight:950;letter-spacing:.18em;color:#7ab030;background:rgba(122,176,48,.08);border:1px solid rgba(122,176,48,.2);border-radius:16px;padding:12px 10px}' +
      '#' + PAGE_ID + ' .fp-btn{border:0;border-radius:15px;padding:12px 13px;font-weight:900;color:#061006;background:linear-gradient(135deg,#00c3ff,#7ab030);box-shadow:0 8px 22px rgba(122,176,48,.22)}' +
      '#' + PAGE_ID + ' .fp-btn.ghost{color:#fff;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);box-shadow:none}' +
      '#' + PAGE_ID + ' .fp-add{display:grid;grid-template-columns:1fr auto;gap:9px;margin-top:12px}' +
      '#' + PAGE_ID + ' .fp-input{min-width:0;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#fff;border-radius:15px;padding:0 13px;font-size:.95rem;font-weight:800;text-transform:uppercase;outline:none}' +
      '#' + PAGE_ID + ' .fp-section-title{font-size:1rem;font-weight:900;margin:20px 0 10px;color:#fff}' +
      '#' + PAGE_ID + ' .fp-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:11px;padding:12px 0;border-top:1px solid rgba(255,255,255,.07)}' +
      '#' + PAGE_ID + ' .fp-row:first-child{border-top:0}' +
      '#' + PAGE_ID + ' .fp-avatar{width:38px;height:38px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;font-size:1.15rem}' +
      '#' + PAGE_ID + ' .fp-name{font-weight:900;color:#fff;font-size:.9rem}' +
      '#' + PAGE_ID + ' .fp-meta{font-size:.7rem;color:rgba(255,255,255,.42);margin-top:3px}' +
      '#' + PAGE_ID + ' .fp-empty{color:rgba(255,255,255,.45);font-size:.82rem;line-height:1.4;padding:14px 0;text-align:center}' +
      '#' + PAGE_ID + ' .fp-small-actions{display:flex;gap:6px;align-items:center}' +
      '#' + PAGE_ID + ' .fp-mini{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);color:#fff;border-radius:12px;padding:8px 10px;font-weight:900;font-size:.75rem}' +
      '#' + PAGE_ID + ' .fp-mini.good{background:rgba(122,176,48,.18);border-color:rgba(122,176,48,.24);color:#9bd24c}' +
      '#' + PAGE_ID + ' .fp-mini.bad{background:rgba(255,59,48,.12);border-color:rgba(255,59,48,.22);color:#ff8c83}';
    document.head.appendChild(style);
  }

  function showToast(text) {
    var toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:13000;background:rgba(15,23,42,.94);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:10px 14px;font-size:.78rem;font-weight:800;box-shadow:0 10px 28px rgba(0,0,0,.45);';
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 1800);
  }

  function avatar(name) {
    return name ? String(name).charAt(0).toUpperCase() : '👤';
  }

  function formatTime(timestamp) {
    var n = Number(timestamp) || 0;
    if (!n) return '';
    var diff = Date.now() - n;
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'gerade eben';
    if (minutes < 60) return 'vor ' + minutes + ' Min';
    if (hours < 24) return 'vor ' + hours + ' Std';
    return 'vor ' + days + ' Tagen';
  }

  function ensurePage() {
    var page = document.getElementById(PAGE_ID);
    if (page) return page;
    page = document.createElement('div');
    page.id = PAGE_ID;
    document.body.appendChild(page);
    return page;
  }

  function renderFriendshipsPage(loading) {
    var page = ensurePage();
    var state = getFriendsState();
    var friends = Array.isArray(state.friends) ? state.friends : [];
    var pending = Array.isArray(state.pendingRequests) ? state.pendingRequests : [];
    var sent = Array.isArray(state.sentRequests) ? state.sentRequests : [];
    // Zeige "Wird geladen…" wenn noch kein Code vorhanden und loading=true
    var code = state.userCode || (loading ? '…' : '------');

    page.innerHTML =
      '<div class="fp-wrap">' +
        '<div class="fp-top"><button type="button" class="fp-back" data-fp-action="close">←</button><div><div class="fp-title">Freundschaften</div><div class="fp-sub">Freunde hinzufügen, Codes teilen und Duelle starten</div></div>' +
        '<button type="button" class="fp-btn ghost" data-fp-action="refresh" style="margin-left:auto;flex-shrink:0;font-size:.75rem;padding:8px 10px;" title="Aktualisieren">↻</button></div>' +
        '<div class="fp-card"><div class="fp-code-label">Dein Freundes-Code</div><div class="fp-code-row"><div class="fp-code">' + esc(code) + '</div><button type="button" class="fp-btn ghost" data-fp-action="copy">Kopieren</button></div>' +
          '<div class="fp-add"><input id="fpFriendCodeInput" class="fp-input" maxlength="6" placeholder="Code eingeben"><button type="button" class="fp-btn" data-fp-action="add">Hinzufügen</button></div></div>' +
        '<div class="fp-section-title">Eingehende Anfragen</div>' +
        '<div class="fp-card">' + (pending.length ? pending.map(function (req) {
          return '<div class="fp-row"><div class="fp-avatar">' + avatar(req.fromUsername) + '</div><div><div class="fp-name">' + esc(req.fromUsername || 'Unbekannt') + '</div><div class="fp-meta">Anfrage ' + esc(formatTime(req.timestamp)) + '</div></div><div class="fp-small-actions"><button type="button" class="fp-mini good" data-fp-action="accept" data-id="' + esc(req.fromUserId) + '">✓</button><button type="button" class="fp-mini bad" data-fp-action="decline" data-id="' + esc(req.fromUserId) + '">×</button></div></div>';
        }).join('') : '<div class="fp-empty">Keine offenen Anfragen.</div>') + '</div>' +
        '<div class="fp-section-title">Deine Freunde (' + friends.length + ')</div>' +
        '<div class="fp-card">' + (friends.length ? friends.map(function (friend) {
          return '<div class="fp-row"><div class="fp-avatar">' + avatar(friend.username) + '</div><div><div class="fp-name">' + esc(friend.username || 'Freund') + '</div><div class="fp-meta">Hinzugefügt ' + esc(formatTime(friend.addedAt ? Date.parse(friend.addedAt) : 0)) + '</div></div><div class="fp-small-actions"><button type="button" class="fp-mini good" data-fp-action="challenge" data-id="' + esc(friend.userId) + '">Duell</button></div></div>';
        }).join('') : '<div class="fp-empty">Noch keine Freunde. Teile deinen Code oder gib einen Freundes-Code ein.</div>') + '</div>' +
        '<div class="fp-section-title">Gesendete Anfragen</div>' +
        '<div class="fp-card">' + (sent.length ? sent.map(function (req) {
          return '<div class="fp-row"><div class="fp-avatar">' + avatar(req.username) + '</div><div><div class="fp-name">' + esc(req.username || 'Unbekannt') + '</div><div class="fp-meta">⏳ Anfrage gesendet</div></div><div></div></div>';
        }).join('') : '<div class="fp-empty">Keine gesendeten Anfragen.</div>') + '</div>' +
      '</div>';

    bindPageEvents(page);
  }

  function openFriendshipsPage() {
    addStyles();
    var page = ensurePage();
    // loading=true: zeigt '…' als Platzhalter wenn Code noch nicht geladen
    renderFriendshipsPage(true);
    page.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (window.FriendsSystem && typeof window.FriendsSystem.init === 'function') {
      try {
        var result = window.FriendsSystem.init(true);
        if (result && typeof result.then === 'function') {
          result.then(function () {
            renderFriendshipsPage(false);
            render();
          });
        }
      } catch (e) {
        console.warn('[FriendshipsPage] Init fehlgeschlagen:', e);
      }
    } else {
      showToast('👥 Freunde werden geladen...');
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(openFriendshipsPage, 900);
    }

    if (typeof triggerHaptic === 'function') triggerHaptic();
    startPolling();
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(async function () {
      var page = document.getElementById(PAGE_ID);
      if (!page || !page.classList.contains('active')) { stopPolling(); return; }
      if (!window.FriendsSystem || !window.SupabaseSocial) return;
      try {
        var prevCount = (window.FriendsSystem.getState().pendingRequests || []).length;
        if (typeof window.SupabaseSocial.loadIncomingRequests === 'function') {
          await window.SupabaseSocial.loadIncomingRequests();
          // syncFromSupabaseState über init(false) – nur State synchronisieren
          if (typeof window.FriendsSystem.init === 'function') {
            // Leichtgewichtig: nur State-Sync ohne neues Supabase-Init
          }
        }
        // Direkter State-Abgleich über getState nach loadIncomingRequests
        var newCount = (window.SupabaseSocial.getState().incomingRequests || []).length;
        if (newCount !== prevCount) {
          // Neue oder weggefallene Anfragen → Seite und Badge neu rendern
          if (typeof window.FriendsSystem.init === 'function') {
            await window.FriendsSystem.init(true);
          }
          renderFriendshipsPage(false);
          render();
        }
      } catch (e) { /* noop – Polling darf nie crashen */ }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function closeFriendshipsPage() {
    var page = document.getElementById(PAGE_ID);
    if (page) page.classList.remove('active');
    document.body.style.overflow = '';
    stopPolling();
  }

  function bindPageEvents(page) {
    page.querySelectorAll('[data-fp-action]').forEach(function (el) {
      el.onclick = async function () {
        var action = el.getAttribute('data-fp-action');
        var id = el.getAttribute('data-id');

        if (action === 'close') return closeFriendshipsPage();
        if (!window.FriendsSystem) {
          showToast('👥 Freunde werden geladen...');
          return;
        }

        if (action === 'refresh') {
          el.disabled = true;
          el.textContent = '…';
          try {
            var initResult = window.FriendsSystem.init(true);
            if (initResult && typeof initResult.then === 'function') {
              await initResult;
            }
            renderFriendshipsPage(false);
            render();
            showToast('↻ Aktualisiert');
          } finally {
            el.disabled = false;
            // Knopf wird durch renderFriendshipsPage() ohnehin neu gerendert
          }
          return;
        }

        if (action === 'copy') {
          if (typeof window.FriendsSystem.copyFriendCode === 'function') window.FriendsSystem.copyFriendCode();
          else showToast('Code kopieren nicht verfügbar');
          return;
        }

        if (action === 'add') {
          var input = document.getElementById('fpFriendCodeInput');
          var code = input ? input.value.trim().toUpperCase() : '';
          if (!code || code.length !== 6) {
            showToast('Bitte 6-stelligen Code eingeben');
            return;
          }
          if (typeof window.FriendsSystem.addFriendByCode === 'function') {
            el.disabled = true;
            try {
              await window.FriendsSystem.addFriendByCode(code);
              if (input) input.value = '';
              renderFriendshipsPage();
              render();
            } finally {
              el.disabled = false;
            }
          }
          return;
        }

        if (action === 'accept' && id && typeof window.FriendsSystem.acceptRequest === 'function') {
          // Doppelklick-Schutz: Button deaktivieren bis die Aktion abgeschlossen ist.
          el.disabled = true;
          try {
            await window.FriendsSystem.acceptRequest(id);
            renderFriendshipsPage();
            render();
          } finally {
            el.disabled = false;
          }
          return;
        }

        if (action === 'decline' && id && typeof window.FriendsSystem.declineRequest === 'function') {
          // Doppelklick-Schutz: Button deaktivieren bis die Aktion abgeschlossen ist.
          el.disabled = true;
          try {
            await window.FriendsSystem.declineRequest(id);
            renderFriendshipsPage();
            render();
          } finally {
            el.disabled = false;
          }
          return;
        }

        if (action === 'challenge' && id && typeof window.FriendsSystem.challengeFriend === 'function') {
          window.FriendsSystem.challengeFriend(id);
        }
      };
    });
  }

  function bindTopFriendsButton() {
    var topButton = document.getElementById('friendsButton');
    if (!topButton) return;
    topButton.onclick = function (event) {
      if (event) event.preventDefault();
      openFriendshipsPage();
    };
    topButton.title = 'Freundschaften';
    topButton.setAttribute('aria-label', 'Freundschaften öffnen');
    topButton.setAttribute('data-friendships-page-bound', 'true');
  }

  function render() {
    addStyles();
    bindTopFriendsButton();
    var dashboard = document.getElementById('premiumDashboard');
    if (!dashboard) return;

    var section = document.getElementById(SECTION_ID);
    if (!section) {
      section = document.createElement('div');
      section.id = SECTION_ID;
    }

    var badges = document.getElementById('pdBadgesGrid');
    var achievementsTitle = badges && badges.previousElementSibling;
    if (achievementsTitle && achievementsTitle.textContent && achievementsTitle.textContent.trim().toLowerCase().indexOf('erfolge') !== -1) {
      achievementsTitle.parentElement.insertBefore(section, achievementsTitle);
    } else if (badges && badges.parentElement) {
      badges.parentElement.insertBefore(section, badges);
    } else if (!section.parentElement) {
      dashboard.appendChild(section);
    }

    var state = getFriendsState();
    var friends = count(state.friends);
    var pending = count(state.pendingRequests);
    var code = state.userCode || '------';
    var sub = state.initialized ? ('Code ' + code + ' · ' + friends + ' Freunde') : 'Freunde öffnen · Code wird geladen';
    var badge = pending > 0 ? '<span class="fb-badge">' + (pending > 9 ? '9+' : pending) + '</span>' : '';

    section.innerHTML =
      '<div class="fs-heading">Freundschaften</div>' +
      '<div id="' + BUTTON_ID + '">' +
        '<button type="button" class="fb-card" aria-label="Freundschaften öffnen">' +
          '<div class="fb-icon">👥</div>' +
          '<div style="min-width:0"><div class="fb-title">Freunde' + badge + '</div><div class="fb-sub">' + esc(sub) + '</div></div>' +
          '<div class="fb-meta"><div class="fb-pill">Seite</div><div class="fb-arrow">›</div></div>' +
        '</button>' +
      '</div>';

    var btn = section.querySelector('.fb-card');
    if (btn) btn.onclick = openFriendshipsPage;
  }

  function hookFriendsInit() {
    if (!window.FriendsSystem || window.FriendsSystem.__dashboardFriendshipsHooked) return;
    var originalInit = window.FriendsSystem.init;
    if (typeof originalInit === 'function') {
      window.FriendsSystem.init = function () {
        var result = originalInit.apply(this, arguments);
        if (result && typeof result.then === 'function') result.then(function () { setTimeout(render, 0); });
        else setTimeout(render, 0);
        return result;
      };
    }
    window.FriendsSystem.__dashboardFriendshipsHooked = true;
  }

  window.openFriendshipsPage = openFriendshipsPage;
  window.closeFriendshipsPage = closeFriendshipsPage;
  window.bindTopFriendsButtonToPage = bindTopFriendsButton;

  onReady(function () {
    render();
    bindTopFriendsButton();
    setTimeout(function () { hookFriendsInit(); render(); bindTopFriendsButton(); }, 500);
    setTimeout(function () { hookFriendsInit(); render(); bindTopFriendsButton(); }, 1500);
    setTimeout(function () { hookFriendsInit(); render(); bindTopFriendsButton(); }, 3000);
    setInterval(function () { hookFriendsInit(); render(); bindTopFriendsButton(); }, 30000);
  });
})();
