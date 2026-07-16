import { describe, it, expect } from 'vitest'
import { getStrategiesForFact, makeKnownFacts, type KnownFacts } from './strategies'
import { makeFact } from '../test/factories'

const knowing = (...facts: string[]): KnownFacts => ({
  isKnown: (a, b) => facts.includes(`${a}x${b}`),
})

describe('commuted fact hint', () => {
  it('offers the flipped fact when it is known', () => {
    const strategies = getStrategiesForFact(makeFact(7, 8), knowing('8x7'))
    expect(strategies[0].id).toBe('fact_family')
    expect(strategies[0].steps[0]).toContain('8 × 7 = 56')
  })

  it('is absent when the flipped fact is not known', () => {
    const ids = getStrategiesForFact(makeFact(7, 8), knowing()).map(s => s.id)
    expect(ids).not.toContain('fact_family')
  })

  it('is absent for squares', () => {
    const ids = getStrategiesForFact(makeFact(6, 6), knowing('6x6')).map(s => s.id)
    expect(ids).not.toContain('fact_family')
  })
})

describe('ordering', () => {
  it('puts visual_array last when a known-facts context is provided', () => {
    const strategies = getStrategiesForFact(makeFact(7, 8), knowing())
    expect(strategies[strategies.length - 1].id).toBe('visual_array')
  })

  it('keeps the legacy order without a context', () => {
    const strategies = getStrategiesForFact(makeFact(7, 8))
    expect(strategies[0].id).toBe('visual_array')
  })
})

describe('makeKnownFacts', () => {
  it('treats confident and mastered facts as known, others not', () => {
    const facts = {
      '8x7': { ...makeFact(8, 7), confidence: 'confident' as const },
      '5x5': { ...makeFact(5, 5), confidence: 'learning' as const },
    }
    const known = makeKnownFacts(facts)
    expect(known.isKnown(8, 7)).toBe(true)
    expect(known.isKnown(5, 5)).toBe(false)
    expect(known.isKnown(9, 9)).toBe(false)
  })
})

describe('personalized neighbor', () => {
  it('prefers a known neighbor above the fact', () => {
    const strategies = getStrategiesForFact(makeFact(7, 6), knowing('8x6'))
    const neighbor = strategies.find(s => s.id === 'use_neighbor')
    expect(neighbor?.description).toContain('8 × 6')
    expect(neighbor?.steps.join(' ')).toContain('−')
  })

  it('anchor chains appear after the commuted hint and before number tricks', () => {
    const strategies = getStrategiesForFact(makeFact(8, 7), knowing('7x8', '10x7', '2x7'))
    const ids = strategies.map(s => s.id)
    expect(ids.indexOf('fact_family')).toBeLessThan(ids.indexOf('known_anchor'))
    expect(ids.indexOf('known_anchor')).toBeLessThan(ids.indexOf('visual_array'))
  })
})
