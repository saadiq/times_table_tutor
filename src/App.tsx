import { useEffect } from 'react'
import { useProgressStore, useGardenStore, useSessionStore, useFocusTablesStore, useAttemptsStore, useProgressViewStore, useSettingsStore, useCurriculumStore } from './stores'
import { useProfileStore } from './stores/profileStore'
import { Layout } from './components/common'
import { ProfilePicker } from './components/common/ProfilePicker'
import { PracticeView, LearnView, GardenViewPage } from './views'

function App() {
  const currentProfile = useProfileStore((s) => s.currentProfile)
  const { initialize: initProgress, initialized } = useProgressStore()
  const { initialize: initGarden } = useGardenStore()
  const { initialize: initFocusTables } = useFocusTablesStore()
  const { initialize: initProgressView } = useProgressViewStore()
  const { initialize: initSettings } = useSettingsStore()
  const initializeAttempts = useAttemptsStore((s) => s.initialize)
  const restorePendingSync = useProfileStore((s) => s.restorePendingSync)
  const fetchFromCloud = useAttemptsStore((s) => s.fetchFromCloud)
  const setProfileId = useAttemptsStore((s) => s.setProfileId)
  const { mode } = useSessionStore()
  const { initialize: initCurriculum } = useCurriculumStore()
  const activeCurriculum = useCurriculumStore((s) => s.active)

  useEffect(() => {
    initCurriculum()
    initProgress()
    initGarden()
    initFocusTables()
    initProgressView()
    initializeAttempts()
    initSettings()
    // Replay a progress queue a previous session couldn't deliver. The sign-in
    // path waits on this same replay, so a verify read can't overtake it.
    restorePendingSync()
  }, [initCurriculum, initProgress, initGarden, initFocusTables, initProgressView, initializeAttempts, initSettings, restorePendingSync])

  // Push queued work before the page goes away — a debounced sync would
  // otherwise die with the tab
  useEffect(() => {
    const flush = () => {
      useProfileStore.getState().flushProgressSync()
      useAttemptsStore.getState().flush()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  // Sync attempts when profile is selected
  useEffect(() => {
    if (currentProfile?.id) {
      setProfileId(currentProfile.id)
      fetchFromCloud(currentProfile.id)
    } else {
      setProfileId(null)
    }
  }, [currentProfile?.id, fetchFromCloud, setProfileId])

  // Gate: show profile picker if no profile selected
  if (!currentProfile) {
    return <ProfilePicker />
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-garden-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      {mode === 'learn' && <LearnView key={activeCurriculum} />}
      {mode === 'practice' && <PracticeView key={activeCurriculum} />}
      {mode === 'garden' && <GardenViewPage key={activeCurriculum} />}
    </Layout>
  )
}

export default App
