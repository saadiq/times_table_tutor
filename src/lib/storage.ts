const STORAGE_KEYS = {
  progress: 'ttt_progress',
  progressDivide: 'ttt_progress_divide',
  garden: 'ttt_garden',
  session: 'ttt_session',
  settings: 'ttt_settings',
  focusTables: 'ttt_focus_tables',
  focusTablesDivide: 'ttt_focus_tables_divide',
  attempts: 'ttt_attempts',
  pendingAttempts: 'ttt_pending_attempts',
  progressView: 'ttt_progress_view',
  progressViewDivide: 'ttt_progress_view_divide',
  curriculum: 'ttt_curriculum',
} as const

export function saveToStorage<T>(key: keyof typeof STORAGE_KEYS, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data))
  } catch (e) {
    console.error(`Failed to save ${key} to storage:`, e)
  }
}

export function loadFromStorage<T>(key: keyof typeof STORAGE_KEYS): T | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS[key])
    return data ? JSON.parse(data) : null
  } catch (e) {
    console.error(`Failed to load ${key} from storage:`, e)
    return null
  }
}

export function clearFromStorage(key: keyof typeof STORAGE_KEYS): void {
  try {
    localStorage.removeItem(STORAGE_KEYS[key])
  } catch (e) {
    console.error(`Failed to clear ${key} from storage:`, e)
  }
}

export function clearStorage(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
}
