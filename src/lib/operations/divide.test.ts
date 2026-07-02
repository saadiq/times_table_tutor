import { describe, it, expect } from 'vitest'
import { divideOperation } from './divide'
import type { FactProgress } from '../../types'

function makeDivisionFact(quotient: number, divisor: number): FactProgress {
  return {
    fact: `${quotient * divisor}÷${divisor}`, a: quotient, b: divisor,
    answer: quotient, confidence: 'new',
    correctCount: 0, incorrectCount: 0, lastSeen: null, lastCorrect: null,
    recentAttempts: [], preferredStrategy: null,
  }
}

describe('divideOperation', () => {
  it('generates 144 distinct division facts', () => {
    const facts = divideOperation.generateFacts()
    expect(Object.keys(facts)).toHaveLength(144)
  })

  it('builds facts where the answer is the quotient', () => {
    const facts = divideOperation.generateFacts()
    expect(facts['56÷7']).toMatchObject({ a: 8, b: 7, answer: 8, confidence: 'new' })
    expect(facts['56÷8']).toMatchObject({ a: 7, b: 8, answer: 7 })
    expect(facts['144÷12']).toMatchObject({ a: 12, b: 12, answer: 12 })
  })

  it('keys facts as dividend÷divisor', () => {
    expect(divideOperation.factId(8, 7)).toBe('56÷7')
    expect(divideOperation.factId(7, 8)).toBe('56÷8')
  })

  it('formats the problem as dividend ÷ divisor', () => {
    expect(divideOperation.formatProblem(makeDivisionFact(8, 7))).toEqual({
      left: 56, symbol: '÷', right: 7,
    })
  })

  it('generates 4 unique choices in quotient range including the answer', () => {
    for (let i = 0; i < 20; i++) {
      const choices = divideOperation.generateChoices(makeDivisionFact(8, 7), 4)
      expect(choices).toHaveLength(4)
      expect(new Set(choices).size).toBe(4)
      expect(choices).toContain(8)
      expect(choices.every((n) => n >= 1 && n <= 12)).toBe(true)
    }
  })

  it('matches a table by divisor only', () => {
    expect(divideOperation.matchesTable(makeDivisionFact(8, 7), 7)).toBe(true)
    expect(divideOperation.matchesTable(makeDivisionFact(8, 7), 8)).toBe(false)
  })

  it('groups facts under their divisor for Learn', () => {
    expect(divideOperation.tableOf(makeDivisionFact(8, 7))).toBe(7)
  })

  it('offers the inverse-multiplication strategy', () => {
    const ids = divideOperation.getStrategies(makeDivisionFact(8, 7)).map((s) => s.id)
    expect(ids).toContain('inverse_multiplication')
  })
})
