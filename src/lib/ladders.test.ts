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
