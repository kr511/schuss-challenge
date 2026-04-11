/**
 * PIXEL-PERFECT Dashboard Rebuild
 * Replaces the old broken dashboard with one that matches the mockup 1:1
 */
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// ─── 1. Remove the old premium dashboard block entirely ───
const dashStart = '<!-- ════ PREMIUM DASHBOARD ════ -->';
const dashEnd = '<!-- Script for Dynamic Greeting -->';
const startIdx = html.indexOf(dashStart);
const endIdx = html.indexOf(dashEnd);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find dashboard markers!');
  process.exit(1);
}

// Build the new dashboard HTML (pixel-perfect from mockup)
const newDashboard = `<!-- ════ PREMIUM DASHBOARD (PIXEL-PERFECT REBUILD) ════ -->
    <div id="premiumDashboard" style="width:100%;max-width:500px;margin:0 auto;padding:18px;position:relative;z-index:10;font-family:'Outfit',sans-serif;">

      <!-- ══ GREETING ROW ══ -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;">
        <div>
          <h2 id="pdGreeting" style="font-size:1.35rem;margin:0 0 3px 0;font-weight:700;color:#fff;">Guten Tag, <span style="color:#7ab030;" id="pdUserName">Alex</span>!</h2>
          <div id="pdDate" style="font-size:0.78rem;color:rgba(255,255,255,0.4);">11. Apr. 2026</div>
        </div>
        <div onclick="toggleProfileMenu()" style="width:44px;height:44px;border-radius:50%;background:rgba(0,195,255,0.08);border:1.5px solid rgba(0,195,255,0.35);box-shadow:0 0 15px rgba(0,195,255,0.15);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1.1rem;cursor:pointer;">
          <span id="pdProfileInitial">A</span>
        </div>
      </div>

      <!-- ══ DAILY CHALLENGE TITLE ══ -->
      <div style="margin-bottom:14px;">
        <div style="font-size:1.1rem;font-weight:600;color:#fff;line-height:1.3;">Daily Challenge Dashboard</div>
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);">Today's Goal: <span style="color:#7ab030;">250 Points</span></div>
      </div>

      <!-- ══ MAIN GLASS CARD (2-COLUMN) ══ -->
      <div style="display:flex;gap:12px;margin-bottom:20px;">

        <!-- LEFT: Challenge + Ring + Bottom Stats -->
        <div style="flex:1.6;background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
          <div style="font-size:0.72rem;color:rgba(255,255,255,0.45);margin-bottom:2px;">Today's Challenge</div>
          <div style="font-size:1rem;font-weight:600;color:#fff;margin-bottom:1px;">Rapid Fire Marksman</div>
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);">Progress: <span style="color:#7ab030;" id="pdProgressText">185</span>/250 pts</div>

          <!-- SVG RING -->
          <div style="position:relative;text-align:center;margin:16px 0 12px 0;">
            <svg viewBox="0 0 100 55" width="100%" style="max-width:200px;display:block;margin:0 auto;">
              <defs>
                <linearGradient id="ringGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#00c3ff" />
                  <stop offset="100%" stop-color="#7ab030" />
                </linearGradient>
              </defs>
              <path d="M 10 48 A 40 40 0 0 1 90 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="7" stroke-linecap="round"/>
              <path id="pdRingArc" d="M 10 48 A 40 40 0 0 1 90 48" fill="none" stroke="url(#ringGrad2)" stroke-width="7" stroke-linecap="round" stroke-dasharray="126" stroke-dashoffset="33" style="filter:drop-shadow(0 0 6px rgba(0,195,255,0.45));transition:stroke-dashoffset 0.8s ease;"/>
            </svg>
            <div style="position:absolute;top:52%;left:50%;transform:translate(-50%,-50%);text-align:center;">
              <div id="pdRingPct" style="font-size:1.5rem;font-weight:700;color:#00c3ff;text-shadow:0 0 10px rgba(0,195,255,0.3);">74%</div>
              <div id="pdRingSub" style="font-size:0.55rem;color:rgba(255,255,255,0.35);margin-top:-3px;">185/250 pts</div>
            </div>
          </div>

          <!-- BOTTOM STATS ROW -->
          <div style="display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;">
            <div style="text-align:center;flex:1;">
              <div style="font-size:0.6rem;color:rgba(255,255,255,0.4);margin-bottom:3px;">Hits</div>
              <div id="pdStatHits" style="font-size:0.85rem;font-weight:600;color:#fff;">92 <span style="font-size:0.6em;color:rgba(255,255,255,0.3);">/ 125</span></div>
            </div>
            <div style="text-align:center;flex:1;border-left:1px solid rgba(255,255,255,0.06);border-right:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:0.6rem;color:rgba(255,255,255,0.4);margin-bottom:3px;">Avg Acc</div>
              <div id="pdStatAcc" style="font-size:0.85rem;font-weight:600;color:#fff;">94%</div>
            </div>
            <div style="text-align:center;flex:1;">
              <div style="font-size:0.6rem;color:rgba(255,255,255,0.4);margin-bottom:3px;">Score</div>
              <div id="pdStatScore" style="font-size:0.85rem;font-weight:600;color:#7ab030;text-shadow:0 0 6px rgba(122,176,48,0.3);">8,450 XP</div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Daily Stats Sidebar -->
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.3);">
            <div style="font-size:0.6rem;color:rgba(255,255,255,0.4);margin-bottom:4px;">Accuracy</div>
            <div id="pdSideAcc" style="font-size:1.2rem;font-weight:700;color:#fff;">94%</div>
            <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:3px;margin-top:6px;overflow:hidden;">
              <div id="pdSideAccBar" style="height:100%;width:94%;background:linear-gradient(90deg,#00c3ff,#7ab030);border-radius:3px;"></div>
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.3);">
            <div style="font-size:0.6rem;color:rgba(255,255,255,0.4);margin-bottom:4px;">Total Shots</div>
            <div id="pdSideShots" style="font-size:1.2rem;font-weight:700;color:#fff;">125</div>
            <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:3px;margin-top:6px;overflow:hidden;">
              <div id="pdSideShotsBar" style="height:100%;width:60%;background:linear-gradient(90deg,#00c3ff,#7ab030);border-radius:3px;"></div>
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.3);">
            <div style="font-size:0.6rem;color:rgba(255,255,255,0.4);margin-bottom:4px;">Bullseyes</div>
            <div id="pdSideBullseyes" style="font-size:1.2rem;font-weight:700;color:#fff;">68</div>
            <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:3px;margin-top:6px;overflow:hidden;">
              <div id="pdSideBullseyesBar" style="height:100%;width:45%;background:linear-gradient(90deg,#00c3ff,#7ab030);border-radius:3px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ ACHIEVEMENT BADGES ══ -->
      <div style="font-size:1.05rem;font-weight:600;color:#fff;margin-bottom:12px;">Achievement Badges</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
        <div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(122,176,48,0.3);border-radius:14px;padding:12px 6px;text-align:center;box-shadow:0 4px 18px rgba(122,176,48,0.08);">
          <div style="font-size:1.7rem;margin-bottom:5px;">🎯</div>
          <div style="font-size:0.62rem;font-weight:600;color:#fff;line-height:1.15;margin-bottom:3px;">Bullseye<br>King</div>
          <div style="font-size:0.58rem;color:#7ab030;font-weight:500;">Level 5</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(0,195,255,0.3);border-radius:14px;padding:12px 6px;text-align:center;box-shadow:0 4px 18px rgba(0,195,255,0.08);">
          <div style="font-size:1.7rem;margin-bottom:5px;">🛡️</div>
          <div style="font-size:0.62rem;font-weight:600;color:#fff;line-height:1.15;margin-bottom:3px;">Perfect<br>Score</div>
          <div style="font-size:0.58rem;color:#00c3ff;font-weight:500;">Master</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px 6px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:0.55;">
          <div style="font-size:1.7rem;margin-bottom:5px;filter:grayscale(1);">🏆</div>
          <div style="font-size:0.62rem;font-weight:600;color:#fff;line-height:1.15;margin-bottom:3px;">Weekly<br>Warrior</div>
          <div style="font-size:0.58rem;color:rgba(255,255,255,0.4);font-weight:500;">Silver</div>
        </div>
        <div id="pdBadgeStreak" style="background:rgba(255,255,255,0.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(122,176,48,0.25);border-radius:14px;padding:12px 6px;text-align:center;box-shadow:0 4px 18px rgba(122,176,48,0.06);">
          <div style="font-size:1.7rem;margin-bottom:5px;">✅</div>
          <div style="font-size:0.62rem;font-weight:600;color:#fff;line-height:1.15;margin-bottom:3px;">Daily<br>Streak</div>
          <div id="pdStreakDays" style="font-size:0.58rem;color:#7ab030;font-weight:500;">8 Days</div>
        </div>
      </div>

      <!-- ══ RECENT SESSIONS ══ -->
      <div style="font-size:1.05rem;font-weight:600;color:#fff;margin-bottom:10px;">Recent Sessions</div>
      <div id="pdRecentList" style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        <div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:13px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div><span style="color:#fff;font-weight:500;">25m Pistol</span> <span style="color:rgba(255,255,255,0.4);font-size:0.8rem;">(98 pts)</span></div>
          <div style="color:rgba(255,255,255,0.3);font-size:0.78rem;">2min ago</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:13px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div><span style="color:#fff;font-weight:500;">Trap Event</span> <span style="color:rgba(255,255,255,0.4);font-size:0.8rem;">(145 pts)</span></div>
          <div style="color:rgba(255,255,255,0.3);font-size:0.78rem;">3h ago</div>
        </div>
      </div>

      <!-- ══ FLOATING DUELL STARTEN BUTTON ══ -->
      <button id="btnOpenDuelSetup" onclick="openDuelSetup()" style="position:fixed;bottom:25px;left:50%;transform:translateX(-50%);z-index:8999;background:linear-gradient(135deg,#00c3ff 0%,#7ab030 100%);color:#000;border:none;border-radius:30px;padding:15px 36px;font-weight:800;font-size:1.05rem;box-shadow:0 8px 30px rgba(122,176,48,0.45),0 0 60px rgba(0,195,255,0.15);cursor:pointer;letter-spacing:0.6px;">
        <span style="font-size:1.2rem;">🎯</span> DUELL STARTEN
      </button>

      <!-- ══ BOTTOM SHEET OVERLAY (Duel Setup) ══ -->
      <div id="duelSetupSheetOverlay" onclick="closeDuelSetup(event)" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9000;opacity:0;transition:opacity 0.3s ease;">
        <div id="duelSetupSheet" style="position:absolute;bottom:-100%;left:0;width:100%;max-height:85vh;overflow-y:auto;-webkit-overflow-scrolling:touch;background:rgba(18,18,20,0.97);border-top:1px solid rgba(255,255,255,0.1);border-radius:24px 24px 0 0;padding:20px 25px 35px 25px;transition:bottom 0.4s cubic-bezier(0.175,0.885,0.32,1);box-shadow:0 -10px 40px rgba(0,0,0,0.5);">
          <div style="width:40px;height:5px;background:rgba(255,255,255,0.2);border-radius:5px;margin:0 auto 20px auto;"></div>
          <h3 style="color:#fff;margin:0 0 20px 0;font-weight:700;font-size:1.3rem;">DUELL EINSTELLUNGEN</h3>
          <div id="duelSetupContentMount"><!-- Legacy setup elements move here --></div>
          <button class="btn-fire" onclick="startBattle();setTimeout(closeDuelSetup,500);" style="margin-top:18px;width:100%;background:linear-gradient(135deg,#00c3ff 0%,#7ab030 100%);color:#000;font-weight:800;border:none;border-radius:14px;padding:16px;font-size:1.1rem;cursor:pointer;box-shadow:0 6px 25px rgba(122,176,48,0.35);">
            🎯 SCANNER ÖFFNEN & STARTEN
          </button>
        </div>
      </div>

      <!-- ══ V2 Scanner View ══ -->
      <div id="v2ScannerView" style="display:none;position:fixed;top:0;left:0;width:100%;height:100vh;z-index:99999;background:#000;">
        <video id="v2ScannerVideo" playsinline autoplay muted style="width:100%;height:100%;object-fit:cover;display:block;"></video>
        <canvas id="v2ScannerCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></canvas>
        <div style="position:absolute;bottom:40px;left:0;width:100%;text-align:center;">
          <div style="background:rgba(0,0,0,0.6);display:inline-block;padding:10px 20px;border-radius:30px;font-size:0.9rem;color:#7ab030;font-weight:600;backdrop-filter:blur(8px);border:1px solid rgba(122,176,48,0.3);">
            Halte den Score in das Bild...
          </div>
        </div>
        <button id="btnStopLiveScan" style="position:absolute;top:50px;right:20px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:1.2rem;line-height:40px;text-align:center;cursor:pointer;backdrop-filter:blur(4px);">✕</button>
      </div>

    </div>
    <div style="height:90px;"></div>

    <!-- Script for Dynamic Greeting -->`;

html = html.substring(0, startIdx) + newDashboard + html.substring(endIdx);

fs.writeFileSync('index.html', html);
console.log('Dashboard rebuilt pixel-perfect!');
