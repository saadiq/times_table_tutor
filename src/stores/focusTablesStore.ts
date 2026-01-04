import { create } from 'zustand'
import { saveToStorage, loadFromStorage } from '../lib/storage'

type FocusTablesState = {
  focusTables: number[]
  isEnabled: boolean
}

type FocusTablesActions = {
  initialize: () => void
  toggleTable: (table: number) => void
  setTables: (tables: number[]) => void
  clearTables: () => void
  setEnabled: (enabled: boolean) => void
}

const initialState: FocusTablesState = {
  focusTables: [],
  isEnabled: true,
}

function saveState(state: FocusTablesState & FocusTablesActions): void {
  saveToStorage('focusTables', {
    focusTables: state.focusTables,
    isEnabled: state.isEnabled,
  })
}

export const useFocusTablesStore = create<FocusTablesState & FocusTablesActions>((set) => ({
  ...initialState,

  initialize: () => {
    const saved = loadFromStorage<FocusTablesState>('focusTables')
    if (saved) {
      set(saved)
    }
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
