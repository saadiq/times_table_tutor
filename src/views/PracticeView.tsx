import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, SkipForward, Flower2 } from 'lucide-react'
import { useProgressStore, useSessionStore, useGardenStore, useFocusTablesStore, useProfileStore, useAttemptsStore, useSettingsStore } from '../stores'
import { selectNextFact, shouldUseMultipleChoice } from '../lib/adaptive'
import { getStrategiesForFact } from '../lib/strategies'
import { calculateReward, getCelebrationMessage } from '../lib/rewards'
import { speakProblem, speakFact } from '../lib/speech'
import { ProblemDisplay, AnswerInput, HintPanel } from '../components/practice'
import { ProgressBar, Button, Celebration } from '../components/common'
import type { FactProgress } from '../types'

function getRandomPosition() {
  return { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 }
}

function countConsecutiveWrong(): number {
  const results = useSessionStore.getState().recentResults
  let count = 0
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i]) break
    count++
  }
  return count
}

export function PracticeView() {
  const { facts, recordAttempt, toSyncPayload } = useProgressStore()
  const queueProgressSync = useProfileStore((s) => s.queueProgressSync)
  const recordAttemptHistory = useAttemptsStore((s) => s.recordAttempt)
  const currentProfile = useProfileStore((s) => s.currentProfile)
  const { goal, progress, streakCount, newFactsIntroduced, incrementProgress, incrementStreak, resetStreak, isGoalComplete, resetProgress, setMode, incrementNewFacts, recordResult, getSessionAccuracy } = useSessionStore()
  const { addCoins, addItem } = useGardenStore()
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled)
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
  const [recentlyFailed, setRecentlyFailed] = useState<Set<string>>(new Set())
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Clear any pending auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [])

  const nextProblem = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)

    const next = selectNextFact(facts, recentFacts, activeFocusTables, {
      newFactsIntroduced,
      sessionAccuracy: getSessionAccuracy(),
      consecutiveWrong: countConsecutiveWrong(),
      nearGoalEnd: progress >= goal - 1,
    })
    if (next) {
      setCurrentFact(next)
      setRecentFacts(prev => [...prev.slice(-10), next.fact])
      setSelectedAnswer(null)
      setShowResult(false)
      setShowHint(false)
      setMessage(null)
      setAttemptStartTime(Date.now())
      if (ttsEnabled) speakProblem(next.a, next.b)
    }
  }, [facts, recentFacts, activeFocusTables, newFactsIntroduced, progress, goal, getSessionAccuracy, ttsEnabled])

  // Compute display fact synchronously to avoid flicker on initial render
  const shouldInitialize = !currentFact && Object.keys(facts).length > 0
  const initialFact = shouldInitialize ? selectNextFact(facts, recentFacts, activeFocusTables, {
    newFactsIntroduced,
    sessionAccuracy: getSessionAccuracy(),
  }) : null
  const displayFact = currentFact || initialFact

  if (initialFact && !currentFact) {
    queueMicrotask(() => {
      setCurrentFact(initialFact)
      setRecentFacts(prev => [...prev.slice(-10), initialFact.fact])
    })
  }

  const handleAnswer = (answer: number) => {
    if (!displayFact) return
    if (showResult) return

    const wasHintShown = showHint

    // Count new facts when actually attempted, not when selected (avoids skip double-count)
    if (displayFact.confidence === 'new' && !recentlyFailed.has(displayFact.fact)) {
      incrementNewFacts()
    }

    setSelectedAnswer(answer)
    setShowResult(true)

    const isCorrect = answer === displayFact.answer
    const responseTimeMs = Date.now() - attemptStartTime
    const inputMethod = shouldUseMultipleChoice(displayFact, recentlyFailed) ? 'multiple_choice' : 'number_pad'

    recordAttempt({
      fact: displayFact.fact,
      correct: isCorrect,
      inputMethod,
      responseTimeMs,
    })

    recordAttemptHistory({
      factKey: displayFact.fact,
      correct: isCorrect,
      responseTimeMs,
      inputMethod,
      hintShown: wasHintShown,
      profileId: currentProfile?.id,
    })

    const syncPayload = toSyncPayload(displayFact.fact)
    if (syncPayload) {
      queueProgressSync(syncPayload)
    }

    recordResult(isCorrect)

    if (isCorrect) {
      // Clear from recently-failed so it shows as number pad next time
      if (recentlyFailed.has(displayFact.fact)) {
        setRecentlyFailed(prev => { const next = new Set(prev); next.delete(displayFact.fact); return next })
      }
      incrementStreak()
      incrementProgress()

      const reward = calculateReward(streakCount + 1, progress, goal)
      addCoins(reward.coins)

      if (reward.item) {
        addItem({
          type: reward.item.type,
          itemId: reward.item.itemId,
          position: getRandomPosition(),
          earnedFor: `practice_${displayFact.fact}`,
        })
      }

      setMessage(reward.bonusMessage || getCelebrationMessage(streakCount + 1))
      if (ttsEnabled) speakFact(displayFact.a, displayFact.b, displayFact.answer)

      if (progress + 1 >= goal) {
        setCelebrationType('goal')
      } else if ((streakCount + 1) % 5 === 0) {
        setCelebrationType('streak')
      } else {
        setCelebrationType('correct')
      }

      advanceTimerRef.current = setTimeout(() => {
        setCelebrationType(null)
        if (!isGoalComplete()) {
          nextProblem()
        }
      }, 1200)
    } else {
      resetStreak()
      setRecentlyFailed(prev => new Set(prev).add(displayFact.fact))
      setMessage(`${displayFact.a} × ${displayFact.b} = ${displayFact.answer}`)
      if (ttsEnabled) speakFact(displayFact.a, displayFact.b, displayFact.answer)
      setShowHint(true)

      advanceTimerRef.current = setTimeout(() => {
        nextProblem()
      }, 2500)
    }
  }

  const handleSkip = () => {
    resetStreak()
    nextProblem()
  }

  const strategies = useMemo(
    () => (displayFact ? getStrategiesForFact(displayFact) : []),
    [displayFact]
  )

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
          Amazing work! Your scene is coming to life.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => { resetProgress(); nextProblem(); }}>
            Keep Going
          </Button>
          <Button variant="secondary" onClick={() => setMode('garden')}>
            View Progress
          </Button>
        </div>
      </div>
    )
  }

  if (!displayFact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      <Celebration show={celebrationType !== null} type={celebrationType || 'correct'} />

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Today's Goal</span>
          <span className="text-sm font-medium text-gray-800">{progress}/{goal}</span>
        </div>
        <ProgressBar current={progress} total={goal} />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <ProblemDisplay fact={displayFact} />

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-center py-2 px-4 rounded-full mx-auto mb-4 ${
                showResult && selectedAnswer === displayFact.answer
                  ? 'bg-garden-100 text-garden-700'
                  : 'bg-warm-100 text-warm-700'
              }`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-6">
          <AnswerInput
            fact={displayFact}
            onAnswer={handleAnswer}
            selectedAnswer={selectedAnswer}
            showResult={showResult}
            disabled={showResult}
          />
        </div>

        <HintPanel
          strategies={strategies}
          isOpen={showHint}
          onClose={() => { if (showHint) nextProblem() }}
          rows={displayFact.a}
          cols={displayFact.b}
          resetKey={displayFact.fact}
        />

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
