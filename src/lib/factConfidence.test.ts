import { describe, it, expect } from 'vitest'
import { calculateConfidence, migrateRecentAttempts } from './factConfidence'
import { makeFact, makeAttempt } from '../test/factories'

function npCorrect(responseTimeMs: number) {
  return makeAttempt({ responseTimeMs })
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

describe('outlier-resistant timing', () => {
  it('reaches confident when one walk-away answer skews the mean', () => {
    const fact = { ...makeFact(7, 8), recentAttempts: [npCorrect(4000), npCorrect(5000), npCorrect(200000)] }
    expect(calculateConfidence(fact)).toBe('confident')
  })

  it('reaches mastered despite a single walk-away answer', () => {
    const fact = {
      ...makeFact(7, 8),
      recentAttempts: [npCorrect(2000), npCorrect(2000), npCorrect(2000), npCorrect(3000), npCorrect(250000)],
    }
    expect(calculateConfidence(fact)).toBe('mastered')
  })

  it('stays learning when typical answers are genuinely slow', () => {
    const fact = { ...makeFact(7, 8), recentAttempts: [npCorrect(15000), npCorrect(20000), npCorrect(25000)] }
    expect(calculateConfidence(fact)).toBe('learning')
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
    fact.recentAttempts = [
      makeAttempt({ hintShown: true }), makeAttempt({ hintShown: true }), makeAttempt({ hintShown: true }),
    ]
    expect(calculateConfidence(fact)).toBe('learning')
  })

  it('reaches confident on 3 unaided NP corrects even with extra hinted attempts', () => {
    const fact = makeFact(7, 8)
    fact.recentAttempts = [
      makeAttempt({ hintShown: true }), makeAttempt(), makeAttempt(), makeAttempt(),
      makeAttempt({ correct: false, hintShown: true }),
    ]
    expect(calculateConfidence(fact)).toBe('confident')
  })

  it('treats legacy attempts without hintShown as unaided', () => {
    const fact = makeFact(7, 8)
    fact.recentAttempts = [makeAttempt(), makeAttempt(), makeAttempt()]
    expect(calculateConfidence(fact)).toBe('confident')
  })
})
