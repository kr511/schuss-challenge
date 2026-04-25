/** Gemini AI compatibility shim + local play helper + profile scroll fix. */
(function () {
  'use strict';

  if (!window.GeminiAI) {
    var disabledMessage = 'Gemini AI ist in dieser App-Konfiguration deaktiviert.';
    window.GeminiAI = {
      enabled: false,
      available: false,
      reason: disabledMessage,
      init: async function () { return false; },
      analyze: async function () { return { ok: false, reason: disabledMessage }; },
      scoreTarget: async function () { return { ok: false, reason: disabledMessage }; },
      getStatus: function () { return { enabled: false, available: false, reason: disabledMessage }; }
    };
  }

  function startLocalPlay() {
    localStorage.setItem('sd_local_play', '1');
    if (!localStorage.getItem('username')) localStorage.setItem('username', 'Gast');
    if (!localStorage.getItem('sd_username')) localStorage.setItem('sd_username', 'Gast');
    window.SchussduellLocalPlay = true;
    var gate = document.getElementById('authGate');
    if (gate && gate.parentNode) gate.parentNode.removeChild(gate);
  }

  function addLocalPlayButton() {
    var form = document.getElementById('agForm');
    if (!form || document.getElementById('agLocalPlay')) return false;
    var btn = document.createElement('button');
    btn.id = 'agLocalPlay';
    btn.type = 'button';
    btn.textContent = '👤 Lokal spielen';
    btn.style.cssText = 'width:100%;padding:12px;margin-top:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#f3f4f6;font-size:14px;font-weight:800;cursor:pointer;';
    btn.onclick = startLocalPlay;
    form.appendChild(btn);
    return true;
  }

  function installProfileScrollFix() {
    if (document.getElementById('profileScrollFixStyle')) return;

    var style = document.createElement('style');
    style.id = 'profileScrollFixStyle';
    style.textContent = [
      '#profileMenu,#profileOverlay,#profileModal,#profileViewOverlay,#schuetzenpassOverlay,.profile-menu,.profile-overlay,.profile-modal,.schuetzenpass-overlay{',
      'max-height:100dvh!important;',
      'overflow-y:auto!important;',
      'overflow-x:hidden!important;',
      '-webkit-overflow-scrolling:touch!important;',
      'touch-action:pan-y!important;',
      'overscroll-behavior:contain!important;',
      '}',
      '#profileMenu *,#profileOverlay *,#profileModal *,#profileViewOverlay *,.profile-menu *,.profile-overlay *,.profile-modal *,.schuetzenpass-overlay *{',
      'touch-action:pan-y!important;',
      '}',
      '.profile-card,.profile-view,.profile-content,.profile-panel,.schuetzenpass-card{',
      'max-height:calc(100dvh - 24px)!important;',
      'overflow-y:auto!important;',
      '-webkit-overflow-scrolling:touch!important;',
      'touch-action:pan-y!important;',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function unlockProfileScrolling() {
    var selectors = [
      '#profileMenu', '#profileOverlay', '#profileModal', '#profileViewOverlay', '#schuetzenpassOverlay',
      '.profile-menu', '.profile-overlay', '.profile-modal', '.profile-card', '.profile-view', '.profile-content', '.profile-panel', '.schuetzenpass-card', '.schuetzenpass-overlay'
    ];

    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        node.style.maxHeight = node.style.maxHeight || '100dvh';
        node.style.overflowY = 'auto';
        node.style.overflowX = 'hidden';
        node.style.webkitOverflowScrolling = 'touch';
        node.style.touchAction = 'pan-y';
        node.style.overscrollBehavior = 'contain';
      });
    });

    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.touchAction = 'pan-y';
  }

  function wrapProfileOpeners() {
    ['toggleProfileMenu', 'showProfileMenu', 'openProfileMenu', 'openProfile', 'showSchuetzenpass'].forEach(function (name) {
      var original = window[name];
      if (typeof original !== 'function' || original.__scrollFixWrapped) return;

      var wrapped = function () {
        var result = original.apply(this, arguments);
        setTimeout(unlockProfileScrolling, 0);
        setTimeout(unlockProfileScrolling, 250);
        return result;
      };
      wrapped.__scrollFixWrapped = true;
      window[name] = wrapped;
    });
  }

  function bootProfileScrollFix() {
    installProfileScrollFix();
    unlockProfileScrolling();
    wrapProfileOpeners();

    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      if (target.closest('#pdProfileBtn,#profileIcon,.profile-btn,.schuetzenpass-icon')) {
        setTimeout(unlockProfileScrolling, 0);
        setTimeout(unlockProfileScrolling, 250);
      }
    }, true);

    var observer = new MutationObserver(function () {
      wrapProfileOpeners();
      unlockProfileScrolling();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  }

  function boot() {
    window.startSchussduellLocalPlay = startLocalPlay;
    if (localStorage.getItem('sd_local_play') === '1') startLocalPlay();
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (addLocalPlayButton() || tries > 100) clearInterval(timer);
    }, 100);
    bootProfileScrollFix();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
