import { useEffect } from 'react'
import { useProgressStore, useGardenStore, useSessionStore, useFocusTablesStore, useAttemptsStore } from './stores'
import { useProfileStore } from './stores/profileStore'
import { Layout } from './components/common'
import { ProfilePicker } from './components/common/ProfilePicker'
import { PracticeView, LearnView, GardenViewPage } from './views'

function App() {
  const currentProfile = useProfileStore((s) => s.currentProfile)
  const { initialize: initProgress, initialized } = useProgressStore()
  const { initialize: initGarden } = useGardenStore()
  const { initialize: initFocusTables } = useFocusTablesStore()
  const initializeAttempts = useAttemptsStore((s) => s.initialize)
  const fetchFromCloud = useAttemptsStore((s) => s.fetchFromCloud)
  const setProfileId = useAttemptsStore((s) => s.setProfileId)
  const { mode } = useSessionStore()

  useEffect(() => {
    initProgress()
    initGarden()
    initFocusTables()
    initializeAttempts()
  }, [initProgress, initGarden, initFocusTables, initializeAttempts])

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
      {mode === 'learn' && <LearnView />}
      {mode === 'practice' && <PracticeView />}
      {mode === 'garden' && <GardenViewPage />}
    </Layout>
  )
}

export default App
