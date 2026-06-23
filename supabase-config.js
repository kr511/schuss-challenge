/**
 * Schützen Challenge – Supabase Config (Frontend)
 *
 * Zentrale Quelle für SUPABASE_URL und SUPABASE_ANON_KEY auf der Client-Seite.
 *
 * Reihenfolge der Werte (höchste Priorität zuerst):
 *  1. window.SCHUETZEN_CHALLENGE_CONFIG (z. B. von einer eigenen Config-Datei
 *     vor diesem Script gesetzt – nützlich für eigene Builds/Forks).
 *  2. <meta name="supabase-url"> bzw. <meta name="supabase-anon-key">.
 *  3. import.meta.env.* (falls jemand wirklich mit Vite baut).
 *  4. Fallback auf die öffentlichen Werte des Hauptprojekts, damit GitHub
 *     Pages weiter ohne Build/Setup läuft.
 *
 * SICHERHEIT:
 *  - Nur der ANON-Key gehört ins Frontend. Schutz kommt über RLS-Policies
 *    in der Datenbank. Service-Role-Keys NIEMALS im Browser ausliefern.
 *  - In Cloudflare-Worker-Code wird die Service-Role separat (Secret) genutzt.
 *
 * Output:
 *  window.SCHUETZEN_CHALLENGE_CONFIG = {
 *    SUPABASE_URL: string,
 *    SUPABASE_ANON_KEY: string,
 *    source: 'window' | 'meta' | 'import-meta' | 'fallback',
 *  }
 */
(function () {
  'use strict';

  // Öffentliche Default-Werte des Hauptprojekts.
  // Werden NUR genutzt, wenn keine andere Quelle Werte liefert.
  const DEFAULT_URL = 'https://fknftkvozwfkcarldzms.supabase.co';
  const DEFAULT_ANON = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbmZ0a3Zvendma2Nhcmxkem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTYxOTYsImV4cCI6MjA5MTY3MjE5Nn0',
    'pWSR48-XIUYWWO5pPQsGDnE-qxb6c5EiKuTQn2myKRg'
  ].join('.');

  function readMeta(name) {
    try {
      const el = document.querySelector(`meta[name="${name}"]`);
      if (!el) return '';
      const v = el.getAttribute('content');
      return v ? String(v).trim() : '';
    } catch (_e) {
      return '';
    }
  }

  function readWindowConfig() {
    const cfg = (typeof window !== 'undefined' && window.SCHUETZEN_CHALLENGE_CONFIG) || null;
    if (!cfg) return null;
    const url = (cfg.SUPABASE_URL || cfg.supabaseUrl || '').toString().trim();
    const anon = (cfg.SUPABASE_ANON_KEY || cfg.supabaseAnonKey || '').toString().trim();
    if (!url || !anon) return null;
    return { url, anon };
  }

  // Vite-Build-Pfad: import.meta.env (optional). Wir lassen das bewusst weich,
  // damit wir auf reinem GitHub-Pages ohne Build-Step laufen.
  function readImportMetaEnv() {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('try { return import.meta && import.meta.env || null; } catch (_e) { return null; }');
      const env = fn();
      if (!env) return null;
      const url = (env.VITE_SUPABASE_URL || '').toString().trim();
      const anon = (env.VITE_SUPABASE_ANON_KEY || '').toString().trim();
      if (!url || !anon) return null;
      return { url, anon };
    } catch (_e) {
      return null;
    }
  }

  let url = '';
  let anon = '';
  let source = 'fallback';

  const winCfg = readWindowConfig();
  if (winCfg) {
    url = winCfg.url; anon = winCfg.anon; source = 'window';
  } else {
    const metaUrl = readMeta('supabase-url');
    const metaAnon = readMeta('supabase-anon-key');
    if (metaUrl && metaAnon) {
      url = metaUrl; anon = metaAnon; source = 'meta';
    } else {
      const env = readImportMetaEnv();
      if (env) {
        url = env.url; anon = env.anon; source = 'import-meta';
      }
    }
  }

  if (!url) url = DEFAULT_URL;
  if (!anon) anon = DEFAULT_ANON;

  const finalConfig = Object.freeze({
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: anon,
    source,
  });

  if (typeof window !== 'undefined') {
    // Bestehende Werte respektieren, falls sie schon vorbelegt waren – aber als
    // gefrorenes Resultat mit klarer Source. Wir überschreiben *immer*, damit
    // die Quelle eindeutig dokumentiert ist.
    window.SCHUETZEN_CHALLENGE_CONFIG = finalConfig;

    // Kompatibilität: supabase-client.js liest window.__SUPABASE_CONFIG__.
    // Nur setzen, wenn dort noch nichts liegt – nicht überschreiben.
    if (!window.__SUPABASE_CONFIG__) {
      window.__SUPABASE_CONFIG__ = Object.freeze({
        url: finalConfig.SUPABASE_URL,
        anonKey: finalConfig.SUPABASE_ANON_KEY,
      });
    }
  }
})();
