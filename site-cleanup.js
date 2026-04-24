(function(){
  'use strict';

  function addStyle(){
    if(document.getElementById('siteCleanupStyle')) return;
    var s=document.createElement('style');
    s.id='siteCleanupStyle';
    s.textContent='#privacyTrustStrip{width:100%;max-width:500px;margin:10px auto 16px;padding:0 18px;display:grid;grid-template-columns:1fr 1fr;gap:10px;position:relative;z-index:20;font-family:Outfit,-apple-system,BlinkMacSystemFont,sans-serif}#privacyTrustStrip .trust-card{background:rgba(255,255,255,.055);border:1px solid rgba(122,176,48,.24);border-radius:14px;padding:12px;color:#f0f0f0;box-shadow:0 8px 24px rgba(0,0,0,.25);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}#privacyTrustStrip .trust-card strong{display:block;font-size:.8rem;margin-bottom:5px;color:#8ecf40}#privacyTrustStrip .trust-card span{display:block;font-size:.72rem;line-height:1.35;color:rgba(240,240,240,.74)}.ag-guest{background:transparent!important;border:1px solid #374151!important;color:#d1d5db!important;margin-top:10px!important}.ag-guest:hover{border-color:#7ab030!important;color:#fff!important}@media(max-width:420px){#privacyTrustStrip{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  function addTrust(){
    if(document.getElementById('privacyTrustStrip')) return;
    var setup=document.getElementById('screenSetup');
    if(!setup) return;
    var hdr=setup.querySelector('.hdr');
    var box=document.createElement('section');
    box.id='privacyTrustStrip';
    box.innerHTML='<div class="trust-card"><strong>🔒 Lokal nutzbar</strong><span>Viele Trainingsdaten bleiben im Browser.</span></div><div class="trust-card"><strong>🌐 Online optional</strong><span>Login, Rangliste und Sync brauchen Internet.</span></div><div class="trust-card"><strong>📷 Ohne Gemini</strong><span>Keine Google-Gemini-Bildanalyse aktiv.</span></div><div class="trust-card"><strong>🧑‍💻 Open Source</strong><span>Der Code ist öffentlich einsehbar.</span></div>';
    if(hdr && hdr.nextSibling) setup.insertBefore(box,hdr.nextSibling); else setup.prepend(box);
  }

  function addGuest(){
    window.__agGuest=function(){
      localStorage.setItem('sd_guest_mode','true');
      window.SupabaseClient=null;
      window.SupabaseSession=null;
      window.dispatchEvent(new CustomEvent('guestModeReady'));
      var gate=document.getElementById('authGate');
      if(gate) gate.remove();
    };
    var form=document.getElementById('agForm');
    if(!form || document.getElementById('agGuest')) return;
    var btn=document.createElement('button');
    btn.id='agGuest';
    btn.className='ag-btn ag-guest';
    btn.type='button';
    btn.textContent='Ohne Anmeldung testen';
    btn.onclick=window.__agGuest;
    var g=document.getElementById('agGoogle');
    if(g) g.insertAdjacentElement('afterend',btn); else form.appendChild(btn);
  }

  function renameLabels(){
    var all=document.querySelectorAll('body *');
    all.forEach(function(el){
      if(el.children.length) return;
      if(!el.textContent) return;
      el.textContent=el.textContent
        .replace(/KI-Fotoanalyse/g,'Fotoauswertung')
        .replace(/KI Fotoanalyse/g,'Fotoauswertung')
        .replace(/KI-Analyse/g,'Fotoauswertung');
    });
  }

  function removeOldTags(){
    document.querySelectorAll('script[src*="gemini-ai.js"]').forEach(function(el){el.remove();});
    document.querySelectorAll('script[src*="firebase-auth-compat.js"][data-provider="google"]').forEach(function(el){el.remove();});
  }

  function run(){removeOldTags();addStyle();addTrust();addGuest();renameLabels();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  new MutationObserver(function(){addGuest();renameLabels();removeOldTags();}).observe(document.documentElement,{childList:true,subtree:true});
})();
