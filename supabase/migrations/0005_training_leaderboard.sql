-- Schuss Challenge: Training + Leaderboard foundation
-- Runs after the social schema migrations.

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discipline text not null default '',
  weapon text not null default '',
  distance integer,
  shots integer not null default 0 check (shots >= 0),
  focus text not null default '',
  mode text not null default 'training',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.training_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.training_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric,
  average numeric,
  best_series numeric,
  worst_series numeric,
  group_size numeric,
  trend numeric,
  analysis_confidence numeric check (analysis_confidence is null or (analysis_confidence >= 0 and analysis_confidence <= 1)),
  manual_corrected boolean not null default false,
  photo_used boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default 'Spieler',
  score numeric not null default 0,
  xp integer not null default 0,
  weapon text not null default '',
  discipline text not null default '',
  shots integer not null default 0 check (shots >= 0),
  source text not null default 'training',
  created_at timestamptz not null default now()
);

create index if not exists training_sessions_user_created_idx
  on public.training_sessions (user_id, created_at desc);

create index if not exists training_results_user_created_idx
  on public.training_results (user_id, created_at desc);

create index if not exists training_results_session_idx
  on public.training_results (session_id);

create index if not exists leaderboard_entries_score_idx
  on public.leaderboard_entries (score desc, created_at desc);

create index if not exists leaderboard_entries_user_created_idx
  on public.leaderboard_entries (user_id, created_at desc);

alter table public.training_sessions enable row level security;
alter table public.training_results enable row level security;
alter table public.leaderboard_entries enable row level security;

-- Training sessions: users manage only their own sessions.
do $$ begin
  create policy "training_sessions_select_own"
    on public.training_sessions for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_sessions_insert_own"
    on public.training_sessions for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_sessions_update_own"
    on public.training_sessions for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_sessions_delete_own"
    on public.training_sessions for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Training results: users manage only their own results.
do $$ begin
  create policy "training_results_select_own"
    on public.training_results for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_results_insert_own"
    on public.training_results for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_results_update_own"
    on public.training_results for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "training_results_delete_own"
    on public.training_results for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Leaderboard entries are public-readable, but users can only write their own entries.
do $$ begin
  create policy "leaderboard_entries_select_public"
    on public.leaderboard_entries for select
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "leaderboard_entries_insert_own"
    on public.leaderboard_entries for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "leaderboard_entries_update_own"
    on public.leaderboard_entries for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "leaderboard_entries_delete_own"
    on public.leaderboard_entries for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
