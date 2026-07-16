import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from './sessionStore'

describe('sessionStore skip budget', () => {
  beforeEach(() => {
    useSessionStore.getState().resetProgress()
  })

  it('allows one skip per block', () => {
    const s = useSessionStore.getState()
    expect(s.canSkip()).toBe(true)
    s.recordSkip('7x8')
    expect(useSessionStore.getState().canSkip()).toBe(false)
    expect(useSessionStore.getState().skipsUsed).toBe(1)
  })

  it('queues the skipped fact as a pending comeback with a delay of 2', () => {
    useSessionStore.getState().recordSkip('7x8')
    expect(useSessionStore.getState().pendingComeback).toBe('7x8')
    expect(useSessionStore.getState().comebackDelay).toBe(2)
  })

  it('ticks the comeback delay down and clears the comeback', () => {
    useSessionStore.getState().recordSkip('7x8')
    useSessionStore.getState().tickComebackDelay()
    expect(useSessionStore.getState().comebackDelay).toBe(1)
    useSessionStore.getState().clearComeback()
    expect(useSessionStore.getState().pendingComeback).toBeNull()
  })

  it('resetProgress restores the skip budget and clears the comeback', () => {
    useSessionStore.getState().recordSkip('7x8')
    useSessionStore.getState().resetProgress()
    const s = useSessionStore.getState()
    expect(s.canSkip()).toBe(true)
    expect(s.skipsUsed).toBe(0)
    expect(s.pendingComeback).toBeNull()
  })
})
