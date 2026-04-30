# Schützen Challenge – Precision Shooting Trainer PWA

> Projektname (UI/Manifest): **Schützen Challenge** · Repository-Slug: `schuss-challenge`

**Schützen Challenge** is a modern **Progressive Web App (PWA)** designed to help shooters train precision, consistency, and grouping — whether you're using air rifles, smallbore, pistol, or dry-fire practice.

Take real shots on paper targets → take a photo with your phone → get scoring support, feedback, and coaching-style training hints.

No extra hardware. No subscriptions. Just your browser and a target.

## ✨ Key Features

- **Photo scoring support** — Upload or capture photos of your shot targets and use assisted scoring workflows
- **Offline-first PWA** — Installable on phone/home screen and usable for many local training functions after first load
- **Local progress tracking** — Stats, XP, achievements, best groups and training history can be stored in the browser
- **Optional online account features** — Login, leaderboard and sync features use Supabase
- **Advanced Target Preprocessing** — Built-in Moiré-reduction, adaptive thresholding and correction helpers for target/display images
- **Adaptive Training Bot** — Difficulty and target size adjust automatically based on your performance
- **Multiple Training Modes** — Standard groups, timed challenges, training drills and duel modes
- **Haptic & Sound Feedback** — Vibration and audio cues on hit/miss, especially useful on mobile
- **Mobile-optimized** — Touch controls, camera integration and responsive design

## 🔒 Datenschutz & Online-Funktionen

Schuss Challenge ist **offline-first** und speichert viele Trainingsdaten lokal im Browser. Trotzdem sind nicht alle Funktionen komplett offline oder lokal.

Einige Funktionen benötigen Internet:

- **Login und Account-Funktionen** über Supabase
- **Ranglisten / Sync** über Supabase
- **Freunde / Challenges / Trainingsergebnisse** über Supabase

Die Foto- und OCR-Funktionen sollen ohne externe KI-API auskommen. Gemini/Google-KI ist nicht Bestandteil der aktuellen App-Konfiguration.

## 🚀 Quick Start

1. Open the app:  
   https://kr511.github.io/schuss-challenge/

2. Or run locally:
   ```bash
   git clone https://github.com/kr511/schuss-challenge.git
   cd schuss-challenge
   npx serve .
   ```

## 🧑‍💻 Project Status

This is an active learning and development project. Feedback, bug reports and improvement ideas are welcome.

## 🧩 Supabase Social Schema (Single Source of Truth)

Für Social/Friends/Challenges ist **`supabase/schema-social.sql`** das primäre, kanonische Schema.

Das alte Root-Migrationsfile `migrations/0002_social.sql` ist absichtlich als **legacy/no-op** markiert und darf nicht mehr als aktive Social-Migration genutzt werden.

## 🗂️ Supabase Social Migrationskette (from zero)

Wenn du das Social-System **ab Null** in einer frischen Supabase-Datenbank aufsetzen willst, führe die SQL-Dateien **genau in dieser Reihenfolge** aus:

1. `supabase/migrations/0001_social_tables.sql`
2. `supabase/migrations/0002_social_indexes.sql`
3. `supabase/migrations/0003_social_rls.sql`
4. `supabase/migrations/0004_social_rpc.sql`
5. `supabase/migrations/0005_training_leaderboard.sql`

Alternativ kannst du stattdessen das All-in-One-Schema `supabase/schema-social.sql` verwenden (enthält dieselben Bestandteile: Tabellen, Indizes, RLS-Policies, RPC-Funktionen). Für Training, Leaderboard und spätere Vereinsfunktionen ist zusätzlich die Migration `0005_training_leaderboard.sql` vorgesehen.

## 🔌 Frontend ↔ Schema Konsistenz

Der Supabase-Adapter nutzt exakt die finalen Tabellennamen/Spalten aus dem Schema:

- `profiles(id, username, display_name, avatar_url, updated_at)`
- `friend_codes(user_id, code)`
- `friend_requests(id, from_user_id, to_user_id, status, responded_at)`
- `friends(user_id, friend_user_id, created_at)`
- `online_status(user_id, online, last_seen, username)`
- `async_challenges(creator_id, opponent_id, discipline, weapon, distance, difficulty, shots, burst)`
- `training_sessions(user_id, discipline, weapon, distance, shots, focus, mode, started_at, completed_at)`
- `training_results(session_id, user_id, score, average, best_series, worst_series, group_size, trend, analysis_confidence, manual_corrected, photo_used)`
- `leaderboard_entries(user_id, username, score, xp, weapon, discipline, shots, source)`

RPC-Aufrufe im Frontend entsprechen ebenfalls dem finalen Contract:

- `rpc('touch_my_profile', { next_username })`
- `rpc('accept_friend_request', { request_id })`

## 🧪 Lokale Befehle

```bash
npm install                  # Abhängigkeiten installieren
npm run dev                  # wrangler dev → http://localhost:8787
npm run check:js             # Syntax-Check aller Frontend-Module
npm run check:html           # HTML-Integrity (IDs, Script-Sources, Profil-Tabs)
npm run verify:balance       # Balance-Sampling über Disziplin × Difficulty
npm test                     # cleanup + check:js + check:html + Auth/Bridge-Tests + verify:balance
```

## 📱 PWA-Test (manuell)

1. `npm run dev` starten und im Chrome-DevTools → **Application** Tab öffnen.
2. **Manifest** prüfen: Name „Schützen Challenge", `display: standalone`, Icons 192/512.
3. **Service Workers**: registrierter SW (`sw.js?v=4.0`) ist *activated and running*.
4. Im **Network**-Tab Throttling auf „Offline" stellen und neu laden → es muss `offline.html` ausgeliefert werden.
5. Im **Application → Storage**-Tab prüfen: Auth-Tokens **nicht** in `caches` (Service Worker cached `/api/`, Supabase und OAuth-Hosts NIE).
6. Auf einem echten Smartphone (HTTPS-Deployment) den Add-to-Home-Screen-Prompt durchklicken → App muss als Standalone öffnen.

## 🔐 Sicherheitshinweise

- **Anon-Key** (in `supabase-client.js`) ist designt zum Veröffentlichen; **service-role** lebt **nur** als Cloudflare-Secret.
- `ALLOW_INSECURE_DEV_AUTH=true` ist ausschließlich für `localhost` gedacht – Produktion benutzt JWT-Validierung.
- Schreiboperationen auf `shooter_challenges` sind durch RLS auf Einträge in `public.app_admins` beschränkt.
- Trainings-Challenges enthalten **immer** eine `safetyNote`. Live-Fire-Inhalte sind explizit ausgewiesen und gelten ausschließlich auf zugelassenen Schießständen mit Aufsicht laut Standordnung.

## 📚 Schützen-Challenges (Trainingsdaten)

Statisches Frontend-Dataset: [`src/data/shooter-challenges.js`](src/data/shooter-challenges.js).
UI-Modul (Render + Completion-Flow): [`src/features/shooter-challenges-ui.js`](src/features/shooter-challenges-ui.js).
Persistenz-Schema (optional): [`supabase/migrations/0007_shooter_challenges.sql`](supabase/migrations/0007_shooter_challenges.sql).

Felder pro Challenge: `id, title, description, category, difficulty, durationMinutes, safetyNote, requiredEquipment[], instructions[], scoringType, successCriteria, isDryFire, isLiveFire`.

Speicherreihenfolge bei Abschluss: erst Supabase (`challenge_completions`, RLS auf `auth.uid()`), dann lokaler Fallback in `localStorage` (`sd_shooter_challenge_completions`). Es wird **nie** ein Erfolg gemeldet, wenn weder online noch lokal gespeichert werden konnte.

## ⚙️ Supabase-Frontend-Config

Zentrale Datei: [`supabase-config.js`](supabase-config.js). Wird **vor** `auth-gate.js` und `supabase-client.js` geladen und schreibt die Werte in `window.SCHUETZEN_CHALLENGE_CONFIG` und (für Kompatibilität) `window.__SUPABASE_CONFIG__`.

Reihenfolge der Werte (höchste Priorität zuerst):

1. `window.SCHUETZEN_CHALLENGE_CONFIG` (z. B. von einem eigenen Pre-Script gesetzt)
2. `<meta name="supabase-url">` und `<meta name="supabase-anon-key">`
3. `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (nur falls jemand mit Vite baut)
4. Hardcoded öffentliche Default-Werte (damit GitHub Pages ohne Build läuft)

Im Frontend gehört **ausschließlich** der Supabase-Anon-Key. Der Service-Role-Key lebt nur als Cloudflare-Worker-Secret. Zugriffsschutz erfolgt über RLS-Policies (siehe `supabase/migrations/0007_shooter_challenges.sql` und `supabase/schema-social.sql`).

## 🛠️ Bekannte offene Punkte

- Markenname wird im Code teils noch als „Schussduell" geführt (Branding-Migration läuft).
- `main.js.DEPRECATED`, `patch_*.cjs` sind Altlasten und nicht mehr Bestandteil des Build-Pfads.
- TensorFlow.js-Modell wird beim ersten Vision-Use lokal geladen; Auswertung läuft On-Device.
