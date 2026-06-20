// Trainings-Heatmap – zeigt Trainingstage der letzten 12 Wochen
(function () {
  'use strict';

  var WEEKS = 12;
  var TOTAL_DAYS = WEEKS * 7;

  function _readHistory() {
    try { return JSON.parse(localStorage.getItem('sd_history') || '[]'); }
    catch (_) { return []; }
  }

  function _dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function render() {
    var container = document.getElementById('trainingHeatmap');
    if (!container) return;

    var history = _readHistory();
    var now = Date.now();
    var todayKey = _dayKey(now);
    var cutoff = now - TOTAL_DAYS * 24 * 60 * 60 * 1000;

    // Map: dayKey → session count
    var countMap = {};
    for (var i = 0; i < history.length; i++) {
      var entry = history[i];
      var ts = entry.timestamp || entry.ts;
      if (!ts || ts < cutoff) continue;
      var k = _dayKey(ts);
      countMap[k] = (countMap[k] || 0) + 1;
    }

    // Grid starts on the Sunday 12 weeks back, aligned to the week
    var todayDate = new Date();
    todayDate.setHours(23, 59, 59, 999);
    var startDate = new Date(now - (TOTAL_DAYS - 1) * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    // Snap back to Sunday of that week
    startDate.setDate(startDate.getDate() - startDate.getDay());
    var startMs = startDate.getTime();

    var cells = [];
    for (var d = 0; d < TOTAL_DAYS; d++) {
      var cellMs = startMs + d * 24 * 60 * 60 * 1000;
      var key = _dayKey(cellMs);
      var count = countMap[key] || 0;
      var isFuture = cellMs > todayDate.getTime();
      cells.push({ key: key, count: count, isFuture: isFuture, isToday: key === todayKey, ms: cellMs });
    }

    var totalTrainings = Object.values(countMap).reduce(function (a, b) { return a + b; }, 0);
    var activeDays = Object.keys(countMap).length;

    var cellsHtml = cells.map(function (cell) {
      var cls = 'hm-cell';
      if (cell.isFuture) cls += ' hm-future';
      else if (cell.count === 0) cls += ' hm-empty';
      else if (cell.count === 1) cls += ' hm-1';
      else if (cell.count === 2) cls += ' hm-2';
      else cls += ' hm-3';
      if (cell.isToday) cls += ' hm-today';
      var dateStr = new Date(cell.ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      var tip = dateStr + (cell.count > 0
        ? ': ' + cell.count + ' Training' + (cell.count > 1 ? 's' : '')
        : ': kein Training');
      return '<div class="' + cls + '" title="' + tip + '" aria-label="' + tip + '"></div>';
    }).join('');

    container.innerHTML =
      '<div class="heatmap-wrap">' +
        '<div class="heatmap-header">' +
          '<span class="heatmap-title">Trainingsverlauf</span>' +
          '<span class="heatmap-meta">' + activeDays + ' Tage · ' + totalTrainings + ' Einheiten</span>' +
        '</div>' +
        '<div class="heatmap-grid">' + cellsHtml + '</div>' +
        '<div class="heatmap-legend">' +
          '<span class="hm-legend-label">Weniger</span>' +
          '<div class="hm-cell hm-empty" aria-hidden="true"></div>' +
          '<div class="hm-cell hm-1" aria-hidden="true"></div>' +
          '<div class="hm-cell hm-2" aria-hidden="true"></div>' +
          '<div class="hm-cell hm-3" aria-hidden="true"></div>' +
          '<span class="hm-legend-label">Mehr</span>' +
        '</div>' +
      '</div>';
  }

  window.TrainingHeatmap = { render: render };
})();
