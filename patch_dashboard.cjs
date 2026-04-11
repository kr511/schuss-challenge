const fs = require('fs');

// --- PATCH INDEX.HTML ---
let html = fs.readFileSync('index.html', 'utf8');

const targetTag = '<div class="logo-tag" id="logoTag">Du vs. Bot · 40 Schuss · Wer trifft besser?</div>';
const newHtml = `<div class="logo-tag" id="logoTag" style="display:none;">Du vs. Bot · 40 Schuss · Wer trifft besser?</div>
    </div> <!-- close hdr -->
    
    <!-- ════ PREMIUM DASHBOARD ════ -->
    <div id="premiumDashboard" class="premium-dashboard">
      <!-- Greeting Row -->
      <div class="pd-greeting-row">
        <div class="pd-greeting-text">
          <h2 id="pdGreeting">Good Morning, <span class="pd-name" id="pdUserName">Alex</span>!</h2>
          <div class="pd-date" id="pdDate">Oct 26, 2023</div>
        </div>
        <div class="pd-profile-btn" onclick="toggleProfileMenu()">
          <span id="pdProfileInitial">A</span>
        </div>
      </div>
      
      <!-- Dashboard Title -->
      <div class="pd-section-title">
        Daily Challenge Dashboard
        <div class="pd-sub">Today's Goal: <span style="color:var(--accent)">250 Points</span></div>
      </div>
      
      <!-- Main Glass Card -->
      <div class="pd-card">
        <div class="pd-card-header">
          <div style="font-size:0.8rem; color:var(--text-muted)">Today's Challenge</div>
          <div style="font-size:1.1rem; font-weight:600; color:var(--text-main); margin-bottom: 2px;">Rapid Fire Marksman</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Progress: <span style="color:var(--accent)">185</span>/250 pts</div>
        </div>
        
        <div class="pd-progress-ring">
          <svg viewBox="0 0 100 50" width="100%" height="90">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="var(--blue-accent)" />
                <stop offset="100%" stop-color="var(--accent)" />
              </linearGradient>
            </defs>
            <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8" stroke-linecap="round"/>
            <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="url(#ringGrad)" stroke-width="8" stroke-linecap="round" stroke-dasharray="125" stroke-dashoffset="32" style="filter: drop-shadow(0 0 8px rgba(0,195,255,0.5));" />
          </svg>
          <div class="pd-ring-text">74%<div style="font-size:0.35em; color:var(--text-muted); font-weight:400; margin-top:-2px;">185/250 pts</div></div>
        </div>
        
        <div class="pd-stats-row">
          <div><div class="pd-stat-lbl">Hits</div><div class="pd-stat-val">92 <span style="font-size:0.7em;color:var(--text-muted)">/ 125</span></div></div>
          <div><div class="pd-stat-lbl">Avg Acc</div><div class="pd-stat-val">94%</div></div>
          <div><div class="pd-stat-lbl">Score</div><div class="pd-stat-val" style="color:var(--accent); text-shadow:0 0 8px var(--accent-glow);">8,450 XP</div></div>
        </div>
      </div>
      
      <!-- ACHIVEMENT BADGES -->
      <div class="pd-section-title" style="margin-top:20px;">
        Achievement Badges
      </div>
      <div class="pd-badges">
        <div class="pd-badge-card highlight-green">
          <div class="pd-icon">🎯</div>
          <div class="pd-badge-name">Bullseye King</div>
          <div class="pd-badge-lvl" style="color:var(--accent);">Level 5</div>
        </div>
        <div class="pd-badge-card highlight-blue">
          <div class="pd-icon">🛡️</div>
          <div class="pd-badge-name">Perfect Score</div>
          <div class="pd-badge-lvl" style="color:var(--blue-accent);">Master</div>
        </div>
        <div class="pd-badge-card opacity-50">
          <div class="pd-icon" style="filter:grayscale(1);">🏆</div>
          <div class="pd-badge-name">Weekly Warrior</div>
          <div class="pd-badge-lvl">Silver</div>
        </div>
        <div class="pd-badge-card highlight-green">
          <div class="pd-icon">✅</div>
          <div class="pd-badge-name">Daily Streak</div>
          <div class="pd-badge-lvl" style="color:var(--accent);">8 Days</div>
        </div>
      </div>
      
      <!-- RECENT SESSIONS -->
      <div class="pd-section-title" style="margin-top:20px;">
        Recent Sessions
      </div>
      <div class="pd-recent-list">
        <div class="pd-recent-item">
          <div><span style="color:var(--text-main);font-weight:500;">25m Pistol</span> <span style="color:var(--text-muted);font-size:0.8rem;">(98 pts)</span></div>
          <div style="color:var(--text-dim);font-size:0.8rem;">2min ago</div>
        </div>
        <div class="pd-recent-item">
          <div><span style="color:var(--text-main);font-weight:500;">Trap Event</span> <span style="color:var(--text-muted);font-size:0.8rem;">(145 pts)</span></div>
          <div style="color:var(--text-dim);font-size:0.8rem;">3h ago</div>
        </div>
      </div>
      
      <!-- FIXED LIVE SCANNER BUTTON MOUNTED HERE FOR PREVIEW, OR ABSOLUTE -->
      <button id="btnStartLiveScan">
        <span style="font-size:1.2rem;">🎯</span> LIVE SCANNER
      </button>

      <div id="v2ScannerView" style="display:none;position:fixed;top:0;left:0;width:100%;height:100vh;z-index:99999;background:#000;">
        <video id="v2ScannerVideo" playsinline autoplay muted style="width:100%;height:100%;object-fit:cover;display:block;"></video>
        <canvas id="v2ScannerCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></canvas>
        <div style="position:absolute;bottom:40px;left:0;width:100%;text-align:center;">
          <div style="background:rgba(0,0,0,0.6);display:inline-block;padding:10px 20px;border-radius:30px;font-size:0.9rem;color:var(--accent);font-weight:600;backdrop-filter:blur(8px);border:1px solid rgba(122,176,48,0.3);">
            Halte den Score in das Bild...
          </div>
        </div>
        <button id="btnStopLiveScan" style="position:absolute;top:50px;right:20px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:1.2rem;line-height:40px;text-align:center;cursor:pointer;backdrop-filter:blur(4px);">✕</button>
      </div>
      
    </div>
    <div style="height:100px;"></div>
    
    <!-- Script for Dynamic Greeting -->
    <script>
      function updatePDGreeting() {
        const hour = new Date().getHours();
        let greeting = "Guten Abend";
        if(hour >= 5 && hour < 12) greeting = "Guten Morgen";
        else if(hour >= 12 && hour < 18) greeting = "Guten Tag";
        
        const username = localStorage.getItem('schuss_username') || "Schulze";
        document.getElementById('pdGreeting').innerHTML = greeting + ', <span class="pd-name" style="color:var(--accent)">' + username + '</span>!';
        document.getElementById('pdProfileInitial').innerText = username.charAt(0).toUpperCase();
        
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        document.getElementById('pdDate').innerText = new Date().toLocaleDateString('de-DE', options);
      }
      document.addEventListener('DOMContentLoaded', updatePDGreeting);
    </script>
    
    <div style="display:none;"><!-- Hide old setup temporarily -->`;

html = html.replace(targetTag, newHtml);

// Make sure to close the div we hid above Just before the script imports or at the end of screenSetup
html = html.replace(/<div id="muzzleFlash"><\/div>/, '</div><div id="muzzleFlash"></div>');

fs.writeFileSync('index.html', html);


// --- APPEND CSS ---
const cssAppend = `
/* ════ PREMIUM DASHBOARD GLASSMORPHISM UI ════ */
.premium-dashboard {
  width: 100%;
  padding: 20px;
  max-width: 500px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
}

.pd-greeting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.pd-greeting-text h2 {
  font-size: 1.4rem;
  margin: 0 0 4px 0;
  font-weight: 700;
  color: var(--text-main);
}

.pd-greeting-text .pd-date {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.pd-profile-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 195, 255, 0.1);
  border: 1px solid rgba(0, 195, 255, 0.4);
  box-shadow: 0 0 15px rgba(0, 195, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main);
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
}

.pd-section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 12px;
  line-height: 1.3;
}
.pd-section-title .pd-sub {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-muted);
}

.pd-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05);
}

.pd-progress-ring {
  position: relative;
  text-align: center;
  margin: 20px 0;
}
.pd-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -10%);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--blue-accent);
  text-shadow: 0 0 10px rgba(0,195,255,0.4);
}

.pd-stats-row {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(255,255,255,0.05);
  padding-top: 15px;
}
.pd-stats-row > div {
  text-align: center;
  flex: 1;
}
.pd-stat-lbl {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.pd-stat-val {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-main);
}

.pd-badges {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.pd-badge-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 12px 6px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}
.pd-badge-card.highlight-green {
  border-color: rgba(122, 176, 48, 0.3);
  box-shadow: 0 4px 20px rgba(122, 176, 48, 0.1);
  background: linear-gradient(180deg, rgba(122,176,48,0.05) 0%, rgba(0,0,0,0) 100%);
}
.pd-badge-card.highlight-blue {
  border-color: rgba(0, 195, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 195, 255, 0.1);
  background: linear-gradient(180deg, rgba(0,195,255,0.05) 0%, rgba(0,0,0,0) 100%);
}
.pd-badge-card.opacity-50 {
  opacity: 0.5;
}
.pd-badge-card .pd-icon {
  font-size: 1.8rem;
  margin-bottom: 6px;
}
.pd-badge-name {
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--text-main);
  margin-bottom: 4px;
}
.pd-badge-lvl {
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--text-muted);
}

.pd-recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pd-recent-item {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* OVERRIDE THE FLOATING BUTTON FROM MOCKUP */
#btnStartLiveScan {
  position: fixed;
  bottom: 25px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: linear-gradient(90deg, #00c3ff 0%, #7ab030 100%);
  color: #000;
  border: none;
  border-radius: 30px;
  padding: 14px 30px;
  font-weight: 800;
  font-size: 1rem;
  box-shadow: 0 10px 30px rgba(122, 176, 48, 0.5);
  cursor: pointer;
  letter-spacing: 0.5px;
}
`;
fs.appendFileSync('styles.css', cssAppend);
console.log('Patch complete.');
