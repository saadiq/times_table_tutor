import type { Strategy, FactProgress } from '../types'

export type StrategyHint = {
  id: Strategy
  name: string
  description: string
  steps: string[]
  visual?: 'array' | 'number_line' | 'groups'
}

/**
 * Get applicable strategies for a given multiplication fact
 */
export function getStrategiesForFact(fact: FactProgress): StrategyHint[] {
  const { a, b } = fact
  const strategies: StrategyHint[] = []

  // Always offer visual array
  strategies.push({
    id: 'visual_array',
    name: 'See It',
    description: `Picture ${a} rows with ${b} in each row`,
    steps: [
      `Draw ${a} rows`,
      `Put ${b} dots in each row`,
      `Now count all the dots!`,
    ],
    visual: 'array',
  })

  // Skip counting (good for smaller numbers)
  if (a <= 6 || b <= 6) {
    const skipBy = a <= b ? a : b
    const times = a <= b ? b : a
    // Show first few numbers to get them started
    const previewCount = Math.min(3, times)
    const preview = Array.from({ length: previewCount }, (_, i) => skipBy * (i + 1))
    strategies.push({
      id: 'skip_counting',
      name: 'Skip Count',
      description: `Count by ${skipBy}s, ${times} times`,
      steps: [
        `Start counting by ${skipBy}s:`,
        `${preview.join(', ')}...`,
        `Keep going until you've counted ${times} numbers!`,
      ],
    })
  }

  // Ones and zeros (trivial but good to reinforce)
  if (a === 1 || b === 1) {
    const other = a === 1 ? b : a
    strategies.push({
      id: 'ones_zeros',
      name: 'Ones Rule',
      description: 'Any number times 1 equals itself',
      steps: [
        'When you multiply by 1, the number stays the same!',
        `What is ${other} times 1?`,
      ],
    })
  }

  if (a === 0 || b === 0) {
    strategies.push({
      id: 'ones_zeros',
      name: 'Zeros Rule',
      description: 'Any number times 0 equals 0',
      steps: [
        'Anything times 0 is always 0!',
        'Zero groups of anything is nothing.',
      ],
    })
  }

  // Fives trick
  if (a === 5 || b === 5) {
    const other = a === 5 ? b : a
    strategies.push({
      id: 'fives_trick',
      name: 'Fives Trick',
      description: 'Multiply by 10, then cut in half',
      steps: [
        `First, what is ${other} × 10?`,
        `Now cut that number in half!`,
      ],
    })
  }

  // Nines trick (fingers or subtract pattern)
  if (a === 9 || b === 9) {
    const other = a === 9 ? b : a
    strategies.push({
      id: 'nines_trick',
      name: 'Nines Trick',
      description: 'Multiply by 10, then subtract once',
      steps: [
        `First, what is ${other} × 10?`,
        `Now subtract ${other} from that!`,
        `Tip: The tens digit is always one less than ${other}.`,
      ],
    })
  }

  // Tens trick
  if (a === 10 || b === 10) {
    const other = a === 10 ? b : a
    strategies.push({
      id: 'tens_trick',
      name: 'Tens Trick',
      description: 'Just add a zero!',
      steps: [
        `When you multiply by 10, just add a zero to the end!`,
        `What do you get when you add a 0 after ${other}?`,
      ],
    })
  }

  // Doubles (squares)
  if (a === b) {
    strategies.push({
      id: 'doubles',
      name: 'Square Number',
      description: `${a} squared`,
      steps: [
        `This is called "${a} squared"`,
        `Picture a square with ${a} on each side.`,
        `How many squares in total?`,
      ],
      visual: 'array',
    })
  }

  // Use a neighbor (for harder facts)
  if (a > 2 && b > 2) {
    const neighborA = a - 1
    strategies.push({
      id: 'use_neighbor',
      name: 'Use a Neighbor',
      description: `Start from ${neighborA} × ${b}, add ${b} more`,
      steps: [
        `Do you know ${neighborA} × ${b}?`,
        `If so, just add one more group of ${b}!`,
        `${neighborA} × ${b} + ${b} = ?`,
      ],
    })
  }

  // Break apart (for larger numbers)
  if (a > 5 && b > 5) {
    const halfA = Math.floor(a / 2)
    const remainder = a - halfA
    strategies.push({
      id: 'break_apart',
      name: 'Break Apart',
      description: `Split ${a} into ${halfA} + ${remainder}`,
      steps: [
        `First, figure out ${halfA} × ${b}`,
        `Then, figure out ${remainder} × ${b}`,
        `Finally, add those two answers together!`,
      ],
    })
  }

  return strategies
}

/**
 * Get a short encouraging message for wrong answers
 */
export function getEncouragingMessage(): string {
  const messages = [
    "Let me show you a trick!",
    "Here's a helpful way to think about it.",
    "No worries, let's figure this out together.",
    "Good try! Here's a strategy that might help.",
    "Let's look at this a different way.",
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}
