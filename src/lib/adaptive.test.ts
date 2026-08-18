import { describe, it, expect } from 'vitest'
import { calculateFactScore, selectNextFact, shouldUseMultipleChoice } from './adaptive'
import { divideOperation, multiplyOperation } from './operations'
import { makeFact, makeAttempt } from '../test/factories'
import type { FactProgress } from '../types'

describe('selectNextFact focus filter', () => {
  it('defaults to multiplication table membership', () => {
    const facts = multiplyOperation.generateFacts()
    for (let i = 0; i < 10; i++) {
      const next = selectNextFact(facts, [], [7], {})
      expect(next && (next.a === 7 || next.b === 7)).toBe(true)
    }
  })

  it('filters division facts by divisor when given the divide predicate', () => {
    const facts = divideOperation.generateFacts()
    for (let i = 0; i < 10; i++) {
      const next = selectNextFact(facts, [], [7], {}, divideOperation.matchesTable)
      expect(next?.b).toBe(7)
    }
  })
})

describe('labored-time regression', () => {
  it('does not regress to multiple choice over one walk-away answer', () => {
    const fact: FactProgress = {
      ...makeFact(3, 4),
      confidence: 'learning',
      recentAttempts: [
        makeAttempt({ responseTimeMs: 5000 }),
        makeAttempt({ responseTimeMs: 6000 }),
        makeAttempt({ responseTimeMs: 300000 }),
      ],
    }
    expect(shouldUseMultipleChoice(fact)).toBe(false)
  })

  it('allows typing time before calling a 2-digit answer labored', () => {
    const fact: FactProgress = {
      ...makeFact(3, 4),
      confidence: 'learning',
      recentAttempts: [
        makeAttempt({ responseTimeMs: 13000 }),
        makeAttempt({ responseTimeMs: 13000 }),
        makeAttempt({ responseTimeMs: 13000 }),
      ],
    }
    expect(shouldUseMultipleChoice(fact)).toBe(false)
  })

  it('still regresses a 1-digit answer at the base labored bar', () => {
    const fact: FactProgress = {
      ...makeFact(2, 3),
      confidence: 'learning',
      recentAttempts: [
        makeAttempt({ responseTimeMs: 13000 }),
        makeAttempt({ responseTimeMs: 13000 }),
        makeAttempt({ responseTimeMs: 13000 }),
      ],
    }
    expect(shouldUseMultipleChoice(fact)).toBe(true)
  })
})

describe('starvation guard', () => {
  /** Zola's stuck state: a full pick window of learning facts plus never-seen new facts. */
  function buildStarvedPool(): Record<string, FactProgress> {
    const facts: Record<string, FactProgress> = {}
    for (const [a, b] of [[2, 3], [3, 4], [3, 5], [3, 6], [3, 9], [4, 3], [5, 3], [10, 3]]) {
      const f = makeFact(a, b)
      f.confidence = 'learning'
      facts[f.fact] = f
    }
    for (const [a, b] of [[3, 7], [3, 8], [3, 11], [3, 12]]) {
      facts[`${a}x${b}`] = makeFact(a, b)
    }
    return facts
  }

  it('introduces a new fact even when learning facts fill the top scores', () => {
    const facts = buildStarvedPool()
    let sawNew = false
    for (let i = 0; i < 80 && !sawNew; i++) {
      const next = selectNextFact(facts, [], [3], { newFactsIntroduced: 0, sessionAccuracy: 0.9 })
      if (next?.confidence === 'new') sawNew = true
    }
    expect(sawNew).toBe(true)
  })

  it('respects the session cap of 2 new facts', () => {
    const facts = buildStarvedPool()
    for (let i = 0; i < 40; i++) {
      const next = selectNextFact(facts, [], [3], { newFactsIntroduced: 2, sessionAccuracy: 0.9 })
      expect(next?.confidence).not.toBe('new')
    }
  })

  it('ranks a capped new fact below a recency-penalized review fact', () => {
    // Mastered seen minutes ago scores 10 - 30 = -20; a capped new fact must still lose.
    const reviewed = { ...makeFact(3, 4), confidence: 'mastered' as const, lastSeen: new Date().toISOString() }
    expect(calculateFactScore(makeFact(3, 7), { newFactsIntroduced: 2 }))
      .toBeLessThan(calculateFactScore(reviewed, { newFactsIntroduced: 2 }))
  })

  it('holds off on new facts while session accuracy is low', () => {
    const facts = buildStarvedPool()
    for (let i = 0; i < 40; i++) {
      const next = selectNextFact(facts, [], [3], { newFactsIntroduced: 0, sessionAccuracy: 0.6 })
      expect(next?.confidence).not.toBe('new')
    }
  })

  it('holds off on new facts near the goal end', () => {
    const facts = buildStarvedPool()
    for (let i = 0; i < 40; i++) {
      const next = selectNextFact(facts, [], [3], { newFactsIntroduced: 0, sessionAccuracy: 0.9, nearGoalEnd: true })
      expect(next?.confidence).not.toBe('new')
    }
  })

  it('holds off on new facts during a frustration spiral', () => {
    const facts = buildStarvedPool()
    for (let i = 0; i < 40; i++) {
      const next = selectNextFact(facts, [], [3], { newFactsIntroduced: 0, sessionAccuracy: 0.8, consecutiveWrong: 3 })
      expect(next?.confidence).not.toBe('new')
    }
  })
})

describe('skippedCount scoring', () => {
  it('boosts skipped facts, capped at 3 skips', () => {
    const base = makeFact(7, 8)
    const skipped = { ...makeFact(7, 8), skippedCount: 2 }
    const heavilySkipped = { ...makeFact(7, 8), skippedCount: 10 }
    expect(calculateFactScore(skipped) - calculateFactScore(base)).toBe(30)
    expect(calculateFactScore(heavilySkipped) - calculateFactScore(base)).toBe(45)
  })
})
