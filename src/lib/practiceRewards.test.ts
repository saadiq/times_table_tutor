import { describe, it, expect, beforeEach, vi } from 'vitest'
import { grantCorrectRewards } from './practiceRewards'
import { useProfileStore } from '../stores/profileStore'
import { useProgressViewStore } from '../stores/progressViewStore'

describe('grantCorrectRewards session sync', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressViewStore.setState({
      peakRevealedCount: 0, lastRevealedCount: 0, revealedTables: [],
      peakTier: 0, sessionsCompleted: 4, curriculum: 'multiply',
    })
  })

  it('pushes the incremented session count when the goal is met', () => {
    const syncSessions = vi.fn()
    useProfileStore.setState({ syncSessions })

    const result = grantCorrectRewards('3x4', 3, 9, 10)

    expect(result.celebrationType).toBe('goal')
    expect(useProgressViewStore.getState().sessionsCompleted).toBe(5)
    expect(syncSessions).toHaveBeenCalledWith('multiply', 5)
  })

  it('tags the push with the curriculum the count belongs to', () => {
    const syncSessions = vi.fn()
    useProfileStore.setState({ syncSessions })
    useProgressViewStore.setState({ curriculum: 'divide', sessionsCompleted: 0 })

    grantCorrectRewards('56÷7', 3, 9, 10)

    expect(syncSessions).toHaveBeenCalledWith('divide', 1)
  })

  it('does not push sessions mid-goal', () => {
    const syncSessions = vi.fn()
    useProfileStore.setState({ syncSessions })

    grantCorrectRewards('3x4', 3, 2, 10)

    expect(syncSessions).not.toHaveBeenCalled()
  })
})
