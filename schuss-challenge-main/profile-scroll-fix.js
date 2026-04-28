/* Profile scroll hardening for mobile overlays. */
(function () {
  'use strict';

  function installStyle() {
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

  function unlock() {
    [
      '#profileMenu', '#profileOverlay', '#profileModal', '#profileViewOverlay', '#schuetzenpassOverlay',
      '.profile-menu', '.profile-overlay', '.profile-modal', '.profile-card', '.profile-view', '.profile-content', '.profile-panel', '.schuetzenpass-card', '.schuetzenpass-overlay'
    ].forEach(function (selector) {
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

  function wrapOpeners() {
    ['toggleProfileMenu', 'showProfileMenu', 'openProfileMenu', 'openProfile', 'showSchuetzenpass'].forEach(function (name) {
      var original = window[name];
      if (typeof original !== 'function' || original.__profileScrollWrapped) return;

      var wrapped = function () {
        var result = original.apply(this, arguments);
        setTimeout(unlock, 0);
        setTimeout(unlock, 250);
        return result;
      };
      wrapped.__profileScrollWrapped = true;
      window[name] = wrapped;
    });
  }

  function boot() {
    installStyle();
    unlock();
    wrapOpeners();

    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      if (target.closest('#pdProfileBtn,#profileIcon,.profile-btn,.schuetzenpass-icon')) {
        setTimeout(unlock, 0);
        setTimeout(unlock, 250);
      }
    }, true);

    var observer = new MutationObserver(function () {
      wrapOpeners();
      unlock();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
