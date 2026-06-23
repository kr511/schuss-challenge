/**
 * Schuss Challenge – Timer System
 *
 * Phase-3 extraction: safe wrapper around countdowns/timeouts.
 * Designed to reduce scattered setInterval/setTimeout logic in app.js.
 */
(function attachTimerSystem(global) {
  'use strict';

  const timers = new Map();

  function normalizeId(id) {
    if (!id || typeof id !== 'string') throw new Error('Timer id must be a non-empty string');
    return id;
  }

  function stop(id) {
    const key = normalizeId(id);
    const entry = timers.get(key);
    if (!entry) return false;

    if (entry.type === 'interval') clearInterval(entry.handle);
    if (entry.type === 'timeout') clearTimeout(entry.handle);

    timers.delete(key);
    if (typeof entry.onStop === 'function') entry.onStop(entry);
    return true;
  }

  function stopAll() {
    [...timers.keys()].forEach(stop);
  }

  function startCountdown(id, options = {}) {
    const key = normalizeId(id);
    stop(key);

    const durationSeconds = Math.max(0, Math.floor(Number(options.seconds) || 0));
    const intervalMs = Math.max(100, Math.floor(Number(options.intervalMs) || 1000));
    const startedAt = Date.now();
    let remaining = durationSeconds;

    const entry = {
      id: key,
      type: 'interval',
      startedAt,
      durationSeconds,
      remaining,
      intervalMs,
      onTick: options.onTick,
      onDone: options.onDone,
      onStop: options.onStop,
      handle: null
    };

    function emitTick() {
      entry.remaining = remaining;
      if (typeof entry.onTick === 'function') {
        entry.onTick({
          id: key,
          remaining,
          elapsed: durationSeconds - remaining,
          durationSeconds,
          progress: durationSeconds === 0 ? 1 : Math.min(1, (durationSeconds - remaining) / durationSeconds)
        });
      }
    }

    emitTick();

    if (remaining <= 0) {
      if (typeof entry.onDone === 'function') entry.onDone({ id: key, remaining: 0, elapsed: durationSeconds, durationSeconds, progress: 1 });
      return entry;
    }

    entry.handle = setInterval(() => {
      remaining -= 1;
      emitTick();

      if (remaining <= 0) {
        stop(key);
        if (typeof entry.onDone === 'function') {
          entry.onDone({ id: key, remaining: 0, elapsed: durationSeconds, durationSeconds, progress: 1 });
        }
      }
    }, intervalMs);

    timers.set(key, entry);
    return entry;
  }

  function startTimeout(id, options = {}) {
    const key = normalizeId(id);
    stop(key);

    const delayMs = Math.max(0, Math.floor(Number(options.delayMs) || 0));
    const entry = {
      id: key,
      type: 'timeout',
      startedAt: Date.now(),
      delayMs,
      onDone: options.onDone,
      onStop: options.onStop,
      handle: null
    };

    entry.handle = setTimeout(() => {
      timers.delete(key);
      if (typeof entry.onDone === 'function') entry.onDone({ id: key, delayMs });
    }, delayMs);

    timers.set(key, entry);
    return entry;
  }

  function has(id) {
    return timers.has(normalizeId(id));
  }

  function get(id) {
    const entry = timers.get(normalizeId(id));
    if (!entry) return null;
    return { ...entry, handle: Boolean(entry.handle) };
  }

  function list() {
    return [...timers.values()].map(entry => ({ ...entry, handle: Boolean(entry.handle) }));
  }

  function bindLegacyGameState(state = global.G) {
    if (!state || typeof state !== 'object') throw new Error('Legacy game state is unavailable');

    return {
      startMainTimer(seconds, onDone) {
        return startCountdown('mainTimer', {
          seconds,
          onTick: ({ remaining }) => { state._timerSecsLeft = remaining; },
          onDone
        });
      },
      startProbeTimer(seconds, onDone) {
        state.probeActive = true;
        return startCountdown('probeTimer', {
          seconds,
          onTick: ({ remaining }) => { state.probeSecsLeft = remaining; },
          onDone: (...args) => {
            state.probeActive = false;
            if (typeof onDone === 'function') onDone(...args);
          }
        });
      },
      startTransitionTimer(seconds, label, onDone) {
        state.transitionLabel = String(label || '');
        return startCountdown('transitionTimer', {
          seconds,
          onTick: ({ remaining }) => { state.transitionSecsLeft = remaining; },
          onDone: (...args) => {
            state.transitionLabel = '';
            if (typeof onDone === 'function') onDone(...args);
          }
        });
      },
      stopAll
    };
  }

  global.SchussTimerSystem = Object.freeze({
    startCountdown,
    startTimeout,
    stop,
    stopAll,
    has,
    get,
    list,
    bindLegacyGameState
  });

  console.info('⏱️ SchussTimerSystem ready');
})(window);
