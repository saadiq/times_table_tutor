import { create } from 'zustand'
import type { CurriculumId } from '../lib/operations'
import { saveToStorage, loadFromStorage } from '../lib/storage'
import { useCurriculumStore } from './curriculumStore'

type FocusTablesState = {
  focusTables: number[]
  isEnabled: boolean
  /** Which curriculum the in-memory selection belongs to. */
  curriculum: CurriculumId
}

type PersistedFocusTables = Pick<FocusTablesState, 'focusTables' | 'isEnabled'>

type FocusTablesActions = {
  initialize: () => void
  loadCurriculum: (id: CurriculumId) => void
  toggleTable: (table: number) => void
  setTables: (tables: number[]) => void
  clearTables: () => void
  setEnabled: (enabled: boolean) => void
}

const initialState: PersistedFocusTables = {
  focusTables: [],
  isEnabled: true,
}

function focusKeyFor(id: CurriculumId): 'focusTables' | 'focusTablesDivide' {
  return id === 'divide' ? 'focusTablesDivide' : 'focusTables'
}

function saveState(state: FocusTablesState): void {
  saveToStorage(focusKeyFor(state.curriculum), {
    focusTables: state.focusTables,
    isEnabled: state.isEnabled,
  })
}

export const useFocusTablesStore = create<FocusTablesState & FocusTablesActions>((set) => ({
  ...initialState,
  curriculum: 'multiply',

  initialize: () => {
    const id = useCurriculumStore.getState().active
    const saved = loadFromStorage<PersistedFocusTables>(focusKeyFor(id))
    set({ ...(saved ?? initialState), curriculum: id })
  },

  loadCurriculum: (id) => {
    const saved = loadFromStorage<PersistedFocusTables>(focusKeyFor(id))
    set({ ...(saved ?? initialState), curriculum: id })
  },

  toggleTable: (table) => {
    set(state => {
      const focusTables = state.focusTables.includes(table)
        ? state.focusTables.filter(t => t !== table)
        : [...state.focusTables, table].sort((a, b) => a - b)
      const newState = { ...state, focusTables }
      saveState(newState)
      return newState
    })
  },

  setTables: (tables) => {
    set(state => {
      const newState = { ...state, focusTables: tables.sort((a, b) => a - b) }
      saveState(newState)
      return newState
    })
  },

  clearTables: () => {
    set(state => {
      const newState = { ...state, focusTables: [] }
      saveState(newState)
      return newState
    })
  },

  setEnabled: (enabled) => {
    set(state => {
      const newState = { ...state, isEnabled: enabled }
      saveState(newState)
      return newState
    })
  },
}))
