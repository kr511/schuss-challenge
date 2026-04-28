/**
 * ProfileView.js - Profil-Visitenkarte & Live-Feed
 */
const ProfileView = (function () {
  'use strict';

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="profile-view-tabs">
        <button class="tab-btn active" onclick="ProfileView.switchTab('for-you')">Ich</button>
        <button class="tab-btn" onclick="ProfileView.switchTab('live')">Live</button>
      </div>
      <div id="for-you-content" class="tab-content active">
        <div id="profile-card-mount">Lädt Profil...</div>
      </div>
      <div id="live-content" class="tab-content">
        <div id="live-ticker-mount">Lade Live-Feed...</div>
      </div>
    `;

    renderProfile();
    renderLiveTicker();
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`${tabId}-content`).classList.add('active');
    event.target.classList.add('active');
  }

  async function renderProfile() {
    const mount = document.getElementById('profile-card-mount');
    // Hole Best-Stats von EnhancedAnalytics
    const bests = EnhancedAnalytics.getPersonalBests();
    
    mount.innerHTML = `
      <div class="card">
        <h3>Deine Schützen-Visitenkarte</h3>
        <div class="profile-grid">
          ${Object.entries(bests).map(([disc, best]) => `
            <div class="stat-card">
              <div class="label">${disc.toUpperCase()} PB</div>
              <div class="value">${best.score.toFixed(1)}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn" onclick="ProfileView.syncProfile()">Profil-Daten synchronisieren</button>
      </div>
    `;
  }

  async function renderLiveTicker() {
    const mount = document.getElementById('live-ticker-mount');
    try {
      const response = await fetch('/api/activity/live');
      const data = await response.json();
      
      if (!data.activity || data.activity.length === 0) {
        mount.innerHTML = '<p>Momentan keine Schützen online.</p>';
        return;
      }

      mount.innerHTML = `
        <div class="live-list">
          ${data.activity.map(a => `
            <div class="live-entry">
              <span>👤 Schütze ${a.user_id.slice(0, 4)}</span>
              <span>🎯 ${a.discipline}</span>
              <span class="difficulty">${a.difficulty}</span>
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      mount.innerHTML = 'Konnte Live-Feed nicht laden.';
    }
  }

  return { render, switchTab, renderProfile, renderLiveTicker };
})();
