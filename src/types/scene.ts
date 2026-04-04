/** Pure data types for the progression engine. No rendering knowledge. */

export type SceneState = {
  /** Effort-based: sky warmth, ground texture. Driven by sessions completed. */
  foundation: {
    warmth: number // 0-1, ~25 sessions to full
  }
  /** Learning-based: element count and vibrancy. Driven by fact confidence. */
  details: {
    revealedCount: number // High-water mark of learning+ facts (0-144)
    vibrancy: number // 0.3-1.0, ratio of confident+mastered to learning+
  }
  /** Table mastery: animal unlocks. */
  landmarks: {
    unlockedTables: number[] // Tables with full mastery (1-12)
  }
  /** Streak-based: ambient creatures. */
  ambient: {
    streakDays: number // Current consecutive practice days
  }
  /** Mastery milestone tier (0-4). One-way ratchet. */
  tier: number
}

export type PendingReveals = {
  newDetails: number // New learning+ facts since last visit
  newLandmarks: number[] // Newly mastered tables
  newTier: number | null // Tier jump if any
}
