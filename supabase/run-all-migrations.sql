-- Schuss Challenge Supabase setup bundle
-- Generated from supabase/migrations.
-- Run this in Supabase Dashboard -> SQL Editor -> New query.
-- Generated at: 2026-05-06T16:55:43.832Z

-- ============================================================================
-- 0001_social_tables.sql
-- ============================================================================
-- Social schema (tables only)
-- Primary source: supabase/schema-social.sql

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Spieler',
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create table if not exists public.friends (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.friend_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_user_id),
  check (user_id <> friend_user_id)
);

create table if not exists public.online_status (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  online boolean not null default false,
  last_seen timestamptz not null default now(),
  username text
);

create table if not exists public.async_challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid references public.profiles(id) on delete cascade,
  discipline text not null default 'lg40',
  weapon text,
  distance text,
  difficulty text,
  shots integer not null default 40,
  burst boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'completed', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table if not exists public.async_results (
  challenge_id uuid not null references public.async_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score numeric not null default 0,
  shots jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

-- ============================================================================
-- 0002_social_indexes.sql
-- ============================================================================
-- Social schema indexes
-- Primary source: supabase/schema-social.sql

create index if not exists idx_friend_codes_code on public.friend_codes(code);
create index if not exists idx_friend_requests_to_status on public.friend_requests(to_user_id, status);
create index if not exists idx_friend_requests_from_status on public.friend_requests(from_user_id, status);
create index if not exists idx_friends_user on public.friends(user_id);
create index if not exists idx_online_status_last_seen on public.online_status(last_seen desc);
create index if not exists idx_async_challenges_opponent_status on public.async_challenges(opponent_id, status);
create index if not exists idx_async_challenges_creator_status on public.async_challenges(creator_id, status);

-- ============================================================================
-- 0003_social_rls.sql
-- ============================================================================
-- Social schema RLS and policies
-- Primary source: supabase/schema-social.sql

alter table public.profiles enable row level security;
alter table public.friend_codes enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;
alter table public.online_status enable row level security;
alter table public.async_challenges enable row level security;
alter table public.async_results enable row level security;

-- Profiles
 drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

 drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

 drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Friend codes
 drop policy if exists "friend_codes_select_all" on public.friend_codes;
create policy "friend_codes_select_all" on public.friend_codes for select using (true);

 drop policy if exists "friend_codes_insert_own" on public.friend_codes;
create policy "friend_codes_insert_own" on public.friend_codes for insert with check (auth.uid() = user_id);

 drop policy if exists "friend_codes_update_own" on public.friend_codes;
create policy "friend_codes_update_own" on public.friend_codes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friend requests
 drop policy if exists "friend_requests_select_related" on public.friend_requests;
create policy "friend_requests_select_related" on public.friend_requests for select using (auth.uid() in (from_user_id, to_user_id));

 drop policy if exists "friend_requests_insert_from_self" on public.friend_requests;
create policy "friend_requests_insert_from_self" on public.friend_requests for insert with check (auth.uid() = from_user_id);

 drop policy if exists "friend_requests_update_related" on public.friend_requests;
create policy "friend_requests_update_related" on public.friend_requests for update using (auth.uid() in (from_user_id, to_user_id)) with check (auth.uid() in (from_user_id, to_user_id));

-- Friends
 drop policy if exists "friends_select_own" on public.friends;
create policy "friends_select_own" on public.friends for select using (auth.uid() = user_id or auth.uid() = friend_user_id);

 drop policy if exists "friends_insert_own" on public.friends;
create policy "friends_insert_own" on public.friends for insert with check (auth.uid() = user_id);

 drop policy if exists "friends_delete_own" on public.friends;
create policy "friends_delete_own" on public.friends for delete using (auth.uid() = user_id);

-- Online status
 drop policy if exists "online_status_select_all" on public.online_status;
create policy "online_status_select_all" on public.online_status for select using (true);

 drop policy if exists "online_status_upsert_own" on public.online_status;
create policy "online_status_upsert_own" on public.online_status for insert with check (auth.uid() = user_id);

 drop policy if exists "online_status_update_own" on public.online_status;
create policy "online_status_update_own" on public.online_status for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Challenges/results
 drop policy if exists "async_challenges_select_related" on public.async_challenges;
create policy "async_challenges_select_related" on public.async_challenges for select using (auth.uid() = creator_id or auth.uid() = opponent_id);

 drop policy if exists "async_challenges_insert_creator" on public.async_challenges;
create policy "async_challenges_insert_creator" on public.async_challenges for insert with check (auth.uid() = creator_id);

 drop policy if exists "async_challenges_update_related" on public.async_challenges;
create policy "async_challenges_update_related" on public.async_challenges for update using (auth.uid() = creator_id or auth.uid() = opponent_id) with check (auth.uid() = creator_id or auth.uid() = opponent_id);

 drop policy if exists "async_results_select_related" on public.async_results;
create policy "async_results_select_related" on public.async_results for select using (
  exists (
    select 1 from public.async_challenges c
    where c.id = challenge_id and (auth.uid() = c.creator_id or auth.uid() = c.opponent_id)
  )
);

 drop policy if exists "async_results_insert_own" on public.async_results;
create policy "async_results_insert_own" on public.async_results for insert with check (auth.uid() = user_id);

-- ============================================================================
-- 0004_social_rpc.sql
-- ============================================================================
-- Social schema RPC helpers
-- Primary source: supabase/schema-social.sql

create or replace function public.touch_my_profile(next_username text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, username, display_name, updated_at)
  values (
    auth.uid(),
    coalesce(nullif(next_username, ''), 'Spieler'),
    coalesce(nullif(next_username, ''), 'Spieler'),
    now()
  )
  on conflict (id) do update set
    username = coalesce(nullif(next_username, ''), public.profiles.username),
    display_name = coalesce(nullif(next_username, ''), public.profiles.display_name),
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.touch_my_profile(text) to authenticated;

create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.friend_requests;
begin
  select * into req
  from public.friend_requests
  where id = request_id and to_user_id = auth.uid() and status = 'pending';

  if req.id is null then
    raise exception 'request not found';
  end if;

  update public.friend_requests
  set status = 'accepted', responded_at = now()
  where id = req.id;

  insert into public.friends (user_id, friend_user_id, request_id)
  values (req.from_user_id, req.to_user_id, req.id)
  on conflict do nothing;

  insert into public.friends (user_id, friend_user_id, request_id)
  values (req.to_user_id, req.from_user_id, req.id)
  on conflict do nothing;
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;

-- ============================================================================
-- 0005_worker_api_tables.sql
-- ============================================================================
-- Worker API persistence schema.
--
-- This is intentionally separate from the Supabase social schema
-- (profiles/friends/async_challenges). The Cloudflare Worker accesses these
-- tables with the service-role key through PostgREST.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id text primary key,
  email text unique,
  display_name text,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint)
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id) on delete cascade,
  mode text not null check (mode in ('standard', 'challenge', 'bot_fight', 'timed')),
  score integer not null default 0,
  shots_fired integer not null default 1,
  duration_seconds integer not null default 0,
  played_at bigint not null default ((extract(epoch from now()) * 1000)::bigint)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  type text not null,
  unlocked_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  unique (user_id, type)
);

create table if not exists public.streaks (
  user_id text primary key references public.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_played_date text
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  feedback_type text not null check (feedback_type in ('bug', 'feature_request', 'general')),
  title text not null,
  message text not null,
  sent_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'done', 'archived')),
  updated_at bigint
);

alter table public.feedback add column if not exists updated_at bigint;

create table if not exists public.api_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  public_id text unique not null default encode(gen_random_bytes(8), 'hex'),
  display_name text,
  privacy_settings text not null default 'private' check (privacy_settings in ('public', 'private')),
  best_stats text,
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  user_id text primary key references public.users(id) on delete cascade,
  discipline text,
  difficulty text,
  "timestamp" bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  status text
);

do $$
declare
  activity_timestamp_type text;
begin
  select data_type
    into activity_timestamp_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activity_log'
    and column_name = 'timestamp';

  if activity_timestamp_type in ('timestamp with time zone', 'timestamp without time zone') then
    alter table public.activity_log
      alter column "timestamp" type bigint
      using ((extract(epoch from "timestamp") * 1000)::bigint);
  elsif activity_timestamp_type in ('integer', 'numeric', 'double precision', 'real') then
    alter table public.activity_log
      alter column "timestamp" type bigint
      using ("timestamp"::bigint);
  elsif activity_timestamp_type = 'text' then
    alter table public.activity_log
      alter column "timestamp" type bigint
      using (
        case
          when "timestamp" ~ '^\d+$' then "timestamp"::bigint
          else ((extract(epoch from "timestamp"::timestamptz) * 1000)::bigint)
        end
      );
  end if;
end
$$;

create index if not exists idx_sessions_user_id on public.game_sessions(user_id);
create index if not exists idx_sessions_mode_played_at on public.game_sessions(mode, played_at desc);
create index if not exists idx_sessions_score on public.game_sessions(score desc);
create index if not exists idx_achievements_user on public.achievements(user_id);
create index if not exists idx_feedback_sent_at on public.feedback(sent_at desc);
create index if not exists idx_feedback_status on public.feedback(status);
create index if not exists idx_feedback_updated_at on public.feedback(updated_at);
create index if not exists idx_activity_log_timestamp on public.activity_log("timestamp");
create index if not exists idx_activity_log_status on public.activity_log(status);

alter table public.users enable row level security;
alter table public.game_sessions enable row level security;
alter table public.achievements enable row level security;
alter table public.streaks enable row level security;
alter table public.feedback enable row level security;
alter table public.api_profiles enable row level security;
alter table public.activity_log enable row level security;

-- ============================================================================
-- 0005_training_leaderboard.sql
-- ============================================================================
-- Schuss Challenge: Training + Leaderboard foundation
-- Runs after the social schema migrations.

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discipline text not null default '',
  weapon text not null default '',
  distance integer,
  shots integer not null default 0 check (shots >= 0),
  focus text not null default '',
  mode text not null default 'training',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.training_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.training_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric,
  average numeric,
  best_series numeric,
  worst_series numeric,
  group_size numeric,
  trend numeric,
  analysis_confidence numeric check (analysis_confidence is null or (analysis_confidence >= 0 and analysis_confidence <= 1)),
  manual_corrected boolean not null default false,
  photo_used boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default 'Spieler',
  score numeric not null default 0,
  xp integer not null default 0,
  weapon text not null default '',
  discipline text not null default '',
  shots integer not null default 0 check (shots >= 0),
  source text not null default 'training',
  created_at timestamptz not null default now()
);

create index if not exists training_sessions_user_created_idx
  on public.training_sessions (user_id, created_at desc);

create index if not exists training_results_user_created_idx
  on public.training_results (user_id, created_at desc);

create index if not exists training_results_session_idx
  on public.training_results (session_id);

create index if not exists leaderboard_entries_score_idx
  on public.leaderboard_entries (score desc, created_at desc);

create index if not exists leaderboard_entries_user_created_idx
  on public.leaderboard_entries (user_id, created_at desc);

alter table public.training_sessions enable row level security;
alter table public.training_results enable row level security;
alter table public.leaderboard_entries enable row level security;

-- Training sessions: users manage only their own sessions.
do $$ begin
  create policy "training_sessions_select_own"
    on public.training_sessions for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_sessions_insert_own"
    on public.training_sessions for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_sessions_update_own"
    on public.training_sessions for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_sessions_delete_own"
    on public.training_sessions for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Training results: users manage only their own results.
do $$ begin
  create policy "training_results_select_own"
    on public.training_results for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_results_insert_own"
    on public.training_results for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_results_update_own"
    on public.training_results for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_results_delete_own"
    on public.training_results for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Leaderboard entries are public-readable, but users can only write their own entries.
do $$ begin
  create policy "leaderboard_entries_select_public"
    on public.leaderboard_entries for select
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "leaderboard_entries_insert_own"
    on public.leaderboard_entries for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "leaderboard_entries_update_own"
    on public.leaderboard_entries for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "leaderboard_entries_delete_own"
    on public.leaderboard_entries for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 0006_social_remove_friend_rpc.sql
-- ============================================================================
-- Supabase social helper: remove a friendship from both users' friend lists.

create or replace function public.remove_friend(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from public.friends
  where (user_id = auth.uid() and friend_user_id = target_user_id)
     or (user_id = target_user_id and friend_user_id = auth.uid());
end;
$$;

grant execute on function public.remove_friend(uuid) to authenticated;

-- ============================================================================
-- 0007_shooter_challenges.sql
-- ============================================================================
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

-- ============================================================================
-- 0008_training_results_local_id.sql
-- ============================================================================
-- Schuss Challenge: Training-Result local_id.
-- Additive Migration. Idempotent ausfuehrbar.
--
-- Ziel: Dedup beim Sync lokal erzeugter Trainingsergebnisse ueber
-- training_results.local_id statt ueber notes-Marker.
--
-- 1) Spalte training_results.local_id hinzufuegen (nullbar, Backfill nicht noetig).
-- 2) Partieller UNIQUE-Index auf (user_id, local_id) fuer not-null-Werte -
--    so bleiben bestehende Zeilen ohne local_id erlaubt, neue Inserts mit
--    local_id sind pro User eindeutig.

alter table public.training_results
  add column if not exists local_id text;

create unique index if not exists training_results_user_local_id_uidx
  on public.training_results (user_id, local_id)
  where local_id is not null;

-- ============================================================================
-- 0008_worker_api_rls.sql
-- ============================================================================
-- RLS-Policies für Worker-API-Tables
--
-- Kontext: Diese Tabellen (users, game_sessions, achievements, streaks,
-- feedback, api_profiles, activity_log) werden ausschließlich über den
-- Cloudflare Worker mit dem service_role-Key beschrieben und gelesen.
-- Der service_role-Key umgeht RLS grundsätzlich – die Worker-Funktionalität
-- ist davon unberührt.
--
-- Die Policies hier definieren, was direkte Supabase-Client-Zugriffe
-- (anon / authenticated JWT) dürfen. Das dokumentiert den Intent explizit
-- und verhindert unbeabsichtigten Datenzugriff über die Supabase REST-API.
--
-- Idempotent: Alle Policies werden mit DROP IF EXISTS + CREATE neu angelegt.

-- ─── users ────────────────────────────────────────────────────────────────
-- id ist TEXT (nicht UUID) – auth.uid() muss gecastet werden.
-- Nutzer dürfen ihr eigenes Basisprofil lesen.

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select
  using (auth.uid()::text = id);

-- ─── game_sessions ─────────────────────────────────────────────────────────
-- Nutzer dürfen eigene Spielsitzungen lesen.

drop policy if exists "game_sessions_select_own" on public.game_sessions;
create policy "game_sessions_select_own" on public.game_sessions
  for select
  using (auth.uid()::text = user_id);

-- ─── achievements ──────────────────────────────────────────────────────────
-- Nutzer dürfen eigene Achievements lesen.

drop policy if exists "achievements_select_own" on public.achievements;
create policy "achievements_select_own" on public.achievements
  for select
  using (auth.uid()::text = user_id);

-- ─── streaks ──────────────────────────────────────────────────────────────
-- Nutzer dürfen eigenen Streak lesen.

drop policy if exists "streaks_select_own" on public.streaks;
create policy "streaks_select_own" on public.streaks
  for select
  using (auth.uid()::text = user_id);

-- ─── feedback ─────────────────────────────────────────────────────────────
-- Kein direkter Lesezugriff. Feedback wird über den Worker eingereicht
-- und ist ausschließlich für Admins (über Worker/Admin-Endpoints) sichtbar.
-- Keine Policies = deny by default für anon/authenticated.

-- ─── api_profiles ─────────────────────────────────────────────────────────
-- Öffentliche Profile sind für alle lesbar.
-- Eigenes Profil ist immer lesbar (unabhängig von privacy_settings).

drop policy if exists "api_profiles_select_public_or_own" on public.api_profiles;
create policy "api_profiles_select_public_or_own" on public.api_profiles
  for select
  using (
    privacy_settings = 'public'
    or auth.uid()::text = user_id
  );

-- ─── activity_log ─────────────────────────────────────────────────────────
-- Aktive Einträge der letzten 60 Sekunden sind öffentlich lesbar.
-- Das erlaubt die Live-Aktivitätsanzeige auch bei zukünftigem
-- direktem Supabase-Client-Zugriff (aktuell über Worker).

drop policy if exists "activity_log_select_active_recent" on public.activity_log;
create policy "activity_log_select_active_recent" on public.activity_log
  for select
  using (
    status = 'active'
    and "timestamp" > (extract(epoch from now()) * 1000)::bigint - 60000
  );

-- ============================================================================
-- 0009_friend_photo_duels.sql
-- ============================================================================
-- Friend photo duels: local photo analysis, remote score/state only.

alter table public.async_challenges
  add column if not exists kind text not null default 'async';

alter table public.async_challenges
  add column if not exists xp_reward integer not null default 20;

alter table public.async_challenges
  add column if not exists updated_at timestamptz not null default now();

alter table public.async_challenges
  drop constraint if exists async_challenges_status_check;

alter table public.async_challenges
  add constraint async_challenges_status_check
  check (status in ('pending', 'accepted', 'completed', 'cancelled', 'expired', 'declined'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'async_challenges_kind_check'
      and conrelid = 'public.async_challenges'::regclass
  ) then
    alter table public.async_challenges
      add constraint async_challenges_kind_check
      check (kind in ('async', 'photo_duel'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'async_challenges_xp_reward_check'
      and conrelid = 'public.async_challenges'::regclass
  ) then
    alter table public.async_challenges
      add constraint async_challenges_xp_reward_check
      check (xp_reward >= 0 and xp_reward <= 1000);
  end if;
end $$;

alter table public.async_results
  add column if not exists score_source text not null default 'manual';

alter table public.async_results
  add column if not exists ocr_confidence numeric;

alter table public.async_results
  add column if not exists confirmed_at timestamptz;

create index if not exists idx_async_challenges_photo_opponent_status
  on public.async_challenges(opponent_id, status, updated_at desc)
  where kind = 'photo_duel';

create index if not exists idx_async_challenges_photo_creator_status
  on public.async_challenges(creator_id, status, updated_at desc)
  where kind = 'photo_duel';

drop policy if exists "async_results_insert_own" on public.async_results;
create policy "async_results_insert_own" on public.async_results
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.async_challenges c
      where c.id = challenge_id
        and auth.uid() in (c.creator_id, c.opponent_id)
    )
  );

drop policy if exists "async_results_update_own" on public.async_results;
create policy "async_results_update_own" on public.async_results
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from public.async_challenges c
      where c.id = challenge_id
        and auth.uid() in (c.creator_id, c.opponent_id)
    )
  ) with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.async_challenges c
      where c.id = challenge_id
        and auth.uid() in (c.creator_id, c.opponent_id)
    )
  );

-- ============================================================================
-- 0010_clubs_core.sql
-- ============================================================================
-- Schuss Challenge: Vereinsmodus Sprint 1
-- Core tables, RLS and narrow RPC helpers for club creation/join-by-code.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text,
  code text unique not null check (code ~ '^[A-Z0-9]{2,6}-[A-Z0-9]{3,6}$'),
  location text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table if not exists public.club_activity (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clubs_code_idx
  on public.clubs (code);

create index if not exists club_members_user_idx
  on public.club_members (user_id, joined_at desc);

create index if not exists club_members_club_idx
  on public.club_members (club_id, joined_at asc);

create index if not exists club_activity_club_created_idx
  on public.club_activity (club_id, created_at desc);

create or replace function private.set_clubs_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clubs_set_updated_at on public.clubs;
create trigger clubs_set_updated_at
  before update on public.clubs
  for each row
  execute function private.set_clubs_updated_at();

create or replace function private.add_club_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.club_members (club_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (club_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists clubs_add_owner_membership on public.clubs;
create trigger clubs_add_owner_membership
  after insert on public.clubs
  for each row
  execute function private.add_club_owner_membership();

create or replace function private.make_club_slug(raw_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(raw_name, ''))), '[^a-z0-9]+', '-', 'g'),
      '(^-|-$)',
      '',
      'g'
    ),
    ''
  );
$$;

create or replace function private.normalize_club_code(raw_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(upper(trim(coalesce(raw_code, ''))), '\s+', '', 'g');
$$;

create or replace function private.is_club_member(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.club_members cm
    where cm.club_id = target_club_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function private.is_club_admin(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.club_members cm
    where cm.club_id = target_club_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  );
$$;

create or replace function private.generate_club_code(raw_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_prefix text;
  candidate text;
  attempt integer := 0;
begin
  base_prefix := substring(regexp_replace(upper(coalesce(raw_name, '')), '[^A-Z0-9]', '', 'g') from 1 for 3);
  if char_length(base_prefix) < 2 then
    base_prefix := 'SV';
  end if;
  base_prefix := rpad(base_prefix, 3, 'X');

  loop
    candidate := base_prefix || '-' || lpad(floor(random() * 10000)::integer::text, 4, '0');

    if not exists (select 1 from public.clubs c where c.code = candidate) then
      return candidate;
    end if;

    attempt := attempt + 1;
    if attempt >= 25 then
      candidate := base_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      if not exists (select 1 from public.clubs c where c.code = candidate) then
        return candidate;
      end if;
    end if;

    if attempt >= 50 then
      raise exception 'CLUB_CODE_GENERATION_FAILED' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

create or replace function public.create_club_with_owner(
  club_name text,
  club_location text default null
)
returns table (
  id uuid,
  name text,
  slug text,
  code text,
  location text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  role text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  clean_name text;
  clean_location text;
  next_code text;
  new_club public.clubs%rowtype;
  new_membership public.club_members%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  clean_name := left(trim(coalesce(club_name, '')), 120);
  if char_length(clean_name) < 2 then
    raise exception 'CLUB_NAME_REQUIRED' using errcode = '22023';
  end if;

  clean_location := nullif(left(trim(coalesce(club_location, '')), 120), '');

  for attempt in 1..12 loop
    next_code := private.generate_club_code(clean_name);
    begin
      insert into public.clubs (name, slug, code, location, created_by)
      values (clean_name, private.make_club_slug(clean_name), next_code, clean_location, current_user_id)
      returning * into new_club;
      exit;
    exception when unique_violation then
      if attempt = 12 then
        raise exception 'CLUB_CODE_GENERATION_FAILED' using errcode = 'P0001';
      end if;
    end;
  end loop;

  insert into public.club_members (club_id, user_id, role)
  values (new_club.id, current_user_id, 'owner')
  on conflict (club_id, user_id) do update
    set role = 'owner'
  returning * into new_membership;

  insert into public.club_activity (club_id, user_id, type, payload)
  values (new_club.id, current_user_id, 'club_created', jsonb_build_object('name', new_club.name));

  return query
    select
      new_club.id,
      new_club.name,
      new_club.slug,
      new_club.code,
      new_club.location,
      new_club.created_by,
      new_club.created_at,
      new_club.updated_at,
      new_membership.role,
      new_membership.joined_at;
end;
$$;

create or replace function public.join_club_by_code(join_code text)
returns table (
  id uuid,
  name text,
  slug text,
  code text,
  location text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  role text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_code text;
  compact_code text;
  target_club public.clubs%rowtype;
  membership public.club_members%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  normalized_code := private.normalize_club_code(join_code);
  compact_code := regexp_replace(normalized_code, '-', '', 'g');

  if char_length(compact_code) < 5 then
    raise exception 'CLUB_CODE_INVALID' using errcode = '22023';
  end if;

  select c.*
  into target_club
  from public.clubs c
  where c.code = normalized_code
     or regexp_replace(c.code, '-', '', 'g') = compact_code
  limit 1;

  if target_club.id is null then
    raise exception 'CLUB_CODE_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.club_members (club_id, user_id, role)
  values (target_club.id, current_user_id, 'member')
  on conflict (club_id, user_id) do nothing
  returning * into membership;

  if membership.id is not null then
    insert into public.club_activity (club_id, user_id, type, payload)
    values (target_club.id, current_user_id, 'member_joined', jsonb_build_object('code', target_club.code));
  else
    select cm.*
    into membership
    from public.club_members cm
    where cm.club_id = target_club.id
      and cm.user_id = current_user_id;
  end if;

  return query
    select
      target_club.id,
      target_club.name,
      target_club.slug,
      target_club.code,
      target_club.location,
      target_club.created_by,
      target_club.created_at,
      target_club.updated_at,
      membership.role,
      membership.joined_at;
end;
$$;

grant select, insert, update on public.clubs to authenticated;
grant select on public.club_members to authenticated;
grant select, insert on public.club_activity to authenticated;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon;
revoke execute on function public.create_club_with_owner(text, text) from public, anon;
revoke execute on function public.join_club_by_code(text) from public, anon;

grant execute on function private.is_club_member(uuid) to authenticated;
grant execute on function private.is_club_admin(uuid) to authenticated;
grant execute on function public.create_club_with_owner(text, text) to authenticated;
grant execute on function public.join_club_by_code(text) to authenticated;

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_activity enable row level security;

drop policy if exists "clubs_select_member" on public.clubs;
create policy "clubs_select_member"
  on public.clubs for select
  to authenticated
  using (private.is_club_member(id));

drop policy if exists "clubs_insert_own" on public.clubs;
create policy "clubs_insert_own"
  on public.clubs for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "clubs_update_admin" on public.clubs;
create policy "clubs_update_admin"
  on public.clubs for update
  to authenticated
  using (private.is_club_admin(id))
  with check (private.is_club_admin(id));

drop policy if exists "club_members_select_same_club" on public.club_members;
create policy "club_members_select_same_club"
  on public.club_members for select
  to authenticated
  using (private.is_club_member(club_id));

drop policy if exists "club_activity_select_member" on public.club_activity;
create policy "club_activity_select_member"
  on public.club_activity for select
  to authenticated
  using (private.is_club_member(club_id));

drop policy if exists "club_activity_insert_member_self" on public.club_activity;
create policy "club_activity_insert_member_self"
  on public.club_activity for insert
  to authenticated
  with check (
    private.is_club_member(club_id)
    and (user_id is null or user_id = auth.uid())
  );

-- ============================================================================
-- 0011_club_challenges.sql
-- ============================================================================
-- Schuss Challenge: Vereinsmodus Sprint 2 - Club Challenges (Wochenchallenge)
-- Adds club-only weekly challenges and completion tracking.
-- Builds on 0010_clubs_core.sql (private.is_club_member, private.is_club_admin).

create table if not exists public.club_challenges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  difficulty text not null default 'real' check (difficulty in ('easy', 'real', 'hard', 'elite')),
  discipline text not null check (discipline in ('lg40', 'lg60', 'kk50', 'kk100', 'kk3x20')),
  weapon text,
  required_score integer check (required_score is null or required_score between 0 and 6000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.club_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.club_challenges(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 0 and 6000),
  completed_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index if not exists club_challenges_club_active_idx
  on public.club_challenges (club_id, ends_at desc);

create index if not exists club_challenges_active_window_idx
  on public.club_challenges (club_id, starts_at, ends_at);

create index if not exists club_challenge_completions_challenge_idx
  on public.club_challenge_completions (challenge_id, score desc);

create index if not exists club_challenge_completions_club_user_idx
  on public.club_challenge_completions (club_id, user_id, completed_at desc);

create or replace function public.create_club_challenge(
  p_club_id uuid,
  p_name text,
  p_description text,
  p_difficulty text,
  p_discipline text,
  p_weapon text,
  p_required_score integer,
  p_duration_days integer default 7
)
returns table (
  id uuid,
  club_id uuid,
  name text,
  description text,
  difficulty text,
  discipline text,
  weapon text,
  required_score integer,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  clean_name text;
  clean_description text;
  clean_weapon text;
  duration_days integer;
  new_challenge public.club_challenges%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not private.is_club_admin(p_club_id) then
    raise exception 'CLUB_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  clean_name := left(trim(coalesce(p_name, '')), 120);
  if char_length(clean_name) < 2 then
    raise exception 'CHALLENGE_NAME_REQUIRED' using errcode = '22023';
  end if;

  clean_description := nullif(left(trim(coalesce(p_description, '')), 600), '');
  clean_weapon := nullif(left(trim(coalesce(p_weapon, '')), 80), '');
  duration_days := greatest(1, least(coalesce(p_duration_days, 7), 90));

  insert into public.club_challenges (
    club_id, name, description, difficulty, discipline, weapon,
    required_score, starts_at, ends_at, created_by
  )
  values (
    p_club_id, clean_name, clean_description,
    coalesce(p_difficulty, 'real'),
    p_discipline, clean_weapon, p_required_score,
    now(), now() + (duration_days || ' days')::interval,
    current_user_id
  )
  returning * into new_challenge;

  insert into public.club_activity (club_id, user_id, type, payload)
  values (
    p_club_id, current_user_id, 'challenge_created',
    jsonb_build_object(
      'challenge_id', new_challenge.id,
      'name', new_challenge.name,
      'discipline', new_challenge.discipline,
      'difficulty', new_challenge.difficulty,
      'ends_at', new_challenge.ends_at
    )
  );

  return query
    select
      new_challenge.id, new_challenge.club_id, new_challenge.name,
      new_challenge.description, new_challenge.difficulty, new_challenge.discipline,
      new_challenge.weapon, new_challenge.required_score,
      new_challenge.starts_at, new_challenge.ends_at,
      new_challenge.created_by, new_challenge.created_at;
end;
$$;

create or replace function public.submit_club_challenge_result(
  p_challenge_id uuid,
  p_score integer
)
returns table (
  id uuid,
  challenge_id uuid,
  club_id uuid,
  user_id uuid,
  score integer,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_challenge public.club_challenges%rowtype;
  result_row public.club_challenge_completions%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_score is null or p_score < 0 or p_score > 6000 then
    raise exception 'SCORE_INVALID' using errcode = '22023';
  end if;

  select * into target_challenge
  from public.club_challenges
  where id = p_challenge_id;

  if target_challenge.id is null then
    raise exception 'CHALLENGE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not private.is_club_member(target_challenge.club_id) then
    raise exception 'CLUB_MEMBER_REQUIRED' using errcode = '42501';
  end if;

  if now() < target_challenge.starts_at or now() > target_challenge.ends_at then
    raise exception 'CHALLENGE_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  insert into public.club_challenge_completions (
    challenge_id, club_id, user_id, score
  )
  values (
    target_challenge.id, target_challenge.club_id, current_user_id, p_score
  )
  on conflict (challenge_id, user_id) do update
    set score = greatest(public.club_challenge_completions.score, excluded.score),
        completed_at = case
          when excluded.score > public.club_challenge_completions.score then now()
          else public.club_challenge_completions.completed_at
        end
  returning * into result_row;

  insert into public.club_activity (club_id, user_id, type, payload)
  values (
    target_challenge.club_id, current_user_id, 'challenge_completed',
    jsonb_build_object(
      'challenge_id', target_challenge.id,
      'name', target_challenge.name,
      'score', p_score
    )
  );

  return query
    select result_row.id, result_row.challenge_id, result_row.club_id,
           result_row.user_id, result_row.score, result_row.completed_at;
end;
$$;

grant select on public.club_challenges to authenticated;
grant select on public.club_challenge_completions to authenticated;

revoke execute on function public.create_club_challenge(uuid, text, text, text, text, text, integer, integer) from public, anon;
revoke execute on function public.submit_club_challenge_result(uuid, integer) from public, anon;
grant execute on function public.create_club_challenge(uuid, text, text, text, text, text, integer, integer) to authenticated;
grant execute on function public.submit_club_challenge_result(uuid, integer) to authenticated;

alter table public.club_challenges enable row level security;
alter table public.club_challenge_completions enable row level security;

drop policy if exists "club_challenges_select_member" on public.club_challenges;
create policy "club_challenges_select_member"
  on public.club_challenges for select
  to authenticated
  using (private.is_club_member(club_id));

drop policy if exists "club_challenge_completions_select_member" on public.club_challenge_completions;
create policy "club_challenge_completions_select_member"
  on public.club_challenge_completions for select
  to authenticated
  using (private.is_club_member(club_id));

-- ============================================================================
-- 0012_club_duel_results.sql
-- ============================================================================
-- Schuss Challenge: Vereinsmodus Sprint 2 - Club Duel Results
-- Tracks duel victories (friend, photo, bot) within a club for leaderboard wins.
-- Builds on 0010_clubs_core.sql (private.is_club_member).

create table if not exists public.club_duel_results (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  source_id text,
  winner_id uuid not null references auth.users(id) on delete cascade,
  loser_id uuid references auth.users(id) on delete set null,
  duel_type text not null check (duel_type in ('friend_async', 'photo', 'bot_fight')),
  discipline text not null check (discipline in ('lg40', 'lg60', 'kk50', 'kk100', 'kk3x20')),
  winner_score integer check (winner_score is null or winner_score between 0 and 6000),
  loser_score integer check (loser_score is null or loser_score between 0 and 6000),
  created_at timestamptz not null default now()
);

create index if not exists club_duel_results_club_winner_idx
  on public.club_duel_results (club_id, winner_id, created_at desc);

create index if not exists club_duel_results_club_recent_idx
  on public.club_duel_results (club_id, created_at desc);

-- Prevents duplicate inserts when both participants record the same duel.
create unique index if not exists club_duel_results_source_unique_idx
  on public.club_duel_results (club_id, duel_type, source_id)
  where source_id is not null;

create or replace function public.record_club_duel(
  p_club_id uuid,
  p_winner_id uuid,
  p_loser_id uuid,
  p_duel_type text,
  p_discipline text,
  p_winner_score integer default null,
  p_loser_score integer default null,
  p_source_id text default null
)
returns table (
  id uuid,
  club_id uuid,
  source_id text,
  winner_id uuid,
  loser_id uuid,
  duel_type text,
  discipline text,
  winner_score integer,
  loser_score integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_row public.club_duel_results%rowtype;
  clean_source text;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  -- Caller must be one of the participants (or club admin)
  if current_user_id <> p_winner_id
     and current_user_id <> p_loser_id
     and not private.is_club_admin(p_club_id) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  -- Winner must be a club member
  if not exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_winner_id
  ) then
    raise exception 'WINNER_NOT_CLUB_MEMBER' using errcode = '42501';
  end if;

  clean_source := nullif(left(trim(coalesce(p_source_id, '')), 120), '');

  -- Dedup: if a row with the same (club, duel_type, source_id) already exists,
  -- return it instead of inserting a duplicate. Both participants may call this
  -- when they each open the result screen.
  if clean_source is not null then
    select * into new_row
    from public.club_duel_results
    where club_id = p_club_id
      and duel_type = p_duel_type
      and source_id = clean_source
    limit 1;

    if new_row.id is not null then
      return query
        select new_row.id, new_row.club_id, new_row.source_id,
               new_row.winner_id, new_row.loser_id,
               new_row.duel_type, new_row.discipline,
               new_row.winner_score, new_row.loser_score, new_row.created_at;
      return;
    end if;
  end if;

  insert into public.club_duel_results (
    club_id, source_id, winner_id, loser_id, duel_type, discipline,
    winner_score, loser_score
  )
  values (
    p_club_id, clean_source, p_winner_id, p_loser_id, p_duel_type, p_discipline,
    p_winner_score, p_loser_score
  )
  returning * into new_row;

  insert into public.club_activity (club_id, user_id, type, payload)
  values (
    p_club_id, p_winner_id, 'duel_won',
    jsonb_build_object(
      'duel_id', new_row.id,
      'duel_type', p_duel_type,
      'discipline', p_discipline,
      'winner_score', p_winner_score,
      'loser_score', p_loser_score
    )
  );

  return query
    select new_row.id, new_row.club_id, new_row.source_id,
           new_row.winner_id, new_row.loser_id,
           new_row.duel_type, new_row.discipline,
           new_row.winner_score, new_row.loser_score, new_row.created_at;
end;
$$;

create or replace function public.get_club_leaderboard_filtered(
  p_club_id uuid,
  p_discipline text default 'all',
  p_time_range text default 'alltime'
)
returns table (
  user_id uuid,
  best_score numeric,
  session_count integer,
  duel_wins integer,
  last_session timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  range_start timestamptz;
begin
  if not private.is_club_member(p_club_id) then
    raise exception 'CLUB_MEMBER_REQUIRED' using errcode = '42501';
  end if;

  range_start := case p_time_range
    when 'week' then now() - interval '7 days'
    when 'month' then now() - interval '30 days'
    when 'season' then date_trunc('year', now())
    else '-infinity'::timestamptz
  end;

  return query
    with members as (
      select cm.user_id
      from public.club_members cm
      where cm.club_id = p_club_id
    ),
    scoreboard as (
      -- leaderboard_entries already aggregates per-result rows with score/discipline/created_at,
      -- which avoids needing to join training_results to training_sessions for discipline.
      select
        le.user_id,
        max(le.score) as best_score,
        count(*)::integer as session_count,
        max(le.created_at) as last_session
      from public.leaderboard_entries le
      where le.user_id in (select user_id from members)
        and le.created_at >= range_start
        and (p_discipline = 'all' or le.discipline = p_discipline)
      group by le.user_id
    ),
    wins as (
      select
        cd.winner_id as user_id,
        count(*)::integer as duel_wins
      from public.club_duel_results cd
      where cd.club_id = p_club_id
        and cd.created_at >= range_start
        and (p_discipline = 'all' or cd.discipline = p_discipline)
      group by cd.winner_id
    )
    select
      m.user_id,
      coalesce(s.best_score, 0)::numeric as best_score,
      coalesce(s.session_count, 0)::integer as session_count,
      coalesce(w.duel_wins, 0)::integer as duel_wins,
      s.last_session
    from members m
    left join scoreboard s on s.user_id = m.user_id
    left join wins w on w.user_id = m.user_id
    order by best_score desc, duel_wins desc, session_count desc;
end;
$$;

grant select on public.club_duel_results to authenticated;

revoke execute on function public.record_club_duel(uuid, uuid, uuid, text, text, integer, integer, text) from public, anon;
revoke execute on function public.get_club_leaderboard_filtered(uuid, text, text) from public, anon;
grant execute on function public.record_club_duel(uuid, uuid, uuid, text, text, integer, integer, text) to authenticated;
grant execute on function public.get_club_leaderboard_filtered(uuid, text, text) to authenticated;

alter table public.club_duel_results enable row level security;

drop policy if exists "club_duel_results_select_member" on public.club_duel_results;
create policy "club_duel_results_select_member"
  on public.club_duel_results for select
  to authenticated
  using (private.is_club_member(club_id));
