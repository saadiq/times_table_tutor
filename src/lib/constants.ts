import type { GardenItemType } from '../types'

export const TIMES_TABLES = {
  min: 1,
  max: 12,
} as const

export const CONFIDENCE_THRESHOLDS = {
  // Time thresholds (ms) - based on real learner data
  masteredMaxTime: 5000,       // <5s for mastered (fluent recall)
  confidentMaxTime: 10000,     // <10s for confident
  laboredTime: 12000,          // >12s triggers regression to MC

  // Accuracy thresholds
  masteredMinAccuracy: 0.9,    // 90% for mastered
  confidentMinAccuracy: 0.7,   // 70% for confident
  regressionThreshold: 0.6,    // <60% triggers regression to MC

  // Count thresholds (number pad correct answers)
  masteredMinCorrect: 5,       // 5+ NP correct for mastered
  confidentMinCorrect: 3,      // 3+ NP correct for confident
  mcCorrectToAdvance: 2,       // 2 MC correct before trying NP

  // Window sizes
  recentAttemptsWindow: 8,     // Track last 8 attempts
  regressionWindow: 5,         // Check last 5 NP attempts for regression

  // Spaced repetition
  reviewInterval: 3,           // Days before reviewing mastered facts
} as const

export const SESSION_DEFAULTS = {
  defaultGoal: 5,
  minGoal: 3,
  maxGoal: 20,
} as const

export const REWARDS = {
  correctAnswer: 1,          // Coins per correct
  goalComplete: 5,           // Bonus coins
  streakBonus: 2,            // Extra per 5-streak
  masteredTable: 50,         // Coins for mastering a full table
} as const

export const GARDEN_ITEMS: Record<string, {
  name: string
  type: GardenItemType
  cost: number
  unlockRequirement?: string
}> = {
  // Flowers (cheap, common rewards)
  daisy: { name: 'Daisy', type: 'flower', cost: 0 },
  tulip: { name: 'Tulip', type: 'flower', cost: 0 },
  sunflower: { name: 'Sunflower', type: 'flower', cost: 0 },
  rose: { name: 'Rose', type: 'flower', cost: 0 },
  lavender: { name: 'Lavender', type: 'flower', cost: 0 },

  // Trees (goal completion rewards)
  oak: { name: 'Oak Tree', type: 'tree', cost: 0 },
  cherry: { name: 'Cherry Blossom', type: 'tree', cost: 0 },
  pine: { name: 'Pine Tree', type: 'tree', cost: 0 },

  // Decorations (purchasable with coins)
  bench: { name: 'Bench', type: 'decoration', cost: 10 },
  birdhouse: { name: 'Birdhouse', type: 'decoration', cost: 15 },
  butterfly: { name: 'Butterfly', type: 'decoration', cost: 5 },
  pond: { name: 'Small Pond', type: 'decoration', cost: 25 },

  // Landmarks (mastery rewards)
  fountain: { name: 'Fountain', type: 'landmark', cost: 0, unlockRequirement: 'master_any' },
  treehouse: { name: 'Treehouse', type: 'landmark', cost: 0, unlockRequirement: 'master_3' },
  gazebo: { name: 'Gazebo', type: 'landmark', cost: 0, unlockRequirement: 'master_6' },
  castle: { name: 'Mini Castle', type: 'landmark', cost: 0, unlockRequirement: 'master_all' },
}

export const THEME_COSTS: Record<string, number> = {
  flower: 0,      // Default, always unlocked
  forest: 50,
  underwater: 100,
  space: 200,
}

export const FLOWER_REWARDS = ['daisy', 'tulip', 'sunflower', 'rose', 'lavender']
export const TREE_REWARDS = ['oak', 'cherry', 'pine']
