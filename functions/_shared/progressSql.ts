// Shared by the progress endpoint and its tests. Underscore-prefixed so Pages
// never routes it.

const COLUMNS = `(profile_id, fact, curriculum, confidence, correct_count, incorrect_count,
   skipped_count, last_seen, last_correct, recent_attempts, preferred_strategy)`;
const VALUES = `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/**
 * Full-row upsert. A client can replay a queue it failed to deliver days ago,
 * long after another device pushed fresher data, so the WHERE clause drops the
 * stale rows (a null stored last_seen means the row was never answered).
 */
export const FACT_UPSERT_SQL = `INSERT INTO fact_progress ${COLUMNS}
   ${VALUES}
   ON CONFLICT(profile_id, fact) DO UPDATE SET
     curriculum = excluded.curriculum,
     confidence = excluded.confidence,
     correct_count = excluded.correct_count,
     incorrect_count = excluded.incorrect_count,
     skipped_count = excluded.skipped_count,
     last_seen = excluded.last_seen,
     last_correct = excluded.last_correct,
     recent_attempts = excluded.recent_attempts,
     preferred_strategy = excluded.preferred_strategy
   WHERE fact_progress.last_seen IS NULL
      OR excluded.last_seen >= fact_progress.last_seen`;

/**
 * A skip on a fact this device never answered carries no last_seen (recordSkip
 * only bumps the tally), so there is no evidence the snapshot is newer than
 * what the server holds. Only the skip tally may move, and only upward — the
 * rest of such a payload is still at its defaults anyway.
 */
export const FACT_SKIP_ONLY_SQL = `INSERT INTO fact_progress ${COLUMNS}
   ${VALUES}
   ON CONFLICT(profile_id, fact) DO UPDATE SET
     skipped_count = MAX(fact_progress.skipped_count, excluded.skipped_count)`;

/**
 * The routing rule between the two statements: a payload with no last_seen is
 * a skip-only snapshot and may never replace a row.
 */
export function isSkipOnly(lastSeen: number | null | undefined): boolean {
  return lastSeen === null || lastSeen === undefined;
}

/** Same bind order for either statement, so the caller only picks the SQL. */
export function upsertSqlFor(lastSeen: number | null | undefined): string {
  return isSkipOnly(lastSeen) ? FACT_SKIP_ONLY_SQL : FACT_UPSERT_SQL;
}
