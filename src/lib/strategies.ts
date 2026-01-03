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
  const { a, b, answer } = fact
  const strategies: StrategyHint[] = []

  // Always offer visual array
  strategies.push({
    id: 'visual_array',
    name: 'See It',
    description: `Picture ${a} rows with ${b} in each row`,
    steps: [
      `Draw ${a} rows`,
      `Put ${b} dots in each row`,
      `Count all the dots: ${answer}`,
    ],
    visual: 'array',
  })

  // Skip counting (good for smaller numbers)
  if (a <= 6 || b <= 6) {
    const skipBy = a <= b ? a : b
    const times = a <= b ? b : a
    const sequence = Array.from({ length: times }, (_, i) => skipBy * (i + 1))
    strategies.push({
      id: 'skip_counting',
      name: 'Skip Count',
      description: `Count by ${skipBy}s, ${times} times`,
      steps: [
        `Count by ${skipBy}s:`,
        sequence.join(', '),
        `The ${times}th number is ${answer}`,
      ],
    })
  }

  // Ones and zeros (trivial but good to reinforce)
  if (a === 1 || b === 1) {
    strategies.push({
      id: 'ones_zeros',
      name: 'Ones Rule',
      description: 'Any number times 1 equals itself',
      steps: [
        `${a} x ${b} = ${answer}`,
        'Multiplying by 1 gives you the same number!',
      ],
    })
  }

  if (a === 0 || b === 0) {
    strategies.push({
      id: 'ones_zeros',
      name: 'Zeros Rule',
      description: 'Any number times 0 equals 0',
      steps: [
        `${a} x ${b} = 0`,
        'Multiplying by 0 always gives 0!',
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
        `${other} x 10 = ${other * 10}`,
        `Half of ${other * 10} = ${answer}`,
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
        `${other} x 10 = ${other * 10}`,
        `${other * 10} - ${other} = ${answer}`,
        `Or: tens digit is ${other - 1}, ones digit is ${10 - other} = ${answer}`,
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
        `${other} x 10 = ${other}0`,
        `The answer is ${answer}`,
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
        `${a} x ${a} = ${answer}`,
        `This is called "${a} squared"`,
      ],
      visual: 'array',
    })
  }

  // Use a neighbor (for harder facts)
  if (a > 2 && b > 2) {
    const neighborA = a - 1
    const neighborAnswer = neighborA * b
    strategies.push({
      id: 'use_neighbor',
      name: 'Use a Neighbor',
      description: `Start from ${neighborA} x ${b}, add ${b} more`,
      steps: [
        `You might know: ${neighborA} x ${b} = ${neighborAnswer}`,
        `Add one more group of ${b}`,
        `${neighborAnswer} + ${b} = ${answer}`,
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
        `${halfA} x ${b} = ${halfA * b}`,
        `${remainder} x ${b} = ${remainder * b}`,
        `${halfA * b} + ${remainder * b} = ${answer}`,
      ],
    })
  }

  return strategies
}

/**
 * Get the best strategy for a fact, considering user preferences
 */
export function getBestStrategy(
  fact: FactProgress,
  preferredStrategy: string | null
): StrategyHint {
  const strategies = getStrategiesForFact(fact)

  // If user has a preferred strategy and it's available, use it
  if (preferredStrategy) {
    const preferred = strategies.find(s => s.id === preferredStrategy)
    if (preferred) return preferred
  }

  // Otherwise return the first (most relevant) strategy
  return strategies[0]
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
