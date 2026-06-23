-- Migrate best_stats column from TEXT to JSONB.
-- Existing rows that are not valid JSON are set to NULL rather than failing.
alter table public.api_profiles
  alter column best_stats type jsonb
  using (
    case
      when best_stats is null or trim(best_stats) = '' then null
      else best_stats::jsonb
    end
  );
