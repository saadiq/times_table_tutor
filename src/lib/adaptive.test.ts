import { describe, it, expect } from 'vitest'
import { calculateFactScore, selectNextFact } from './adaptive'
import { divideOperation, multiplyOperation } from './operations'
import { makeFact } from '../test/factories'

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

describe('skippedCount scoring', () => {
  it('boosts skipped facts, capped at 3 skips', () => {
    const base = makeFact(7, 8)
    const skipped = { ...makeFact(7, 8), skippedCount: 2 }
    const heavilySkipped = { ...makeFact(7, 8), skippedCount: 10 }
    expect(calculateFactScore(skipped) - calculateFactScore(base)).toBe(30)
    expect(calculateFactScore(heavilySkipped) - calculateFactScore(base)).toBe(45)
  })
})
