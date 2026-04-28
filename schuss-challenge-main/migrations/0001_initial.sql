CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  created_at INTEGER
);

CREATE TABLE game_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  mode TEXT,           -- 'standard' | 'challenge' | 'bot_fight' | 'timed'
  score INTEGER,
  shots_fired INTEGER,
  duration_seconds INTEGER,
  played_at INTEGER
);

CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  type TEXT,
  unlocked_at INTEGER
);

CREATE TABLE streaks (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_played_date TEXT  -- ISO date string YYYY-MM-DD
);

CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  user_email TEXT,
  feedback_type TEXT,  -- 'bug' | 'feature_request' | 'general'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at INTEGER,
  status TEXT DEFAULT 'pending'  -- 'pending' | 'sent' | 'failed'
);

CREATE INDEX idx_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_sessions_played_at ON game_sessions(played_at);
CREATE INDEX idx_achievements_user ON achievements(user_id);
CREATE INDEX idx_feedback_sent_at ON feedback(sent_at);
CREATE INDEX idx_feedback_status ON feedback(status);
