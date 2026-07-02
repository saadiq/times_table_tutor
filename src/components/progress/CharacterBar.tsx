import { motion } from 'framer-motion'
import { CircleDashed } from 'lucide-react'
import { useActiveOperation } from '../../hooks'
import { getSceneTheme } from './sceneThemes'

type CharacterBarProps = {
  revealedTables: number[]
  onCharacterTap?: (table: number) => void
}

export function CharacterBar({ revealedTables, onCharacterTap }: CharacterBarProps) {
  const theme = getSceneTheme(useActiveOperation().id)
  const discoveredCount = revealedTables.length

  return (
    <div
      className="bg-white/90 backdrop-blur-sm px-4 py-3 border-t border-gray-100"
      role="region"
      aria-label="Discovered characters"
    >
      {/* Character icons row */}
      <div className="flex justify-center gap-1.5 mb-2" role="list" aria-label="Character collection">
        {theme.characters.map((char) => {
          const isRevealed = revealedTables.includes(char.table)
          const Icon = char.icon

          return (
            <motion.button
              key={char.table}
              onClick={() => isRevealed && onCharacterTap?.(char.table)}
              disabled={!isRevealed}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isRevealed
                  ? 'bg-garden-100 text-garden-600 hover:bg-garden-200'
                  : 'bg-gray-100 text-gray-300'
              }`}
              whileTap={isRevealed ? { scale: 0.9 } : undefined}
              title={isRevealed ? `${char.name} (${char.table}s)` : `??? (${char.table}s)`}
              aria-label={isRevealed ? `${char.name} - ${char.table} times table mastered` : `Undiscovered character for ${char.table} times table`}
              role="listitem"
            >
              {isRevealed ? (
                <Icon size={16} aria-hidden="true" />
              ) : (
                <CircleDashed size={16} className="opacity-40" aria-hidden="true" />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Progress text */}
      <p className="text-center text-sm text-gray-500" aria-live="polite">
        {discoveredCount === 0 ? (
          'Practice to discover friends!'
        ) : discoveredCount === 12 ? (
          <span className="text-garden-600 font-medium">All 12 friends discovered!</span>
        ) : (
          <>
            <span className="font-medium text-gray-700">{discoveredCount}</span> of 12 friends
            discovered
          </>
        )}
      </p>
    </div>
  )
}
