// ───────────────────────────────────────────────────────────────
// Direct test harness for worker/api.ts  (Supabase edition)
// - Bypasses wrangler/miniflare (which crashes on Node 24 / Windows)
// - Reads credentials from .dev.vars
// - Uses real Supabase PostgREST for test-data setup/teardown
// - Calls handleApiRequest(Request, env) directly and asserts responses
// ───────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .dev.vars ───────────────────────────────────────────
const devVars = Object.fromEntries(
  readFileSync(resolve(__dirname, '.dev.vars'), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const SUPABASE_URL = 'https://fknftkvozwfkcarldzms.supabase.co';
const SERVICE_KEY  = devVars.SUPABASE_SERVICE_KEY;
const JWT_SECRET   = devVars.SUPABASE_JWT_SECRET;

if (!SERVICE_KEY || SERVICE_KEY.includes('HIER')) {
  console.error('❌  SUPABASE_SERVICE_KEY fehlt in .dev.vars'); process.exit(1);
}

const env = {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY: SERVICE_KEY,
  SUPABASE_JWT_SECRET:  JWT_SECRET,
  ALLOW_INSECURE_DEV_AUTH: 'true',
  ADMIN_USER_IDS: 'local-admin',
};

// ── Supabase helpers for test setup/teardown ─────────────────
const SB_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: SB_HEADERS, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`sbInsert(${table}): ${await res.text()}`);
}

async function sbGet(table, qs) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`sbGet(${table}): ${await res.text()}`);
  return res.json();
}

async function sbDelete(table, qs) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { method: 'DELETE', headers: SB_HEADERS });
}

// Track inserted IDs for cleanup
const cleanup = [];

// ── Import worker API (via tsx loader) ───────────────────────
const { handleApiRequest } = await import('./worker/api.ts');

// ── Test runner ──────────────────────────────────────────────
let pass = 0, fail = 0;
const failed = [];

function log(ok, label, detail = '') {
  const icon  = ok ? '✅' : '❌';
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon} ${label}\x1b[0m ${detail}`);
  if (ok) pass++; else { fail++; failed.push(label); }
}

async function expect(label, reqObj, { status, headerAbsent, headerEquals, header }) {
  const res = await handleApiRequest(reqObj, env);
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
    try { console.log('   body:', (await res.clone().text()).slice(0, 200)); } catch {}
  }
}

function req(path, opts = {}) {
  const url = 'http://localhost:8787' + path;
  const headers = new Headers(opts.headers || {});
  if (!headers.has('origin')) headers.set('origin', 'http://localhost:8787');
  return new Request(url, { ...opts, headers });
}

// ── B1: UUID validation ──────────────────────────────────────
await expect(
  'B1  PATCH not-a-uuid → 400 INVALID_ID',
  req('/api/admin/feedbacks/not-a-uuid', {
    method: 'PATCH',
    headers: { 'x-dev-user-id': 'local-admin', 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'done' }),
  }),
  { status: 400 }
);

// ── B2: unknown UUID → 404 ───────────────────────────────────
await expect(
  'B2/B3  PATCH status=done on unknown uuid → 404',
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

// ── B3: insert → PATCH → verify updated_at written ──────────
{
  const id = '12345678-1234-4234-8234-123456789abc';
  cleanup.push(() => sbDelete('feedback', `id=eq.${id}`));
  await sbInsert('feedback', {
    id, user_email: 'user@example.com', feedback_type: 'bug',
    title: 'test', message: 'test msg', sent_at: Date.now(), status: 'pending',
  });
  const res = await handleApiRequest(
    req('/api/admin/feedbacks/' + id, {
      method: 'PATCH',
      headers: { 'x-dev-user-id': 'local-admin', 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    }),
    env
  );
  const rows = await sbGet('feedback', `id=eq.${id}`);
  const row  = rows[0];
  const ok   = res.status === 200 && row?.status === 'done' && row?.updated_at != null;
  log(ok, 'B3    PATCH status=done writes updated_at + status', `(http ${res.status}, status=${row?.status}, updated_at=${row?.updated_at})`);
}

// ── B4: admin auth gating ────────────────────────────────────
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

// ── B11: CORS allow-list ─────────────────────────────────────
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

{
  const r    = await handleApiRequest(req('/api/leaderboard', { headers: { origin: 'http://localhost:8787' } }), env);
  const vary = r.headers.get('vary') ?? '';
  log(/\bOrigin\b/i.test(vary), 'B11   Vary: Origin header present', `(vary="${vary}")`);
}

// ── B12: Zod validation ──────────────────────────────────────
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

// ── Smoke: POST /api/feedback ────────────────────────────────
{
  const smokeRes = await handleApiRequest(
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
    env
  );
  const body = await smokeRes.json();
  log(smokeRes.status === 201, 'Smoke POST /api/feedback → 201', `(id=${body.feedbackId})`);
  if (body.feedbackId) cleanup.push(() => sbDelete('feedback', `id=eq.${body.feedbackId}`));
}

// ── CORS OPTIONS preflight ───────────────────────────────────
{
  const r = await handleApiRequest(
    req('/api/admin/feedbacks/x', { method: 'OPTIONS', headers: { origin: 'http://localhost:8787' } }),
    env
  );
  const allowMethods = r.headers.get('access-control-allow-methods') ?? '';
  log(r.status === 204 && /PATCH/i.test(allowMethods), 'CORS  OPTIONS preflight → 204 + PATCH in allow-methods', `(methods="${allowMethods}")`);
}

// ── Leaderboard smoke ────────────────────────────────────────
{
  const r    = await handleApiRequest(req('/api/leaderboard?mode=standard&period=weekly'), env);
  const body = await r.json();
  log(r.status === 200 && Array.isArray(body.leaderboard), 'Smoke GET /api/leaderboard → 200 + array', `(${body.leaderboard?.length ?? '?'} entries)`);
}

// ── Live activity smoke ──────────────────────────────────────
{
  const r    = await handleApiRequest(req('/api/activity/live'), env);
  const body = await r.json();
  log(r.status === 200 && Array.isArray(body.activity), 'Smoke GET /api/activity/live → 200 + array');
}

// ── Cleanup ──────────────────────────────────────────────────
for (const fn of cleanup) { try { await fn(); } catch {} }

// ── Summary ──────────────────────────────────────────────────
console.log('');
console.log('─────────────────────────────────────────────');
if (fail === 0) {
  console.log(`\x1b[32m  ✅ ${pass}/${pass} tests passed — Supabase-Migration funktioniert.\x1b[0m`);
  process.exit(0);
} else {
  console.log(`\x1b[31m  ❌ ${fail}/${pass + fail} tests failed:\x1b[0m`);
  failed.forEach(l => console.log('     -', l));
  process.exit(1);
}
