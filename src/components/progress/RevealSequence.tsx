import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, PartyPopper, Sunrise } from 'lucide-react'
import { TABLE_CHARACTERS, type PendingReveals, type RevealStep } from '../../stores/progressViewStore'

type RevealSequenceProps = {
  pending: PendingReveals
  onStepReveal: (step: RevealStep) => void
  onComplete: () => void
}

const TIER_MESSAGES = [
  '', // tier 0 - shouldn't happen
  'Dawn breaks over your meadow!',
  'The morning sun warms your tree!',
  'Afternoon light fills the clearing!',
  'Golden hour arrives - your tree is complete!',
]

export function RevealSequence({ pending, onStepReveal, onComplete }: RevealSequenceProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Build the sequence of reveal steps
  const steps: RevealStep[] = []

  if (pending.newFacts > 0) {
    steps.push({ type: 'facts', count: pending.newFacts })
  }

  for (const table of pending.newTables) {
    const char = TABLE_CHARACTERS.find((c) => c.table === table)
    if (char) {
      steps.push({ type: 'character', table, name: char.name })
    }
  }

  if (pending.newTier !== null) {
    steps.push({ type: 'tier', tier: pending.newTier })
  }

  const currentStep = steps[currentStepIndex]
  const isLastStep = currentStepIndex === steps.length - 1

  const handleReveal = useCallback(() => {
    if (isAnimating || !currentStep) return

    setIsAnimating(true)
    onStepReveal(currentStep)

    // Wait for animation then advance
    setTimeout(() => {
      setIsAnimating(false)
      if (isLastStep) {
        onComplete()
      } else {
        setCurrentStepIndex((i) => i + 1)
      }
    }, 1200)
  }, [currentStep, isAnimating, isLastStep, onComplete, onStepReveal])

  if (!currentStep) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStepIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute inset-x-4 top-1/3 flex flex-col items-center"
        role="dialog"
        aria-label="Progress reveal"
        aria-live="polite"
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg max-w-xs w-full text-center">
          <RevealStepContent step={currentStep} />

          <button
            onClick={handleReveal}
            disabled={isAnimating}
            aria-label={isAnimating ? 'Revealing progress...' : 'Reveal next progress update'}
            className={`mt-4 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 mx-auto transition-all ${
              isAnimating
                ? 'bg-gray-200 text-gray-400'
                : 'bg-garden-500 text-white hover:bg-garden-600 active:scale-95'
            }`}
          >
            <Sparkles size={18} aria-hidden="true" />
            {isAnimating ? 'Revealing...' : 'Show me!'}
          </button>

          <p className="text-xs text-gray-400 mt-3" aria-label={`Step ${currentStepIndex + 1} of ${steps.length}`}>
            {currentStepIndex + 1} of {steps.length}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function RevealStepContent({ step }: { step: RevealStep }) {
  switch (step.type) {
    case 'facts':
      return (
        <>
          <div className="mb-2 flex justify-center" aria-hidden="true">
            <Sparkles size={48} className="text-warm-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">New Progress!</h3>
          <p className="text-gray-600 mt-1">
            You've learned <span className="font-bold text-garden-600">{step.count}</span> more{' '}
            {step.count === 1 ? 'fact' : 'facts'}!
          </p>
        </>
      )

    case 'character':
      return (
        <>
          <div className="mb-2 flex justify-center" aria-hidden="true">
            <PartyPopper size={48} className="text-garden-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">New Friend!</h3>
          <p className="text-gray-600 mt-1">
            <span className="font-bold text-garden-600">{step.name}</span> wants to join your
            tree!
          </p>
          <p className="text-sm text-gray-500 mt-1">You mastered your {step.table}s!</p>
        </>
      )

    case 'tier':
      return (
        <>
          <div className="mb-2 flex justify-center" aria-hidden="true">
            <Sunrise size={48} className="text-warm-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Time Passes!</h3>
          <p className="text-gray-600 mt-1">{TIER_MESSAGES[step.tier]}</p>
        </>
      )
  }
}
