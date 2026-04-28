-- Supabase advisor cleanup
--
-- Addresses findings from `mcp__claude_ai_Supabase__get_advisors`:
--   * function_search_path_mutable on get_leaderboard / get_user_stats
--   * upsert_profile referenced wrong table columns (profiles vs api_profiles) — drop, unused
--   * anon EXECUTE on auth-only SECURITY DEFINER RPCs (touch_my_profile,
--     accept_friend_request, remove_friend) — keep get_leaderboard/get_user_stats public
--   * auth_rls_initplan: rewrap auth.uid() with (select auth.uid()) so it is
--     evaluated once per query instead of once per row
--   * unindexed_foreign_keys on async_results.user_id, friends.friend_user_id,
--     friends.request_id
--   * duplicate_index on feedback (idx_feedback_updated vs idx_feedback_updated_at)

-- ── Orphan / broken function ─────────────────────────────────────────────
-- upsert_profile inserted into `profiles` (uuid id) using api_profiles
-- columns; never called from JS or worker. Dropping it keeps RPC surface
-- minimal and removes one search_path warning.
drop function if exists public.upsert_profile(text, text, text, text);

-- ── Function search_path hardening ──────────────────────────────────────
create or replace function public.get_leaderboard(p_mode text, p_start_at bigint default null)
returns table(user_id text, display_name text, best_score bigint, games_played bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    gs.user_id,
    coalesce(u.display_name, gs.user_id)::text as display_name,
    max(gs.score)::bigint                       as best_score,
    count(*)::bigint                            as games_played
  from public.game_sessions gs
  left join public.users u on u.id = gs.user_id
  where gs.mode = p_mode
    and (p_start_at is null or gs.played_at >= p_start_at)
  group by gs.user_id, u.display_name
  order by best_score desc, games_played desc
  limit 20;
end;
$$;

create or replace function public.get_user_stats(p_user_id text)
returns table(total_games bigint, best_score bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    count(*)::bigint                  as total_games,
    coalesce(max(score), 0)::bigint   as best_score
  from public.game_sessions
  where user_id = p_user_id;
end;
$$;

-- ── EXECUTE permissions on SECURITY DEFINER RPCs ───────────────────────
-- Lock down auth-only RPCs to authenticated role; the functions also
-- guard with `if auth.uid() is null then raise exception`, but revoking
-- anon execute removes them from the anon-callable surface entirely.
revoke execute on function public.touch_my_profile(text)        from public, anon;
revoke execute on function public.accept_friend_request(uuid)   from public, anon;
revoke execute on function public.remove_friend(uuid)           from public, anon;
grant  execute on function public.touch_my_profile(text)        to authenticated;
grant  execute on function public.accept_friend_request(uuid)   to authenticated;
grant  execute on function public.remove_friend(uuid)           to authenticated;

-- get_leaderboard / get_user_stats stay anon-callable (public read paths).
grant execute on function public.get_leaderboard(text, bigint) to anon, authenticated;
grant execute on function public.get_user_stats(text)          to anon, authenticated;

-- ── RLS: rewrap auth.uid() in (select …) for init-plan caching ─────────
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "friend_codes_insert_own" on public.friend_codes;
create policy "friend_codes_insert_own"
  on public.friend_codes for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "friend_codes_update_own" on public.friend_codes;
create policy "friend_codes_update_own"
  on public.friend_codes for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "friend_requests_select_related" on public.friend_requests;
create policy "friend_requests_select_related"
  on public.friend_requests for select
  using ((select auth.uid()) in (from_user_id, to_user_id));

drop policy if exists "friend_requests_insert_from_self" on public.friend_requests;
create policy "friend_requests_insert_from_self"
  on public.friend_requests for insert
  with check ((select auth.uid()) = from_user_id);

drop policy if exists "friend_requests_update_related" on public.friend_requests;
create policy "friend_requests_update_related"
  on public.friend_requests for update
  using ((select auth.uid()) in (from_user_id, to_user_id))
  with check ((select auth.uid()) in (from_user_id, to_user_id));

drop policy if exists "friends_select_own" on public.friends;
create policy "friends_select_own"
  on public.friends for select
  using ((select auth.uid()) = user_id or (select auth.uid()) = friend_user_id);

drop policy if exists "friends_insert_own" on public.friends;
create policy "friends_insert_own"
  on public.friends for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "friends_delete_own" on public.friends;
create policy "friends_delete_own"
  on public.friends for delete
  using ((select auth.uid()) = user_id);

-- Production also carried a stray `online_status_insert_own` INSERT policy
-- (un-wrapped) alongside the upsert variant. Drop it so we have a single
-- INSERT policy.
drop policy if exists "online_status_insert_own" on public.online_status;

drop policy if exists "online_status_upsert_own" on public.online_status;
create policy "online_status_upsert_own"
  on public.online_status for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "online_status_update_own" on public.online_status;
create policy "online_status_update_own"
  on public.online_status for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "async_challenges_select_related" on public.async_challenges;
create policy "async_challenges_select_related"
  on public.async_challenges for select
  using ((select auth.uid()) = creator_id or (select auth.uid()) = opponent_id);

drop policy if exists "async_challenges_insert_creator" on public.async_challenges;
create policy "async_challenges_insert_creator"
  on public.async_challenges for insert
  with check ((select auth.uid()) = creator_id);

drop policy if exists "async_challenges_update_related" on public.async_challenges;
create policy "async_challenges_update_related"
  on public.async_challenges for update
  using ((select auth.uid()) = creator_id or (select auth.uid()) = opponent_id)
  with check ((select auth.uid()) = creator_id or (select auth.uid()) = opponent_id);

drop policy if exists "async_results_select_related" on public.async_results;
create policy "async_results_select_related"
  on public.async_results for select
  using (
    exists (
      select 1 from public.async_challenges c
      where c.id = challenge_id
        and ((select auth.uid()) = c.creator_id or (select auth.uid()) = c.opponent_id)
    )
  );

drop policy if exists "async_results_insert_own" on public.async_results;
create policy "async_results_insert_own"
  on public.async_results for insert
  with check ((select auth.uid()) = user_id);

-- ── Missing FK indexes ─────────────────────────────────────────────────
create index if not exists idx_async_results_user_id   on public.async_results(user_id);
create index if not exists idx_friends_friend_user_id  on public.friends(friend_user_id);
create index if not exists idx_friends_request_id      on public.friends(request_id);

-- ── Duplicate index on feedback ───────────────────────────────────────
-- Two identical indexes on feedback.updated_at; keep idx_feedback_updated_at
-- (the canonical name from migration 0005) and drop the older alias.
drop index if exists public.idx_feedback_updated;
