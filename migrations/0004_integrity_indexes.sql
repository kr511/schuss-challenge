-- Phase 2: data integrity + query performance.
-- B13: Prevent duplicate achievement unlocks at the DB level so the existence
--      check in unlockAchievement() is no longer vulnerable to races.
-- B14: Speed up getLiveActivity()'s WHERE status = 'active' AND timestamp > ?.

CREATE UNIQUE INDEX IF NOT EXISTS uq_achievements_user_type
  ON achievements(user_id, type);

CREATE INDEX IF NOT EXISTS idx_activity_log_status_ts
  ON activity_log(status, timestamp);
