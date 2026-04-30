/**
 * Schnelltraining – 10-Schuss MVP-Flow.
 *
 * Ziel:
 *   App öffnen → ohne Account → 10-Schuss-Training wählen
 *   → Ergebnisse manuell eintragen → Gesamtpunkte/Ø/Tipp anzeigen
 *   → lokal speichern → Verlauf anzeigen.
 *
 * Vollständig lokal. Kein Supabase, kein Login nötig.
 * Nutzt StorageManager (sd_quick_training_log).
 *
 * Mount-Punkt im Dashboard: #quickTrainingMount.
 */
(function () {
  'use strict';

  const MOUNT_ID = 'quickTrainingMount';
  const STORAGE_KEY = 'quick_training_log';
  const HISTORY_LIMIT = 50;

  const STATE = {
    initialized: false,
    open: false,
    shots: 10, // anzahl der eingaben
    discipline: 'lg', // 'lg' (Luftgewehr 0–10.9) | 'kk' (Kleinkaliber 0–10.9)
  };

  function escHtml(input) {
    if (input === null || input === undefined) return '';
    return String(input)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;').replace(/\//g, '&#47;');
  }

  function getStorage() {
    return (typeof window !== 'undefined' && window.StorageManager) || null;
  }

  function readHistory() {
    const sm = getStorage();
    if (!sm) return [];
    const list = sm.get(STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function writeHistory(list) {
    const sm = getStorage();
    if (!sm) return false;
    return sm.set(STORAGE_KEY, list.slice(-HISTORY_LIMIT));
  }

  function parseShotInput(value) {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim().replace(',', '.');
    if (trimmed === '') return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    if (n < 0 || n > 10.9) return null;
    return Math.round(n * 10) / 10;
  }

  function computeStats(shots) {
    const valid = shots.filter((s) => Number.isFinite(s));
    if (valid.length === 0) {
      return { total: 0, avg: 0, best: null, worst: null, count: 0, missing: shots.length };
    }
    const total = valid.reduce((a, b) => a + b, 0);
    const avg = total / valid.length;
    const best = Math.max(...valid);
    const worst = Math.min(...valid);
    return {
      total: Math.round(total * 10) / 10,
      avg: Math.round(avg * 100) / 100,
      best,
      worst,
      count: valid.length,
      missing: shots.length - valid.length,
    };
  }

  function buildTip(stats, discipline) {
    if (stats.count === 0) return 'Trag deine Ringergebnisse ein und drücke „Auswerten“.';
    const tips = [];
    if (stats.avg >= 9.5) tips.push('Sehr stabiler Anschlag — halte die Routine bei.');
    else if (stats.avg >= 8.5) tips.push('Solide Gruppe. Achte besonders auf gleichmäßiges Abziehen.');
    else if (stats.avg >= 7) tips.push('Konstanz fehlt noch. Atemrhythmus und Druckpunkt prüfen.');
    else tips.push('Erstmal Ruhe, Stand und Sicherheit prüfen — Feinjustierung kommt danach.');
    if (stats.best - stats.worst >= 4) {
      tips.push('Große Streuung: einen Schuss in Ruhe analysieren, statt alle 10 zu wiederholen.');
    } else if (stats.best - stats.worst <= 1.5 && stats.count >= 5) {
      tips.push('Kleine Streuung — gute Reproduzierbarkeit.');
    }
    if (discipline === 'kk') {
      tips.push('KK: Gehörschutz und Standordnung beachten.');
    }
    return tips.join(' ');
  }

  function shotInputs() {
    const rows = [];
    for (let i = 0; i < STATE.shots; i++) {
      const idx = i + 1;
      rows.push(`<label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
        <span style="font-family:'DM Mono',monospace;font-size:0.7rem;color:rgba(255,255,255,0.4);width:1.6em;text-align:right;">${idx}.</span>
        <input data-qt-shot="${idx}" type="text" inputmode="decimal" autocomplete="off" placeholder="0.0–10.9"
          style="flex:1;min-width:0;background:transparent;color:#fff;border:none;outline:none;font-family:'DM Mono',monospace;font-size:0.95rem;padding:4px 2px;" />
      </label>`);
    }
    return rows.join('');
  }

  function renderHistoryRows() {
    const history = readHistory().slice().reverse();
    if (history.length === 0) {
      return `<div style="color:rgba(255,255,255,0.45);font-size:0.78rem;text-align:center;padding:10px 0;">
        Noch keine gespeicherten Trainings.
      </div>`;
    }
    return history.slice(0, 5).map((entry) => {
      const date = entry && entry.completed_at ? new Date(entry.completed_at) : null;
      const dateStr = date && !isNaN(date.getTime())
        ? `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}. ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
        : '–';
      const total = Number.isFinite(entry && entry.total) ? entry.total.toFixed(1) : '–';
      const avg = Number.isFinite(entry && entry.avg) ? entry.avg.toFixed(2) : '–';
      const count = Number.isFinite(entry && entry.count) ? entry.count : 0;
      const disc = entry && entry.discipline === 'kk' ? 'KK' : 'LG';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid #7ab030;font-size:0.78rem;">
        <div style="color:rgba(255,255,255,0.6);">${escHtml(dateStr)} · ${escHtml(disc)} · ${escHtml(count)} Schuss</div>
        <div style="color:#b4dc78;font-family:'DM Mono',monospace;">∑ ${escHtml(total)} · Ø ${escHtml(avg)}</div>
      </div>`;
    }).join('');
  }

  function renderClosed(host) {
    const last = readHistory().slice(-1)[0] || null;
    const lastSummary = last && Number.isFinite(last.total)
      ? `Letztes Training: ${last.total.toFixed(1)} Ringe (Ø ${Number(last.avg || 0).toFixed(2)})`
      : 'Noch kein lokales Training erfasst.';
    host.innerHTML = `
      <div style="background:linear-gradient(145deg, rgba(50,55,60,0.4) 0%, rgba(15,18,20,0.85) 100%);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:14px 14px;box-shadow:0 8px 28px rgba(0,0,0,0.45);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <div>
            <div style="font-size:1.05rem;font-weight:700;color:#fff;">📝 Schnelltraining</div>
            <div style="font-size:0.72rem;color:rgba(255,255,255,0.55);">10 Schuss manuell eintragen — funktioniert ohne Login.</div>
          </div>
          <button type="button" data-qt-toggle="open"
            style="background:linear-gradient(135deg,#7ab030 0%,#5a9020 100%);color:#0a1a06;border:1px solid rgba(122,176,48,0.6);border-radius:12px;padding:10px 14px;font-weight:700;font-size:0.85rem;cursor:pointer;min-height:44px;">
            Training starten
          </button>
        </div>
        <div style="margin-top:8px;font-size:0.78rem;color:rgba(255,255,255,0.55);">
          ${escHtml(lastSummary)}
        </div>
      </div>
    `;
    host.querySelector('[data-qt-toggle="open"]').addEventListener('click', () => {
      STATE.open = true;
      render();
    });
  }

  function renderOpen(host) {
    host.innerHTML = `
      <div style="background:linear-gradient(145deg, rgba(50,55,60,0.4) 0%, rgba(15,18,20,0.85) 100%);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:14px 14px;box-shadow:0 8px 28px rgba(0,0,0,0.45);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div>
            <div style="font-size:1.05rem;font-weight:700;color:#fff;">📝 Schnelltraining</div>
            <div style="font-size:0.72rem;color:rgba(255,255,255,0.55);">Ringergebnisse pro Schuss eintragen (0.0 – 10.9).</div>
          </div>
          <button type="button" data-qt-toggle="close"
            style="background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:10px;width:36px;height:36px;cursor:pointer;font-size:1.1rem;line-height:1;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>

        <div style="display:flex;gap:6px;margin:10px 0 12px;flex-wrap:wrap;">
          ${[
            { id: 'lg', label: 'Luftgewehr' },
            { id: 'kk', label: 'Kleinkaliber' },
          ].map((d) => {
            const active = STATE.discipline === d.id;
            const bg = active ? 'rgba(122,176,48,0.18)' : 'rgba(255,255,255,0.04)';
            const border = active ? '1px solid rgba(122,176,48,0.55)' : '1px solid rgba(255,255,255,0.08)';
            const color = active ? '#b4dc78' : 'rgba(255,255,255,0.7)';
            return `<button type="button" data-qt-disc="${d.id}"
              style="background:${bg};border:${border};color:${color};border-radius:999px;padding:6px 12px;font-size:0.78rem;font-weight:600;cursor:pointer;">
              ${escHtml(d.label)}
            </button>`;
          }).join('')}
          <span style="margin-left:auto;font-size:0.72rem;color:rgba(255,255,255,0.45);align-self:center;">${STATE.shots} Schuss</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">${shotInputs()}</div>

        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button type="button" data-qt-action="evaluate"
            style="flex:1;min-width:140px;background:linear-gradient(135deg,#7ab030 0%,#5a9020 100%);color:#0a1a06;border:1px solid rgba(122,176,48,0.6);border-radius:12px;padding:11px 12px;font-weight:700;font-size:0.88rem;cursor:pointer;min-height:44px;">
            Auswerten &amp; speichern
          </button>
          <button type="button" data-qt-action="reset"
            style="background:rgba(255,255,255,0.05);color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:11px 14px;font-weight:600;font-size:0.85rem;cursor:pointer;min-height:44px;">
            Felder leeren
          </button>
        </div>

        <div data-qt-result style="margin-top:12px;font-size:0.85rem;color:rgba(255,255,255,0.85);min-height:1em;"></div>

        <div style="margin-top:14px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.1);">
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.6);margin-bottom:6px;font-weight:600;">Letzte Trainings (lokal)</div>
          <div data-qt-history style="display:flex;flex-direction:column;gap:6px;">${renderHistoryRows()}</div>
        </div>

        <div style="margin-top:10px;font-size:0.7rem;color:rgba(255,255,255,0.4);">
          Wird ausschließlich auf diesem Gerät gespeichert. Kein Account nötig.
        </div>
      </div>
    `;
    bindOpenEvents(host);
  }

  function bindOpenEvents(host) {
    const closeBtn = host.querySelector('[data-qt-toggle="close"]');
    if (closeBtn) closeBtn.addEventListener('click', () => { STATE.open = false; render(); });

    host.querySelectorAll('[data-qt-disc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        STATE.discipline = btn.getAttribute('data-qt-disc') || 'lg';
        render();
      });
    });

    const evaluateBtn = host.querySelector('[data-qt-action="evaluate"]');
    if (evaluateBtn) evaluateBtn.addEventListener('click', () => onEvaluate(host));

    const resetBtn = host.querySelector('[data-qt-action="reset"]');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      host.querySelectorAll('[data-qt-shot]').forEach((inp) => { inp.value = ''; });
      const r = host.querySelector('[data-qt-result]');
      if (r) r.innerHTML = '';
    });
  }

  function readShotsFromInputs(host) {
    const out = [];
    let bad = 0;
    host.querySelectorAll('[data-qt-shot]').forEach((inp) => {
      const v = parseShotInput(inp.value);
      if (v === null && inp.value && inp.value.trim() !== '') {
        bad += 1;
        inp.style.borderColor = 'rgba(255,80,80,0.5)';
      } else {
        inp.style.borderColor = '';
      }
      out.push(v);
    });
    return { values: out, badInputs: bad };
  }

  function onEvaluate(host) {
    const { values, badInputs } = readShotsFromInputs(host);
    const result = host.querySelector('[data-qt-result]');
    if (!result) return;

    if (badInputs > 0) {
      result.innerHTML = `<div style="color:#ffb4b4;">⚠️ ${badInputs} Eingaben sind außerhalb von 0.0 – 10.9. Bitte korrigieren.</div>`;
      return;
    }

    const stats = computeStats(values);
    if (stats.count === 0) {
      result.innerHTML = `<div style="color:rgba(255,255,255,0.7);">Trag mindestens einen Schuss ein.</div>`;
      return;
    }

    const tip = buildTip(stats, STATE.discipline);

    const entry = {
      completed_at: new Date().toISOString(),
      discipline: STATE.discipline,
      shots: values.map((v) => (Number.isFinite(v) ? v : null)),
      total: stats.total,
      avg: stats.avg,
      best: stats.best,
      worst: stats.worst,
      count: stats.count,
    };

    const history = readHistory();
    history.push(entry);
    const saved = writeHistory(history);

    const savedLine = saved
      ? '✅ Lokal gespeichert.'
      : '⚠️ Konnte nicht gespeichert werden (Speicher voll oder gesperrt).';

    result.innerHTML = `
      <div style="background:rgba(122,176,48,0.08);border:1px solid rgba(122,176,48,0.35);border-radius:10px;padding:10px 12px;">
        <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:0.92rem;color:#fff;">
          <div><span style="color:rgba(255,255,255,0.55);font-size:0.72rem;">Gesamt</span><br><strong>${escHtml(stats.total.toFixed(1))}</strong></div>
          <div><span style="color:rgba(255,255,255,0.55);font-size:0.72rem;">Durchschnitt</span><br><strong>${escHtml(stats.avg.toFixed(2))}</strong></div>
          <div><span style="color:rgba(255,255,255,0.55);font-size:0.72rem;">Bester</span><br><strong>${escHtml(stats.best.toFixed(1))}</strong></div>
          <div><span style="color:rgba(255,255,255,0.55);font-size:0.72rem;">Schwächster</span><br><strong>${escHtml(stats.worst.toFixed(1))}</strong></div>
          <div><span style="color:rgba(255,255,255,0.55);font-size:0.72rem;">Eingaben</span><br><strong>${escHtml(stats.count)}/${STATE.shots}</strong></div>
        </div>
        <div style="margin-top:8px;font-size:0.82rem;color:#cdebd0;">💡 ${escHtml(tip)}</div>
        <div style="margin-top:6px;font-size:0.74rem;color:rgba(255,255,255,0.55);">${escHtml(savedLine)}</div>
      </div>
    `;

    const histEl = host.querySelector('[data-qt-history]');
    if (histEl) histEl.innerHTML = renderHistoryRows();

    try {
      window.dispatchEvent(new CustomEvent('quickTrainingSaved', { detail: { entry } }));
    } catch (_e) { /* noop */ }
  }

  function render() {
    const host = document.getElementById(MOUNT_ID);
    if (!host) return;
    if (STATE.open) renderOpen(host);
    else renderClosed(host);
  }

  function init() {
    if (STATE.initialized) return;
    STATE.initialized = true;
    render();
  }

  function bootstrap() {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  }

  window.QuickTraining = Object.freeze({
    render,
    readHistory,
    _state: STATE,
  });

  bootstrap();

  try {
    window.dispatchEvent(new CustomEvent('featureReady', { detail: { name: 'quickTraining' } }));
  } catch (_e) { /* noop */ }
})();
