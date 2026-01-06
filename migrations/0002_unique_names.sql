-- Add unique constraint on profile names (case-insensitive)
-- SQLite doesn't support COLLATE NOCASE on unique index directly,
-- so we create a generated column for case-insensitive comparison
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_name_unique
  ON profiles(name COLLATE NOCASE);
