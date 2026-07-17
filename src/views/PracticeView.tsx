import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgressStore, useSessionStore, useFocusTablesStore, useProfileStore, useAttemptsStore, useSettingsStore } from '../stores'
import { shouldUseMultipleChoice } from '../lib/adaptive'
import { decideNextProblem, applyComebackOutcome, type ServeKind } from '../lib/practiceFlow'
import { SESSION_DEFAULTS } from '../lib/constants'
import { makeKnownFacts } from '../lib/strategies'
import { useActiveOperation, useSpeakThenAdvance } from '../hooks'
import { grantCorrectRewards } from '../lib/practiceRewards'
import { formatEquation } from '../lib/operations'
import { ProblemDisplay, AnswerInput, HintPanel, GoalComplete, PracticeActions } from '../components/practice'
import { ProgressBar, Celebration } from '../components/common'
import type { FactProgress } from '../types'

export function PracticeView() {
  const { facts, recordAttempt, toSyncPayload, recordSkip: recordFactSkip } = useProgressStore()
  const queueProgressSync = useProfileStore((s) => s.queueProgressSync)
  const recordAttemptHistory = useAttemptsStore((s) => s.recordAttempt)
  const currentProfile = useProfileStore((s) => s.currentProfile)
  const { goal, progress, streakCount, newFactsIntroduced, incrementProgress, incrementStreak, resetStreak, isGoalComplete, resetProgress, setMode, incrementNewFacts, recordResult, getSessionAccuracy } = useSessionStore()
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled)
  const { focusTables, isEnabled } = useFocusTablesStore()
  const operation = useActiveOperation()
  const skipsUsed = useSessionStore(s => s.skipsUsed)
  const canSkip = skipsUsed < SESSION_DEFAULTS.skipsPerBlock
  const activeFocusTables = useMemo(
    () => (isEnabled ? focusTables : []),
    [isEnabled, focusTables]
  )

  const [currentFact, setCurrentFact] = useState<FactProgress | null>(null)
  const [recentFacts, setRecentFacts] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showHint, setShowHint] = useState(false)
  // Latches "a hint was consulted for this problem" — closing the panel must not unmark it.
  const [hintUsed, setHintUsed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [celebrationType, setCelebrationType] = useState<'correct' | 'streak' | 'goal' | null>(null)
  const [attemptStartTime, setAttemptStartTime] = useState<number>(() => Date.now())
  const [recentlyFailed, setRecentlyFailed] = useState<Set<string>>(new Set())
  const [servedKind, setServedKind] = useState<ServeKind>('adaptive')
  const { speakThenAdvance, clearAdvanceTimer } = useSpeakThenAdvance(ttsEnabled, operation)

  const nextProblem = useCallback(() => {
    clearAdvanceTimer()

    const session = useSessionStore.getState()
    const result = decideNextProblem({
      facts: useProgressStore.getState().facts,
      recentFacts,
      focusTables: activeFocusTables,
      context: {
        newFactsIntroduced: session.newFactsIntroduced,
        sessionAccuracy: session.getSessionAccuracy(),
        consecutiveWrong: session.getConsecutiveWrong(),
        nearGoalEnd: session.progress >= session.goal - 1,
      },
      matchesTable: operation.matchesTable,
      pendingComeback: session.pendingComeback,
      pendingFollowUp: session.pendingFollowUp,
      comebackDelay: session.comebackDelay,
      progress: session.progress,
      goal: session.goal,
    })

    applyComebackOutcome(result.comeback, session)
    session.setPendingFollowUp(null)

    const next = result.next
    if (next) {
      setServedKind(result.kind)
      setCurrentFact(next)
      setRecentFacts(prev => [...prev.slice(-10), next.fact])
      setSelectedAnswer(null)
      setShowResult(false)
      setShowHint(false)
      setHintUsed(false)
      setMessage(null)
      setAttemptStartTime(Date.now())
      if (ttsEnabled) operation.speakProblem(next)
    }
  }, [recentFacts, activeFocusTables, ttsEnabled, operation, clearAdvanceTimer])

  // Compute the first serve synchronously to avoid flicker on initial render.
  // It goes through decideNextProblem so a comeback surviving from a previous
  // mount is honored; a stale follow-up is never served, only discarded below.
  const shouldInitialize = !currentFact && Object.keys(facts).length > 0
  const initialServe = shouldInitialize ? decideNextProblem({
    facts,
    recentFacts,
    focusTables: activeFocusTables,
    context: { newFactsIntroduced, sessionAccuracy: getSessionAccuracy() },
    matchesTable: operation.matchesTable,
    pendingComeback: useSessionStore.getState().pendingComeback,
    pendingFollowUp: null,
    comebackDelay: useSessionStore.getState().comebackDelay,
    progress,
    goal,
  }) : null
  const initialFact = initialServe?.next ?? null
  const displayFact = currentFact || initialFact

  if (initialServe && initialFact && !currentFact) {
    queueMicrotask(() => {
      const session = useSessionStore.getState()
      applyComebackOutcome(initialServe.comeback, session)
      session.setPendingFollowUp(null)
      setServedKind(initialServe.kind)
      setCurrentFact(initialFact)
      setRecentFacts(prev => [...prev.slice(-10), initialFact.fact])
    })
  }

  // Lock the input widget for the currently served problem.
  const displayKind = currentFact ? servedKind : (initialServe?.kind ?? 'adaptive')
  const useMultipleChoice = useMemo(
    () => (displayFact ? displayKind === 'comeback' || shouldUseMultipleChoice(displayFact, recentlyFailed) : false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayFact, displayKind]
  )

  const handleAnswer = (answer: number) => {
    if (!displayFact) return
    if (showResult) return

    const wasHintShown = hintUsed

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
    useSessionStore.getState().resolveComeback(displayFact.fact)

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

      if (servedKind !== 'followUp' && operation.familyFollowUp) {
        useSessionStore.getState().setPendingFollowUp(operation.familyFollowUp(displayFact))
      }

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
    if (!displayFact) return
    const session = useSessionStore.getState()
    if (!session.canSkip()) return

    session.recordSkip(displayFact.fact)
    recordFactSkip(displayFact.fact)
    const syncPayload = toSyncPayload(displayFact.fact)
    if (syncPayload) queueProgressSync(syncPayload)

    resetStreak()
    nextProblem()
  }

  const strategies = useMemo(
    () => (displayFact ? operation.getStrategies(displayFact, makeKnownFacts(facts)) : []),
    [displayFact, operation, facts]
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
          onClose={() => setShowHint(false)}
          rows={displayFact.a}
          cols={displayFact.b}
          resetKey={displayFact.fact}
        />

        {!showResult && (
          <PracticeActions
            onHint={() => { setShowHint(true); setHintUsed(true) }}
            onSkip={handleSkip}
            canSkip={canSkip}
          />
        )}
      </div>
    </div>
  )
}
