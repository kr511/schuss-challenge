/**
 * Duel Setup Scroll Lock
 *
 * Mobile Safari ignores body overflow:hidden in several fixed-overlay cases.
 * This helper locks the background page and lets only #duelSetupSheet scroll.
 */
(function () {
  'use strict';

  if (window.DuelSetupScrollLock?.initialized) return;

  const state = {
    initialized: true,
    locked: false,
    scrollY: 0,
    lastTouchY: 0,
    bodyStyles: {},
    htmlStyles: {},
    patched: false,
    attempts: 0
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function getSheet() {
    return byId('duelSetupSheet');
  }

  function getOverlay() {
    return byId('duelSetupSheetOverlay');
  }

  function isSheetOpen() {
    const overlay = getOverlay();
    const sheet = getSheet();
    return Boolean(
      overlay &&
      sheet &&
      overlay.style.display !== 'none' &&
      (sheet.classList.contains('is-open') || sheet.style.bottom === '0px' || sheet.style.bottom === '0')
    );
  }

  function saveInlineStyles() {
    const body = document.body;
    const html = document.documentElement;

    state.bodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior
    };

    state.htmlStyles = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior
    };
  }

  function restoreInlineStyles() {
    const body = document.body;
    const html = document.documentElement;

    Object.entries(state.bodyStyles).forEach(([key, value]) => {
      body.style[key] = value || '';
    });

    Object.entries(state.htmlStyles).forEach(([key, value]) => {
      html.style[key] = value || '';
    });
  }

  function prepareScrollableSheet() {
    const sheet = getSheet();
    if (!sheet) return;

    sheet.style.overflowY = 'auto';
    sheet.style.webkitOverflowScrolling = 'touch';
    sheet.style.overscrollBehavior = 'contain';
    sheet.style.touchAction = 'pan-y';
  }

  function lock() {
    if (state.locked) {
      prepareScrollableSheet();
      return;
    }

    const body = document.body;
    const html = document.documentElement;
    state.scrollY = window.scrollY || html.scrollTop || body.scrollTop || 0;
    saveInlineStyles();

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    body.style.position = 'fixed';
    body.style.top = `-${state.scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.classList.add('duel-scroll-lock-active');

    prepareScrollableSheet();
    state.locked = true;
  }

  function unlock() {
    if (!state.locked) return;

    document.body.classList.remove('duel-scroll-lock-active');
    restoreInlineStyles();
    window.scrollTo(0, state.scrollY || 0);
    state.locked = false;
  }

  function closeOverlayImmediately() {
    const overlay = getOverlay();
    const sheet = getSheet();

    if (sheet) {
      sheet.classList.remove('is-open');
      sheet.style.bottom = '-100%';
    }

    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.display = 'none';
    }

    unlock();
  }

  function touchStart(event) {
    state.lastTouchY = event.touches && event.touches.length ? event.touches[0].clientY : 0;
  }

  function touchMove(event) {
    if (!state.locked || !isSheetOpen()) return;

    const sheet = getSheet();
    if (!sheet) return;

    // Touches outside the sheet must never scroll the main menu behind it.
    if (!sheet.contains(event.target)) {
      event.preventDefault();
      return;
    }

    const currentY = event.touches && event.touches.length ? event.touches[0].clientY : state.lastTouchY;
    const deltaY = currentY - state.lastTouchY;
    state.lastTouchY = currentY;

    const atTop = sheet.scrollTop <= 0;
    const atBottom = Math.ceil(sheet.scrollTop + sheet.clientHeight) >= sheet.scrollHeight;

    // Prevent iOS rubber-band chaining into the background page.
    if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
      event.preventDefault();
    }
  }

  function attachTouchGuards() {
    const overlay = getOverlay();
    if (!overlay || overlay.dataset.duelScrollLockAttached === '1') return;

    overlay.dataset.duelScrollLockAttached = '1';
    overlay.addEventListener('touchstart', touchStart, { passive: true });
    overlay.addEventListener('touchmove', touchMove, { passive: false });
  }

  function patchRuntime() {
    const api = window.DuelSetupRuntime;
    if (!api || api.__scrollLockPatched) return false;

    const originalOpen = api.openSheet;
    const originalClose = api.closeSheet;
    const originalStart = api.startDuel;

    api.openSheet = function patchedOpenSheet(...args) {
      const result = typeof originalOpen === 'function' ? originalOpen.apply(this, args) : undefined;
      attachTouchGuards();
      lock();
      return result;
    };

    api.closeSheet = function patchedCloseSheet(event, ...args) {
      const overlay = getOverlay();
      const shouldClose = !event || event.target === overlay;
      const result = typeof originalClose === 'function' ? originalClose.call(this, event, ...args) : undefined;

      if (shouldClose) {
        setTimeout(unlock, 260);
      }

      return result;
    };

    api.startDuel = function patchedStartDuel(...args) {
      const result = typeof originalStart === 'function' ? originalStart.apply(this, args) : undefined;
      closeOverlayImmediately();
      return result;
    };

    api.__scrollLockPatched = true;

    // Re-export legacy globals so inline onclick handlers use the patched functions.
    window.openDuelSetup = api.openSheet;
    window.closeDuelSetup = api.closeSheet;
    window.duelRuntimeFixStart = api.startDuel;

    attachTouchGuards();
    state.patched = true;
    return true;
  }

  function waitForRuntime() {
    if (patchRuntime()) return;

    state.attempts += 1;
    if (state.attempts > 80) {
      console.warn('⚠️ DuelSetupScrollLock: Runtime nicht gefunden');
      return;
    }

    setTimeout(waitForRuntime, 50);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) unlock();
  });

  window.addEventListener('pagehide', unlock);
  window.addEventListener('resize', () => {
    if (state.locked) prepareScrollableSheet();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForRuntime);
  } else {
    waitForRuntime();
  }

  window.DuelSetupScrollLock = {
    initialized: true,
    lock,
    unlock,
    patchRuntime,
    getState: () => ({ ...state })
  };
})();
