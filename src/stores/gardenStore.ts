import { create } from 'zustand'
import type { GardenItem, GardenState, GardenTheme, GardenItemType } from '../types'
import type { GardenItemSync, GardenStatsSync } from '../types/api'
import { saveToStorage, loadFromStorage } from '../lib/storage'
import { useProfileStore } from './profileStore'

type GardenActions = {
  initialize: () => void
  addItem: (item: Omit<GardenItem, 'id' | 'earnedAt'>) => void
  moveItem: (id: string, position: { x: number; y: number }) => void
  removeItem: (id: string) => void
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean
  unlockTheme: (theme: GardenTheme) => void
  setTheme: (theme: GardenTheme) => void
  loadFromServer: (items: GardenItemSync[], stats: GardenStatsSync) => void
  toSyncPayload: () => { items: GardenItemSync[]; stats: GardenStatsSync }
}

const initialState: GardenState = {
  items: [],
  coins: 0,
  unlockedThemes: ['flower'],
  currentTheme: 'flower',
}

// Helper to sync garden state to server
const triggerGardenSync = (get: () => GardenState & GardenActions) => {
  const payload = get().toSyncPayload()
  useProfileStore.getState().syncGarden(payload.items, payload.stats)
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
    triggerGardenSync(get)
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
    triggerGardenSync(get)
  },

  removeItem: (id) => {
    set(state => {
      const items = state.items.filter(item => item.id !== id)
      const newState = { ...state, items }
      saveToStorage('garden', newState)
      return newState
    })
    triggerGardenSync(get)
  },

  addCoins: (amount) => {
    set(state => {
      const newState = { ...state, coins: state.coins + amount }
      saveToStorage('garden', newState)
      return newState
    })
    triggerGardenSync(get)
  },

  spendCoins: (amount) => {
    const { coins } = get()
    if (coins < amount) return false

    set(state => {
      const newState = { ...state, coins: state.coins - amount }
      saveToStorage('garden', newState)
      return newState
    })
    triggerGardenSync(get)
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
    triggerGardenSync(get)
  },

  setTheme: (theme) => {
    set(state => {
      const newState = { ...state, currentTheme: theme }
      saveToStorage('garden', newState)
      return newState
    })
    triggerGardenSync(get)
  },

  loadFromServer: (items, stats) => {
    set({
      items: items.map((item) => ({
        id: item.id,
        type: item.type as GardenItemType,
        itemId: item.itemId,
        position: { x: item.positionX, y: item.positionY },
        earnedFor: item.earnedFor || '',
        earnedAt: item.earnedAt ? new Date(item.earnedAt).toISOString() : '',
      })),
      coins: stats.coins,
      unlockedThemes: stats.unlockedThemes as GardenTheme[],
      currentTheme: stats.currentTheme as GardenTheme,
    })
  },

  toSyncPayload: () => {
    const state = get()
    return {
      items: state.items.map((item) => ({
        id: item.id,
        itemId: item.itemId,
        type: item.type,
        positionX: item.position.x,
        positionY: item.position.y,
        earnedFor: item.earnedFor || null,
        earnedAt: item.earnedAt ? new Date(item.earnedAt).getTime() : null,
      })),
      stats: {
        coins: state.coins,
        unlockedThemes: state.unlockedThemes,
        currentTheme: state.currentTheme,
      },
    }
  },
}))
