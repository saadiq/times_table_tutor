import type { FactProgress } from '../types'
import { selectNextFact, type SelectionContext } from './adaptive'

export type ServeKind = 'adaptive' | 'comeback'
export type ComebackOutcome = 'none' | 'served' | 'deferred' | 'dropped'

export type ServeResult = {
  next: FactProgress | null
  kind: ServeKind
  comeback: ComebackOutcome
}

export type ServeParams = {
  facts: Record<string, FactProgress>
  recentFacts: string[]
  focusTables: number[]
  context: SelectionContext
  matchesTable?: (fact: FactProgress, table: number) => boolean
  pendingComeback: string | null
  comebackDelay: number
  progress: number
  goal: number
}

const defaultMatchesTable = (fact: FactProgress, table: number) =>
  fact.a === table || fact.b === table

/** Decide whether adaptive selection or a guaranteed skipped-fact comeback is next. */
export function decideNextProblem(params: ServeParams): ServeResult {
  const {
    facts, recentFacts, focusTables, context,
    pendingComeback, comebackDelay, progress, goal,
  } = params
  const matchesTable = params.matchesTable ?? defaultMatchesTable

  let comeback: ComebackOutcome = 'none'
  if (pendingComeback) {
    const fact = facts[pendingComeback]
    const eligible = !!fact && (
      focusTables.length === 0 || focusTables.some(table => matchesTable(fact, table))
    )
    if (!eligible) {
      comeback = 'dropped'
    } else if (comebackDelay <= 0 || progress >= goal - 1) {
      return { next: fact, kind: 'comeback', comeback: 'served' }
    } else {
      comeback = 'deferred'
    }
  }

  const next = selectNextFact(facts, recentFacts, focusTables, context, matchesTable)
  return { next, kind: 'adaptive', comeback }
}
