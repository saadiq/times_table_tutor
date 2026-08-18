import { create } from 'zustand'
import type { AttemptRecord, DailySummary, InputMethod } from '../types'
import { saveToStorage, loadFromStorage } from '../lib/storage'
import { canKeepalive } from '../lib/api'
import { getLocalDateKey, getDateKeyFromTimestamp, isWithinDays } from '../lib/attemptDates'

const MAX_LOCAL_DAYS = 30
const SYNC_DEBOUNCE_MS = 2000

type AttemptsState = {
  attempts: AttemptRecord[]
  pendingSync: AttemptRecord[]
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error'
  lastSyncTimestamp: string | null
  syncTimeoutId: number | null
  currentProfileId: string | null
}

type AttemptsActions = {
  initialize: () => void
  setProfileId: (profileId: string | null) => void
  recordAttempt: (params: {
    factKey: string
    correct: boolean
    responseTimeMs: number
    inputMethod: InputMethod
    hintShown: boolean
    firstInputMs?: number
    profileId?: string
  }) => void
  getAttemptsByDate: (date: string) => AttemptRecord[]
  getDailySummaries: (days: number) => DailySummary[]
  getFactAttempts: (factKey: string) => AttemptRecord[]
  getStreakDays: () => number
  getTodayStats: () => { attempts: number; correct: number; accuracy: number }
  clearOldAttempts: () => void
  clearForProfileSwitch: () => void
  flush: () => void
  syncToCloud: (profileId: string) => Promise<void>
  fetchFromCloud: (profileId: string) => Promise<void>
}

function matchesProfile(attempt: AttemptRecord, profileId: string | null): boolean {
  return !profileId || attempt.profileId === profileId
}

export const useAttemptsStore = create<AttemptsState & AttemptsActions>(
  (set, get) => ({
    attempts: [],
    pendingSync: [],
    syncStatus: 'offline',
    lastSyncTimestamp: null,
    syncTimeoutId: null,
    currentProfileId: null,

    initialize: () => {
      const saved = loadFromStorage<AttemptRecord[]>('attempts') || []
      const pending = loadFromStorage<AttemptRecord[]>('pendingAttempts') || []
      set({ attempts: saved, pendingSync: pending })
    },

    setProfileId: (profileId) => {
      const { syncTimeoutId, currentProfileId, pendingSync } = get()

      // Clear existing timeout
      if (syncTimeoutId) {
        clearTimeout(syncTimeoutId)
      }

      // Flush pending sync to old profile before switching
      if (currentProfileId && currentProfileId !== profileId && pendingSync.length > 0) {
        get().syncToCloud(currentProfileId)
      }

      set({ currentProfileId: profileId, syncTimeoutId: null })
    },

    recordAttempt: (params) => {
      const { syncTimeoutId, currentProfileId } = get()

      const attempt: AttemptRecord = {
        id: crypto.randomUUID(),
        factKey: params.factKey,
        timestamp: new Date().toISOString(),
        correct: params.correct,
        responseTimeMs: params.responseTimeMs,
        inputMethod: params.inputMethod,
        hintShown: params.hintShown,
        firstInputMs: params.firstInputMs,
        profileId: params.profileId || currentProfileId || undefined,
      }

      set((state) => {
        const attempts = [...state.attempts, attempt]
        const pendingSync = [...state.pendingSync, attempt]
        saveToStorage('attempts', attempts)
        saveToStorage('pendingAttempts', pendingSync)
        return { attempts, pendingSync }
      })

      // Debounced sync to cloud
      if (currentProfileId) {
        if (syncTimeoutId) {
          clearTimeout(syncTimeoutId)
        }
        const newTimeoutId = window.setTimeout(() => {
          get().syncToCloud(currentProfileId)
        }, SYNC_DEBOUNCE_MS)
        set({ syncTimeoutId: newTimeoutId })
      }
    },

    getAttemptsByDate: (date) => {
      const { attempts, currentProfileId } = get()
      return attempts.filter((a) =>
        matchesProfile(a, currentProfileId) &&
        getDateKeyFromTimestamp(a.timestamp) === date
      )
    },

    getDailySummaries: (days) => {
      const { attempts, currentProfileId } = get()
      const summaries: Map<string, DailySummary> = new Map()

      for (const attempt of attempts) {
        if (!matchesProfile(attempt, currentProfileId)) continue
        if (!isWithinDays(attempt.timestamp, days)) continue

        const date = getDateKeyFromTimestamp(attempt.timestamp)
        const existing = summaries.get(date) || {
          date,
          attemptCount: 0,
          correctCount: 0,
          factsAttempted: [],
          newMastered: [],
        }

        existing.attemptCount++
        if (attempt.correct) existing.correctCount++
        if (!existing.factsAttempted.includes(attempt.factKey)) {
          existing.factsAttempted.push(attempt.factKey)
        }

        summaries.set(date, existing)
      }

      return Array.from(summaries.values()).sort(
        (a, b) => b.date.localeCompare(a.date)
      )
    },

    getFactAttempts: (factKey) => {
      const { attempts, currentProfileId } = get()
      return attempts.filter((a) =>
        matchesProfile(a, currentProfileId) && a.factKey === factKey
      )
    },

    getStreakDays: () => {
      const summaries = get().getDailySummaries(365)
      if (summaries.length === 0) return 0

      let streak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dateKey = getLocalDateKey(checkDate)

        const hasPractice = summaries.some((s) => s.date === dateKey)
        if (hasPractice) {
          streak++
        } else if (i > 0) {
          break
        }
      }

      return streak
    },

    getTodayStats: () => {
      const today = getLocalDateKey()
      const todayAttempts = get().getAttemptsByDate(today)
      const correct = todayAttempts.filter((a) => a.correct).length
      return {
        attempts: todayAttempts.length,
        correct,
        accuracy: todayAttempts.length > 0
          ? Math.round((correct / todayAttempts.length) * 100)
          : 0,
      }
    },

    clearOldAttempts: () => {
      const { currentProfileId } = get()
      set((state) => {
        const filtered = state.attempts.filter((a) =>
          !matchesProfile(a, currentProfileId) || isWithinDays(a.timestamp, MAX_LOCAL_DAYS)
        )
        saveToStorage('attempts', filtered)
        return { attempts: filtered }
      })
    },

    clearForProfileSwitch: () => {
      // Flush pending attempts to the old profile before clearing
      get().setProfileId(null)
      set({
        pendingSync: [],
        lastSyncTimestamp: null,
      })
      saveToStorage('pendingAttempts', [])
    },

    // Push pending attempts for the signed-in profile; no-op when signed out.
    flush: () => {
      const { currentProfileId } = get()
      if (currentProfileId) get().syncToCloud(currentProfileId)
    },

    syncToCloud: async (profileId) => {
      const { pendingSync } = get()
      if (pendingSync.length === 0) return

      set({ syncStatus: 'syncing' })

      try {
        const body = JSON.stringify({
          attempts: pendingSync.map((a) => ({ ...a, profileId })),
        })
        const response = await fetch('/api/attempts/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          // Survive a page that closes right after the flush is fired — unless
          // the backlog is too big for keepalive, which would reject outright
          // and strand the queue for good.
          keepalive: canKeepalive(body),
        })

        if (!response.ok) throw new Error('Sync failed')

        // Drop only what this POST carried: an attempt recorded while it was
        // in flight stays queued for the next sync instead of vanishing.
        const syncedIds = new Set(pendingSync.map((a) => a.id))
        set((state) => {
          const remaining = state.pendingSync.filter((a) => !syncedIds.has(a.id))
          saveToStorage('pendingAttempts', remaining)
          return { pendingSync: remaining, syncStatus: 'synced' }
        })
      } catch {
        set({ syncStatus: 'error' })
      }
    },

    fetchFromCloud: async (profileId) => {
      const { lastSyncTimestamp } = get()

      try {
        const url = new URL('/api/attempts', window.location.origin)
        url.searchParams.set('profileId', profileId)
        if (lastSyncTimestamp) {
          url.searchParams.set('since', String(new Date(lastSyncTimestamp).getTime()))
        }

        const response = await fetch(url)
        if (!response.ok) throw new Error('Fetch failed')

        const { attempts: cloudAttempts } = await response.json()

        set((state) => {
          const existingIds = new Set(state.attempts.map((a) => a.id))
          const newAttempts = cloudAttempts.filter(
            (a: AttemptRecord) => !existingIds.has(a.id)
          )
          const merged = [...state.attempts, ...newAttempts].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          saveToStorage('attempts', merged)
          return {
            attempts: merged,
            lastSyncTimestamp: new Date().toISOString(),
            syncStatus: 'synced',
          }
        })

        // Push any pending local attempts to cloud
        const { pendingSync } = get()
        if (pendingSync.length > 0) {
          get().syncToCloud(profileId)
        }
      } catch {
        set({ syncStatus: 'offline' })
      }
    },
  })
)
