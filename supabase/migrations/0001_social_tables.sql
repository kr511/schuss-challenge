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
