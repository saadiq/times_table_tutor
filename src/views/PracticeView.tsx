import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgressStore, useSessionStore, useFocusTablesStore, useProfileStore, useAttemptsStore, useSettingsStore } from '../stores'
import { selectNextFact, shouldUseMultipleChoice } from '../lib/adaptive'
import { useActiveOperation, useSpeakThenAdvance } from '../hooks'
import { grantCorrectRewards } from '../lib/practiceRewards'
import { formatEquation } from '../lib/operations'
import { ProblemDisplay, AnswerInput, HintPanel, GoalComplete, PracticeActions } from '../components/practice'
import { ProgressBar, Celebration } from '../components/common'
import type { FactProgress } from '../types'

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
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled)
  const { focusTables, isEnabled } = useFocusTablesStore()
  const operation = useActiveOperation()
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
  const { speakThenAdvance, clearAdvanceTimer } = useSpeakThenAdvance(ttsEnabled, operation)

  const nextProblem = useCallback(() => {
    clearAdvanceTimer()

    const next = selectNextFact(facts, recentFacts, activeFocusTables, {
      newFactsIntroduced,
      sessionAccuracy: getSessionAccuracy(),
      consecutiveWrong: countConsecutiveWrong(),
      nearGoalEnd: progress >= goal - 1,
    }, operation.matchesTable)
    if (next) {
      setCurrentFact(next)
      setRecentFacts(prev => [...prev.slice(-10), next.fact])
      setSelectedAnswer(null)
      setShowResult(false)
      setShowHint(false)
      setMessage(null)
      setAttemptStartTime(Date.now())
      if (ttsEnabled) operation.speakProblem(next)
    }
  }, [facts, recentFacts, activeFocusTables, newFactsIntroduced, progress, goal, getSessionAccuracy, ttsEnabled, operation, clearAdvanceTimer])

  // Compute display fact synchronously to avoid flicker on initial render
  const shouldInitialize = !currentFact && Object.keys(facts).length > 0
  const initialFact = shouldInitialize ? selectNextFact(facts, recentFacts, activeFocusTables, {
    newFactsIntroduced,
    sessionAccuracy: getSessionAccuracy(),
  }, operation.matchesTable) : null
  const displayFact = currentFact || initialFact

  if (initialFact && !currentFact) {
    queueMicrotask(() => {
      setCurrentFact(initialFact)
      setRecentFacts(prev => [...prev.slice(-10), initialFact.fact])
    })
  }

  // Decide the input widget once per served problem, so the rendered widget and
  // the recorded inputMethod always agree, and a recentlyFailed update can't
  // swap the widget mid-answer (recentlyFailed is read at serve time only).
  const useMultipleChoice = useMemo(
    () => (displayFact ? shouldUseMultipleChoice(displayFact, recentlyFailed) : false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayFact]
  )

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
    const inputMethod = useMultipleChoice ? 'multiple_choice' : 'number_pad'

    recordAttempt({
      fact: displayFact.fact,
      correct: isCorrect,
      inputMethod,
      responseTimeMs,
      hintShown: wasHintShown,
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

      const { message: rewardMessage, celebrationType: celebration } =
        grantCorrectRewards(displayFact.fact, streakCount + 1, progress, goal)
      setMessage(rewardMessage)
      setCelebrationType(celebration)

      speakThenAdvance(displayFact, 1200, () => {
        setCelebrationType(null)
        if (!isGoalComplete()) nextProblem()
      })
    } else {
      resetStreak()
      setRecentlyFailed(prev => new Set(prev).add(displayFact.fact))
      setMessage(formatEquation(operation, displayFact))
      setShowHint(true)

      speakThenAdvance(displayFact, 2500, () => nextProblem())
    }
  }

  const handleSkip = () => {
    resetStreak()
    nextProblem()
  }

  const strategies = useMemo(
    () => (displayFact ? operation.getStrategies(displayFact) : []),
    [displayFact, operation]
  )

  if (isGoalComplete()) {
    return (
      <GoalComplete
        onKeepGoing={() => { resetProgress(); nextProblem(); }}
        onViewProgress={() => setMode('garden')}
      />
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
            useMultipleChoice={useMultipleChoice}
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
          <PracticeActions onHint={() => setShowHint(true)} onSkip={handleSkip} />
        )}
      </div>
    </div>
  )
}
