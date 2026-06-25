/**
 * Multiplayer Flow v1.0
 * Score-Eingabe-Screens für asynchrone Freund-Duelle (kein Bot).
 */
const MultiplayerFlow = (function () {
  'use strict';

  const WEAPON_LABELS = { lg: 'Luftgewehr', kk: 'Kleinkaliber' };
  const DISC_SHORT = {
    lg40: 'LG 40',
    lg60: 'LG 60',
    kk50: 'KK 50m',
    kk100: 'KK 100m',
    kk3x20: 'KK 3×20'
  };

  let _overlay = null;

  function escapeHtml(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function haptic(type) {
    try {
      if (window.MobileResponsive && typeof window.MobileResponsive.triggerHaptic === 'function') {
        window.MobileResponsive.triggerHaptic(type || 'light');
      }
    } catch (_e) { /* ignore */ }
  }

  function close() {
    if (_overlay) {
      _overlay.classList.remove('mp-visible');
      const node = _overlay;
      setTimeout(() => { if (node.parentNode) node.parentNode.removeChild(node); }, 280);
      _overlay = null;
    }
  }

  function showFormError(overlay, msg) {
    const el = overlay.querySelector('.mp-error');
    if (el) { el.textContent = escapeHtml(msg); el.style.display = 'block'; }
  }

  function hideFormError(overlay) {
    const el = overlay.querySelector('.mp-error');
    if (el) el.style.display = 'none';
  }

  function injectStyles() {
    if (document.getElementById('mpFlowStyles')) return;
    const s = document.createElement('style');
    s.id = 'mpFlowStyles';
    s.textContent = `
      .mp-overlay{position:fixed;inset:0;z-index:19000;background:rgba(0,0,0,.88);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .28s;padding:20px;box-sizing:border-box;}
      .mp-overlay.mp-visible{opacity:1;}
      .mp-card{background:linear-gradient(160deg,#1a2330,#111820);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:28px 24px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.7);}
      .mp-header{font-size:.72rem;font-weight:900;letter-spacing:.13em;color:#7ab030;margin-bottom:18px;text-align:center;}
      .mp-to-label{font-size:.7rem;color:rgba(230,238,244,.45);text-align:center;margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em;}
      .mp-friend-badge{text-align:center;margin-bottom:14px;}
      .mp-friend-name{display:inline-block;background:rgba(0,195,255,.1);color:#00c3ff;border:1px solid rgba(0,195,255,.28);padding:5px 16px;border-radius:20px;font-size:.9rem;font-weight:800;}
      .mp-meta-row{display:flex;gap:8px;justify-content:center;margin-bottom:18px;flex-wrap:wrap;}
      .mp-badge{background:rgba(122,176,48,.13);color:#7ab030;border:1px solid rgba(122,176,48,.32);padding:4px 12px;border-radius:20px;font-size:.7rem;font-weight:700;letter-spacing:.06em;}
      .mp-opp-box{text-align:center;margin-bottom:18px;padding:14px;background:rgba(255,255,255,.04);border-radius:12px;}
      .mp-opp-waiting-label{font-size:.68rem;color:rgba(230,238,244,.42);margin-bottom:3px;text-transform:uppercase;letter-spacing:.07em;}
      .mp-opp-name{font-size:.95rem;font-weight:800;color:#e6eef4;margin-bottom:6px;}
      .mp-opp-score{font-size:2rem;font-weight:900;color:#00c3ff;line-height:1;}
      .mp-opp-unit{font-size:.75rem;color:rgba(0,195,255,.65);margin-top:2px;}
      .mp-input-label{font-size:.68rem;font-weight:700;color:rgba(230,238,244,.55);letter-spacing:.09em;text-transform:uppercase;margin-bottom:8px;}
      .mp-input-row{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
      .mp-score-input{flex:1;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.18);border-radius:10px;padding:13px 14px;font-size:1.6rem;font-weight:900;color:#e6eef4;outline:none;text-align:center;width:0;min-width:0;-moz-appearance:textfield;}
      .mp-score-input::-webkit-inner-spin-button,.mp-score-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
      .mp-score-input:focus{border-color:#7ab030;box-shadow:0 0 0 2px rgba(122,176,48,.2);}
      .mp-input-unit{color:rgba(230,238,244,.45);font-size:.78rem;font-weight:700;white-space:nowrap;}
      .mp-error{color:#ff6b6b;font-size:.76rem;font-weight:700;margin-bottom:8px;padding:8px 12px;background:rgba(255,60,60,.1);border-radius:8px;border:1px solid rgba(255,60,60,.2);}
      .mp-submit-btn{width:100%;background:linear-gradient(135deg,#7ab030,#5d8a22);border:none;border-radius:12px;padding:14px;font-size:.82rem;font-weight:900;letter-spacing:.1em;color:#fff;cursor:pointer;margin-top:14px;transition:opacity .2s,transform .1s;}
      .mp-submit-btn:active{transform:scale(.97);}
      .mp-submit-btn:disabled{opacity:.45;cursor:not-allowed;}
      .mp-secondary-btn{width:100%;background:transparent;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:11px;font-size:.76rem;font-weight:700;color:rgba(230,238,244,.45);cursor:pointer;margin-top:8px;transition:border-color .2s;}
      .mp-secondary-btn:hover{border-color:rgba(255,255,255,.25);}
      .mp-waiting-box{text-align:center;padding:22px 0 10px;}
      .mp-waiting-icon{font-size:2.4rem;margin-bottom:12px;}
      .mp-waiting-msg{font-size:.8rem;color:rgba(230,238,244,.55);margin-bottom:5px;}
      .mp-waiting-friend{font-size:1.1rem;font-weight:800;color:#e6eef4;margin-bottom:12px;}
      .mp-waiting-disc{display:inline-block;background:rgba(122,176,48,.12);color:#7ab030;border:1px solid rgba(122,176,48,.3);padding:4px 14px;border-radius:20px;font-size:.7rem;font-weight:700;margin-bottom:12px;}
      .mp-waiting-score{font-size:.82rem;color:rgba(230,238,244,.5);}
      .mp-score-form{margin-top:2px;}
    `;
    document.head.appendChild(s);
  }

  /**
   * User A: Score-Eingabe-Screen nach Setup (Freund + Waffe + Disziplin)
   */
  function showResultEntry(config) {
    injectStyles();
    close();

    const { friendId, friendUsername, weapon, discipline, distance, shots } = config;
    const wLabel = escapeHtml(WEAPON_LABELS[weapon] || weapon);
    const dLabel = escapeHtml(DISC_SHORT[discipline] || discipline);
    const safeFriend = escapeHtml(friendUsername || 'Freund');
    const maxScore = (Number(shots) || 40) * 10;

    const overlay = document.createElement('div');
    overlay.className = 'mp-overlay';
    overlay.innerHTML = `
      <div class="mp-card">
        <div class="mp-header">⚔️ MULTIPLAYER-DUELL</div>
        <div class="mp-to-label">Herausforderung an</div>
        <div class="mp-friend-badge"><span class="mp-friend-name">${safeFriend}</span></div>
        <div class="mp-meta-row">
          <span class="mp-badge">${wLabel}</span>
          <span class="mp-badge">${dLabel}</span>
        </div>
        <form class="mp-score-form" onsubmit="return false">
          <div class="mp-input-label">Dein Endergebnis:</div>
          <div class="mp-input-row">
            <input class="mp-score-input" type="number" min="0" max="${maxScore}" placeholder="Ringe" inputmode="numeric" autocomplete="off">
            <span class="mp-input-unit">Ringe</span>
          </div>
          <div class="mp-error" style="display:none"></div>
          <button class="mp-submit-btn" type="submit">ABSENDEN</button>
        </form>
        <button class="mp-secondary-btn" onclick="MultiplayerFlow.close()">ABBRECHEN</button>
      </div>
    `;

    document.body.appendChild(overlay);
    _overlay = overlay;
    setTimeout(() => overlay.classList.add('mp-visible'), 10);

    const input = overlay.querySelector('.mp-score-input');
    if (input) setTimeout(() => input.focus(), 300);

    overlay.querySelector('.mp-score-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFormError(overlay);
      const raw = overlay.querySelector('.mp-score-input').value.trim();
      const score = parseInt(raw, 10);
      if (raw === '' || isNaN(score) || score < 0 || score > maxScore) {
        showFormError(overlay, `Bitte gib eine gültige Ringe-Zahl ein (0 – ${maxScore})`);
        return;
      }
      await _submitUserA({ friendId, friendUsername, weapon, discipline, distance, shots }, score, overlay);
    });

    haptic('medium');
  }

  async function _submitUserA(config, score, overlay) {
    const btn = overlay.querySelector('.mp-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sende…'; }

    if (!window.SupabaseSocial || typeof window.SupabaseSocial.createChallenge !== 'function') {
      showFormError(overlay, 'Bitte melde dich an, um Challenges zu senden');
      if (btn) { btn.disabled = false; btn.textContent = 'ABSENDEN'; }
      return;
    }

    try {
      const settings = {
        discipline: config.discipline,
        weapon: config.weapon,
        distance: config.distance,
        shots: Number(config.shots) || 40,
        difficulty: null,
        burst: false
      };
      const res = await window.SupabaseSocial.createChallenge(config.friendId, settings);
      if (!res || !res.ok || !res.challenge) throw new Error('Challenge-Erstellung fehlgeschlagen');

      await window.SupabaseSocial.submitChallengeResult(res.challenge.id, score, []);

      _showWaitingScreen(overlay, config, score);
      haptic('strong');
    } catch (err) {
      console.error('[MultiplayerFlow] _submitUserA error:', err);
      showFormError(overlay, 'Fehler beim Senden – bitte erneut versuchen.');
      if (btn) { btn.disabled = false; btn.textContent = 'ABSENDEN'; }
    }
  }

  function _showWaitingScreen(overlay, config, myScore) {
    const wLabel = escapeHtml(WEAPON_LABELS[config.weapon] || config.weapon);
    const dLabel = escapeHtml(DISC_SHORT[config.discipline] || config.discipline);
    const safeFriend = escapeHtml(config.friendUsername || 'Freund');

    overlay.querySelector('.mp-card').innerHTML = `
      <div class="mp-header">⚔️ CHALLENGE GESENDET!</div>
      <div class="mp-waiting-box">
        <div class="mp-waiting-icon">⏳</div>
        <div class="mp-waiting-msg">Warte auf Endergebnis von</div>
        <div class="mp-waiting-friend">${safeFriend}</div>
        <div class="mp-waiting-disc">${wLabel} · ${dLabel}</div>
        <div class="mp-waiting-score">Dein Ergebnis: <b>${escapeHtml(String(myScore))} Ringe</b></div>
      </div>
      <button class="mp-secondary-btn" onclick="MultiplayerFlow.close()">SCHLIESSEN</button>
    `;
  }

  /**
   * User B: Challenge-Detail + eigenes Ergebnis eintragen
   * @param {object} challenge  — mapSupabaseChallenge result (mit .challengeId, .creatorUsername etc.)
   * @param {number|null} creatorScore — bereits eingereichtes Ergebnis von User A (oder null)
   */
  function showPendingChallenge(challenge, creatorScore) {
    injectStyles();
    close();

    const shots = Number(challenge.shots) || 40;
    const maxScore = shots * 10;
    const wLabel = escapeHtml(WEAPON_LABELS[challenge.weapon] || challenge.weapon || '');
    const dLabel = escapeHtml(DISC_SHORT[challenge.discipline] || challenge.discipline || '');
    const safeCreator = escapeHtml(challenge.creatorUsername || challenge.fromUsername || 'Spieler');
    const creatorUpper = escapeHtml((challenge.creatorUsername || challenge.fromUsername || 'Spieler').toUpperCase());

    const oppScoreHtml = (creatorScore !== null && creatorScore !== undefined)
      ? `<div class="mp-opp-box">
           <div class="mp-opp-waiting-label">Warte auf Endergebnis von</div>
           <div class="mp-opp-name">${safeCreator}</div>
           <div class="mp-opp-score">${escapeHtml(String(creatorScore))}</div>
           <div class="mp-opp-unit">Ringe</div>
         </div>`
      : `<div class="mp-opp-box">
           <div class="mp-opp-waiting-label">Warte auf Endergebnis von</div>
           <div class="mp-opp-name">${safeCreator}</div>
         </div>`;

    const overlay = document.createElement('div');
    overlay.className = 'mp-overlay';
    overlay.innerHTML = `
      <div class="mp-card">
        <div class="mp-header">⚔️ CHALLENGE VON ${creatorUpper}</div>
        <div class="mp-meta-row">
          <span class="mp-badge">${wLabel}</span>
          <span class="mp-badge">${dLabel}</span>
        </div>
        ${oppScoreHtml}
        <form class="mp-score-form" onsubmit="return false">
          <div class="mp-input-label">Dein Endergebnis:</div>
          <div class="mp-input-row">
            <input class="mp-score-input" type="number" min="0" max="${maxScore}" placeholder="Ringe" inputmode="numeric" autocomplete="off">
            <span class="mp-input-unit">Ringe</span>
          </div>
          <div class="mp-error" style="display:none"></div>
          <button class="mp-submit-btn" type="submit">EINREICHEN</button>
        </form>
        <button class="mp-secondary-btn" onclick="MultiplayerFlow.close()">ABLEHNEN</button>
      </div>
    `;

    document.body.appendChild(overlay);
    _overlay = overlay;
    setTimeout(() => overlay.classList.add('mp-visible'), 10);

    const input = overlay.querySelector('.mp-score-input');
    if (input) setTimeout(() => input.focus(), 300);

    overlay.querySelector('.mp-score-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFormError(overlay);
      const raw = overlay.querySelector('.mp-score-input').value.trim();
      const score = parseInt(raw, 10);
      if (raw === '' || isNaN(score) || score < 0 || score > maxScore) {
        showFormError(overlay, `Bitte gib eine gültige Ringe-Zahl ein (0 – ${maxScore})`);
        return;
      }
      await _submitUserB(challenge, score, overlay);
    });

    haptic('medium');
  }

  async function _submitUserB(challenge, score, overlay) {
    const btn = overlay.querySelector('.mp-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Einreichen…'; }

    if (typeof AsyncChallenge === 'undefined') {
      showFormError(overlay, 'System-Fehler: AsyncChallenge nicht geladen.');
      if (btn) { btn.disabled = false; btn.textContent = 'EINREICHEN'; }
      return;
    }

    try {
      const ok = await AsyncChallenge.submitResult(score, []);
      if (!ok) throw new Error('Ergebnis konnte nicht gespeichert werden');

      const challengeId = challenge.challengeId || challenge.id;
      close();
      await AsyncChallenge.compareResults(challengeId, score);
      haptic('strong');
    } catch (err) {
      console.error('[MultiplayerFlow] _submitUserB error:', err);
      showFormError(overlay, 'Fehler beim Einreichen – bitte erneut versuchen.');
      if (btn) { btn.disabled = false; btn.textContent = 'EINREICHEN'; }
    }
  }

  const api = { showResultEntry, showPendingChallenge, close };
  window.MultiplayerFlow = api;
  return api;
})();
