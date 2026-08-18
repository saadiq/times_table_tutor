// Shared by the attempts endpoints. Underscore-prefixed so Pages never
// routes it.

// Every attempts column, in the one order both directions use: the INSERT
// placeholders/binds and the SELECT list all derive from it, so a new column
// is added here once plus one mapping per direction, instead of five spots
// kept in sync by hand across the two endpoints.
const COLUMNS = [
  'id', 'profile_id', 'fact_key', 'timestamp', 'correct',
  'response_time_ms', 'input_method', 'hint_shown', 'first_input_ms',
] as const;

export const ATTEMPT_SELECT_COLUMNS = COLUMNS.join(', ');

export const ATTEMPT_INSERT_SQL = `INSERT OR IGNORE INTO attempts
   (${COLUMNS.join(', ')})
   VALUES (${COLUMNS.map(() => '?').join(', ')})`;

/** What a client POSTs; firstInputMs is absent from legacy clients. */
export interface AttemptPayload {
  id: string;
  factKey: string;
  timestamp: string;
  correct: boolean;
  responseTimeMs: number;
  inputMethod: string;
  hintShown: boolean;
  firstInputMs?: number;
  profileId: string;
}

/** A stored row, as selected via ATTEMPT_SELECT_COLUMNS. */
export interface AttemptRow {
  id: string;
  profile_id: string;
  fact_key: string;
  timestamp: number;
  correct: number;
  response_time_ms: number | null;
  input_method: string | null;
  hint_shown: number;
  first_input_ms: number | null;
}

/**
 * A payload entry sound enough to bind: every NOT NULL text column present.
 * Binding undefined throws and D1 batches are atomic, so one malformed entry
 * would otherwise wedge the client's whole retry queue for good.
 */
export function isBindableAttempt(a: AttemptPayload): boolean {
  return typeof a?.id === 'string' && typeof a?.factKey === 'string' && typeof a?.profileId === 'string';
}

/** Bind values for ATTEMPT_INSERT_SQL, in COLUMNS order. */
export function attemptBindValues(a: AttemptPayload): (string | number | null)[] {
  // A malformed timestamp parses to NaN, which D1 refuses to bind (same
  // wedged-queue failure as above). Server receipt time is the safe stand-in.
  const timestamp = new Date(a.timestamp).getTime();
  return [
    a.id,
    a.profileId,
    a.factKey,
    Number.isFinite(timestamp) ? timestamp : Date.now(),
    a.correct ? 1 : 0,
    a.responseTimeMs ?? null,
    a.inputMethod ?? null,
    a.hintShown ? 1 : 0,
    a.firstInputMs ?? null,
  ];
}

/** Row back to the wire shape the GET returns. */
export function attemptRowToRecord(row: AttemptRow) {
  return {
    id: row.id,
    factKey: row.fact_key,
    timestamp: new Date(row.timestamp).toISOString(),
    correct: row.correct === 1,
    responseTimeMs: row.response_time_ms,
    inputMethod: row.input_method,
    hintShown: row.hint_shown === 1,
    firstInputMs: row.first_input_ms ?? undefined,
    profileId: row.profile_id,
  };
}
