import { useSessionStore } from '../stores/sessionStore'
import { useAttemptsStore } from '../stores/attemptsStore'
import { useProgressViewStore } from '../stores/progressViewStore'
import { useProgressStore } from '../stores/progressStore'
import { useCurriculumStore } from '../stores/curriculumStore'
import { clearFromStorage } from './storage'

/**
 * Reset all per-user stores when switching profiles.
 * Centralized here so profileStore doesn't need to import every store
 * (which risks circular deps, e.g. gardenStore -> profileStore).
 */
export function resetStoresForProfileSwitch(): void {
  useSessionStore.getState().resetProgress()
  useAttemptsStore.getState().clearForProfileSwitch()
  useProgressViewStore.getState().reset()

  // Division facts are server-backed and restored by loadFromServer after
  // the next profile verifies — but they linger in storage after logout,
  // so drop them (and the divide reveal slice, which never leaves this
  // device) rather than let them leak into the next profile.
  clearFromStorage('progressDivide')
  clearFromStorage('progressViewDivide')

  // reset() above only resets the ACTIVE curriculum's reveal slice, so a
  // switch made while divide is active would otherwise hand the next
  // profile this profile's revealed multiply animals. Clear the multiply
  // key too; it is rebuilt from the next profile's facts on first load.
  clearFromStorage('progressView')
  if (useCurriculumStore.getState().active === 'divide') {
    useProgressStore.getState().loadCurriculum('divide')
    useProgressViewStore.getState().loadCurriculum('divide')
  }
}
