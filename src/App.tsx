import { useEffect } from 'react'
import { useProgressStore, useGardenStore, useSessionStore, useFocusTablesStore } from './stores'
import { Layout } from './components/common'
import { PracticeView, LearnView, GardenViewPage } from './views'

function App() {
  const { initialize: initProgress, initialized } = useProgressStore()
  const { initialize: initGarden } = useGardenStore()
  const { initialize: initFocusTables } = useFocusTablesStore()
  const { mode } = useSessionStore()

  useEffect(() => {
    initProgress()
    initGarden()
    initFocusTables()
  }, [initProgress, initGarden, initFocusTables])

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
