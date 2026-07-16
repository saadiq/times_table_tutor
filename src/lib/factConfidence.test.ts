import { describe, it, expect } from 'vitest'
import { calculateConfidence, migrateRecentAttempts } from './factConfidence'
import { makeFact } from '../test/factories'
import type { RecentAttempt } from '../types'

function npCorrect(ms: number): RecentAttempt {
  return { correct: true, inputMethod: 'number_pad', responseTimeMs: ms, timestamp: new Date().toISOString() }
}

function npAttempt(correct: boolean, hintShown?: boolean, responseTimeMs = 3000) {
  return { correct, inputMethod: 'number_pad' as const, responseTimeMs, timestamp: new Date().toISOString(), hintShown }
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

describe('hint-gated confidence', () => {
  it('does not reach confident on hint-assisted number-pad corrects', () => {
    const fact = makeFact(7, 8)
    fact.recentAttempts = [npAttempt(true, true), npAttempt(true, true), npAttempt(true, true)]
    expect(calculateConfidence(fact)).toBe('learning')
  })

  it('reaches confident on 3 unaided NP corrects even with extra hinted attempts', () => {
    const fact = makeFact(7, 8)
    fact.recentAttempts = [
      npAttempt(true, true), npAttempt(true), npAttempt(true), npAttempt(true), npAttempt(false, true),
    ]
    expect(calculateConfidence(fact)).toBe('confident')
  })

  it('treats legacy attempts without hintShown as unaided', () => {
    const fact = makeFact(7, 8)
    fact.recentAttempts = [npAttempt(true), npAttempt(true), npAttempt(true)]
    delete fact.recentAttempts[0].hintShown
    expect(calculateConfidence(fact)).toBe('confident')
  })
})
