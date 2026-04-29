const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = process.cwd();
const LEGACY = 'fire' + 'base';
const LEGACY_CAP = 'Fire' + 'base';
const LEGACY_UPPER = LEGACY.toUpperCase();

const forbidden = [
  LEGACY,
  LEGACY_CAP,
  LEGACY_UPPER,
  LEGACY + 'js',
  LEGACY + '-auth-compat',
  'fb' + 'Db',
  'fb' + 'Ready',
  'fb' + 'Auth',
  'fb' + 'App',
  'get' + LEGACY_CAP + 'OwnerId',
  'resolve' + LEGACY_CAP + 'OwnerId',
  LEGACY_UPPER + '_PATHS',
  'fire' + 'store',
  'get' + 'Firestore',
  'get' + 'Auth',
  'initialize' + 'App',
  LEGACY + 'Config',
];

const runtimeFiles = [
  'index.html',
  'admin.html',
  'app.js',
  'auth-gate.js',
  'backend-sync.js',
  'debug-panel.js',
  'friend-challenges.js',
  'friends.js',
  'leaderboard-modern.js',
  'local-entry.js',
  'logout-control.js',
  'mobile-features.js',
  'site-cleanup.js',
  'supabase-client.js',
  'supabase-social.js',
  'updates.js',
  'src/features/async-challenge.js',
  'src/features/friends-realtime.js',
  'src/features/friends-system.js',
  'src/game/daily-challenge.js',
].filter((name) => fs.existsSync(path.join(ROOT, name)));

const leftovers = [];
for (const name of runtimeFiles) {
  const text = fs.readFileSync(path.join(ROOT, name), 'utf8');
  for (const token of forbidden) {
    if (text.includes(token)) leftovers.push(`${name} -> ${token}`);
  }
}

if (leftovers.length > 0) {
  throw new Error('Legacy backend leftovers found:\n' + leftovers.join('\n'));
}

for (const name of runtimeFiles.filter((file) => file.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, name)], { stdio: 'inherit' });
}

console.log('Legacy realtime verifier passed. Runtime uses Supabase/local fallback only.');
