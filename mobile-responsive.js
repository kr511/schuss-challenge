/**
 * Enhanced Mobile Responsive Features
 * Touch optimization, swipe gestures, and mobile UI hardening.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.MobileResponsive && window.MobileResponsive.__initialized) return;

  function debounce(fn, delay) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function isTextInputActive() {
    const tag = document.activeElement?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA';
  }

  const MobileResponsive = {
    config: {
      swipeThreshold: 90,
      swipeMaxVerticalDrift: 60,
      swipeMaxDurationMs: 500,
      swipeEdgeZone: 32,
      touchTargetMinSize: 44,
      bottomSheetMaxHeight: 0.85,
      keyboardOffsetBottom: 20
    },

    __initialized: false,

    state: {
      swipeStartX: 0,
      swipeStartY: 0,
      swipeStartTime: 0,
      swipeViewportWidth: 0,
      swipeEligible: false,
      isSwiping: false,
      bottomSheetOpen: false,
      keyboardVisible: false,
      listeners: {
        swipe: false,
        keyboard: false
      },
      enhancedElements: new WeakSet(),
      dragSheets: new WeakSet(),
      feedbackElements: new WeakSet(),
      resizeHandlers: new WeakMap()
    },

    init() {
      if (this.__initialized) return;
      this.__initialized = true;
      console.log('[MobileResponsive] initialisiert');

      this.enhanceTouchTargets();
      this.setupSwipeGestures();
      this.optimizeBottomSheets();
      this.handleKeyboardBehavior();
      this.setupResponsiveGrids();
      this.addMobileFeedback();
    },

    enhanceTouchTargets() {
      const buttons = document.querySelectorAll('button, .btn-fire, .btn-primary, .btn-secondary');
      buttons.forEach((btn) => {
        const rect = btn.getBoundingClientRect();
        if (rect.height < this.config.touchTargetMinSize) {
          btn.style.minHeight = `${this.config.touchTargetMinSize}px`;
        }
        if (rect.width < this.config.touchTargetMinSize) {
          btn.style.minWidth = `${this.config.touchTargetMinSize}px`;
        }
        const currentPadding = window.getComputedStyle(btn).padding;
        if (parseInt(currentPadding, 10) < 12) {
          btn.style.padding = '12px 16px';
        }
      });

      const clickableElements = document.querySelectorAll(
        '.ps-tab, .sun-card, .disc-option, .diff-option, [onclick], .cursor-pointer'
      );
      clickableElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.height < this.config.touchTargetMinSize) {
          el.style.minHeight = `${this.config.touchTargetMinSize}px`;
        }
      });
    },

    isSwipeBlockedByTarget(target) {
      if (!target || typeof target.closest !== 'function') return false;
      // Don't treat touches that start on interactive / scrollable surfaces
      // (side panels, lists, sheets, buttons, links, inputs) as navigation swipes.
      // Without this guard a small finger drift while tapping a panel was being
      // interpreted as a left-swipe and would accidentally open the profile.
      return !!target.closest(
        'button, a, input, textarea, select, label, [role="button"], [onclick],' +
        ' .tab-panel, .it-panel, .ps-panel, .ps-tab, .it-tabs, .tab-nav,' +
        ' .profile-sheet, .bottom-sheet, .modal, .overlay, .tff-overlay,' +
        ' .leaderboard, .friends-list, .updates-dropdown, #updatesDropdown,' +
        ' .sun-card, .disc-option, .diff-option, .bot-panel, .debug-panel,' +
        ' [data-no-swipe], [contenteditable="true"]'
      );
    },

    isAnyOverlayOpen() {
      // Skip swipe navigation while a sheet/modal/overlay is visible — taps
      // inside open sheets shouldn't translate into nav gestures.
      return !!document.querySelector(
        '.profile-sheet.active, .bottom-sheet.active,' +
        ' .modal.active, .overlay.active, .tff-overlay.active,' +
        ' #profileOverlay.active, #duelSetupSheetOverlay[style*="display: block"],' +
        ' #duelSetupSheetOverlay[style*="display:block"]'
      );
    },

    setupSwipeGestures() {
      if (this.state.listeners.swipe) return;
      const body = document.body;
      if (!body) return;

      body.addEventListener('touchstart', (event) => {
        if (!event.touches || event.touches.length !== 1) {
          this.state.swipeEligible = false;
          this.state.isSwiping = false;
          return;
        }
        const t = event.touches[0];
        this.state.swipeStartX = t.clientX;
        this.state.swipeStartY = t.clientY;
        this.state.swipeStartTime = Date.now();
        this.state.swipeViewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        this.state.isSwiping = true;
        this.state.swipeEligible =
          !this.isSwipeBlockedByTarget(event.target) && !this.isAnyOverlayOpen();
      }, { passive: true });

      body.addEventListener('touchmove', (event) => {
        if (!this.state.isSwiping || !this.state.swipeEligible) return;
        if (!event.touches || !event.touches.length) return;
        const t = event.touches[0];
        // Cancel swipe if vertical drift is large (user is scrolling, not swiping).
        if (Math.abs(t.clientY - this.state.swipeStartY) > this.config.swipeMaxVerticalDrift) {
          this.state.swipeEligible = false;
        }
      }, { passive: true });

      body.addEventListener('touchend', (event) => {
        const wasEligible = this.state.swipeEligible;
        this.state.isSwiping = false;
        this.state.swipeEligible = false;

        if (!wasEligible || !event.changedTouches || !event.changedTouches.length) return;
        if (Date.now() - this.state.swipeStartTime > this.config.swipeMaxDurationMs) return;

        const endX = event.changedTouches[0].clientX;
        const endY = event.changedTouches[0].clientY;
        const deltaX = endX - this.state.swipeStartX;
        const deltaY = endY - this.state.swipeStartY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX <= this.config.swipeThreshold) return;
        if (absY > this.config.swipeMaxVerticalDrift) return;
        if (absX < absY * 2) return;

        const vw = this.state.swipeViewportWidth || window.innerWidth || 0;
        const edge = this.config.swipeEdgeZone;

        if (deltaX < 0) {
          // Left-swipe opens the profile — require it to start near the right edge
          // so taps in the middle of side panels cannot trigger it.
          if (vw && this.state.swipeStartX < vw - edge) return;
          this.handleSwipeLeft();
        } else {
          // Right-swipe opens duel setup — require it to start near the left edge.
          if (this.state.swipeStartX > edge) return;
          this.handleSwipeRight();
        }
      }, { passive: true });

      body.addEventListener('touchcancel', () => {
        this.state.isSwiping = false;
        this.state.swipeEligible = false;
      }, { passive: true });

      this.state.listeners.swipe = true;
    },

    handleSwipeLeft() {
      if (isTextInputActive()) return;
      if (this.isAnyOverlayOpen()) return;

      const profileTrigger = document.getElementById('pdProfileBtn') || document.getElementById('profileIcon');
      if (!profileTrigger) return;

      const style = window.getComputedStyle(profileTrigger);
      if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none') return;

      profileTrigger.click();
      this.triggerHaptic('light');
    },

    handleSwipeRight() {
      if (isTextInputActive()) return;
      if (this.isAnyOverlayOpen()) return;

      const duelSetupBtn = document.getElementById('btnOpenDuelSetup') ||
        document.querySelector('[onclick*="openDuelSetup"]') ||
        document.querySelector('.btn-fire') ||
        document.querySelector('[onclick*="startBattle"]');

      if (duelSetupBtn) {
        duelSetupBtn.click();
        this.triggerHaptic('light');
      } else if (typeof window.openDuelSetup === 'function') {
        window.openDuelSetup();
        this.triggerHaptic('light');
      }
    },

    optimizeBottomSheets() {
      const profileSheet = document.getElementById('profileSheet');
      const duelSetupSheet = document.getElementById('duelSetupSheet');

      [profileSheet, duelSetupSheet].forEach((sheet) => {
        if (!sheet) return;

        const viewportHeight = window.visualViewport?.height || window.innerHeight || 720;
        sheet.style.maxHeight = `${viewportHeight * this.config.bottomSheetMaxHeight}px`;

        if (sheet.id !== 'duelSetupSheet') {
          this.addDragToClose(sheet);
        }

        this.addPullDownIndicator(sheet);
      });
    },

    addDragToClose(sheet) {
      if (this.state.dragSheets.has(sheet)) return;
      this.state.dragSheets.add(sheet);

      let startY = 0;
      let isDragging = false;

      const getHandle = () => sheet.querySelector('.profile-sheet-handle, .sheet-handle, .pull-down-indicator') ||
        sheet.firstElementChild;

      const closeSheet = () => {
        const overlay = sheet.closest('[id$="Overlay"]') || document.getElementById('duelSetupSheetOverlay');
        sheet.classList.remove('active');
        sheet.style.transform = '';
        sheet.style.bottom = '';
        if (overlay) {
          overlay.style.opacity = '0';
          overlay.style.display = 'none';
        }
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.documentElement.style.overflow = '';
      };

      sheet.addEventListener('touchstart', (event) => {
        if (!event.touches || !event.touches.length) return;
        const handle = getHandle();
        const validHandle = handle && (event.target === handle || handle.contains(event.target));
        if (!validHandle) return;

        startY = event.touches[0].clientY;
        isDragging = true;
        sheet.style.transition = 'none';
      }, { passive: true });

      sheet.addEventListener('touchmove', (event) => {
        if (!isDragging || !event.touches || !event.touches.length) return;
        const deltaY = event.touches[0].clientY - startY;
        if (deltaY > 0) sheet.style.transform = `translateY(${deltaY}px)`;
      }, { passive: true });

      sheet.addEventListener('touchend', () => {
        if (!isDragging) return;

        const match = sheet.style.transform.match(/translateY\((\d+)px\)/);
        const draggedDistance = match ? parseInt(match[1], 10) : 0;
        sheet.style.transition = 'transform 0.3s ease';

        if (draggedDistance > 100) {
          sheet.style.transform = 'translateY(100%)';
          setTimeout(closeSheet, 300);
        } else {
          sheet.style.transform = '';
        }

        isDragging = false;
      }, { passive: true });

      sheet.addEventListener('touchcancel', () => {
        if (!isDragging) return;
        sheet.style.transform = '';
        sheet.style.transition = 'transform 0.3s ease';
        isDragging = false;
      }, { passive: true });
    },

    addPullDownIndicator(sheet) {
      if (!sheet.parentElement || sheet.querySelector('.pull-down-indicator')) return;

      const indicator = document.createElement('div');
      indicator.className = 'pull-down-indicator';
      indicator.textContent = 'v';
      indicator.style.cssText = [
        'position:absolute',
        'top:-30px',
        'left:50%',
        'transform:translateX(-50%)',
        'font-size:1.5rem',
        'opacity:0.3',
        'pointer-events:none'
      ].join(';');

      sheet.parentElement.insertBefore(indicator, sheet);
    },

    handleKeyboardBehavior() {
      if (this.state.listeners.keyboard) return;
      this.state.listeners.keyboard = true;

      if ('visualViewport' in window) {
        window.visualViewport.addEventListener('resize', debounce(() => {
          const viewportHeight = window.visualViewport.height;
          const windowHeight = window.innerHeight;
          const keyboardHeight = windowHeight - viewportHeight;

          if (keyboardHeight > 150) {
            this.state.keyboardVisible = true;
            this.onKeyboardShow(keyboardHeight);
          } else {
            this.state.keyboardVisible = false;
            this.onKeyboardHide();
          }
        }, 80));
      }

      document.querySelectorAll('input, textarea').forEach((input) => {
        if (this.state.enhancedElements.has(input)) return;
        this.state.enhancedElements.add(input);
        input.addEventListener('focus', () => {
          setTimeout(() => this.scrollIntoViewIfNeeded(input), 300);
        });
      });
    },

    onKeyboardShow(keyboardHeight) {
      const activeSheet = document.querySelector('.profile-sheet.active, .bottom-sheet.active');
      if (activeSheet) {
        activeSheet.style.marginBottom = `${keyboardHeight}px`;
        activeSheet.style.maxHeight = `calc(85dvh - ${keyboardHeight}px)`;
      }

      document.body.classList.add('keyboard-visible');
    },

    onKeyboardHide() {
      const activeSheet = document.querySelector('.profile-sheet.active, .bottom-sheet.active');
      if (activeSheet) {
        activeSheet.style.marginBottom = '';
        activeSheet.style.maxHeight = '';
      }

      document.body.classList.remove('keyboard-visible');
    },

    scrollIntoViewIfNeeded(element) {
      if (!element || typeof element.getBoundingClientRect !== 'function') return;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      if (rect.bottom > windowHeight) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },

    setupResponsiveGrids() {
      const statsGrids = document.querySelectorAll('.ps-stats-grid, .sun-grid');
      statsGrids.forEach((grid) => {
        const updateColumns = () => {
          const width = grid.parentElement?.clientWidth || grid.clientWidth || window.innerWidth;
          if (width < 320) {
            grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
          } else if (width < 480) {
            grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
          } else {
            grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
          }
        };

        updateColumns();
        if (!this.state.resizeHandlers.has(grid)) {
          const debouncedUpdate = debounce(updateColumns, 120);
          this.state.resizeHandlers.set(grid, debouncedUpdate);
          window.addEventListener('resize', debouncedUpdate);
        }
      });
    },

    addMobileFeedback() {
      const interactiveElements = document.querySelectorAll(
        'button, .btn-fire, .ps-tab, .sun-card, [onclick]'
      );

      const resetTouchFeedback = (el) => {
        el.style.opacity = el.dataset.mobileResponsivePrevOpacity || '';
        el.style.transform = el.dataset.mobileResponsivePrevTransform || '';
        delete el.dataset.mobileResponsivePrevOpacity;
        delete el.dataset.mobileResponsivePrevTransform;
        delete el.dataset.mobileResponsiveTouchActive;
      };

      interactiveElements.forEach((el) => {
        if (this.state.feedbackElements.has(el)) return;
        this.state.feedbackElements.add(el);

        el.addEventListener('touchstart', () => {
          if (el.dataset.mobileResponsiveTouchActive === '1') return;

          const previousOpacity = el.style.opacity || '';
          const previousTransform = el.style.transform || '';
          el.dataset.mobileResponsivePrevOpacity = previousOpacity;
          el.dataset.mobileResponsivePrevTransform = previousTransform;
          el.dataset.mobileResponsiveTouchActive = '1';

          el.style.opacity = '0.7';
          el.style.transform = previousTransform
            ? `${previousTransform} scale(0.98)`
            : 'scale(0.98)';
        }, { passive: true });

        el.addEventListener('touchend', () => {
          resetTouchFeedback(el);
          this.triggerHaptic('light');
        }, { passive: true });

        el.addEventListener('touchcancel', () => resetTouchFeedback(el), { passive: true });
      });
    },

    triggerHaptic(type = 'light') {
      if (!('vibrate' in navigator)) return;

      const patterns = {
        light: [10],
        medium: [20, 10, 20],
        strong: [50],
        error: [100, 50, 100]
      };

      navigator.vibrate(patterns[type] || patterns.light);
    },

    isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0);
    },

    addMobileClasses() {
      if (!document.body || !this.isMobile()) return;

      document.body.classList.add('is-mobile');
      if ('ontouchstart' in window) document.body.classList.add('is-touch');
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
        document.body.classList.add('is-coarse-pointer');
      }
    }
  };

  if (typeof window !== 'undefined') {
    const boot = () => {
      MobileResponsive.addMobileClasses();
      MobileResponsive.init();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }

    window.MobileResponsive = MobileResponsive;
  }
})();
