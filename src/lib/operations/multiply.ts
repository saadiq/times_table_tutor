import type { FactProgress } from '../../types'
import type { StrategyHint } from '../strategies'
import type { Operation } from './types'
import { getStrategiesForFact } from '../strategies'
import { speakProblem, speakFact } from '../speech'
import { TIMES_TABLES } from '../constants'

const MULTIPLY_SYMBOL = '×'

function factId(a: number, b: number): string {
  return `${a}x${b}`
}

function generateFacts(): Record<string, FactProgress> {
  const facts: Record<string, FactProgress> = {}
  for (let a = TIMES_TABLES.min; a <= TIMES_TABLES.max; a++) {
    for (let b = TIMES_TABLES.min; b <= TIMES_TABLES.max; b++) {
      const fact = factId(a, b)
      facts[fact] = {
        fact,
        a,
        b,
        answer: a * b,
        confidence: 'new',
        correctCount: 0,
        incorrectCount: 0,
        lastSeen: null,
        lastCorrect: null,
        recentAttempts: [],
        preferredStrategy: null,
      }
    }
  }
  return facts
}

function generateChoices(fact: FactProgress, count: number = 4): number[] {
  const correct = fact.answer
  const choices = new Set<number>([correct])

  const mistakes = [
    correct + fact.a,
    correct - fact.a,
    correct + fact.b,
    correct - fact.b,
    fact.a + fact.b,
    correct + 1,
    correct - 1,
    correct + 10,
    correct - 10,
    (fact.a + 1) * fact.b,
    fact.a * (fact.b + 1),
  ].filter((n) => n > 0 && n !== correct)

  const shuffled = mistakes.sort(() => Math.random() - 0.5)
  for (const mistake of shuffled) {
    if (choices.size >= count) break
    choices.add(mistake)
  }

  while (choices.size < count) {
    const random = Math.floor(Math.random() * 144) + 1
    if (random !== correct) choices.add(random)
  }

  return Array.from(choices).sort(() => Math.random() - 0.5)
}

export const multiplyOperation: Operation = {
  id: 'multiply',
  symbol: MULTIPLY_SYMBOL,
  label: 'Multiplication',
  generateFacts,
  factId,
  formatProblem: (fact) => ({ left: fact.a, symbol: MULTIPLY_SYMBOL, right: fact.b }),
  generateChoices,
  getStrategies: (fact): StrategyHint[] => getStrategiesForFact(fact),
  speakProblem: (fact) => speakProblem(fact.a, fact.b),
  speakFact: (fact) => speakFact(fact.a, fact.b, fact.answer),
}
