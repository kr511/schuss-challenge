# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Schützen Challenge is a PWA for shooting-sport training (air rifle + smallbore). The product name is **Schützen Challenge**; "Schussduell" is kept only as the name of the bot-duel game mode. The frontend is vanilla JS served as static assets; the backend is a Cloudflare Worker. Local AI (TensorFlow.js) runs on-device for monitor-vs-paper target classification — no image data leaves the device. UI/comments are primarily in German.

## Commands

```bash
npm run dev          # wrangler dev via scripts/dev-wrangler.mjs → http://localhost:8787
npm run check:js     # node --check syntax validation for all JS files (30+ files)
npm run check:html   # src/testing/check-html-integrity.mjs — checks IDs, script sources, tab counts
npm run verify:balance  # stochastic bot-balance test, 120 games × discipline × difficulty
npm test             # cleanup:legacy + check:js + check:html + auth/friends/async bridge tests + verify:balance
```

**Run after every change** — at minimum `npm run check:js && npm run check:html`.

### Tests requiring credentials

```bash
# Needs .dev.vars with SUPABASE_SERVICE_KEY and SUPABASE_JWT_SECRET:
npm run test:supabase          # test_api_direct.mjs + test_supabase_social_direct.mjs
npx tsx test_api_direct.mjs   # in-process worker test; imports worker/api.ts directly
                               # (bypasses wrangler/miniflare which crashes on Node 24 + Windows)
node test_xss_direct.mjs      # jsdom XSS tests for escHtml + render functions
```

`.dev.vars` format:
```
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=...
```

### Supabase migrations

```bash
npm run supabase:bundle   # regenerates supabase/run-all-migrations.sql from individual files
npm run supabase:apply    # applies pending migrations via scripts/apply-supabase-migrations.mjs
```

New migrations go in `supabase/migrations/` as `NNNN_descriptive_name.sql` and must also be appended to `supabase/run-all-migrations.sql` (or regenerated via `supabase:bundle`).

### D1 migrations (Cloudflare Worker only)

```bash
npm run d1:migrate:local    # migrations/0001_initial.sql → local D1
npm run d1:migrate:remote   # migrations/0001_initial.sql → remote D1
# 0002+ must be applied manually:
npx wrangler d1 execute schuss_challenge --file=./migrations/0002_social.sql --local
```

## Architecture

### Two separate database schemas

The project has **two independent persistence layers** — a common source of confusion:

| Layer | Location | Accessed by | Tables |
|---|---|---|---|
| **Cloudflare D1** | `migrations/` | Worker only (service_role) | `users`, `game_sessions`, `achievements`, `streaks`, `feedback`, `api_profiles`, `activity_log` |
| **Supabase Postgres** | `supabase/migrations/` | Frontend via anon key + Worker via service_role | `profiles`, `friends`, `training_sessions`, `training_results`, `leaderboard_entries`, `shooter_challenges`, `challenge_completions`, `user_progress`, etc. |

`supabase/migrations/` currently has 0001–0008 (note: two files share the `0005_` prefix). `supabase/run-all-migrations.sql` is the bundled paste-into-SQL-editor version.

### Frontend — no bundler, intentional script load order

`index.html` loads ~25 `<script>` tags with `?v=X.X` cache-busting params. **Load order matters**: `app.js` must be first; feature modules (`src/features/*`, `friends.js`, etc.) load after. Each feature is an IIFE that exposes a global.

`app.js` (~7.5k lines) is the core:
- `G` — runtime game state (discipline, weapon, shots, bot, timers, 3×20 positions)
- `DOM` — cached `getElementById` refs
- `showScreen(id)` — transitions between `screenEntry`, `screenSetup`, `screenBattle`, `screenOver`, `screenFeedback`

Feature modules in `src/`:
- `src/features/quick-training.js` — offline-first 10-shot training, Supabase sync via `training_results.local_id`
- `src/features/shooter-challenges-ui.js` — renders safety challenges; always shows Safety Notes + fire-type badge
- `src/features/online-status.js` — online/offline indicator
- `src/features/async-challenge.js` — async duel flow via SupabaseSocial
- `src/storage/storage-manager.js` — all localStorage via `sd_` prefix; always prefer `StorageManager.get/set` over direct `localStorage.*`
- `src/bot/battle-balance.js` — `BALANCE_TARGETS` is source of truth for bot scoring bands
- `src/game/duel-result-screen.js` — post-duel result flow
- `src/vision/image-compare.js` — TF.js CNN (monitor vs paper), loads on demand; always marked **Beta** in UI
- `src/testing/` — `qa-test-suite.js` (auto-runs in browser), `verify-balance.js`, `check-html-integrity.mjs`

Domain vocabulary:
- Disciplines: `lg40`, `lg60`, `kk50`, `kk100`, `kk3x20`
- Bot difficulties: `easy`, `real`, `hard`, `elite`
- API `GameMode`: `standard | challenge | bot_fight | timed`

### Backend — Cloudflare Worker

- `worker/index.ts` — routes `/api/*` → `handleApiRequest`; else `env.ASSETS.fetch(request)` (assets served from repo root per `wrangler.jsonc`)
- `worker/api.ts` — routing, Zod validation, CORS, auth. Public (no auth): `GET /api/leaderboard`, `POST /api/feedback`, `GET /api/activity/live`, `GET /api/profile/:publicId`
- `worker/db.ts` — Supabase PostgREST helpers; `ensureUserExists` is called before inserts (upserts on conflict to handle race conditions)
- `worker/types.ts` — `Env`, `GameMode`, `FeedbackStatus`

### Auth model

The Worker resolves a user from the Supabase JWT (`Authorization: Bearer <supabase-jwt>`), validated against `SUPABASE_JWT_SECRET`. Dev shortcut: if `ALLOW_INSECURE_DEV_AUTH=true` AND hostname is localhost/127.0.0.1/0.0.0.0, `x-dev-user-id` header is accepted without JWT. In production, user-scoped endpoints return `401 AUTH_REQUIRED` without a valid JWT.

Admin endpoints (`/api/admin/*`) require `userId ∈ ADMIN_USER_IDS` (comma-separated env var).

CORS: `ALLOWED_ORIGINS` allowlist in `api.ts`. `ALLOW_INSECURE_DEV_AUTH=true` additionally echoes any localhost/127.0.0.1/0.0.0.0 origin.

### PWA / Service Worker

`sw.js` strategy:
- **Navigation (HTML)**: network-first → `offline.html` fallback
- **`/api/`, Supabase, googleapis, accounts.google.com**: passthrough, never cached
- **JS/CSS**: passthrough to network (no cache-locking — avoids stale-file bugs)
- **Shell assets** (icons, manifest, offline.html): cache-first from precache

**On release**: bump `CACHE_VERSION` in `sw.js` AND `?v=X.X` on every changed `<script>`/`<link>` in `index.html`. Without both, users get stale files.

## Gotchas

- **Scroll-lock cleanup**: Any modal that sets `body.style.overflow='hidden'` or `position='fixed'` must restore it on every close path (X button, overlay click, navigation). Restore `overflow` synchronously — not inside `requestAnimationFrame` — on iOS Safari.
- **Null-check DOM refs**: `getElementById` results can be null, especially in `startBattle`. Early-return with `console.error` rather than crashing.
- **`escHtml` contract**: Must escape `& < > " ' \` /` and coerce null/undefined to `""`. See `test_xss_direct.mjs`. Use `textContent`/`createElement` over template-string `innerHTML` where possible.
- **Balance changes**: Any edit to `battle-balance.js` or `adaptive-bot.js` requires `npm run verify:balance`.
- **Double-submit protection**: Use a `busyId`/`saving` state flag; disable the button and restore in `finally`. Pattern used in `shooter-challenges-ui.js` (`STATE.busyId`) and `quick-training.js` (`STATE.saving`).
- **`featureReady` events**: Feature IIFEs should dispatch `new CustomEvent('featureReady', { detail: { name: '...' } })` after init. `feature-fallback.js` has a 5s safety-net.
- **Don't re-run patch scripts**: `patch_app_hooks.cjs` and `patch_dashboard.cjs` are one-shot scripts already applied. Re-running them will double-apply or break.

## RLS model for Supabase tables

- **Social tables** (`profiles`, `friends`, `friend_requests`, etc.): frontend uses anon key, RLS enforces per-user access.
- **Training/challenge tables** (`training_sessions`, `training_results`, `challenge_completions`, `shooter_challenges`): RLS enforces `auth.uid() = user_id`; `shooter_challenges` is public-read, admin-write.
- **Worker-API tables** (`users`, `game_sessions`, `achievements`, `streaks`, `feedback`, `api_profiles`, `activity_log`): Worker uses service_role (bypasses RLS); `0008_worker_api_rls.sql` adds read-only policies for authenticated direct access.
- `training_results.local_id` is a real column (added in `0008_training_results_local_id.sql`); Quick Training dedup uses `.eq('local_id', entry.local_id)`, not `notes`.

## Repo layout notes

- `admin.html` — standalone Supabase-admin stub; keep self-contained, don't wire into `index.html`
- `supabase/run-all-migrations.sql` — paste-into-Supabase-SQL-editor bundle; regenerate with `npm run supabase:bundle` after adding migrations
- `main.js.DEPRECATED` — ignore; production uses individual `<script>` tags
- Friends system: `friends.js` / `friends-system.js` / `friends-ui.js` / `friend-challenges.js` — `SupabaseSocial` owns friends, requests, online status, challenge flow
- `wrangler.jsonc` `"assets": { "directory": "." }` means `wrangler dev` serves the entire repo root over HTTP — treat it as the public docroot
- React/Vite are in `package.json` but the main PWA does **not** go through Vite; no build step for the frontend
