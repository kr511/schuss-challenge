/* Schussduell Friend Photo Duel
 *
 * Foto bleibt lokal: Nur Disziplin, bestaetigter Score und OCR-Konfidenz
 * werden an Supabase gesendet.
 */
(function () {
  'use strict';

  var XP_REWARD = 20;
  var POLL_MS = 60000;
  var CAPTURE_Z_INDEX = 25000;
  var DISCIPLINES = {
    lg40: { label: 'LG 40', weapon: 'lg', distance: '10', shots: 40, isKK: false },
    lg60: { label: 'LG 60', weapon: 'lg', distance: '10', shots: 60, isKK: false },
    kk50: { label: 'KK 50m', weapon: 'kk', distance: '50', shots: 60, isKK: true },
    kk100: { label: 'KK 100m', weapon: 'kk', distance: '100', shots: 60, isKK: true },
    kk3x20: { label: 'KK 3x20', weapon: 'kk', distance: '50', shots: 60, isKK: true }
  };

  var state = {
    initialized: false,
    selectedDiscipline: 'lg40',
    pendingFriendId: null,
    pendingFriendName: '',
    incoming: [],
    created: [],
    activePopupId: null,
    channel: null,
    channelUserId: null,
    pollTimer: null,
    refreshTimer: null
  };

  function currentUserId() {
    return window.SupabaseSession && window.SupabaseSession.user ? window.SupabaseSession.user.id : null;
  }

  function isLocalMode() {
    try {
      return window.SchussduellLocalMode === true ||
        window.SchussduellLocalPlay === true ||
        localStorage.getItem('sd_local_mode') === '1' ||
        localStorage.getItem('sd_local_play') === '1';
    } catch (_e) {
      return false;
    }
  }

  function socialReady() {
    return !!(
      window.SupabaseSocial &&
      window.SupabaseSession &&
      window.SupabaseSession.user &&
      typeof window.SupabaseSocial.createPhotoDuel === 'function' &&
      !isLocalMode()
    );
  }

  function html(value) {
    var div = document.createElement('div');
    div.textContent = String(value == null ? '' : value);
    return div.innerHTML;
  }

  function scoreText(score, discipline) {
    var value = Number(score);
    if (!Number.isFinite(value)) return '-';
    return DISCIPLINES[discipline] && DISCIPLINES[discipline].isKK ? String(Math.round(value)) : value.toFixed(1);
  }

  function notify(message, type) {
    if (typeof window.showEngagementToast === 'function') {
      window.showEngagementToast(message);
      return;
    }
    var toast = document.createElement('div');
    toast.className = 'fpd-toast fpd-toast-' + (type || 'info');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('active'); }, 10);
    setTimeout(function () {
      toast.classList.remove('active');
      setTimeout(function () { toast.remove(); }, 220);
    }, 3200);
  }

  function storageGet(key, fallback) {
    if (window.StorageManager && typeof StorageManager.get === 'function') return StorageManager.get(key, fallback);
    try {
      var raw = localStorage.getItem('sd_' + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    if (window.StorageManager && typeof StorageManager.set === 'function') return StorageManager.set(key, value);
    try {
      localStorage.setItem('sd_' + key, JSON.stringify(value));
      return true;
    } catch (_e) {
      return false;
    }
  }

  function markOnce(key, id) {
    var map = storageGet(key, {});
    if (map && map[id]) return false;
    map = map && typeof map === 'object' ? map : {};
    map[id] = Date.now();
    storageSet(key, map);
    return true;
  }

  function wasMarked(key, id) {
    var map = storageGet(key, {});
    return !!(map && map[id]);
  }

  function getFriend(friendId) {
    if (window.FriendsSystem && typeof window.FriendsSystem.getState === 'function') {
      var friends = window.FriendsSystem.getState().friends || [];
      return friends.find(function (friend) { return friend.userId === friendId; }) || null;
    }
    return null;
  }

  function injectStyles() {
    if (document.getElementById('fpd-styles')) return;
    var style = document.createElement('style');
    style.id = 'fpd-styles';
    style.textContent = [
      '.fpd-overlay{position:fixed;inset:0;z-index:24000;display:none;align-items:flex-end;justify-content:center;background:rgba(3,8,13,.68);backdrop-filter:blur(10px)}',
      '.fpd-overlay.active{display:flex}.fpd-sheet{width:min(560px,100%);max-height:88vh;overflow:auto;background:#101922;border:1px solid rgba(255,255,255,.12);border-radius:18px 18px 0 0;box-shadow:0 -18px 60px rgba(0,0,0,.48);padding:18px;color:#f4f7fb}',
      '.fpd-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.fpd-kicker{font-size:.72rem;color:#8ed04b;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.fpd-title{margin-top:4px;font-size:1.26rem;font-weight:950}.fpd-sub{margin-top:4px;color:rgba(244,247,251,.62);font-size:.86rem;line-height:1.35}.fpd-close{width:38px;height:38px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.06);color:#fff;font-size:1.1rem;cursor:pointer}',
      '.fpd-disc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.fpd-disc{min-height:74px;text-align:left;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055);color:#fff;border-radius:12px;padding:12px;cursor:pointer}.fpd-disc.active{border-color:rgba(142,208,75,.78);background:rgba(142,208,75,.14);box-shadow:0 0 0 1px rgba(142,208,75,.22)}.fpd-disc strong{display:block;font-size:1rem}.fpd-disc span{display:block;margin-top:5px;color:rgba(244,247,251,.58);font-size:.78rem}',
      '.fpd-actions{display:grid;grid-template-columns:1fr;gap:9px;margin-top:16px}.fpd-btn{min-height:52px;border:0;border-radius:12px;background:#8ed04b;color:#061006;font-weight:950;letter-spacing:.05em;cursor:pointer}.fpd-btn.secondary{background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.14);color:#f4f7fb}.fpd-btn.danger{background:rgba(242,82,82,.16);border:1px solid rgba(242,82,82,.34);color:#ff8a8a}.fpd-btn:disabled{opacity:.55;cursor:wait}',
      '.fpd-score-preview{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin:14px 0;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.045)}.fpd-score-side{min-width:0}.fpd-score-label{color:rgba(244,247,251,.52);font-size:.72rem;font-weight:900;text-transform:uppercase}.fpd-score-value{margin-top:5px;font-size:2rem;line-height:1;font-weight:950}.fpd-score-side.winner .fpd-score-value{color:#9fe14f}.fpd-vs{color:rgba(244,247,251,.44);font-weight:950}',
      '.fpd-toast{position:fixed;left:50%;bottom:96px;z-index:26000;transform:translate(-50%,12px);opacity:0;max-width:min(92vw,420px);background:#111c26;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:10px 14px;font-size:.83rem;font-weight:800;box-shadow:0 14px 34px rgba(0,0,0,.42);transition:opacity .18s,transform .18s}.fpd-toast.active{opacity:1;transform:translate(-50%,0)}',
      '@media(min-width:560px){.fpd-overlay{align-items:center}.fpd-sheet{border-radius:18px}.fpd-actions{grid-template-columns:1fr 1fr}.fpd-actions.single{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureOverlay() {
    injectStyles();
    var overlay = document.getElementById('friendPhotoDuelOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'friendPhotoDuelOverlay';
    overlay.className = 'fpd-overlay';
    overlay.innerHTML = '<div class="fpd-sheet" role="dialog" aria-modal="true"><div id="friendPhotoDuelContent"></div></div>';
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeOverlay();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function showOverlay(contentHtml) {
    var overlay = ensureOverlay();
    var mount = document.getElementById('friendPhotoDuelContent');
    if (mount) mount.innerHTML = contentHtml;
    overlay.classList.add('active');
    return overlay;
  }

  function closeOverlay() {
    var overlay = document.getElementById('friendPhotoDuelOverlay');
    if (overlay) overlay.classList.remove('active');
    state.activePopupId = null;
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = !!busy;
    if (!button.dataset.idleText) button.dataset.idleText = button.textContent;
    button.textContent = busy ? 'Bitte warten...' : button.dataset.idleText;
  }

  function renderCreate() {
    var friendName = state.pendingFriendName || 'Freund';
    showOverlay([
      '<div class="fpd-top"><div><div class="fpd-kicker">Foto-Duell</div>',
      '<div class="fpd-title">Duell gegen ' + html(friendName) + '</div>',
      '<div class="fpd-sub">Waehle nur die Disziplin. Danach wertet die lokale Foto-KI dein Ergebnis aus.</div></div>',
      '<button class="fpd-close" type="button" data-fpd-close>x</button></div>',
      '<div class="fpd-disc-grid">',
      Object.keys(DISCIPLINES).map(function (key) {
        var disc = DISCIPLINES[key];
        return '<button class="fpd-disc ' + (key === state.selectedDiscipline ? 'active' : '') + '" type="button" data-fpd-disc="' + key + '">' +
          '<strong>' + html(disc.label) + '</strong><span>' + html(disc.shots + ' Schuss - ' + disc.distance + ' m') + '</span></button>';
      }).join(''),
      '</div>',
      '<div class="fpd-actions single"><button class="fpd-btn" type="button" data-fpd-start>Foto auswerten und senden</button></div>'
    ].join(''));

    document.querySelectorAll('[data-fpd-disc]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.selectedDiscipline = button.getAttribute('data-fpd-disc') || 'lg40';
        renderCreate();
      });
    });
    var close = document.querySelector('[data-fpd-close]');
    if (close) close.addEventListener('click', closeOverlay);
    var start = document.querySelector('[data-fpd-start]');
    if (start) start.addEventListener('click', function () { startCreate(start); });
  }

  async function captureScore(discipline, title) {
    var disc = DISCIPLINES[discipline] || DISCIPLINES.lg40;
    if (!window.ImageCompare || typeof window.ImageCompare.captureScore !== 'function') {
      notify('Foto-Auswertung ist noch nicht geladen. Bitte Seite neu laden.', 'error');
      return null;
    }
    return window.ImageCompare.captureScore({
      discipline: discipline,
      isKK: disc.isKK,
      title: title || ('Foto-Duell - ' + disc.label),
      submitLabel: 'Score fuer Duell nutzen',
      multiScore: true,
      zIndex: CAPTURE_Z_INDEX
    });
  }

  async function startCreate(button) {
    if (!socialReady()) {
      notify('Melde dich an, um Foto-Duelle zu nutzen.', 'error');
      return;
    }
    var friendId = state.pendingFriendId;
    var discipline = state.selectedDiscipline || 'lg40';
    if (!friendId) {
      notify('Freund nicht gefunden.', 'error');
      return;
    }

    setBusy(button, true);
    closeOverlay();
    try {
      var captured = await captureScore(discipline, 'Dein Ergebnis - ' + DISCIPLINES[discipline].label);
      if (!captured) {
        notify('Foto-Duell abgebrochen.', 'info');
        return;
      }
      var result = await window.SupabaseSocial.createPhotoDuel(friendId, {
        discipline: discipline,
        score: captured.score,
        confidence: captured.confidence,
        scoreSource: captured.source
      });
      if (!result || !result.ok) {
        notify('Foto-Duell konnte nicht erstellt werden.', 'error');
        return;
      }
      notify('Foto-Duell an ' + (state.pendingFriendName || 'Freund') + ' gesendet.', 'success');
      refreshSoon();
    } catch (error) {
      console.error('[FriendPhotoDuel] create failed:', error);
      notify('Foto-Duell konnte nicht gesendet werden.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function openCreate(friendId) {
    if (!socialReady()) {
      notify('Melde dich an, um Foto-Duelle zu nutzen.', 'error');
      return false;
    }
    var friend = getFriend(friendId);
    state.pendingFriendId = friendId;
    state.pendingFriendName = friend ? friend.username : 'Freund';
    if (window.G && DISCIPLINES[window.G.discipline]) state.selectedDiscipline = window.G.discipline;
    renderCreate();
    return true;
  }

  function findIncoming(id) {
    return state.incoming.find(function (duel) { return duel.id === id; }) || null;
  }

  function showIncomingPopup(duel) {
    if (!duel || state.activePopupId === duel.id) return;
    state.activePopupId = duel.id;
    var disc = DISCIPLINES[duel.discipline] || DISCIPLINES.lg40;
    var isAccepted = duel.status === 'accepted';
    showOverlay([
      '<div class="fpd-top"><div><div class="fpd-kicker">' + (isAccepted ? 'Duell fortsetzen' : 'Neue Herausforderung') + '</div>',
      '<div class="fpd-title">' + html(duel.creator_username || 'Freund') + ' fordert dich heraus</div>',
      '<div class="fpd-sub">Disziplin: ' + html(disc.label) + ' - ' + html(disc.shots) + ' Schuss - Foto bleibt lokal.</div></div>',
      '</div>',
      '<div class="fpd-score-preview"><div class="fpd-score-side winner"><div class="fpd-score-label">' + html(duel.creator_username || 'Freund') + '</div><div class="fpd-score-value">' + html(scoreText(duel.creator_score, duel.discipline)) + '</div></div><div class="fpd-vs">VS</div><div class="fpd-score-side"><div class="fpd-score-label">Du</div><div class="fpd-score-value">?</div></div></div>',
      '<div class="fpd-actions">',
      isAccepted ? '' : '<button class="fpd-btn danger" type="button" data-fpd-decline="' + html(duel.id) + '">Ablehnen</button>',
      '<button class="fpd-btn" type="button" data-fpd-accept="' + html(duel.id) + '">' + (isAccepted ? 'Ergebnis hochladen' : 'Annehmen') + '</button>',
      '</div>'
    ].join(''));

    var decline = document.querySelector('[data-fpd-decline]');
    if (decline) decline.addEventListener('click', function () { declineIncoming(duel.id, decline); });
    var accept = document.querySelector('[data-fpd-accept]');
    if (accept) accept.addEventListener('click', function () { acceptIncoming(duel.id, accept); });
  }

  async function declineIncoming(id, button) {
    setBusy(button, true);
    try {
      var result = await window.SupabaseSocial.declinePhotoDuel(id);
      if (!result || !result.ok) {
        notify('Duell konnte nicht abgelehnt werden.', 'error');
        return;
      }
      closeOverlay();
      state.activePopupId = null;
      notify('Duell abgelehnt.', 'info');
      refreshSoon();
    } catch (error) {
      console.error('[FriendPhotoDuel] decline failed:', error);
      notify('Duell konnte nicht abgelehnt werden.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function acceptIncoming(id, button) {
    var duel = findIncoming(id);
    if (!duel) {
      notify('Duell nicht gefunden.', 'error');
      return;
    }
    setBusy(button, true);
    try {
      if (duel.status === 'pending') {
        var accepted = await window.SupabaseSocial.acceptPhotoDuel(id);
        if (!accepted || !accepted.ok) {
          notify('Duell konnte nicht angenommen werden.', 'error');
          return;
        }
        duel = Object.assign({}, duel, accepted.challenge, { results: duel.results });
        notify('Duell angenommen. Jetzt dein Ergebnis hochladen.', 'success');
      }

      closeOverlay();
      state.activePopupId = null;
      var captured = await captureScore(duel.discipline, 'Dein Ergebnis - ' + (DISCIPLINES[duel.discipline] || DISCIPLINES.lg40).label);
      if (!captured) {
        notify('Duell angenommen. Du kannst dein Ergebnis spaeter hochladen.', 'info');
        refreshSoon();
        return;
      }

      var submitted = await window.SupabaseSocial.submitPhotoDuelResult(id, {
        score: captured.score,
        confidence: captured.confidence,
        scoreSource: captured.source
      });
      if (!submitted || !submitted.ok) {
        notify('Ergebnis konnte nicht gesendet werden.', 'error');
        return;
      }

      showResult(Object.assign({}, duel, submitted.challenge), submitted.results || []);
      refreshSoon();
    } catch (error) {
      console.error('[FriendPhotoDuel] accept/submit failed:', error);
      notify('Duell konnte nicht abgeschlossen werden.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function handleCreatedDuel(duel) {
    if (!duel || !duel.id) return;
    var opponent = duel.opponent_username || 'Dein Freund';
    if (duel.status === 'accepted' && markOnce('friend_photo_duel_notices', duel.id + ':accepted')) {
      notify(opponent + ' hat dein Duell angenommen.', 'success');
    }
    if (duel.status === 'declined' && markOnce('friend_photo_duel_notices', duel.id + ':declined')) {
      notify(opponent + ' hat dein Duell abgelehnt.', 'info');
    }
    if (duel.status === 'completed' && !wasMarked('friend_photo_duel_results_seen', duel.id)) {
      var results = duel.results && duel.results.length ? duel.results : await window.SupabaseSocial.loadPhotoDuelResults(duel.id);
      showResult(duel, results || []);
    }
  }

  function resultForUser(results, userId) {
    return (results || []).find(function (row) { return row.user_id === userId; }) || null;
  }

  function awardWinnerXp(duel, winnerId) {
    if (!winnerId || winnerId !== currentUserId()) return 0;
    if (!markOnce('friend_photo_duel_xp_awarded', duel.id)) return 0;
    var amount = Number(duel.xp_reward || XP_REWARD) || XP_REWARD;
    if (typeof window.awardFlatXP === 'function') {
      return window.awardFlatXP(amount) || amount;
    }
    if (window.G) {
      window.G.xp = (Number(window.G.xp) || 0) + amount;
      if (typeof window.saveXP === 'function') window.saveXP();
    }
    return amount;
  }

  function showResult(duel, results) {
    var creator = resultForUser(results, duel.creator_id);
    var opponent = resultForUser(results, duel.opponent_id);
    if (!creator || !opponent) return false;

    var creatorScore = Number(creator.score);
    var opponentScore = Number(opponent.score);
    if (!Number.isFinite(creatorScore) || !Number.isFinite(opponentScore)) return false;

    var winnerId = null;
    if (creatorScore > opponentScore) winnerId = duel.creator_id;
    if (opponentScore > creatorScore) winnerId = duel.opponent_id;
    var myId = currentUserId();
    var myWon = winnerId && winnerId === myId;
    var draw = !winnerId;
    var xp = awardWinnerXp(duel, winnerId);
    markOnce('friend_photo_duel_results_seen', duel.id);

    var disc = DISCIPLINES[duel.discipline] || DISCIPLINES.lg40;
    var title = draw ? 'Unentschieden' : (myWon ? 'Du hast gewonnen' : 'Duell beendet');
    showOverlay([
      '<div class="fpd-top"><div><div class="fpd-kicker">Foto-Duell Ergebnis</div>',
      '<div class="fpd-title">' + html(title) + '</div>',
      '<div class="fpd-sub">' + html(disc.label) + ' - ' + html(disc.shots) + ' Schuss</div></div>',
      '<button class="fpd-close" type="button" data-fpd-close>x</button></div>',
      '<div class="fpd-score-preview"><div class="fpd-score-side ' + (winnerId === duel.creator_id ? 'winner' : '') + '"><div class="fpd-score-label">' + html(duel.creator_username || 'Spieler A') + '</div><div class="fpd-score-value">' + html(scoreText(creatorScore, duel.discipline)) + '</div></div><div class="fpd-vs">VS</div><div class="fpd-score-side ' + (winnerId === duel.opponent_id ? 'winner' : '') + '"><div class="fpd-score-label">' + html(duel.opponent_username || 'Spieler B') + '</div><div class="fpd-score-value">' + html(scoreText(opponentScore, duel.discipline)) + '</div></div></div>',
      '<div class="fpd-sub">' + (draw ? 'Beide haben exakt gleich stark geschossen.' : ('Gewinner: ' + html(winnerId === duel.creator_id ? (duel.creator_username || 'Spieler A') : (duel.opponent_username || 'Spieler B')))) + (xp ? ' - +' + html(xp) + ' XP' : '') + '</div>',
      '<div class="fpd-actions single"><button class="fpd-btn" type="button" data-fpd-close>Schliessen</button></div>'
    ].join(''));
    document.querySelectorAll('[data-fpd-close]').forEach(function (button) {
      button.addEventListener('click', function () {
        closeOverlay();
        state.activePopupId = null;
      });
    });
    return true;
  }

  async function refresh() {
    if (!socialReady()) return false;
    try {
      var incoming = await window.SupabaseSocial.loadIncomingPhotoDuels();
      var created = await window.SupabaseSocial.loadCreatedPhotoDuels();
      state.incoming = incoming || [];
      state.created = created || [];

      var openDuel = state.incoming.find(function (duel) {
        return duel.status === 'pending' || (duel.status === 'accepted' && !duel.opponent_score);
      });
      if (openDuel && !state.activePopupId) showIncomingPopup(openDuel);

      await Promise.all(state.created.map(handleCreatedDuel));
      return true;
    } catch (error) {
      console.warn('[FriendPhotoDuel] refresh failed:', error);
      return false;
    }
  }

  function refreshSoon() {
    if (state.refreshTimer) clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(refresh, 350);
  }

  function setupRealtime() {
    var userId = currentUserId();
    var client = window.SupabaseClient || null;
    if (!userId || !client || typeof client.channel !== 'function') return;
    if (state.channel && state.channelUserId === userId) return;

    if (state.channel && typeof client.removeChannel === 'function') {
      client.removeChannel(state.channel);
    }

    var onChange = function () { refreshSoon(); };
    state.channelUserId = userId;
    state.channel = client
      .channel('friend-photo-duels-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'async_challenges', filter: 'opponent_id=eq.' + userId }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'async_challenges', filter: 'creator_id=eq.' + userId }, onChange)
      .subscribe();
  }

  function init() {
    if (state.initialized) {
      refreshSoon();
      return;
    }
    state.initialized = true;
    injectStyles();
    setupRealtime();
    refreshSoon();
    state.pollTimer = setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refreshSoon();
    });
  }

  function destroy() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    if (state.refreshTimer) clearTimeout(state.refreshTimer);
    state.pollTimer = null;
    state.refreshTimer = null;
    var client = window.SupabaseClient || null;
    if (client && state.channel && typeof client.removeChannel === 'function') client.removeChannel(state.channel);
    state.channel = null;
    state.channelUserId = null;
    state.initialized = false;
  }

  window.FriendPhotoDuel = {
    init: init,
    destroy: destroy,
    refresh: refresh,
    openCreate: openCreate,
    close: closeOverlay,
    showResult: showResult,
    getState: function () { return Object.assign({}, state); }
  };

  window.openFriendPhotoDuel = openCreate;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.addEventListener('supabaseAuthReady', function () {
    setupRealtime();
    refreshSoon();
  });
})();
