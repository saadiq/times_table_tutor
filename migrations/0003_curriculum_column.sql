-- Tag each fact_progress row with its curriculum ('multiply' | 'divide') so
-- both tracks sync per profile. Existing rows are multiplication, which the
-- DEFAULT preserves. Fact keys are already disjoint across curricula
-- ("7x8" vs "56÷7"), so the (profile_id, fact) primary key stays valid.
-- NOTE: SQLite has no "ADD COLUMN IF NOT EXISTS" — apply this file once per
-- database; a second run fails with "duplicate column name" (harmless).
ALTER TABLE fact_progress ADD COLUMN curriculum TEXT NOT NULL DEFAULT 'multiply';
