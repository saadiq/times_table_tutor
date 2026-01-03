import { create } from 'zustand'
import type { GardenItem, GardenState, GardenTheme } from '../types'
import { saveToStorage, loadFromStorage } from '../lib/storage'

type GardenActions = {
  initialize: () => void
  addItem: (item: Omit<GardenItem, 'id' | 'earnedAt'>) => void
  moveItem: (id: string, position: { x: number; y: number }) => void
  removeItem: (id: string) => void
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean
  unlockTheme: (theme: GardenTheme) => void
  setTheme: (theme: GardenTheme) => void
}

const initialState: GardenState = {
  items: [],
  coins: 0,
  unlockedThemes: ['flower'],
  currentTheme: 'flower',
}

export const useGardenStore = create<GardenState & GardenActions>((set, get) => ({
  ...initialState,

  initialize: () => {
    const saved = loadFromStorage<GardenState>('garden')
    if (saved) {
      set(saved)
    }
  },

  addItem: (itemData) => {
    const item: GardenItem = {
      ...itemData,
      id: crypto.randomUUID(),
      earnedAt: new Date().toISOString(),
    }

    set(state => {
      const newState = { ...state, items: [...state.items, item] }
      saveToStorage('garden', newState)
      return newState
    })
  },

  moveItem: (id, position) => {
    set(state => {
      const items = state.items.map(item =>
        item.id === id ? { ...item, position } : item
      )
      const newState = { ...state, items }
      saveToStorage('garden', newState)
      return newState
    })
  },

  removeItem: (id) => {
    set(state => {
      const items = state.items.filter(item => item.id !== id)
      const newState = { ...state, items }
      saveToStorage('garden', newState)
      return newState
    })
  },

  addCoins: (amount) => {
    set(state => {
      const newState = { ...state, coins: state.coins + amount }
      saveToStorage('garden', newState)
      return newState
    })
  },

  spendCoins: (amount) => {
    const { coins } = get()
    if (coins < amount) return false

    set(state => {
      const newState = { ...state, coins: state.coins - amount }
      saveToStorage('garden', newState)
      return newState
    })
    return true
  },

  unlockTheme: (theme) => {
    set(state => {
      if (state.unlockedThemes.includes(theme)) return state
      const newState = {
        ...state,
        unlockedThemes: [...state.unlockedThemes, theme]
      }
      saveToStorage('garden', newState)
      return newState
    })
  },

  setTheme: (theme) => {
    set(state => {
      const newState = { ...state, currentTheme: theme }
      saveToStorage('garden', newState)
      return newState
    })
  },
}))
