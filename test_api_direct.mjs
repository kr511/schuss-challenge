// ───────────────────────────────────────────────────────────────
// Direct test harness for worker/api.ts  (Supabase edition)
// - Bypasses wrangler/miniflare (which crashes on Node 24 / Windows)
// - Reads credentials from .dev.vars (optional)
// - DB-independent tests (CORS, Zod, auth gating) run immer.
// - DB-dependent tests (feedback CRUD, leaderboard, live activity)
//   brauchen SUPABASE_SERVICE_KEY + SUPABASE_JWT_SECRET in .dev.vars.
// ───────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .dev.vars (optional) ────────────────────────────────
let devVars = {};
try {
  devVars = Object.fromEntries(
    readFileSync(resolve(__dirname, '.dev.vars'), 'utf8')
      .split('\n')
      .filter(l => l.trim() && !l.trim().startsWith('#'))
      .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
  );
} catch {
  // .dev.vars fehlt – DB-Tests werden übersprungen
}

const SUPABASE_URL = 'https://fknftkvozwfkcarldzms.supabase.co';
const SERVICE_KEY  = devVars.SUPABASE_SERVICE_KEY ?? '';
const JWT_SECRET   = devVars.SUPABASE_JWT_SECRET ?? '';

const HAS_CREDENTIALS = Boolean(SERVICE_KEY && !SERVICE_KEY.includes('HIER'));

if (!HAS_CREDENTIALS) {
  console.log('⚠️  Keine Supabase-Credentials (.dev.vars) – DB-Tests werden übersprungen.');
  console.log('   Setze SUPABASE_SERVICE_KEY + SUPABASE_JWT_SECRET für vollständigen Testlauf.\n');
}

// Env mit echten Credentials (für DB-Tests)
const env = {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY: SERVICE_KEY,
  SUPABASE_JWT_SECRET:  JWT_SECRET,
  ALLOW_INSECURE_DEV_AUTH: 'true',
  ADMIN_USER_IDS: 'local-admin',
};

// Env mit Fake-Key (für Logic-Tests die keine DB brauchen).
// hasSupabaseConfig() = true → Auth/Validation-Logik läuft durch,
// ohne dass DB-Calls passieren (werden per Early-Return/Throw abgefangen).
const envFake = {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY: 'fake-key-no-db-access',
  SUPABASE_JWT_SECRET:  'fake-jwt-secret',
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
let pass = 0, fail = 0, skip = 0;
const failed = [];

function log(ok, label, detail = '') {
  const icon  = ok ? '✅' : '❌';
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon} ${label}\x1b[0m ${detail}`);
  if (ok) pass++; else { fail++; failed.push(label); }
}

function logSkip(label) {
  console.log(`\x1b[33m⏭  ${label} (übersprungen – keine DB-Credentials)\x1b[0m`);
  skip++;
}

// status=null → nur Header prüfen, Status ignorieren
async function expect(label, reqObj, { status = null, headerAbsent, headerEquals, header }, testEnv = envFake) {
  const res = await handleApiRequest(reqObj, testEnv);
  const actualStatus = res.status;
  const actualHeader = header ? res.headers.get(header.toLowerCase()) : null;
  const statusOk = status === null || actualStatus === status;

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
// Validation happens before any DB call – envFake is sufficient.
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
if (HAS_CREDENTIALS) {
  await expect(
    'B2/B3  PATCH status=done on unknown uuid → 404',
    req('/api/admin/feedbacks/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      headers: { 'x-dev-user-id': 'local-admin', 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    }),
    { status: 404 },
    env
  );

  await expect(
    'B2    PATCH status=archived on unknown uuid → 404',
    req('/api/admin/feedbacks/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      headers: { 'x-dev-user-id': 'local-admin', 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    }),
    { status: 404 },
    env
  );
} else {
  logSkip('B2/B3  PATCH unknown uuid → 404');
  logSkip('B2    PATCH archived on unknown uuid → 404');
}

// ── B3: insert → PATCH → verify updated_at written ──────────
if (HAS_CREDENTIALS) {
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
} else {
  logSkip('B3    PATCH status=done writes updated_at + status');
}

// ── B4: admin auth gating ────────────────────────────────────
// Auth resolution + admin check happen before any DB call – envFake sufficient.
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

if (HAS_CREDENTIALS) {
  await expect(
    'B4    Admin with whitelisted local-admin → 200',
    req('/api/admin/feedbacks', { headers: { 'x-dev-user-id': 'local-admin' } }),
    { status: 200 },
    env
  );
} else {
  logSkip('B4    Admin with whitelisted local-admin → 200');
}

// ── B11: CORS allow-list ─────────────────────────────────────
// Nur CORS-Header prüfen, Status ignorieren (DB evtl. nicht erreichbar mit fake-key).
await expect(
  'B11   Origin evil.com → no ACAO header',
  req('/api/leaderboard', { headers: { origin: 'https://evil.example.com' } }),
  { header: 'access-control-allow-origin', headerAbsent: true }
);

await expect(
  'B11   Origin localhost:8787 → ACAO echoed',
  req('/api/leaderboard', { headers: { origin: 'http://localhost:8787' } }),
  { header: 'access-control-allow-origin', headerEquals: 'http://localhost:8787' }
);

{
  const r    = await handleApiRequest(req('/api/leaderboard', { headers: { origin: 'http://localhost:8787' } }), envFake);
  const vary = r.headers.get('vary') ?? '';
  log(/\bOrigin\b/i.test(vary), 'B11   Vary: Origin header present', `(vary="${vary}")`);
}

// ── B12: Zod validation ──────────────────────────────────────
// Schema validation runs before any DB call – envFake is sufficient.
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
if (HAS_CREDENTIALS) {
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
} else {
  logSkip('Smoke POST /api/feedback → 201');
}

// ── CORS OPTIONS preflight ───────────────────────────────────
// OPTIONS wird vor hasSupabaseConfig abgehandelt – envFake oder env, egal.
{
  const r = await handleApiRequest(
    req('/api/admin/feedbacks/x', { method: 'OPTIONS', headers: { origin: 'http://localhost:8787' } }),
    envFake
  );
  const allowMethods = r.headers.get('access-control-allow-methods') ?? '';
  log(r.status === 204 && /PATCH/i.test(allowMethods), 'CORS  OPTIONS preflight → 204 + PATCH in allow-methods', `(methods="${allowMethods}")`);
}

// ── Leaderboard smoke ────────────────────────────────────────
if (HAS_CREDENTIALS) {
  const r    = await handleApiRequest(req('/api/leaderboard?mode=standard&period=weekly'), env);
  const body = await r.json();
  log(r.status === 200 && Array.isArray(body.leaderboard), 'Smoke GET /api/leaderboard → 200 + array', `(${body.leaderboard?.length ?? '?'} entries)`);
} else {
  logSkip('Smoke GET /api/leaderboard → 200 + array');
}

// ── Live activity smoke ──────────────────────────────────────
if (HAS_CREDENTIALS) {
  const r    = await handleApiRequest(req('/api/activity/live'), env);
  const body = await r.json();
  log(r.status === 200 && Array.isArray(body.activity), 'Smoke GET /api/activity/live → 200 + array');
} else {
  logSkip('Smoke GET /api/activity/live → 200 + array');
}

// ── Cleanup ──────────────────────────────────────────────────
for (const fn of cleanup) { try { await fn(); } catch {} }

// ── Summary ──────────────────────────────────────────────────
console.log('');
console.log('─────────────────────────────────────────────');
if (skip > 0) {
  console.log(`\x1b[33m  ⚠️  ${skip} DB-Tests übersprungen (keine Credentials)\x1b[0m`);
}
if (fail === 0) {
  console.log(`\x1b[32m  ✅ ${pass}/${pass} Tests bestanden${skip > 0 ? ` (+ ${skip} übersprungen)` : ''} — API-Logik korrekt.\x1b[0m`);
  process.exit(0);
} else {
  console.log(`\x1b[31m  ❌ ${fail}/${pass + fail} Tests fehlgeschlagen:\x1b[0m`);
  failed.forEach(l => console.log('     -', l));
  process.exit(1);
}
