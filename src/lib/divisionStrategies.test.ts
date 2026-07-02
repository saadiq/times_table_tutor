import { describe, it, expect } from 'vitest'
import { getStrategiesForDivisionFact } from './divisionStrategies'
import type { FactProgress } from '../types'

/** Division fact: a = quotient (the answer), b = divisor, dividend = a*b. */
function makeDivisionFact(quotient: number, divisor: number): FactProgress {
  return {
    fact: `${quotient * divisor}÷${divisor}`, a: quotient, b: divisor,
    answer: quotient, confidence: 'new',
    correctCount: 0, incorrectCount: 0, lastSeen: null, lastCorrect: null,
    recentAttempts: [], preferredStrategy: null,
  }
}

describe('getStrategiesForDivisionFact', () => {
  it('always anchors on inverse multiplication with an array caption', () => {
    const strategies = getStrategiesForDivisionFact(makeDivisionFact(8, 7))
    const anchor = strategies.find((s) => s.id === 'inverse_multiplication')
    expect(anchor).toBeDefined()
    expect(anchor?.visual).toBe('array')
    expect(anchor?.arrayCaption).toBe('56 dots in rows of 7 — how many rows?')
  })

  it('offers the fact family when quotient and divisor differ', () => {
    const ids = getStrategiesForDivisionFact(makeDivisionFact(8, 7)).map((s) => s.id)
    expect(ids).toContain('fact_family')
    const squareIds = getStrategiesForDivisionFact(makeDivisionFact(6, 6)).map((s) => s.id)
    expect(squareIds).not.toContain('fact_family')
  })

  it('offers skip counting for small divisors only', () => {
    expect(getStrategiesForDivisionFact(makeDivisionFact(8, 3)).map((s) => s.id)).toContain('skip_counting')
    expect(getStrategiesForDivisionFact(makeDivisionFact(8, 7)).map((s) => s.id)).not.toContain('skip_counting')
  })

  it('offers halving for divisor 2', () => {
    expect(getStrategiesForDivisionFact(makeDivisionFact(9, 2)).map((s) => s.id)).toContain('halving')
  })

  it('offers the ones rule for divisor 1 and the self rule for quotient 1', () => {
    expect(getStrategiesForDivisionFact(makeDivisionFact(9, 1)).map((s) => s.id)).toContain('ones_zeros')
    expect(getStrategiesForDivisionFact(makeDivisionFact(1, 9)).map((s) => s.id)).toContain('ones_zeros')
  })

  it('offers the tens trick for divisor 10', () => {
    expect(getStrategiesForDivisionFact(makeDivisionFact(7, 10)).map((s) => s.id)).toContain('tens_trick')
  })

  it('caps the skip-count preview at the quotient', () => {
    const strategies = getStrategiesForDivisionFact(makeDivisionFact(1, 5))
    const skip = strategies.find((s) => s.id === 'skip_counting')
    expect(skip?.steps[0]).toBe('Count by 5s: 5...')
  })
})
