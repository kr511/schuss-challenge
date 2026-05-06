import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migrationsDir = join(root, 'supabase', 'migrations');
const outputPath = join(root, 'supabase', 'run-all-migrations.sql');

const migrationFiles = [
  '0001_social_tables.sql',
  '0002_social_indexes.sql',
  '0003_social_rls.sql',
  '0004_social_rpc.sql',
  '0005_worker_api_tables.sql',
  '0005_training_leaderboard.sql',
  '0006_social_remove_friend_rpc.sql',
  '0007_shooter_challenges.sql',
  '0008_training_results_local_id.sql',
  '0008_worker_api_rls.sql',
  '0009_friend_photo_duels.sql',
  '0010_clubs_core.sql',
  '0011_club_challenges.sql',
  '0012_club_duel_results.sql',
];

const header = `-- Schuss Challenge Supabase setup bundle
-- Generated from supabase/migrations.
-- Run this in Supabase Dashboard -> SQL Editor -> New query.
-- Generated at: ${new Date().toISOString()}

`;

const body = migrationFiles
  .map((fileName) => {
    const sql = readFileSync(join(migrationsDir, fileName), 'utf8').trimEnd();
    return [
      `-- ============================================================================`,
      `-- ${fileName}`,
      `-- ============================================================================`,
      sql,
      '',
    ].join('\n');
  })
  .join('\n');

writeFileSync(outputPath, header + body, 'utf8');

console.log(`Wrote ${outputPath}`);
console.log(`Included ${migrationFiles.length} migration files.`);
