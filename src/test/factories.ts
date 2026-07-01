import type { FactProgress } from '../types'

/** Build a fresh multiplication FactProgress for tests. */
export function makeFact(a: number, b: number): FactProgress {
  return {
    fact: `${a}x${b}`, a, b, answer: a * b, confidence: 'new',
    correctCount: 0, incorrectCount: 0, lastSeen: null, lastCorrect: null,
    recentAttempts: [], preferredStrategy: null,
  }
}
