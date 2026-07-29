import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { upsertSqlFor } from './progressSql'

type FactRow = {
  confidence: string
  correct_count: number
  skipped_count: number
  last_seen: number | null
}

const PROFILE = 'kid-a'
const FACT = '7x8'

let db: DatabaseSync

/** Push one fact the way functions/api/profiles/[id]/progress.ts does. */
function push(payload: {
  confidence: string
  correctCount: number
  skippedCount: number
  lastSeen: number | null
}): void {
  db.prepare(upsertSqlFor(payload.lastSeen)).run(
    PROFILE,
    FACT,
    'multiply',
    payload.confidence,
    payload.correctCount,
    0,
    payload.skippedCount,
    payload.lastSeen,
    null,
    '[]',
    null
  )
}

function row(): FactRow {
  return db
    .prepare(`SELECT confidence, correct_count, skipped_count, last_seen FROM fact_progress WHERE fact = ?`)
    .get(FACT) as FactRow
}

describe('fact progress upsert guard', () => {
  beforeEach(() => {
    db = new DatabaseSync(':memory:')
    db.exec(readFileSync(new URL('../../schema.sql', import.meta.url), 'utf8'))
    db.prepare(`INSERT INTO profiles (id, name, icon, color, created_at, last_active) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(PROFILE, 'A', 'cat', 'garden-500', 0, 0)
  })

  it('writes a fact the server has never seen', () => {
    push({ confidence: 'learning', correctCount: 1, skippedCount: 0, lastSeen: 1000 })
    expect(row().correct_count).toBe(1)
  })

  it('takes a fresher snapshot', () => {
    push({ confidence: 'learning', correctCount: 1, skippedCount: 0, lastSeen: 1000 })
    push({ confidence: 'confident', correctCount: 5, skippedCount: 0, lastSeen: 2000 })
    expect(row().confidence).toBe('confident')
    expect(row().correct_count).toBe(5)
  })

  it('drops a replayed snapshot older than the stored row', () => {
    push({ confidence: 'confident', correctCount: 5, skippedCount: 0, lastSeen: 2000 })
    push({ confidence: 'learning', correctCount: 1, skippedCount: 0, lastSeen: 1000 })
    expect(row().confidence).toBe('confident')
    expect(row().correct_count).toBe(5)
  })

  it('overwrites a row that has never been answered anywhere', () => {
    push({ confidence: 'new', correctCount: 0, skippedCount: 1, lastSeen: null })
    push({ confidence: 'confident', correctCount: 5, skippedCount: 0, lastSeen: 2000 })
    expect(row().correct_count).toBe(5)
    expect(row().last_seen).toBe(2000)
  })

  it('only bumps the skip tally when a skip-only snapshot meets a populated row', () => {
    push({ confidence: 'confident', correctCount: 5, skippedCount: 0, lastSeen: 2000 })
    // A tablet that skipped this fact days ago without ever answering it
    push({ confidence: 'new', correctCount: 0, skippedCount: 1, lastSeen: null })

    expect(row().confidence).toBe('confident')
    expect(row().correct_count).toBe(5)
    expect(row().last_seen).toBe(2000)
    expect(row().skipped_count).toBe(1)
  })

  it('never lowers the stored skip tally', () => {
    push({ confidence: 'confident', correctCount: 5, skippedCount: 3, lastSeen: 2000 })
    push({ confidence: 'new', correctCount: 0, skippedCount: 1, lastSeen: null })
    expect(row().skipped_count).toBe(3)
  })

  it('inserts a skip-only snapshot when the fact has no row yet', () => {
    push({ confidence: 'new', correctCount: 0, skippedCount: 1, lastSeen: null })
    expect(row().skipped_count).toBe(1)
    expect(row().last_seen).toBeNull()
  })
})
