import type { GardenItemType } from '../types'
import { REWARDS, FLOWER_REWARDS, TREE_REWARDS, GARDEN_ITEMS } from './constants'

export type RewardResult = {
  coins: number
  item: {
    type: GardenItemType
    itemId: string
  } | null
  bonusMessage: string | null
}

/**
 * Calculate rewards for a correct answer
 */
export function calculateReward(
  streakCount: number,
  goalProgress: number,
  goalTarget: number
): RewardResult {
  let coins = REWARDS.correctAnswer
  let bonusMessage: string | null = null
  let item: RewardResult['item'] = null

  // Streak bonus every 5 correct
  if (streakCount > 0 && streakCount % 5 === 0) {
    coins += REWARDS.streakBonus
    bonusMessage = `${streakCount} in a row!`
  }

  // Goal completion bonus
  if (goalProgress + 1 >= goalTarget) {
    coins += REWARDS.goalComplete
    bonusMessage = 'Goal complete!'

    // Award a random tree on goal complete
    const treeId = TREE_REWARDS[Math.floor(Math.random() * TREE_REWARDS.length)]
    item = { type: 'tree', itemId: treeId }
  }

  return { coins, item, bonusMessage }
}

/**
 * Award for completing a session goal
 */
export function getGoalCompleteReward(): { type: GardenItemType; itemId: string } {
  // Random flower as goal reward
  const flowerId = FLOWER_REWARDS[Math.floor(Math.random() * FLOWER_REWARDS.length)]
  return { type: 'flower', itemId: flowerId }
}

/**
 * Award for mastering a times table
 */
export function getMasteryReward(
  tableNumber: number,
  totalMastered: number
): { type: GardenItemType; itemId: string } {
  // Landmarks unlock at milestones
  if (totalMastered === 1) {
    return { type: 'landmark', itemId: 'fountain' }
  }
  if (totalMastered === 3) {
    return { type: 'landmark', itemId: 'treehouse' }
  }
  if (totalMastered === 6) {
    return { type: 'landmark', itemId: 'gazebo' }
  }
  if (totalMastered >= 12) {
    return { type: 'landmark', itemId: 'castle' }
  }

  // Default: a tree
  return { type: 'tree', itemId: TREE_REWARDS[tableNumber % TREE_REWARDS.length] }
}

/**
 * Get items available for purchase with coins
 */
export function getPurchasableItems(coins: number): Array<{
  itemId: string
  name: string
  type: GardenItemType
  cost: number
}> {
  return Object.entries(GARDEN_ITEMS)
    .filter(([_, item]) => item.cost > 0 && item.cost <= coins)
    .map(([itemId, item]) => ({
      itemId,
      name: item.name,
      type: item.type,
      cost: item.cost,
    }))
}

/**
 * Get celebration messages
 */
export function getCelebrationMessage(streakCount: number): string {
  if (streakCount >= 10) {
    return 'Amazing streak!'
  }
  if (streakCount >= 5) {
    return 'Great job!'
  }

  const messages = [
    'Nice!',
    'Correct!',
    'You got it!',
    'Well done!',
    'Perfect!',
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}
