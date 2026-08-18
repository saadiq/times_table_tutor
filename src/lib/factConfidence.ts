import type { FactProgress, Confidence, RecentAttempt, InputMethod } from '../types'
import { CONFIDENCE_THRESHOLDS } from './constants'

/**
 * Typical response time: median of the attempts' times, each capped at
 * responseTimeCap. There is no timer in the app, so a child who wanders off
 * mid-problem records minutes — a mean would carry that outlier for the whole
 * window, a capped median shrugs it off.
 */
export function typicalResponseTime(attempts: RecentAttempt[]): number | null {
  if (attempts.length === 0) return null
  const capped = attempts
    .map(a => Math.min(a.responseTimeMs, CONFIDENCE_THRESHOLDS.responseTimeCap))
    .sort((x, y) => x - y)
  const mid = Math.floor(capped.length / 2)
  return capped.length % 2 ? capped[mid] : (capped[mid - 1] + capped[mid]) / 2
}

/**
 * The effective version of a base time bar for one fact: every answer digit
 * past the first earns one allowance, since each digit is another key to find
 * and tap. Every comparison against a time threshold must go through this —
 * a raw CONFIDENCE_THRESHOLDS time is never a finished bar.
 */
export function effectiveTimeBar(fact: FactProgress, baseMs: number): number {
  const digits = String(fact.answer).length
  return baseMs + (digits - 1) * CONFIDENCE_THRESHOLDS.perDigitTimeAllowance
}

/**
 * Unaided number-pad performance over the window confidence is judged on —
 * the single source both calculateConfidence and getMasteryProgress read.
 * Multiple choice and hint-assisted answers are excluded.
 */
function unaidedWindowStats(fact: FactProgress) {
  const recentNP = fact.recentAttempts
    .slice(-CONFIDENCE_THRESHOLDS.recentAttemptsWindow)
    .filter(a => a.inputMethod === 'number_pad' && !a.hintShown)
  const correctNP = recentNP.filter(a => a.correct)
  return {
    correctCount: correctNP.length,
    accuracy: recentNP.length > 0 ? correctNP.length / recentNP.length : null,
    typicalTime: typicalResponseTime(correctNP),
  }
}

/**
 * Calculate confidence based on number pad performance.
 * Multiple choice and hint-assisted answers can only get you to 'learning' — unaided number pad is required for confident/mastered.
 */
export function calculateConfidence(fact: FactProgress): Confidence {
  // No attempts = new
  if (fact.recentAttempts.length === 0) return 'new'

  const { correctCount, accuracy, typicalTime } = unaidedWindowStats(fact)
  const npAccuracy = accuracy ?? 0
  const typicalNPTime = typicalTime ?? Infinity

  // MASTERED: 5+ NP correct, <5s typical (plus typing allowance), 90%+ accuracy
  if (
    correctCount >= CONFIDENCE_THRESHOLDS.masteredMinCorrect &&
    typicalNPTime < effectiveTimeBar(fact, CONFIDENCE_THRESHOLDS.masteredMaxTime) &&
    npAccuracy >= CONFIDENCE_THRESHOLDS.masteredMinAccuracy
  ) {
    return 'mastered'
  }

  // CONFIDENT: 3+ NP correct, <10s typical (plus typing allowance), 70%+ accuracy
  if (
    correctCount >= CONFIDENCE_THRESHOLDS.confidentMinCorrect &&
    typicalNPTime < effectiveTimeBar(fact, CONFIDENCE_THRESHOLDS.confidentMaxTime) &&
    npAccuracy >= CONFIDENCE_THRESHOLDS.confidentMinAccuracy
  ) {
    return 'confident'
  }

  // LEARNING: Has any attempts
  return 'learning'
}

export type MasteryProgress = {
  /** The level this fact is working toward; null once mastered. */
  nextLevel: 'confident' | 'mastered' | null
  /** Unaided number-pad corrects in the window that confidence is judged on. */
  unaidedCorrect: number
  neededCorrect: number
  /** Capped-median time of those corrects; null with none yet. */
  typicalTimeMs: number | null
  targetTimeMs: number
  /** Accuracy across unaided number-pad attempts in the window; null with none. */
  accuracy: number | null
  targetAccuracy: number
}

/**
 * Where a fact stands against the real advancement criteria — computed from
 * the same window and thresholds as calculateConfidence, so the display can
 * never disagree with the engine.
 */
export function getMasteryProgress(fact: FactProgress): MasteryProgress {
  const { correctCount, accuracy, typicalTime } = unaidedWindowStats(fact)

  const towardMastered = fact.confidence === 'confident'
  const target = towardMastered
    ? {
        correct: CONFIDENCE_THRESHOLDS.masteredMinCorrect,
        time: CONFIDENCE_THRESHOLDS.masteredMaxTime,
        accuracy: CONFIDENCE_THRESHOLDS.masteredMinAccuracy,
      }
    : {
        correct: CONFIDENCE_THRESHOLDS.confidentMinCorrect,
        time: CONFIDENCE_THRESHOLDS.confidentMaxTime,
        accuracy: CONFIDENCE_THRESHOLDS.confidentMinAccuracy,
      }

  return {
    nextLevel: fact.confidence === 'mastered' ? null : towardMastered ? 'mastered' : 'confident',
    unaidedCorrect: correctCount,
    neededCorrect: target.correct,
    typicalTimeMs: typicalTime,
    targetTimeMs: effectiveTimeBar(fact, target.time),
    accuracy,
    targetAccuracy: target.accuracy,
  }
}

/**
 * Migrate old boolean[] recentAttempts to new RecentAttempt[] format
 */
export function migrateRecentAttempts(attempts: unknown[]): RecentAttempt[] {
  if (attempts.length === 0) return []

  // Check if already in new format (has inputMethod property)
  const first = attempts[0]
  if (typeof first === 'object' && first !== null && 'inputMethod' in first) {
    return attempts as RecentAttempt[]
  }

  // Migrate from old boolean[] format
  const now = new Date().toISOString()
  return (attempts as boolean[]).map(correct => ({
    correct,
    inputMethod: 'multiple_choice' as InputMethod, // Assume MC for legacy data
    responseTimeMs: 5000, // Default to 5s for legacy
    timestamp: now,
  }))
}

/**
 * Migrate all facts in storage to new format and recalculate confidence
 */
export function migrateFacts(facts: Record<string, FactProgress>): Record<string, FactProgress> {
  const migrated: Record<string, FactProgress> = {}

  for (const [key, fact] of Object.entries(facts)) {
    const migratedAttempts = migrateRecentAttempts(fact.recentAttempts as unknown[])
    const migratedFact = { ...fact, recentAttempts: migratedAttempts }
    // Recalculate confidence with new algorithm
    migratedFact.confidence = calculateConfidence(migratedFact)
    migrated[key] = migratedFact
  }

  return migrated
}
