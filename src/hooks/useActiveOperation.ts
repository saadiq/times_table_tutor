import { useCurriculumStore } from '../stores/curriculumStore'
import { getOperation } from '../lib/operations'
import type { Operation } from '../lib/operations'

/**
 * Returns the operation for the active curriculum. Operations are module
 * singletons, so the returned reference is stable per curriculum and safe
 * in useMemo/useCallback dependency arrays.
 */
export function useActiveOperation(): Operation {
  const active = useCurriculumStore((s) => s.active)
  return getOperation(active)
}
