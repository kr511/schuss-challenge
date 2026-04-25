-- LEGACY (do not apply)
-- Superseded by the canonical social schema in:
--   * supabase/schema-social.sql
--   * supabase/migrations/0001_social_tables.sql
--   * supabase/migrations/0002_social_indexes.sql
--   * supabase/migrations/0003_social_rls.sql
--   * supabase/migrations/0004_social_rpc.sql
--
-- This file originally created an older Firebase-era model with incompatible
-- columns (for example profiles.user_id/public_id), which no longer matches
-- the frontend Supabase adapter.

do $$
begin
  raise notice 'migrations/0002_social.sql is legacy and intentionally a no-op';
end
$$;
