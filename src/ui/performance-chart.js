/* ─── LEISTUNGSKURVE (Chart.js) ──────────────
 *
 * Performance-Chart im Profil-Sheet: Toggle LG/KK, Chart.js-Rendering.
 * Abhängigkeiten: Chart.js (global), localStorage (sd_history).
 */

let _perfChart = null;
let _perfWeapon = 'lg';

function setPerfWeapon(w) {
  _perfWeapon = w;
  document.getElementById('perfToggleLG')?.classList.toggle('active', w === 'lg');
  document.getElementById('perfToggleKK')?.classList.toggle('active', w === 'kk');
  renderPerformanceChart();
}

function _fmtChartDate(raw) {
  if (!raw) return '?';
  const m = raw.match(/^(\d{1,2})\.(\d{1,2})/);
  if (m) return m[1].padStart(2, '0') + '.' + m[2].padStart(2, '0') + '.';
  return raw.slice(0, 6);
}

function renderPerformanceChart() {
  const canvas = document.getElementById('perfChart');
  const emptyEl = document.getElementById('perfChartEmpty');
  if (!canvas) return;

  if (_perfChart) { _perfChart.destroy(); _perfChart = null; }

  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('sd_history') || '[]'); } catch (e) { }

  const filtered = hist
    .filter(h => h.weapon === _perfWeapon && h.playerPts != null)
    .slice(0, 15)
    .reverse();

  if (filtered.length === 0) {
    canvas.style.display = 'none';
    if (emptyEl) {
      emptyEl.style.display = 'flex';
      const totalHist = hist.length;
      const otherWeapon = _perfWeapon === 'lg' ? 'KK' : 'LG';
      const otherCount = hist.filter(h => h.weapon !== _perfWeapon && h.playerPts != null).length;
      emptyEl.innerHTML = totalHist === 0
        ? 'Noch keine Daten.<br><span style="font-size:.6rem;opacity:.5;">Spiel ein Duell und gib dein Ergebnis ein!</span>'
        : `Keine ${_perfWeapon.toUpperCase()}-Daten.<br><span style="font-size:.6rem;opacity:.5;">${otherCount} ${otherWeapon}-Einträge vorhanden → Toggle wechseln</span>`;
    }
    return;
  }
  canvas.style.display = '';
  if (emptyEl) emptyEl.style.display = 'none';

  const isKK = _perfWeapon === 'kk';
  const accent = isKK ? '#f0c840' : '#7ab030';
  const accentRgb = isKK ? '240,200,64' : '122,176,48';

  const labels = filtered.map(h => _fmtChartDate(h.date));
  const values = filtered.map(h =>
    isKK ? Math.round(parseFloat(h.playerPts))
      : Math.round(parseFloat(h.playerPts) * 10) / 10
  );

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const pad = Math.max((maxVal - minVal) * 0.15, isKK ? 3 : 2);
  const yMin = Math.floor(minVal - pad);
  const yMax = Math.ceil(maxVal + pad);

  const pointColors = filtered.map(h => {
    if (h.result === 'win') return '#7ab030';
    if (h.result === 'lose') return '#f06050';
    return accent;
  });

  const ctx2d = canvas.getContext('2d');
  const boxH = canvas.parentElement?.offsetHeight || 160;
  const grad = ctx2d.createLinearGradient(0, 0, 0, boxH);
  grad.addColorStop(0, `rgba(${accentRgb},.22)`);
  grad.addColorStop(1, `rgba(${accentRgb},0)`);

  _perfChart = new Chart(ctx2d, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: isKK ? 'KK (Ringe)' : 'LG (Zehntel)',
        data: values,
        borderColor: accent,
        borderWidth: 2.5,
        pointBackgroundColor: pointColors,
        pointBorderColor: 'rgba(0,0,0,.4)',
        pointBorderWidth: 1,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointHoverBorderWidth: 2,
        fill: true,
        backgroundColor: grad,
        tension: 0.38,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(8,16,4,.95)',
          borderColor: accent,
          borderWidth: 1,
          titleColor: 'rgba(255,255,255,.45)',
          bodyColor: accent,
          titleFont: { family: 'Outfit', size: 10, weight: '400' },
          bodyFont: { family: 'DM Mono', size: 14, weight: '700' },
          padding: 11,
          displayColors: false,
          callbacks: {
            title: items => filtered[items[0].dataIndex]?.date || items[0].label,
            label: item => isKK
              ? ` ${item.raw} Ringe`
              : ` ${item.raw.toFixed(1)} Zehntel`,
            afterLabel: item => {
              const h = filtered[item.dataIndex];
              if (!h) return '';
              const res = h.result === 'win' ? '✓ Sieg' : h.result === 'lose' ? '✗ Niederlage' : '= Unentschieden';
              return ` ${res} · ${h.diffName || h.diff || ''}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: 'rgba(255,255,255,.22)',
            font: { family: 'Outfit', size: 9 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
          grid: { color: 'rgba(255,255,255,.04)' },
          border: { color: 'rgba(255,255,255,.07)' },
        },
        y: {
          suggestedMin: yMin,
          suggestedMax: yMax,
          ticks: {
            color: 'rgba(255,255,255,.25)',
            font: { family: 'DM Mono', size: 9 },
            maxTicksLimit: 5,
            callback: v => isKK ? v : v.toFixed(1),
          },
          grid: { color: 'rgba(255,255,255,.05)' },
          border: { color: 'rgba(255,255,255,.07)' },
        }
      }
    }
  });
}
