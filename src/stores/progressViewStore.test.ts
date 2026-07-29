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

describe('progressViewStore session resync', () => {
  beforeEach(() => {
    localStorage.clear()
    useCurriculumStore.setState({ active: 'multiply' })
    useProgressStore.setState({ facts: {}, initialized: false, curriculum: 'multiply' })
    useProgressStore.getState().initialize()
    useProgressViewStore.setState({
      peakRevealedCount: 0, lastRevealedCount: 0, revealedTables: [],
      peakTier: 0, sessionsCompleted: 3, curriculum: 'multiply',
    })
  })

  it('adopts the server count when it is ahead of this device', () => {
    useProgressViewStore.getState().resync({ multiply: 9 })
    expect(useProgressViewStore.getState().sessionsCompleted).toBe(9)
  })

  it('keeps the local count when the server lags behind', () => {
    useProgressViewStore.getState().resync({ multiply: 1 })
    expect(useProgressViewStore.getState().sessionsCompleted).toBe(3)
  })

  it('keeps the local count when the server omits sessions', () => {
    useProgressViewStore.getState().resync({})
    expect(useProgressViewStore.getState().sessionsCompleted).toBe(3)
  })

  it('preserves sessionsCompleted for no-arg callers', () => {
    useProgressViewStore.getState().resync()
    expect(useProgressViewStore.getState().sessionsCompleted).toBe(3)
  })

  it('persists the merged session count', () => {
    useProgressViewStore.getState().resync({ multiply: 9 })
    const saved = JSON.parse(localStorage.getItem('ttt_progress_view')!)
    expect(saved.sessionsCompleted).toBe(9)
  })

  it('never folds another curriculum count into the active slice', () => {
    useProgressStore.getState().loadCurriculum('divide')
    useProgressViewStore.getState().loadCurriculum('divide')

    useProgressViewStore.getState().resync({ multiply: 30 })

    expect(useProgressViewStore.getState().sessionsCompleted).toBe(0)
    expect(useProgressViewStore.getState().computeSceneState().foundation.warmth).toBe(0)
  })

  it('stores the other curriculum count in its own slice', () => {
    useProgressViewStore.getState().resync({ multiply: 9, divide: 4 })

    expect(useProgressViewStore.getState().sessionsCompleted).toBe(9)
    const savedDivide = JSON.parse(localStorage.getItem('ttt_progress_view_divide')!)
    expect(savedDivide.sessionsCompleted).toBe(4)
    expect(savedDivide.curriculum).toBe('divide')
  })

  it('never rolls a stored slice back to a lower server count', () => {
    localStorage.setItem(
      'ttt_progress_view_divide',
      JSON.stringify({
        peakRevealedCount: 5, lastRevealedCount: 5, revealedTables: [2],
        peakTier: 1, sessionsCompleted: 12, curriculum: 'divide',
      })
    )

    useProgressViewStore.getState().resync({ divide: 4 })

    const savedDivide = JSON.parse(localStorage.getItem('ttt_progress_view_divide')!)
    expect(savedDivide.sessionsCompleted).toBe(12)
    expect(savedDivide.revealedTables).toEqual([2])
  })
})
