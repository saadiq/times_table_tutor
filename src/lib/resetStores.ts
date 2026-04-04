import { useSessionStore } from '../stores/sessionStore'
import { useAttemptsStore } from '../stores/attemptsStore'
import { useProgressViewStore } from '../stores/progressViewStore'

/**
 * Reset all per-user stores when switching profiles.
 * Centralized here so profileStore doesn't need to import every store
 * (which risks circular deps, e.g. gardenStore -> profileStore).
 */
export function resetStoresForProfileSwitch(): void {
  useSessionStore.getState().resetProgress()
  useAttemptsStore.getState().clearForProfileSwitch()
  useProgressViewStore.getState().reset()
}
