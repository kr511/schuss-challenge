-- Normalize activity_log.timestamp to INTEGER epoch-milliseconds.
-- Previous schema used TIMESTAMP, while runtime writes Date.now() numbers.

CREATE TABLE IF NOT EXISTS activity_log_v2 (
  user_id TEXT PRIMARY KEY,
  discipline TEXT,
  difficulty TEXT,
  timestamp INTEGER NOT NULL,
  status TEXT
);

INSERT INTO activity_log_v2 (user_id, discipline, difficulty, timestamp, status)
SELECT
  user_id,
  discipline,
  difficulty,
  CASE
    WHEN typeof(timestamp) = 'integer' THEN CAST(timestamp AS INTEGER)
    WHEN typeof(timestamp) = 'real' THEN CAST(timestamp AS INTEGER)
    WHEN typeof(timestamp) = 'text' THEN CAST(strftime('%s', timestamp) AS INTEGER) * 1000
    ELSE CAST(timestamp AS INTEGER)
  END AS timestamp_ms,
  status
FROM activity_log;

DROP TABLE activity_log;
ALTER TABLE activity_log_v2 RENAME TO activity_log;

CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);
