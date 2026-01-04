import { motion, AnimatePresence } from 'framer-motion'
import { X, Palette, Lock, Check, Coins } from 'lucide-react'
import { useGardenStore } from '../../stores'
import { THEME_COSTS } from '../../lib/constants'
import { Button } from '../common'
import type { GardenTheme } from '../../types'

type ThemePickerProps = {
  isOpen: boolean
  onClose: () => void
}

const themeInfo: Record<GardenTheme, { name: string; description: string; colors: string }> = {
  flower: {
    name: 'Flower Garden',
    description: 'A sunny meadow with colorful blooms',
    colors: 'bg-gradient-to-r from-pink-200 via-green-100 to-sky-200',
  },
  forest: {
    name: 'Enchanted Forest',
    description: 'A mystical woodland setting',
    colors: 'bg-gradient-to-r from-green-300 via-green-200 to-emerald-200',
  },
  underwater: {
    name: 'Ocean Floor',
    description: 'A peaceful underwater scene',
    colors: 'bg-gradient-to-r from-blue-300 via-cyan-200 to-teal-200',
  },
  space: {
    name: 'Space Station',
    description: 'A garden among the stars',
    colors: 'bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-300',
  },
}

export function ThemePicker({ isOpen, onClose }: ThemePickerProps) {
  const { coins, currentTheme, unlockedThemes, setTheme, unlockTheme, spendCoins } = useGardenStore()
  const themes: GardenTheme[] = ['flower', 'forest', 'underwater', 'space']

  const handleThemeSelect = (theme: GardenTheme) => {
    if (unlockedThemes.includes(theme)) {
      setTheme(theme)
      onClose()
    }
  }

  const handleUnlock = (theme: GardenTheme) => {
    const cost = THEME_COSTS[theme]
    if (spendCoins(cost)) {
      unlockTheme(theme)
      setTheme(theme)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Palette size={20} className="text-garden-500" />
                <h2 className="font-semibold text-gray-800">Garden Themes</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-warm-600">
                  <Coins size={16} />
                  <span className="font-medium">{coins}</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Theme list */}
            <div className="p-4 space-y-3">
              {themes.map((theme) => {
                const info = themeInfo[theme]
                const isUnlocked = unlockedThemes.includes(theme)
                const isCurrent = currentTheme === theme
                const cost = THEME_COSTS[theme]
                const canAfford = coins >= cost

                return (
                  <motion.div
                    key={theme}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`p-3 rounded-xl border-2 ${
                      isCurrent
                        ? 'border-garden-400 bg-garden-50'
                        : isUnlocked
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Theme preview */}
                      <div className={`w-12 h-12 rounded-lg ${info.colors}`} />

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{info.name}</span>
                          {isCurrent && (
                            <Check size={16} className="text-garden-500" />
                          )}
                          {!isUnlocked && (
                            <Lock size={14} className="text-gray-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{info.description}</p>
                      </div>

                      {/* Action */}
                      {isCurrent ? (
                        <span className="text-xs text-garden-600 font-medium">Active</span>
                      ) : isUnlocked ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleThemeSelect(theme)}
                          className="text-xs py-1 px-3"
                        >
                          Select
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => handleUnlock(theme)}
                          disabled={!canAfford}
                          className="text-xs py-1 px-3 flex items-center gap-1"
                        >
                          <Coins size={12} />
                          {cost}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
