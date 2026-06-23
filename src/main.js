import { createInitialState } from './core/state.js';
import { DomUtils } from './ui/dom.js';
import { Scoring } from './game/scoring.js';
import { XpSystem } from './game/xp.js';
import { BattleBalanceModule } from './bot/battleBalance.js';

const existing = window.SchussChallenge || {};

window.SchussChallenge = {
  ...existing,
  core: {
    ...(existing.core || {}),
    createInitialState
  },
  ui: {
    ...(existing.ui || {}),
    dom: DomUtils
  },
  game: {
    ...(existing.game || {}),
    scoring: Scoring,
    xp: XpSystem
  },
  bot: {
    ...(existing.bot || {}),
    battleBalance: BattleBalanceModule
  }
};

window.dispatchEvent(new CustomEvent('schusschallenge:modules-ready'));
