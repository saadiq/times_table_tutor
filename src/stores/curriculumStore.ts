import { create } from 'zustand'
import type { CurriculumId } from '../lib/operations'
import { saveToStorage, loadFromStorage } from '../lib/storage'

type CurriculumState = {
  active: CurriculumId
}

type CurriculumActions = {
  initialize: () => void
  /** Persists the preference only. Use lib/switchCurriculum to swap store slices too. */
  setActive: (id: CurriculumId) => void
}

export const useCurriculumStore = create<CurriculumState & CurriculumActions>((set) => ({
  active: 'multiply',

  initialize: () => {
    const saved = loadFromStorage<CurriculumId>('curriculum')
    if (saved === 'multiply' || saved === 'divide') {
      set({ active: saved })
    }
  },

  setActive: (id) => {
    set({ active: id })
    saveToStorage('curriculum', id)
  },
}))
