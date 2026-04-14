-- Migration: Social- & Profil-System
-- Erstellt für Profile und Live-Aktivitäts-Tracking

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  privacy_settings TEXT DEFAULT 'private',
  best_stats TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
  user_id TEXT PRIMARY KEY,
  discipline TEXT,
  difficulty TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT
);
