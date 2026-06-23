-- Add aggregate stats columns to profiles so friends-system.js can query them.
-- friends-system.js:62 selects total_xp and rank; without these columns the query errors.

alter table public.profiles
  add column if not exists total_xp integer not null default 0,
  add column if not exists total_score integer not null default 0,
  add column if not exists rank text;

-- Partial index for non-zero XP lookups (friend leaderboard ordering).
create index if not exists idx_profiles_total_xp on public.profiles(total_xp desc)
  where total_xp > 0;
