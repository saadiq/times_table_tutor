import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PartyPopper } from 'lucide-react'
import { useActiveOperation } from '../../hooks'
import { getSceneTheme } from './sceneThemes'
import type { PendingReveals } from '../../types/scene'

type RevealPhase = 'details' | 'tier' | 'landmark' | 'done'

type RevealSequenceProps = {
  pending: PendingReveals
  onDetailsRevealed: () => void
  onTierRevealed: () => void
  onLandmarkRevealed: (table: number) => void
  onComplete: () => void
}

const DETAIL_ANIM_MS = 2500
const TIER_ANIM_MS = 3000
const TOAST_FADE_MS = 4000

export function RevealSequence({
  pending,
  onDetailsRevealed,
  onTierRevealed,
  onLandmarkRevealed,
  onComplete,
}: RevealSequenceProps) {
  const operation = useActiveOperation()
  const theme = getSceneTheme(operation.id)
  const [phase, setPhase] = useState<RevealPhase>('details')
  const [landmarkIdx, setLandmarkIdx] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const [showTierOverlay, setShowTierOverlay] = useState(false)

  // Stable refs for callbacks to avoid re-firing effects on parent re-render
  const callbacksRef = useRef({ onDetailsRevealed, onTierRevealed, onLandmarkRevealed, onComplete })
  useEffect(() => {
    callbacksRef.current = { onDetailsRevealed, onTierRevealed, onLandmarkRevealed, onComplete }
  })

  // Phase: details — animate elements in, show toast
  useEffect(() => {
    if (phase !== 'details') return

    const nextPhase = pending.newTier !== null ? 'tier' : pending.newLandmarks.length > 0 ? 'landmark' : 'done'

    if (pending.newDetails <= 0) {
      const skipTimer = setTimeout(() => setPhase(nextPhase), 0)
      return () => clearTimeout(skipTimer)
    }

    callbacksRef.current.onDetailsRevealed()

    const showTimer = setTimeout(() => setShowToast(true), 0)
    const toastTimer = setTimeout(() => setShowToast(false), TOAST_FADE_MS)
    const advanceTimer = setTimeout(() => setPhase(nextPhase), DETAIL_ANIM_MS)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(toastTimer)
      clearTimeout(advanceTimer)
    }
  }, [phase, pending])

  // Phase: tier — smooth sky transition with text overlay
  useEffect(() => {
    if (phase !== 'tier') return

    callbacksRef.current.onTierRevealed()

    const showTimer = setTimeout(() => setShowTierOverlay(true), 0)
    const hideTimer = setTimeout(() => {
      setShowTierOverlay(false)
      setPhase(pending.newLandmarks.length > 0 ? 'landmark' : 'done')
    }, TIER_ANIM_MS)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [phase, pending.newLandmarks.length])

  // Phase: done
  useEffect(() => {
    if (phase === 'done') callbacksRef.current.onComplete()
  }, [phase])

  // Handle landmark modal dismiss
  const handleLandmarkDismiss = useCallback(() => {
    const nextIdx = landmarkIdx + 1
    if (nextIdx < pending.newLandmarks.length) {
      setLandmarkIdx(nextIdx)
      callbacksRef.current.onLandmarkRevealed(pending.newLandmarks[nextIdx])
    } else {
      setPhase('done')
    }
  }, [landmarkIdx, pending.newLandmarks])

  // Trigger first landmark reveal when entering landmark phase
  useEffect(() => {
    if (phase !== 'landmark') return
    if (pending.newLandmarks.length > 0) {
      callbacksRef.current.onLandmarkRevealed(pending.newLandmarks[0])
    }
  }, [phase, pending.newLandmarks])

  return (
    <>
      {/* Toast for detail reveals */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-6 inset-x-4 flex justify-center pointer-events-none"
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md">
              <p className="text-sm text-garden-600 font-medium">
                {pending.newDetails} new {pending.newDetails === 1 ? 'fact' : 'facts'} growing!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier transition overlay */}
      <AnimatePresence>
        {showTierOverlay && pending.newTier !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-xl font-bold text-white drop-shadow-lg text-center px-6"
            >
              {theme.tierMessages[pending.newTier]}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Landmark modal (animals only) */}
      <AnimatePresence>
        {phase === 'landmark' && pending.newLandmarks[landmarkIdx] != null && (
          <LandmarkModal
            table={pending.newLandmarks[landmarkIdx]}
            character={theme.characters.find((c) => c.table === pending.newLandmarks[landmarkIdx])}
            joinText={theme.landmarkJoinText}
            masteryText={operation.copy.tableMasteryText(pending.newLandmarks[landmarkIdx])}
            onDismiss={handleLandmarkDismiss}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function LandmarkModal({
  table,
  character,
  joinText,
  masteryText,
  onDismiss,
}: {
  table: number
  character: { table: number; name: string } | undefined
  joinText: string
  masteryText: string
  onDismiss: () => void
}) {
  void table
  if (!character) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-x-4 top-1/3 flex flex-col items-center"
      role="dialog"
      aria-label="New animal friend"
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg max-w-xs w-full text-center">
        <div className="mb-2 flex justify-center" aria-hidden="true">
          <PartyPopper size={48} className="text-garden-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">New Friend!</h3>
        <p className="text-gray-600 mt-1">
          <span className="font-bold text-garden-600">{character.name}</span> joins your {joinText}!
        </p>
        <p className="text-sm text-gray-500 mt-1">{masteryText}</p>

        <button
          onClick={onDismiss}
          className="mt-4 px-6 py-3 rounded-xl font-semibold bg-garden-500 text-white hover:bg-garden-600 active:scale-95 transition-all mx-auto"
        >
          Welcome!
        </button>
      </div>
    </motion.div>
  )
}
