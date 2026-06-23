# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Wrangler dev server at http://localhost:8787 (worker + static assets)
npm test             # Full suite: cleanup:legacy + check:js + check:html + all test_*.mjs + verify:balance
npm run check:js     # Syntax-check JS files with node --check (no execution)
npm run check:html   # HTML integrity check (src/testing/check-html-integrity.mjs)
npm run verify:balance  # Bot balance spot-check
node test_xss_direct.mjs          # XSS tests, no Supabase needed
node test_balance_consistency.mjs  # Run a single test file (most test_*.mjs need no deps)
npx tsx test_api_direct.mjs       # Worker API tests, requires .dev.vars with real keys
npm run test:mobile                # Playwright mobile/PWA tests
npm run serve:static               # Static file server without wrangler
npm run cleanup:legacy             # Remove legacy realtime references
npm run supabase:apply             # Apply migrations to remote Supabase project
```

**Local dev setup:** `cp .dev.vars.example .dev.vars` then fill in `SUPABASE_SERVICE_KEY` and `SUPABASE_JWT_SECRET` from the Supabase dashboard (Settings → API).

## Architecture

**Runtime split — two Supabase access paths:**

| Path | File | Key | Scope |
|------|------|-----|-------|
| Browser → Supabase JS SDK | `supabase-social.js`, `supabase-client.js` | `anon` + JWT | Social: friends, online-status, async challenges, clubs |
| Browser → Cloudflare Worker → Supabase REST | `worker/db.ts` | `service_role` | Game data: sessions, achievements, streaks, leaderboard, feedback |

The Worker (`worker/index.ts`) routes `/api/*` to `worker/api.ts` and everything else to static assets. It validates the Supabase JWT before forwarding DB calls with the service-role key.

**Frontend module layout under `/src/`:**
- `core/` — game constants, state, HTML escaping, Supabase helpers
- `game/` — duel engine, scoring, XP, training modes, result screen
- `bot/` — adaptive bot logic, battle balance verification
- `storage/` — `StorageManager` wrapping localStorage with `sd_` prefix
- `features/` — async-challenge, clubs-system, quick-training, online-status, friends-system, etc.
- `ui/` — DOM helpers, effects, friends UI
- `vision/` — OCR pipeline, image comparison, multi-score detection, batch processor
- `testing/` — QA test suite, balance verifier, HTML integrity checker

**Root-level files that are intentionally NOT moved to `/src/`:** `app.js` (global orchestration, many `window.*` dependencies), `sw.js` (Service Worker scope), `auth-gate.js`, `supabase-client.js`, and all other root JS files listed in `docs/architecture.md`.

**Local-first data model:** All features work without login. Local data uses `StorageManager`/`localStorage` with the `sd_` prefix. Supabase is additive; if unavailable the app continues locally and does not sync.

**Frontend config priority:** `window.SCHUETZEN_CHALLENGE_CONFIG` → `<meta>` tags → `import.meta.env` → public defaults. Only the `anon` key and Supabase URL belong in frontend code. The `service_role` key lives exclusively in Wrangler secrets.

**Supabase migration order:** `0001` → `0012` in `supabase/migrations/`. Run via Supabase SQL Editor or `npm run supabase:apply`. Social tables (0001–0004) can alternatively be applied via the all-in-one `supabase/schema-social.sql`.

**Vision / OCR:** Photo-based score detection is beta. Results must always be manually verified. The pipeline is in `src/vision/` and is lazily loaded — paths are configured in `performance-config.js`.

**Deployment:** `wrangler deploy` (Worker to Cloudflare). Before deploying, bump `CACHE_VERSION` in `sw.js` and the `?v=X.X` query string in `index.html`. Secrets must be set via `wrangler secret put`, never in `wrangler.jsonc`.
