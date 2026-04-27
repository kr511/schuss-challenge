(function (global) {
  'use strict';

  const DIFFICULTY_ORDER = ['easy', 'real', 'hard', 'elite'];
  const KK3X20_POSITIONS = ['Kniend', 'Liegend', 'Stehend'];
  const RING_RADII = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
  const PLAN_MAX_ATTEMPTS = 24;

  const DISCIPLINE_SHOTS = {
    lg40: 40,
    lg60: 60,
    kk50: 60,
    kk100: 60,
    kk3x20: 60
  };

  const BALANCE_TARGETS = {
    lg40: {
      easy: { min: 360, max: 375, scoringMode: 'tenths', infoUnit: 'Pkt.' },
      real: { min: 380, max: 390, scoringMode: 'tenths', infoUnit: 'Pkt.' },
      hard: { min: 395, max: 405, scoringMode: 'tenths', infoUnit: 'Pkt.' },
      elite: { floor: 410, scoringMode: 'tenths', infoUnit: 'Pkt.' }
    },
    lg60: {
      easy: { min: 575, max: 585, scoringMode: 'tenths', infoUnit: 'Pkt.' },
      real: { min: 590, max: 605, scoringMode: 'tenths', infoUnit: 'Pkt.' },
      hard: { min: 610, max: 618, scoringMode: 'tenths', infoUnit: 'Pkt.' },
      elite: { floor: 620, scoringMode: 'tenths', infoUnit: 'Pkt.' }
    },
    kk50: {
      easy: { min: 580, max: 588, scoringMode: 'tenths', infoUnit: 'Zehntel' },
      real: { min: 590, max: 600, scoringMode: 'tenths', infoUnit: 'Zehntel' },
      hard: { min: 602, max: 610, scoringMode: 'tenths', infoUnit: 'Zehntel' },
      elite: { floor: 612, scoringMode: 'tenths', infoUnit: 'Zehntel' }
    },
    kk100: {
      easy: { min: 580, max: 588, scoringMode: 'tenths', infoUnit: 'Zehntel' },
      real: { min: 590, max: 600, scoringMode: 'tenths', infoUnit: 'Zehntel' },
      hard: { min: 602, max: 610, scoringMode: 'tenths', infoUnit: 'Zehntel' },
      elite: { floor: 612, scoringMode: 'tenths', infoUnit: 'Zehntel' }
    },
    kk3x20: {
      easy: { min: 530, max: 542, scoringMode: 'whole', infoUnit: 'Ringe' },
      real: { min: 544, max: 555, scoringMode: 'whole', infoUnit: 'Ringe' },
      hard: { min: 557, max: 565, scoringMode: 'whole', infoUnit: 'Ringe' },
      elite: { floor: 567, scoringMode: 'whole', infoUnit: 'Ringe' }
    }
  };

  const SIGMA_PROFILES = {
    lg40: { easy: 18.562 / 132, real: 13.972 / 132, hard: 10.003 / 132, elite: 6.844 / 132 },
    lg60: { easy: 13.512 / 132, real: 10.442 / 132, hard: 7.540 / 132, elite: 6.305 / 132 },
    kk50: { easy: 12.824 / 132, real: 10.883 / 132, hard: 8.949 / 132, elite: 7.729 / 132 },
    kk100: { easy: 12.832 / 132, real: 10.878 / 132, hard: 8.945 / 132, elite: 7.737 / 132 },
    kk3x20: { easy: 13.768 / 132, real: 11.764 / 132, hard: 10.078 / 132, elite: 9.026 / 132 }
  };

  const SIGMA_JITTER = {
    easy: 0.12,
    real: 0.08,
    hard: 0.05,
    elite: 0.03
  };

  const KK3X20_POSITION_MULTIPLIERS = {
    Kniend: 1.1,
    Liegend: 0.7,
    Stehend: 1.8
  };

  function hashSeed(seed) {
    const text = String(seed);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRng(seed) {
    if (seed === undefined || seed === null) {
      return Math.random;
    }

    let state = hashSeed(seed) || 1;
    return function nextRandom() {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roundTo(value, digits) {
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
  }

  function randomNormal(rng) {
    const u = Math.max(1e-12, rng());
    const v = Math.max(1e-12, rng());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function gaussian(rng, sigma) {
    return randomNormal(rng) * sigma;
  }

  function getBalanceTarget(discipline, difficulty) {
    return BALANCE_TARGETS[discipline] && BALANCE_TARGETS[discipline][difficulty]
      ? BALANCE_TARGETS[discipline][difficulty]
      : null;
  }

  function getTargetCenter(target) {
    if (target.floor !== undefined) {
      return target.floor + 2;
    }
    return (target.min + target.max) / 2;
  }

  function getTargetDistance(total, target) {
    if (target.floor !== undefined) {
      return total >= target.floor ? total - target.floor : target.floor - total;
    }
    if (total < target.min) return target.min - total;
    if (total > target.max) return total - target.max;
    return 0;
  }

  function isWithinTarget(total, target) {
    if (!target) return false;
    if (target.floor !== undefined) return total >= target.floor;
    return total >= target.min && total <= target.max;
  }

  function getTargetDescriptor(discipline, target) {
    const prefix = discipline === 'kk3x20' ? 'Gesamt ' : '';
    if (target.floor !== undefined) {
      return `${prefix}&ge;${target.floor} ${target.infoUnit}`;
    }
    return `${prefix}~${target.min}&ndash;${target.max} ${target.infoUnit}`;
  }

  function getDifficultyInfo(discipline, difficulty) {
    const target = getBalanceTarget(discipline, difficulty);
    if (!target) return '';

    const descriptor = getTargetDescriptor(discipline, target);
    const isKkLiegend = discipline === 'kk50' || discipline === 'kk100';

    if (difficulty === 'easy') {
      return `<b>Einfach</b> &ndash; Solider Einstieg. ${descriptor}. Schaffbar mit Konzentration!`;
    }

    if (difficulty === 'real') {
      const intro = isKkLiegend ? 'Starke Pr&auml;zision.' : 'Fast nur 9er und 10er.';
      return `<b>Mittel</b> &ndash; ${intro} ${descriptor}. Kein Spaziergang!`;
    }

    if (difficulty === 'hard') {
      return `<b>Elite</b> &ndash; Trifft sehr pr&auml;zise. ${descriptor}. Kaum zu schlagen!`;
    }

    const withImmer = discipline === 'lg40' || discipline === 'lg60';
    return `<b>Profi</b> &ndash; Schie&szlig;t ${withImmer ? 'immer ' : ''}${descriptor}. Extrem pr&auml;zise. Viel Gl&uuml;ck!`;
  }

  function scoreNormalizedShot(nx, ny) {
    const distance = Math.sqrt((nx * nx) + (ny * ny));
    if (distance > RING_RADII[0]) {
      return { pts: 0, wholePts: 0, label: 'Daneben!', isX: false };
    }

    let ringIdx = 0;
    for (let i = RING_RADII.length - 1; i >= 0; i--) {
      if (distance <= RING_RADII[i]) {
        ringIdx = i;
        break;
      }
    }

    const basePts = ringIdx + 1;
    const outerRadius = RING_RADII[ringIdx];
    const innerRadius = ringIdx + 1 < RING_RADII.length ? RING_RADII[ringIdx + 1] : 0;
    const ringWidth = outerRadius - innerRadius || 1;
    const positionInRing = (outerRadius - distance) / ringWidth;
    const pts = roundTo(Math.min(10.9, basePts + (positionInRing * 0.9)), 1);
    const isX = basePts === 10 && distance <= (RING_RADII[9] * 0.5);
    const label = isX ? 'Innenzehner (X)' : (basePts === 10 ? 'Innenzehner' : `Ring ${basePts}`);

    return {
      pts,
      wholePts: Math.floor(pts),
      label,
      isX
    };
  }

  function jitteredSigma(baseSigma, difficulty, rng) {
    const jitter = SIGMA_JITTER[difficulty] || SIGMA_JITTER.real;
    const sigma = baseSigma * (1 + (randomNormal(rng) * jitter));
    return Math.max(baseSigma * 0.45, sigma);
  }

  function createShotPlan(rng, discipline, difficulty, position) {
    const baseSigma = SIGMA_PROFILES[discipline][difficulty];
    const sigma = position
      ? jitteredSigma(baseSigma * (KK3X20_POSITION_MULTIPLIERS[position] || 1), difficulty, rng)
      : jitteredSigma(baseSigma, difficulty, rng);
    const nx = gaussian(rng, sigma);
    const ny = gaussian(rng, sigma);
    const scored = scoreNormalizedShot(nx, ny);

    return {
      nx: roundTo(nx, 5),
      ny: roundTo(ny, 5),
      pts: scored.pts,
      wholePts: scored.wholePts,
      label: scored.label,
      isX: scored.isX,
      position: position || null
    };
  }

  function summarizePlan(discipline, shots, scoringMode) {
    let totalTenths = 0;
    let wholeTotal = 0;

    for (const shot of shots) {
      if (scoringMode === 'whole') {
        totalTenths += shot.wholePts * 10;
        wholeTotal += shot.wholePts;
      } else {
        totalTenths += Math.round(shot.pts * 10);
        wholeTotal += shot.wholePts;
      }
    }

    return {
      totalTenths,
      wholeTotal,
      total: scoringMode === 'whole' ? wholeTotal : roundTo(totalTenths / 10, 1)
    };
  }

  function buildCandidatePlan(rng, discipline, difficulty) {
    const target = getBalanceTarget(discipline, difficulty);
    const shots = [];

    if (discipline === 'kk3x20') {
      for (const position of KK3X20_POSITIONS) {
        for (let shotIndex = 0; shotIndex < 20; shotIndex++) {
          shots.push(createShotPlan(rng, discipline, difficulty, position));
        }
      }
    } else {
      const shotCount = DISCIPLINE_SHOTS[discipline] || 60;
      for (let shotIndex = 0; shotIndex < shotCount; shotIndex++) {
        shots.push(createShotPlan(rng, discipline, difficulty, null));
      }
    }

    const totals = summarizePlan(discipline, shots, target.scoringMode);
    return {
      discipline,
      difficulty,
      shots,
      scoringMode: target.scoringMode,
      total: totals.total,
      totalTenths: totals.totalTenths,
      wholeTotal: totals.wholeTotal,
      target
    };
  }

  function generateBotBattlePlan(discipline, difficulty, seed) {
    const target = getBalanceTarget(discipline, difficulty);
    if (!target) {
      throw new Error(`Unsupported balance target: ${discipline}/${difficulty}`);
    }

    const rng = createRng(seed);
    let bestPlan = null;

    for (let attempt = 1; attempt <= PLAN_MAX_ATTEMPTS; attempt++) {
      const candidate = buildCandidatePlan(rng, discipline, difficulty);
      const distance = getTargetDistance(candidate.total, target);
      const centerDistance = Math.abs(candidate.total - getTargetCenter(target));
      candidate.accepted = isWithinTarget(candidate.total, target);
      candidate.attempt = attempt;
      candidate.distance = distance;
      candidate.centerDistance = centerDistance;

      if (!bestPlan) {
        bestPlan = candidate;
      } else if (candidate.distance < bestPlan.distance) {
        bestPlan = candidate;
      } else if (candidate.distance === bestPlan.distance && candidate.centerDistance < bestPlan.centerDistance) {
        bestPlan = candidate;
      }

      if (candidate.accepted) {
        candidate.attemptsUsed = attempt;
        return candidate;
      }
    }

    bestPlan.accepted = isWithinTarget(bestPlan.total, target);
    bestPlan.attemptsUsed = PLAN_MAX_ATTEMPTS;
    return bestPlan;
  }

  function verifyKk3x20Plan(plan) {
    if (plan.discipline !== 'kk3x20') return [];

    const issues = [];
    const positionCounts = { Kniend: 0, Liegend: 0, Stehend: 0 };
    for (let i = 0; i < plan.shots.length; i++) {
      const shot = plan.shots[i];
      positionCounts[shot.position] = (positionCounts[shot.position] || 0) + 1;
      const expectedPosition = KK3X20_POSITIONS[Math.floor(i / 20)];
      if (shot.position !== expectedPosition) {
        issues.push(`unexpected position order at shot ${i + 1}: ${shot.position}`);
        break;
      }
    }

    for (const position of KK3X20_POSITIONS) {
      if (positionCounts[position] !== 20) {
        issues.push(`${position} expected 20 shots, got ${positionCounts[position] || 0}`);
      }
    }

    const recomputedWhole = plan.shots.reduce((sum, shot) => sum + shot.wholePts, 0);
    if (recomputedWhole !== plan.total) {
      issues.push(`whole-ring total mismatch: expected ${plan.total}, recomputed ${recomputedWhole}`);
    }

    return issues;
  }

  function runBalanceVerification(options) {
    const settings = Object.assign({ sampleCount: 80, seedPrefix: 'verify' }, options || {});
    const combos = [];
    const failures = [];

    for (const discipline of Object.keys(BALANCE_TARGETS)) {
      let previousAverage = -Infinity;

      for (const difficulty of DIFFICULTY_ORDER) {
        const target = getBalanceTarget(discipline, difficulty);
        const totals = [];

        for (let sampleIndex = 0; sampleIndex < settings.sampleCount; sampleIndex++) {
          const seed = `${settings.seedPrefix}:${discipline}:${difficulty}:${sampleIndex}`;
          const plan = generateBotBattlePlan(discipline, difficulty, seed);
          totals.push(plan.total);

          if (!plan.accepted || !isWithinTarget(plan.total, target)) {
            failures.push(`${discipline}/${difficulty} out of target: ${plan.total}`);
          }

          if (plan.shots.length !== DISCIPLINE_SHOTS[discipline]) {
            failures.push(`${discipline}/${difficulty} shot count mismatch: ${plan.shots.length}`);
          }

          if (discipline === 'kk3x20') {
            failures.push.apply(failures, verifyKk3x20Plan(plan).map((issue) => `${discipline}/${difficulty} ${issue}`));
          }
        }

        const average = roundTo(totals.reduce((sum, total) => sum + total, 0) / totals.length, 2);
        combos.push({
          discipline,
          difficulty,
          average,
          minimum: Math.min.apply(null, totals),
          maximum: Math.max.apply(null, totals),
          target
        });

        if (average <= previousAverage) {
          failures.push(`${discipline} averages are not strictly ascending at ${difficulty}`);
        }
        previousAverage = average;
      }
    }

    return {
      ok: failures.length === 0,
      combos,
      failures
    };
  }

  global.BattleBalance = {
    BALANCE_TARGETS,
    DIFFICULTY_ORDER,
    KK3X20_POSITIONS,
    PLAN_MAX_ATTEMPTS,
    generateBotBattlePlan,
    getBalanceTarget,
    getDifficultyInfo,
    isWithinTarget,
    runBalanceVerification,
    scoreNormalizedShot
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
