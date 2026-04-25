/** Gemini AI compatibility shim + local play helper. */
(function () {
  'use strict';

  if (!window.GeminiAI) {
    var disabledMessage = 'Gemini AI ist in dieser App-Konfiguration deaktiviert.';
    window.GeminiAI = {
      enabled: false,
      available: false,
      reason: disabledMessage,
      init: async function () { return false; },
      analyze: async function () { return { ok: false, reason: disabledMessage }; },
      scoreTarget: async function () { return { ok: false, reason: disabledMessage }; },
      getStatus: function () { return { enabled: false, available: false, reason: disabledMessage }; }
    };
  }

  function startLocalPlay() {
    localStorage.setItem('sd_local_play', '1');
    if (!localStorage.getItem('username')) localStorage.setItem('username', 'Gast');
    if (!localStorage.getItem('sd_username')) localStorage.setItem('sd_username', 'Gast');
    window.SchussduellLocalPlay = true;
    var gate = document.getElementById('authGate');
    if (gate && gate.parentNode) gate.parentNode.removeChild(gate);
  }

  function addLocalPlayButton() {
    var form = document.getElementById('agForm');
    if (!form || document.getElementById('agLocalPlay')) return false;
    var btn = document.createElement('button');
    btn.id = 'agLocalPlay';
    btn.type = 'button';
    btn.textContent = '👤 Lokal spielen';
    btn.style.cssText = 'width:100%;padding:12px;margin-top:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#f3f4f6;font-size:14px;font-weight:800;cursor:pointer;';
    btn.onclick = startLocalPlay;
    form.appendChild(btn);
    return true;
  }

  function boot() {
    window.startSchussduellLocalPlay = startLocalPlay;
    if (localStorage.getItem('sd_local_play') === '1') startLocalPlay();
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (addLocalPlayButton() || tries > 100) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
