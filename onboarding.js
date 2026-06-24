// ─── onboarding.js ───────────────────────────────────────────────────────────
// Vollbild-Onboarding: 3 Schritte für neue Nutzer.
// Schritt 1: Welcome  Schritt 2: Disziplin (KK/LG)  Schritt 3: Name + Alter
// Ergebnis: sd_onboarded=1, sd_username, sd_age, sd_fav_weapon in localStorage
(function () {
  'use strict';

  const STORAGE_KEY = 'sd_onboarded';
  const SKIP_KEY    = 'sd_tutorial_done';

  function isDone() {
    return localStorage.getItem(STORAGE_KEY) === '1';
  }

  // ── SVG-Scheibe (wie im Handoff Screen 09) ──────────────────────────────
  const TARGET_SVG = `
    <svg viewBox="0 0 260 260" width="240" height="240"
         style="filter:drop-shadow(0 0 40px rgba(34,197,94,0.25))">
      <circle cx="130" cy="130" r="126" fill="#060606" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
      <circle cx="130" cy="130" r="112" fill="#0c0c0c" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>
      <circle cx="130" cy="130" r="98"  fill="#111"    stroke="rgba(255,255,255,0.11)" stroke-width="1"/>
      <circle cx="130" cy="130" r="84"  fill="#171717" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>
      <circle cx="130" cy="130" r="70"  fill="#1e1e1e" stroke="rgba(255,255,255,0.17)" stroke-width="1"/>
      <circle cx="130" cy="130" r="56"  fill="rgba(238,236,228,0.93)" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <circle cx="130" cy="130" r="43"  fill="rgba(238,236,228,0.95)" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <circle cx="130" cy="130" r="31"  fill="rgba(235,233,225,0.97)" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <circle cx="130" cy="130" r="21"  fill="rgba(34,197,94,0.35)"   stroke="#22c55e" stroke-width="1.5"/>
      <circle cx="130" cy="130" r="12"  fill="#22c55e" stroke="#4ade80" stroke-width="1.5"/>
      <circle cx="130" cy="130" r="6"   fill="#4ade80"/>
      <line x1="130" y1="4"   x2="130" y2="24"  stroke="rgba(255,255,255,0.5)" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="130" y1="236" x2="130" y2="256" stroke="rgba(255,255,255,0.5)" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="4"   y1="130" x2="24"  y2="130" stroke="rgba(255,255,255,0.5)" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="236" y1="130" x2="256" y2="130" stroke="rgba(255,255,255,0.5)" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="130" y1="24"  x2="130" y2="236" stroke="rgba(255,255,255,0.06)" stroke-width="0.7"/>
      <line x1="24"  y1="130" x2="236" y2="130" stroke="rgba(255,255,255,0.06)" stroke-width="0.7"/>
      <circle cx="88"  cy="88"  r="3"   fill="rgba(34,197,94,0.6)"/>
      <circle cx="172" cy="92"  r="2.5" fill="rgba(34,197,94,0.45)"/>
      <circle cx="130" cy="130" r="2.5" fill="rgba(34,197,94,0.9)"/>
    </svg>`;

  // ── CSS ─────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('obStyles')) return;
    const s = document.createElement('style');
    s.id = 'obStyles';
    s.textContent = `
      .ob-overlay{
        position:fixed;inset:0;z-index:2147483200;
        background:radial-gradient(ellipse 70% 50% at 50% -5%,rgba(34,197,94,.10) 0%,transparent 55%),#0a0a0a;
        font-family:'Outfit',system-ui,sans-serif;color:#fff;
        display:flex;flex-direction:column;align-items:center;
        padding:env(safe-area-inset-top,20px) 26px calc(28px + env(safe-area-inset-bottom));
        overflow:hidden;
        transition:opacity .35s;
      }
      .ob-overlay.ob-exit{opacity:0;pointer-events:none;}

      /* Skip */
      .ob-skip{
        position:absolute;top:calc(env(safe-area-inset-top,0px) + 14px);right:22px;
        font-size:13px;color:rgba(255,255,255,.3);font-weight:500;
        background:none;border:none;cursor:pointer;font-family:inherit;
      }

      /* Illustration */
      .ob-illu{
        flex:1 1 auto;display:flex;align-items:center;justify-content:center;
        width:100%;position:relative;overflow:hidden;min-height:0;
      }
      .ob-illu-fade{
        position:absolute;bottom:0;left:0;right:0;height:80px;
        background:linear-gradient(to top,rgba(34,197,94,.07),transparent);
        pointer-events:none;
      }
      .ob-illu-persp{transform:perspective(700px) rotateX(6deg);}

      /* Dots */
      .ob-dots{display:flex;gap:6px;align-items:center;margin-bottom:22px;}
      .ob-dot{
        height:7px;border-radius:4px;
        background:rgba(255,255,255,.2);
        transition:width .25s,background .25s;
        width:7px;
      }
      .ob-dot.active{width:20px;background:#22c55e;}

      /* Text block */
      .ob-text{width:100%;margin-bottom:0;}
      .ob-title{font-size:28px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.2;margin:0 0 10px;}
      .ob-sub{font-size:15px;color:rgba(255,255,255,.55);line-height:1.5;margin:0 0 24px;}

      /* Primary button */
      .ob-btn-primary{
        width:100%;padding:16px;
        background:#22c55e;color:#000;
        border:none;border-radius:14px;
        font-family:'Outfit',sans-serif;font-size:16px;font-weight:800;
        letter-spacing:.05em;cursor:pointer;
        box-shadow:0 0 20px rgba(34,197,94,.3);
        transition:opacity .15s,transform .1s;
      }
      .ob-btn-primary:active{opacity:.85;transform:scale(.98);}

      /* ── Step 2: Disziplin-Karten ── */
      .ob-disc-grid{
        display:grid;grid-template-columns:1fr 1fr;gap:14px;
        width:100%;margin-bottom:20px;
      }
      .ob-disc-card{
        background:rgba(18,18,18,.95);border:2px solid rgba(255,255,255,.08);
        border-radius:18px;padding:22px 16px;text-align:center;
        cursor:pointer;transition:border-color .2s,background .2s,transform .1s;
        user-select:none;
      }
      .ob-disc-card:active{transform:scale(.96);}
      .ob-disc-card.selected{
        border-color:#22c55e;background:rgba(34,197,94,.08);
      }
      .ob-disc-icon{font-size:40px;margin-bottom:10px;line-height:1;}
      .ob-disc-name{font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;}
      .ob-disc-sub{font-size:12px;color:rgba(255,255,255,.4);line-height:1.4;}
      .ob-disc-card.selected .ob-disc-name{color:#4ade80;}
      .ob-disc-card.selected .ob-disc-icon{filter:drop-shadow(0 0 8px rgba(34,197,94,.6));}

      /* ── Step 3: Inputs ── */
      .ob-input-group{width:100%;margin-bottom:14px;}
      .ob-input-lbl{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.38);font-weight:600;margin-bottom:8px;}
      .ob-input{
        width:100%;padding:15px 16px;
        background:rgba(18,18,18,.95);
        border:1px solid rgba(255,255,255,.12);border-radius:14px;
        font-family:'Outfit',sans-serif;font-size:16px;font-weight:600;color:#fff;
        outline:none;transition:border-color .2s;box-sizing:border-box;
      }
      .ob-input::placeholder{color:rgba(255,255,255,.2);}
      .ob-input:focus{border-color:rgba(34,197,94,.55);}
      .ob-err{font-size:12px;color:#ff4a4a;margin-top:6px;min-height:16px;}
    `;
    document.head.appendChild(s);
  }

  // ── Render Schritt 1: Welcome ────────────────────────────────────────────
  function renderStep1(overlay) {
    overlay.innerHTML = `
      <button class="ob-skip" onclick="Onboarding.skip()">Überspringen</button>
      <div class="ob-illu">
        <div class="ob-illu-fade"></div>
        <div class="ob-illu-persp">${TARGET_SVG}</div>
      </div>
      <div class="ob-text">
        <div class="ob-dots">
          <div class="ob-dot active"></div>
          <div class="ob-dot"></div>
          <div class="ob-dot"></div>
        </div>
        <h1 class="ob-title">Trainiere wie ein Profi.</h1>
        <p class="ob-sub">Duell gegen den adaptiven Bot. Dein Niveau. Dein Tempo.</p>
        <button class="ob-btn-primary" onclick="Onboarding.next()">JETZT STARTEN</button>
      </div>
    `;
  }

  // ── Render Schritt 2: Disziplin ──────────────────────────────────────────
  function renderStep2(overlay, selectedWeapon) {
    overlay.innerHTML = `
      <button class="ob-skip" onclick="Onboarding.skip()">Überspringen</button>
      <div class="ob-illu" style="flex:0 0 auto;height:120px;margin-top:16px;">
        <div style="text-align:center;padding-top:10px;">
          <div style="font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#22c55e;font-weight:700;margin-bottom:8px;">SCHRITT 2 / 3</div>
          <div style="font-size:22px;font-weight:800;color:#fff;">Deine Lieblingsdisziplin?</div>
          <div style="font-size:14px;color:rgba(255,255,255,.4);margin-top:6px;">Du kannst das später jederzeit ändern.</div>
        </div>
      </div>
      <div class="ob-disc-grid" style="flex:1 1 auto;align-content:center;">
        <div class="ob-disc-card${selectedWeapon === 'lg' ? ' selected' : ''}"
             onclick="Onboarding.selectWeapon('lg')">
          <div class="ob-disc-icon">🌬️</div>
          <div class="ob-disc-name">LG</div>
          <div class="ob-disc-sub">Luftgewehr<br/>10m · 40/60 Schuss</div>
        </div>
        <div class="ob-disc-card${selectedWeapon === 'kk' ? ' selected' : ''}"
             onclick="Onboarding.selectWeapon('kk')">
          <div class="ob-disc-icon">🎯</div>
          <div class="ob-disc-name">KK</div>
          <div class="ob-disc-sub">Kleinkaliber<br/>50m / 100m</div>
        </div>
      </div>
      <div class="ob-text" style="margin-top:8px;">
        <div class="ob-dots">
          <div class="ob-dot"></div>
          <div class="ob-dot active"></div>
          <div class="ob-dot"></div>
        </div>
        <button class="ob-btn-primary" onclick="Onboarding.next()"
          style="opacity:${selectedWeapon ? '1' : '.45'};"
          id="obNextBtn2">WEITER</button>
      </div>
    `;
  }

  // ── Render Schritt 3: Name + Alter ───────────────────────────────────────
  function renderStep3(overlay, name, age) {
    overlay.innerHTML = `
      <button class="ob-skip" onclick="Onboarding.skip()">Überspringen</button>
      <div class="ob-illu" style="flex:0 0 auto;height:120px;margin-top:16px;">
        <div style="text-align:center;padding-top:10px;">
          <div style="font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#22c55e;font-weight:700;margin-bottom:8px;">SCHRITT 3 / 3</div>
          <div style="font-size:22px;font-weight:800;color:#fff;">Wie sollen wir dich nennen?</div>
          <div style="font-size:14px;color:rgba(255,255,255,.4);margin-top:6px;">Dein Name erscheint im Profil und in der Rangliste.</div>
        </div>
      </div>
      <div style="flex:1 1 auto;width:100%;display:flex;flex-direction:column;justify-content:center;">
        <div class="ob-input-group">
          <div class="ob-input-lbl">Dein Name / Spitzname</div>
          <input class="ob-input" id="obName" type="text" maxlength="24"
            placeholder="z.B. MaxMuster" autocomplete="nickname"
            value="${name || ''}" oninput="Onboarding._syncBtn()"/>
          <div class="ob-err" id="obNameErr"></div>
        </div>
        <div class="ob-input-group">
          <div class="ob-input-lbl">Alter (optional)</div>
          <input class="ob-input" id="obAge" type="number" min="8" max="99"
            placeholder="z.B. 24"
            value="${age || ''}" oninput="Onboarding._syncBtn()"/>
        </div>
      </div>
      <div class="ob-text" style="margin-top:8px;">
        <div class="ob-dots">
          <div class="ob-dot"></div>
          <div class="ob-dot"></div>
          <div class="ob-dot active"></div>
        </div>
        <button class="ob-btn-primary" id="obFinishBtn"
          style="opacity:.45;" onclick="Onboarding.finish()">LOS GEHT'S 🎯</button>
      </div>
    `;
    setTimeout(() => document.getElementById('obName')?.focus(), 150);
  }

  // ── State ────────────────────────────────────────────────────────────────
  let _step    = 1;
  let _weapon  = '';
  let _overlay = null;

  function sanitizeName(v) {
    return String(v || '').replace(/[<>"'&]/g, '').trim().slice(0, 24);
  }

  function render() {
    if (!_overlay) return;
    if (_step === 1) renderStep1(_overlay);
    if (_step === 2) renderStep2(_overlay, _weapon);
    if (_step === 3) renderStep3(_overlay, '', '');
  }

  function complete(name, age, weapon) {
    if (name) {
      localStorage.setItem('sd_username', name);
      if (typeof G !== 'undefined') G.username = name;
      // Update all name display elements
      ['pdUserName', 'pdUserName2', 'psUsername'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = name;
      });
      const ini = document.getElementById('pdProfileInitial');
      if (ini) ini.innerText = name.charAt(0).toUpperCase();
      // Greeting subtitle
      const greet = document.getElementById('pdGreetingSub');
      if (greet) greet.textContent = 'Bereit für dein nächstes Training?';
      if (typeof scheduleCloudSync === 'function') scheduleCloudSync('username_changed', { immediate: true });
    }
    if (age) localStorage.setItem('sd_age', String(age));
    if (weapon) localStorage.setItem('sd_fav_weapon', weapon);
    localStorage.setItem(STORAGE_KEY, '1');

    if (_overlay) {
      _overlay.classList.add('ob-exit');
      setTimeout(() => { _overlay?.remove(); _overlay = null; }, 370);
    }

    // Schließe alten welcomeOverlay falls noch offen
    const wo = document.getElementById('welcomeOverlay');
    if (wo) wo.classList.remove('active');

    // Vollständige UI-Aktualisierung nach kurzer Verzögerung
    setTimeout(() => {
      // Re-render Start-Tab header (tab-navigation.js renders greeting dynamically)
      if (typeof switchTab === 'function') switchTab('start');
      else if (typeof refreshStateFromLocalStorage === 'function') refreshStateFromLocalStorage();

      // Lieblingsdisziplin-Badge direkt setzen (unabhängig von refreshProfilTab)
      if (weapon) {
        const label = weapon === 'lg' ? '🌬️ Luftgewehr' : '🎯 Kleinkaliber';
        const pill = `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.55);background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.22);border-radius:100px;padding:3px 10px;letter-spacing:0.02em;">${label}</span>`;
        ['psFavDisc', 'ptFavDisc'].forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.innerHTML = pill; el.style.display = ''; }
        });
      }
    }, 250);

    // Starte In-App Tutorial wenn noch nicht gemacht
    setTimeout(() => {
      if (typeof Tutorial !== 'undefined' && typeof Tutorial.startIfNew === 'function') {
        Tutorial.startIfNew();
      }
    }, 700);
  }

  // ── Public API ───────────────────────────────────────────────────────────
  window.Onboarding = {
    start() {
      if (isDone()) return;
      injectStyles();
      _step   = 1;
      _weapon = localStorage.getItem('sd_fav_weapon') || '';
      _overlay = document.createElement('div');
      _overlay.className = 'ob-overlay';
      document.body.appendChild(_overlay);
      render();
    },

    next() {
      if (_step === 1) {
        _step = 2;
        render();
      } else if (_step === 2) {
        if (!_weapon) return; // Karte muss ausgewählt sein
        _step = 3;
        render();
      } else if (_step === 3) {
        this.finish();
      }
    },

    selectWeapon(w) {
      _weapon = w;
      // Karten updaten ohne re-render
      const cards = document.querySelectorAll('.ob-disc-card');
      cards.forEach(c => c.classList.remove('selected'));
      const idx = w === 'lg' ? 0 : 1;
      if (cards[idx]) cards[idx].classList.add('selected');
      // Karten-Icon glow
      cards.forEach((c, i) => {
        const icon = c.querySelector('.ob-disc-icon');
        const name = c.querySelector('.ob-disc-name');
        if (i === idx) {
          if (icon) icon.style.filter = 'drop-shadow(0 0 8px rgba(34,197,94,.6))';
          if (name) name.style.color = '#4ade80';
        } else {
          if (icon) icon.style.filter = '';
          if (name) name.style.color = '#fff';
        }
      });
      const btn = document.getElementById('obNextBtn2');
      if (btn) btn.style.opacity = '1';
    },

    _syncBtn() {
      const name = document.getElementById('obName')?.value?.trim() || '';
      const btn  = document.getElementById('obFinishBtn');
      if (btn) btn.style.opacity = name.length >= 2 ? '1' : '.45';
    },

    finish() {
      if (_step === 3) {
        const nameEl = document.getElementById('obName');
        const ageEl  = document.getElementById('obAge');
        const name   = sanitizeName(nameEl?.value || '');
        const age    = parseInt(ageEl?.value || '0', 10);

        if (name.length < 2) {
          const err = document.getElementById('obNameErr');
          if (err) err.textContent = 'Bitte mindestens 2 Zeichen eingeben.';
          nameEl?.focus();
          return;
        }
        complete(name, age > 0 ? age : null, _weapon);
      } else {
        // Skip-Finish ohne Daten
        complete('', null, _weapon);
      }
    },

    skip() {
      localStorage.setItem(STORAGE_KEY, '1');
      if (_overlay) {
        _overlay.classList.add('ob-exit');
        setTimeout(() => { _overlay?.remove(); _overlay = null; }, 370);
      }
    },

    isDone,
  };

  // ── Autostart: zeige Onboarding wenn noch nicht gemacht ─────────────────
  function tryAutoStart() {
    if (isDone()) return;
    // Warte bis DOM bereit
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => Onboarding.start());
    } else {
      Onboarding.start();
    }
  }

  tryAutoStart();
})();
