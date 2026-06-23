/* Schützen Challenge — Verein/Klub-Karte im Profil-Tab
 *
 * Rendert unter dem Profil-Hero eine markentreue Karte:
 *  - nicht angemeldet → Hinweis (Verein braucht Konto)
 *  - kein Verein      → „Verein erstellen" / „Code eingeben"
 *  - hat Verein       → Name, Ort, Rolle, Code + „Verein öffnen"
 * Nutzt die vorhandene window.ClubsSystem-API. Mobil-first.
 */
(function () {
  'use strict';

  var MOUNT_ID = 'profileClubMount';
  var STYLE_ID = 'profileClubStyles';
  var busy = false;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function clubs() { return window.ClubsSystem || null; }

  function isLocalMode() {
    try {
      return window.SchussduellLocalMode === true || window.SchussduellLocalPlay === true ||
        localStorage.getItem('sd_local_mode') === '1' || localStorage.getItem('sd_local_play') === '1';
    } catch (e) { return false; }
  }

  function hasSession() {
    var s = window.SupabaseSession || null;
    return !!(s && s.access_token && !isLocalMode());
  }

  function toast(msg, kind) {
    if (typeof window.showEngagementToast === 'function') window.showEngagementToast(msg, 3200);
  }

  function injectStyles() {
    if ($(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.pc-card{background:var(--bg-card,rgba(18,18,18,.92));border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,.35)}',
      '.pc-card.has{background:linear-gradient(160deg,rgba(34,197,94,.12),rgba(18,18,18,.92) 58%);border-color:rgba(34,197,94,.22)}',
      '.pc-eyebrow{font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.4);font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:7px}',
      '.pc-eyebrow svg{width:14px;height:14px;flex:0 0 auto;stroke:var(--accent,#22c55e);fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}',
      '.pc-top{display:flex;align-items:center;gap:13px}',
      '.pc-badge{width:48px;height:48px;border-radius:14px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.3)}',
      '.pc-info{flex:1;min-width:0}',
      '.pc-name{font-size:1.05rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.pc-meta{font-size:.76rem;color:rgba(255,255,255,.45);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:5px}',
      '.pc-meta svg{width:12px;height:12px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
      '.pc-text{font-size:.82rem;color:rgba(255,255,255,.5);line-height:1.4;margin-top:4px}',
      '.pc-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}',
      '.pc-btn{flex:1 1 auto;min-width:120px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:12px;padding:12px 14px;font-size:.86rem;font-weight:700;font-family:inherit;cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#fff;-webkit-tap-highlight-color:transparent;transition:transform .12s,background .15s}',
      '.pc-btn:active{transform:scale(.97)}',
      '.pc-btn svg{width:16px;height:16px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}',
      '.pc-btn.primary{background:var(--accent,#22c55e);color:#000;border-color:transparent;box-shadow:0 3px 14px rgba(34,197,94,.28)}',
      '.pc-btn.primary svg{stroke:#000}',
      '.pc-chip{flex:0 0 auto;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:5px 10px;border-radius:100px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.62);border:1px solid rgba(255,255,255,.12)}',
      '.pc-chip.owner{background:rgba(255,200,64,.14);color:#f0c840;border-color:rgba(255,200,64,.32)}',
      '.pc-code{margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px 12px}',
      '.pc-code-lbl{font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.4);font-weight:700}',
      '.pc-code-val{font-family:"DM Mono",monospace;font-size:1rem;font-weight:600;color:var(--accent,#22c55e);letter-spacing:.12em}',
      '.pc-copy{border:0;background:rgba(34,197,94,.14);color:#4ade80;border-radius:9px;padding:7px 10px;font-size:.74rem;font-weight:700;cursor:pointer;font-family:inherit}'
    ].join('');
    document.head.appendChild(s);
  }

  function pinSvg() {
    return '<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  }

  async function render() {
    var mount = $(MOUNT_ID);
    if (!mount) return;
    injectStyles();

    // Local / guest: kein Verein ohne Konto.
    if (!hasSession()) {
      mount.innerHTML =
        '<section class="pc-card">' +
          '<div class="pc-eyebrow">' + groupIcon() + 'Verein</div>' +
          '<div class="pc-text">Melde dich an, um einem Schützenverein beizutreten oder einen eigenen zu gründen.</div>' +
        '</section>';
      return;
    }

    // Optimistic skeleton while we ask ClubsSystem
    if (!mount.dataset.rendered) {
      mount.innerHTML =
        '<section class="pc-card"><div class="pc-eyebrow">' + groupIcon() + 'Verein</div>' +
        '<div class="pc-text">Vereinsstatus wird geladen…</div></section>';
    }

    var cs = clubs();
    if (!cs || typeof cs.getMyClub !== 'function') {
      mount.innerHTML = unavailableHtml();
      return;
    }

    var club = null;
    try { club = await cs.getMyClub(); } catch (e) { club = null; }
    mount.dataset.rendered = '1';

    if (!club) {
      mount.innerHTML =
        '<section class="pc-card">' +
          '<div class="pc-eyebrow">' + groupIcon() + 'Verein</div>' +
          '<div class="pc-top">' +
            '<div class="pc-badge">🏹</div>' +
            '<div class="pc-info"><div class="pc-name">Noch kein Verein</div>' +
            '<div class="pc-meta">Tritt deinem Schützenverein bei oder gründe einen.</div></div>' +
          '</div>' +
          '<div class="pc-actions">' +
            '<button class="pc-btn primary" type="button" data-pc="create"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Verein erstellen</button>' +
            '<button class="pc-btn" type="button" data-pc="join">Code eingeben</button>' +
          '</div>' +
        '</section>';
    } else {
      var role = (club.role === 'owner' || club.role === 'admin');
      var roleLabel = club.role === 'owner' ? 'Gründer' : (club.role === 'admin' ? 'Admin' : 'Mitglied');
      mount.innerHTML =
        '<section class="pc-card has">' +
          '<div class="pc-eyebrow">' + groupIcon() + 'Dein Verein</div>' +
          '<div class="pc-top">' +
            '<div class="pc-badge">🏹</div>' +
            '<div class="pc-info">' +
              '<div class="pc-name">' + escapeHtml(club.name) + '</div>' +
              (club.location ? '<div class="pc-meta">' + pinSvg() + '<span>' + escapeHtml(club.location) + '</span></div>' : '<div class="pc-meta">Schützenverein</div>') +
            '</div>' +
            '<span class="pc-chip ' + (role ? 'owner' : '') + '">' + escapeHtml(roleLabel) + '</span>' +
          '</div>' +
          (club.code ?
            '<div class="pc-code"><div><div class="pc-code-lbl">Vereinscode</div><div class="pc-code-val">' + escapeHtml(club.code) + '</div></div>' +
            '<button class="pc-copy" type="button" data-pc="copy" data-code="' + escapeHtml(club.code) + '">Kopieren</button></div>' : '') +
          '<div class="pc-actions">' +
            '<button class="pc-btn primary" type="button" data-pc="open">Verein öffnen</button>' +
          '</div>' +
        '</section>';
    }

    bind();
  }

  function groupIcon() {
    return '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  }

  function unavailableHtml() {
    return '<section class="pc-card"><div class="pc-eyebrow">' + groupIcon() + 'Verein</div>' +
      '<div class="pc-text">Vereinsfunktionen sind gerade nicht verfügbar.</div></section>';
  }

  function bind() {
    var mount = $(MOUNT_ID);
    if (!mount) return;
    mount.querySelectorAll('[data-pc]').forEach(function (el) {
      el.addEventListener('click', function () { onAction(el.getAttribute('data-pc'), el); });
    });
  }

  function onAction(action, el) {
    var cs = clubs();
    if (action === 'create') {
      if (cs && typeof cs.showClubOverlay === 'function') cs.showClubOverlay('create');
      return;
    }
    if (action === 'join') {
      if (cs && typeof cs.showClubOverlay === 'function') cs.showClubOverlay('join');
      return;
    }
    if (action === 'open') {
      if (cs && typeof cs.showClubOverlay === 'function') cs.showClubOverlay('overview');
      return;
    }
    if (action === 'copy') {
      var code = el.getAttribute('data-code') || '';
      copyCode(code, el);
      return;
    }
  }

  function copyCode(code, el) {
    if (!code) return;
    var done = function () { if (el) { var t = el.textContent; el.textContent = 'Kopiert ✓'; setTimeout(function () { el.textContent = t; }, 1400); } toast('Vereinscode kopiert.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(function () { fallbackCopy(code); done(); });
    } else { fallbackCopy(code); done(); }
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    } catch (e) {}
  }

  function scheduleRender() {
    if (busy) return;
    busy = true;
    setTimeout(function () { busy = false; render(); }, 30);
  }

  // Re-render when auth or club state changes, or the Profil tab is shown.
  window.addEventListener('clubsChanged', scheduleRender);
  window.addEventListener('supabaseAuthReady', function () { var m = $(MOUNT_ID); if (m) delete m.dataset.rendered; scheduleRender(); });
  window.addEventListener('supabaseSessionChanged', function () { var m = $(MOUNT_ID); if (m) delete m.dataset.rendered; scheduleRender(); });

  // public hook so tab-navigation can refresh on Profil open
  window.ProfileClub = { render: render };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleRender, { once: true });
  } else {
    scheduleRender();
  }
})();
