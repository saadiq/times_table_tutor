import { vi } from 'vitest'
import type { Mock } from 'vitest'
import { useProfileStore } from '../stores/profileStore'
import type { FactProgressSync, Profile } from '../types/api'

export type FetchSignature = (input: string, init: RequestInit) => Promise<Response>
export type FetchMock = Mock<FetchSignature>

/** Disk key for the bucketed pending progress queues. */
export const PENDING_KEY = 'ttt_pending_progress_sync'

export function makeProfile(id: string): Profile {
  return { id, name: id, icon: 'cat', color: 'garden-500', lastActive: 0, createdAt: 0 }
}

export function makeSyncFact(
  fact: string,
  overrides: Partial<FactProgressSync> = {}
): FactProgressSync {
  return {
    fact,
    curriculum: 'multiply',
    confidence: 'learning',
    correctCount: 1,
    incorrectCount: 0,
    skippedCount: 0,
    lastSeen: 1750000000000,
    lastCorrect: 1750000000000,
    recentAttempts: [],
    preferredStrategy: null,
    ...overrides,
  }
}

export function noContent(): Response {
  return {
    ok: true,
    status: 204,
    headers: { get: () => '0' },
    text: async () => '',
    json: async () => ({}),
  } as unknown as Response
}

export function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response
}

export function okFetch(): FetchMock {
  return vi.fn<FetchSignature>(async () => noContent())
}

export function failingFetch(): FetchMock {
  return vi.fn<FetchSignature>().mockRejectedValue(new Error('offline'))
}

/** Fails the first flush, then lets the retry through. */
export function retriableFetch(): FetchMock {
  return vi
    .fn<FetchSignature>()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(noContent())
}

export function lastFetchInit(mock: FetchMock): RequestInit {
  return mock.mock.calls[mock.mock.calls.length - 1][1]
}

export function readBuckets(): Record<string, FactProgressSync[]> {
  const raw = localStorage.getItem(PENDING_KEY)
  return raw ? JSON.parse(raw) : {}
}

/** Fact keys persisted for one profile, in queue order. */
export function persistedFactKeys(profileId: string): string[] {
  return (readBuckets()[profileId] ?? []).map((f) => f.fact)
}

export function writeBucket(profileId: string, facts: FactProgressSync[]): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify({ ...readBuckets(), [profileId]: facts }))
}

export function resetProfileStore(): void {
  const { syncTimeoutId } = useProfileStore.getState()
  if (syncTimeoutId) clearTimeout(syncTimeoutId)
  useProfileStore.setState({
    currentProfile: null,
    profiles: [],
    isLoading: false,
    error: null,
    verifyingProfileId: null,
    verifyError: null,
    pendingProgressSync: [],
    syncTimeoutId: null,
  })
}
