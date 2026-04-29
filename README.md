# Schuss Challenge – Precision Shooting Trainer PWA

**Schuss Challenge** is a modern **Progressive Web App (PWA)** designed to help shooters train precision, consistency, and grouping — whether you're using air rifles, smallbore, pistol, or dry-fire practice.

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
