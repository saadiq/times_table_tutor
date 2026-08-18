import { describe, it, expect } from 'vitest'
import { createAttemptTimer } from './attemptTimer'

describe('createAttemptTimer', () => {
  it('starts timing at creation so the first serve needs no explicit start', () => {
    let now = 2000
    const timer = createAttemptTimer(() => now)
    now = 3000
    expect(timer.read().responseTimeMs).toBe(1000)
  })

  it('reports the first input tap separately from the final answer', () => {
    let now = 0
    const timer = createAttemptTimer(() => now)
    now = 1500
    timer.markInput()
    now = 2500
    timer.markInput() // later taps don't move the mark
    now = 6000
    expect(timer.read()).toEqual({ responseTimeMs: 6000, firstInputMs: 1500 })
  })

  it('falls back to the total time when no input was marked', () => {
    // Multiple choice: the answering tap is the first input.
    let now = 0
    const timer = createAttemptTimer(() => now)
    now = 4000
    expect(timer.read().firstInputMs).toBe(4000)
  })

  it('clears the first-input mark when a new attempt starts', () => {
    let now = 0
    const timer = createAttemptTimer(() => now)
    now = 1000
    timer.markInput()
    now = 2000
    timer.start()
    now = 5000
    expect(timer.read().firstInputMs).toBe(3000)
  })
})
