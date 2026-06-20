// Streak-Erinnerung – lokale Push-Benachrichtigung an Spieltagen (Mi-Fr) um 18 Uhr,
// wenn der Nutzer heute noch kein Duell gespielt hat.
(function () {
  'use strict';

  var REMINDER_HOUR = 18;
  var KEY = 'sd_streak_reminder_sent';
  var _timer = null;

  function todayId() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function isStreakDay() {
    // 0=So, 3=Mi, 4=Do, 5=Fr
    var day = new Date().getDay();
    return day >= 3 && day <= 5;
  }

  function hasPlayedToday() {
    try {
      if (typeof StreakTracker !== 'undefined') {
        return StreakTracker.getState().lastPlayedDate === todayId();
      }
    } catch (_) {}
    return false;
  }

  function alreadySent() {
    try { return localStorage.getItem(KEY) === todayId(); } catch (_) { return false; }
  }

  function markSent() {
    try { localStorage.setItem(KEY, todayId()); } catch (_) {}
  }

  function fire() {
    if (!isStreakDay()) return;
    if (hasPlayedToday()) return;
    if (alreadySent()) return;
    if (!window.PushNotifications || !window.PushNotifications.isGranted()) return;
    markSent();
    var streak = 0;
    try { streak = StreakTracker.getStreakStats().current; } catch (_) {}
    var streakText = streak > 0 ? ' – Streak: ' + streak + ' 🔥' : '';
    window.PushNotifications.showLocal(
      '🎯 Heute noch kein Duell!',
      'Spieltag' + streakText + ' – ein kurzes Duell hält die Streak am Leben!'
    );
  }

  function arm() {
    if (!isStreakDay()) return;
    if (_timer) { clearTimeout(_timer); _timer = null; }
    var now = new Date();
    var target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), REMINDER_HOUR, 0, 0);
    var delay = target - now;
    if (delay <= 0) {
      // Schon nach 18 Uhr: sofort prüfen
      fire();
    } else {
      _timer = setTimeout(fire, delay);
    }
  }

  function onReady() {
    arm();
    // Wenn App aus dem Hintergrund kommt, erneut prüfen
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) arm();
    });
  }

  // 2 Sekunden warten bis StreakTracker initialisiert ist
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(onReady, 2000); });
  } else {
    setTimeout(onReady, 2000);
  }
})();
