import { describe, it, expect } from 'vitest'
import { selectNextFact } from './adaptive'
import { divideOperation, multiplyOperation } from './operations'

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
