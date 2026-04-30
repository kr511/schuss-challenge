# Schützen Challenge

> Repository-Slug: `schuss-challenge`. Sichtbarer Produktname: **Schützen Challenge**.

**Schützen Challenge** ist eine Beta-PWA für Sportschützen (Luftgewehr und Kleinkaliber). Der Fokus liegt auf Training, sicherer Dokumentation und klarer manueller Auswertung. „Schussduell“ bleibt als Modusname für Bot-/Duelle erhalten, ist aber nicht mehr der Produktname.

## Was funktioniert heute?

- **Schnelltraining**: 10 Schuss manuell eintragen, Gesamt, Durchschnitt, bester und schwächster Schuss. Speichert lokal unter `sd_quick_training_log`.
- **Trainings-Challenges**: statische Trainingsaufgaben mit Kategorie, Schwierigkeit, Dauer, Material, Ablauf, Erfolgskriterium und sichtbaren Sicherheitshinweisen.
- **Schussduell-Modus**: Bot-Duell für LG/KK mit manuellem Ergebnis und optionaler Foto-Beta-Unterstützung.
- **Lokaler Modus**: Ohne Login spiel- und trainierbar. Lokale Daten laufen über `StorageManager`/`localStorage` mit `sd_`-Prefix.
- **Optionale Online-Funktionen**: Supabase-Login, Freunde, Async-Challenges, Profile und Ranglisten, wenn Supabase konfiguriert und erreichbar ist.

## Beta und Grenzen

- **Foto-Auswertung / automatische Ringerkennung ist Beta**: Ergebnis bitte immer manuell prüfen. Keine elektronische Trefferanlage.
- Foto-/OCR-Hilfen können bei Licht, Perspektive, Monitorfotos oder unscharfen Bildern falsch liegen.
- Manuelle Eingabe und Korrektur bleiben der verlässliche Weg.
- Der adaptive Bot ist heuristisch und wird über `npm run verify:balance` stichprobenartig geprüft.

## Offline und PWA

- Nach dem ersten Laden ist die App installierbar und lokale Trainingsflows funktionieren weiter.
- `offline.html` wird bei Offline-Navigation durch den Service Worker ausgeliefert.
- `/api/*`, Supabase-Hosts, `accounts.google.com` und `googleapis.com` werden nicht gecached.
- Auth-Tokens und sensible Supabase-Daten dürfen nicht im Cache landen.
- Quick Training speichert aktuell lokal; Supabase-Sync ist nächster Schritt.

## Supabase

Supabase ist die Single Source of Truth für Online-Funktionen. Im Frontend dürfen nur Supabase URL und Anon Key stehen; Service-Role-Keys gehören ausschließlich in Worker-Secrets.

Config-Reihenfolge im Frontend:

1. `window.SCHUETZEN_CHALLENGE_CONFIG`
2. `<meta name="supabase-url">` und `<meta name="supabase-anon-key">`
3. `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
4. bewusst gesetzte öffentliche Defaults für GitHub Pages

Fehlt Supabase oder ist es offline, muss der lokale Modus weiter funktionieren.

## Challenges

- Daten: [`src/data/shooter-challenges.js`](src/data/shooter-challenges.js)
- UI und Completion-Flow: [`src/features/shooter-challenges-ui.js`](src/features/shooter-challenges-ui.js)
- Optionales Supabase-Schema: [`supabase/migrations/0007_shooter_challenges.sql`](supabase/migrations/0007_shooter_challenges.sql)

Abschluss-Speicherreihenfolge:

1. Supabase `challenge_completions`, wenn User eingeloggt ist und die Tabelle verfügbar ist.
2. Sonst lokaler Fallback unter `sd_shooter_challenge_completions`.
3. Wenn weder Supabase noch lokales Speichern klappt, wird kein Erfolg gemeldet.

Mehrfachabschluss am selben Tag überschreibt den lokalen Tagesabschluss statt zu duplizieren.

## Lokal Testen

```bash
npm install
npm run dev
npm run check:js
npm run check:html
npm test
node test_xss_direct.mjs
```

Hinweis: `npm run dev` startet Wrangler mit Worker und statischen Assets auf `http://localhost:8787`.

## Lokal-only aktuell

- Quick Training (`sd_quick_training_log`)
- Gastmodus und lokale Basis-Historie
- Lokaler Challenge-Fallback (`sd_shooter_challenge_completions`)
- Teile von XP/Streak/Trainingshistorie, wenn kein Supabase-Login aktiv ist

## Supabase-Migrationen

Für Social/Friends/Challenges ist `supabase/schema-social.sql` die kanonische Social-Basis. Die SQL-Dateien in `supabase/migrations/` werden in Reihenfolge angewendet; `0007_shooter_challenges.sql` ergänzt Trainings-Challenges und `challenge_completions`.
