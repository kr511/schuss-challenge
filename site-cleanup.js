(function(){
  'use strict';

  function addStyle(){
    if(document.getElementById('siteCleanupStyle')) return;
    var s=document.createElement('style');
    s.id='siteCleanupStyle';
    s.textContent='#privacyTrustStrip{width:100%;max-width:500px;margin:10px auto 12px;padding:0 18px;display:grid;grid-template-columns:1fr 1fr;gap:10px;position:relative;z-index:20;font-family:Outfit,-apple-system,BlinkMacSystemFont,sans-serif}#privacyTrustStrip .trust-card{background:rgba(255,255,255,.055);border:1px solid rgba(122,176,48,.24);border-radius:14px;padding:12px;color:#f0f0f0;box-shadow:0 8px 24px rgba(0,0,0,.25);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}#privacyTrustStrip .trust-card strong{display:block;font-size:.8rem;margin-bottom:5px;color:#8ecf40}#privacyTrustStrip .trust-card span{display:block;font-size:.72rem;line-height:1.35;color:rgba(240,240,240,.74)}#quickStartFlow{width:100%;max-width:500px;margin:0 auto 18px;padding:0 18px;position:relative;z-index:21;font-family:Outfit,-apple-system,BlinkMacSystemFont,sans-serif}#quickStartFlow .qsf-card{background:linear-gradient(145deg,rgba(20,24,18,.84),rgba(8,12,7,.92));border:1px solid rgba(142,207,64,.28);border-radius:18px;padding:16px;box-shadow:0 12px 36px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.06)}#quickStartFlow .qsf-title{font-size:1.06rem;font-weight:800;color:#fff;margin:0 0 4px}#quickStartFlow .qsf-sub{font-size:.78rem;line-height:1.4;color:rgba(255,255,255,.62);margin:0 0 14px}#quickStartFlow .qsf-primary{width:100%;border:none;border-radius:14px;background:linear-gradient(135deg,#00c3ff,#7ab030);color:#061006;font-weight:900;letter-spacing:.03em;font-size:.96rem;padding:14px 16px;margin-bottom:10px;box-shadow:0 10px 28px rgba(122,176,48,.32);cursor:pointer}#quickStartFlow .qsf-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}#quickStartFlow .qsf-btn{border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.055);color:#f4f4f4;font-weight:700;font-size:.8rem;padding:12px 10px;cursor:pointer;text-align:center}#quickStartFlow .qsf-btn:hover{border-color:rgba(142,207,64,.5);background:rgba(142,207,64,.1)}#quickStartFlow .qsf-note{font-size:.68rem;line-height:1.35;color:rgba(255,255,255,.42);text-align:center}.ag-guest{background:transparent!important;border:1px solid #374151!important;color:#d1d5db!important;margin-top:10px!important}.ag-guest:hover{border-color:#7ab030!important;color:#fff!important}@media(max-width:420px){#privacyTrustStrip{grid-template-columns:1fr}#quickStartFlow .qsf-grid{grid-template-columns:1fr}}';
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

  function startGuestMode(){
    localStorage.setItem('sd_guest_mode','true');
    window.SupabaseClient=null;
    window.SupabaseSession=null;
    window.dispatchEvent(new CustomEvent('guestModeReady'));
    var gate=document.getElementById('authGate');
    if(gate) gate.remove();
  }

  function addGuest(){
    window.__agGuest=startGuestMode;
    var form=document.getElementById('agForm');
    if(!form || document.getElementById('agGuest')) return;
    var btn=document.createElement('button');
    btn.id='agGuest';
    btn.className='ag-btn ag-guest';
    btn.type='button';
    btn.textContent='Ohne Anmeldung testen';
    btn.onclick=startGuestMode;
    var g=document.getElementById('agGoogle');
    if(g) g.insertAdjacentElement('afterend',btn); else form.appendChild(btn);
  }

  function showToast(msg){
    var old=document.getElementById('qsfToast');
    if(old) old.remove();
    var t=document.createElement('div');
    t.id='qsfToast';
    t.textContent=msg;
    t.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:99999;max-width:320px;background:rgba(10,14,8,.96);border:1px solid rgba(142,207,64,.35);border-radius:14px;padding:12px 14px;color:#fff;font:600 13px Outfit,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.45);text-align:center';
    document.body.appendChild(t);
    setTimeout(function(){ if(t.parentNode) t.remove(); }, 2600);
  }

  function findTextElement(words){
    var nodes=document.querySelectorAll('button,a,[onclick],.stat-card,.duel-entry,div,section');
    for(var i=0;i<nodes.length;i++){
      var txt=(nodes[i].textContent||'').toLowerCase();
      var ok=true;
      for(var j=0;j<words.length;j++) if(!txt.includes(words[j])) ok=false;
      if(ok) return nodes[i];
    }
    return null;
  }

  function goDuel(){
    if(typeof window.openDuelSetup==='function') { window.openDuelSetup(); return; }
    var btn=document.getElementById('btnOpenDuelSetup') || findTextElement(['duell']);
    if(btn && typeof btn.click==='function') { btn.click(); return; }
    showToast('Duellstart ist gleich hier auf der Startseite.');
  }

  function goPhoto(){
    var el=findTextElement(['foto']) || findTextElement(['auswertung']) || findTextElement(['ocr']);
    if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); if(typeof el.click==='function') setTimeout(function(){el.click();},250); return; }
    showToast('Fotoauswertung ist vorbereitet. Falls kein Button sichtbar ist: Menü/Profil öffnen.');
  }

  function goProgress(){
    var el=document.getElementById('pdOverviewHeader') || document.getElementById('pdMainStatsRow') || findTextElement(['übersicht']);
    if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); return; }
    showToast('Dein Fortschritt erscheint nach den ersten Duellen.');
  }

  function goLogin(){
    if(document.getElementById('authGate')){ showToast('Nutze den Login oben oder teste ohne Anmeldung.'); return; }
    localStorage.removeItem('sd_guest_mode');
    showToast('Für Rangliste/Sync bitte neu laden und anmelden.');
  }

  function addStartFlow(){
    if(document.getElementById('quickStartFlow')) return;
    var trust=document.getElementById('privacyTrustStrip');
    var setup=document.getElementById('screenSetup');
    if(!setup) return;
    var flow=document.createElement('section');
    flow.id='quickStartFlow';
    flow.innerHTML='<div class="qsf-card"><div class="qsf-title">In 10 Sekunden loslegen</div><p class="qsf-sub">Teste Schussduell ohne Risiko: erst Duell starten, danach optional anmelden für Rangliste und Sync.</p><button class="qsf-primary" id="qsfDuel">🎯 Duell starten</button><div class="qsf-grid"><button class="qsf-btn" id="qsfPhoto">📷 Fotoauswertung</button><button class="qsf-btn" id="qsfProgress">📊 Fortschritt</button><button class="qsf-btn" id="qsfGuest">👤 Ohne Anmeldung</button><button class="qsf-btn" id="qsfLogin">🏆 Rangliste / Login</button></div><div class="qsf-note">Keine Gemini-Bildanalyse · lokale Nutzung möglich · Online nur für Account, Sync und Rangliste</div></div>';
    if(trust && trust.nextSibling) setup.insertBefore(flow,trust.nextSibling); else setup.prepend(flow);
    document.getElementById('qsfDuel').onclick=goDuel;
    document.getElementById('qsfPhoto').onclick=goPhoto;
    document.getElementById('qsfProgress').onclick=goProgress;
    document.getElementById('qsfGuest').onclick=startGuestMode;
    document.getElementById('qsfLogin').onclick=goLogin;
  }

  function closeUpdatesDropdown(){
    var dropdown=document.getElementById('updatesDropdown');
    if(!dropdown) return;
    var visible=dropdown.style.display==='block' && dropdown.style.opacity==='1';
    if(!visible) return;
    if(window.UpdatesSystem && typeof window.UpdatesSystem.hideUpdates==='function'){
      window.UpdatesSystem.hideUpdates();
      return;
    }
    dropdown.style.opacity='0';
    dropdown.style.transform='translateY(-10px)';
    setTimeout(function(){ dropdown.style.display='none'; },200);
  }

  function installUpdatesCloseFix(){
    if(window.__updatesCloseFixInstalled) return;
    window.__updatesCloseFixInstalled=true;

    document.addEventListener('pointerdown',function(e){
      var dropdown=document.getElementById('updatesDropdown');
      var button=document.getElementById('updatesButton');
      if(!dropdown) return;
      var visible=dropdown.style.display==='block' && dropdown.style.opacity==='1';
      if(!visible) return;
      if(dropdown.contains(e.target)) return;
      if(button && button.contains(e.target)) return;
      closeUpdatesDropdown();
    },true);

    document.addEventListener('keydown',function(e){
      if(e.key==='Escape') closeUpdatesDropdown();
    });
  }

  function renameLabels(){
    var all=document.querySelectorAll('body *');
    all.forEach(function(el){
      if(el.children.length || !el.textContent) return;
      var before=el.textContent;
      var after=before
        .replace(/KI-Fotoanalyse/g,'Fotoauswertung')
        .replace(/KI Fotoanalyse/g,'Fotoauswertung')
        .replace(/KI-Analyse/g,'Fotoauswertung');
      if(after!==before) el.textContent=after;
    });
  }

  function removeOldTags(){
    document.querySelectorAll('script[src*="gemini-ai.js"]').forEach(function(el){el.remove();});
  }

  function run(){removeOldTags();addStyle();addTrust();addStartFlow();addGuest();installUpdatesCloseFix();renameLabels();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();

  var scheduled=false;
  new MutationObserver(function(){
    if(scheduled) return;
    scheduled=true;
    setTimeout(function(){scheduled=false;addStartFlow();addGuest();installUpdatesCloseFix();renameLabels();removeOldTags();},120);
  }).observe(document.documentElement,{childList:true,subtree:true});
})();
