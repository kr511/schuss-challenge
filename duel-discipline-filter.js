/**
 * Duel Discipline Filter
 *
 * Keeps the discipline choices scoped to the selected weapon:
 * - Luftgewehr: LG 40, LG 60
 * - Kleinkaliber: KK 50m, KK 100m, KK 3×20
 */
(function () {
  'use strict';

  const VERSION = '4.3';
  if (window.DuelDisciplineFilter?.version === VERSION) return;

  const WEAPON_DISCIPLINES = {
    lg: ['LG 40', 'LG 60'],
    kk: ['KK 50m', 'KK 100m', 'KK 3×20']
  };

  const FALLBACK_DISCIPLINE = {
    lg: 'lg40',
    kk: 'kk50'
  };

  let attempts = 0;
  let patched = false;

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function getRuntime() {
    return window.DuelSetupRuntime;
  }

  function getWeapon() {
    return getRuntime()?.getState?.().weapon || 'lg';
  }

  function getDiscipline() {
    return getRuntime()?.getState?.().discipline || 'lg40';
  }

  function cardLabel(card) {
    const label = card.querySelector('.duel-discipline-label') || card;
    return normalizeText(label.textContent);
  }

  function isVisibleForWeapon(label, weapon) {
    return (WEAPON_DISCIPLINES[weapon] || WEAPON_DISCIPLINES.lg).includes(label);
  }

  function ensureActiveDisciplineIsValid() {
    const api = getRuntime();
    if (!api?.setDiscipline || !api?.getState) return false;

    const weapon = getWeapon();
    const discipline = getDiscipline();
    const isLgDiscipline = discipline === 'lg40' || discipline === 'lg60';
    const isKkDiscipline = discipline === 'kk50' || discipline === 'kk100' || discipline === 'kk3x20';

    if ((weapon === 'lg' && !isLgDiscipline) || (weapon === 'kk' && !isKkDiscipline)) {
      api.setDiscipline(FALLBACK_DISCIPLINE[weapon]);
      return true;
    }

    return false;
  }

  function applyFilter() {
    const weapon = getWeapon();
    const cards = Array.from(document.querySelectorAll('.duel-discipline'));
    if (!cards.length) return;

    cards.forEach((card) => {
      const label = cardLabel(card);
      const visible = isVisibleForWeapon(label, weapon);
      card.hidden = !visible;
      card.style.display = visible ? '' : 'none';
      card.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });

    const grid = document.querySelector('.duel-option-grid.disciplines');
    if (grid) {
      grid.dataset.weapon = weapon;
      grid.style.gridTemplateColumns = weapon === 'lg'
        ? 'repeat(2, minmax(0, 1fr))'
        : 'repeat(2, minmax(0, 1fr))';
    }
  }

  function afterRender() {
    requestAnimationFrame(() => {
      if (!ensureActiveDisciplineIsValid()) applyFilter();
    });
    setTimeout(applyFilter, 80);
  }

  function patchMethod(api, name) {
    const original = api[name];
    if (typeof original !== 'function' || original.__disciplineFilterPatched) return;

    const patchedMethod = function patchedDisciplineFilterMethod(...args) {
      const result = original.apply(this, args);
      afterRender();
      return result;
    };

    patchedMethod.__disciplineFilterPatched = true;
    api[name] = patchedMethod;
  }

  function patchRuntime() {
    const api = getRuntime();
    if (!api || api.__disciplineFilterVersion === VERSION) return Boolean(api);

    ['openSheet', 'renderSettings', 'setWeapon', 'setDiscipline', 'setDifficulty', 'setMode'].forEach((name) => patchMethod(api, name));

    api.__disciplineFilterVersion = VERSION;

    window.openDuelSetup = api.openSheet;
    window.selectGameMode = (mode) => api.renderSettings(mode || 'bot');
    window.duelRuntimeFixSetWeapon = api.setWeapon;
    window.duelRuntimeFixSetDiscipline = api.setDiscipline;
    window.duelRuntimeFixSetDifficulty = api.setDifficulty;

    afterRender();
    patched = true;
    return true;
  }

  function waitForRuntime() {
    if (patchRuntime()) return;

    attempts += 1;
    if (attempts > 120) {
      console.warn('⚠️ DuelDisciplineFilter: DuelSetupRuntime nicht gefunden');
      return;
    }

    setTimeout(waitForRuntime, 50);
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('.duel-pill, .duel-discipline, .duel-difficulty, .duel-card')) {
      afterRender();
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForRuntime);
  } else {
    waitForRuntime();
  }

  window.DuelDisciplineFilter = {
    initialized: true,
    version: VERSION,
    applyFilter,
    patchRuntime,
    getState: () => ({ patched, attempts, weapon: getWeapon(), discipline: getDiscipline() })
  };
})();
