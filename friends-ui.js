/**
 * Friends UI v1.0
 * Modernes Glassmorphism-UI für Freundesliste & Suche.
 */
const FriendsUI = (function() {
  'use strict';

  const TEASER_MOUNT_ID = 'pdFriendsTeaser';

  /**
   * Initialisiert das UI
   */
  function init() {
    render();
    console.log('🎨 Friends UI geladen');
  }

  /**
   * Rendert den Freunde-Teaser im Dashboard
   */
  function render() {
    const mount = document.getElementById(TEASER_MOUNT_ID);
    if (!mount) return;

    const friends = (typeof SocialSystem !== 'undefined') ? SocialSystem.getFriends() : [];

    if (friends.length === 0) {
      mount.innerHTML = `
        <div onclick="SocialSystem.open()" style="min-width:65px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;">
           <div style="width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,0.05);border:1.5px dashed rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">➕</div>
           <div style="font-size:0.6rem;color:rgba(255,255,255,0.4);">Hinzufügen</div>
        </div>
      `;
      return;
    }

    // Rendere Freunde + Hinzufügen-Button
    let html = `
      <div onclick="SocialSystem.open()" style="min-width:65px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;">
         <div style="width:50px;height:50px;border-radius:50%;background:rgba(0,195,255,0.08);border:1.5px dashed rgba(0,195,255,0.4);display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:#00c3ff;">➕</div>
         <div style="font-size:0.6rem;color:#00c3ff;font-weight:600;">Finden</div>
      </div>
    `;

    friends.forEach(f => {
      const initial = f.username.charAt(0).toUpperCase();
      html += `
        <div style="min-width:65px;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;">
           <!-- Online Status Pulse -->
           <div style="position:absolute;top:2px;right:10px;width:10px;height:10px;background:#7ab030;border-radius:50%;border:2px solid #111;box-shadow:0 0 8px rgba(122,176,48,0.5);z-index:2;"></div>
           
           <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02));border:1.5px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;color:#fff;backdrop-filter:blur(10px);">
              ${initial}
           </div>
           <div style="font-size:0.6rem;color:rgba(255,255,255,0.7);max-width:60px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.username}</div>
        </div>
      `;
    });

    mount.innerHTML = html;
  }

  /**
   * Öffnet das Social Discovery Bottom-Sheet
   */
  function showDiscovery() {
    // Da wir das bestehende profileOverlay nutzen, triggern wir den Friends-Tab dort
    if (typeof toggleProfileMenu === 'function') {
      const overlay = document.getElementById('profileOverlay');
      const isClosed = !overlay || overlay.style.display === 'none' || overlay.style.opacity === '0';
      if (isClosed) toggleProfileMenu();
      
      // Warte kurz bis Sheet offen, dann Tab wechseln
      setTimeout(() => {
        if (typeof switchProfileTab === 'function') switchProfileTab('friends');
      }, 100);
    }
  }

  /**
   * Rendert den Inhalt des Freunde-Tabs im Schützenpass
   */
  function renderProfileTab() {
    const mount = document.getElementById('psPanel-friends');
    if (!mount) return;

    const friends = (typeof SocialSystem !== 'undefined') ? SocialSystem.getFriends() : [];

    mount.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <!-- Search Bar -->
        <div style="position:relative;">
          <input type="text" id="socialSearchInput" placeholder="Schütze suchen..." style="width:100%;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.1);border-radius:14px;padding:12px 16px 12px 40px;color:#fff;font-family:'Outfit';">
          <span style="position:absolute;left:14px;top:12px;opacity:0.4;">🔍</span>
          <button onclick="FriendsUI.performSearch()" style="position:absolute;right:8px;top:6px;background:#7ab030;border:none;border-radius:8px;padding:6px 12px;color:#000;font-weight:700;font-size:0.75rem;">GO</button>
        </div>

        <div id="socialSearchResults"></div>

        <div class="sun-section-title">◇ Deine Freunde (${friends.length})</div>
        
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${friends.length === 0 ? '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:0.8rem;">Noch keine Freunde hinzugefügt.</div>' : ''}
          ${friends.map(f => `
            <div style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:12px 16px;">
              <div style="width:44px;height:44px;border-radius:50%;background:rgba(0,195,255,0.1);display:flex;align-items:center;justify-content:center;font-weight:700;color:#00c3ff;border:1px solid rgba(0,195,255,0.2);">
                ${f.username.charAt(0).toUpperCase()}
              </div>
              <div style="flex:1;">
                <div style="font-weight:600;color:#fff;font-size:0.95rem;">${f.username}</div>
                <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);">${f.rank} · ${f.xp} XP</div>
              </div>
              <div style="display:flex;gap:8px;">
                <button onclick="alert('Challenge coming soon!')" style="width:34px;height:34px;border-radius:10px;background:rgba(122,176,48,0.15);border:1px solid rgba(122,176,48,0.3);color:#7ab030;display:flex;align-items:center;justify-content:center;">🎯</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  async function performSearch() {
    const input = document.getElementById('socialSearchInput');
    const results = document.getElementById('socialSearchResults');
    if (!input || !results || !input.value) return;

    results.innerHTML = '<div style="text-align:center;padding:10px;">⏳ Suche läuft...</div>';
    
    const user = await SocialSystem.findUser(input.value.trim());
    
    if (!user) {
      results.innerHTML = '<div style="text-align:center;padding:10px;color:#f06050;font-size:0.8rem;">Schütze nicht gefunden.</div>';
    } else {
      results.innerHTML = `
        <div style="background:rgba(122,176,48,0.1);border:1px solid rgba(122,176,48,0.3);border-radius:16px;padding:14px;display:flex;align-items:center;justify-content:space-between;animation:popIn 0.3s ease-out;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#7ab030;color:#000;display:flex;align-items:center;justify-content:center;font-weight:800;">${user.username.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:700;color:#fff;">${user.username}</div>
              <div style="font-size:0.65rem;color:rgba(255,255,255,0.5);">Level ${Math.floor((user.xp || 0)/1000) + 1} Schütze</div>
            </div>
          </div>
          <button onclick="FriendsUI.addAndNotify('${user.username}')" style="background:#7ab030;border:none;border-radius:10px;padding:8px 14px;color:#000;font-weight:800;font-size:0.75rem;">➕ HINZUFÜGEN</button>
        </div>
      `;
    }
  }

  async function addAndNotify(name) {
    const user = await SocialSystem.findUser(name);
    if (user) {
      const ok = await SocialSystem.addFriend(user);
      if (ok) {
        document.getElementById('socialSearchResults').innerHTML = '<div style="text-align:center;padding:10px;color:#7ab030;">✅ Freund hinzugefügt!</div>';
        render();
        renderProfileTab();
      }
    }
  }

  return {
    init,
    render,
    showDiscovery,
    renderProfileTab,
    performSearch,
    addAndNotify
  };
})();

// Auto-Init
document.addEventListener('DOMContentLoaded', FriendsUI.init);
