-- Add discipline column to game_sessions so leaderboard can filter by discipline.
-- Without this column, all discipline scores are compared against each other,
-- making the leaderboard meaningless for a multi-discipline app.

alter table public.game_sessions
  add column if not exists discipline text not null default '';

-- Index for discipline-scoped leaderboard queries.
create index if not exists idx_sessions_discipline_score
  on public.game_sessions(discipline, score desc)
  where discipline <> '';
