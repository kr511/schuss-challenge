-- Schussduell Supabase Social Schema (PRIMARY)
--
-- This is the canonical, all-in-one schema for Social/Friends/Challenges.
-- If you prefer sequential migrations, apply the files in supabase/migrations/
-- in numeric order (0001 -> 0004).

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

create index if not exists idx_friend_codes_code on public.friend_codes(code);
create index if not exists idx_friend_requests_to_status on public.friend_requests(to_user_id, status);
create index if not exists idx_friend_requests_from_status on public.friend_requests(from_user_id, status);
create index if not exists idx_friends_user on public.friends(user_id);
create index if not exists idx_online_status_last_seen on public.online_status(last_seen desc);
create index if not exists idx_async_challenges_opponent_status on public.async_challenges(opponent_id, status);
create index if not exists idx_async_challenges_creator_status on public.async_challenges(creator_id, status);

alter table public.profiles enable row level security;
alter table public.friend_codes enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;
alter table public.online_status enable row level security;
alter table public.async_challenges enable row level security;
alter table public.async_results enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "friend_codes_select_all" on public.friend_codes;
create policy "friend_codes_select_all" on public.friend_codes for select using (true);
drop policy if exists "friend_codes_insert_own" on public.friend_codes;
create policy "friend_codes_insert_own" on public.friend_codes for insert with check (auth.uid() = user_id);
drop policy if exists "friend_codes_update_own" on public.friend_codes;
create policy "friend_codes_update_own" on public.friend_codes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "friend_requests_select_related" on public.friend_requests;
create policy "friend_requests_select_related" on public.friend_requests for select using (auth.uid() in (from_user_id, to_user_id));
drop policy if exists "friend_requests_insert_from_self" on public.friend_requests;
create policy "friend_requests_insert_from_self" on public.friend_requests for insert with check (auth.uid() = from_user_id);
drop policy if exists "friend_requests_update_related" on public.friend_requests;
create policy "friend_requests_update_related" on public.friend_requests for update using (auth.uid() in (from_user_id, to_user_id)) with check (auth.uid() in (from_user_id, to_user_id));

drop policy if exists "friends_select_own" on public.friends;
create policy "friends_select_own" on public.friends for select using (auth.uid() = user_id or auth.uid() = friend_user_id);
drop policy if exists "friends_insert_own" on public.friends;
create policy "friends_insert_own" on public.friends for insert with check (auth.uid() = user_id);
drop policy if exists "friends_delete_own" on public.friends;
create policy "friends_delete_own" on public.friends for delete using (auth.uid() = user_id);

drop policy if exists "online_status_select_all" on public.online_status;
create policy "online_status_select_all" on public.online_status for select using (true);
drop policy if exists "online_status_upsert_own" on public.online_status;
create policy "online_status_upsert_own" on public.online_status for insert with check (auth.uid() = user_id);
drop policy if exists "online_status_update_own" on public.online_status;
create policy "online_status_update_own" on public.online_status for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
