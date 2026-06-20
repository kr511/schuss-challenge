// Wake Lock – verhindert Display-Sleep während einer aktiven Spielsession
(function () {
  'use strict';

  if (!('wakeLock' in navigator)) return;

  var _lock = null;
  var _active = false;

  async function _acquire() {
    if (_lock) return;
    try {
      _lock = await navigator.wakeLock.request('screen');
      _lock.addEventListener('release', function () { _lock = null; });
    } catch (_e) { /* Berechtigung verweigert oder Feature nicht verfügbar */ }
  }

  function _release() {
    if (!_lock) return;
    _lock.release().catch(function () {});
    _lock = null;
  }

  function _sync() {
    var body = document.body;
    var shouldHold = body && body.classList.contains('game-screen-active')
      && document.visibilityState === 'visible';
    if (shouldHold && !_active) { _active = true; _acquire(); }
    else if (!shouldHold && _active) { _active = false; _release(); }
  }

  document.addEventListener('visibilitychange', _sync);

  // Watch body class changes for game-screen-active
  new MutationObserver(_sync).observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });

  _sync();
})();
