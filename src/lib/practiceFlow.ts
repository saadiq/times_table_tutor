import type { FactProgress } from '../types'
import { selectNextFact, MAX_NEW_FACTS_PER_SESSION, type SelectionContext } from './adaptive'

export type ServeKind = 'adaptive' | 'comeback' | 'followUp'
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
  pendingFollowUp: string | null
  comebackDelay: number
  progress: number
  goal: number
}

const defaultMatchesTable = (fact: FactProgress, table: number) =>
  fact.a === table || fact.b === table

export type ComebackSession = {
  clearComeback: () => void
  tickComebackDelay: () => void
}

/**
 * Apply a serve's comeback outcome to the session. A served comeback stays
 * pending — the caller clears it via resolveComeback when the fact is answered,
 * so navigating away mid-comeback can never lose the skipped fact.
 */
export function applyComebackOutcome(outcome: ComebackOutcome, session: ComebackSession): void {
  if (outcome === 'dropped') session.clearComeback()
  else if (outcome === 'deferred') session.tickComebackDelay()
}

/** Choose adaptive selection, a guaranteed skipped-fact comeback, or a queued follow-up. */
export function decideNextProblem(params: ServeParams): ServeResult {
  const {
    facts, recentFacts, focusTables, context,
    pendingComeback, pendingFollowUp, comebackDelay, progress, goal,
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

  if (pendingFollowUp) {
    const followUp = facts[pendingFollowUp]
    const eligible = !!followUp
      && (followUp.confidence === 'new' || followUp.confidence === 'learning')
      // A never-seen twin is still a new fact — the session cap applies here too.
      && (followUp.confidence !== 'new' || (context.newFactsIntroduced ?? 0) < MAX_NEW_FACTS_PER_SESSION)
      && progress < goal - 1
      && !recentFacts.slice(-3).includes(followUp.fact)
      && (focusTables.length === 0 || focusTables.some(t => matchesTable(followUp, t)))
    if (eligible) return { next: followUp, kind: 'followUp', comeback }
  }

  const next = selectNextFact(facts, recentFacts, focusTables, context, matchesTable)
  return { next, kind: 'adaptive', comeback }
}
