import type { FactProgress } from '../../types'
import type { Operation } from './types'
import { multiplyOperation } from './multiply'

export { multiplyOperation }
export type { Operation, CurriculumId, FormattedProblem } from './types'

/** Render a fact as a full equation string, e.g. "7 × 8 = 56". Works for any operation. */
export function formatEquation(op: Operation, fact: FactProgress): string {
  const p = op.formatProblem(fact)
  return `${p.left} ${p.symbol} ${p.right} = ${fact.answer}`
}
