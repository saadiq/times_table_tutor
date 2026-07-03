import type { FactProgress } from '../../types'
import type { CurriculumId, Operation } from './types'
import { multiplyOperation } from './multiply'
import { divideOperation } from './divide'

export { multiplyOperation }
export { divideOperation }
export type { Operation, OperationCopy, CurriculumId, FormattedProblem } from './types'

const OPERATIONS: Record<CurriculumId, Operation> = {
  multiply: multiplyOperation,
  divide: divideOperation,
}

/** Resolve the operation descriptor for a curriculum. */
export function getOperation(id: CurriculumId): Operation {
  return OPERATIONS[id]
}

/** Render a fact as a full equation string, e.g. "7 × 8 = 56". Works for any operation. */
export function formatEquation(op: Operation, fact: FactProgress): string {
  const p = op.formatProblem(fact)
  return `${p.left} ${p.symbol} ${p.right} = ${fact.answer}`
}
