-- Profile names are unique case-insensitively. A fresh database gets the rule
-- from the profiles table definition in schema.sql; this file is what brings a
-- database created before that up to it, by hand, once.
--
-- It fails on a database that already holds two profiles whose names differ
-- only in case — reachable through the check-then-write window POST
-- /api/profiles had before the constraint existed. Find them with
--   SELECT name FROM profiles GROUP BY name COLLATE NOCASE HAVING COUNT(*) > 1;
-- then rename or delete all but one of each and run this again.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_name_unique
  ON profiles(name COLLATE NOCASE);
