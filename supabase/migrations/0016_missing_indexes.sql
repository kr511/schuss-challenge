-- Indexes missing from earlier migrations, identified via query-pattern audit.

-- Friend search: friends-system.js does OR(username.eq, display_name.ilike)
create index if not exists idx_profiles_username     on public.profiles(username);
create index if not exists idx_profiles_display_name on public.profiles(display_name);

-- async_results: challenge result ordering by submission time
create index if not exists idx_async_results_challenge_submitted
  on public.async_results(challenge_id, submitted_at desc);

-- api_profiles: public profile lookup by public_id (UNIQUE exists, index missing)
create index if not exists idx_api_profiles_public_id on public.api_profiles(public_id);

-- shooter_challenges: listing active challenges ordered by creation date
create index if not exists idx_shooter_challenges_active
  on public.shooter_challenges(is_active, created_at desc)
  where is_active = true;
