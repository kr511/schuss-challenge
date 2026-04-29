# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Schussduell / Schuss Challenge is a PWA for shooting-sport training (air rifle + smallbore). The frontend is vanilla JS served as static assets; the backend is a Cloudflare Worker backed by D1. Local AI (TensorFlow.js) runs on-device for monitor-vs-paper target classification — per the README, no image data leaves the device. UI/comments are primarily in German.

## Commands

```bash
npm run dev                   # wrangler dev — serves worker + static assets at http://localhost:8787
npm run verify:balance        # runs verify-balance.js → BattleBalance.runBalanceVerification over disciplines × difficulties
npm run d1:migrate:local      # applies migrations/0001_initial.sql to local D1
npm run d1:migrate:remote     # applies 0001_initial.sql to remote D1

# Additional migrations must be applied manually (the npm scripts only cover 0001):
npx wrangler d1 execute schuss_challenge --file=./migrations/0002_social.sql --local
npx wrangler d1 execute schuss_challenge --file=./migrations/0003_feedback_updates.sql --local
```

### Tests (no `npm test` script — run manually)

```bash
npx tsx test_api_direct.mjs   # in-process worker test. Uses node:sqlite as a D1 stand-in and imports worker/api.ts directly. This bypasses wrangler/miniflare, which crashes on Node 24 + Windows (noted in that file).
node test_xss_direct.mjs      # jsdom-based XSS tests for escHtml + render functions
pwsh -ExecutionPolicy Bypass -File ./verify_backend.ps1   # CORS/auth/validation probes against a running `npm run dev` on :8787
```

`qa-test-suite.js` runs automatically in the browser ~2s after load; it's not part of the CI-style test set.

## Architecture

### Frontend — monolith + feature modules, no bundler

`index.html` is the single entry. It loads ~25 `<script>` tags with `?v=X.X` query params for cache-busting; **load order is intentional** (`app.js` must load before `daily-challenge.js`, `friends.js`, etc.). Each feature file is an IIFE exposing a global (`AdaptiveBotSystem`, `DailyChallenge`, `FriendsSystem`, `StorageManager`, `BattleBalance`, …).

`app.js` (~7.5k lines) is the core. Key globals:
- `G` — runtime game state (discipline, weapon, shots, bot state, timers, 3×20 positions)
- `DOM` — cached `getElementById` refs
- `showScreen(id)` — view transitions between `screenEntry`, `screenSetup`, `screenBattle`, `screenOver`, `screenFeedback`

Persistence conventions:
- All localStorage goes through `StorageManager` (`storage-manager.js`) with an `sd_` prefix. Prefer `StorageManager.get/set/getRaw/setRaw` over direct `localStorage.*`.
- Supabase-only. Lokaler Gastmodus als Fallback. Auth, Google OAuth, friends, presence, async challenges, profile sync, and leaderboard data must use Supabase/Worker APIs or local guest data.
- The Cloudflare Worker API (see backend section) handles sessions, achievements, streaks, leaderboard, feedback, profiles, live activity.

Domain vocabulary:
- Disciplines: `lg40`, `lg60`, `kk50`, `kk100`, `kk3x20` (LG = Luftgewehr / air rifle, KK = Kleinkaliber / smallbore; 3×20 splits into kneeling/prone/standing)
- Bot difficulties: `easy`, `real`, `hard`, `elite`
- API-level `GameMode`: `standard | challenge | bot_fight | timed` (this is distinct from discipline)
- Balance targets per discipline × difficulty live in `battle-balance.js::BALANCE_TARGETS` and are the source of truth for bot scoring bands.

AI / image pipeline:
- `image-compare.js` + `image-compare-brain.js` + `model.json` + `weights.bin` + `group1-shard*.bin` — a TensorFlow.js CNN classifying monitor vs paper targets, loaded on demand via `loadMLModel()`. If TF.js isn't present, it degrades gracefully.
- `contextual-ocr.js` + `multi-score-detection.js` — OCR/score extraction from captured photos.
- `feature-fallback.js` listens for `featureReady` CustomEvents — features should dispatch `new CustomEvent('featureReady', { detail: { name: 'adaptiveBot' } })` when ready; there's a 5s safety-net check.

PWA:
- `sw.js` — precaches listed local JS/CSS + index.html; network-first for HTML, cache-first for assets; never caches `/api/` requests.
- **Releases require bumping both `CACHE_VERSION` in `sw.js` and the `?v=X.X` query params in `index.html`.** Otherwise users get stale files.

`main.js.DEPRECATED` is an older bundler entry — ignore; production uses individual `<script>` tags.

`patch_app_hooks.cjs` and `patch_dashboard.cjs` are **one-shot** rewrite scripts that have already been applied to `app.js` / `index.html`. Do not re-run them — they use brittle string-replace and would either double-apply or fail.

### Backend — Cloudflare Worker + D1

- `worker/index.ts` — entry. Routes `/api/*` → `handleApiRequest`; else `env.ASSETS.fetch(request)` to serve static files from the repo root (configured via `"assets": { "directory": "." }` in `wrangler.jsonc`).
- `worker/api.ts` — all routing, Zod validation, CORS, auth. Public endpoints (no auth): `GET /api/leaderboard`, `POST /api/feedback`, `GET /api/activity/live`, `GET /api/profile/:publicId`. Everything else requires a resolved user id.
- `worker/db.ts` — D1 query helpers; `ensureUserExists` is called before inserts so an unknown `userId` auto-creates a row.
- `worker/types.ts` — `Env` + shared types. `GameMode` and `FeedbackStatus` enums live here.

Migrations are the authoritative schema (`migrations/0001_initial.sql`, `0002_social.sql`, `0003_feedback_updates.sql`). Table list: `users`, `game_sessions`, `achievements`, `streaks`, `feedback`, `profiles`, `activity_log`. Always add new schema as a new numbered migration.

### Auth model (easy to misread)

The worker has **no real auth in production**. Its dev-user resolver only returns a user when **all** of these are true:
- `env.ALLOW_INSECURE_DEV_AUTH === "true"`
- The request hostname is `localhost` / `127.0.0.1` / `0.0.0.0`
- The request carries `x-dev-user-id: <id>`

In production (hostname != localhost), user-scoped endpoints will return `401 AUTH_REQUIRED` unless the Supabase-authenticated flow is available for that endpoint. The frontend identity source is Supabase Auth; local guest play stays local.

Admin endpoints (`/api/admin/*`) additionally require `userId ∈ ADMIN_USER_IDS` (comma-separated env var, empty by default).

CORS: `ALLOWED_ORIGINS` is an allow-list in `api.ts`. When `ALLOW_INSECURE_DEV_AUTH=true`, any `localhost`/`127.0.0.1` origin is echoed. Unknown origins get no `Access-Control-Allow-Origin` header (the request still succeeds at the network layer — this is by design).

## Gotchas / patterns the codebase cares about

- **Scroll-lock cleanup on overlay close** (`BUGFIXES.md` BUG #1/#2). When any modal sets `document.body.style.overflow = 'hidden'` or `position = 'fixed'`, every close path (X button, overlay-click, navigation) must restore it, and restore `overflow` synchronously (not inside `requestAnimationFrame`) on iOS Safari.
- **Null-check DOM refs before mutating** (`BUGFIXES.md` BUG #3/#7). `DOM.shotLogWrap`, `DOM.slPills[i]`, and similar `getElementById` results can be `null` — early-return with `console.error` instead of crashing. startBattle is the usual offender.
- **Escape user-supplied strings with `escHtml` before interpolating into HTML.** See `test_xss_direct.mjs` for the contract (must escape `& < > " ' ` /`, and coerce null/undefined to `""`). Prefer `textContent` / `createElement` over template-string `innerHTML` whenever possible.
- **Cache-bust on release.** Bump `CACHE_VERSION` in `sw.js` and `?v=X.X` in every affected `<script>`/`<link>` in `index.html`. The service worker is aggressively cache-first for JS/CSS.
- **Balance changes must be verified.** If you touch scoring in `battle-balance.js` or bot logic in `adaptive-bot.js`, run `npm run verify:balance` — it samples 120 games per discipline × difficulty and asserts `BALANCE_TARGETS` bands.
- **Don't rename `ADMIN_USER_IDS` / `ALLOW_INSECURE_DEV_AUTH`** without updating `wrangler.jsonc` (`vars` in root + `env.local.vars` + `env.production.vars`) and `worker/types.ts::Env`.

## Repo layout notes

- `admin.html` is a standalone Supabase-admin placeholder. Keep it self-contained; don't wire it into `index.html`.
- Friends system is split across `friends.js` / `friends-system.js` / `friends-ui.js` / `friend-challenges.js` — SupabaseSocial owns friends, requests, online status, and challenge flow.
- `vite`, `@vitejs/plugin-react`, and React are in `package.json` but the main app does not go through Vite. Don't assume a build step exists for the PWA.

## Working directory quirk

`wrangler.jsonc` sets `"assets": { "directory": "." }`, so `wrangler dev` serves the entire repo root (including `node_modules/` and migration SQL) over HTTP locally. Treat the repo root as the public docroot when reasoning about asset paths.
