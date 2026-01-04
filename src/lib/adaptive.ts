import type { FactProgress, Confidence } from '../types'
import { CONFIDENCE_THRESHOLDS } from './constants'

type FactWithScore = FactProgress & { score: number }

/**
 * Selects the next fact to practice based on adaptive learning principles:
 * 1. Prioritize facts currently being learned
 * 2. Focus on trouble spots (frequently missed)
 * 3. Review mastered facts using spaced repetition
 * 4. Introduce new facts gradually
 */
export function selectNextFact(
  facts: Record<string, FactProgress>,
  recentFacts: string[] = [],
  focusTables: number[] = []
): FactProgress | null {
  const allFacts = Object.values(facts)

  // Filter to focus tables if specified
  const eligibleFacts = focusTables.length > 0
    ? allFacts.filter(f => focusTables.includes(f.a) || focusTables.includes(f.b))
    : allFacts

  // Exclude very recently shown facts (last 3)
  const notRecent = eligibleFacts.filter(f => !recentFacts.slice(-3).includes(f.fact))

  // Fallback: if all eligible facts are recent, allow any eligible fact
  const candidates = notRecent.length > 0 ? notRecent : eligibleFacts

  // Score each fact
  const scored: FactWithScore[] = candidates.map(fact => ({
    ...fact,
    score: calculateFactScore(fact),
  }))

  // Sort by score (higher = more likely to show)
  scored.sort((a, b) => b.score - a.score)

  // Add some randomness among top candidates
  const topCandidates = scored.slice(0, 5)
  if (topCandidates.length === 0) return null

  const randomIndex = Math.floor(Math.random() * Math.min(3, topCandidates.length))
  return topCandidates[randomIndex]
}

function calculateFactScore(fact: FactProgress): number {
  let score = 0

  // Priority by confidence level
  const confidenceScores: Record<Confidence, number> = {
    learning: 100,    // Highest priority - actively learning
    new: 50,          // Medium - introduce gradually
    confident: 30,    // Lower - occasional practice
    mastered: 10,     // Lowest - spaced review
  }
  score += confidenceScores[fact.confidence]

  // Trouble spot bonus (high incorrect rate)
  if (fact.incorrectCount > 0) {
    const errorRate = fact.incorrectCount / (fact.correctCount + fact.incorrectCount)
    score += errorRate * 50
  }

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
 * Generate multiple choice options for a fact
 */
export function generateChoices(fact: FactProgress, count: number = 4): number[] {
  const correct = fact.answer
  const choices = new Set<number>([correct])

  // Common mistake patterns
  const mistakes = [
    correct + fact.a,      // Added one more group
    correct - fact.a,      // One less group
    correct + fact.b,      // Mixed up which to add
    correct - fact.b,
    fact.a + fact.b,       // Added instead of multiplied
    correct + 1,
    correct - 1,
    correct + 10,
    correct - 10,
    (fact.a + 1) * fact.b, // Off by one on factor
    fact.a * (fact.b + 1),
  ].filter(n => n > 0 && n !== correct)

  // Shuffle mistakes and pick unique ones
  const shuffled = mistakes.sort(() => Math.random() - 0.5)

  for (const mistake of shuffled) {
    if (choices.size >= count) break
    choices.add(mistake)
  }

  // Fill with random if needed
  while (choices.size < count) {
    const random = Math.floor(Math.random() * 144) + 1
    if (random !== correct) {
      choices.add(random)
    }
  }

  // Shuffle final choices
  return Array.from(choices).sort(() => Math.random() - 0.5)
}

/**
 * Determine if user should type answer or use multiple choice
 */
export function shouldUseMultipleChoice(fact: FactProgress): boolean {
  // New facts: always multiple choice
  if (fact.confidence === 'new') return true

  // Learning: multiple choice until some success
  if (fact.confidence === 'learning') {
    return fact.correctCount < 2
  }

  // Confident/Mastered: type answer
  return false
}
