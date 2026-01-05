import { useState } from 'react'
import { BookOpen, Target, TreeDeciduous, Settings, User } from 'lucide-react'
import * as Icons from 'lucide-react'
import { useSessionStore } from '../../stores'
import { useProfileStore } from '../../stores/profileStore'
import { SettingsModal } from './SettingsModal'
import type { AppMode } from '../../types'
import type { ProfileIcon } from '../../types/api'

const iconMap: Record<ProfileIcon, React.ComponentType<{ className?: string }>> = {
  cat: Icons.Cat,
  dog: Icons.Dog,
  bird: Icons.Bird,
  star: Icons.Star,
  heart: Icons.Heart,
  flower: Icons.Flower2,
  rocket: Icons.Rocket,
  sun: Icons.Sun,
  moon: Icons.Moon,
  fish: Icons.Fish,
  rabbit: Icons.Rabbit,
  bear: Icons.PawPrint,
}

const navItems: Array<{ mode: AppMode; icon: typeof BookOpen; label: string }> = [
  { mode: 'learn', icon: BookOpen, label: 'Learn' },
  { mode: 'practice', icon: Target, label: 'Practice' },
  { mode: 'garden', icon: TreeDeciduous, label: 'Tree' },
]

export function Navigation() {
  const { mode, setMode } = useSessionStore()
  const { currentProfile, clearProfile } = useProfileStore()
  const [showSettings, setShowSettings] = useState(false)

  const ProfileIconComponent = currentProfile
    ? iconMap[currentProfile.icon as ProfileIcon] || User
    : User

  return (
    <>
      <nav className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-2 safe-area-pb">
        <div className="flex justify-around max-w-md mx-auto">
          {currentProfile && (
            <button
              onClick={() => clearProfile()}
              className="flex flex-col items-center py-2 px-3 rounded-xl transition-colors min-w-[56px] text-gray-400 hover:text-gray-600"
              title="Switch profile"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center bg-${currentProfile.color}`}
              >
                <ProfileIconComponent className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs mt-1 font-medium truncate max-w-[48px]">
                {currentProfile.name}
              </span>
            </button>
          )}
          {navItems.map(({ mode: itemMode, icon: Icon, label }) => {
            const isActive = mode === itemMode
            return (
              <button
                key={itemMode}
                onClick={() => setMode(itemMode)}
                className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors min-w-[72px] ${
                  isActive
                    ? 'text-garden-600 bg-garden-50'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs mt-1 font-medium">{label}</span>
              </button>
            )
          })}
          <button
            onClick={() => setShowSettings(true)}
            className="flex flex-col items-center py-2 px-4 rounded-xl transition-colors min-w-[72px] text-gray-400 hover:text-gray-600"
          >
            <Settings size={24} strokeWidth={2} />
            <span className="text-xs mt-1 font-medium">Settings</span>
          </button>
        </div>
      </nav>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  )
}
