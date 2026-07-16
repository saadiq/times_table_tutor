import type { FactProgress } from '../../types'
import type { StrategyHint, KnownFacts } from '../strategies'

export type CurriculumId = 'multiply' | 'divide'

export type FormattedProblem = {
  left: number
  symbol: string
  right: number
}

/** Learner-facing wording that differs between curricula. */
export type OperationCopy = {
  label: string
  tablePickerTitle: string
  focusTitle: string
  tableLabel: (table: number) => string
  tableMasteryText: (table: number) => string
  focusSummary: (tables: number[]) => string
}

/**
 * Everything that differs between curricula (multiplication, division, ...).
 * The generic engine (adaptive scoring, confidence, stores) is operation-agnostic
 * and receives the facts this descriptor produces.
 * - tableOf: the table a fact is listed under in Learn (multiply: a; divide: the divisor b)
 * - matchesTable: table membership for the focus filter and mastery checks
 *   (multiply: a or b; divide: divisor b only)
 */
export type Operation = {
  id: CurriculumId
  symbol: string
  copy: OperationCopy
  factId: (a: number, b: number) => string
  tableOf: (fact: FactProgress) => number
  matchesTable: (fact: FactProgress, table: number) => boolean
  generateFacts: () => Record<string, FactProgress>
  formatProblem: (fact: FactProgress) => FormattedProblem
  generateChoices: (fact: FactProgress, count?: number) => number[]
  getStrategies: (fact: FactProgress, known?: KnownFacts) => StrategyHint[]
  /** Key of the fact-family sibling to serve right after a correct answer (e.g. the commuted fact). */
  familyFollowUp?: (fact: FactProgress) => string | null
  speakProblem: (fact: FactProgress) => Promise<void>
  speakFact: (fact: FactProgress) => Promise<void>
}
