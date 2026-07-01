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
})
