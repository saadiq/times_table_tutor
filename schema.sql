-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL,
  color         TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  last_active   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active DESC);

-- Learning progress (one row per fact per profile)
CREATE TABLE IF NOT EXISTS fact_progress (
  profile_id        TEXT NOT NULL,
  fact              TEXT NOT NULL,
  confidence        TEXT NOT NULL DEFAULT 'new',
  correct_count     INTEGER NOT NULL DEFAULT 0,
  incorrect_count   INTEGER NOT NULL DEFAULT 0,
  last_seen         INTEGER,
  last_correct      INTEGER,
  recent_attempts   TEXT,
  preferred_strategy TEXT,
  PRIMARY KEY (profile_id, fact),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fact_progress_profile ON fact_progress(profile_id);

-- Garden items
CREATE TABLE IF NOT EXISTS garden_items (
  id            TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL,
  item_id       TEXT NOT NULL,
  type          TEXT NOT NULL,
  position_x    REAL NOT NULL,
  position_y    REAL NOT NULL,
  earned_for    TEXT,
  earned_at     INTEGER,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_garden_items_profile ON garden_items(profile_id);

-- Profile stats (coins, themes)
CREATE TABLE IF NOT EXISTS profile_stats (
  profile_id        TEXT PRIMARY KEY,
  coins             INTEGER NOT NULL DEFAULT 0,
  unlocked_themes   TEXT NOT NULL DEFAULT '["flower"]',
  current_theme     TEXT NOT NULL DEFAULT 'flower',
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
