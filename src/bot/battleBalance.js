export const DIFFICULTY_ORDER = Object.freeze(['easy', 'real', 'hard', 'elite']);

export const BALANCE_TARGETS = Object.freeze({
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
});

export function getBalanceTarget(discipline, difficulty) {
  return BALANCE_TARGETS[discipline]?.[difficulty] || null;
}

export function getDifficultyInfoFromBalance(discipline, difficulty) {
  if (typeof window !== 'undefined' && window.BattleBalance?.getDifficultyInfo) {
    return window.BattleBalance.getDifficultyInfo(discipline, difficulty) || '';
  }
  const target = getBalanceTarget(discipline, difficulty);
  if (!target) return '';
  if (target.floor !== undefined) return `>=${target.floor} ${target.infoUnit}`;
  return `~${target.min}-${target.max} ${target.infoUnit}`;
}

export const BattleBalanceModule = {
  DIFFICULTY_ORDER,
  BALANCE_TARGETS,
  getBalanceTarget,
  getDifficultyInfoFromBalance
};
