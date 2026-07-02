import { describe, it, expect, beforeEach } from 'vitest'
import { resetStoresForProfileSwitch } from './resetStores'
import { useCurriculumStore } from '../stores/curriculumStore'
import { useProgressStore } from '../stores/progressStore'
import { useProgressViewStore } from '../stores/progressViewStore'

describe('resetStoresForProfileSwitch', () => {
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

  it('clears the multiply reveal slice even when divide is active', () => {
    // Profile A earns multiply reveal state, then switches to divide
    useProgressViewStore.getState().markRevealed(10, [7], 1)
    expect(localStorage.getItem('ttt_progress_view')).not.toBeNull()
    useCurriculumStore.setState({ active: 'divide' })
    useProgressStore.getState().loadCurriculum('divide')
    useProgressViewStore.getState().loadCurriculum('divide')

    resetStoresForProfileSwitch()

    // The next profile must not inherit Profile A's revealed animals
    expect(localStorage.getItem('ttt_progress_view')).toBeNull()
    expect(useProgressViewStore.getState().revealedTables).toEqual([])
  })
})
