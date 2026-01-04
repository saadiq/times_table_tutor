import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, SkipForward, Flower2 } from 'lucide-react'
import { useProgressStore, useSessionStore, useGardenStore, useFocusTablesStore, useProfileStore, useAttemptsStore } from '../stores'
import { selectNextFact, shouldUseMultipleChoice } from '../lib/adaptive'
import { getStrategiesForFact, getEncouragingMessage } from '../lib/strategies'
import { calculateReward, getCelebrationMessage } from '../lib/rewards'
import { ProblemDisplay, AnswerInput, HintPanel } from '../components/practice'
import { ProgressBar, Button, Celebration } from '../components/common'
import type { FactProgress } from '../types'

function getRandomPosition() {
  return { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 }
}

export function PracticeView() {
  const { facts, recordAttempt, toSyncPayload } = useProgressStore()
  const queueProgressSync = useProfileStore((s) => s.queueProgressSync)
  const recordAttemptHistory = useAttemptsStore((s) => s.recordAttempt)
  const currentProfile = useProfileStore((s) => s.currentProfile)
  const { goal, progress, streakCount, incrementProgress, incrementStreak, resetStreak, isGoalComplete, resetProgress, setMode } = useSessionStore()
  const { addCoins, addItem } = useGardenStore()
  const { focusTables, isEnabled } = useFocusTablesStore()
  const activeFocusTables = useMemo(
    () => (isEnabled ? focusTables : []),
    [isEnabled, focusTables]
  )

  const [currentFact, setCurrentFact] = useState<FactProgress | null>(null)
  const [recentFacts, setRecentFacts] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [celebrationType, setCelebrationType] = useState<'correct' | 'streak' | 'goal' | null>(null)
  const [attemptStartTime, setAttemptStartTime] = useState<number>(() => Date.now())

  // Select next problem
  const nextProblem = useCallback(() => {
    const next = selectNextFact(facts, recentFacts, activeFocusTables)
    if (next) {
      setCurrentFact(next)
      setRecentFacts(prev => [...prev.slice(-10), next.fact])
      setSelectedAnswer(null)
      setShowResult(false)
      setShowHint(false)
      setMessage(null)
      setAttemptStartTime(Date.now())
    }
  }, [facts, recentFacts, activeFocusTables])

  // Initialize first problem - compute next fact directly instead of calling setState in effect
  const shouldInitialize = !currentFact && Object.keys(facts).length > 0
  if (shouldInitialize) {
    const next = selectNextFact(facts, recentFacts, activeFocusTables)
    if (next && currentFact !== next) {
      // Use a micro-task to avoid render-during-render
      queueMicrotask(() => {
        setCurrentFact(next)
        setRecentFacts(prev => [...prev.slice(-10), next.fact])
      })
    }
  }

  // Handle answer selection
  const handleAnswer = (answer: number) => {
    if (!currentFact || showResult) return

    setSelectedAnswer(answer)
    setShowResult(true)

    const isCorrect = answer === currentFact.answer
    recordAttempt(currentFact.fact, isCorrect)

    // Record attempt history for progress tracking
    const responseTimeMs = Date.now() - attemptStartTime
    const inputMethod = shouldUseMultipleChoice(currentFact) ? 'multiple_choice' : 'number_pad'
    recordAttemptHistory({
      factKey: currentFact.fact,
      correct: isCorrect,
      responseTimeMs,
      inputMethod,
      hintShown: showHint,
      profileId: currentProfile?.id,
    })

    // Queue progress sync to server
    const syncPayload = toSyncPayload(currentFact.fact)
    if (syncPayload) {
      queueProgressSync(syncPayload)
    }

    if (isCorrect) {
      incrementStreak()
      incrementProgress()

      const reward = calculateReward(streakCount + 1, progress, goal)
      addCoins(reward.coins)

      if (reward.item) {
        addItem({
          type: reward.item.type,
          itemId: reward.item.itemId,
          position: getRandomPosition(),
          earnedFor: `practice_${currentFact.fact}`,
        })
      }

      setMessage(reward.bonusMessage || getCelebrationMessage(streakCount + 1))

      // Trigger celebration animation
      if (progress + 1 >= goal) {
        setCelebrationType('goal')
      } else if ((streakCount + 1) % 5 === 0) {
        setCelebrationType('streak')
      } else {
        setCelebrationType('correct')
      }

      // Clear celebration and auto-advance
      setTimeout(() => {
        setCelebrationType(null)
        if (!isGoalComplete()) {
          nextProblem()
        }
      }, 1200)
    } else {
      resetStreak()
      setMessage(getEncouragingMessage())
      setShowHint(true)
    }
  }

  // Skip current problem
  const handleSkip = () => {
    resetStreak()
    nextProblem()
  }

  const strategies = currentFact ? getStrategiesForFact(currentFact) : []

  if (isGoalComplete()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-4"
        >
          <Flower2 size={80} className="text-garden-500 mx-auto" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Goal Complete!</h2>
        <p className="text-gray-600 mb-6">
          Amazing work! You've added to your garden.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => { resetProgress(); nextProblem(); }}>
            Keep Going
          </Button>
          <Button variant="secondary" onClick={() => setMode('garden')}>
            View Garden
          </Button>
        </div>
      </div>
    )
  }

  if (!currentFact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      <Celebration show={celebrationType !== null} type={celebrationType || 'correct'} />

      {/* Progress header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Today's Goal</span>
          <span className="text-sm font-medium text-gray-800">{progress}/{goal}</span>
        </div>
        <ProgressBar current={progress} total={goal} />
      </div>

      {/* Problem */}
      <div className="flex-1 flex flex-col justify-center">
        <ProblemDisplay fact={currentFact} />

        {/* Answer feedback */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-center py-2 px-4 rounded-full mx-auto mb-4 ${
                showResult && selectedAnswer === currentFact.answer
                  ? 'bg-garden-100 text-garden-700'
                  : 'bg-warm-100 text-warm-700'
              }`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Answer input */}
        <div className="mb-6">
          <AnswerInput
            fact={currentFact}
            onAnswer={handleAnswer}
            selectedAnswer={selectedAnswer}
            showResult={showResult}
            disabled={showResult && selectedAnswer === currentFact.answer}
          />
        </div>

        {/* Hint panel */}
        <HintPanel
          strategies={strategies}
          isOpen={showHint}
          onClose={() => {
            // Allow retry on the same problem
            setShowHint(false)
            setShowResult(false)
            setSelectedAnswer(null)
            setMessage(null)
          }}
          rows={currentFact.a}
          cols={currentFact.b}
        />

        {/* Action buttons */}
        {!showResult && (
          <div className="flex justify-center gap-4 mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowHint(true)}
              className="flex items-center gap-2"
            >
              <Lightbulb size={18} />
              Hint
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex items-center gap-2"
            >
              <SkipForward size={18} />
              Skip
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
