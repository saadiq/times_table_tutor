import { BookOpen, Target, Flower2 } from 'lucide-react'
import { useSessionStore } from '../../stores'
import type { AppMode } from '../../types'

const navItems: Array<{ mode: AppMode; icon: typeof BookOpen; label: string }> = [
  { mode: 'learn', icon: BookOpen, label: 'Learn' },
  { mode: 'practice', icon: Target, label: 'Practice' },
  { mode: 'garden', icon: Flower2, label: 'Garden' },
]

export function Navigation() {
  const { mode, setMode } = useSessionStore()

  return (
    <nav className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-2 safe-area-pb">
      <div className="flex justify-around max-w-md mx-auto">
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
      </div>
    </nav>
  )
}
