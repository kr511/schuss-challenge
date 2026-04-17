// ─── tutorial.js ─────────────────────────────────────────────────────────────
// Schritt-für-Schritt Onboarding für neue Schussduell-Nutzer.
// Zeigt kontextuelle Tooltips die auf UI-Elemente zeigen.
// Wird nur beim ersten Spielstart nach der Namenseingabe ausgelöst.
// Status wird in localStorage unter 'sd_tutorial_done' gespeichert.

const Tutorial = (() => {
  const STORAGE_KEY = 'sd_tutorial_done';

  // ── Tutorial-Schritte ────────────────────────────────────────────────────
  const STEPS = [
    {
      target: '#wTabKK, #wTabLG',   // Waffen-Tabs
      fallback: '.weapon-tabs',
      title: '🌬️ Wähle deine Waffe',
      text: 'Starte mit <b>Luftgewehr (LG)</b> oder <b>Kleinkaliber (KK)</b>. Jede Waffe hat eigene Disziplinen und Scheiben.',
      position: 'bottom',
    },
    {
      target: '#discTabs',
      title: '🎯 Disziplin wählen',
      text: 'Wähle die Disziplin — z.B. <b>LG 40</b> (40 Schuss) oder <b>KK 3×20</b> (kniend, liegend, stehend).',
      position: 'bottom',
    },
    {
      target: '#diffGroup',
      title: '💀 Schwierigkeit',
      text: 'Wähle wie stark der Bot schießt — von <b>Kreisklasse</b> bis <b>Weltrekord</b>. Fang mit Kreisklasse an!',
      position: 'top',
    },
    {
      target: '#startBtn, .btn-start, [onclick*="startBattle"]',
      fallback: '.btn-fire',
      title: '🔫 Duell starten',
      text: 'Starte das Duell! Der Bot schießt automatisch. Du gibst dein echtes Ergebnis danach ein.',
      position: 'top',
      isLast: false,
    },
    {
      target: '#profileBtn, .profile-btn',
      title: '👤 Dein Profil',
      text: 'Hier siehst du deine <b>XP, Rang, Statistiken</b> und die <b>Leistungskurve</b> deiner letzten Duelle.',
      position: 'bottom',
      isLast: true,
    },
  ];

  let _currentStep = 0;
  let _overlay     = null;
  let _tooltip     = null;
  let _active      = false;

  // ── DOM-Helfer ───────────────────────────────────────────────────────────

  function findTarget(step) {
    const selectors = step.target.split(',').map(s => s.trim());
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    if (step.fallback) return document.querySelector(step.fallback);
    return null;
  }

  function getRect(el) {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, left: r.left + window.scrollX,
             width: r.width, height: r.height, bottom: r.bottom + window.scrollY,
             right: r.right + window.scrollX };
  }

  // ── Tooltip-Rendering ────────────────────────────────────────────────────

  function buildUI() {
    // Overlay (Hintergrund dimmen, Loch für Target)
    _overlay = document.createElement('div');
    _overlay.id = 'tut-overlay';
    Object.assign(_overlay.style, {
      position: 'fixed', inset: '0', zIndex: '9998',
      pointerEvents: 'none',
    });

    // Tooltip-Box
    _tooltip = document.createElement('div');
    _tooltip.id = 'tut-tooltip';
    _tooltip.innerHTML = '';
    Object.assign(_tooltip.style, {
      position: 'fixed', zIndex: '9999',
      maxWidth: '280px', width: 'calc(100vw - 40px)',
      background: 'rgba(8,18,4,.97)',
      border: '1px solid rgba(122,176,48,.45)',
      borderRadius: '14px',
      padding: '14px 16px 12px',
      boxShadow: '0 8px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(122,176,48,.1)',
      fontFamily: "'Outfit', sans-serif",
      color: 'rgba(255,255,255,.88)',
      transition: 'opacity .2s, transform .2s',
      opacity: '0',
      transform: 'translateY(6px)',
    });

    document.body.appendChild(_overlay);
    document.body.appendChild(_tooltip);
  }

  function positionTooltip(targetEl, position) {
    const rect   = getRect(targetEl);
    const tipW   = Math.min(280, window.innerWidth - 40);
    const tipH   = _tooltip.offsetHeight || 120;
    const margin = 12;
    const vw     = window.innerWidth;
    const vh     = window.innerHeight;

    let top, left;

    if (position === 'bottom') {
      top  = rect.bottom + margin;
      left = rect.left + rect.width / 2 - tipW / 2;
    } else {
      top  = rect.top - tipH - margin;
      left = rect.left + rect.width / 2 - tipW / 2;
    }

    // Clamp to viewport
    left = Math.max(20, Math.min(left, vw - tipW - 20));
    top  = Math.max(10, Math.min(top, vh - tipH - 10));

    _tooltip.style.top    = top + 'px';
    _tooltip.style.left   = left + 'px';
    _tooltip.style.width  = tipW + 'px';

    // Highlight-Rahmen um Target
    Object.assign(_overlay.style, {
      background: 'none',
      boxShadow: `0 0 0 9999px rgba(0,0,0,.72)`,
    });

    // Highlight-Box
    const existing = document.getElementById('tut-highlight');
    if (existing) existing.remove();
    const hl = document.createElement('div');
    hl.id = 'tut-highlight';
    Object.assign(hl.style, {
      position: 'fixed',
      top:    (rect.top - 4)    + 'px',
      left:   (rect.left - 4)   + 'px',
      width:  (rect.width + 8)  + 'px',
      height: (rect.height + 8) + 'px',
      borderRadius: '10px',
      border: '2px solid rgba(122,176,48,.8)',
      boxShadow: '0 0 0 9999px rgba(0,0,0,.72), 0 0 20px rgba(122,176,48,.3)',
      zIndex: '9997',
      pointerEvents: 'none',
      transition: 'all .25s',
    });
    document.body.appendChild(hl);
  }

  function renderStep(index) {
    const step = STEPS[index];
    if (!step) { end(); return; }

    const targetEl = findTarget(step);
    const isLast   = step.isLast || index === STEPS.length - 1;
    const progress = `${index + 1} / ${STEPS.length}`;

    _tooltip.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:.48rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(122,176,48,.6);font-weight:600;">
          SCHUSSDUELL GUIDE · ${progress}
        </span>
        <button onclick="Tutorial.skip()" style="background:none;border:none;color:rgba(255,255,255,.25);font-size:.7rem;cursor:pointer;padding:0 0 0 8px;font-family:inherit;">
          Überspringen
        </button>
      </div>
      <div style="font-size:.95rem;font-weight:700;color:#fff;margin-bottom:6px;letter-spacing:.01em;">
        ${step.title}
      </div>
      <div style="font-size:.75rem;color:rgba(255,255,255,.65);line-height:1.55;">
        ${step.text}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;align-items:center;">
        ${index > 0
          ? `<button onclick="Tutorial.prev()" style="flex:0 0 auto;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.5);border-radius:8px;padding:7px 14px;font-size:.7rem;font-family:inherit;cursor:pointer;">← Zurück</button>`
          : ''}
        <button onclick="Tutorial.next()" style="flex:1;background:rgba(122,176,48,.18);border:1px solid rgba(122,176,48,.45);color:#7ab030;border-radius:8px;padding:8px 14px;font-size:.75rem;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:.04em;">
          ${isLast ? '✓ Los geht\'s!' : 'Weiter →'}
        </button>
      </div>
      <div style="display:flex;gap:4px;justify-content:center;margin-top:10px;">
        ${STEPS.map((_, i) => `<div style="width:${i===index?'16px':'6px'};height:4px;border-radius:2px;background:${i===index?'#7ab030':'rgba(255,255,255,.15)'};transition:all .2s;"></div>`).join('')}
      </div>
    `;

    // Animate in
    _tooltip.style.opacity   = '0';
    _tooltip.style.transform = 'translateY(6px)';

    if (targetEl) {
      // Scroll target into view
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => {
        positionTooltip(targetEl, step.position || 'bottom');
        requestAnimationFrame(() => {
          _tooltip.style.opacity   = '1';
          _tooltip.style.transform = 'translateY(0)';
        });
      }, 150);
    } else {
      // Fallback: zentriert
      Object.assign(_tooltip.style, {
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%) translateY(6px)',
      });
      requestAnimationFrame(() => {
        _tooltip.style.opacity   = '1';
        _tooltip.style.transform = 'translate(-50%, -50%) translateY(0)';
      });
    }
  }

  // ── Öffentliche API ──────────────────────────────────────────────────────

  return {
    isDone() {
      return localStorage.getItem(STORAGE_KEY) === '1';
    },

    start() {
      if (_active) return;
      _active       = true;
      _currentStep  = 0;
      buildUI();
      renderStep(0);
    },

    next() {
      _currentStep++;
      if (_currentStep >= STEPS.length) { this.end(); return; }
      renderStep(_currentStep);
    },

    prev() {
      if (_currentStep > 0) {
        _currentStep--;
        renderStep(_currentStep);
      }
    },

    skip() {
      this.end();
    },

    end() {
      _active = false;
      localStorage.setItem(STORAGE_KEY, '1');
      if (_tooltip)   { _tooltip.remove();   _tooltip   = null; }
      if (_overlay)   { _overlay.remove();   _overlay   = null; }
      const hl = document.getElementById('tut-highlight');
      if (hl) hl.remove();
    },

    // Manuell zurücksetzen (für Tests)
    reset() {
      localStorage.removeItem(STORAGE_KEY);
    },

    // Wird nach saveWelcomeName() aufgerufen
    startIfNew() {
      if (!this.isDone()) {
        setTimeout(() => this.start(), 800);
      }
    }
  };
})();
