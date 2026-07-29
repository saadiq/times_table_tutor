// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAttemptsStore } from './attemptsStore'
import type { AttemptRecord } from '../types'
import { lastFetchInit, noContent, okFetch } from '../test/syncFixtures'

function makeAttempt(id: string, factKey = '7x8'): AttemptRecord {
  return {
    id,
    factKey,
    timestamp: '2026-07-28T12:00:00.000Z',
    correct: true,
    responseTimeMs: 1200,
    inputMethod: 'number_pad',
    hintShown: false,
    profileId: 'kid-a',
  }
}

describe('attemptsStore cloud sync', () => {
  beforeEach(() => {
    localStorage.clear()
    useAttemptsStore.setState({
      attempts: [], pendingSync: [], syncStatus: 'offline',
      lastSyncTimestamp: null, syncTimeoutId: null, currentProfileId: null,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keepalives a normal-sized backlog so a closing page still delivers', async () => {
    const fetchMock = okFetch()
    vi.stubGlobal('fetch', fetchMock)
    useAttemptsStore.setState({ pendingSync: [makeAttempt('a1')] })

    await useAttemptsStore.getState().syncToCloud('kid-a')

    expect(lastFetchInit(fetchMock).keepalive).toBe(true)
    expect(useAttemptsStore.getState().pendingSync).toEqual([])
  })

  it('keeps attempts recorded while a sync was in flight queued for the next push', async () => {
    let release: (() => void) | undefined
    const fetchMock = vi.fn(async () => {
      await new Promise<void>((resolve) => { release = resolve })
      return noContent()
    })
    vi.stubGlobal('fetch', fetchMock)
    useAttemptsStore.setState({ pendingSync: [makeAttempt('a1')] })

    const sync = useAttemptsStore.getState().syncToCloud('kid-a')
    // A new answer lands before the POST resolves
    useAttemptsStore.setState((state) => ({
      pendingSync: [...state.pendingSync, makeAttempt('a2')],
    }))
    release?.()
    await sync

    expect(useAttemptsStore.getState().pendingSync.map((a) => a.id)).toEqual(['a2'])
  })

  it('drops keepalive for a backlog past the 64KB browser cap', async () => {
    const fetchMock = okFetch()
    vi.stubGlobal('fetch', fetchMock)
    // A long offline stretch: browsers reject an oversized keepalive body
    // outright, which would wedge the queue forever.
    const backlog = Array.from({ length: 500 }, (_, i) => makeAttempt(`a${i}`))
    useAttemptsStore.setState({ pendingSync: backlog })

    await useAttemptsStore.getState().syncToCloud('kid-a')

    expect(lastFetchInit(fetchMock).keepalive).toBe(false)
    expect(useAttemptsStore.getState().syncStatus).toBe('synced')
  })
})
