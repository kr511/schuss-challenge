/**
 * Enhanced Mobile Responsive Features
 * Touch-Optimierung, Swipe-Gesten, Mobile UI-Verbesserungen
 */

(function() {
  'use strict';

  const MobileResponsive = {
    // Konfiguration
    config: {
      swipeThreshold: 50,
      touchTargetMinSize: 44, // px
      bottomSheetMaxHeight: 0.85, // 85% viewport
      keyboardOffsetBottom: 20, // px
    },

    // State
    state: {
      swipeStartX: 0,
      swipeStartY: 0,
      isSwiping: false,
      bottomSheetOpen: false,
      keyboardVisible: false,
    },

    /**
     * Initialisiert alle Mobile-Features
     */
    init() {
      console.log('📱 Enhanced Mobile Responsive initialisiert');
      
      this.enhanceTouchTargets();
      this.setupSwipeGestures();
      this.optimizeBottomSheets();
      this.handleKeyboardBehavior();
      this.setupResponsiveGrids();
      this.addMobileFeedback();
    },

    /**
     * Vergrößert Touch-Targets für bessere Bedienbarkeit
     */
    enhanceTouchTargets() {
      // Buttons mit mind. 44x44px
      const buttons = document.querySelectorAll('button, .btn-fire, .btn-primary, .btn-secondary');
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.height < this.config.touchTargetMinSize) {
          btn.style.minHeight = `${this.config.touchTargetMinSize}px`;
        }
        if (rect.width < this.config.touchTargetMinSize) {
          btn.style.minWidth = `${this.config.touchTargetMinSize}px`;
        }
        // Padding erhöhen
        const currentPadding = window.getComputedStyle(btn).padding;
        if (parseInt(currentPadding, 10) < 12) {
          btn.style.padding = '12px 16px';
        }
      });

      // Tabs und klickbare Elemente
      const clickableElements = document.querySelectorAll(
        '.ps-tab, .sun-card, .disc-option, .diff-option, [onclick], .cursor-pointer'
      );
      clickableElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.height < this.config.touchTargetMinSize) {
          el.style.minHeight = `${this.config.touchTargetMinSize}px`;
        }
      });

      console.log('✅ Touch-Targets optimiert');
    },

    /**
     * Richtet Swipe-Gesten ein
     */
    setupSwipeGestures() {
      const body = document.body;

      body.addEventListener('touchstart', (e) => {
        this.state.swipeStartX = e.touches[0].clientX;
        this.state.swipeStartY = e.touches[0].clientY;
        this.state.isSwiping = true;
      }, { passive: true });

      body.addEventListener('touchend', (e) => {
        if (!this.state.isSwiping) return;
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        
        const deltaX = endX - this.state.swipeStartX;
        const deltaY = endY - this.state.swipeStartY;
        
        // Nur horizontale Swipes berücksichtigen
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.config.swipeThreshold) {
          if (deltaX > 0) {
            this.handleSwipeRight();
          } else {
            this.handleSwipeLeft();
          }
        }
        
        this.state.isSwiping = false;
      }, { passive: true });

      body.addEventListener('touchcancel', () => {
        this.state.isSwiping = false;
      }, { passive: true });

      console.log('✅ Swipe-Gesten eingerichtet');
    },

    /**
     * Swipe nach links - Profil öffnen
     */
    handleSwipeLeft() {
      // Verhindere Swipe wenn Input fokussiert
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      const profileTrigger = document.getElementById('pdProfileBtn') || document.getElementById('profileIcon');
      if (profileTrigger) {
        const style = window.getComputedStyle(profileTrigger);
        if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none') return;

        console.log('⬅️ Swipe Left -> Profil öffnen');
        profileTrigger.click();
        this.triggerHaptic('light');
      }
    },

    /**
     * Swipe nach rechts - Challenge/Duell öffnen
     */
    handleSwipeRight() {
      // Verhindere Swipe wenn Input fokussiert
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      const duelSetupBtn = document.getElementById('btnOpenDuelSetup') ||
        document.querySelector('[onclick*="openDuelSetup"]') ||
        document.querySelector('.btn-fire') ||
        document.querySelector('[onclick*="startBattle"]');

      if (duelSetupBtn) {
        console.log('➡️ Swipe Right -> Duell öffnen');
        duelSetupBtn.click();
        this.triggerHaptic('light');
      } else if (typeof window.openDuelSetup === 'function') {
        console.log('➡️ Swipe Right -> Duell öffnen (Fallback-Funktion)');
        window.openDuelSetup();
        this.triggerHaptic('light');
      }
    },

    /**
     * Optimiert Bottom-Sheets für Mobile
     */
    optimizeBottomSheets() {
      const profileSheet = document.getElementById('profileSheet');
      const duelSetupSheet = document.getElementById('duelSetupSheet');

      [profileSheet, duelSetupSheet].forEach(sheet => {
        if (!sheet) return;

        // Maximale Höhe setzen
        const maxHeight = window.innerHeight * this.config.bottomSheetMaxHeight;
        sheet.style.maxHeight = `${maxHeight}px`;

        // Drag-to-close hinzufügen
        this.addDragToClose(sheet);

        // Pull-down indicator
        this.addPullDownIndicator(sheet);
      });

      console.log('✅ Bottom-Sheets optimiert');
    },

    /**
     * Fügt Drag-to-close hinzu
     */
    addDragToClose(sheet) {
      let startY = 0;
      let currentY = 0;
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
      };

      sheet.addEventListener('touchstart', (e) => {
        // Nur wenn am Handle gezogen wird
        const handle = getHandle();
        const validHandle = handle && (e.target === handle || handle.contains(e.target));
        if (validHandle) {
          startY = e.touches[0].clientY;
          isDragging = true;
          sheet.style.transition = 'none';
        }
      }, { passive: true });

      sheet.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        if (deltaY > 0) {
          sheet.style.transform = `translateY(${deltaY}px)`;
        }
      }, { passive: true });

      sheet.addEventListener('touchend', () => {
        if (!isDragging) return;
        
        const transform = sheet.style.transform;
        const match = transform.match(/translateY\((\d+)px\)/);
        const draggedDistance = match ? parseInt(match[1], 10) : 0;
        
        sheet.style.transition = 'transform 0.3s ease';
        
        if (draggedDistance > 100) {
          // Sheet schließen
          sheet.style.transform = 'translateY(100%)';
          setTimeout(closeSheet, 300);
        } else {
          // Zurücksetzen
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

    /**
     * Fügt Pull-down Indicator hinzu
     */
    addPullDownIndicator(sheet) {
      if (sheet.querySelector('.pull-down-indicator')) return;

      const indicator = document.createElement('div');
      indicator.className = 'pull-down-indicator';
      indicator.innerHTML = '⬇️';
      indicator.style.cssText = `
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 1.5rem;
        opacity: 0.3;
        pointer-events: none;
      `;
      
      sheet.parentElement.insertBefore(indicator, sheet);
    },

    /**
     * Handelt Keyboard-Öffnung auf Mobile
     */
    handleKeyboardBehavior() {
      // Visual Viewport API für Keyboard
      if ('visualViewport' in window) {
        window.visualViewport.addEventListener('resize', () => {
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
        });
      }

      // Fallback: focus/blur Events
      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          setTimeout(() => {
            this.scrollIntoViewIfNeeded(input);
          }, 300);
        });
      });

      console.log('✅ Keyboard-Handling eingerichtet');
    },

    /**
     * Wenn Keyboard erscheint
     */
    onKeyboardShow(keyboardHeight) {
      console.log('⌨️ Keyboard sichtbar:', keyboardHeight, 'px');
      
      // Bottom Sheet anpassen
      const activeSheet = document.querySelector('.profile-sheet.active, .bottom-sheet.active');
      if (activeSheet) {
        activeSheet.style.marginBottom = `${keyboardHeight}px`;
        activeSheet.style.maxHeight = `calc(85vh - ${keyboardHeight}px)`;
      }

      // Body Klasse setzen
      document.body.classList.add('keyboard-visible');
    },

    /**
     * Wenn Keyboard verschwindet
     */
    onKeyboardHide() {
      console.log('⌨️ Keyboard versteckt');
      
      // Bottom Sheet zurücksetzen
      const activeSheet = document.querySelector('.profile-sheet.active, .bottom-sheet.active');
      if (activeSheet) {
        activeSheet.style.marginBottom = '';
        activeSheet.style.maxHeight = '';
      }

      // Body Klasse entfernen
      document.body.classList.remove('keyboard-visible');
    },

    /**
     * Scrollt Element in den sichtbaren Bereich
     */
    scrollIntoViewIfNeeded(element) {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      
      if (rect.bottom > windowHeight) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },

    /**
     * Richtet responsive Grids ein
     */
    setupResponsiveGrids() {
      // Stats Grid
      const statsGrids = document.querySelectorAll('.ps-stats-grid, .sun-grid');
      statsGrids.forEach(grid => {
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
        window.addEventListener('resize', updateColumns);
      });

      console.log('✅ Responsive Grids eingerichtet');
    },

    /**
     * Fügt mobiles Feedback hinzu
     */
    addMobileFeedback() {
      // Touch-Start/End Effekte
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

      interactiveElements.forEach(el => {
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

        el.addEventListener('touchcancel', () => {
          resetTouchFeedback(el);
        }, { passive: true });
      });

      console.log('✅ Mobile Feedback eingerichtet');
    },

    /**
     * Triggert haptisches Feedback
     */
    triggerHaptic(type = 'light') {
      if (!('vibrate' in navigator)) return;

      const patterns = {
        light: [10],
        medium: [20, 10, 20],
        strong: [50],
        error: [100, 50, 100],
      };

      const pattern = patterns[type] || patterns.light;
      navigator.vibrate(pattern);
    },

    /**
     * Prüft ob Mobile
     */
    isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
             ('ontouchstart' in window) ||
             (navigator.maxTouchPoints > 0);
    },

    /**
     * Fügt Mobile-spezifische CSS-Klassen hinzu
     */
    addMobileClasses() {
      if (this.isMobile()) {
        document.body.classList.add('is-mobile');
        
        // Touch-Device
        if ('ontouchstart' in window) {
          document.body.classList.add('is-touch');
        }

        // Coarse pointer
        if (window.matchMedia('(pointer: coarse)').matches) {
          document.body.classList.add('is-coarse-pointer');
        }
      }
    }
  };

  // Initialization
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        MobileResponsive.addMobileClasses();
        MobileResponsive.init();
      });
    } else {
      MobileResponsive.addMobileClasses();
      MobileResponsive.init();
    }

    // Export für Debugging
    if (window.DEBUG) {
      window.MobileResponsive = MobileResponsive;
    }
  }

})();
