const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Fix button text: "SCANNER ÖFFNEN & STARTEN" → "Duell starten."
html = html.replace(
  '🎯 SCANNER ÖFFNEN &amp; STARTEN',
  '🎯 Duell starten.'
);
html = html.replace(
  '🎯 SCANNER ÖFFNEN & STARTEN',
  '🎯 Duell starten.'
);

// 2. Fix username: use sd_username (set during onboarding) instead of schuss_username
html = html.replace(
  /localStorage\.getItem\('schuss_username'\)/g,
  "localStorage.getItem('sd_username')"
);

// 3. Fix the openDuelSetup() to also move weapon tabs and disc tabs into the bottom sheet
const oldOpenFn = `function openDuelSetup() {
    triggerHaptic();
    const ov = document.getElementById('duelSetupSheetOverlay');
    const sheet = document.getElementById('duelSetupSheet');
    ov.style.display = 'block';
    
    // Move legacy setup into mount if not moved yet
    const mount = document.getElementById('duelSetupContentMount');
    if(mount.children.length === 0) {
      const dist = document.getElementById('distCard');
      const diffInfo = document.getElementById('diffInfo');
      const diffGrp = document.getElementById('diffGroup').parentElement;
      const shc = document.getElementById('shotCountCard');
      const brst = document.getElementById('burstBtn');
      if(dist) mount.appendChild(dist);
      if(diffGrp) mount.appendChild(diffGrp);
      if(diffInfo) mount.appendChild(diffInfo);
      if(shc) mount.appendChild(shc);
      if(brst) mount.appendChild(brst);
      
      // Hide the legacy start button to prevent confusion
      const oldBtnList = document.querySelectorAll('.actions .btn-fire');
      oldBtnList.forEach(b => { if(b.innerText.includes('STARTEN') && b.parentElement.id !== 'duelSetupSheet') b.parentElement.style.display = 'none'; });
    }
    
    requestAnimationFrame(() => {
      ov.style.opacity = '1';
      sheet.style.bottom = '0';
    });
  }`;

const newOpenFn = `function openDuelSetup() {
    if(typeof triggerHaptic === 'function') triggerHaptic();
    const ov = document.getElementById('duelSetupSheetOverlay');
    const sheet = document.getElementById('duelSetupSheet');
    ov.style.display = 'block';
    
    // Move ALL setup elements into the bottom sheet mount
    const mount = document.getElementById('duelSetupContentMount');
    if(mount.children.length === 0) {
      // Weapon tabs (LG / KK)
      const weapTabs = document.getElementById('weaponTabs');
      if(weapTabs) { weapTabs.style.display = ''; mount.appendChild(weapTabs); }
      
      // Discipline sub-tabs
      const discTabs = document.getElementById('discTabs');
      if(discTabs) { discTabs.style.display = ''; mount.appendChild(discTabs); }
      
      // Setup tag (shows current selection)
      const setupTag = document.getElementById('setupTag');
      if(setupTag) { setupTag.style.display = ''; setupTag.style.textAlign = 'center'; setupTag.style.margin = '10px 0'; mount.appendChild(setupTag); }
      
      // Difficulty card
      const diffGrp = document.getElementById('diffGroup');
      if(diffGrp && diffGrp.parentElement) mount.appendChild(diffGrp.parentElement);
      
      // Difficulty info
      const diffInfo = document.getElementById('diffInfo');
      if(diffInfo) mount.appendChild(diffInfo);
      
      // Distance card
      const dist = document.getElementById('distCard');
      if(dist) mount.appendChild(dist);
      
      // Shot count card
      const shc = document.getElementById('shotCountCard');
      if(shc) mount.appendChild(shc);
      
      // Burst toggle
      const brst = document.getElementById('burstBtn');
      if(brst) mount.appendChild(brst);
      
      // Hide old start button
      const oldBtnList = document.querySelectorAll('.actions .btn-fire');
      oldBtnList.forEach(b => { if(b.innerText.includes('STARTEN') && !b.closest('#duelSetupSheet')) b.parentElement.style.display = 'none'; });
    }
    
    requestAnimationFrame(() => {
      ov.style.opacity = '1';
      sheet.style.bottom = '0';
    });
  }`;

html = html.replace(oldOpenFn, newOpenFn);

// 4. Also fix the closeDuelSetup to be more lenient (click anywhere on overlay)
html = html.replace(
  `function closeDuelSetup(e) {
    if(e && e.target.id !== 'duelSetupSheetOverlay' && e.target.tagName !== 'BUTTON' && !e.target.closest('#btnStopLiveScan')) return;`,
  `function closeDuelSetup(e) {
    if(e && e.target && e.target.id !== 'duelSetupSheetOverlay') return;`
);

fs.writeFileSync('index.html', html);
console.log('All fixes applied!');
