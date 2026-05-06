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
