-- Social schema indexes
-- Primary source: supabase/schema-social.sql

create index if not exists idx_friend_codes_code on public.friend_codes(code);
create index if not exists idx_friend_requests_to_status on public.friend_requests(to_user_id, status);
create index if not exists idx_friend_requests_from_status on public.friend_requests(from_user_id, status);
create index if not exists idx_friends_user on public.friends(user_id);
create index if not exists idx_online_status_last_seen on public.online_status(last_seen desc);
create index if not exists idx_async_challenges_opponent_status on public.async_challenges(opponent_id, status);
create index if not exists idx_async_challenges_creator_status on public.async_challenges(creator_id, status);
