import { describe, it, expect } from 'vitest'
import { calculateConfidence, migrateRecentAttempts } from './factConfidence'
import { makeFact } from '../test/factories'
import type { RecentAttempt } from '../types'

function npCorrect(ms: number): RecentAttempt {
  return { correct: true, inputMethod: 'number_pad', responseTimeMs: ms, timestamp: new Date().toISOString() }
}

describe('calculateConfidence', () => {
  it('returns new with no attempts', () => {
    expect(calculateConfidence(makeFact(7, 8))).toBe('new')
  })

  it('returns mastered after 5 fast correct number-pad attempts', () => {
    const fact = { ...makeFact(7, 8), recentAttempts: Array.from({ length: 5 }, () => npCorrect(2000)) }
    expect(calculateConfidence(fact)).toBe('mastered')
  })
})

describe('migrateRecentAttempts', () => {
  it('converts legacy boolean arrays', () => {
    const migrated = migrateRecentAttempts([true, false])
    expect(migrated).toHaveLength(2)
    expect(migrated[0]).toMatchObject({ correct: true, inputMethod: 'multiple_choice' })
  })
})
