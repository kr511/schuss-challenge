# Schützen Challenge

> Repository-Slug: `schuss-challenge`. Sichtbarer Produktname: **Schützen Challenge**.

**Schützen Challenge** ist eine Beta-PWA für Sportschützen (Luftgewehr und Kleinkaliber). Der Fokus liegt auf Training, sicherer Dokumentation und klarer manueller Auswertung. „Schussduell“ bleibt als Modusname für Bot-/Duelle erhalten, ist aber nicht mehr der Produktname.

## Was funktioniert heute?

- **Challenges**: Async-/Freundes-Challenges über SupabaseSocial mit lokalem Fallback für Ergebnisse.
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

## Supabase

Supabase ist die Single Source of Truth für Online-Funktionen. Im Frontend dürfen nur Supabase URL und Anon Key stehen; Service-Role-Keys gehören ausschließlich in Worker-Secrets.

Config-Reihenfolge im Frontend:

1. `window.SCHUETZEN_CHALLENGE_CONFIG`
2. `<meta name="supabase-url">` und `<meta name="supabase-anon-key">`
3. `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
4. bewusst gesetzte öffentliche Defaults für GitHub Pages

Fehlt Supabase oder ist es offline, muss der lokale Modus weiter funktionieren.

## Challenge-/Duell-Funktionen

- Async-Challenges: [`src/features/async-challenge.js`](src/features/async-challenge.js)
- Freundes-Challenges: [`friend-challenges.js`](friend-challenges.js)
- Supabase Social-Basis: [`supabase/schema-social.sql`](supabase/schema-social.sql)
- Optionale Trainings-Challenge-Tabellen: [`supabase/migrations/0007_shooter_challenges.sql`](supabase/migrations/0007_shooter_challenges.sql)

Async-Ergebnisse laufen online über Supabase und fallen lokal auf `sd_friend_challenge_results` zurück.

## Foto-Modell aktualisieren

Das YOLO-Detektionsmodell der Foto-Auswertung ist konfigurations- und
versionierbar: alle Parameter stehen zentral in `image-compare-brain.js`
unter `VISION_MODEL`. Trainiert wird extern (Colab/GPU), der Export wird per
Drop-in übernommen. Anleitung: [`docs/vision-model-upgrade.md`](docs/vision-model-upgrade.md).
Vor dem Commit `npm run check:vision-model` ausführen (prüft Shards, Klassen-
Abgleich mit `metadata.yaml` und das `model.json`-Format).

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

## Offline-first aktuell

- Gastmodus und lokale Duell-/Basis-Historie
- Lokaler Challenge-Ergebnis-Fallback (`sd_friend_challenge_results`)
- Teile von XP/Streak/Trainingshistorie, wenn kein Supabase-Login aktiv ist

## Supabase-Migrationen

Für Social/Friends/Challenges ist `supabase/schema-social.sql` die kanonische Social-Basis. Die SQL-Dateien in `supabase/migrations/` werden in Reihenfolge angewendet; `0007_shooter_challenges.sql` ergänzt Trainings-Challenges und `challenge_completions`.
