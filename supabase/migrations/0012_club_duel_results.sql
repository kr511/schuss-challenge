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
