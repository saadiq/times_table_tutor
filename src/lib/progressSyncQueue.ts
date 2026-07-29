import { api } from './api'
import { saveToStorage, loadFromStorage, clearFromStorage } from './storage'
import type { FactProgressSync, Profile } from '../types/api'

const SYNC_DEBOUNCE_MS = 2000
const SYNC_RETRY_MS = 10000

/**
 * Disk copy of the undelivered progress queues, bucketed by the profile that
 * produced them. A shared tablet can hold one child's failed queue while the
 * next child practices, so nothing here may ever replace the whole slot: every
 * write merges into one bucket and leaves the others untouched.
 */
export type PersistedProgressQueues = Record<string, FactProgressSync[]>

function loadBuckets(): PersistedProgressQueues {
  const data = loadFromStorage<PersistedProgressQueues>('pendingProgressSync')
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const buckets: PersistedProgressQueues = {}
  for (const [profileId, facts] of Object.entries(data)) {
    if (Array.isArray(facts) && facts.length > 0) buckets[profileId] = facts
  }
  return buckets
}

function saveBuckets(buckets: PersistedProgressQueues): void {
  if (Object.keys(buckets).length === 0) {
    clearFromStorage('pendingProgressSync')
    return
  }
  saveToStorage('pendingProgressSync', buckets)
}

/** Merge facts into one profile's bucket; a newer copy of a fact replaces the older. */
export function persistQueuedFacts(profileId: string, facts: FactProgressSync[]): void {
  if (facts.length === 0) return
  const buckets = loadBuckets()
  const incoming = new Set(facts.map((f) => f.fact))
  const kept = (buckets[profileId] ?? []).filter((f) => !incoming.has(f.fact))
  buckets[profileId] = [...kept, ...facts]
  saveBuckets(buckets)
}

/**
 * Drop only the facts that were delivered exactly as persisted. Anything queued
 * while the request was in flight differs and stays on disk for the next flush.
 */
export function clearPersistedFacts(profileId: string, delivered: FactProgressSync[]): void {
  const buckets = loadBuckets()
  const bucket = buckets[profileId]
  if (!bucket) return

  const deliveredCopies = new Set(delivered.map((f) => JSON.stringify(f)))
  const remaining = bucket.filter((f) => !deliveredCopies.has(JSON.stringify(f)))
  if (remaining.length > 0) {
    buckets[profileId] = remaining
  } else {
    delete buckets[profileId]
  }
  saveBuckets(buckets)
}

/**
 * Drop a profile's whole bucket. Only for a deleted profile: its queue can
 * never be delivered again (the server rows are gone), so replaying it would
 * just fail on every launch forever.
 */
export function dropPersistedBucket(profileId: string): void {
  const buckets = loadBuckets()
  if (!(profileId in buckets)) return
  delete buckets[profileId]
  saveBuckets(buckets)
}

/** The slice of profileStore that owns the debounced progress push. */
export interface ProgressSyncSlice {
  pendingProgressSync: FactProgressSync[]
  syncTimeoutId: number | null
  queueProgressSync: (fact: FactProgressSync) => void
  flushProgressSync: () => Promise<void>
  restorePendingSync: () => Promise<void>
}

type SyncSet = (
  partial:
    | Partial<ProgressSyncSlice>
    | ((state: ProgressSyncSlice) => Partial<ProgressSyncSlice>)
) => void

type SyncGet = () => ProgressSyncSlice & { currentProfile: Profile | null }

/**
 * Push every bucket to the profile that saved it — a different child may be
 * signed in now — and never merge them into the in-memory queue. Buckets are
 * independent, so they replay in parallel: sign-in waits on this, and one
 * profile's slow failure must not stall the others.
 */
async function replayPersistedQueues(): Promise<void> {
  await Promise.all(
    Object.entries(loadBuckets()).map(async ([profileId, facts]) => {
      try {
        await api.syncProgress(profileId, facts)
        clearPersistedFacts(profileId, facts)
      } catch (err) {
        // Leave it on disk for the next launch
        console.error('Failed to replay pending progress sync:', err)
      }
    })
  )
}

export function createProgressSyncSlice(
  set: SyncSet,
  get: SyncGet
): ProgressSyncSlice {
  // Shared by the mount effect and the sign-in path, which both wait on the
  // replay so a server read can never overtake it.
  let replayInFlight: Promise<void> | null = null

  return {
    pendingProgressSync: [],
    syncTimeoutId: null,

    queueProgressSync: (fact) => {
      const { syncTimeoutId, currentProfile } = get()
      if (!currentProfile) return

      // Clear existing timeout (debounce, or a pending retry)
      if (syncTimeoutId) {
        clearTimeout(syncTimeoutId)
      }

      // Add to pending queue (replace if same fact), writing through to
      // storage so an unexpected close doesn't take the queue with it
      set((state) => ({
        pendingProgressSync: [
          ...state.pendingProgressSync.filter((f) => f.fact !== fact.fact),
          fact,
        ],
      }))
      persistQueuedFacts(currentProfile.id, [fact])

      // Set new debounced sync
      const newTimeoutId = window.setTimeout(() => {
        get().flushProgressSync()
      }, SYNC_DEBOUNCE_MS)

      set({ syncTimeoutId: newTimeoutId })
    },

    flushProgressSync: async () => {
      const { currentProfile, pendingProgressSync, syncTimeoutId } = get()
      if (!currentProfile || pendingProgressSync.length === 0) return

      // Drop any debounce/retry timer so it can't fire on top of this flush
      if (syncTimeoutId) {
        clearTimeout(syncTimeoutId)
      }

      // The captured facts stay persisted until the PUT lands
      const factsToSync = [...pendingProgressSync]
      persistQueuedFacts(currentProfile.id, factsToSync)
      set({ pendingProgressSync: [], syncTimeoutId: null })

      try {
        await api.syncProgress(currentProfile.id, factsToSync)
        // Only the delivered copies leave the bucket; anything queued while the
        // PUT was in flight (by this child or after a profile switch) stays.
        clearPersistedFacts(currentProfile.id, factsToSync)
      } catch (err) {
        console.error('Failed to sync progress:', err)
        if (get().currentProfile?.id !== currentProfile.id) {
          // These facts belong to the profile that just signed out; they stay
          // on disk for next-launch recovery rather than leaking into the
          // queue of the child who signed in.
          return
        }

        // Re-queue on failure, letting any newer copy of a fact win
        set((state) => {
          const newer = new Set(state.pendingProgressSync.map((f) => f.fact))
          return {
            pendingProgressSync: [
              ...factsToSync.filter((f) => !newer.has(f.fact)),
              ...state.pendingProgressSync,
            ],
          }
        })

        // Retry so a transient failure doesn't strand the queue until the next
        // answer. One timer at a time: queueProgressSync and the next flush
        // both supersede it via syncTimeoutId.
        const retryId = window.setTimeout(() => {
          get().flushProgressSync()
        }, SYNC_RETRY_MS)
        set({ syncTimeoutId: retryId })
      }
    },

    restorePendingSync: () => {
      if (!replayInFlight) {
        replayInFlight = replayPersistedQueues().finally(() => {
          replayInFlight = null
        })
      }
      return replayInFlight
    },
  }
}
