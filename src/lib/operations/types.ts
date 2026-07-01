import type { FactProgress } from '../../types'
import type { StrategyHint } from '../strategies'

export type CurriculumId = 'multiply' | 'divide'

export type FormattedProblem = {
  left: number
  symbol: string
  right: number
}

/**
 * Everything that differs between curricula (multiplication, division, ...).
 * The generic engine (adaptive scoring, confidence, stores) is operation-agnostic
 * and receives the facts this descriptor produces. Holds only fields with
 * consumers today; the display symbol reaches the UI via formatProblem.
 */
export type Operation = {
  id: CurriculumId
  generateFacts: () => Record<string, FactProgress>
  formatProblem: (fact: FactProgress) => FormattedProblem
  generateChoices: (fact: FactProgress, count?: number) => number[]
  getStrategies: (fact: FactProgress) => StrategyHint[]
  speakProblem: (fact: FactProgress) => Promise<void>
  speakFact: (fact: FactProgress) => Promise<void>
}
