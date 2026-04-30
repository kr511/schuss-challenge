/**
 * Schützen-Challenges UI + Completion-Flow
 *
 * Rendert die statischen Trainings-Challenges aus window.ShooterChallenges
 * in den Mount-Punkt #shooterChallengesMount im Setup-Screen-Dashboard.
 *
 * Eigenschaften:
 *  - Sichtbare Safety-Notes (immer prominent).
 *  - Klare Trennung Trockenübung vs. Live-Fire (Badge + Hinweistext).
 *  - Filter-Tabs: Alle / Trockenübung / Live-Fire / Sicherheit.
 *  - Detail-Karte mit Equipment, Ablauf, Erfolgskriterium.
 *  - „Challenge abschließen“: speichert online (Supabase, falls eingeloggt)
 *    oder lokal (StorageManager) – nie beides als Fake-Erfolg.
 *  - Schutz gegen Doppelklick + Doppelabschluss am gleichen Tag.
 *
 * Bewusst kein eigener Screen, sondern eine Section im Dashboard, damit
 * bestehende Navigation (Duell, Setup, Leaderboard) unverändert bleibt.
 */
(function () {
  'use strict';

  const MOUNT_ID = 'shooterChallengesMount';
  const LOCAL_STORAGE_KEY = 'sd_shooter_challenge_completions';
  const STORAGE_KEY = 'shooter_challenge_completions';
  const SUPABASE_TABLE = 'challenge_completions';
  const LIVE_FIRE_WARNING = 'Nur auf zugelassenem Schießstand nach Standordnung und ggf. mit Aufsicht durchführen.';
  const DRY_FIRE_WARNING = 'Waffe entladen, Magazin/Patronenlager kontrollieren, keine Munition im Übungsbereich.';
  const STATE = {
    filter: 'all',
    expandedId: null,
    busyId: null,
    initialized: false,
    sessionCompletions: [],
  };

  function escHtml(input) {
    if (input === null || input === undefined) return '';
    const s = String(input);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;')
      .replace(/\//g, '&#47;');
  }

  function getStorage() {
    if (typeof StorageManager !== 'undefined'
      && StorageManager
      && typeof StorageManager.get === 'function'
      && typeof StorageManager.set === 'function') {
      return StorageManager;
    }
    if (typeof window !== 'undefined'
      && window.StorageManager
      && typeof window.StorageManager.get === 'function'
      && typeof window.StorageManager.set === 'function') {
      return window.StorageManager;
    }
    return null;
  }

  function getSupabaseSession() {
    if (typeof window === 'undefined') return null;
    if (window.SupabaseSession && window.SupabaseSession.user) return window.SupabaseSession;
    if (window.SupabaseAuth && typeof window.SupabaseAuth.getSession === 'function') {
      const s = window.SupabaseAuth.getSession();
      if (s && s.user) return s;
    }
    return null;
  }

  function getSupabaseClient() {
    if (typeof window === 'undefined') return null;
    if (window.SupabaseClient) return window.SupabaseClient;
    if (window.SupabaseAuth && window.SupabaseAuth.client) return window.SupabaseAuth.client;
    return null;
  }

  function readLocalCompletions() {
    const sm = getStorage();
    try {
      if (sm) {
        const raw = sm.get(STORAGE_KEY, []);
        return Array.isArray(raw) ? raw : [];
      }
      const raw = window.localStorage && window.localStorage.getItem(LOCAL_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[ShooterChallenges] Lokale Abschlüsse konnten nicht gelesen werden:', err);
      return [];
    }
  }

  function writeLocalCompletions(list) {
    const sm = getStorage();
    try {
      if (sm) return sm.set(STORAGE_KEY, list) === true;
      if (!window.localStorage) return false;
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      console.warn('[ShooterChallenges] Lokale Abschlüsse konnten nicht gespeichert werden:', err);
      return false;
    }
  }

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function todayRangeIso() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  function isSameLocalDay(value, reference = new Date()) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    return d.getFullYear() === reference.getFullYear()
      && d.getMonth() === reference.getMonth()
      && d.getDate() === reference.getDate();
  }

  function getCompletionMap() {
    const map = new Map();
    for (const entry of readLocalCompletions().concat(STATE.sessionCompletions)) {
      if (!entry || !entry.challenge_id) continue;
      map.set(entry.challenge_id, entry);
    }
    return map;
  }

  function isCompletedToday(challengeId) {
    const entry = getCompletionMap().get(challengeId);
    if (!entry || !entry.completed_at) return false;
    try {
      const at = new Date(entry.completed_at);
      const now = new Date();
      return at.toDateString() === now.toDateString();
    } catch (_e) {
      return false;
    }
  }

  function recordLocalCompletion(challenge, extras) {
    const list = readLocalCompletions();
    const entry = {
      challenge_id: challenge.id,
      category: challenge.category,
      is_dry_fire: !!challenge.isDryFire,
      is_live_fire: !!challenge.isLiveFire,
      score: extras && Number.isFinite(extras.score) ? extras.score : null,
      notes: extras && extras.notes ? String(extras.notes).slice(0, 500) : null,
      completed_at: new Date().toISOString(),
      synced: !!(extras && extras.synced),
    };
    // Bei mehrfachen Abschlüssen heute überschreiben statt duplizieren.
    const filtered = list.filter((e) => !(e.challenge_id === challenge.id
      && typeof e.completed_at === 'string'
      && isSameLocalDay(e.completed_at)));
    filtered.push(entry);
    return writeLocalCompletions(filtered) ? entry : null;
  }

  function rememberSessionCompletion(challenge, synced) {
    const entry = {
      challenge_id: challenge.id,
      category: challenge.category,
      is_dry_fire: !!challenge.isDryFire,
      is_live_fire: !!challenge.isLiveFire,
      completed_at: new Date().toISOString(),
      synced: !!synced,
    };
    STATE.sessionCompletions = STATE.sessionCompletions.filter((e) => !(e.challenge_id === challenge.id
      && typeof e.completed_at === 'string'
      && isSameLocalDay(e.completed_at)));
    STATE.sessionCompletions.push(entry);
    return entry;
  }

  async function tryRemoteSave(challenge, extras) {
    const session = getSupabaseSession();
    if (!session || !session.user || !session.user.id) return { ok: false, reason: 'no-session' };
    const client = getSupabaseClient();
    if (!client || !client.from) return { ok: false, reason: 'no-client' };
    try {
      const payload = {
        user_id: session.user.id,
        challenge_id: challenge.id,
        completed_at: new Date().toISOString(),
        score: extras && Number.isFinite(extras.score) ? extras.score : null,
        notes: extras && extras.notes ? String(extras.notes).slice(0, 500) : null,
      };
      const range = todayRangeIso();
      const existingRes = await client
        .from(SUPABASE_TABLE)
        .select('id')
        .eq('user_id', session.user.id)
        .eq('challenge_id', challenge.id)
        .gte('completed_at', range.start)
        .lt('completed_at', range.end)
        .order('completed_at', { ascending: false });
      if (existingRes && existingRes.error) {
        return { ok: false, reason: 'select-error', error: existingRes.error };
      }
      const existing = Array.isArray(existingRes && existingRes.data) ? existingRes.data : [];
      if (existing.length > 0 && existing[0] && existing[0].id) {
        const { error } = await client
          .from(SUPABASE_TABLE)
          .update(payload)
          .eq('id', existing[0].id);
        if (error) return { ok: false, reason: 'update-error', error };
        const duplicateIds = existing.slice(1).map((row) => row && row.id).filter(Boolean);
        if (duplicateIds.length && typeof client.from(SUPABASE_TABLE).delete === 'function') {
          client.from(SUPABASE_TABLE).delete().in('id', duplicateIds).then(() => {}, () => {});
        }
        return { ok: true, mode: 'updated' };
      }
      const { error } = await client.from(SUPABASE_TABLE).insert(payload);
      if (error) {
        // FK-Verletzung (Tabelle existiert noch nicht / Challenge nicht synced) sauber behandeln.
        return { ok: false, reason: 'rpc-error', error };
      }
      return { ok: true, mode: 'inserted' };
    } catch (err) {
      return { ok: false, reason: 'exception', error: err };
    }
  }

  function categoryLabel(cat) {
    const map = {
      sicherheit: 'Sicherheit',
      grundlagen: 'Grundlagen',
      atmung: 'Atmung',
      stand: 'Stand',
      abzug: 'Abzug',
      zielbild: 'Zielbild',
      trockenuebung: 'Trockenübung',
      konzentration: 'Konzentration',
      wettkampf: 'Wettkampf',
      auswertung: 'Auswertung',
    };
    return map[cat] || cat;
  }

  function difficultyLabel(d) {
    const map = { anfaenger: 'Anfänger', fortgeschritten: 'Fortgeschritten', profi: 'Profi' };
    return map[d] || d;
  }

  function applyFilter(list, filter) {
    if (filter === 'dry') return list.filter((c) => c.isDryFire && !c.isLiveFire);
    if (filter === 'live') return list.filter((c) => c.isLiveFire);
    if (filter === 'safety') return list.filter((c) => c.category === 'sicherheit');
    return list;
  }

  function renderEmptyState(host, reason) {
    host.innerHTML = `
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;color:rgba(255,255,255,0.65);font-size:0.85rem;line-height:1.45;">
        <div style="font-weight:700;color:#b4dc78;margin-bottom:6px;">🎯 Trainings-Challenges</div>
        <div>${escHtml(reason || 'Trainings-Challenges werden gerade geladen. Lokales Training funktioniert weiter.')}</div>
      </div>`;
  }

  function tabBtn(id, label, active) {
    const bg = active ? 'rgba(122,176,48,0.18)' : 'rgba(255,255,255,0.04)';
    const border = active ? '1px solid rgba(122,176,48,0.55)' : '1px solid rgba(255,255,255,0.08)';
    const color = active ? '#b4dc78' : 'rgba(255,255,255,0.7)';
    return `<button type="button" data-sc-filter="${escHtml(id)}"
      style="background:${bg};border:${border};color:${color};border-radius:999px;padding:6px 12px;font-size:0.78rem;font-weight:600;cursor:pointer;letter-spacing:0.02em;">
      ${escHtml(label)}
    </button>`;
  }

  function renderCard(c, completedMap) {
    const completed = completedMap.has(c.id);
    const completedToday = isCompletedToday(c.id);
    const expanded = STATE.expandedId === c.id;
    const busy = STATE.busyId === c.id;

    const fireBadge = c.isLiveFire
      ? `<span style="background:rgba(240,80,80,0.18);color:#ffb4b4;border:1px solid rgba(240,80,80,0.45);border-radius:999px;padding:3px 9px;font-size:0.66rem;font-weight:700;letter-spacing:0.04em;">🔴 LIVE-FIRE</span>`
      : `<span style="background:rgba(0,195,255,0.15);color:#9bdcff;border:1px solid rgba(0,195,255,0.45);border-radius:999px;padding:3px 9px;font-size:0.66rem;font-weight:700;letter-spacing:0.04em;">🟦 TROCKENÜBUNG</span>`;

    const safetyText = c.isLiveFire ? LIVE_FIRE_WARNING : DRY_FIRE_WARNING;
    const fireWarning = c.isLiveFire
      ? `<div style="background:rgba(240,80,80,0.08);border:1px solid rgba(240,80,80,0.4);border-radius:10px;padding:10px 12px;color:#ffd1d1;font-size:0.78rem;line-height:1.45;margin-top:8px;">
          <strong>Live-Fire:</strong> ${escHtml(LIVE_FIRE_WARNING)}
        </div>`
      : `<div style="background:rgba(0,195,255,0.06);border:1px solid rgba(0,195,255,0.3);border-radius:10px;padding:10px 12px;color:#cdebff;font-size:0.78rem;line-height:1.45;margin-top:8px;">
          <strong>Trockenübung:</strong> ${escHtml(DRY_FIRE_WARNING)}
        </div>`;

    const equip = (Array.isArray(c.requiredEquipment) ? c.requiredEquipment : [])
      .map((e) => `<li style="margin:0 0 2px 16px;">${escHtml(e)}</li>`).join('');

    const steps = (Array.isArray(c.instructions) ? c.instructions : [])
      .map((s, i) => `<li style="margin:0 0 4px 18px;line-height:1.45;"><span style="color:#7ab030;font-weight:700;">${i + 1}.</span> ${escHtml(s)}</li>`).join('');

    const completionLabel = busy
      ? '⏳ Speichere…'
      : completedToday
        ? '✅ Heute erledigt – nochmal markieren'
        : 'Challenge abschließen';

    const completionStyle = completedToday
      ? 'background:rgba(122,176,48,0.18);color:#b4dc78;border:1px solid rgba(122,176,48,0.55);'
      : 'background:linear-gradient(135deg,#7ab030 0%,#5a9020 100%);color:#0a1a06;border:1px solid rgba(122,176,48,0.6);';

    const detail = !expanded ? '' : `
      <div style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.1);">
        <div style="background:rgba(255,180,0,0.08);border:1px solid rgba(255,180,0,0.45);border-radius:10px;padding:10px 12px;color:#ffe7a3;font-size:0.8rem;line-height:1.5;">
          🛡️ <strong>Sicherheit:</strong> ${escHtml(c.safetyNote)}
        </div>
        ${fireWarning}
        ${equip ? `<div style="margin-top:10px;color:rgba(255,255,255,0.85);font-size:0.8rem;"><div style="font-weight:700;color:#fff;margin-bottom:4px;">Material:</div><ul style="padding:0;margin:0;list-style-type:disc;">${equip}</ul></div>` : ''}
        ${steps ? `<div style="margin-top:10px;color:rgba(255,255,255,0.85);font-size:0.82rem;"><div style="font-weight:700;color:#fff;margin-bottom:4px;">Ablauf:</div><ol style="padding:0;margin:0;list-style:none;">${steps}</ol></div>` : ''}
        <div style="margin-top:10px;color:rgba(255,255,255,0.85);font-size:0.78rem;">
          <strong style="color:#fff;">Erfolgskriterium:</strong> ${escHtml(c.successCriteria || '')}
        </div>
      </div>`;

    return `
      <article data-sc-card="${escHtml(c.id)}"
        style="background:linear-gradient(145deg, rgba(50,55,60,0.4) 0%, rgba(15,18,20,0.85) 100%);border:1px solid rgba(255,255,255,0.08);border-top:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:14px 14px 12px;box-shadow:0 8px 28px rgba(0,0,0,0.45);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
              ${fireBadge}
              <span style="background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.75);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:3px 9px;font-size:0.66rem;font-weight:600;">${escHtml(categoryLabel(c.category))}</span>
              <span style="background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.65);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:3px 9px;font-size:0.66rem;font-weight:600;">${escHtml(difficultyLabel(c.difficulty))}</span>
              <span style="background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:999px;padding:3px 9px;font-size:0.66rem;font-weight:500;">⏱ ${escHtml(c.durationMinutes)} min</span>
              ${completed ? `<span style="background:rgba(122,176,48,0.2);color:#b4dc78;border:1px solid rgba(122,176,48,0.5);border-radius:999px;padding:3px 9px;font-size:0.66rem;font-weight:700;">✓ ERLEDIGT</span>` : ''}
            </div>
            <h3 style="margin:0 0 4px;font-size:0.98rem;color:#fff;font-weight:700;">${escHtml(c.title)}</h3>
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:0.82rem;line-height:1.4;">${escHtml(c.description)}</p>
            <div style="margin-top:8px;background:${c.isLiveFire ? 'rgba(240,80,80,0.08)' : 'rgba(0,195,255,0.06)'};border:1px solid ${c.isLiveFire ? 'rgba(240,80,80,0.35)' : 'rgba(0,195,255,0.28)'};border-radius:10px;padding:8px 10px;color:${c.isLiveFire ? '#ffd1d1' : '#cdebff'};font-size:0.76rem;line-height:1.4;">
              ${escHtml(safetyText)}
            </div>
          </div>
          <button type="button" data-sc-toggle="${escHtml(c.id)}" aria-expanded="${expanded ? 'true' : 'false'}"
            style="flex-shrink:0;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:10px;width:36px;height:36px;cursor:pointer;font-size:1rem;line-height:1;display:flex;align-items:center;justify-content:center;">
            ${expanded ? '▾' : '▸'}
          </button>
        </div>
        ${detail}
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" data-sc-complete="${escHtml(c.id)}"
            ${busy ? 'disabled' : ''}
            style="${completionStyle};border-radius:12px;padding:11px 14px;font-weight:700;font-size:0.85rem;cursor:${busy ? 'wait' : 'pointer'};flex:1;min-height:44px;">
            ${completionLabel}
          </button>
        </div>
        <div data-sc-msg="${escHtml(c.id)}" style="margin-top:8px;font-size:0.78rem;color:rgba(255,255,255,0.7);min-height:1em;"></div>
      </article>`;
  }

  function render() {
    const host = document.getElementById(MOUNT_ID);
    if (!host) return;
    let api;
    let all;
    try {
      api = window.ShooterChallenges;
      if (!api || typeof api.getAll !== 'function') {
        renderEmptyState(host, 'Trainings-Challenges werden geladen. Bitte kurz warten.');
        return;
      }
      all = api.getAll();
    } catch (err) {
      console.warn('[ShooterChallenges] window.ShooterChallenges.getAll() fehlgeschlagen:', err);
      renderEmptyState(host, 'Trainings-Challenges konnten nicht geladen werden. Bitte Seite neu laden.');
      return;
    }
    if (!Array.isArray(all) || all.length === 0) {
      renderEmptyState(host, 'Noch keine Trainings-Challenges verfügbar.');
      return;
    }
    let cards = '';
    let filtered = [];
    let completed = new Map();
    try {
      filtered = applyFilter(all, STATE.filter);
      if (filtered.length && !filtered.some((c) => c.id === STATE.expandedId)) {
        STATE.expandedId = filtered[0].id;
      }
      completed = getCompletionMap();
      cards = filtered.map((c) => renderCard(c, completed)).join('');
    } catch (err) {
      console.warn('[ShooterChallenges] render() fehlgeschlagen:', err);
      renderEmptyState(host, 'Trainings-Challenges konnten nicht dargestellt werden. Lokales Training bleibt verfügbar.');
      return;
    }

    host.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:1.05rem;font-weight:700;color:#fff;">🎯 Trainings-Challenges</div>
          <div style="font-size:0.72rem;color:rgba(255,255,255,0.5);">Sicheres Schützen-Training. Trockenübung &amp; Live-Fire klar getrennt.</div>
        </div>
        <div style="font-size:0.7rem;color:rgba(255,255,255,0.45);font-weight:600;">${filtered.length}/${all.length}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
        ${tabBtn('all', 'Alle', STATE.filter === 'all')}
        ${tabBtn('dry', 'Trockenübung', STATE.filter === 'dry')}
        ${tabBtn('live', 'Live-Fire', STATE.filter === 'live')}
        ${tabBtn('safety', 'Sicherheit', STATE.filter === 'safety')}
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">${cards || `<div style="color:rgba(255,255,255,0.55);font-size:0.85rem;padding:14px;text-align:center;background:rgba(255,255,255,0.03);border-radius:12px;">Keine Challenges in dieser Kategorie.</div>`}</div>
    `;

    bindEvents(host);
  }

  function bindEvents(host) {
    host.querySelectorAll('[data-sc-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-sc-filter') || 'all';
        STATE.filter = v;
        render();
      });
    });
    host.querySelectorAll('[data-sc-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-sc-toggle');
        STATE.expandedId = STATE.expandedId === id ? null : id;
        render();
      });
    });
    host.querySelectorAll('[data-sc-complete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-sc-complete');
        if (!id) return;
        completeChallenge(id);
      });
    });
  }

  function setMessage(challengeId, text, level) {
    const host = document.getElementById(MOUNT_ID);
    if (!host) return;
    const el = host.querySelector(`[data-sc-msg="${cssEscape(challengeId)}"]`);
    if (!el) return;
    const colors = {
      ok: '#b4dc78',
      info: 'rgba(255,255,255,0.8)',
      warn: '#ffe7a3',
      err: '#ffb4b4',
    };
    el.textContent = text || '';
    el.style.color = colors[level] || 'rgba(255,255,255,0.7)';
  }

  function cssEscape(s) {
    if (typeof CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_\-]/g, (c) => `\\${c}`);
  }

  async function completeChallenge(id) {
    if (STATE.busyId) return; // Schutz gegen Doppelklick
    const api = window.ShooterChallenges;
    if (!api || typeof api.getById !== 'function') return;
    const challenge = api.getById(id);
    if (!challenge) return;

    STATE.busyId = id;
    render();
    setMessage(id, 'Speichere Abschluss…', 'info');

    let stored = false;
    let onlineSaved = false;
    let userMessage = '';

    try {
      const remote = await tryRemoteSave(challenge, {});
      if (remote.ok) {
        onlineSaved = true;
        if (!recordLocalCompletion(challenge, { synced: true })) {
          rememberSessionCompletion(challenge, true);
        }
        stored = true;
        userMessage = '✅ Abschluss online gespeichert.';
      } else {
        // Lokaler Fallback (Gastmodus, Tabelle fehlt, RLS, offline …)
        const entry = recordLocalCompletion(challenge, { synced: false });
        if (entry) {
          stored = true;
          if (remote.reason === 'no-session' || remote.reason === 'no-client') {
            userMessage = 'ℹ️ Lokal gespeichert (offline / nicht eingeloggt).';
          } else {
            userMessage = 'ℹ️ Lokal gespeichert (Server gerade nicht erreichbar).';
            // Nur in Konsole, nicht für Endnutzer Stacktrace zeigen.
            console.warn('[ShooterChallenges] Remote save fehlgeschlagen:', remote);
          }
        }
      }
    } catch (err) {
      console.warn('[ShooterChallenges] Unerwarteter Fehler beim Abschluss:', err);
      const entry = recordLocalCompletion(challenge, { synced: false });
      if (entry) {
        stored = true;
        userMessage = 'ℹ️ Lokal gespeichert (Fehler beim Online-Speichern).';
      } else {
        userMessage = '❌ Speichern fehlgeschlagen. Bitte später erneut versuchen.';
      }
    } finally {
      STATE.busyId = null;
    }

    if (!stored) {
      // Kein Fake-Erfolg: wenn weder online noch lokal → klare Fehlermeldung.
      render();
      setMessage(id, '❌ Konnte den Abschluss nicht speichern.', 'err');
      return;
    }

    render();
    setMessage(id, userMessage, onlineSaved ? 'ok' : 'info');

    try {
      window.dispatchEvent(new CustomEvent('shooterChallengeCompleted', {
        detail: { id: challenge.id, online: onlineSaved },
      }));
    } catch (_e) { /* noop */ }
  }

  function init() {
    if (STATE.initialized) return;
    STATE.initialized = true;

    // Erst-Render
    render();
    scheduleRenderRetries();

    // Re-Render, wenn Setup-Screen wieder sichtbar wird (z. B. nach Duell).
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) render();
    });

    // Bei Login/Logout neu rendern, damit Online/Offline-Hinweise stimmen.
    window.addEventListener('supabaseReady', () => render());
    window.addEventListener('featureReady', (event) => {
      if (event && event.detail && event.detail.name === 'shooterChallenges') render();
    });
  }

  function scheduleRenderRetries() {
    [250, 750, 1500, 3000].forEach((delay) => {
      window.setTimeout(() => {
        try {
          const host = document.getElementById(MOUNT_ID);
          const apiReady = !!(window.ShooterChallenges && typeof window.ShooterChallenges.getAll === 'function');
          const uiReady = !!(window.ShooterChallengesUI && typeof window.ShooterChallengesUI.render === 'function');
          if (host && apiReady && uiReady) render();
          else if (host && !apiReady) renderEmptyState(host, 'Trainings-Challenges werden geladen. Bitte kurz warten.');
        } catch (err) {
          const host = document.getElementById(MOUNT_ID);
          if (host) renderEmptyState(host, 'Trainings-Challenges konnten nicht dargestellt werden.');
          console.warn('[ShooterChallenges] Retry fehlgeschlagen:', err);
        }
      }, delay);
    });
  }

  function bootstrap() {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  }

  // Public API für Debug/Tests
  window.ShooterChallengesUI = Object.freeze({
    render,
    completeChallenge,
    _state: STATE,
  });

  bootstrap();

  // Feature-Ready Signal (siehe feature-fallback.js)
  try {
    window.dispatchEvent(new CustomEvent('featureReady', { detail: { name: 'shooterChallengesUI' } }));
  } catch (_e) { /* noop */ }
})();
