import { describe, it, expect, beforeEach } from 'vitest'
import { useFocusTablesStore } from './focusTablesStore'
import { useCurriculumStore } from './curriculumStore'

describe('focusTablesStore curriculum slices', () => {
  beforeEach(() => {
    useCurriculumStore.setState({ active: 'multiply' })
    useFocusTablesStore.setState({ focusTables: [], isEnabled: true, curriculum: 'multiply' })
  })

  it('keeps focus selections independent per curriculum', () => {
    useFocusTablesStore.getState().toggleTable(7)
    expect(useFocusTablesStore.getState().focusTables).toEqual([7])

    useFocusTablesStore.getState().loadCurriculum('divide')
    expect(useFocusTablesStore.getState().focusTables).toEqual([])
    useFocusTablesStore.getState().toggleTable(3)

    useFocusTablesStore.getState().loadCurriculum('multiply')
    expect(useFocusTablesStore.getState().focusTables).toEqual([7])

    useFocusTablesStore.getState().loadCurriculum('divide')
    expect(useFocusTablesStore.getState().focusTables).toEqual([3])
  })
})
