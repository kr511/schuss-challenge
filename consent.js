// Consent Manager – §25 TDDDG, Art. 6 Abs. 1 lit. a DSGVO
// Einwilligung wird versioniert unter dem Schlüssel 'sd_consent' gespeichert.
// Format: { v: number, analytics: boolean, ts: number, revokedTs?: number }
(function () {
  'use strict';

  var STORAGE_KEY = 'sd_consent';
  var CONSENT_VERSION = 1;

  function _read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_e) { return null; }
  }

  function _write(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_e) {}
  }

  function hasDecided() {
    var c = _read();
    return !!c && c.v === CONSENT_VERSION;
  }

  function hasAnalyticsConsent() {
    var c = _read();
    return !!c && c.v === CONSENT_VERSION && c.analytics === true;
  }

  function grant(analytics) {
    var data = { v: CONSENT_VERSION, analytics: !!analytics, ts: Date.now() };
    _write(data);
    window.dispatchEvent(new CustomEvent('consent:changed', { detail: data }));
    if (analytics) _loadAnalytics();
    return data;
  }

  function revoke() {
    var existing = _read() || {};
    var data = { v: CONSENT_VERSION, analytics: false, ts: existing.ts || Date.now(), revokedTs: Date.now() };
    _write(data);
    window.dispatchEvent(new CustomEvent('consent:changed', { detail: data }));
    return data;
  }

  function _loadAnalytics() {
    if (!document.querySelector('script[src*="/_vercel/insights"]')) {
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
      var s1 = document.createElement('script');
      s1.defer = true;
      s1.src = '/_vercel/insights/script.js';
      document.head.appendChild(s1);
    }
    if (!document.querySelector('script[src*="/_vercel/speed-insights"]')) {
      window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
      var s2 = document.createElement('script');
      s2.defer = true;
      s2.src = '/_vercel/speed-insights/script.js';
      document.head.appendChild(s2);
    }
  }

  function _showBanner() {
    var el = document.getElementById('consentBanner');
    if (el) el.removeAttribute('hidden');
  }

  function _hideBanner() {
    var el = document.getElementById('consentBanner');
    if (el) el.setAttribute('hidden', '');
  }

  function _bindBanner() {
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#consentAccept')) {
        grant(true);
        _hideBanner();
      } else if (e.target.closest && e.target.closest('#consentDecline')) {
        grant(false);
        _hideBanner();
      }
    });
  }

  function _init() {
    if (hasAnalyticsConsent()) _loadAnalytics();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        _bindBanner();
        if (!hasDecided()) _showBanner();
      });
    } else {
      _bindBanner();
      if (!hasDecided()) _showBanner();
    }
  }

  _init();

  window.ConsentManager = {
    hasDecided: hasDecided,
    hasAnalyticsConsent: hasAnalyticsConsent,
    grant: grant,
    revoke: revoke,
    getVersion: function () { return CONSENT_VERSION; },
    getConsent: _read,
  };
})();
