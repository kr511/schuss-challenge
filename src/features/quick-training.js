/**
 * Schnelltraining - 10-Schuss Training V1.
 *
 * Lokal-first, ohne Login und offline nutzbar.
 * Optionaler Supabase-Sync, falls eingeloggt und erreichbar.
 * StorageManager-Key: quick_training_log -> localStorage-Key sd_quick_training_log.
 */
(function () {
  'use strict';

  const MOUNT_ID = 'quickTrainingMount';
  const STORAGE_KEY = 'quick_training_log';
  const HISTORY_LIMIT = 50;
  const HISTORY_TOP = 5;
  const HISTORY_EXPANDED = 20;

  const STATE = {
    initialized: false,
    open: false,
    shots: 10,
    discipline: 'lg',
    expandedHistory: false,
    pendingFlushTried: false,
    syncingLocalId: null,
    saving: false,
  };

  function escHtml(input) {
    if (input === null || input === undefined) return '';
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;')
      .replace(/\//g, '&#47;');
  }

  function newLocalId() {
    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 8);
    return 'qt_' + ts + '_' + rnd;
  }

  function getStorageManager() {
    if (typeof StorageManager !== 'undefined'
      && StorageManager
      && typeof StorageManager.get === 'function'
      && typeof StorageManager.set === 'function') {
      return StorageManager;
    }
    if (window.StorageManager
      && typeof window.StorageManager.get === 'function'
      && typeof window.StorageManager.set === 'function') {
      return window.StorageManager;
    }
    return null;
  }

  function migrateEntry(entry) {
    if (!entry || typeof entry !== 'object') return entry;
    if (!entry.local_id) entry.local_id = newLocalId();
    if (!entry.syncStatus) entry.syncStatus = 'local';
    if (!('remote_session_id' in entry)) entry.remote_session_id = null;
    return entry;
  }

  function readHistory() {
    try {
      const sm = getStorageManager();
      let list;
      if (sm) {
        list = sm.get(STORAGE_KEY, []);
      } else {
        const raw = window.localStorage && window.localStorage.getItem('sd_' + STORAGE_KEY);
        list = raw ? JSON.parse(raw) : [];
      }
      if (!Array.isArray(list)) return [];
      return list.map(migrateEntry);
    } catch (err) {
      console.warn('[QuickTraining] Verlauf konnte nicht gelesen werden:', err);
      return [];
    }
  }

  function writeHistory(list) {
    const next = Array.isArray(list) ? list.slice(-HISTORY_LIMIT) : [];
    try {
      const sm = getStorageManager();
      if (sm) {
        return sm.set(STORAGE_KEY, next) === true;
      }
      if (!window.localStorage) return false;
      window.localStorage.setItem('sd_' + STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch (err) {
      console.warn('[QuickTraining] Verlauf konnte nicht gespeichert werden:', err);
      return false;
    }
  }

  function updateHistoryEntry(localId, patch) {
    const history = readHistory();
    let changed = false;
    for (let i = 0; i < history.length; i += 1) {
      if (history[i] && history[i].local_id === localId) {
        Object.assign(history[i], patch);
        changed = true;
        break;
      }
    }
    if (changed) writeHistory(history);
    return changed;
  }

  function parseShotInput(value) {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim().replace(',', '.');
    if (trimmed === '') return null;
    if (!/^\d{1,2}(\.\d)?$/.test(trimmed)) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 10.9) return null;
    return Math.round(n * 10) / 10;
  }

  function computeStats(shots) {
    const valid = shots.filter((s) => Number.isFinite(s));
    if (!valid.length) {
      return { total: 0, avg: 0, best: null, worst: null, count: 0, missing: shots.length };
    }
    const total = valid.reduce((sum, shot) => sum + shot, 0);
    return {
      total: Math.round(total * 10) / 10,
      avg: Math.round((total / valid.length) * 100) / 100,
      best: Math.max(...valid),
      worst: Math.min(...valid),
      count: valid.length,
      missing: shots.length - valid.length,
    };
  }

  function buildTip(stats, discipline) {
    if (stats.avg >= 9.5) return 'Sehr stabil. Fokus auf gleiche Routine statt mehr Tempo.';
    if (stats.avg >= 8.5) return 'Solide Serie. Achte beim naechsten Block auf ruhigen Druckpunkt.';
    if (discipline === 'kk') return 'KK: Standordnung, Aufsicht und Gehoerschutz im Blick behalten.';
    return 'Erst Stand, Atmung und sauberes Abziehen stabilisieren, dann Tempo erhoehen.';
  }

  function buildRecommendation(stats) {
    if (!stats || !Number.isFinite(stats.avg) || stats.count < 1) return '';
    if (stats.avg < 7.5) return 'Empfehlung: Grundroutine - Stand, Atmung, ruhiger Druckpunkt.';
    if (stats.count >= 10
      && Number.isFinite(stats.best) && Number.isFinite(stats.worst)
      && (stats.best - stats.worst) >= 3.0) {
      return 'Empfehlung: Konstanz-Drill - 3x5 Schuss mit kurzer Pause dazwischen.';
    }
    if (stats.avg >= 9.0) return 'Empfehlung: Solide Serie - Ziel ist, dieselbe Routine zu wiederholen.';
    return '';
  }

  function formatDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '-';
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function syncBadge(status) {
    if (status === 'synced') return { sym: '✓', label: 'Online synchronisiert', color: '#7ad27a' };
    if (status === 'pending') return { sym: '↻', label: 'Sync ausstehend', color: '#ffd27a' };
    return { sym: '●', label: 'Lokal gespeichert', color: 'rgba(255,255,255,0.5)' };
  }

  function getSupabase() {
    try {
      if (window.SupabaseAuth && window.SupabaseAuth.client) return window.SupabaseAuth.client;
    } catch (_e) { /* noop */ }
    return null;
  }

  function getUserId() {
    try {
      const session = window.SupabaseAuth && typeof window.SupabaseAuth.getSession === 'function'
        ? window.SupabaseAuth.getSession()
        : (window.SupabaseSession || null);
      return (session && session.user && session.user.id) || null;
    } catch (_e) {
      return null;
    }
  }

  function disciplineToRemote(d) {
    return d === 'kk' ? 'kk50' : 'lg40';
  }

  function setSavingUi(host, saving) {
    const btn = host && host.querySelector('[data-qt-action="evaluate"]');
    if (!btn) return;
    btn.disabled = !!saving;
    btn.style.opacity = saving ? '0.72' : '1';
    btn.style.cursor = saving ? 'wait' : 'pointer';
    btn.textContent = saving ? 'Speichere…' : 'Auswerten und speichern';
  }

  // TODO: Wenn `local_id` als echte Spalte in `training_results` ergaenzt wird
  // (additive Migration), kann der `notes`-Marker durch die echte Spalte ersetzt werden.
  async function trySupabaseSync(entry) {
    const supabase = getSupabase();
    const userId = getUserId();
    if (!supabase || !userId || !entry || !entry.local_id) return false;
    if (entry.syncStatus === 'synced') return true;

    try {
      // Dedup-Check: gibt es bereits ein training_results mit diesem local_id-Marker?
      const marker = 'qt:' + entry.local_id;
      const existing = await supabase
        .from('training_results')
        .select('id, session_id')
        .eq('user_id', userId)
        .like('notes', marker)
        .limit(1);
      if (existing && Array.isArray(existing.data) && existing.data.length > 0) {
        const remote = existing.data[0];
        updateHistoryEntry(entry.local_id, {
          syncStatus: 'synced',
          remote_session_id: remote.session_id || null,
        });
        return true;
      }

      const sessionRes = await supabase
        .from('training_sessions')
        .insert({
          user_id: userId,
          discipline: disciplineToRemote(entry.discipline),
          weapon: entry.discipline === 'kk' ? 'kk' : 'lg',
          shots: Number.isFinite(entry.count) ? entry.count : 10,
          mode: 'training',
          completed_at: entry.completed_at || new Date().toISOString(),
        })
        .select('id')
        .single();
      if (sessionRes.error || !sessionRes.data || !sessionRes.data.id) {
        updateHistoryEntry(entry.local_id, { syncStatus: 'pending' });
        return false;
      }
      const sessionId = sessionRes.data.id;

      const resultsRes = await supabase
        .from('training_results')
        .insert({
          session_id: sessionId,
          user_id: userId,
          score: entry.total,
          average: entry.avg,
          best_series: entry.best,
          worst_series: entry.worst,
          manual_corrected: true,
          photo_used: false,
          notes: marker,
        });
      if (resultsRes.error) {
        // Session ist da, Result fehlte - markiere pending, beim Retry greift Dedup-Check.
        updateHistoryEntry(entry.local_id, { syncStatus: 'pending', remote_session_id: sessionId });
        return false;
      }

      updateHistoryEntry(entry.local_id, {
        syncStatus: 'synced',
        remote_session_id: sessionId,
      });
      return true;
    } catch (err) {
      console.warn('[QuickTraining] Supabase-Sync fehlgeschlagen:', err);
      updateHistoryEntry(entry.local_id, { syncStatus: 'pending' });
      return false;
    }
  }

  function renderHistoryRows() {
    const all = readHistory().slice().reverse();
    if (!all.length) {
      return '<div style="color:rgba(255,255,255,0.5);font-size:0.78rem;text-align:center;padding:10px 0;">Noch keine gespeicherten Trainings.</div>';
    }
    const limit = STATE.expandedHistory ? HISTORY_EXPANDED : HISTORY_TOP;
    const visible = all.slice(0, limit);
    const moreCount = all.length - visible.length;
    const rows = visible.map((entry) => {
      const total = Number.isFinite(entry && entry.total) ? Number(entry.total).toFixed(1) : '-';
      const avg = Number.isFinite(entry && entry.avg) ? Number(entry.avg).toFixed(2) : '-';
      const best = Number.isFinite(entry && entry.best) ? Number(entry.best).toFixed(1) : '-';
      const worst = Number.isFinite(entry && entry.worst) ? Number(entry.worst).toFixed(1) : '-';
      const disc = entry && entry.discipline === 'kk' ? 'KK' : 'LG';
      const badge = syncBadge(entry && entry.syncStatus);
      return `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;padding:7px 10px;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid #7ab030;font-size:0.76rem;">
        <div style="color:rgba(255,255,255,0.64);display:flex;align-items:center;gap:6px;min-width:0;">
          <span title="${escHtml(badge.label)}" aria-label="${escHtml(badge.label)}" style="color:${escHtml(badge.color)};font-size:0.85rem;line-height:1;">${escHtml(badge.sym)}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(formatDate(entry.completed_at))} · ${escHtml(disc)}</span>
        </div>
        <div style="color:#b4dc78;font-family:'DM Mono',monospace;text-align:right;">∑ ${escHtml(total)} · Ø ${escHtml(avg)} · ${escHtml(best)}/${escHtml(worst)}</div>
      </div>`;
    });
    let toggleBtn = '';
    if (all.length > HISTORY_TOP) {
      const label = STATE.expandedHistory
        ? 'Weniger anzeigen'
        : (moreCount > 0
            ? `Alle anzeigen (max. ${HISTORY_EXPANDED})`
            : `Alle anzeigen (max. ${HISTORY_EXPANDED})`);
      toggleBtn = `<button type="button" data-qt-history-toggle style="margin-top:4px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.78);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 10px;font-size:0.74rem;cursor:pointer;align-self:center;">${escHtml(label)}</button>`;
    }
    return rows.join('') + toggleBtn;
  }

  function shotInputs() {
    const rows = [];
    for (let i = 0; i < STATE.shots; i += 1) {
      const idx = i + 1;
      rows.push(`<label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.035);padding:7px 8px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
        <span style="font-family:'DM Mono',monospace;font-size:0.7rem;color:rgba(255,255,255,0.45);width:1.6em;text-align:right;">${idx}.</span>
        <input data-qt-shot="${idx}" type="text" inputmode="decimal" autocomplete="off" placeholder="0.0-10.9" aria-label="Schuss ${idx}"
          style="flex:1;min-width:0;background:transparent;color:#fff;border:0;outline:0;font-family:'DM Mono',monospace;font-size:0.95rem;padding:4px 2px;" />
      </label>`);
    }
    return rows.join('');
  }

  function footerHint() {
    const loggedIn = !!getUserId();
    const supaOk = !!getSupabase();
    let line;
    if (loggedIn && supaOk) line = 'Schnelltraining funktioniert offline. Online-Sync aktiv.';
    else if (supaOk) line = 'Schnelltraining funktioniert offline. Online-Sync nur mit Login.';
    else line = 'Schnelltraining funktioniert offline. Online-Sync nicht verfuegbar.';
    return `<div style="margin-top:10px;font-size:0.7rem;color:rgba(255,255,255,0.45);">${escHtml(line)}</div>`;
  }

  function renderClosed(host) {
    const last = readHistory().slice(-1)[0] || null;
    const lastSummary = last && Number.isFinite(last.total)
      ? `Letztes Training: ${Number(last.total).toFixed(1)} Ringe (Ø ${Number(last.avg || 0).toFixed(2)})`
      : 'Noch kein lokales Training erfasst.';
    host.innerHTML = `
      <section style="background:linear-gradient(145deg,rgba(50,55,60,0.4),rgba(15,18,20,0.85));border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;box-shadow:0 8px 28px rgba(0,0,0,0.38);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <div>
            <div style="font-size:1.05rem;font-weight:700;color:#fff;">Schnelltraining</div>
            <div style="font-size:0.74rem;color:rgba(255,255,255,0.58);">10 Schuss manuell eintragen. Lokal, offline, ohne Login.</div>
          </div>
          <button type="button" data-qt-toggle="open" style="background:linear-gradient(135deg,#7ab030,#5a9020);color:#0a1a06;border:1px solid rgba(122,176,48,0.6);border-radius:12px;padding:10px 14px;font-weight:700;font-size:0.85rem;cursor:pointer;min-height:44px;">Training starten</button>
        </div>
        <div style="margin-top:8px;font-size:0.78rem;color:rgba(255,255,255,0.58);">${escHtml(lastSummary)}</div>
        ${footerHint()}
      </section>`;
    const toggle = host.querySelector('[data-qt-toggle="open"]');
    if (toggle) toggle.addEventListener('click', () => { STATE.open = true; render(); });
  }

  function renderOpen(host) {
    host.innerHTML = `
      <section style="background:linear-gradient(145deg,rgba(50,55,60,0.4),rgba(15,18,20,0.85));border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;box-shadow:0 8px 28px rgba(0,0,0,0.38);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div>
            <div style="font-size:1.05rem;font-weight:700;color:#fff;">Schnelltraining</div>
            <div style="font-size:0.74rem;color:rgba(255,255,255,0.58);">Alle 10 Ringe eintragen. Erlaubt: 0.0 bis 10.9.</div>
          </div>
          <button type="button" data-qt-toggle="close" aria-label="Schnelltraining schliessen" style="background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:10px;width:36px;height:36px;cursor:pointer;font-size:1rem;line-height:1;">×</button>
        </div>
        <div style="display:flex;gap:6px;margin:10px 0 12px;flex-wrap:wrap;">
          ${['lg', 'kk'].map((id) => {
            const active = STATE.discipline === id;
            return `<button type="button" data-qt-disc="${id}" style="background:${active ? 'rgba(122,176,48,0.18)' : 'rgba(255,255,255,0.04)'};border:1px solid ${active ? 'rgba(122,176,48,0.55)' : 'rgba(255,255,255,0.08)'};color:${active ? '#b4dc78' : 'rgba(255,255,255,0.72)'};border-radius:999px;padding:6px 12px;font-size:0.78rem;font-weight:600;cursor:pointer;">${id === 'kk' ? 'Kleinkaliber' : 'Luftgewehr'}</button>`;
          }).join('')}
          <span style="margin-left:auto;font-size:0.72rem;color:rgba(255,255,255,0.45);align-self:center;">10 Schuss</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">${shotInputs()}</div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button type="button" data-qt-action="evaluate" style="flex:1;min-width:150px;background:linear-gradient(135deg,#7ab030,#5a9020);color:#0a1a06;border:1px solid rgba(122,176,48,0.6);border-radius:12px;padding:11px 12px;font-weight:700;font-size:0.88rem;cursor:pointer;min-height:44px;">Auswerten und speichern</button>
          <button type="button" data-qt-action="reset" style="background:rgba(255,255,255,0.05);color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:11px 14px;font-weight:600;font-size:0.85rem;cursor:pointer;min-height:44px;">Felder leeren</button>
        </div>
        <div data-qt-result style="margin-top:12px;font-size:0.85rem;color:rgba(255,255,255,0.85);min-height:1em;"></div>
        <div style="margin-top:14px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.1);">
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.62);margin-bottom:6px;font-weight:700;">Letzte Trainings (lokal)</div>
          <div data-qt-history style="display:flex;flex-direction:column;gap:6px;">${renderHistoryRows()}</div>
        </div>
        ${footerHint()}
      </section>`;
    bindOpenEvents(host);
  }

  function readShotsFromInputs(host) {
    const values = [];
    let badInputs = 0;
    host.querySelectorAll('[data-qt-shot]').forEach((input) => {
      const value = parseShotInput(input.value);
      const hasText = String(input.value || '').trim() !== '';
      const invalid = value === null && hasText;
      if (invalid) badInputs += 1;
      input.parentElement.style.borderColor = invalid ? 'rgba(255,80,80,0.72)' : 'rgba(255,255,255,0.08)';
      values.push(value);
    });
    return { values, badInputs };
  }

  function renderResultBlock(host, entry, stats, savedLocal) {
    const result = host.querySelector('[data-qt-result]');
    if (!result) return null;
    const recommendation = buildRecommendation(stats);
    let statusLine;
    let statusColor;
    if (!savedLocal) {
      statusLine = 'Konnte nicht gespeichert werden (Speicher voll oder blockiert).';
      statusColor = '#ffb4b4';
    } else if (entry.syncStatus === 'synced') {
      statusLine = 'Online synchronisiert.';
      statusColor = '#b4dc78';
    } else if (entry.syncStatus === 'pending') {
      statusLine = 'Lokal gespeichert. Sync spaeter moeglich.';
      statusColor = '#ffd27a';
    } else if (STATE.syncingLocalId === entry.local_id) {
      statusLine = 'Lokal gespeichert. Synchronisiere…';
      statusColor = 'rgba(255,255,255,0.66)';
    } else {
      statusLine = 'Lokal gespeichert.';
      statusColor = 'rgba(255,255,255,0.66)';
    }
    const recHtml = recommendation
      ? `<div style="margin-top:6px;font-size:0.8rem;color:#b4dc78;">${escHtml(recommendation)}</div>`
      : '';
    result.innerHTML = `
      <div style="background:${savedLocal ? 'rgba(122,176,48,0.08)' : 'rgba(255,120,80,0.08)'};border:1px solid ${savedLocal ? 'rgba(122,176,48,0.35)' : 'rgba(255,120,80,0.35)'};border-radius:10px;padding:10px 12px;">
        <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:0.92rem;color:#fff;">
          <div><span style="color:rgba(255,255,255,0.55);font-size:0.72rem;">Gesamt</span><br><strong>${escHtml(stats.total.toFixed(1))}</strong></div>
          <div><span style="color:rgba(255,255,255,0.55);font-size:0.72rem;">Durchschnitt</span><br><strong>${escHtml(stats.avg.toFixed(2))}</strong></div>
          <div><span style="color:rgba(255,255,255,0.55);font-size:0.72rem;">Bester</span><br><strong>${escHtml(stats.best.toFixed(1))}</strong></div>
          <div><span style="color:rgba(255,255,255,0.55);font-size:0.72rem;">Schwaechster</span><br><strong>${escHtml(stats.worst.toFixed(1))}</strong></div>
        </div>
        <div style="margin-top:8px;font-size:0.82rem;color:#cdebd0;">${escHtml(buildTip(stats, STATE.discipline))}</div>
        ${recHtml}
        <div data-qt-status style="margin-top:6px;font-size:0.74rem;color:${escHtml(statusColor)};">${escHtml(statusLine)}</div>
      </div>`;
    return result;
  }

  function refreshHistoryDom(host) {
    const histEl = host.querySelector('[data-qt-history]');
    if (histEl) histEl.innerHTML = renderHistoryRows();
    bindHistoryToggle(host);
  }

  function refreshResultStatus(host, entry, stats, savedLocal) {
    renderResultBlock(host, entry, stats, savedLocal);
  }

  async function onEvaluate(host) {
    const result = host.querySelector('[data-qt-result]');
    if (!result) return;
    if (STATE.saving) {
      result.innerHTML = '<div style="color:#ffe7a3;">Speichern läuft bereits. Bitte kurz warten.</div>';
      return;
    }
    STATE.saving = true;
    setSavingUi(host, true);
    try {
      const { values, badInputs } = readShotsFromInputs(host);
      if (badInputs > 0) {
        result.innerHTML = `<div style="color:#ffb4b4;">${badInputs} Eingabe(n) sind ungueltig. Erlaubt sind Werte von 0.0 bis 10.9 mit maximal einer Nachkommastelle.</div>`;
        return;
      }
      const stats = computeStats(values);
      if (stats.missing > 0) {
        result.innerHTML = '<div style="color:#ffe7a3;">Bitte alle 10 Schuesse eintragen, bevor du speicherst.</div>';
        return;
      }

      const entry = {
        local_id: newLocalId(),
        completed_at: new Date().toISOString(),
        discipline: STATE.discipline,
        shots: values,
        total: stats.total,
        avg: stats.avg,
        best: stats.best,
        worst: stats.worst,
        count: stats.count,
        syncStatus: 'local',
        remote_session_id: null,
      };
      const history = readHistory();
      history.push(entry);
      const savedLocal = writeHistory(history);

      renderResultBlock(host, entry, stats, savedLocal);
      refreshHistoryDom(host);

      try {
        window.dispatchEvent(new CustomEvent('quickTrainingSaved', { detail: { entry, saved: savedLocal } }));
      } catch (_e) { /* noop */ }

      if (!savedLocal) return;

      const supabase = getSupabase();
      const userId = getUserId();
      if (supabase && userId) {
        STATE.syncingLocalId = entry.local_id;
        refreshResultStatus(host, entry, stats, savedLocal);
        const ok = await trySupabaseSync(entry);
        STATE.syncingLocalId = null;
        const refreshed = readHistory().find((e) => e.local_id === entry.local_id) || entry;
        refreshResultStatus(host, refreshed, stats, savedLocal);
        refreshHistoryDom(host);
        if (!ok) {
          // bleibt pending - keine weitere Aktion in dieser Session.
        }
      }
    } finally {
      STATE.saving = false;
      STATE.syncingLocalId = null;
      setSavingUi(host, false);
    }
  }

  function bindHistoryToggle(host) {
    const btn = host.querySelector('[data-qt-history-toggle]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      STATE.expandedHistory = !STATE.expandedHistory;
      refreshHistoryDom(host);
    }, { once: true });
  }

  function bindOpenEvents(host) {
    const closeBtn = host.querySelector('[data-qt-toggle="close"]');
    if (closeBtn) closeBtn.addEventListener('click', () => { STATE.open = false; render(); });
    host.querySelectorAll('[data-qt-disc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        STATE.discipline = btn.getAttribute('data-qt-disc') === 'kk' ? 'kk' : 'lg';
        render();
      });
    });
    const evaluateBtn = host.querySelector('[data-qt-action="evaluate"]');
    if (evaluateBtn) evaluateBtn.addEventListener('click', () => { onEvaluate(host); });
    const resetBtn = host.querySelector('[data-qt-action="reset"]');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      host.querySelectorAll('[data-qt-shot]').forEach((input) => {
        input.value = '';
        input.parentElement.style.borderColor = 'rgba(255,255,255,0.08)';
      });
      const result = host.querySelector('[data-qt-result]');
      if (result) result.innerHTML = '';
    });
    bindHistoryToggle(host);
  }

  function render() {
    const host = document.getElementById(MOUNT_ID);
    if (!host) return;
    if (STATE.open) renderOpen(host);
    else renderClosed(host);
  }

  function flushPendingSyncs() {
    if (STATE.pendingFlushTried) return;
    if (!getSupabase() || !getUserId()) return;
    STATE.pendingFlushTried = true;
    const pending = readHistory().filter((e) => e && e.syncStatus === 'pending');
    if (!pending.length) return;
    pending.reduce((p, entry) => p.then(() => trySupabaseSync(entry).catch(() => false)), Promise.resolve())
      .then(() => {
        const host = document.getElementById(MOUNT_ID);
        if (host) refreshHistoryDom(host);
      })
      .catch(() => { /* noop */ });
  }

  function init() {
    if (STATE.initialized) return;
    STATE.initialized = true;
    render();
    // Falls Supabase bereits ready ist beim Start.
    setTimeout(flushPendingSyncs, 1500);
  }

  function bootstrap() {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
    try {
      window.addEventListener('supabaseReady', () => { flushPendingSyncs(); }, { passive: true });
      window.addEventListener('online', () => {
        STATE.pendingFlushTried = false;
        flushPendingSyncs();
      }, { passive: true });
    } catch (_e) { /* noop */ }
  }

  window.QuickTraining = Object.freeze({
    render,
    readHistory,
    flushPendingSyncs,
    _parseShotInput: parseShotInput,
    _computeStats: computeStats,
    _buildRecommendation: buildRecommendation,
    _state: STATE,
  });

  bootstrap();

  try {
    window.dispatchEvent(new CustomEvent('featureReady', { detail: { name: 'quickTraining' } }));
  } catch (_e) { /* noop */ }
})();
