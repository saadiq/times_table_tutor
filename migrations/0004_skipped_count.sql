-- Count of times the learner skipped a fact in Practice. Old clients omit the
-- field; the default keeps their rows at 0.
ALTER TABLE fact_progress ADD COLUMN skipped_count INTEGER NOT NULL DEFAULT 0;
