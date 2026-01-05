import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Star } from 'lucide-react'
import { useProgressStore } from '../../stores'
import { useProgressViewStore, type PendingReveals, type RevealStep } from '../../stores/progressViewStore'
import { ProgressScene } from './ProgressScene'
import { RevealSequence } from './RevealSequence'
import { CharacterBar } from './CharacterBar'

// Animation overrides during reveal sequence
type AnimationOverrides = {
  facts: number | null
  tables: number[] | null
  tier: number | null
}

export function ProgressView() {
  const { getFactsByConfidence, getMasteredTables } = useProgressStore()
  const { lastRevealedFactCount, revealedTables, lastRevealedTier, getPendingReveals, markRevealed, initialize } =
    useProgressViewStore()

  const [isRevealing, setIsRevealing] = useState(false)
  const [animatingCharacter, setAnimatingCharacter] = useState<number | null>(null)
  const [overrides, setOverrides] = useState<AnimationOverrides>({ facts: null, tables: null, tier: null })

  // Initialize store
  useEffect(() => {
    initialize()
  }, [initialize])

  // Compute live values: use overrides during animation, store values otherwise
  const liveRevealedFacts = overrides.facts ?? lastRevealedFactCount
  const liveRevealedTables = overrides.tables ?? revealedTables
  const liveRevealedTier = overrides.tier ?? lastRevealedTier

  // Derive pending reveals (only when not revealing)
  // Note: getPendingReveals internally reads store state, so it updates when store changes
  const pending = useMemo<PendingReveals | null>(() => {
    if (isRevealing) return null
    const p = getPendingReveals()
    const hasPending = p.newFacts > 0 || p.newTables.length > 0 || p.newTier !== null
    return hasPending ? p : null
  }, [getPendingReveals, isRevealing])

  // Get current progress count for header (confident + mastered)
  const confidentFacts = getFactsByConfidence('confident')
  const masteredFacts = getFactsByConfidence('mastered')
  const totalProgress = confidentFacts.length + masteredFacts.length

  const handleStartReveal = () => {
    // Snapshot current store values as starting point for animation
    setOverrides({
      facts: lastRevealedFactCount,
      tables: [...revealedTables],
      tier: lastRevealedTier,
    })
    setIsRevealing(true)
  }

  const handleStepReveal = useCallback((step: RevealStep) => {
    if (step.type === 'facts') {
      setOverrides((prev) => ({
        ...prev,
        facts: (prev.facts ?? lastRevealedFactCount) + step.count,
      }))
    } else if (step.type === 'character') {
      setAnimatingCharacter(step.table)
      setTimeout(() => {
        setOverrides((prev) => ({
          ...prev,
          tables: [...(prev.tables ?? revealedTables), step.table],
        }))
        setAnimatingCharacter(null)
      }, 800)
    } else if (step.type === 'tier') {
      setOverrides((prev) => ({ ...prev, tier: step.tier }))
    }
  }, [lastRevealedFactCount, revealedTables])

  const handleRevealComplete = useCallback(() => {
    // Persist all revealed state to store
    const completedTables = getMasteredTables()
    const currentTier = Math.min(4, Math.floor(totalProgress / 36))
    markRevealed(totalProgress, completedTables, currentTier)

    // Clear overrides so we use store values
    setOverrides({ facts: null, tables: null, tier: null })
    setIsRevealing(false)
  }, [getMasteredTables, markRevealed, totalProgress])

  const handleCharacterTap = (table: number) => {
    // Could replay a mini celebration or show info
    setAnimatingCharacter(table)
    setTimeout(() => setAnimatingCharacter(null), 1000)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Star size={20} className="text-warm-500" />
          <span className="font-semibold text-gray-800">
            {totalProgress} / 144
          </span>
        </div>
        <span className="text-sm text-gray-500">Your Learning Tree</span>
      </div>

      {/* Scene area */}
      <div className="flex-1 relative min-h-[400px]">
        <ProgressScene
          revealedFacts={liveRevealedFacts}
          revealedTables={liveRevealedTables}
          revealedTier={liveRevealedTier}
          animatingCharacter={animatingCharacter}
        />

        {/* Pending reveal prompt */}
        <AnimatePresence>
          {pending && !isRevealing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-x-4 top-1/3 flex flex-col items-center"
            >
              <button
                onClick={handleStartReveal}
                className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg text-center hover:scale-105 transition-transform active:scale-95"
              >
                <div className="flex items-center justify-center gap-2 text-garden-600 mb-2">
                  <Sparkles size={24} />
                  <span className="text-lg font-bold">New progress!</span>
                </div>
                <p className="text-gray-600 text-sm">
                  {pending.newTables.length > 0
                    ? `${pending.newTables.length} new ${pending.newTables.length === 1 ? 'friend' : 'friends'} to discover!`
                    : `${pending.newFacts} new ${pending.newFacts === 1 ? 'fact' : 'facts'} learned!`}
                </p>
                <div className="mt-3 text-garden-500 text-sm font-medium">
                  Tap to reveal →
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reveal sequence */}
        {isRevealing && pending && (
          <RevealSequence
            pending={pending}
            onStepReveal={handleStepReveal}
            onComplete={handleRevealComplete}
          />
        )}

        {/* Empty state */}
        {totalProgress === 0 && !pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center p-6 bg-white/90 backdrop-blur-sm rounded-2xl max-w-xs mx-4">
              <p className="text-gray-600">Your tree is waiting to grow!</p>
              <p className="text-sm text-gray-500 mt-2">
                Practice your times tables to bring it to life.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Character bar */}
      <CharacterBar
        revealedTables={liveRevealedTables}
        onCharacterTap={handleCharacterTap}
      />
    </div>
  )
}
