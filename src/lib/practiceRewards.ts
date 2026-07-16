import { useGardenStore } from '../stores/gardenStore'
import { useProgressViewStore } from '../stores/progressViewStore'
import { calculateReward, getCelebrationMessage } from './rewards'

function getRandomPosition() {
  return { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 }
}

/** Grant correct-answer rewards and return the corresponding celebration. */
export function grantCorrectRewards(
  factKey: string,
  newStreak: number,
  progress: number,
  goal: number
): { message: string; celebrationType: 'correct' | 'streak' | 'goal' } {
  const reward = calculateReward(newStreak, progress, goal)
  const garden = useGardenStore.getState()
  garden.addCoins(reward.coins)

  if (reward.item) {
    garden.addItem({
      type: reward.item.type,
      itemId: reward.item.itemId,
      position: getRandomPosition(),
      earnedFor: `practice_${factKey}`,
    })
  }

  let celebrationType: 'correct' | 'streak' | 'goal' = 'correct'
  if (progress + 1 >= goal) {
    useProgressViewStore.getState().incrementSessions()
    celebrationType = 'goal'
  } else if (newStreak % 5 === 0) {
    celebrationType = 'streak'
  }

  return { message: reward.bonusMessage || getCelebrationMessage(newStreak), celebrationType }
}
