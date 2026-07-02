import type { FactProgress, Confidence, RecentAttempt, InputMethod } from '../types'
import { CONFIDENCE_THRESHOLDS } from './constants'

/**
 * Calculate confidence based on number pad performance.
 * Multiple choice can only get you to 'learning' - number pad is required for confident/mastered.
 */
export function calculateConfidence(fact: FactProgress): Confidence {
  const recent = fact.recentAttempts.slice(-CONFIDENCE_THRESHOLDS.recentAttemptsWindow)

  // No attempts = new
  if (recent.length === 0) return 'new'

  // Filter to number pad attempts only for confident/mastered evaluation
  const recentNP = recent.filter(a => a.inputMethod === 'number_pad')
  const correctNP = recentNP.filter(a => a.correct)

  // Calculate NP metrics
  const npAccuracy = recentNP.length > 0
    ? correctNP.length / recentNP.length
    : 0
  const avgNPTime = correctNP.length > 0
    ? correctNP.reduce((sum, a) => sum + a.responseTimeMs, 0) / correctNP.length
    : Infinity

  // MASTERED: 5+ NP correct, <5s avg, 90%+ accuracy
  if (
    correctNP.length >= CONFIDENCE_THRESHOLDS.masteredMinCorrect &&
    avgNPTime < CONFIDENCE_THRESHOLDS.masteredMaxTime &&
    npAccuracy >= CONFIDENCE_THRESHOLDS.masteredMinAccuracy
  ) {
    return 'mastered'
  }

  // CONFIDENT: 3+ NP correct, <10s avg, 70%+ accuracy
  if (
    correctNP.length >= CONFIDENCE_THRESHOLDS.confidentMinCorrect &&
    avgNPTime < CONFIDENCE_THRESHOLDS.confidentMaxTime &&
    npAccuracy >= CONFIDENCE_THRESHOLDS.confidentMinAccuracy
  ) {
    return 'confident'
  }

  // LEARNING: Has any attempts
  return 'learning'
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
