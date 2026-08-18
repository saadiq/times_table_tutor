-- Profiles table. Names are the child's whole identity in the picker, so they
-- are unique case-insensitively — the real guard behind both write endpoints'
-- friendlier pre-checks. It rides on the column rather than a standalone
-- CREATE UNIQUE INDEX because `db:migrate` replays this whole file in one
-- transaction: a database holding duplicate names would fail the index and
-- roll back every other statement with it, so no later CREATE TABLE would ever
-- reach it. IF NOT EXISTS skips the table on those databases instead, and
-- migrations/0002 is what brings them up to the same rule, by hand.
CREATE TABLE IF NOT EXISTS profiles (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL COLLATE NOCASE UNIQUE,
  icon          TEXT NOT NULL,
  color         TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  last_active   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active DESC);

-- Learning progress (one row per fact per profile; fact keys are unique per
-- curriculum — multiply "7x8", divide "56÷7" — so the PK needs no change)
CREATE TABLE IF NOT EXISTS fact_progress (
  profile_id        TEXT NOT NULL,
  fact              TEXT NOT NULL,
  curriculum        TEXT NOT NULL DEFAULT 'multiply',
  confidence        TEXT NOT NULL DEFAULT 'new',
  correct_count     INTEGER NOT NULL DEFAULT 0,
  incorrect_count   INTEGER NOT NULL DEFAULT 0,
  skipped_count     INTEGER NOT NULL DEFAULT 0,
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

-- Completed sessions, counted per curriculum (they drive that curriculum's
-- scene warmth, so a multiply session must never warm the divide scene). A new
-- table rather than a profile_stats column so `db:migrate` (which replays this
-- file, all CREATE TABLE IF NOT EXISTS) can add it to an existing database.
CREATE TABLE IF NOT EXISTS profile_sessions (
  profile_id        TEXT NOT NULL,
  curriculum        TEXT NOT NULL DEFAULT 'multiply',
  sessions_completed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, curriculum),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Attempt history (for progress tracking)
CREATE TABLE IF NOT EXISTS attempts (
  id              TEXT PRIMARY KEY,
  profile_id      TEXT NOT NULL,
  fact_key        TEXT NOT NULL,
  timestamp       INTEGER NOT NULL,
  correct         INTEGER NOT NULL,
  response_time_ms INTEGER,
  input_method    TEXT,
  hint_shown      INTEGER NOT NULL DEFAULT 0,
  -- Time to the first digit tap (NULL = legacy row); see migrations/0005.
  first_input_ms  INTEGER,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attempts_profile_timestamp
  ON attempts(profile_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_attempts_profile_date
  ON attempts(profile_id, timestamp);
