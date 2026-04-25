# Schuss-Challenge Architektur (Struktur-Refactor)

## Neue Struktur unter `/src`

```text
/src
  /core
    game-state-utils.js
    state.js (bereits vorhanden)

  /game
    daily-challenge.js
    duel-engine.js
    duel-result-screen.js
    training-modes.js
    scoring.js (bereits vorhanden)
    xp.js (bereits vorhanden)

  /bot
    adaptive-bot.js
    battle-balance.js

  /storage
    storage-manager.js

  /features
    async-challenge.js
    enhanced-achievements.js
    enhanced-analytics.js
    friends-system.js

  /ui
    friends-ui.js

  /vision
    contextual-ocr.js
    image-compare.js
    multi-score-detection.js

  /testing
    qa-test-suite.js
    verify-balance.js
```

## Absichtlich im Root belassene Dateien

Folgende kritische Dateien bleiben aktuell bewusst im Root:

- `app.js` (globale Orchestrierung, viele `window.*` Abhängigkeiten)
- `sw.js` (Service Worker Scope / PWA)
- `manifest.json` (PWA Manifest für GitHub Pages)
- `auth-gate.js`, `supabase-client.js` und weitere Laufzeit-/Config-Dateien mit potenziell sensibler Lade-Reihenfolge

## Warum `app.js` noch im Root bleibt

`app.js` ist weiterhin im Root eingebunden, weil die Datei stark mit globalen Skripten, Inline-Handlern und `window.*` APIs gekoppelt ist. Ein Verschieben ohne umfassenden Kompatibilitäts-Layer birgt ein erhöhtes Risiko für Laufzeitfehler.

## Durchgeführte Kompatibilitätsanpassungen

- `index.html`: Script-Pfade auf neue `/src/...` Ziele aktualisiert.
- `package.json`: `check:js` und `verify:balance` auf neue Dateipfade aktualisiert.
- `performance-config.js`: Lazy-Load Pfade auf `/src/vision/...` angepasst.
- `src/testing/verify-balance.js`: Import auf `../bot/battle-balance.js` korrigiert.
- `main.js.DEPRECATED`: veraltete Importpfade auf neue Struktur aktualisiert.

## Nächste sinnvolle Refactor-Schritte

1. Weitere Root-Dateien schrittweise in `/src/ui`, `/src/features`, `/src/game` und `/src/core` verschieben (jeweils mit Pfad-/Reihenfolge-Check).
2. Für `app.js` einen optionalen Kompatibilitäts-Wrapper vorbereiten (`app.js` bleibt Entry, delegiert intern zu `src/app.js`).
3. Script-Lade-Reihenfolge in `index.html` langfristig auf modulare Bundle-Strategie konsolidieren (ohne `window.*`-Brüche).

## TODO: Noch nicht verschobene Root-JS-Dateien (bewusst zurückgestellt)

Die folgenden Dateien wurden in diesem Schritt nicht verschoben (unklar/abhängig/kritische Reihenfolge):

- `ProfileView.js`, `app-bugfixes.js`, `auth-gate.js`, `bot-panel-v2.js`, `dashboard-compact-panel.js`,
  `dashboard-friends-button.js`, `debug-panel.js`, `duel-distance-guard.js`, `duel-scroll-lock.js`,
  `duel-setup-hotfix.js`, `duel-setup-runtime.js`, `feature-fallback.js`, `friend-challenges.js`, `friends.js`,
  `gemini-ai.js`, `haptics.js`, `highscore-sync.js`, `image-compare-brain.js`, `leaderboard-modern.js`,
  `local-entry.js`, `mobile-features.js`, `mobile-responsive.js`, `modern-ux.js`, `performance-config.js`,
  `physics-engine.js`, `profile-scroll-fix.js`, `reward-system.js`, `site-cleanup.js`, `sounds.js`,
  `streak-tracker.js`, `supabase-client.js`, `supabase-social.js`, `timer-system.js`, `tutorial.js`,
  `updates.js`, `v2-vision-engine.js`, `xp-system.js`.
