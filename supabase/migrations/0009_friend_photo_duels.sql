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
