-- Social schema RLS and policies
-- Primary source: supabase/schema-social.sql

alter table public.profiles enable row level security;
alter table public.friend_codes enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;
alter table public.online_status enable row level security;
alter table public.async_challenges enable row level security;
alter table public.async_results enable row level security;

-- Profiles
 drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

 drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

 drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Friend codes
 drop policy if exists "friend_codes_select_all" on public.friend_codes;
create policy "friend_codes_select_all" on public.friend_codes for select using (true);

 drop policy if exists "friend_codes_insert_own" on public.friend_codes;
create policy "friend_codes_insert_own" on public.friend_codes for insert with check (auth.uid() = user_id);

 drop policy if exists "friend_codes_update_own" on public.friend_codes;
create policy "friend_codes_update_own" on public.friend_codes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friend requests
 drop policy if exists "friend_requests_select_related" on public.friend_requests;
create policy "friend_requests_select_related" on public.friend_requests for select using (auth.uid() in (from_user_id, to_user_id));

 drop policy if exists "friend_requests_insert_from_self" on public.friend_requests;
create policy "friend_requests_insert_from_self" on public.friend_requests for insert with check (auth.uid() = from_user_id);

 drop policy if exists "friend_requests_update_related" on public.friend_requests;
create policy "friend_requests_update_related" on public.friend_requests for update using (auth.uid() in (from_user_id, to_user_id)) with check (auth.uid() in (from_user_id, to_user_id));

-- Friends
 drop policy if exists "friends_select_own" on public.friends;
create policy "friends_select_own" on public.friends for select using (auth.uid() = user_id or auth.uid() = friend_user_id);

 drop policy if exists "friends_insert_own" on public.friends;
create policy "friends_insert_own" on public.friends for insert with check (auth.uid() = user_id);

 drop policy if exists "friends_delete_own" on public.friends;
create policy "friends_delete_own" on public.friends for delete using (auth.uid() = user_id);

-- Online status
 drop policy if exists "online_status_select_all" on public.online_status;
create policy "online_status_select_all" on public.online_status for select using (true);

 drop policy if exists "online_status_upsert_own" on public.online_status;
create policy "online_status_upsert_own" on public.online_status for insert with check (auth.uid() = user_id);

 drop policy if exists "online_status_update_own" on public.online_status;
create policy "online_status_update_own" on public.online_status for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Challenges/results
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
