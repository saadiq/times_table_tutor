import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Star, BarChart3 } from 'lucide-react'
import { useProgressStore } from '../../stores'
import { useProgressViewStore, computeTier } from '../../stores/progressViewStore'
import { useActiveOperation } from '../../hooks'
import { getSceneTheme } from './sceneThemes'
import type { PendingReveals } from '../../types/scene'
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
  const theme = getSceneTheme(useActiveOperation().id)
  const { getFactsAtOrAbove, getMasteredTables } = useProgressStore()
  const {
    lastRevealedCount,
    revealedTables,
    peakTier,
    getPendingReveals,
    markRevealed,
    initialize,
    computeSceneState,
  } = useProgressViewStore()

  const [isRevealing, setIsRevealing] = useState(false)
  const [revealPending, setRevealPending] = useState<PendingReveals | null>(null)
  const [animatingCharacter, setAnimatingCharacter] = useState<number | null>(null)
  const [overrides, setOverrides] = useState<AnimationOverrides>({ facts: null, tables: null, tier: null })
  const [debugMode, setDebugMode] = useState(false)
  const [debugValues, setDebugValues] = useState({ facts: 0, tier: 0, tables: 0 })
  const [showStats, setShowStats] = useState(false)

  useEffect(() => { initialize() }, [initialize])

  const baseSceneState = useMemo(() => computeSceneState(), [computeSceneState])

  // Build live scene state: debug mode > overrides > base
  const liveScene = debugMode
    ? {
        ...baseSceneState,
        details: { ...baseSceneState.details, revealedCount: debugValues.facts },
        landmarks: { unlockedTables: Array.from({ length: debugValues.tables }, (_, i) => i + 1) },
        tier: debugValues.tier,
      }
    : {
        ...baseSceneState,
        details: { ...baseSceneState.details, revealedCount: overrides.facts ?? baseSceneState.details.revealedCount },
        landmarks: { unlockedTables: overrides.tables ?? baseSceneState.landmarks.unlockedTables },
        tier: overrides.tier ?? baseSceneState.tier,
      }

  // Derive pending reveals (only when not in a reveal sequence)
  const pending = useMemo<PendingReveals | null>(() => {
    if (isRevealing) return null
    const p = getPendingReveals()
    const hasPending = p.newDetails > 0 || p.newLandmarks.length > 0 || p.newTier !== null
    return hasPending ? p : null
  }, [getPendingReveals, isRevealing])

  const learningPlusFacts = getFactsAtOrAbove('learning')
  const totalProgress = learningPlusFacts.length

  // --- Reveal handlers ---

  const handleStartReveal = () => {
    // Snapshot pending before setting isRevealing (which nullifies the memo)
    const snapshot = getPendingReveals()
    setRevealPending(snapshot)
    setOverrides({
      facts: lastRevealedCount,
      tables: [...revealedTables],
      tier: peakTier,
    })
    setIsRevealing(true)
  }

  const handleDetailsRevealed = useCallback(() => {
    // Animate scene from old count to new count
    const currentLearning = getFactsAtOrAbove('learning').length
    setOverrides((prev) => ({ ...prev, facts: currentLearning }))
  }, [getFactsAtOrAbove])

  const handleTierRevealed = useCallback(() => {
    const masteredCount = useProgressStore.getState().getFactsByConfidence('mastered').length
    setOverrides((prev) => ({ ...prev, tier: computeTier(masteredCount) }))
  }, [])

  const handleLandmarkRevealed = useCallback((table: number) => {
    setAnimatingCharacter(table)
    setTimeout(() => {
      setOverrides((prev) => ({
        ...prev,
        tables: [...(prev.tables ?? revealedTables), table],
      }))
      setAnimatingCharacter(null)
    }, 800)
  }, [revealedTables])

  const handleRevealComplete = useCallback(() => {
    const completedTables = getMasteredTables()
    const learningCount = getFactsAtOrAbove('learning').length
    const masteredCount = useProgressStore.getState().getFactsByConfidence('mastered').length
    const currentTier = computeTier(masteredCount)
    markRevealed(learningCount, completedTables, currentTier)

    setOverrides({ facts: null, tables: null, tier: null })
    setRevealPending(null)
    setIsRevealing(false)
  }, [getMasteredTables, getFactsAtOrAbove, markRevealed])

  const handleCharacterTap = (table: number) => {
    setAnimatingCharacter(table)
    setTimeout(() => setAnimatingCharacter(null), 1000)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Star size={20} className="text-warm-500" />
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800">{totalProgress} / 144</span>
            <span className="text-sm text-gray-500">Facts Learned</span>
          </div>
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
        <ProgressScene scene={liveScene} animatingCharacter={animatingCharacter} />

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
                  {pending.newLandmarks.length > 0
                    ? `${pending.newLandmarks.length} new ${pending.newLandmarks.length === 1 ? 'friend' : 'friends'} to discover!`
                    : `${pending.newDetails} new ${pending.newDetails === 1 ? 'fact' : 'facts'} learned!`}
                </p>
                <div className="mt-3 text-garden-500 text-sm font-medium">Tap to reveal</div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reveal sequence */}
        {isRevealing && revealPending && (
          <RevealSequence
            pending={revealPending}
            onDetailsRevealed={handleDetailsRevealed}
            onTierRevealed={handleTierRevealed}
            onLandmarkRevealed={handleLandmarkRevealed}
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
              <p className="text-gray-600">{theme.emptyState.title}</p>
              <p className="text-sm text-gray-500 mt-2">{theme.emptyState.subtitle}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Character bar */}
      <CharacterBar
        revealedTables={liveScene.landmarks.unlockedTables}
        onCharacterTap={handleCharacterTap}
      />

      {/* Stats sheet */}
      <AnimatePresence>
        {showStats && <StatsSheet isOpen={showStats} onClose={() => setShowStats(false)} />}
      </AnimatePresence>

      {/* Debug panel (dev mode only) */}
      {import.meta.env.DEV && (
        <Fragment>
          <button
            onClick={() => setDebugMode((d) => !d)}
            className="fixed top-2 right-2 w-8 h-8 opacity-10 hover:opacity-50"
            aria-label="Toggle debug mode"
          />
          {debugMode && (
            <DebugPanel
              values={debugValues}
              onChange={setDebugValues}
              onClose={() => setDebugMode(false)}
            />
          )}
        </Fragment>
      )}
    </div>
  )
}

function DebugPanel({
  values,
  onChange,
  onClose,
}: {
  values: { facts: number; tier: number; tables: number }
  onChange: (v: { facts: number; tier: number; tables: number }) => void
  onClose: () => void
}) {
  return (
    <div className="fixed bottom-20 left-4 right-4 bg-black/90 text-white p-4 rounded-xl text-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold">Scene Debug</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white">x</button>
      </div>
      <label className="block mb-2">
        Facts: {values.facts}/144
        <input type="range" min="0" max="144" value={values.facts}
          onChange={(e) => onChange({ ...values, facts: Number(e.target.value) })}
          className="w-full mt-1" />
      </label>
      <label className="block mb-2">
        Tier: {values.tier}/4
        <input type="range" min="0" max="4" value={values.tier}
          onChange={(e) => onChange({ ...values, tier: Number(e.target.value) })}
          className="w-full mt-1" />
      </label>
      <label className="block">
        Animals: {values.tables}/12
        <input type="range" min="0" max="12" value={values.tables}
          onChange={(e) => onChange({ ...values, tables: Number(e.target.value) })}
          className="w-full mt-1" />
      </label>
    </div>
  )
}
