import { describe, it, expect } from 'vitest'
import { LADDERS } from './ladders'

describe('LADDERS', () => {
  it('has six ladders with unique ids', () => {
    expect(LADDERS).toHaveLength(6)
    expect(new Set(LADDERS.map(l => l.id)).size).toBe(6)
  })

  it('ends every ladder with a try step', () => {
    for (const ladder of LADDERS) {
      const lastStep = ladder.steps[ladder.steps.length - 1]
      expect(lastStep.kind).toBe('try')
    }
  })

  it('try steps stay inside the 12x12 grid', () => {
    for (const ladder of LADDERS) {
      for (const step of ladder.steps) {
        if (step.kind === 'try') {
          expect(step.a).toBeGreaterThanOrEqual(1)
          expect(step.a).toBeLessThanOrEqual(12)
          expect(step.b).toBeGreaterThanOrEqual(1)
          expect(step.b).toBeLessThanOrEqual(12)
        }
      }
    }
  })

  it('never shows an array taller than VisualArray can render', () => {
    for (const ladder of LADDERS) {
      for (const step of ladder.steps) {
        if (step.kind === 'show' && step.array) {
          expect(step.array.rows).toBeLessThanOrEqual(10)
        }
      }
    }
  })
})

describe('array marking semantics', () => {
  const showArrays = (id: string) =>
    (LADDERS.find(l => l.id === id)?.steps ?? [])
      .filter((s): s is Extract<typeof s, { kind: 'show' }> => s.kind === 'show')
      .map(s => s.array)
      .filter((a): a is NonNullable<typeof a> => !!a)

  it('marks removed groups with fadedRows only in the 9s ladder', () => {
    const nines = showArrays('nines-from-tens')
    expect(nines.some(a => (a.fadedRows ?? 0) > 0)).toBe(true)
    expect(nines.every(a => !a.accentRows)).toBe(true)
  })

  it('marks added groups with accentRows, never fadedRows', () => {
    const additionLadders = [
      'sixes-from-fives', 'threes-double-plus-one',
      'fours-double-double', 'eights-by-doubling', 'twelves-tens-plus-twos',
    ]
    for (const id of additionLadders) {
      const arrays = showArrays(id)
      expect(arrays.some(a => (a.accentRows ?? 0) > 0), `${id} should accent added rows`).toBe(true)
      expect(arrays.every(a => !a.fadedRows), `${id} should not fade any rows`).toBe(true)
    }
  })

  it('never describes added rows as faded in captions', () => {
    for (const ladder of LADDERS) {
      for (const step of ladder.steps) {
        if (step.kind === 'show' && step.array?.accentRows) {
          expect(step.array.caption ?? '').not.toMatch(/faded/i)
        }
      }
    }
  })
})
