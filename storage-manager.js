/**
 * Storage Manager – Zentraler localStorage-Zugriff
 * Bietet einheitliches Error-Handling und JSON-Parsing.
 * Bestehende Module können schrittweise migriert werden.
 */
const StorageManager = (function () {
  'use strict';

  const PREFIX = 'sd_';

  /**
   * Holt einen Wert aus localStorage, geparsed als JSON.
   * @param {string} key - Schlüssel (ohne sd_ Prefix)
   * @param {*} fallback - Default-Wert bei Fehler oder wenn nicht vorhanden
   * @returns {*} Geparseter Wert oder Fallback
   */
  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[StorageManager] Fehler beim Lesen von "${PREFIX + key}":`, e);
      return fallback;
    }
  }

  /**
   * Speichert einen Wert in localStorage als JSON.
   * @param {string} key - Schlüssel (ohne sd_ Prefix)
   * @param {*} value - Wert (wird JSON.stringify'd)
   * @returns {boolean} true bei Erfolg
   */
  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error(`[StorageManager] Speicher voll! Konnte "${PREFIX + key}" nicht speichern.`);
      } else {
        console.warn(`[StorageManager] Fehler beim Schreiben von "${PREFIX + key}":`, e);
      }
      return false;
    }
  }

  /**
   * Holt einen Rohwert (String) ohne JSON-Parsing.
   * Nützlich für einfache Werte wie XP, Username.
   */
  function getRaw(key, fallback = null) {
    try {
      return localStorage.getItem(PREFIX + key) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  /**
   * Setzt einen Rohwert (String) ohne JSON.stringify.
   */
  function setRaw(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error(`[StorageManager] Speicher voll! Konnte Rohwert "${PREFIX + key}" nicht speichern.`);
      }
      return false;
    }
  }

  /**
   * Entfernt einen Schlüssel.
   */
  function remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Listet alle sd_* Schlüssel auf.
   */
  function keys() {
    const result = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          result.push(k.slice(PREFIX.length));
        }
      }
    } catch (e) { /* ignore */ }
    return result;
  }

  /**
   * Löscht alle sd_* Schlüssel (aber erhält spezifische).
   * @param {string[]} keep - Schlüssel die behalten werden sollen (ohne Prefix)
   */
  function clearAll(keep = []) {
    try {
      const preserved = {};
      keep.forEach(k => {
        const val = localStorage.getItem(PREFIX + k);
        if (val !== null) preserved[k] = val;
      });
      // Nur sd_* löschen
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
      // Preserved wiederherstellen
      Object.entries(preserved).forEach(([k, v]) => {
        localStorage.setItem(PREFIX + k, v);
      });
    } catch (e) {
      console.warn('[StorageManager] clearAll fehlgeschlagen:', e);
    }
  }

  return { get, set, getRaw, setRaw, remove, keys, clearAll, PREFIX };
})();
