import type { FactProgress } from '../types'
import type { StrategyHint } from './strategies'

/**
 * Strategies for a division fact. By convention a = quotient (the answer),
 * b = divisor, dividend = a*b — see divideOperation.
 */
export function getStrategiesForDivisionFact(fact: FactProgress): StrategyHint[] {
  const quotient = fact.a
  const divisor = fact.b
  const dividend = quotient * divisor
  const strategies: StrategyHint[] = []

  // The anchor: division is multiplication in reverse
  strategies.push({
    id: 'inverse_multiplication',
    name: 'Think Multiplication',
    description: `${divisor} × ? = ${dividend}`,
    steps: [
      'Division is multiplication in reverse.',
      `Ask: ${divisor} times what makes ${dividend}?`,
      'That missing number is your answer!',
    ],
    visual: 'array',
    arrayCaption: `${dividend} dots in rows of ${divisor} — how many rows?`,
  })

  if (quotient !== divisor) {
    strategies.push({
      id: 'fact_family',
      name: 'Fact Family',
      description: `${quotient}, ${divisor}, and ${dividend} are a family`,
      steps: [
        `${quotient} × ${divisor} = ${dividend}`,
        `${divisor} × ${quotient} = ${dividend}`,
        `So ${dividend} ÷ ${divisor} = ?`,
      ],
    })
  }

  if (divisor <= 6) {
    const previewCount = Math.min(3, quotient)
    const preview = Array.from({ length: previewCount }, (_, i) => divisor * (i + 1))
    strategies.push({
      id: 'skip_counting',
      name: 'Skip Count',
      description: `Count by ${divisor}s up to ${dividend}`,
      steps: [
        `Count by ${divisor}s: ${preview.join(', ')}...`,
        `Keep going until you reach ${dividend}.`,
        'How many counts did it take? That is your answer!',
      ],
    })
  }

  if (divisor === 2) {
    strategies.push({
      id: 'halving',
      name: 'Half It',
      description: 'Dividing by 2 means cutting in half',
      steps: [
        `Split ${dividend} into two equal parts.`,
        `What is half of ${dividend}?`,
      ],
    })
  }

  if (divisor === 1) {
    strategies.push({
      id: 'ones_zeros',
      name: 'Ones Rule',
      description: 'Dividing by 1 changes nothing',
      steps: [
        'Any number divided by 1 stays the same!',
        `What is ${dividend} divided by 1?`,
      ],
    })
  }

  if (quotient === 1) {
    strategies.push({
      id: 'ones_zeros',
      name: 'Same Number Rule',
      description: 'A number divided by itself is 1',
      steps: [
        `${dividend} and ${divisor} are the same number.`,
        'Any number divided by itself equals 1!',
      ],
    })
  }

  if (divisor === 10) {
    strategies.push({
      id: 'tens_trick',
      name: 'Tens Trick',
      description: 'Take away the zero',
      steps: [
        `${dividend} ends in a zero.`,
        'Dividing by 10 just removes that zero!',
      ],
    })
  }

  return strategies
}
