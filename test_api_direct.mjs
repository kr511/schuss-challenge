// ───────────────────────────────────────────────────────────────
// Direct test harness for worker/api.ts
// - Bypasses wrangler/miniflare (which crashes on Node 24 / Windows)
// - Uses node:sqlite as a D1Database stand-in
// - Applies 0001 + 0002 migrations to an in-memory DB
// - Calls handleApiRequest(Request, env) directly and asserts responses
// ───────────────────────────────────────────────────────────────

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Build in-memory D1 ───────────────────────────────────────
const sqlite = new DatabaseSync(':memory:');
for (const file of ['migrations/0001_initial.sql', 'migrations/0002_feedback_updates.sql']) {
  const sql = readFileSync(resolve(__dirname, file), 'utf8');
  sqlite.exec(sql);
}

// D1-compatible wrapper around node:sqlite
function makeD1(db) {
  return {
    prepare(query) {
      let params = [];
      const api = {
        bind(...values) { params = values; return api; },
        async first() {
          const stmt = db.prepare(query);
          const row = stmt.get(...params);
          return row ?? null;
        },
        async run() {
          const stmt = db.prepare(query);
          const info = stmt.run(...params);
          return { success: true, meta: info };
        },
        async all() {
          const stmt = db.prepare(query);
          const results = stmt.all(...params);
          return { results, success: true };
        },
      };
      return api;
    },
  };
}

const env = {
  DB: makeD1(sqlite),
  ALLOW_INSECURE_DEV_AUTH: 'true',
  ADMIN_USER_IDS: 'local-admin',
};

// ── Import worker API (via tsx loader) ───────────────────────
const { handleApiRequest } = await import('./worker/api.ts');

// ── Test runner ──────────────────────────────────────────────
let pass = 0, fail = 0;
const failed = [];

function log(ok, label, detail = '') {
  const icon = ok ? '✅' : '❌';
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon} ${label}\x1b[0m ${detail}`);
  if (ok) pass++; else { fail++; failed.push(label); }
}

async function expect(label, req, { status, headerAbsent, headerEquals, header }) {
  const res = await handleApiRequest(req, env);
  const actualStatus = res.status;
  const actualHeader = header ? res.headers.get(header.toLowerCase()) : null;
  const statusOk = actualStatus === status;

  let headerOk = true, detail = `(status ${actualStatus})`;
  if (headerAbsent) {
    headerOk = actualHeader === null;
    detail += ` [${header}=${actualHeader ?? 'absent'}]`;
  } else if (headerEquals !== undefined) {
    headerOk = actualHeader === headerEquals;
    detail += ` [${header}=${actualHeader}]`;
  }
  log(statusOk && headerOk, label, detail);
  if (!statusOk || !headerOk) {
    try {
      const body = await res.clone().text();
      console.log('   body:', body.slice(0, 200));
    } catch {}
  }
}

function req(path, opts = {}) {
  const url = 'http://localhost:8787' + path;
  const headers = new Headers(opts.headers || {});
  if (!headers.has('origin')) headers.set('origin', 'http://localhost:8787');
  return new Request(url, { ...opts, headers });
}

// ── B1: UUID validation ──
await expect(
  'B1  PATCH not-a-uuid → 400 INVALID_ID',
  req('/api/admin/feedbacks/not-a-uuid', {
    method: 'PATCH',
    headers: { 'x-dev-user-id': 'local-admin', 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'done' }),
  }),
  { status: 400 }
);

// ── B2/B3: new enum + updated_at column ──
await expect(
  'B2/B3  PATCH status=done on unknown uuid → 404 (not 500)',
  req('/api/admin/feedbacks/00000000-0000-0000-0000-000000000000', {
    method: 'PATCH',
    headers: { 'x-dev-user-id': 'local-admin', 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'done' }),
  }),
  { status: 404 }
);

await expect(
  'B2    PATCH status=archived on unknown uuid → 404',
  req('/api/admin/feedbacks/00000000-0000-0000-0000-000000000000', {
    method: 'PATCH',
    headers: { 'x-dev-user-id': 'local-admin', 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'archived' }),
  }),
  { status: 404 }
);

// B3 live-check: insert feedback, update to 'done', verify updated_at is written
{
  // Insert directly via sqlite (bypass API auth/validation)
  const id = '12345678-1234-4234-8234-123456789abc';
  sqlite.prepare(`INSERT INTO feedback (id, user_email, feedback_type, title, message, sent_at, status) VALUES (?,?,?,?,?,?,?)`).run(
    id, 'user@example.com', 'bug', 'test', 'test msg', Date.now(), 'pending'
  );
  const res = await handleApiRequest(
    req('/api/admin/feedbacks/' + id, {
      method: 'PATCH',
      headers: { 'x-dev-user-id': 'local-admin', 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    }),
    env
  );
  const row = sqlite.prepare('SELECT status, updated_at FROM feedback WHERE id = ?').get(id);
  const ok = res.status === 200 && row?.status === 'done' && typeof row?.updated_at === 'number';
  log(ok, 'B3    PATCH status=done writes updated_at + status', `(http ${res.status}, row ${JSON.stringify(row)})`);
}

// ── B4: admin auth gating ──
await expect(
  'B4    Admin with no auth → 401',
  req('/api/admin/feedbacks'),
  { status: 401 }
);

await expect(
  'B4    Admin with non-whitelisted user → 403',
  req('/api/admin/feedbacks', { headers: { 'x-dev-user-id': 'some-random-user' } }),
  { status: 403 }
);

await expect(
  'B4    Admin with whitelisted local-admin → 200',
  req('/api/admin/feedbacks', { headers: { 'x-dev-user-id': 'local-admin' } }),
  { status: 200 }
);

// ── B11: CORS allow-list ──
await expect(
  'B11   Origin evil.com → no ACAO header',
  req('/api/leaderboard', { headers: { origin: 'https://evil.example.com' } }),
  { status: 200, header: 'access-control-allow-origin', headerAbsent: true }
);

await expect(
  'B11   Origin localhost:8787 → ACAO echoed',
  req('/api/leaderboard', { headers: { origin: 'http://localhost:8787' } }),
  { status: 200, header: 'access-control-allow-origin', headerEquals: 'http://localhost:8787' }
);

// Vary: Origin must be present
{
  const r = await handleApiRequest(
    req('/api/leaderboard', { headers: { origin: 'http://localhost:8787' } }),
    env
  );
  const vary = r.headers.get('vary') ?? '';
  log(/\bOrigin\b/i.test(vary), 'B11   Vary: Origin header present', `(vary="${vary}")`);
}

// ── B12: Zod validation ──
await expect(
  'B12   PATCH status=hacked → 400',
  req('/api/admin/feedbacks/00000000-0000-0000-0000-000000000000', {
    method: 'PATCH',
    headers: { 'x-dev-user-id': 'local-admin', 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'hacked' }),
  }),
  { status: 400 }
);

await expect(
  'B12   PATCH with malformed JSON → 400',
  req('/api/admin/feedbacks/00000000-0000-0000-0000-000000000000', {
    method: 'PATCH',
    headers: { 'x-dev-user-id': 'local-admin', 'content-type': 'application/json' },
    body: 'not-json',
  }),
  { status: 400 }
);

// Legit submission through public endpoint (smoke)
await expect(
  'Smoke POST /api/feedback creates record → 201',
  req('/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'u@example.com',
      feedbackType: 'bug',
      title: 'crash on launch',
      message: 'something broke somewhere important',
    }),
  }),
  { status: 201 }
);

// OPTIONS preflight returns CORS headers for allowed origin
{
  const r = await handleApiRequest(
    req('/api/admin/feedbacks/x', { method: 'OPTIONS', headers: { origin: 'http://localhost:8787' } }),
    env
  );
  const allowMethods = r.headers.get('access-control-allow-methods') ?? '';
  const ok = r.status === 204 && /PATCH/i.test(allowMethods);
  log(ok, 'CORS  OPTIONS preflight → 204 + PATCH in allow-methods', `(methods="${allowMethods}")`);
}

// ── Summary ──
console.log('');
console.log('─────────────────────────────────────────────');
if (fail === 0) {
  console.log(`\x1b[32m  ✅ ${pass}/${pass} tests passed — alle Backend-Fixes greifen.\x1b[0m`);
  process.exit(0);
} else {
  console.log(`\x1b[31m  ❌ ${fail}/${pass + fail} tests failed:\x1b[0m`);
  failed.forEach(l => console.log('     -', l));
  process.exit(1);
}
