import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function readVarsFile(filePath) {
  if (!existsSync(filePath)) return {};

  return Object.fromEntries(
    readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...valueParts] = line.split('=');
        return [key.trim(), valueParts.join('=').trim().replace(/^["']|["']$/g, '')];
      }),
  );
}

function readSupabaseUrl() {
  const devVars = readVarsFile(join(root, '.dev.vars'));
  const envVars = readVarsFile(join(root, '.env'));
  const envExampleVars = readVarsFile(join(root, '.env.example'));

  return (
    process.env.SUPABASE_URL
    ?? devVars.SUPABASE_URL
    ?? envVars.SUPABASE_URL
    ?? envExampleVars.SUPABASE_URL
    ?? 'https://fknftkvozwfkcarldzms.supabase.co'
  ).replace(/\/+$/, '');
}

function getProjectRef(supabaseUrl) {
  const host = new URL(supabaseUrl).hostname;
  const [projectRef] = host.split('.');
  if (!projectRef || projectRef === 'localhost') {
    throw new Error(`Could not derive Supabase project ref from SUPABASE_URL=${supabaseUrl}`);
  }
  return projectRef;
}

function getAccessToken() {
  const devVars = readVarsFile(join(root, '.dev.vars'));
  const envVars = readVarsFile(join(root, '.env'));
  return (
    process.env.SUPABASE_ACCESS_TOKEN
    ?? process.env.SUPABASE_MANAGEMENT_TOKEN
    ?? devVars.SUPABASE_ACCESS_TOKEN
    ?? devVars.SUPABASE_MANAGEMENT_TOKEN
    ?? envVars.SUPABASE_ACCESS_TOKEN
    ?? envVars.SUPABASE_MANAGEMENT_TOKEN
    ?? ''
  );
}

async function runManagementQuery(projectRef, accessToken, query, label) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const printable = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    throw new Error(`${label} failed with HTTP ${response.status}:\n${printable.slice(0, 4000)}`);
  }

  return data;
}

function assertRows(result, expectedNames, typeLabel) {
  const rows = Array.isArray(result) ? result : (result?.data ?? result?.result ?? []);
  const actualNames = new Set(
    rows
      .map((row) => row.table_name ?? row.proname ?? row.name)
      .filter(Boolean),
  );
  const missing = expectedNames.filter((name) => !actualNames.has(name));

  if (missing.length) {
    throw new Error(`Migration applied, but ${typeLabel} verification is missing: ${missing.join(', ')}`);
  }
}

const accessToken = getAccessToken();
if (!accessToken) {
  console.error([
    'SUPABASE_ACCESS_TOKEN is missing.',
    '',
    'Create one in Supabase Dashboard -> Account -> Access Tokens.',
    'It needs database write access for this project.',
    '',
    'Then run in PowerShell:',
    '$env:SUPABASE_ACCESS_TOKEN="sbp_..."',
    'npm.cmd run supabase:apply',
  ].join('\n'));
  process.exit(1);
}

const supabaseUrl = readSupabaseUrl();
const projectRef = getProjectRef(supabaseUrl);
const migrationsDir = join(root, 'supabase', 'migrations');
const migrationFiles = [
  '0001_social_tables.sql',
  '0002_social_indexes.sql',
  '0003_social_rls.sql',
  '0004_social_rpc.sql',
  '0005_worker_api_tables.sql',
  '0005_training_leaderboard.sql',
  '0006_social_remove_friend_rpc.sql',
];

console.log(`Applying Supabase SQL migrations to project ${projectRef}...`);
for (const fileName of migrationFiles) {
  const sqlPath = join(migrationsDir, fileName);
  if (!existsSync(sqlPath)) {
    throw new Error(`Missing migration file: ${sqlPath}`);
  }

  console.log(`Applying ${fileName}...`);
  const sql = readFileSync(sqlPath, 'utf8');
  await runManagementQuery(projectRef, accessToken, sql, fileName);
}
console.log('Migration queries finished.');

const tableResult = await runManagementQuery(projectRef, accessToken, `
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'friend_codes',
    'friend_requests',
    'friends',
    'online_status',
    'async_challenges',
    'async_results',
    'users',
    'game_sessions',
    'achievements',
    'streaks',
    'feedback',
    'api_profiles',
    'activity_log',
    'training_sessions',
    'training_results',
    'leaderboard_entries'
  )
order by table_name;
`, 'Table verification');

assertRows(tableResult, [
  'profiles',
  'friend_codes',
  'friend_requests',
  'friends',
  'online_status',
  'async_challenges',
  'async_results',
  'users',
  'game_sessions',
  'achievements',
  'streaks',
  'feedback',
  'api_profiles',
  'activity_log',
  'training_sessions',
  'training_results',
  'leaderboard_entries',
], 'table');

const functionResult = await runManagementQuery(projectRef, accessToken, `
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'touch_my_profile',
    'accept_friend_request',
    'remove_friend'
  )
order by p.proname;
`, 'Function verification');

assertRows(functionResult, [
  'touch_my_profile',
  'accept_friend_request',
  'remove_friend',
], 'function');

console.log('Supabase SQL migrations are live and verified.');
