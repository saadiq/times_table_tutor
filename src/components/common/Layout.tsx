import { useState, type ReactNode } from 'react'
import { Settings } from 'lucide-react'
import { Navigation } from './Navigation'
import { SettingsModal } from './SettingsModal'

type LayoutProps = {
  children: ReactNode
  showNav?: boolean
}

export function Layout({ children, showNav = true }: LayoutProps) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-garden-50 to-sky-50">
      <header className="flex justify-end p-2">
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full hover:bg-white/50 transition-colors"
        >
          <Settings size={20} className="text-gray-500" />
        </button>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {showNav && <Navigation />}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}
