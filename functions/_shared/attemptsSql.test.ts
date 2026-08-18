import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import {
  ATTEMPT_INSERT_SQL,
  ATTEMPT_SELECT_COLUMNS,
  attemptBindValues,
  attemptRowToRecord,
  isBindableAttempt,
  type AttemptPayload,
  type AttemptRow,
} from './attemptsSql'

const PROFILE = 'kid-a'

function payload(overrides: Partial<AttemptPayload> = {}): AttemptPayload {
  return {
    id: 'attempt-1',
    factKey: '7x8',
    timestamp: '2026-08-18T12:00:00.000Z',
    correct: true,
    responseTimeMs: 6000,
    inputMethod: 'number_pad',
    hintShown: false,
    firstInputMs: 1500,
    profileId: PROFILE,
    ...overrides,
  }
}

let db: DatabaseSync

/** Round-trip one payload the way sync.ts writes and index.ts reads. */
function roundTrip(p: AttemptPayload) {
  db.prepare(ATTEMPT_INSERT_SQL).run(...(attemptBindValues(p) as (string | number | null)[]))
  const row = db
    .prepare(`SELECT ${ATTEMPT_SELECT_COLUMNS} FROM attempts WHERE id = ?`)
    .get(p.id) as unknown as AttemptRow
  return attemptRowToRecord(row)
}

describe('attempts SQL round-trip', () => {
  beforeEach(() => {
    db = new DatabaseSync(':memory:')
    db.exec(readFileSync(new URL('../../schema.sql', import.meta.url), 'utf8'))
    db.prepare(`INSERT INTO profiles (id, name, icon, color, created_at, last_active) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(PROFILE, 'A', 'cat', 'garden-500', 0, 0)
  })

  // Pins COLUMNS order against attemptBindValues and AttemptRow: a positional
  // slip writes fields into the wrong columns, which this equality catches.
  it('returns every field it was given, unshifted', () => {
    expect(roundTrip(payload())).toEqual({
      id: 'attempt-1',
      factKey: '7x8',
      timestamp: '2026-08-18T12:00:00.000Z',
      correct: true,
      responseTimeMs: 6000,
      inputMethod: 'number_pad',
      hintShown: false,
      firstInputMs: 1500,
      profileId: PROFILE,
    })
  })

  it('keeps a zero firstInputMs (falsy but real)', () => {
    expect(roundTrip(payload({ firstInputMs: 0 })).firstInputMs).toBe(0)
  })

  it('stores NULL for a legacy client that omits firstInputMs', () => {
    expect(roundTrip(payload({ firstInputMs: undefined })).firstInputMs).toBeUndefined()
  })

  it('binds a finite timestamp even when the payload timestamp is garbage', () => {
    const record = roundTrip(payload({ timestamp: 'not-a-date' }))
    expect(Number.isFinite(new Date(record.timestamp).getTime())).toBe(true)
  })

  it('rejects entries missing a NOT NULL column before they can poison a batch', () => {
    expect(isBindableAttempt(payload())).toBe(true)
    expect(isBindableAttempt(payload({ id: undefined as unknown as string }))).toBe(false)
    expect(isBindableAttempt(payload({ factKey: undefined as unknown as string }))).toBe(false)
    expect(isBindableAttempt(payload({ profileId: undefined as unknown as string }))).toBe(false)
    expect(isBindableAttempt(undefined as unknown as AttemptPayload)).toBe(false)
  })
})
