export function createInitialState({ storageManager } = {}) {
  const readRaw = (key, fallback = '') => {
    if (storageManager && typeof storageManager.getRaw === 'function') {
      return storageManager.getRaw(key, fallback);
    }
    return fallback;
  };

  return {
    dist: '10',
    diff: 'easy',
    weapon: 'lg',
    username: readRaw('username', ''),
    lbScope: readRaw('lb_scope', 'global'),
    lbPeriod: readRaw('lb_period', 'alltime'),
    discipline: 'lg40',
    shots: 40,
    burst: false,
    targetShots: [],
    botShots: [],
    botPlan: null,
    botTotal: 0,
    botTotalInt: 0,
    _botTotalTenths: 0,
    playerTotal: 0,
    playerTotalInt: 0,
    _playerTotalTenths: 0,
    playerShotsLeft: 40,
    botShotsLeft: 40,
    maxShots: 40,
    xp: 0,
    streak: 0,
    is3x20: false,
    positions: [],
    posIcons: [],
    posIdx: 0,
    posShots: 0,
    perPos: 20,
    posResults: [],
    _botInterval: null,
    _timerInterval: null,
    _timerSecsLeft: 0,
    _botStartTimeout: null,
    dnf: false,
    playerShots: [],
    currentDetectedShots: [],
    _gameStartTime: 0,
    _lastPlayerShotAt: 0,
    probeActive: false,
    probeSecsLeft: 0,
    botStarted: false,
    transitionSecsLeft: 0,
    transitionLabel: ''
  };
}
