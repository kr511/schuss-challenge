/**
 * MODERN UX ENHANCEMENTS
 * Touch-Optimierung, Animationen & Belohnungssystem
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════
  // TOUCH-OPTIMIERUNG
  // ═══════════════════════════════════════════════════════

  function enhanceTouchTargets() {
    // Alle Buttons und klickbaren Elemente optimieren
    const touchTargets = document.querySelectorAll('button, .btn, [role="button"], .clickable, a[href]');
    
    touchTargets.forEach(target => {
      // Mindestgröße sicherstellen
      const rect = target.getBoundingClientRect();
      if (rect.width < 44) {
        target.style.minWidth = '44px';
      }
      if (rect.height < 44) {
        target.style.minHeight = '44px';
      }

      // Touch-Feedback
      target.addEventListener('touchstart', function () {
        this.style.transform = 'scale(0.96)';
        this.style.opacity = '0.85';
      }, { passive: true });

      target.addEventListener('touchend', function () {
        this.style.transform = '';
        this.style.opacity = '';
      }, { passive: true });

      target.addEventListener('touchcancel', function () {
        this.style.transform = '';
        this.style.opacity = '';
      }, { passive: true });
    });
  }

  // ═══════════════════════════════════════════════════════
  // TAB-ÜBERGÄNGE MIT ANIMATIONEN
  // ═══════════════════════════════════════════════════════

  function enhanceTabTransitions() {
    // Tab-Buttons finden (angenommen Standard-Struktur)
    const tabs = document.querySelectorAll('[data-tab], .tab-btn, .nav-btn');
    
    if (tabs.length === 0) {
      // Versuche alternative Tab-Strukturen
      const possibleTabs = document.querySelectorAll('.nav button, header button, .bottom-nav button');
      possibleTabs.forEach(tab => {
        if (tab.textContent.match(/Schütze|Stats|Einstell|Profil/i)) {
          tab.classList.add('tab-btn');
        }
      });
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', function (e) {
        const targetId = this.dataset.tab || this.getAttribute('data-target');
        if (!targetId) return;

        const targetContent = document.getElementById(targetId) || 
                             document.querySelector(`[data-content="${targetId}"]`);
        
        if (targetContent) {
          // Animation nur anwenden wenn noch nicht geschehen
          if (!targetContent.classList.contains('animated')) {
            targetContent.classList.add('animated');
          }

          // Aktuelle View ausblenden
          const activeContent = document.querySelector('.tab-content.animated.active');
          if (activeContent) {
            activeContent.classList.add('leaving');
            setTimeout(() => {
              activeContent.classList.remove('active', 'leaving');
            }, 300);
          }

          // Neue View einblenden
          setTimeout(() => {
            targetContent.classList.add('active');
            targetContent.classList.remove('leaving');
            
            // Elemente darin animieren
            animateChildren(targetContent);
          }, activeContent ? 150 : 0);
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  // ELEMENT-EINBLENDUNGEN
  // ═══════════════════════════════════════════════════════

  function animateChildren(container) {
    const animatable = container.querySelectorAll(
      '.card, .badge-item, .achievement, .stat-card, .duel-entry, .list-item'
    );

    animatable.forEach((el, index) => {
      // Nur animieren wenn noch nicht geschehen
      if (!el.classList.contains('animate-in')) {
        el.classList.add('animate-in');
        el.style.animationDelay = `${index * 50}ms`;
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // GAME OVER SCREEN ANIMATION
  // ═══════════════════════════════════════════════════════

  function animateGameOver() {
    const gameOverScreen = document.getElementById('gameOverScreen') ||
                          document.querySelector('.game-over, #gameover');
    
    if (!gameOverScreen) return;

    // Dramatisches Reveal
    gameOverScreen.style.animation = 'dramaticReveal 800ms cubic-bezier(0.19, 1, 0.22, 1) forwards';

    // Zahlen hochzählen
    const scoreElements = gameOverScreen.querySelectorAll('.score, .points, .ring-count');
    scoreElements.forEach(el => {
      const finalValue = parseInt(el.textContent) || 0;
      animateNumber(el, 0, finalValue, 1000);
    });
  }

  function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out Expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + (end - start) * eased);
      
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    
    requestAnimationFrame(update);
  }

  // ═══════════════════════════════════════════════════════
  // XP LEVEL-UP ANIMATION
  // ═══════════════════════════════════════════════════════

  function showLevelUpAnimation(rank, newXP) {
    const container = document.createElement('div');
    container.className = 'level-up-container';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      text-align: center;
      pointer-events: none;
    `;

    container.innerHTML = `
      <div style="animation: scaleInBounce 800ms cubic-bezier(0.68, -0.55, 0.265, 1.55);">
        <div style="font-size: 4rem; margin-bottom: 10px;">🎉</div>
        <div style="font-size: 2rem; font-weight: 800; color: #7ab030; text-shadow: 0 0 30px rgba(122,176,48,0.6);">
          LEVEL UP!
        </div>
        <div style="font-size: 1.2rem; color: #fff; margin-top: 10px; font-weight: 600;">
          ${rank.icon} ${rank.name}
        </div>
        <div style="font-size: 1rem; color: rgba(255,255,255,0.7); margin-top: 5px;">
          ${newXP} XP gesamt
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Konfetti-Effekt
    createConfetti();

    // Nach 3 Sekunden entfernen
    setTimeout(() => {
      container.style.transition = 'opacity 500ms';
      container.style.opacity = '0';
      setTimeout(() => container.remove(), 500);
    }, 3000);
  }

  function createConfetti() {
    const colors = ['#7ab030', '#00c3ff', '#ff6b35', '#ffd700', '#9c27b0', '#ff9800'];
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: fixed;
        top: -10px;
        left: ${Math.random() * 100}vw;
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation: confettiFall ${Math.random() * 2 + 2}s linear forwards;
        pointer-events: none;
        z-index: 9999;
      `;
      document.body.appendChild(confetti);

      setTimeout(() => confetti.remove(), 4000);
    }
  }

  // ═══════════════════════════════════════════════════════
  // LOOTBOX / TOOLBOX ANIMATION
  // ═══════════════════════════════════════════════════════

  function animateLootbox(lootboxElement, reward) {
    return new Promise((resolve) => {
      // Phase 1: Schütteln
      lootboxElement.classList.add('shaking');
      
      setTimeout(() => {
        lootboxElement.classList.remove('shaking');
        lootboxElement.classList.add('opening');

        // Phase 2: Öffnen & Reward anzeigen
        setTimeout(() => {
          showReward(reward);
          lootboxElement.classList.remove('opening');
          resolve();
        }, 800);
      }, 1000);
    });
  }

  function showReward(reward) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 300ms;
    `;

    overlay.innerHTML = `
      <div style="
        background: linear-gradient(145deg, rgba(45,50,55,0.95) 0%, rgba(10,12,15,0.98) 100%);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 24px;
        padding: 40px;
        text-align: center;
        animation: scaleInBounce 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
        box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      ">
        <div style="font-size: 4rem; margin-bottom: 20px;">${reward.icon || '🎁'}</div>
        <div style="font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 10px;">
          ${reward.title || 'Belohnung!'}
        </div>
        <div style="font-size: 1rem; color: rgba(255,255,255,0.7); margin-bottom: 30px;">
          ${reward.description || ''}
        </div>
        <button onclick="this.closest('div').parentElement.remove()" style="
          background: linear-gradient(145deg, #7ab030, #5a8a20);
          border: none;
          border-radius: 12px;
          padding: 12px 32px;
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
        ">ABHOLEN</button>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  // ═══════════════════════════════════════════════════════
  // SWIPE-GESTEN FÜR TAB-WECHSEL
  // ═══════════════════════════════════════════════════════

  function enableSwipeNavigation() {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isDragging = false;

    const tabs = Array.from(document.querySelectorAll('[data-tab], .tab-btn'));
    let currentTabIndex = 0;

    // AbortController für Cleanup
    const controller = new AbortController();
    const { signal } = controller;

    const handleTouchStart = (e) => {
      // Swipe-Geste deaktivieren wenn in scrollbarem Container
      const scrollableContainer = e.target.closest('.ps-body, .shot-log-wrap, .swipe-container, [style*="overflow"], [class*="overflow"]');
      if (scrollableContainer) {
        isDragging = false;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      if (!isDragging) return;
      isDragging = false;

      const diffX = currentX - startX;
      const diffY = Math.abs(e.changedTouches[0].clientY - startY);

      // Nur horizontale Swipes erkennen
      if (Math.abs(diffX) > 80 && Math.abs(diffX) > diffY) {
        if (diffX > 0 && currentTabIndex > 0) {
          // Swipe rechts - vorheriger Tab
          currentTabIndex--;
        } else if (diffX < 0 && currentTabIndex < tabs.length - 1) {
          // Swipe links - nächster Tab
          currentTabIndex++;
        }

        // Tab wechseln
        if (tabs[currentTabIndex]) {
          tabs[currentTabIndex].click();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true, signal });
    document.addEventListener('touchmove', handleTouchMove, { passive: true, signal });
    document.addEventListener('touchend', handleTouchEnd, { passive: true, signal });

    // Cleanup bei Page-Unload
    window.addEventListener('beforeunload', () => {
      controller.abort();
    }, { once: true });
  }

  // ═══════════════════════════════════════════════════════
  // SCROLL-ANIMATIONEN
  // ═══════════════════════════════════════════════════════

  function enableScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    // Alle Cards und Listenelemente beobachten
    document.querySelectorAll('.card, .list-item, .stat-card, .duel-entry').forEach(el => {
      observer.observe(el);
    });
  }

  // ═══════════════════════════════════════════════════════
  // XP POPUP VERBESSERUNG
  // ═══════════════════════════════════════════════════════

  function enhanceXPPopup(xpAmount) {
    // Suche existierendes XP-Popup oder erstelle neues
    let popup = document.querySelector('.xp-popup, .xp-pop');
    
    if (!popup) {
      popup = document.createElement('div');
      popup.className = 'xp-popup';
      popup.style.cssText = `
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        text-align: center;
        pointer-events: none;
      `;
      document.body.appendChild(popup);
    }

    popup.innerHTML = `
      <div style="
        animation: xpNumberPop 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        font-size: 2.5rem;
        font-weight: 800;
        color: #ffd700;
        text-shadow: 0 0 20px rgba(255,215,0,0.6);
      ">+${xpAmount} XP</div>
    `;

    setTimeout(() => popup.remove(), 1500);
  }

  // ═══════════════════════════════════════════════════════
  // INITIALISIERUNG
  // ═══════════════════════════════════════════════════════

  function init() {
    console.log('[Modern UX] Initialisiere Enhancement-Suite...');

    // Touch-Optimierung
    enhanceTouchTargets();
    console.log('[Modern UX] ✓ Touch-Targets optimiert');

    // Tab-Übergänge
    enhanceTabTransitions();
    console.log('[Modern UX] ✓ Tab-Übergänge aktiviert');

    // Swipe-Gesten
    enableSwipeNavigation();
    console.log('[Modern UX] ✓ Swipe-Navigation aktiviert');

    // Scroll-Animationen
    setTimeout(enableScrollAnimations, 1000);
    console.log('[Modern UX] ✓ Scroll-Animationen aktiviert');

    // Globale Funktionen verfügbar machen
    window.ModernUX = {
      showLevelUpAnimation,
      animateLootbox,
      showReward,
      enhanceXPPopup,
      animateGameOver,
      animateChildren
    };

    console.log('[Modern UX] 🎉 Alle Enhancements geladen!');
  }

  // Warte auf DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM bereits geladen
    setTimeout(init, 100);
  }

  // ═══════════════════════════════════════════════════════
  // HILFSFUNKTIONEN FÜR APP.JS INTEGRATION
  // ═══════════════════════════════════════════════════════

  // Override für bestehende Funktionen (falls vorhanden)
  window.addEventListener('load', () => {
    // Level-Up Animation überschreiben
    if (typeof showLevelUp === 'function') {
      const originalShowLevelUp = window.showLevelUp;
      window.showLevelUp = function (rank) {
        if (window.ModernUX) {
          const currentXP = typeof G !== 'undefined' ? G.xp : 0;
          window.ModernUX.showLevelUpAnimation(rank, currentXP);
        } else {
          originalShowLevelUp(rank);
        }
      };
      console.log('[Modern UX] ✓ showLevelUp mit Animation enhanced');
    }

    // XP Popup überschreiben
    if (typeof showXPPop === 'function') {
      const originalShowXPPop = window.showXPPop;
      window.showXPPop = function (xp) {
        if (window.ModernUX) {
          window.ModernUX.enhanceXPPopup(xp);
        }
        originalShowXPPop(xp);
      };
      console.log('[Modern UX] ✓ showXPPop mit Animation enhanced');
    }
  });

})();
