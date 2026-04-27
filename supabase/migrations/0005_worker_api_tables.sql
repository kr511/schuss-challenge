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
