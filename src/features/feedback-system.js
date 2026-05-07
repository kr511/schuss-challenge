/* ─── FEEDBACK SYSTEM ───────────────────────
 *
 * Feedback v2: Duell-Bewertung (Emoji + Tags + Kommentar) und
 * Legacy-Feedback-Screen. Abhängigkeiten: stats-storage.js,
 * StorageManager, G, scheduleCloudSync/showScreen/sanitizeUsername (app.js).
 */

const FEEDBACK_MIN_DUELS = 3;
const FEEDBACK_MAX_DUELS = 5;
let _feedbackPromptTimeout = null;

function getTotalDuels(stats = null) {
  const gs = stats || loadGameStats();
  return (gs.wins || 0) + (gs.losses || 0) + (gs.draws || 0);
}

function randomFeedbackInterval() {
  return FEEDBACK_MIN_DUELS + Math.floor(Math.random() * (FEEDBACK_MAX_DUELS - FEEDBACK_MIN_DUELS + 1));
}

function loadFeedbackMeta() {
  try { return JSON.parse(localStorage.getItem('sd_feedback_meta') || '{}'); }
  catch (e) { return {}; }
}

function saveFeedbackMeta(meta) {
  StorageManager.set('feedback_meta', meta);
  scheduleCloudSync('feedback_meta_changed');
}

function ensureFeedbackSchedule() {
  const totalDuels = getTotalDuels();
  const meta = loadFeedbackMeta();
  if (!Number.isInteger(meta.nextAt) || meta.nextAt <= 0) {
    meta.nextAt = totalDuels + randomFeedbackInterval();
    saveFeedbackMeta(meta);
  }
}

function shouldShowFeedback(totalDuels) {
  if (totalDuels < FEEDBACK_MIN_DUELS) return false;
  const meta = loadFeedbackMeta();
  if (!Number.isInteger(meta.nextAt) || meta.nextAt <= 0) {
    meta.nextAt = totalDuels + randomFeedbackInterval();
    saveFeedbackMeta(meta);
    return false;
  }
  return totalDuels >= meta.nextAt;
}

function scheduleNextFeedback(totalDuels) {
  const meta = loadFeedbackMeta();
  meta.lastPromptAt = totalDuels;
  meta.nextAt = totalDuels + randomFeedbackInterval();
  saveFeedbackMeta(meta);
}

function clearPendingFeedbackPrompt() {
  if (_feedbackPromptTimeout) {
    clearTimeout(_feedbackPromptTimeout);
    _feedbackPromptTimeout = null;
  }
}

function scheduleFeedbackPrompt(totalDuels) {
  clearPendingFeedbackPrompt();
  _feedbackPromptTimeout = setTimeout(() => {
    _feedbackPromptTimeout = null;
    const overScreen = document.getElementById('screenOver');
    if (!overScreen || !overScreen.classList.contains('active')) return;
    showFeedbackScreen(totalDuels);
  }, 800);
}

function showFeedbackScreen(totalDuels, duelData) {
  clearPendingFeedbackPrompt();
  if (DOM.feedbackCount) DOM.feedbackCount.textContent = `◆ DUELL #${totalDuels} ◆`;
  // If duel data provided, populate the v2 feedback screen
  if (duelData) {
    fbSetDuel(duelData);
  }
  showScreen('screenFeedback');
}

// ═══════════════════════════════════════════════
// FEEDBACK v2 – Duel Result + Emoji + Tags + Comment
// ═══════════════════════════════════════════════
let fbRating = null;
let fbTags = [];
let fbDuelData = null; // { discipline, opponent, result, score }

function fbSetDuel(data) {
  fbDuelData = data;
  fbRating = null;
  fbTags = [];
  const meta = FB_RESULT_META[data.result] || FB_RESULT_META.draw;
  // Result icon
  const iconEl = document.getElementById('fbResultIcon');
  if (iconEl) iconEl.innerHTML = meta.icon;
  // Title
  const titleEl = document.getElementById('fbResultTitle');
  const name = data.opponent || data.discipline;
  // XSS hardening: escape opponent/discipline name and status text; color is from static FB_RESULT_META.
  if (titleEl) titleEl.innerHTML = escHtml(name) + ' — <span style="color:' + escHtml(meta.color) + '">' + escHtml(meta.text) + '</span>';
  // Score
  const scoreEl = document.getElementById('fbResultScore');
  if (scoreEl) scoreEl.textContent = data.score || '';
  // Reset UI
  fbResetEmojiUI();
  fbResetTagsUI();
  document.getElementById('fbComment').value = '';
  fbUpdateCounter();
  fbUpdateSubmitBtn();
}

const FB_RESULT_META = {
  win: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26Z" fill="#39FF14"/></svg>', text: 'Sieg!', color: '#39FF14' },
  loss: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="#FF4444" stroke-width="3" stroke-linecap="round"/></svg>', text: 'Niederlage', color: '#FF4444' },
  draw: { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12H19" stroke="#FFAA00" stroke-width="3" stroke-linecap="round"/></svg>', text: 'Unentschieden', color: '#FFAA00' },
};

function fbSetRating(idx) {
  fbRating = idx;
  fbUpdateEmojiUI();
  fbUpdateSubmitBtn();
}

function fbUpdateEmojiUI() {
  document.querySelectorAll('.fb-emoji-item').forEach(el => {
    const i = parseInt(el.dataset.idx);
    const btn = el.querySelector('.fb-emoji-btn');
    const label = el.querySelector('span');
    if (i === fbRating) {
      btn.style.cssText = 'width:58px;height:58px;background:rgba(15,35,10,.8);border:2px solid #39FF14;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;transition:all .15s ease;';
      label.style.color = '#39FF14';
      label.style.fontWeight = '700';
    } else {
      btn.style.cssText = 'width:52px;height:52px;background:rgba(30,45,20,.6);border:1.5px solid rgba(122,176,48,.2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;';
      label.style.color = 'rgba(90,140,60,.5)';
      label.style.fontWeight = '600';
    }
  });
}

function fbResetEmojiUI() {
  fbRating = null;
  fbUpdateEmojiUI();
}

function fbToggleTag(el) {
  const tag = el.dataset.tag;
  if (fbTags.includes(tag)) {
    fbTags = fbTags.filter(t => t !== tag);
    el.style.cssText = 'background:rgba(30,45,20,.6);border:1px solid rgba(122,176,48,.2);color:rgba(122,176,48,.5);font-size:.75rem;font-weight:600;padding:7px 14px;border-radius:20px;cursor:pointer;';
  } else {
    fbTags.push(tag);
    el.style.cssText = 'background:rgba(15,35,10,.8);border:1px solid rgba(57,255,20,.35);color:#39FF14;font-size:.75rem;font-weight:600;padding:7px 14px;border-radius:20px;cursor:pointer;';
  }
}

function fbResetTagsUI() {
  fbTags = [];
  document.querySelectorAll('.fb-tag').forEach(el => {
    el.style.cssText = 'background:rgba(30,45,20,.6);border:1px solid rgba(122,176,48,.2);color:rgba(122,176,48,.5);font-size:.75rem;font-weight:600;padding:7px 14px;border-radius:20px;cursor:pointer;';
  });
}

function fbUpdateCounter() {
  const comment = document.getElementById('fbComment').value;
  const counter = document.getElementById('fbCounter');
  if (counter) counter.textContent = `${comment.length} / 300`;
}

function fbUpdateSubmitBtn() {
  const btn = document.getElementById('fbSubmitBtn');
  if (btn) {
    if (fbRating !== null) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    } else {
      btn.style.opacity = '.35';
      btn.style.pointerEvents = 'none';
    }
  }
}

function fbSubmit() {
  if (fbRating === null) return;
  const comment = document.getElementById('fbComment').value || '';
  const score = fbRating + 1; // 1-5 scale
  const totalDuels = getTotalDuels();

  // Sende vollständiges Feedback an Worker API (für Admin-Dashboard)
  const safeUsername = sanitizeUsername(G.username || 'Anonym');
  const userEmail = typeof StorageManager !== 'undefined' ? (StorageManager.getRaw('userEmail') || `${safeUsername}@schuss-challenge.local`) : `${safeUsername}@schuss-challenge.local`;
  const emojiLabels = ['😤 Schlecht', '😐 Okay', '😄 Gut', '🤩 Super', '🔥 Episch'];
  const tags = fbTags || [];

  // Duell-Ergebnis zusammenbauen
  const duelResult = fbDuelData || {};
  const resultTitle = duelResult.title || `${G.weapon || 'LG'} ${duelResult.result || 'Unbekannt'}`;
  const resultScore = duelResult.score || duelResult.myScore || 'N/A';

  fetch('https://schuss-challenge.eliaskummel.workers.dev/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      feedbackType: score >= 4 ? 'general' : score === 3 ? 'general' : 'bug',
      title: `${emojiLabels[fbRating] || 'Feedback'} - ${resultTitle}`,
      message: `⭐ Bewertung: ${score}/5 (${emojiLabels[fbRating] || 'N/A'})\n🏆 Duell: ${resultTitle}\n📊 Score: ${resultScore}\n🏷️ Tags: ${tags.length > 0 ? tags.join(', ') : 'Keine'}\n💬 Kommentar: ${comment || 'Keiner'}\n👤 Spieler: ${safeUsername}\n🔫 Waffe: ${G.weapon || 'N/A'}\n🎯 Disziplin: ${G.discipline || 'N/A'}`
    })
  }).catch(err => console.warn('Feedback an Worker fehlgeschlagen:', err));

  // Save to localStorage (compat with existing feedback system)
  let entries = [];
  try { entries = JSON.parse(localStorage.getItem('sd_feedback_entries') || '[]'); } catch (e) { entries = []; }
  if (!Array.isArray(entries)) entries = [];
  entries.unshift({ score, totalDuels, weapon: G.weapon, discipline: fbDuelData?.discipline || G.discipline, ts: Date.now(), tags: fbTags, comment });
  while (entries.length > 100) entries.pop();
  try { localStorage.setItem('sd_feedback_entries', JSON.stringify(entries)); } catch (e) { }

  console.log('[Feedback]', { rating: fbRating + 1, tags: fbTags, comment, duel: fbDuelData });

  // Thank you animation
  const card = document.getElementById('screenFeedback');
  if (card) {
    // Show brief thank you, then go back
    if (typeof Sounds !== 'undefined') Sounds.win();
    setTimeout(() => {
      scheduleNextFeedback(totalDuels);
      showScreen('screenSetup');
    }, 1500);
  }
}

function submitSiteFeedback(rating) {
  clearPendingFeedbackPrompt();
  const score = parseInt(rating);
  const totalDuels = getTotalDuels();

  // Sende Feedback an Worker API (für Admin-Dashboard)
  const safeUsername = sanitizeUsername(G.username || 'Anonym');
  const userEmail = typeof StorageManager !== 'undefined' ? (StorageManager.getRaw('userEmail') || `${safeUsername}@schuss-challenge.local`) : `${safeUsername}@schuss-challenge.local`;

  fetch('https://schuss-challenge.eliaskummel.workers.dev/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      feedbackType: 'general',
      title: `⭐ ${score}/5 Sterne - ${G.weapon || 'LG'} ${G.discipline || ''}`,
      message: `Score: ${score}/5\nWaffe: ${G.weapon || 'unknown'}\nDisziplin: ${G.discipline || 'unknown'}\nSchwierigkeit: ${G.diff || 'unknown'}\nSpieler: ${safeUsername}`
    })
  }).catch(err => console.warn('Feedback an Worker fehlgeschlagen:', err));

  if (Number.isInteger(score) && score >= 1 && score <= 5) {
    // ... (existing logic for saving)
    let entries = [];
    try {
      entries = JSON.parse(localStorage.getItem('sd_feedback_entries') || '[]');
      if (!Array.isArray(entries)) entries = [];
    } catch (e) { entries = []; }
    entries.unshift({
      score,
      totalDuels,
      weapon: G.weapon,
      discipline: G.discipline,
      ts: Date.now()
    });
    while (entries.length > 100) entries.pop();
    try { localStorage.setItem('sd_feedback_entries', JSON.stringify(entries)); } catch (e) { }

    {
      const safeUsername = sanitizeUsername(G.username || 'Anonym');
      const userHash = safeUsername
        ? safeUsername.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
          .toString(36).replace('-', 'n')
        : 'anon';
      const emojis = { 1: '😡', 2: '🙁', 3: '😐', 4: '🙂', 5: '🤩' };
      const entry = {
        score,
        emoji: emojis[score] || '?',
        totalDuels,
        weapon: G.weapon || 'unknown',
        discipline: G.discipline || 'unknown',
        diff: G.diff || 'unknown',
        username: safeUsername,
        userHash,
        uid: getCurrentAccountId(),
        accountId: getCurrentAccountId(),
        ts: Date.now(),
        date: new Date().toLocaleDateString('de-DE', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      };
      entry.key = String(entry.ts) + '_' + (getCurrentAccountId() || userHash);
      queueFeedbackEntry(entry);
    }

    // Show thank you message
    const card = document.querySelector('.fb-card');
    if (card) {
      card.innerHTML = `
            <div class="fb-title" style="color: #90d838;">DANKE! 🎉</div>
            <div class="fb-sub">Dein Feedback hilft uns sehr.</div>
            <div style="font-size: 4rem; margin: 20px 0;">🙌</div>
          `;
      if (typeof Sounds !== 'undefined') Sounds.win();
      setTimeout(() => {
        scheduleNextFeedback(totalDuels);
        showScreen('screenSetup');
      }, 2000);
      return;
    }
  }

  scheduleNextFeedback(totalDuels);
  showScreen('screenSetup');
  // Dashboard mit frischen Daten aktualisieren
  if (typeof refreshPremiumDashboard === 'function') setTimeout(refreshPremiumDashboard, 200);
}

function skipSiteFeedback() {
  clearPendingFeedbackPrompt();
  const totalDuels = getTotalDuels();
  scheduleNextFeedback(totalDuels);
  showScreen('screenSetup');
}

function queueFeedbackEntry(entry) {
  if (!entry || typeof entry !== 'object') return;
  const ownerId = getCurrentAccountId();
  const payload = { ...entry, uid: ownerId || entry.uid || '', username: sanitizeUsername(entry.username || G.username || 'Anonym'), accountId: ownerId || entry.accountId || '' };
  try {
    const entries = StorageManager.get('feedback_entries', []);
    const list = Array.isArray(entries) ? entries : [];
    list.unshift(payload);
    StorageManager.set('feedback_entries', list.slice(0, 100));
  } catch (error) {
    console.warn('[SupabaseSync] Feedback lokal konnte nicht gespeichert werden:', error?.message || error);
  }
}
