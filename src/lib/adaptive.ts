import type { FactProgress, Confidence } from '../types'
import { CONFIDENCE_THRESHOLDS } from './constants'
import { typicalResponseTime } from './factConfidence'

type FactWithScore = FactProgress & { score: number }

export type SelectionContext = {
  newFactsIntroduced?: number
  sessionAccuracy?: number
  consecutiveWrong?: number
  nearGoalEnd?: boolean
}

/**
 * Selects the next fact to practice based on adaptive learning principles:
 * 1. Prioritize facts currently being learned
 * 2. Focus on trouble spots (frequently missed)
 * 3. Review mastered facts using spaced repetition
 * 4. Introduce new facts gradually (max 2 per session)
 * 5. Target ~85% success rate
 * 6. End sessions on a success
 */
export function selectNextFact(
  facts: Record<string, FactProgress>,
  recentFacts: string[] = [],
  focusTables: number[] = [],
  context: SelectionContext = {},
  matchesTable: (fact: FactProgress, table: number) => boolean = (f, t) => f.a === t || f.b === t
): FactProgress | null {
  const allFacts = Object.values(facts)

  // Filter to focus tables if specified
  const eligibleFacts = focusTables.length > 0
    ? allFacts.filter(f => focusTables.some(t => matchesTable(f, t)))
    : allFacts

  // Exclude very recently shown facts (last 3)
  const notRecent = eligibleFacts.filter(f => !recentFacts.slice(-3).includes(f.fact))

  // Fallback: if all eligible facts are recent, allow any eligible fact
  const candidates = notRecent.length > 0 ? notRecent : eligibleFacts

  // Score each fact with session context
  const scored: FactWithScore[] = candidates.map(fact => ({
    ...fact,
    score: calculateFactScore(fact, context),
  }))

  // Sort by score (higher = more likely to show)
  scored.sort((a, b) => b.score - a.score)

  // Add some randomness among top candidates
  const topCandidates = scored.slice(0, 5)
  if (topCandidates.length === 0) return null

  const randomIndex = Math.floor(Math.random() * Math.min(3, topCandidates.length))
  return topCandidates[randomIndex]
}

export function calculateFactScore(fact: FactProgress, context: SelectionContext = {}): number {
  const { newFactsIntroduced = 0, sessionAccuracy = 0.85, consecutiveWrong = 0, nearGoalEnd = false } = context
  let score = 0

  const confidenceScores: Record<Confidence, number> = {
    learning: 100,
    new: 50,
    confident: 30,
    mastered: 10,
  }
  score += confidenceScores[fact.confidence]

  // Incremental rehearsal: max 2 new facts per session (Intervention Central best practice)
  if (fact.confidence === 'new' && newFactsIntroduced >= 2) {
    return 0
  }

  // Target ~85% success rate (Nature Communications 2019)
  if (sessionAccuracy < 0.75) {
    if (fact.confidence === 'confident' || fact.confidence === 'mastered') score += 40
    if (fact.confidence === 'new') score -= 30
  } else if (sessionAccuracy > 0.92) {
    if (fact.confidence === 'learning' || fact.confidence === 'new') score += 20
  }

  // Prevent frustration spirals with an easy win
  if (consecutiveWrong >= 3 && (fact.confidence === 'confident' || fact.confidence === 'mastered')) {
    score += 50
  }

  // Last problem in session should be one the child knows
  if (nearGoalEnd && (fact.confidence === 'confident' || fact.confidence === 'mastered')) {
    score += 60
  }

  if (fact.incorrectCount > 0) {
    const errorRate = fact.incorrectCount / (fact.correctCount + fact.incorrectCount)
    score += errorRate * 50
  }

  // Skipped facts are avoidance signals — treat like trouble spots (bounded)
  score += Math.min(fact.skippedCount ?? 0, 3) * 15

  // Spaced repetition for mastered facts
  if (fact.confidence === 'mastered' && fact.lastSeen) {
    const daysSince = daysSinceDate(fact.lastSeen)
    if (daysSince >= CONFIDENCE_THRESHOLDS.reviewInterval) {
      score += 40 // Time to review
    }
  }

  // Recency penalty (don't repeat too soon)
  if (fact.lastSeen) {
    const hoursSince = hoursSinceDate(fact.lastSeen)
    if (hoursSince < 1) {
      score -= 30
    }
  }

  // Slight bonus for "easier" facts to build confidence early
  if (fact.confidence === 'new') {
    const difficulty = getFactDifficulty(fact.a, fact.b)
    score -= difficulty * 5
  }

  return score
}

function getFactDifficulty(a: number, b: number): number {
  // 1s, 2s, 5s, 10s are easier
  if (a === 1 || b === 1) return 0
  if (a === 10 || b === 10) return 1
  if (a === 2 || b === 2) return 2
  if (a === 5 || b === 5) return 2
  // Squares are often memorized
  if (a === b) return 3
  // 9s have tricks
  if (a === 9 || b === 9) return 4
  // 3s, 4s are medium
  if (a <= 4 || b <= 4) return 5
  // 6s, 7s, 8s are hardest
  return 7
}

function daysSinceDate(isoDate: string): number {
  const then = new Date(isoDate).getTime()
  const now = Date.now()
  return (now - then) / (1000 * 60 * 60 * 24)
}

function hoursSinceDate(isoDate: string): number {
  const then = new Date(isoDate).getTime()
  const now = Date.now()
  return (now - then) / (1000 * 60 * 60)
}

/**
 * Determine if user should type answer or use multiple choice.
 * Includes regression logic: if struggling on number pad, go back to multiple choice.
 */
export function shouldUseMultipleChoice(fact: FactProgress, recentlyFailed?: Set<string>): boolean {
  if (fact.confidence === 'new') return true

  // Recently failed facts re-appear as MC to rebuild confidence
  if (recentlyFailed?.has(fact.fact)) return true

  if (fact.confidence === 'confident' || fact.confidence === 'mastered') {
    return false
  }

  // Learning: check recent number pad performance for regression
  const recentNP = fact.recentAttempts
    .filter(a => a.inputMethod === 'number_pad')
    .slice(-CONFIDENCE_THRESHOLDS.regressionWindow)

  // Not enough NP attempts yet? Use MC until 2 correct on MC
  if (recentNP.length < 2) {
    const mcCorrect = fact.recentAttempts
      .filter(a => a.inputMethod === 'multiple_choice' && a.correct)
      .length
    return mcCorrect < CONFIDENCE_THRESHOLDS.mcCorrectToAdvance
  }

  // Check if struggling on NP (failed too many of recent NP attempts)
  const correctNP = recentNP.filter(a => a.correct)
  const npAccuracy = correctNP.length / recentNP.length

  // REGRESSION: If below threshold on recent NP, go back to MC
  if (npAccuracy < CONFIDENCE_THRESHOLDS.regressionThreshold) {
    return true
  }

  // REGRESSION: If correct but labored (typical time too slow), go back to MC
  const typicalTime = typicalResponseTime(correctNP)
  if (typicalTime !== null && typicalTime > CONFIDENCE_THRESHOLDS.laboredTime) {
    return true
  }

  // Otherwise, use number pad
  return false
}
