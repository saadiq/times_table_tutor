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

describe('sessionStore resolveComeback', () => {
  beforeEach(() => {
    useSessionStore.getState().resetProgress()
  })

  it('clears the comeback when the answered fact matches', () => {
    useSessionStore.getState().recordSkip('7x8')
    useSessionStore.getState().resolveComeback('7x8')
    expect(useSessionStore.getState().pendingComeback).toBeNull()
    expect(useSessionStore.getState().comebackDelay).toBe(0)
  })

  it('leaves a non-matching comeback pending', () => {
    useSessionStore.getState().recordSkip('7x8')
    useSessionStore.getState().resolveComeback('3x4')
    expect(useSessionStore.getState().pendingComeback).toBe('7x8')
    expect(useSessionStore.getState().comebackDelay).toBe(2)
  })
})

describe('sessionStore getConsecutiveWrong', () => {
  beforeEach(() => {
    useSessionStore.getState().resetProgress()
  })

  it('counts the trailing run of wrong answers', () => {
    const s = useSessionStore.getState()
    s.recordResult(true)
    s.recordResult(false)
    s.recordResult(false)
    expect(useSessionStore.getState().getConsecutiveWrong()).toBe(2)
    useSessionStore.getState().recordResult(true)
    expect(useSessionStore.getState().getConsecutiveWrong()).toBe(0)
  })

  it('is zero with no results', () => {
    expect(useSessionStore.getState().getConsecutiveWrong()).toBe(0)
  })
})
