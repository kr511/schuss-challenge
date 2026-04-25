# Phase 1 Stabilisierung — Mai 2026

## Ziel

Phase 1 macht den bestehenden Core zuverlässig. Es werden keine neuen Features gebaut, bevor die Hauptflows stabil laufen.

## Fokusbereiche

| Priorität | Bereich | Ziel |
| --- | --- | --- |
| P0 | Duell-Start-Flow | `DUELL STARTEN` öffnet das Bottom Sheet ohne Console-Crash. |
| P0 | Bot-Modus | `GEGEN BOT` öffnet stabile Einstellungen und startet ein Duell. |
| P0 | QA-Smoke | Smoke Checks dürfen weder in Node/CI crashen noch falsch-grün melden. |
| P1 | Script-Reihenfolge | Runtime/Kompatibilität eindeutig diagnostizierbar machen. |
| P1 | Mobile Stabilität | Bottom Sheet scrollt sauber und sperrt die Seite korrekt. |
| P2 | Cleanup-Vorbereitung | Root-Cleanup erst planen, nicht blind verschieben. |

## Bereits umgesetzt

- `src/testing/qa-test-suite.js` läuft jetzt auch ohne Browser-DOM ohne `ReferenceError`.
- `QASmokeSuite.run()` liefert einen echten Boolean-Status.
- Die Smoke Suite diagnostiziert jetzt:
  - `openDuelSetup`
  - `selectGameMode`
  - `closeDuelSetup`
  - `duel-setup-runtime.js`
  - `btnOpenDuelSetup`
  - `duelSetupSheetOverlay`
  - `duelSetupSheet`
  - `gameModeSelection`
  - `duelSettingsContent`

## Akzeptanzkriterien

### P0 — Duell öffnen

- Klick auf `DUELL STARTEN` öffnet das Setup.
- `QASmokeSuite.diagnoseDuelSetup()` zeigt alle wichtigen DOM-IDs als vorhanden.
- Keine `ReferenceError` oder `TypeError` in der Console.

### P0 — Bot auswählen

- Klick auf `GEGEN BOT` zeigt die Duell-Einstellungen.
- Multiplayer darf noch auf Bot zurückfallen, solange Live-/Async-Multiplayer nicht stabil ist.
- Fehlende DOM-Elemente werden mit klarer Diagnose gemeldet.

### P0 — Duell starten

- Klick auf den Start-Button ruft `startBattle()` auf.
- Wenn `startBattle()` fehlt oder crasht, zeigt die Runtime eine sichtbare Fehlermeldung statt still zu scheitern.

### P0 — Tests

- `npm test` muss mindestens `check:js` und `verify:balance` ausführen.
- `node --check src/testing/qa-test-suite.js` darf nicht crashen.
- `node --check duel-setup-runtime.js` muss grün bleiben.

## Manuelle Test-Checkliste

1. Seite hart neu laden.
2. Browser-Console öffnen.
3. In der Console ausführen:

```js
QASmokeSuite.run()
QASmokeSuite.diagnoseDuelSetup()
```

4. `DUELL STARTEN` klicken.
5. Prüfen, ob das Bottom Sheet sichtbar ist.
6. `GEGEN BOT` klicken.
7. Disziplin und Schwierigkeit wechseln.
8. `DUELL STARTEN` im Sheet klicken.
9. Prüfen, ob das Duell startet und keine uncaught errors erscheinen.

## Nicht-Ziele in Phase 1

- Keine neuen Social Features.
- Kein kompletter UI-Redesign-Schritt.
- Kein Root-Datei-Move ohne separaten Cleanup-Plan.
- Kein Cloud-/Datenmodell-Refactor.

## Nächste Phase-1-Aufgaben

| Priorität | Aufgabe | Ergebnis |
| --- | --- | --- |
| P0 | Live-Seite manuell smoke-testen | Exakter Status des Duell-Flows ist bekannt. |
| P0 | Falls noch Fehler: Console-Ausgabe aus `diagnoseDuelSetup()` verwenden | Fehler ist eindeutig reproduzierbar. |
| P1 | `duel-setup-runtime.js` weiter härten | Fehlende IDs brechen nicht still ab. |
| P1 | PR #29 schließen oder neu auf Main aufsetzen | Offene PR-Liste wird sauberer. |
| P2 | Root-Cleanup-Plan erstellen | Phase 2 kann kontrolliert starten. |
