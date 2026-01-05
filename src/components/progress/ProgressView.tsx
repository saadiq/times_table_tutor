import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Star, BarChart3 } from 'lucide-react'
import { useProgressStore } from '../../stores'
import { useProgressViewStore, type PendingReveals, type RevealStep } from '../../stores/progressViewStore'
import { ProgressScene } from './ProgressScene'
import { RevealSequence } from './RevealSequence'
import { CharacterBar } from './CharacterBar'
import { StatsSheet } from './StatsSheet'

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
  const [debugMode, setDebugMode] = useState(false)
  const [debugValues, setDebugValues] = useState({ facts: 0, tier: 0, tables: 0 })
  const [showStats, setShowStats] = useState(false)

  // Initialize store
  useEffect(() => {
    initialize()
  }, [initialize])

  // Compute live values: debug mode > overrides > store values
  const liveRevealedFacts = debugMode ? debugValues.facts : (overrides.facts ?? lastRevealedFactCount)
  const liveRevealedTables = debugMode ? Array.from({ length: debugValues.tables }, (_, i) => i + 1) : (overrides.tables ?? revealedTables)
  const liveRevealedTier = debugMode ? debugValues.tier : (overrides.tier ?? lastRevealedTier)

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
        <button
          onClick={() => setShowStats(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-600"
        >
          <BarChart3 size={16} />
          <span>Stats</span>
        </button>
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

      {/* Stats sheet */}
      <AnimatePresence>
        {showStats && (
          <StatsSheet isOpen={showStats} onClose={() => setShowStats(false)} />
        )}
      </AnimatePresence>

      {/* Debug panel (dev mode only) */}
      {import.meta.env.DEV && (
        <Fragment>
          {/* Hidden toggle - triple tap header */}
          <button
            onClick={() => setDebugMode((d) => !d)}
            className="fixed top-2 right-2 w-8 h-8 opacity-10 hover:opacity-50"
            aria-label="Toggle debug mode"
          />
          {debugMode && (
            <div className="fixed bottom-20 left-4 right-4 bg-black/90 text-white p-4 rounded-xl text-sm z-50">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold">Scene Debug</span>
                <button onClick={() => setDebugMode(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <label className="block mb-2">
                Facts: {debugValues.facts}/144
                <input
                  type="range"
                  min="0"
                  max="144"
                  value={debugValues.facts}
                  onChange={(e) => setDebugValues((v) => ({ ...v, facts: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
              </label>
              <label className="block mb-2">
                Tier: {debugValues.tier}/4
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={debugValues.tier}
                  onChange={(e) => setDebugValues((v) => ({ ...v, tier: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
              </label>
              <label className="block">
                Animals: {debugValues.tables}/12
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={debugValues.tables}
                  onChange={(e) => setDebugValues((v) => ({ ...v, tables: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
              </label>
            </div>
          )}
        </Fragment>
      )}
    </div>
  )
}
