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
