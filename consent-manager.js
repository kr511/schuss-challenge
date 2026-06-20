/* Lädt optionale Vercel-Messung erst nach ausdrücklicher Einwilligung. */
(function () {
  'use strict';

  const KEY = 'sd_analytics_consent_v1';
  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

  function isProduction() {
    return !LOCAL_HOSTS.has(window.location.hostname);
  }

  function getChoice() {
    try { return localStorage.getItem(KEY) || ''; }
    catch (_e) { return ''; }
  }

  function loadScript(src, id) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.defer = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function enableAnalytics() {
    if (!isProduction()) return;
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
    loadScript('/_vercel/insights/script.js', 'vercelAnalyticsScript');
    loadScript('/_vercel/speed-insights/script.js', 'vercelSpeedInsightsScript');
  }

  function closeBanner() {
    const banner = document.getElementById('analyticsConsent');
    if (banner) banner.remove();
  }

  function choose(value) {
    const previous = getChoice();
    try { localStorage.setItem(KEY, value); } catch (_e) {}
    closeBanner();
    if (value === 'accepted') enableAnalytics();
    window.dispatchEvent(new CustomEvent('analyticsConsentChanged', { detail: { value } }));
    if (previous === 'accepted' && value === 'rejected') window.location.reload();
  }

  function open() {
    if (!isProduction()) return false;
    if (document.getElementById('analyticsConsent')) return true;
    const banner = document.createElement('section');
    banner.id = 'analyticsConsent';
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Analytics-Einwilligung');
    banner.innerHTML = '<div class="consent-copy"><strong>Optionale Nutzungsanalyse</strong>'
      + '<span>Mit deiner Zustimmung messen wir Seitenaufrufe und Ladezeiten über Vercel. Die App funktioniert auch ohne diese Messung.</span>'
      + '<a href="datenschutz.html">Datenschutz</a></div>'
      + '<div class="consent-actions"><button type="button" data-consent="rejected">Ablehnen</button>'
      + '<button type="button" class="consent-accept" data-consent="accepted">Zustimmen</button></div>';
    banner.addEventListener('click', function (event) {
      const button = event.target.closest('[data-consent]');
      if (button) choose(button.dataset.consent);
    });
    document.body.appendChild(banner);
    return true;
  }

  function init() {
    const choice = getChoice();
    if (choice === 'accepted') enableAnalytics();
    else if (!choice) open();
  }

  window.AnalyticsConsent = { open, choose, getChoice, isProduction };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
