-- Auto-update user_progress when a challenge_completion is inserted.
-- Previously user_progress totals were never auto-updated; values stayed at 0.

create or replace function public.sync_completion_to_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration  integer;
  v_is_dry    boolean;
  v_is_live   boolean;
begin
  -- Look up challenge metadata for time tracking.
  select duration_minutes, is_dry_fire, is_live_fire
    into v_duration, v_is_dry, v_is_live
    from public.shooter_challenges
   where id = NEW.challenge_id;

  insert into public.user_progress
    (user_id, total_completions, total_dry_fire_minutes, total_live_fire_minutes,
     last_completion_at, updated_at)
  values (
    NEW.user_id,
    1,
    case when coalesce(v_is_dry, false) then coalesce(v_duration, 0) else 0 end,
    case when coalesce(v_is_live, false) then coalesce(v_duration, 0) else 0 end,
    coalesce(NEW.completed_at, now()),
    now()
  )
  on conflict (user_id) do update set
    total_completions     = user_progress.total_completions + 1,
    total_dry_fire_minutes = user_progress.total_dry_fire_minutes
      + case when coalesce(v_is_dry, false) then coalesce(v_duration, 0) else 0 end,
    total_live_fire_minutes = user_progress.total_live_fire_minutes
      + case when coalesce(v_is_live, false) then coalesce(v_duration, 0) else 0 end,
    last_completion_at    = greatest(user_progress.last_completion_at,
                                     coalesce(NEW.completed_at, now())),
    updated_at            = now();

  return NEW;
end;
$$;

drop trigger if exists progress_sync_completion on public.challenge_completions;
create trigger progress_sync_completion
  after insert on public.challenge_completions
  for each row
  execute function public.sync_completion_to_progress();
