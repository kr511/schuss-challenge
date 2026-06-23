-- Schützen-Challenges – seriöse Trainings- und Übungsdaten.
-- RLS-Policies:
--   • shooter_challenges      → öffentlich lesbar, schreibend nur Admins.
--   • challenge_completions   → eigene Zeilen lesen/schreiben (auth.uid()).
--   • training_sessions       → eigene Zeilen lesen/schreiben.
--   • user_progress           → eigene Zeile lesen/schreiben.
--
-- Admin-Erkennung über Tabelle public.app_admins (user_id, granted_at).
-- Dort werden zugelassene Admin-User-IDs gepflegt.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "app_admins_select_self" on public.app_admins;
create policy "app_admins_select_self" on public.app_admins
  for select using (auth.uid() = user_id);

-- Schreibzugriff auf app_admins gibt es bewusst NICHT via RLS.
-- Nur per Service-Role (Worker oder Supabase Studio).

-- ── shooter_challenges ──────────────────────────────────────────────
create table if not exists public.shooter_challenges (
  id text primary key,
  title text not null,
  description text not null,
  category text not null check (category in (
    'sicherheit','grundlagen','atmung','stand','abzug',
    'zielbild','trockenuebung','konzentration','wettkampf','auswertung'
  )),
  difficulty text not null check (difficulty in ('anfaenger','fortgeschritten','profi')),
  duration_minutes integer not null check (duration_minutes between 1 and 240),
  safety_note text not null,
  required_equipment jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  scoring_type text not null check (scoring_type in ('checklist','shots','time','self')),
  success_criteria text not null,
  is_dry_fire boolean not null default true,
  is_live_fire boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shooter_challenges enable row level security;

drop policy if exists "shooter_challenges_select_public" on public.shooter_challenges;
create policy "shooter_challenges_select_public" on public.shooter_challenges
  for select using (is_active);

drop policy if exists "shooter_challenges_admin_insert" on public.shooter_challenges;
create policy "shooter_challenges_admin_insert" on public.shooter_challenges
  for insert with check (
    exists (select 1 from public.app_admins a where a.user_id = auth.uid())
  );

drop policy if exists "shooter_challenges_admin_update" on public.shooter_challenges;
create policy "shooter_challenges_admin_update" on public.shooter_challenges
  for update using (
    exists (select 1 from public.app_admins a where a.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.app_admins a where a.user_id = auth.uid())
  );

drop policy if exists "shooter_challenges_admin_delete" on public.shooter_challenges;
create policy "shooter_challenges_admin_delete" on public.shooter_challenges
  for delete using (
    exists (select 1 from public.app_admins a where a.user_id = auth.uid())
  );

-- ── challenge_completions ──────────────────────────────────────────
create table if not exists public.challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null references public.shooter_challenges(id) on delete cascade,
  completed_at timestamptz not null default now(),
  score numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, challenge_id, completed_at)
);

create index if not exists idx_completions_user on public.challenge_completions(user_id);
create index if not exists idx_completions_challenge on public.challenge_completions(challenge_id);

alter table public.challenge_completions enable row level security;

drop policy if exists "completions_select_own" on public.challenge_completions;
create policy "completions_select_own" on public.challenge_completions
  for select using (auth.uid() = user_id);

drop policy if exists "completions_insert_own" on public.challenge_completions;
create policy "completions_insert_own" on public.challenge_completions
  for insert with check (auth.uid() = user_id);

drop policy if exists "completions_update_own" on public.challenge_completions;
create policy "completions_update_own" on public.challenge_completions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "completions_delete_own" on public.challenge_completions;
create policy "completions_delete_own" on public.challenge_completions
  for delete using (auth.uid() = user_id);

-- ── training_sessions ──────────────────────────────────────────────
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  discipline text,
  weapon text,
  notes text,
  shots_total integer check (shots_total is null or shots_total >= 0),
  ring_average numeric,
  is_dry_fire boolean not null default true,
  is_live_fire boolean not null default false
);

create index if not exists idx_training_user on public.training_sessions(user_id);
create index if not exists idx_training_started_at on public.training_sessions(started_at);

alter table public.training_sessions enable row level security;

drop policy if exists "training_select_own" on public.training_sessions;
create policy "training_select_own" on public.training_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "training_insert_own" on public.training_sessions;
create policy "training_insert_own" on public.training_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "training_update_own" on public.training_sessions;
create policy "training_update_own" on public.training_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "training_delete_own" on public.training_sessions;
create policy "training_delete_own" on public.training_sessions
  for delete using (auth.uid() = user_id);

-- ── user_progress ──────────────────────────────────────────────────
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_completions integer not null default 0,
  total_dry_fire_minutes integer not null default 0,
  total_live_fire_minutes integer not null default 0,
  last_completion_at timestamptz,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own" on public.user_progress
  for select using (auth.uid() = user_id);

drop policy if exists "user_progress_insert_own" on public.user_progress;
create policy "user_progress_insert_own" on public.user_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_progress_update_own" on public.user_progress;
create policy "user_progress_update_own" on public.user_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
