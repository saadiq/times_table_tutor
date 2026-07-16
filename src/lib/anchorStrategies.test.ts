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
