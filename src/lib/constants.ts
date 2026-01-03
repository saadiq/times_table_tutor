import type { GardenItemType } from '../types'

export const TIMES_TABLES = {
  min: 1,
  max: 12,
} as const

export const CONFIDENCE_THRESHOLDS = {
  learningToConfident: 3,    // Correct in a row to advance
  confidentToMastered: 5,    // Total correct across sessions
  reviewInterval: 3,         // Days before reviewing mastered facts
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

export const FLOWER_REWARDS = ['daisy', 'tulip', 'sunflower', 'rose', 'lavender']
export const TREE_REWARDS = ['oak', 'cherry', 'pine']
