// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useProfileStore } from './profileStore'
import {
  PENDING_KEY,
  SESSION_KEY,
  errorResponse,
  failingFetch,
  jsonResponse,
  lastFetchInit,
  makeProfile,
  makeSyncFact,
  noContent,
  okFetch,
  persistedFactKeys,
  readBuckets,
  resetProfileStore,
  retriableFetch,
} from '../test/syncFixtures'
import type { FetchSignature } from '../test/syncFixtures'

describe('profileStore progress sync queue', () => {
  beforeEach(() => {
    localStorage.clear()
    resetProfileStore()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('persists the queued facts under the owning profile id', () => {
    vi.stubGlobal('fetch', okFetch())
    useProfileStore.setState({ currentProfile: makeProfile('kid-a') })

    useProfileStore.getState().queueProgressSync(makeSyncFact('7x8'))
    useProfileStore.getState().queueProgressSync(makeSyncFact('6x9'))
    // Re-queueing a fact replaces it rather than duplicating
    useProfileStore.getState().queueProgressSync(makeSyncFact('7x8', { correctCount: 4 }))

    expect(persistedFactKeys('kid-a')).toEqual(['6x9', '7x8'])
    expect(readBuckets()['kid-a'].find((f) => f.fact === '7x8')?.correctCount).toBe(4)
  })

  it('clears the in-memory and persisted queues after a successful flush', async () => {
    const fetchMock = okFetch()
    vi.stubGlobal('fetch', fetchMock)
    useProfileStore.setState({ currentProfile: makeProfile('kid-a') })

    useProfileStore.getState().queueProgressSync(makeSyncFact('7x8'))
    await useProfileStore.getState().flushProgressSync()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/profiles/kid-a/progress')
    expect(useProfileStore.getState().pendingProgressSync).toEqual([])
    expect(localStorage.getItem(PENDING_KEY)).toBeNull()
  })

  it('keeps the persisted queue and retries after a failed flush', async () => {
    vi.useFakeTimers()
    const fetchMock = retriableFetch()
    vi.stubGlobal('fetch', fetchMock)
    useProfileStore.setState({ currentProfile: makeProfile('kid-a') })

    useProfileStore.getState().queueProgressSync(makeSyncFact('7x8'))
    await useProfileStore.getState().flushProgressSync()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(useProfileStore.getState().pendingProgressSync.map((f) => f.fact)).toEqual(['7x8'])
    expect(persistedFactKeys('kid-a')).toEqual(['7x8'])

    await vi.advanceTimersByTimeAsync(10000)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(useProfileStore.getState().pendingProgressSync).toEqual([])
    expect(localStorage.getItem(PENDING_KEY)).toBeNull()
    vi.useRealTimers()
  })

  it('does not pile up retry timers when a queue lands mid-retry', async () => {
    vi.useFakeTimers()
    const fetchMock = retriableFetch()
    vi.stubGlobal('fetch', fetchMock)
    useProfileStore.setState({ currentProfile: makeProfile('kid-a') })

    useProfileStore.getState().queueProgressSync(makeSyncFact('7x8'))
    await useProfileStore.getState().flushProgressSync()
    // A fresh answer supersedes the pending retry with its own debounce
    useProfileStore.getState().queueProgressSync(makeSyncFact('6x9'))

    await vi.advanceTimersByTimeAsync(20000)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem(PENDING_KEY)).toBeNull()
    vi.useRealTimers()
  })

  it('does not re-queue a failed flush into the profile that signed in next', async () => {
    vi.useFakeTimers()
    const fetchMock = failingFetch()
    vi.stubGlobal('fetch', fetchMock)
    useProfileStore.setState({ currentProfile: makeProfile('kid-a') })

    useProfileStore.getState().queueProgressSync(makeSyncFact('7x8'))
    const flush = useProfileStore.getState().flushProgressSync()
    // Another child signs in while the PUT is in flight
    useProfileStore.setState({ currentProfile: makeProfile('kid-b') })
    await flush

    expect(useProfileStore.getState().pendingProgressSync).toEqual([])
    expect(Object.keys(readBuckets())).toEqual(['kid-a'])

    await vi.advanceTimersByTimeAsync(20000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('keeps facts queued while a flush was in flight out of the delivered set', async () => {
    let release: (() => void) | undefined
    const fetchMock = vi.fn(async () => {
      await new Promise<void>((resolve) => { release = resolve })
      return noContent()
    })
    vi.stubGlobal('fetch', fetchMock)
    useProfileStore.setState({ currentProfile: makeProfile('kid-a') })

    useProfileStore.getState().queueProgressSync(makeSyncFact('7x8'))
    const flush = useProfileStore.getState().flushProgressSync()
    // A newer copy of the same fact is queued before the PUT resolves
    useProfileStore.getState().queueProgressSync(makeSyncFact('7x8', { correctCount: 9 }))
    release?.()
    await flush

    expect(readBuckets()['kid-a']?.map((f) => f.correctCount)).toEqual([9])
  })

  it('drains the queue and persisted bucket when the current profile is deleted', async () => {
    vi.stubGlobal('fetch', okFetch())
    useProfileStore.setState({ currentProfile: makeProfile('kid-a') })
    useProfileStore.getState().queueProgressSync(makeSyncFact('7x8'))

    await useProfileStore.getState().deleteProfile('kid-a')

    expect(readBuckets()).toEqual({})
    expect(useProfileStore.getState().pendingProgressSync).toEqual([])
    expect(useProfileStore.getState().currentProfile).toBeNull()
  })

  it('sends normal-sized flushes with keepalive so a closing page still delivers', async () => {
    const fetchMock = okFetch()
    vi.stubGlobal('fetch', fetchMock)
    useProfileStore.setState({ currentProfile: makeProfile('kid-a') })

    useProfileStore.getState().queueProgressSync(makeSyncFact('7x8'))
    await useProfileStore.getState().flushProgressSync()

    expect(lastFetchInit(fetchMock).keepalive).toBe(true)
  })

  it('drops keepalive for payloads past the 64KB browser cap', async () => {
    const fetchMock = okFetch()
    vi.stubGlobal('fetch', fetchMock)
    useProfileStore.setState({ currentProfile: makeProfile('kid-a') })

    useProfileStore
      .getState()
      .queueProgressSync(makeSyncFact('7x8', { preferredStrategy: 'x'.repeat(70000) }))
    await useProfileStore.getState().flushProgressSync()

    expect(lastFetchInit(fetchMock).keepalive).toBe(false)
  })
})

describe('profileStore updateProfile', () => {
  const updated = {
    id: 'kid-a',
    name: 'Ada',
    icon: 'owl',
    color: 'sky-400',
    createdAt: 0,
    lastActive: 0,
  }

  function signIn() {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: 'kid-a', icon: 'cat' }))
    useProfileStore.setState({
      currentProfile: makeProfile('kid-a'),
      profiles: [{ id: 'kid-a', name: 'kid-a', color: 'garden-500', lastActive: 0 }],
    })
  }

  function savedSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY)!)
  }

  beforeEach(() => {
    localStorage.clear()
    resetProfileStore()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('PATCHes the profile and writes the new icon to the saved session', async () => {
    const fetchMock = vi.fn<FetchSignature>(async () => jsonResponse(updated))
    vi.stubGlobal('fetch', fetchMock)
    signIn()

    await useProfileStore.getState().updateProfile({
      currentIcon: 'cat',
      name: 'Ada',
      icon: 'owl',
      color: 'sky-400',
    })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/profiles/kid-a')
    expect(lastFetchInit(fetchMock).method).toBe('PATCH')
    // The load-bearing assertion: a stale cached icon makes the next launch
    // auto-login with a dead password and dump the child at the picker.
    expect(savedSession()).toEqual({ profileId: 'kid-a', icon: 'owl' })
  })

  it('updates the current profile and its entry in the cached list', async () => {
    vi.stubGlobal('fetch', vi.fn<FetchSignature>(async () => jsonResponse(updated)))
    signIn()

    await useProfileStore.getState().updateProfile({
      currentIcon: 'cat',
      name: 'Ada',
      icon: 'owl',
      color: 'sky-400',
    })

    expect(useProfileStore.getState().currentProfile).toEqual(updated)
    expect(useProfileStore.getState().profiles).toEqual([
      { id: 'kid-a', name: 'Ada', color: 'sky-400', lastActive: 0 },
    ])
  })

  it('leaves the session and current profile untouched when the server rejects it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<FetchSignature>(async () => errorResponse(409, { error: 'Name already taken' }))
    )
    signIn()

    await expect(
      useProfileStore.getState().updateProfile({
        currentIcon: 'cat',
        name: 'Taken',
        icon: 'owl',
        color: 'sky-400',
      })
    ).rejects.toMatchObject({ status: 409 })

    expect(savedSession()).toEqual({ profileId: 'kid-a', icon: 'cat' })
    expect(useProfileStore.getState().currentProfile?.name).toBe('kid-a')
  })

  it('rejects when no profile is signed in', async () => {
    const fetchMock = vi.fn<FetchSignature>(async () => jsonResponse(updated))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      useProfileStore.getState().updateProfile({
        currentIcon: 'cat',
        name: 'Ada',
        icon: 'owl',
        color: 'sky-400',
      })
    ).rejects.toThrow()

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
