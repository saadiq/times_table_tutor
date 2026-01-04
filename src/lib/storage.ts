const STORAGE_KEYS = {
  progress: 'ttt_progress',
  garden: 'ttt_garden',
  session: 'ttt_session',
  settings: 'ttt_settings',
  focusTables: 'ttt_focus_tables',
  attempts: 'ttt_attempts',
  pendingAttempts: 'ttt_pending_attempts',
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

export function clearStorage(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
}
