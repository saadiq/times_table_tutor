import { create } from 'zustand'
import { saveToStorage, loadFromStorage } from '../lib/storage'

type SettingsState = {
  ttsEnabled: boolean
}

type SettingsActions = {
  initialize: () => void
  setTtsEnabled: (enabled: boolean) => void
}

const STORAGE_KEY = 'settings'

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  ttsEnabled: true, // On by default for dyslexic learners

  initialize: () => {
    const saved = loadFromStorage<SettingsState>(STORAGE_KEY)
    if (saved) set(saved)
  },

  setTtsEnabled: (enabled) => {
    set({ ttsEnabled: enabled })
    saveToStorage(STORAGE_KEY, { ttsEnabled: enabled })
  },
}))
