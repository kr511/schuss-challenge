-- Schuss Challenge Supabase setup bundle
-- Generated from supabase/migrations.
-- Run this in Supabase Dashboard -> SQL Editor -> New query.
-- Generated at: 2026-04-29T10:53:16.526Z

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

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "app_admins_select_self" on public.app_admins;
create policy "app_admins_select_self" on public.app_admins
  for select using (auth.uid() = user_id);

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
-- 0008_worker_api_rls.sql
-- ============================================================================
-- RLS-Policies für Worker-API-Tables.
-- Der Cloudflare Worker nutzt den service_role-Key, der RLS grundsätzlich
-- umgeht. Diese Policies definieren, was direkten Supabase-Client-Zugriffen
-- (anon / authenticated JWT) erlaubt ist.

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select
  using (auth.uid()::text = id);

drop policy if exists "game_sessions_select_own" on public.game_sessions;
create policy "game_sessions_select_own" on public.game_sessions
  for select
  using (auth.uid()::text = user_id);

drop policy if exists "achievements_select_own" on public.achievements;
create policy "achievements_select_own" on public.achievements
  for select
  using (auth.uid()::text = user_id);

drop policy if exists "streaks_select_own" on public.streaks;
create policy "streaks_select_own" on public.streaks
  for select
  using (auth.uid()::text = user_id);

drop policy if exists "api_profiles_select_public_or_own" on public.api_profiles;
create policy "api_profiles_select_public_or_own" on public.api_profiles
  for select
  using (
    privacy_settings = 'public'
    or auth.uid()::text = user_id
  );

drop policy if exists "activity_log_select_active_recent" on public.activity_log;
create policy "activity_log_select_active_recent" on public.activity_log
  for select
  using (
    status = 'active'
    and "timestamp" > (extract(epoch from now()) * 1000)::bigint - 60000
  );
