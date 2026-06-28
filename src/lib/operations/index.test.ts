import { describe, it, expect } from 'vitest'
import { multiplyOperation, formatEquation } from './index'
import type { FactProgress } from '../../types'

const fact: FactProgress = {
  fact: '7x8', a: 7, b: 8, answer: 56, confidence: 'new',
  correctCount: 0, incorrectCount: 0, lastSeen: null, lastCorrect: null,
  recentAttempts: [], preferredStrategy: null,
}

describe('formatEquation', () => {
  it('renders a full multiplication equation', () => {
    expect(formatEquation(multiplyOperation, fact)).toBe('7 × 8 = 56')
  })
})
