import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressViewStore } from './progressViewStore'
import { useProgressStore } from './progressStore'
import { useCurriculumStore } from './curriculumStore'

describe('progressViewStore curriculum slices', () => {
  beforeEach(() => {
    localStorage.clear()
    useCurriculumStore.setState({ active: 'multiply' })
    useProgressStore.setState({ facts: {}, initialized: false, curriculum: 'multiply' })
    useProgressStore.getState().initialize()
    useProgressViewStore.setState({
      peakRevealedCount: 0, lastRevealedCount: 0, revealedTables: [],
      peakTier: 0, sessionsCompleted: 0, curriculum: 'multiply',
    })
  })

  it('keeps reveal state independent per curriculum', () => {
    useProgressViewStore.getState().markRevealed(10, [7], 1)
    expect(useProgressViewStore.getState().revealedTables).toEqual([7])

    useProgressStore.getState().loadCurriculum('divide')
    useProgressViewStore.getState().loadCurriculum('divide')
    expect(useProgressViewStore.getState().revealedTables).toEqual([])
    expect(useProgressViewStore.getState().peakRevealedCount).toBe(0)

    useProgressStore.getState().loadCurriculum('multiply')
    useProgressViewStore.getState().loadCurriculum('multiply')
    expect(useProgressViewStore.getState().revealedTables).toEqual([7])
    expect(useProgressViewStore.getState().peakRevealedCount).toBe(10)
  })

  it('counts pending reveals from the active slice only', () => {
    useProgressStore.getState().loadCurriculum('divide')
    useProgressViewStore.getState().loadCurriculum('divide')
    useProgressStore.getState().recordAttempt({
      fact: '56÷7', correct: true, inputMethod: 'multiple_choice', responseTimeMs: 3000,
    })
    expect(useProgressViewStore.getState().getPendingReveals().newDetails).toBe(1)
  })
})
