import { motion } from 'framer-motion'
import {
  Bug,
  Bird,
  Rabbit,
  Squirrel,
  Cat,
  CircleDashed,
} from 'lucide-react'
import { TABLE_CHARACTERS } from '../../stores/progressViewStore'

// Map table numbers to icons (using available Lucide icons)
// Some are approximations since Lucide doesn't have all animals
const CHARACTER_ICONS: Record<number, React.ComponentType<{ className?: string; size?: number }>> = {
  1: Bug,        // Ladybug
  2: Bird,       // Butterfly (approximation)
  3: Bird,       // Robin
  4: Squirrel,   // Squirrel
  5: Rabbit,     // Rabbit
  6: Cat,        // Fox (approximation)
  7: Bird,       // Owl (approximation)
  8: Rabbit,     // Deer (approximation)
  9: CircleDashed, // Hedgehog (approximation)
  10: Bird,      // Bluebird
  11: Cat,       // Badger (approximation)
  12: Cat,       // Cat
}

type CharacterBarProps = {
  revealedTables: number[]
  onCharacterTap?: (table: number) => void
}

export function CharacterBar({ revealedTables, onCharacterTap }: CharacterBarProps) {
  const discoveredCount = revealedTables.length

  return (
    <div className="bg-white/90 backdrop-blur-sm px-4 py-3 border-t border-gray-100">
      {/* Character icons row */}
      <div className="flex justify-center gap-1.5 mb-2">
        {TABLE_CHARACTERS.map((char) => {
          const isRevealed = revealedTables.includes(char.table)
          const Icon = CHARACTER_ICONS[char.table] || CircleDashed

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
            >
              {isRevealed ? (
                <Icon size={16} />
              ) : (
                <CircleDashed size={16} className="opacity-40" />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Progress text */}
      <p className="text-center text-sm text-gray-500">
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
