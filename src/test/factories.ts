import type { FactProgress, RecentAttempt } from '../types'

/** Build a fresh multiplication FactProgress for tests. */
export function makeFact(a: number, b: number): FactProgress {
  return {
    fact: `${a}x${b}`, a, b, answer: a * b, confidence: 'new',
    correctCount: 0, incorrectCount: 0, lastSeen: null, lastCorrect: null,
    recentAttempts: [], preferredStrategy: null,
  }
}

/** Build a RecentAttempt for tests: an unaided number-pad correct by default. */
export function makeAttempt(overrides: Partial<RecentAttempt> = {}): RecentAttempt {
  return {
    correct: true,
    inputMethod: 'number_pad',
    responseTimeMs: 3000,
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}
