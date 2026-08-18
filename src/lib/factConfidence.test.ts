import { describe, it, expect } from 'vitest'
import { calculateConfidence, migrateRecentAttempts, getMasteryProgress } from './factConfidence'
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

describe('getMasteryProgress', () => {
  it('points a new fact at confident with nothing counted yet', () => {
    const progress = getMasteryProgress(makeFact(3, 7))
    expect(progress).toEqual({
      nextLevel: 'confident',
      unaidedCorrect: 0,
      neededCorrect: 3,
      typicalTimeMs: null,
      targetTimeMs: 10000,
      accuracy: null,
      targetAccuracy: 0.7,
    })
  })

  it('counts only unaided number-pad corrects', () => {
    const fact = { ...makeFact(3, 4), confidence: 'learning' as const }
    fact.recentAttempts = [
      makeAttempt({ inputMethod: 'multiple_choice' }),
      makeAttempt({ responseTimeMs: 4000, hintShown: true }),
      npCorrect(6000),
    ]
    const progress = getMasteryProgress(fact)
    expect(progress.unaidedCorrect).toBe(1)
    expect(progress.typicalTimeMs).toBe(6000)
  })

  it('points a confident fact at the mastered thresholds', () => {
    const fact = { ...makeFact(3, 4), confidence: 'confident' as const }
    const progress = getMasteryProgress(fact)
    expect(progress.nextLevel).toBe('mastered')
    expect(progress.neededCorrect).toBe(5)
    expect(progress.targetTimeMs).toBe(5000)
    expect(progress.targetAccuracy).toBe(0.9)
  })

  it('reports no next level once mastered', () => {
    const fact = { ...makeFact(3, 4), confidence: 'mastered' as const }
    expect(getMasteryProgress(fact).nextLevel).toBeNull()
  })

  it('caps walk-away times in the typical speed it reports', () => {
    const fact = { ...makeFact(3, 4), confidence: 'learning' as const }
    fact.recentAttempts = [npCorrect(4000), npCorrect(200000)]
    expect(getMasteryProgress(fact).typicalTimeMs).toBe(17000)
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
