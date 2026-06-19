# Schussduell

> Repo-Slug: `schuss-challenge`. Der installierte PWA-Name lautet aktuell noch **„Schützen Challenge"** (`manifest.json` / `<title>`); im Code und im Alltag heißt die App meist **Schussduell**.

**Schussduell** ist eine Beta-PWA für Sportschützen (Luftgewehr & Kleinkaliber). Der Kern der App ist ein **Du-vs.-Bot-Duell** mit einem darauf aufgebauten **Gamification-System** (XP, Level/Ränge, Streak, Achievements, Rangliste, Schützenpass). Online-Funktionen (Freunde, Challenges, Chat, Vereine) sind optional über Supabase – ohne Login läuft alles im lokalen Modus weiter.

## So funktioniert ein Duell

1. **Disziplin & Schwierigkeit wählen** – LG 40/60, KK 50/100 m, KK 3×20; Bot-Stufen von „easy" bis „elite".
2. **Gegen den adaptiven Bot antreten** – der Bot simuliert eine realistische Gegnerleistung (heuristisch, je nach Disziplin/Stufe balanciert; `src/bot/adaptive-bot.js`, `src/bot/battleBalance.js`).
3. **Dein Ergebnis erfassen** – entweder per **manueller Eingabe** (Zehntel & Ganze, bei KK Ringe) oder über die **Quick-Buttons „Gewonnen" / „Verloren"**.
4. **Auswertung** – Sieg/Niederlage fließt in XP, Streak, Statistiken und den Schützenpass ein.

Schussduell ist **keine elektronische Trefferanlage** und kein automatisches Foto-Scoring-Tool: Das Ergebnis gibst du selbst ein.

## Gamification (der Kern)

- **XP & Level/Ränge** – XP pro Sieg (nach Schwierigkeit gestaffelt), Aufstieg durch Ränge (`src/game/xp.js`, `src/game/xp-system.js`).
- **Streak** – Serien/Tages-Streaks (`streak-tracker.js`).
- **Achievements** – gestufte Erfolge (`src/features/enhanced-achievements.js`).
- **Analytics** – Trends, Konsistenz und Verlauf (`src/features/enhanced-analytics.js`).
- **Rangliste** – online über Supabase (`leaderboard-modern.js`).
- **Schützenpass** – persönliches Profil/Pass mit Statistiken, Rang und Tabs (`updateSchuetzenpass()` in `app.js`, UI in `index.html`).
- **Daily Challenge & Login-Rewards** – tägliche Aufgaben und Belohnungen (`src/game/daily-challenge.js`, `src/features/daily-login-rewards.js`).

## Online-Funktionen (optional, Supabase)

- **Freunde** – Suche, Profile, Anfragen (`friends.js`, `friend-search.js`, `friend-profile-view.js`).
- **Async-Challenges** – foto-freie Herausforderungen nach Disziplin/Score (`src/features/async-challenge.js`, `supabase-social.js`).
- **Freundes-Foto-Duell** – optionales Duell, bei dem beide Seiten ihr Scheiben-Foto **lokal** auswerten; nur Disziplin, bestätigter Score und OCR-Konfidenz gehen an Supabase, das Foto bleibt auf dem Gerät (`friend-photo-duel.js`).
- **Chat** – (`chat-view.js`, `chat-badge.js`, `chat-notifications.js`).
- **Vereine/Clubs** – Teams und Vereins-Ranglisten (`src/features/clubs-system.js`).

Ohne Supabase oder offline läuft der lokale Modus weiter (Daten via `StorageManager`/`localStorage`, `sd_`-Prefix).

## Optionale Foto-Auswertung (Beta) – vollständig lokal

Zusätzlich zur manuellen Eingabe gibt es eine **optionale** Foto-Auswertung („Wettkampf-Foto vergleichen", Beta):

- Läuft **komplett lokal im Browser**: YOLO-Detektion via TensorFlow.js (`model.json` + `group1-shard*.bin`) plus Tesseract-OCR.
- **Kein** Cloud-Dienst und **kein** Google Gemini – Fotos verlassen das Gerät nicht. (`gemini-ai.js` ist nur ein leerer Kompatibilitäts-Stub für alte Caches.)
- Ergebnis bitte **immer manuell prüfen**: Licht, Perspektive, Monitorfotos oder unscharfe Bilder können die Erkennung verfälschen.
- Engine und Konfiguration: `src/vision/*`, zentrale Parameter in `image-compare-brain.js` (`VISION_MODEL`).

Modell aktualisieren: Training extern (Colab/GPU), Export per Drop-in. Anleitung in [`docs/vision-model-upgrade.md`](docs/vision-model-upgrade.md); vor dem Commit `npm run check:vision-model` ausführen (prüft Shards, Klassen-Abgleich und `model.json`-Format).

## Projektstruktur

- `index.html` – lädt die App über klassische `<script>`-Tags in fester Reihenfolge (Boot/Auth → Core → Features → Social).
- `src/main.js` – kleines ES-Modul-Shim, das ausgewählte Module (`state`, `dom`, `scoring`, `xp`, `battleBalance`) unter `window.SchussChallenge` bereitstellt und das Event `schusschallenge:modules-ready` feuert.
- `src/` – modularer Code: `core/`, `game/`, `bot/`, `features/`, `ui/`, `vision/`, `storage/`, `testing/`.
- Weitere Root-`*.js` – historisch gewachsene Skripte, die `index.html` direkt einbindet (Stand der Migration siehe [`docs/architecture.md`](docs/architecture.md)).

## Supabase

Supabase ist die Single Source of Truth für Online-Funktionen. Im Frontend dürfen nur Supabase-URL und Anon-Key stehen; Service-Role-Keys gehören ausschließlich in Worker-Secrets.

Config-Reihenfolge im Frontend:

1. `window.SCHUETZEN_CHALLENGE_CONFIG`
2. `<meta name="supabase-url">` und `<meta name="supabase-anon-key">`
3. `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
4. bewusst gesetzte öffentliche Defaults für GitHub Pages

Fehlt Supabase oder ist es offline, muss der lokale Modus weiter funktionieren.

Für Social/Friends/Challenges ist `supabase/schema-social.sql` die kanonische Basis. Die SQL-Dateien in `supabase/migrations/` werden in Reihenfolge angewendet; `0007_shooter_challenges.sql` ergänzt Trainings-Challenges und `challenge_completions`.

## Offline & PWA

- Nach dem ersten Laden ist die App installierbar; lokale Trainings- und Duell-Flows funktionieren weiter.
- `offline.html` wird bei Offline-Navigation durch den Service Worker ausgeliefert.
- `/api/*`, Supabase-Hosts, `accounts.google.com` und `googleapis.com` werden nicht gecached.
- Auth-Tokens und sensible Supabase-Daten dürfen nicht im Cache landen.

## Lokal testen

```bash
npm install
npm run dev          # Wrangler + statische Assets auf http://localhost:8787
npm run check:js     # Syntax-Check der eingebundenen Skripte
npm run check:html   # HTML-Integrität
npm run verify:balance
npm test
```

## Beta und Grenzen

- Die Foto-Auswertung ist Beta und ersetzt keine manuelle Kontrolle.
- Der adaptive Bot ist heuristisch und wird über `npm run verify:balance` stichprobenartig geprüft.
- Manuelle Eingabe und Korrektur bleiben der verlässliche Weg zur Ergebniserfassung.
