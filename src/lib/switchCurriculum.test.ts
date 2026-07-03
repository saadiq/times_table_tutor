import { describe, it, expect, beforeEach } from 'vitest'
import { switchCurriculum } from './switchCurriculum'
import { useCurriculumStore } from '../stores/curriculumStore'
import { useProgressStore } from '../stores/progressStore'
import { useFocusTablesStore } from '../stores/focusTablesStore'
import { useSessionStore } from '../stores/sessionStore'

describe('switchCurriculum', () => {
  beforeEach(() => {
    localStorage.clear()
    useCurriculumStore.setState({ active: 'multiply' })
    useProgressStore.setState({ facts: {}, initialized: false, curriculum: 'multiply' })
    useProgressStore.getState().initialize()
    useFocusTablesStore.setState({ focusTables: [], isEnabled: true, curriculum: 'multiply' })
    useSessionStore.getState().resetProgress()
  })

  it('swaps every sliced store and resets the in-flight run', () => {
    useSessionStore.getState().incrementProgress()
    useSessionStore.getState().incrementStreak()
    useFocusTablesStore.getState().toggleTable(7)

    switchCurriculum('divide')

    expect(useCurriculumStore.getState().active).toBe('divide')
    expect(useProgressStore.getState().facts['56÷7']).toBeDefined()
    expect(useFocusTablesStore.getState().focusTables).toEqual([])
    expect(useSessionStore.getState().progress).toBe(0)
    expect(useSessionStore.getState().streakCount).toBe(0)

    switchCurriculum('multiply')
    expect(useProgressStore.getState().facts['7x8']).toBeDefined()
    expect(useFocusTablesStore.getState().focusTables).toEqual([7])
  })

  it('is a no-op when the curriculum is already active', () => {
    useSessionStore.getState().incrementProgress()
    switchCurriculum('multiply')
    expect(useSessionStore.getState().progress).toBe(1)
  })
})
