// Score-Trend-Sparkline – SVG-Liniendiagramm der letzten 10 Trainings
(function () {
  'use strict';

  var MAX_SESSIONS = 10;

  function _readSessions() {
    try {
      var raw = localStorage.getItem('sd_history') || '[]';
      return JSON.parse(raw).slice(0, MAX_SESSIONS).reverse(); // chronologisch älteste → neueste
    } catch (_) { return []; }
  }

  function _fmtDate(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '.' + d.getDate() + '.';
  }

  function _trendArrow(sessions) {
    if (sessions.length < 2) return { arrow: '→', delta: '±0.0', color: 'rgba(255,255,255,0.4)' };
    var half = Math.max(1, Math.floor(sessions.length / 2));
    var older = sessions.slice(0, half);
    var newer = sessions.slice(sessions.length - half);
    var avgOlder = older.reduce(function (a, s) { return a + (s.avg || 0); }, 0) / older.length;
    var avgNewer = newer.reduce(function (a, s) { return a + (s.avg || 0); }, 0) / newer.length;
    var diff = avgNewer - avgOlder;
    if (Math.abs(diff) < 0.15) return { arrow: '→', delta: '±0.0', color: 'rgba(255,255,255,0.4)' };
    if (diff > 0) return { arrow: '↑', delta: '+' + diff.toFixed(1), color: '#4ade80' };
    return { arrow: '↓', delta: diff.toFixed(1), color: '#f87171' };
  }

  function _buildSvg(sessions) {
    var avgs = sessions.map(function (s) { return s.avg || 0; });
    var minV = Math.max(0, Math.min.apply(null, avgs) - 2);
    var maxV = Math.max.apply(null, avgs) + 2;
    var range = maxV - minV || 1;
    var W = 280, H = 52, padX = 6, padY = 6;
    var iW = W - padX * 2, iH = H - padY * 2;
    var n = avgs.length;

    function px(i) { return padX + (n < 2 ? iW / 2 : (i / (n - 1)) * iW); }
    function py(v) { return padY + (1 - (v - minV) / range) * iH; }

    var pts = avgs.map(function (v, i) { return px(i) + ',' + py(v); }).join(' ');
    var dots = avgs.map(function (v, i) {
      var isLast = i === avgs.length - 1;
      return '<circle cx="' + px(i) + '" cy="' + py(v) + '" r="' + (isLast ? 3.5 : 2.2) + '" fill="' + (isLast ? '#4ade80' : 'rgba(74,222,128,0.55)') + '"/>';
    }).join('');

    // Tooltip-Titel für letzten Punkt
    var lastTs = sessions[sessions.length - 1] && (sessions[sessions.length - 1].timestamp || sessions[sessions.length - 1].ts || sessions[sessions.length - 1].date);
    var lastDate = lastTs ? _fmtDate(lastTs) : '';
    var lastAvg = avgs[avgs.length - 1];
    var lastTitle = lastDate ? lastDate + ' · ' + lastAvg.toFixed(1) + ' Ringe' : lastAvg.toFixed(1) + ' Ringe';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trendkurve">'
      + '<polyline points="' + pts + '" fill="none" stroke="rgba(74,222,128,0.45)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>'
      + dots
      + '<title>' + lastTitle + '</title>'
      + '</svg>';
  }

  function render() {
    var container = document.getElementById('scoreSparkline');
    if (!container) return;

    var sessions = _readSessions();
    if (sessions.length < 2) { container.innerHTML = ''; return; }

    var trend = _trendArrow(sessions);
    var latest = sessions[sessions.length - 1];
    var latestAvg = (latest && latest.avg) ? latest.avg.toFixed(1) : '–';

    container.innerHTML =
      '<div class="sparkline-wrap">'
        + '<div class="sparkline-header">'
          + '<span class="sparkline-title">Trendkurve</span>'
          + '<span class="sparkline-trend" style="color:' + trend.color + '">'
            + trend.arrow + ' ' + trend.delta
          + '</span>'
        + '</div>'
        + '<div class="sparkline-svg">' + _buildSvg(sessions) + '</div>'
        + '<div class="sparkline-footer">'
          + '<span class="sparkline-meta">Ø letzte 10 Trainings</span>'
          + '<span class="sparkline-latest">' + latestAvg + ' Ringe</span>'
        + '</div>'
      + '</div>';
  }

  window.ScoreSparkline = { render: render };
})();
