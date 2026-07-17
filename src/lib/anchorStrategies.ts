import type { FactProgress } from '../types'
import type { StrategyHint, KnownFacts } from './strategies'

type Knows = (x: number, y: number) => boolean

function hint(name: string, description: string, steps: string[]): StrategyHint {
  return { id: 'known_anchor', name, description, steps }
}

const CHAIN_BUILDERS: Record<number, (n: number, knows: Knows) => StrategyHint | null> = {
  3: (n, knows) => knows(2, n) ? hint('Double Plus One', `Start from 2 × ${n} — you know that one`, [
    `You know 2 × ${n} = ${2 * n}.`, `3 × ${n} is just one more ${n}.`, `${2 * n} + ${n} = ?`,
  ]) : null,
  4: (n, knows) => knows(2, n) ? hint('Double the Double', `Start from 2 × ${n} — you know that one`, [
    `You know 2 × ${n} = ${2 * n}.`, `4 × ${n} is double that.`, `${2 * n} + ${2 * n} = ?`,
  ]) : null,
  6: (n, knows) => knows(5, n) ? hint('Fives Plus One', `Start from 5 × ${n} — you know that one`, [
    `You know 5 × ${n} = ${5 * n}.`, `6 × ${n} is one more ${n}.`, `${5 * n} + ${n} = ?`,
  ]) : null,
  7: (n, knows) => knows(5, n) && knows(2, n) ? hint('Fives Plus Twos', `Start from 5 × ${n} — you know that one`, [
    `You know 5 × ${n} = ${5 * n} and 2 × ${n} = ${2 * n}.`,
    '7 groups is 5 groups plus 2 groups.', `${5 * n} + ${2 * n} = ?`,
  ]) : null,
  8: (n, knows) => {
    // The hint computes the "two groups" itself, so only the 10x anchor must be known.
    if (knows(10, n)) return hint('Tens Minus Twos', `Start from 10 × ${n} — you know that one`, [
      `You know 10 × ${n} = ${10 * n}.`,
      `8 groups is 2 groups less than 10 — that's ${2 * n} less.`, `${10 * n} − ${2 * n} = ?`,
    ])
    if (knows(4, n)) return hint('Double the Fours', `Start from 4 × ${n} — you know that one`, [
      `You know 4 × ${n} = ${4 * n}.`, `8 × ${n} is double that.`, `${4 * n} + ${4 * n} = ?`,
    ])
    return null
  },
  12: (n, knows) => knows(10, n) && knows(2, n) ? hint('Tens Plus Twos', `Start from 10 × ${n} — you know that one`, [
    `You know 10 × ${n} = ${10 * n} and 2 × ${n} = ${2 * n}.`,
    '12 groups is 10 groups plus 2 groups.', `${10 * n} + ${2 * n} = ?`,
  ]) : null,
}

/** Derived-fact hints built only from anchors the learner already knows. */
export function getAnchorStrategies(fact: FactProgress, known: KnownFacts): StrategyHint[] {
  const knows: Knows = (x, y) => known.isKnown(x, y) || known.isKnown(y, x)
  const pairs: Array<[number, number]> = fact.a === fact.b
    ? [[fact.a, fact.b]]
    : [[fact.a, fact.b], [fact.b, fact.a]]
  const hints: StrategyHint[] = []
  for (const [groups, size] of pairs) {
    const built = CHAIN_BUILDERS[groups]?.(size, knows)
    if (built) hints.push(built)
  }
  return hints.slice(0, 2)
}
