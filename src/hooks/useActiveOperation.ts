import { multiplyOperation } from '../lib/operations'
import type { Operation } from '../lib/operations'

/**
 * Returns the operation for the active curriculum.
 * Phase 1: multiplication is the only curriculum. Phase 2 reads the active-curriculum store.
 */
export function useActiveOperation(): Operation {
  return multiplyOperation
}
