/**
 * Duel Setup Scroll Lock / Touch Scroll Fix
 *
 * Final mobile guard for iOS/Android: freezes the background page while forcing
 * #duelSetupSheet to be the only scrollable touch target.
 */
(function () {
  'use strict';

  const VERSION = '4.9';
  if (window.DuelSetupScrollLock?.version === VERSION) return;

  const state = {
    initialized: true,
    version: VERSION,
    locked: false,
    scrollY: 0,
    lastTouchY: 0,
    patched: false,
    attempts: 0,
    sheetGuardsAttached: false,
    overlayGuardsAttached: false
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

  function viewportHeight() {
    return Math.max(420, Math.floor(window.visualViewport?.height || window.innerHeight || 720));
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

  function forceSheetScrollable() {
    const sheet = getSheet();
    if (!sheet) return;

    const targetHeight = Math.floor(viewportHeight() * 0.92);

    sheet.style.setProperty('height', `${targetHeight}px`, 'important');
    sheet.style.setProperty('max-height', 'none', 'important');
    sheet.style.setProperty('overflow-y', 'scroll', 'important');
    sheet.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
    sheet.style.setProperty('overscroll-behavior', 'contain', 'important');
    sheet.style.setProperty('touch-action', 'pan-y', 'important');

    const settings = byId('duelSettingsContent');
    if (settings) {
      settings.style.setProperty('min-height', '0', 'important');
      settings.style.setProperty('touch-action', 'pan-y', 'important');
    }

    const runtime = sheet.querySelector('.duel-runtime');
    if (runtime) {
      runtime.style.setProperty('min-height', `${targetHeight + 1}px`, 'important');
      runtime.style.setProperty('touch-action', 'pan-y', 'important');
    }
  }

  function freezeBackground() {
    const body = document.body;
    const html = document.documentElement;

    if (!state.locked) {
      state.scrollY = window.scrollY || html.scrollTop || body.scrollTop || 0;
    }

    html.style.setProperty('overflow', 'hidden', 'important');
    html.style.setProperty('height', '100%', 'important');
    html.style.setProperty('overscroll-behavior', 'none', 'important');
    html.style.removeProperty('touch-action');

    body.style.setProperty('position', 'fixed', 'important');
    body.style.setProperty('top', `-${state.scrollY}px`, 'important');
    body.style.setProperty('left', '0', 'important');
    body.style.setProperty('right', '0', 'important');
    body.style.setProperty('width', '100%', 'important');
    body.style.setProperty('height', '100%', 'important');
    body.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('overscroll-behavior', 'none', 'important');
    body.style.removeProperty('touch-action');
    body.classList.add('duel-scroll-lock-active');

    state.locked = true;
    forceSheetScrollable();
  }

  function unlock() {
    if (!state.locked) return;

    const body = document.body;
    const html = document.documentElement;

    body.classList.remove('duel-scroll-lock-active');
    body.style.removeProperty('position');
    body.style.removeProperty('top');
    body.style.removeProperty('left');
    body.style.removeProperty('right');
    body.style.removeProperty('width');
    body.style.removeProperty('height');
    body.style.removeProperty('overflow');
    body.style.removeProperty('overscroll-behavior');
    body.style.removeProperty('touch-action');

    html.style.removeProperty('overflow');
    html.style.removeProperty('height');
    html.style.removeProperty('overscroll-behavior');
    html.style.removeProperty('touch-action');

    window.scrollTo(0, state.scrollY || 0);
    state.locked = false;
  }

  function rememberTouch(event) {
    state.lastTouchY = event.touches && event.touches.length ? event.touches[0].clientY : 0;
  }

  function guardOverlayTouchMove(event) {
    if (!state.locked || !isSheetOpen()) return;

    const sheet = getSheet();
    if (!sheet) return;

    if (!sheet.contains(event.target)) {
      event.preventDefault();
      return;
    }

    const currentY = event.touches && event.touches.length ? event.touches[0].clientY : state.lastTouchY;
    const deltaY = currentY - state.lastTouchY;
    state.lastTouchY = currentY;

    const canScroll = sheet.scrollHeight > sheet.clientHeight + 2;
    const atTop = sheet.scrollTop <= 0;
    const atBottom = Math.ceil(sheet.scrollTop + sheet.clientHeight) >= sheet.scrollHeight;

    // Allow normal scrolling inside the sheet. Only stop scroll chaining at edges.
    if (!canScroll || (atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
      event.preventDefault();
    }
  }

  function stopMobileDragHandlers(event) {
    // Prevent mobile-responsive.js drag-to-close from treating the whole sheet as a handle.
    event.stopPropagation();
  }

  function attachGuards() {
    const overlay = getOverlay();
    const sheet = getSheet();

    if (overlay && !state.overlayGuardsAttached) {
      overlay.addEventListener('touchstart', rememberTouch, { passive: true });
      overlay.addEventListener('touchmove', guardOverlayTouchMove, { passive: false });
      state.overlayGuardsAttached = true;
    }

    if (sheet && !state.sheetGuardsAttached) {
      sheet.addEventListener('touchstart', stopMobileDragHandlers, { capture: true, passive: true });
      sheet.addEventListener('touchmove', stopMobileDragHandlers, { capture: true, passive: true });
      state.sheetGuardsAttached = true;
    }
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

  function patchRuntime() {
    const api = window.DuelSetupRuntime;
    if (!api || api.__hardScrollPatchVersion === VERSION) return Boolean(api);

    const originalOpen = api.openSheet;
    const originalClose = api.closeSheet;
    const originalStart = api.startDuel;

    api.openSheet = function patchedOpenSheet(...args) {
      const result = typeof originalOpen === 'function' ? originalOpen.apply(this, args) : undefined;
      attachGuards();
      requestAnimationFrame(() => {
        forceSheetScrollable();
        freezeBackground();
      });
      setTimeout(() => {
        forceSheetScrollable();
        freezeBackground();
      }, 80);
      return result;
    };

    api.closeSheet = function patchedCloseSheet(event, ...args) {
      const overlay = getOverlay();
      const shouldClose = !event || event.target === overlay;
      const result = typeof originalClose === 'function' ? originalClose.call(this, event, ...args) : undefined;
      if (shouldClose) setTimeout(unlock, 280);
      return result;
    };

    api.startDuel = function patchedStartDuel(...args) {
      const result = typeof originalStart === 'function' ? originalStart.apply(this, args) : undefined;
      if (result !== false) {
        closeOverlayImmediately();
      }
      return result;
    };

    api.__hardScrollPatchVersion = VERSION;
    window.openDuelSetup = api.openSheet;
    window.closeDuelSetup = api.closeSheet;
    window.duelRuntimeFixStart = api.startDuel;

    attachGuards();
    state.patched = true;
    return true;
  }

  function waitForRuntime() {
    if (patchRuntime()) return;
    state.attempts += 1;
    if (state.attempts > 120) {
      console.warn('⚠️ DuelSetupScrollLock: Runtime nicht gefunden');
      return;
    }
    setTimeout(waitForRuntime, 50);
  }

  window.addEventListener('resize', () => {
    if (isSheetOpen()) forceSheetScrollable();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (isSheetOpen()) forceSheetScrollable();
    });
  }

  window.addEventListener('pagehide', unlock);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) unlock();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForRuntime);
  } else {
    waitForRuntime();
  }

  window.DuelSetupScrollLock = {
    initialized: true,
    version: VERSION,
    lock: freezeBackground,
    unlock,
    forceSheetScrollable,
    patchRuntime,
    getState: () => ({ ...state })
  };
})();
