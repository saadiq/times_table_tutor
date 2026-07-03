import type { FactProgress } from '../../types'
import type { Operation } from './types'
import { shuffle } from './shuffle'
import { getStrategiesForDivisionFact } from '../divisionStrategies'
import { speakDivisionProblem, speakDivisionFact } from '../speech'
import { TIMES_TABLES } from '../constants'

const DIVIDE_SYMBOL = '÷'

/** a = quotient (the answer the learner types), b = divisor, dividend = a*b. */
function factId(a: number, b: number): string {
  return `${a * b}${DIVIDE_SYMBOL}${b}`
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
        answer: a,
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

  // Plausible mistakes stay in quotient range: off-by-one/two quotients,
  // or answering with (near) the divisor.
  const mistakes = [
    correct + 1,
    correct - 1,
    correct + 2,
    correct - 2,
    fact.b,
    fact.b + 1,
    fact.b - 1,
  ].filter((n) => n >= TIMES_TABLES.min && n <= TIMES_TABLES.max && n !== correct)

  for (const mistake of shuffle(mistakes)) {
    if (choices.size >= count) break
    choices.add(mistake)
  }

  while (choices.size < count) {
    const random = Math.floor(Math.random() * TIMES_TABLES.max) + 1
    if (random !== correct) choices.add(random)
  }

  return shuffle(Array.from(choices))
}

export const divideOperation: Operation = {
  id: 'divide',
  symbol: DIVIDE_SYMBOL,
  copy: {
    label: 'Division',
    tablePickerTitle: 'Choose a Number to Divide By',
    focusTitle: 'Focus Divisors',
    tableLabel: (table) => `Dividing by ${table}`,
    tableMasteryText: (table) => `You mastered dividing by ${table}!`,
    focusSummary: (tables) => `Practicing: dividing by ${tables.join(', ')}`,
  },
  factId,
  tableOf: (fact) => fact.b,
  matchesTable: (fact, table) => fact.b === table,
  generateFacts,
  formatProblem: (fact) => ({ left: fact.a * fact.b, symbol: DIVIDE_SYMBOL, right: fact.b }),
  generateChoices,
  getStrategies: getStrategiesForDivisionFact,
  speakProblem: (fact) => speakDivisionProblem(fact.a * fact.b, fact.b),
  speakFact: (fact) => speakDivisionFact(fact.a * fact.b, fact.b, fact.a),
}
