import { create } from 'zustand'
import type { AttemptRecord, DailySummary, InputMethod } from '../types'
import { saveToStorage, loadFromStorage } from '../lib/storage'

const MAX_LOCAL_DAYS = 30

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

type AttemptsState = {
  attempts: AttemptRecord[]
  pendingSync: AttemptRecord[]
  syncStatus: SyncStatus
  lastSyncTimestamp: string | null
}

type AttemptsActions = {
  initialize: () => void
  recordAttempt: (params: {
    factKey: string
    correct: boolean
    responseTimeMs: number
    inputMethod: InputMethod
    hintShown: boolean
    profileId?: string
  }) => void
  getAttemptsByDate: (date: string) => AttemptRecord[]
  getDailySummaries: (days: number) => DailySummary[]
  getFactAttempts: (factKey: string) => AttemptRecord[]
  getStreakDays: () => number
  getTodayStats: () => { attempts: number; correct: number; accuracy: number }
  clearOldAttempts: () => void
}

function generateId(): string {
  return crypto.randomUUID()
}

function getDateKey(timestamp: string): string {
  return timestamp.split('T')[0]
}

function isWithinDays(timestamp: string, days: number): boolean {
  const date = new Date(timestamp)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return date >= cutoff
}

export const useAttemptsStore = create<AttemptsState & AttemptsActions>(
  (set, get) => ({
    attempts: [],
    pendingSync: [],
    syncStatus: 'offline',
    lastSyncTimestamp: null,

    initialize: () => {
      const saved = loadFromStorage<AttemptRecord[]>('attempts') || []
      const pending = loadFromStorage<AttemptRecord[]>('pendingAttempts') || []
      set({ attempts: saved, pendingSync: pending })
    },

    recordAttempt: (params) => {
      const attempt: AttemptRecord = {
        id: generateId(),
        factKey: params.factKey,
        timestamp: new Date().toISOString(),
        correct: params.correct,
        responseTimeMs: params.responseTimeMs,
        inputMethod: params.inputMethod,
        hintShown: params.hintShown,
        profileId: params.profileId,
      }

      set((state) => {
        const attempts = [...state.attempts, attempt]
        const pendingSync = [...state.pendingSync, attempt]
        saveToStorage('attempts', attempts)
        saveToStorage('pendingAttempts', pendingSync)
        return { attempts, pendingSync }
      })
    },

    getAttemptsByDate: (date) => {
      return get().attempts.filter((a) => getDateKey(a.timestamp) === date)
    },

    getDailySummaries: (days) => {
      const attempts = get().attempts
      const summaries: Map<string, DailySummary> = new Map()

      for (const attempt of attempts) {
        if (!isWithinDays(attempt.timestamp, days)) continue

        const date = getDateKey(attempt.timestamp)
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
      return get().attempts.filter((a) => a.factKey === factKey)
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
        const dateKey = checkDate.toISOString().split('T')[0]

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
      const today = new Date().toISOString().split('T')[0]
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
      set((state) => {
        const filtered = state.attempts.filter((a) =>
          isWithinDays(a.timestamp, MAX_LOCAL_DAYS)
        )
        saveToStorage('attempts', filtered)
        return { attempts: filtered }
      })
    },
  })
)
