// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useProfileStore } from './profileStore'
import {
  failingFetch,
  jsonResponse,
  makeProfile,
  makeSyncFact,
  noContent,
  okFetch,
  persistedFactKeys,
  readBuckets,
  resetProfileStore,
  writeBucket,
} from '../test/syncFixtures'

const SESSION_KEY = 'ttt_session'

function profileData(id: string) {
  return {
    profile: makeProfile(id),
    facts: [],
    gardenItems: [],
    stats: { coins: 0, unlockedThemes: ['flower'], currentTheme: 'flower' },
  }
}

describe('profileStore pending-sync recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    resetProfileStore()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps another profile queue on disk when the next child queues facts', () => {
    vi.stubGlobal('fetch', okFetch())
    writeBucket('kid-a', [makeSyncFact('7x8'), makeSyncFact('6x9')])
    useProfileStore.setState({ currentProfile: makeProfile('kid-b') })

    useProfileStore.getState().queueProgressSync(makeSyncFact('3x4'))

    expect(persistedFactKeys('kid-a')).toEqual(['7x8', '6x9'])
    expect(persistedFactKeys('kid-b')).toEqual(['3x4'])
  })

  it('keeps a failed replay on disk when the same child queues new work', async () => {
    vi.stubGlobal('fetch', failingFetch())
    writeBucket('kid-a', [makeSyncFact('7x8')])

    await useProfileStore.getState().restorePendingSync()
    useProfileStore.setState({ currentProfile: makeProfile('kid-a') })
    useProfileStore.getState().queueProgressSync(makeSyncFact('6x9'))

    expect(persistedFactKeys('kid-a')).toEqual(['7x8', '6x9'])
  })

  it('replays every persisted profile queue and clears them', async () => {
    const fetchMock = okFetch()
    vi.stubGlobal('fetch', fetchMock)
    writeBucket('kid-a', [makeSyncFact('7x8')])
    writeBucket('kid-b', [makeSyncFact('3x4')])
    // A different child is signed in on this device now
    useProfileStore.setState({ currentProfile: makeProfile('kid-c') })

    await useProfileStore.getState().restorePendingSync()

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/api/profiles/kid-a/progress',
      '/api/profiles/kid-b/progress',
    ])
    expect(readBuckets()).toEqual({})
    expect(useProfileStore.getState().pendingProgressSync).toEqual([])
  })

  it('keeps a failed queue and clears the delivered one', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('kid-a') ? Promise.reject(new Error('offline')) : noContent()
    )
    vi.stubGlobal('fetch', fetchMock)
    writeBucket('kid-a', [makeSyncFact('7x8')])
    writeBucket('kid-b', [makeSyncFact('3x4')])

    await useProfileStore.getState().restorePendingSync()

    expect(Object.keys(readBuckets())).toEqual(['kid-a'])
  })

  it('holds the verify pull until the recovered queue has replayed', async () => {
    writeBucket('kid-a', [makeSyncFact('7x8')])
    localStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: 'kid-a', icon: 'cat' }))

    let releasePut: (() => void) | undefined
    const urls: string[] = []
    const fetchMock = vi.fn(async (url: string) => {
      urls.push(url)
      if (url.endsWith('/progress')) {
        await new Promise<void>((resolve) => { releasePut = resolve })
        return noContent()
      }
      return jsonResponse(profileData('kid-a'))
    })
    vi.stubGlobal('fetch', fetchMock)

    const restore = useProfileStore.getState().restoreSession()
    await Promise.resolve()
    // The verify read must not be issued while the replay is still in flight
    expect(urls).toEqual(['/api/profiles/kid-a/progress'])

    releasePut?.()
    await restore

    expect(urls).toEqual(['/api/profiles/kid-a/progress', '/api/profiles/kid-a/verify'])
    expect(readBuckets()).toEqual({})
  })

  it('replays once when the mount effect and the verify race each other', async () => {
    writeBucket('kid-a', [makeSyncFact('7x8')])
    localStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: 'kid-a', icon: 'cat' }))
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/progress') ? noContent() : jsonResponse(profileData('kid-a'))
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useProfileStore.getState()
    await Promise.all([store.restorePendingSync(), store.restoreSession()])

    const puts = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/progress'))
    expect(puts).toHaveLength(1)
  })
})
