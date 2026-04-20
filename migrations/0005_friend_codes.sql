-- Phase 3: Friend-Code Persistenz + Such-Indizes.
-- B20: `friend_code` in profiles, damit /api/friends/search den Code direkt
--      zurückliefern kann (Firebase `user_codes_v1` bleibt Source of Truth, D1
--      cached den Code beim Profil-Sync).
-- B21: Indizes für Name-Suche (LIKE) und Code-Lookup.

ALTER TABLE profiles ADD COLUMN friend_code TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_friend_code
  ON profiles(friend_code);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name
  ON profiles(display_name);
