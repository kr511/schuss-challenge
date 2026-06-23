-- Auto-populate leaderboard_entries when a training result is saved.
-- Previously the table was never written to automatically, making the
-- leaderboard always empty unless the worker or client explicitly posted.

create or replace function public.sync_training_to_leaderboard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_discipline text;
  v_weapon text;
begin
  -- Skip zero / null scores — not useful in the leaderboard.
  if NEW.score is null or NEW.score <= 0 then
    return NEW;
  end if;

  -- Resolve display name from profiles.
  select coalesce(display_name, username, 'Spieler')
    into v_username
    from public.profiles
   where id = NEW.user_id;

  -- Resolve discipline and weapon from the training session (may be NULL if
  -- the result was submitted without a session, e.g. a manual entry).
  if NEW.session_id is not null then
    select discipline, weapon
      into v_discipline, v_weapon
      from public.training_sessions
     where id = NEW.session_id;
  end if;

  insert into public.leaderboard_entries
    (user_id, username, score, xp, weapon, discipline, shots, source, created_at)
  values (
    NEW.user_id,
    coalesce(v_username, 'Spieler'),
    NEW.score,
    0,
    coalesce(v_weapon, ''),
    coalesce(v_discipline, ''),
    0,
    'training',
    coalesce(NEW.created_at, now())
  );

  return NEW;
end;
$$;

drop trigger if exists leaderboard_sync_training on public.training_results;
create trigger leaderboard_sync_training
  after insert on public.training_results
  for each row
  execute function public.sync_training_to_leaderboard();
