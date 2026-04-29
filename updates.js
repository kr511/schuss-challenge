/**
 * Updates & Ankündigungen System
 * Admin kann Updates erstellen, alle User sehen sie als Benachrichtigung
 */

(function loadCriticalHotfixes() {
  'use strict';

  const hotfixes = [
    'duel-setup-hotfix.js?v=1.3',
    'highscore-sync.js?v=1.0',
    'dashboard-compact-panel.js?v=2.1',
    'dashboard-friends-button.js?v=1.2'
  ];

  hotfixes.forEach((src) => {
    const base = src.split('?')[0];
    if (document.querySelector(`script[src^="${base}"]`)) return;

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  });
})();

const UpdatesSystem = (function() {
  'use strict';

  // State
  const state = {
    updates: [],
    unreadCount: 0,
    initialized: false,
    closeHandlersInstalled: false,
  };

  // Demo-/Fallback-Updates, wenn noch kein Backend Eintraege liefert.
  const demoUpdates = [
    {
      id: 'demo_1',
      title: '🎉 Multiplayer-Update!',
      message: 'Neue Features: Async-Challenges, Freundesliste und Mobile-Optimierung sind da!',
      date: Date.now() - (24 * 60 * 60 * 1000), // vor 1 Tag
      priority: 'high',
      icon: '🚀',
    },
    {
      id: 'demo_2',
      title: '⚔️ Neue Challenges',
      message: 'Jetzt kannst du Freunde zu asynchronen Duellen herausfordern. Erstelle eine Challenge und warte auf den Gegner!',
      date: Date.now() - (3 * 24 * 60 * 60 * 1000), // vor 3 Tagen
      priority: 'medium',
      icon: '🎯',
    },
    {
      id: 'demo_3',
      title: '📱 Mobile Verbesserungen',
      message: 'Swipe-Gesten, größere Buttons und optimierte Bottom-Sheets für bessere Bedienung auf dem Handy.',
      date: Date.now() - (7 * 24 * 60 * 60 * 1000), // vor 1 Woche
      priority: 'low',
      icon: '✨',
    },
  ];

  /**
   * Initialisiert das Updates-System
   */
  async function init() {
    console.log('🔔 Updates-System initialisiert');

    await loadUpdates();
    updateUnreadBadge();
    installDropdownCloseHandlers();

    state.initialized = true;
    console.log('✅ Updates-System bereit, ' + state.unreadCount + ' ungelesen');
  }

  /**
   * Laedt Updates aus Supabase, LocalStorage oder Demo.
   */
  async function loadUpdates() {
    const localUpdates = readLocalUpdates();
    const remoteUpdates = await loadSupabaseUpdates();
    state.updates = (remoteUpdates.length ? remoteUpdates : (localUpdates.length ? localUpdates : demoUpdates))
      .slice()
      .sort((a, b) => (b.date || 0) - (a.date || 0));
    await loadReadStatus();
  }

  function readLocalUpdates() {
    try {
      const parsed = JSON.parse(localStorage.getItem('app_updates') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[Updates] LocalStorage konnte nicht gelesen werden:', e);
      return [];
    }
  }

  async function loadSupabaseUpdates() {
    try {
      const client = window.SupabaseClient || window.SupabaseAuth?.client;
      if (!client || typeof client.from !== 'function') return [];
      const result = await client.from('app_updates').select('*').order('date', { ascending: false }).limit(50);
      if (result.error) throw result.error;
      return (result.data || []).map((row) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        date: Number(row.date || Date.parse(row.created_at || '')) || Date.now(),
        priority: row.priority || 'medium',
        icon: row.icon || '📢',
      }));
    } catch (e) {
      console.warn('[Updates] Supabase Updates nicht verfuegbar, nutze lokalen Fallback:', e?.message || e);
      return [];
    }
  }

  /**
   * Lädt den Lese-Status
   */
  async function loadReadStatus() {
    const userId = getCurrentUserKey();
    if (!userId) return;

    const readKey = `updates_read_${userId}`;
    const readUpdates = JSON.parse(localStorage.getItem(readKey) || '[]');

    // Ungelesene zählen
    state.unreadCount = state.updates.filter(u => !readUpdates.includes(u.id)).length;
  }

  /**
   * Markiert alle als gelesen
   */
  function markAllAsRead() {
    const userId = getCurrentUserKey();
    if (!userId) return;

    const readKey = `updates_read_${userId}`;
    const allIds = state.updates.map(u => u.id);
    localStorage.setItem(readKey, JSON.stringify(allIds));

    state.unreadCount = 0;
    updateUnreadBadge();
  }

  /**
   * Aktualisiert den Unread-Badge am Button
   */
  function updateUnreadBadge() {
    const btn = document.getElementById('updatesButton');
    if (!btn) return;

    // Entferne existierenden Badge
    const existingBadge = btn.querySelector('.updates-badge');
    if (existingBadge) existingBadge.remove();

    // Badge hinzufügen wenn ungelesen
    if (state.unreadCount > 0) {
      const badge = document.createElement('div');
      badge.className = 'updates-badge';
      badge.textContent = state.unreadCount > 9 ? '9+' : state.unreadCount;
      badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ff3b30;
        color: white;
        font-size: 0.7rem;
        font-weight: 700;
        min-width: 18px;
        height: 18px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        box-shadow: 0 2px 6px rgba(255, 59, 48, 0.4);
        animation: badgePulse 2s ease-in-out infinite;
      `;
      btn.appendChild(badge);
    }
  }

  function isDropdownVisible(dropdown) {
    return !!dropdown && dropdown.style.display === 'block' && dropdown.style.opacity === '1';
  }

  /**
   * Installiert Schließen bei Klick außerhalb und Escape.
   */
  function installDropdownCloseHandlers() {
    if (state.closeHandlersInstalled) return;
    state.closeHandlersInstalled = true;

    document.addEventListener('pointerdown', (e) => {
      const dropdown = document.getElementById('updatesDropdown');
      const button = document.getElementById('updatesButton');
      if (!isDropdownVisible(dropdown)) return;
      if (dropdown.contains(e.target)) return;
      if (button && button.contains(e.target)) return;
      hideUpdates();
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const dropdown = document.getElementById('updatesDropdown');
      if (isDropdownVisible(dropdown)) hideUpdates();
    });
  }

  /**
   * Toggle Updates-Dropdown
   */
  function toggleUpdates() {
    const dropdown = document.getElementById('updatesDropdown');
    if (!dropdown) {
      console.warn('Updates-Dropdown nicht gefunden');
      return;
    }

    const isVisible = isDropdownVisible(dropdown);

    if (isVisible) {
      hideUpdates();
    } else {
      showUpdatesDropdown();
    }
  }

  /**
   * Zeigt Updates-Dropdown
   */
  function showUpdatesDropdown() {
    const dropdown = document.getElementById('updatesDropdown');
    if (!dropdown) return;

    installDropdownCloseHandlers();

    dropdown.style.display = 'block';
    renderUpdatesDropdown();

    // Mobile Fix: Auf kleinen Screens fixed + zentriert statt absolute + rechts
    if (window.innerWidth <= 480) {
      dropdown.style.position = 'fixed';
      dropdown.style.top = '60px';
      dropdown.style.left = '10px';
      dropdown.style.right = '10px';
      dropdown.style.width = 'auto';
      dropdown.style.maxWidth = 'none';
    }

    // Animation
    requestAnimationFrame(() => {
      dropdown.style.opacity = '1';
      dropdown.style.transform = 'translateY(0)';
    });

    // Alle als gelesen markieren
    markAllAsRead();

    if (typeof triggerHaptic === 'function') triggerHaptic();
  }

  /**
   * Versteckt Updates-Dropdown
   */
  function hideUpdates() {
    const dropdown = document.getElementById('updatesDropdown');
    if (!dropdown) return;

    dropdown.style.opacity = '0';
    dropdown.style.transform = 'translateY(-10px)';

    setTimeout(() => {
      dropdown.style.display = 'none';
      // Mobile Fix zurücksetzen
      dropdown.style.position = '';
      dropdown.style.top = '';
      dropdown.style.left = '';
      dropdown.style.right = '';
      dropdown.style.width = '';
      dropdown.style.maxWidth = '';
    }, 200);
  }

  /**
   * Rendert Updates-Dropdown-Inhalt
   */
  function renderUpdatesDropdown() {
    const container = document.getElementById('updatesDropdownContent');
    if (!container) return;

    if (state.updates.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:20px 0;color:rgba(255,255,255,0.4);font-size:0.85rem;">
          <div style="font-size:2rem;margin-bottom:8px;opacity:0.3;">🔔</div>
          Keine Updates vorhanden
        </div>
      `;
      return;
    }

    container.innerHTML = `
      ${state.updates.map(update => `
        <div class="update-dropdown-card" style="padding:12px;background:rgba(255,255,255,0.05);border-radius:10px;border:1px solid rgba(255,255,255,0.1);margin-bottom:8px;transition:all 0.2s;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="font-size:1.3rem;">${update.icon || '📢'}</div>
            <div style="color:#fff;font-weight:600;font-size:0.85rem;flex:1;">${escapeHtml(update.title)}</div>
          </div>
          <div style="color:rgba(255,255,255,0.6);font-size:0.8rem;line-height:1.4;margin-bottom:4px;">${escapeHtml(update.message)}</div>
          <div style="color:rgba(255,255,255,0.3);font-size:0.7rem;">${formatTime(update.date)}</div>
        </div>
      `).join('')}
    `;
  }

  /**
   * Rendert Updates-Liste (Legacy)
   */
  function createUpdatesOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'updatesOverlay';
    overlay.className = 'updates-overlay';
    overlay.innerHTML = `
      <div class="updates-sheet">
        <div class="updates-header">
          <h3>🔔 UPDATES & ANKÜNDIGUNGEN</h3>
          <button class="updates-close" onclick="UpdatesSystem.hideUpdates()">✕</button>
        </div>
        <div class="updates-body" id="updatesListContainer">
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        hideUpdates();
      }
    });
  }

  /**
   * Rendert Updates-Liste
   */
  function renderUpdatesList() {
    const container = document.getElementById('updatesListContainer');
    if (!container) return;

    if (state.updates.length === 0) {
      container.innerHTML = `
        <div class="updates-empty">
          <div class="updates-empty-icon">🔔</div>
          <div class="updates-empty-text">Keine Updates vorhanden</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      ${state.updates.map(update => `
        <div class="update-card ${getPriorityClass(update.priority)}">
          <div class="update-header">
            <div class="update-icon">${update.icon || '📢'}</div>
            <div class="update-title">${escapeHtml(update.title)}</div>
          </div>
          <div class="update-message">${escapeHtml(update.message)}</div>
          <div class="update-time">${formatTime(update.date)}</div>
        </div>
      `).join('')}
    `;
  }

  /**
   * Hilfsfunktion: Priority-Klasse
   */
  function getPriorityClass(priority) {
    const priorityMap = {
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low',
    };
    return priorityMap[priority] || 'priority-low';
  }

  /**
   * Hilfsfunktion: Zeit formatieren
   */
  function formatTime(timestamp) {
    if (!timestamp) return '';

    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;
    if (hours < 24) return `vor ${hours} Std`;
    if (days < 7) return `vor ${days} Tagen`;

    // Datum formatieren
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /**
   * Hilfsfunktion: HTML escapen
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }


  function getCurrentUserKey() {
    return window.SupabaseSession?.user?.id || StorageManager.getRaw('userId') || StorageManager.getRaw('local_user_id') || 'local';
  }

  /**
   * Admin-Funktion: Neues Update erstellen (nur für Admin)
   */
  async function createUpdate(title, message, options = {}) {
    const updateData = {
      id: 'update_' + Date.now(),
      title: title,
      message: message,
      date: Date.now(),
      priority: options.priority || 'medium',
      icon: options.icon || '📢',
      createdBy: getCurrentUserKey() || 'admin',
    };

    const localUpdates = readLocalUpdates();
    localUpdates.unshift(updateData);
    localStorage.setItem('app_updates', JSON.stringify(localUpdates.slice(0, 100)));

    try {
      const client = window.SupabaseClient || window.SupabaseAuth?.client;
      if (client && typeof client.from === 'function') {
        const result = await client.from('app_updates').insert(updateData);
        if (result.error) throw result.error;
      }
    } catch (e) {
      console.warn('[Updates] Remote-Speichern nicht verfuegbar, Update bleibt lokal:', e?.message || e);
    }

    await loadUpdates();
    updateUnreadBadge();
  }

  /**
   * Exportiert öffentliche Funktionen
   */
  return {
    init,
    toggleUpdates,
    hideUpdates,
    createUpdate,
    // State (readonly)
    getState: () => ({ ...state }),
  };
})();

// Initialisierung
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Erst global verfügbar machen, dann initialisieren.
      window.UpdatesSystem = UpdatesSystem;
      UpdatesSystem.init();
    });
  } else {
    window.UpdatesSystem = UpdatesSystem;
    UpdatesSystem.init();
  }

  // Global verfügbar machen für Admin
  window.createUpdate = function(title, message, options) {
    return UpdatesSystem.createUpdate(title, message, options);
  };
}
