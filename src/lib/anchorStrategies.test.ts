import { describe, it, expect } from 'vitest'
import { getAnchorStrategies } from './anchorStrategies'
import type { KnownFacts } from './strategies'
import { makeFact } from '../test/factories'

const knowing = (...facts: string[]): KnownFacts => ({
  isKnown: (a, b) => facts.includes(`${a}x${b}`),
})

describe('getAnchorStrategies', () => {
  it('builds 8s from tens minus twos when 10x and 2x are known', () => {
    const hints = getAnchorStrategies(makeFact(8, 7), knowing('10x7', '2x7'))
    expect(hints[0].id).toBe('known_anchor')
    expect(hints[0].name).toBe('Tens Minus Twos')
    expect(hints[0].steps.join(' ')).toContain('70')
    expect(hints[0].steps.join(' ')).toContain('14')
  })

  it('falls back to doubling fours for 8s when only 4x is known', () => {
    expect(getAnchorStrategies(makeFact(8, 7), knowing('4x7'))[0].name).toBe('Double the Fours')
  })

  it('accepts anchors in either orientation', () => {
    expect(getAnchorStrategies(makeFact(6, 9), knowing('9x5'))[0].name).toBe('Fives Plus One')
  })

  it('returns nothing when no anchors are known', () => {
    expect(getAnchorStrategies(makeFact(8, 7), knowing())).toEqual([])
  })

  it('caps at two hints', () => {
    const hints = getAnchorStrategies(makeFact(8, 12), knowing('10x8', '2x8', '10x12', '2x12'))
    expect(hints).toHaveLength(2)
  })

  it('emits a single hint for squares', () => {
    const hints = getAnchorStrategies(makeFact(4, 4), knowing('2x4'))
    expect(hints).toHaveLength(1)
    expect(hints[0].name).toBe('Double the Double')
  })
})

describe('8s gate (spec: 10x anchor alone suffices)', () => {
  it('emits tens-minus-twos when only 10x is known — the hint computes the twos itself', () => {
    const hints = getAnchorStrategies(makeFact(8, 7), knowing('10x7'))
    expect(hints).toHaveLength(1)
    expect(hints[0].name).toBe('Tens Minus Twos')
  })
})

describe('chain arithmetic', () => {
  it('3s: double plus one', () => {
    const [h] = getAnchorStrategies(makeFact(3, 7), knowing('2x7'))
    expect(h.name).toBe('Double Plus One')
    expect(h.steps).toEqual(['You know 2 × 7 = 14.', '3 × 7 is just one more 7.', '14 + 7 = ?'])
  })

  it('4s: double the double', () => {
    const [h] = getAnchorStrategies(makeFact(4, 6), knowing('2x6'))
    expect(h.name).toBe('Double the Double')
    expect(h.steps).toEqual(['You know 2 × 6 = 12.', '4 × 6 is double that.', '12 + 12 = ?'])
  })

  it('6s: fives plus one', () => {
    const [h] = getAnchorStrategies(makeFact(6, 8), knowing('5x8'))
    expect(h.name).toBe('Fives Plus One')
    expect(h.steps).toEqual(['You know 5 × 8 = 40.', '6 × 8 is one more 8.', '40 + 8 = ?'])
  })

  it('7s: fives plus twos', () => {
    const [h] = getAnchorStrategies(makeFact(7, 6), knowing('5x6', '2x6'))
    expect(h.name).toBe('Fives Plus Twos')
    expect(h.steps).toEqual([
      'You know 5 × 6 = 30 and 2 × 6 = 12.',
      '7 groups is 5 groups plus 2 groups.',
      '30 + 12 = ?',
    ])
  })

  it('8s: double the fours', () => {
    const [h] = getAnchorStrategies(makeFact(8, 7), knowing('4x7'))
    expect(h.name).toBe('Double the Fours')
    expect(h.steps).toEqual(['You know 4 × 7 = 28.', '8 × 7 is double that.', '28 + 28 = ?'])
  })

  it('12s: tens plus twos', () => {
    const [h] = getAnchorStrategies(makeFact(12, 4), knowing('10x4', '2x4'))
    expect(h.name).toBe('Tens Plus Twos')
    expect(h.steps).toEqual([
      'You know 10 × 4 = 40 and 2 × 4 = 8.',
      '12 groups is 10 groups plus 2 groups.',
      '40 + 8 = ?',
    ])
  })
})
