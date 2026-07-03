import { describe, it, expect } from 'vitest'
import { multiplyOperation } from './multiply'
import { makeFact } from '../../test/factories'

describe('multiplyOperation', () => {
  it('generates all 144 facts', () => {
    expect(Object.keys(multiplyOperation.generateFacts())).toHaveLength(144)
  })

  it('builds correct fact entries', () => {
    expect(multiplyOperation.generateFacts()['7x8']).toMatchObject({
      a: 7, b: 8, answer: 56, confidence: 'new',
    })
  })

  it('keys facts with the x separator', () => {
    expect(multiplyOperation.generateFacts()['7x8']?.fact).toBe('7x8')
  })

  it('formats the problem with the times symbol', () => {
    expect(multiplyOperation.formatProblem(makeFact(7, 8))).toEqual({
      left: 7, symbol: '×', right: 8,
    })
  })

  it('generates 4 unique positive choices including the answer', () => {
    const choices = multiplyOperation.generateChoices(makeFact(7, 8), 4)
    expect(choices).toHaveLength(4)
    expect(new Set(choices).size).toBe(4)
    expect(choices).toContain(56)
    expect(choices.every((n) => n > 0)).toBe(true)
  })

  it('always offers the visual-array strategy', () => {
    const ids = multiplyOperation.getStrategies(makeFact(7, 8)).map((s) => s.id)
    expect(ids).toContain('visual_array')
  })

  it('exposes the times symbol and labels', () => {
    expect(multiplyOperation.symbol).toBe('×')
    expect(multiplyOperation.copy.label).toBe('Multiplication')
    expect(multiplyOperation.copy.tableLabel(7)).toBe('7 Times Table')
    expect(multiplyOperation.copy.tableMasteryText(7)).toBe('You mastered your 7s!')
    expect(multiplyOperation.copy.focusSummary([3, 5])).toBe('Practicing: 3, 5 times tables')
  })

  it('keys facts by factId', () => {
    expect(multiplyOperation.factId(7, 8)).toBe('7x8')
  })

  it('groups a fact under its a-factor table for Learn', () => {
    expect(multiplyOperation.tableOf(makeFact(7, 8))).toBe(7)
  })

  it('matches a table when either factor equals it', () => {
    expect(multiplyOperation.matchesTable(makeFact(7, 8), 7)).toBe(true)
    expect(multiplyOperation.matchesTable(makeFact(7, 8), 8)).toBe(true)
    expect(multiplyOperation.matchesTable(makeFact(7, 8), 3)).toBe(false)
  })
})
