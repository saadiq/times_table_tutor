import { useMemo } from 'react'
import type { FactProgress } from '../../types'
import { shouldUseMultipleChoice, generateChoices } from '../../lib/adaptive'
import { MultipleChoice } from './MultipleChoice'
import { NumberPad } from './NumberPad'

type AnswerInputProps = {
  fact: FactProgress
  onAnswer: (answer: number) => void
  selectedAnswer: number | null
  showResult: boolean
  disabled: boolean
}

export function AnswerInput({
  fact,
  onAnswer,
  selectedAnswer,
  showResult,
  disabled,
}: AnswerInputProps) {
  const useMultipleChoice = shouldUseMultipleChoice(fact)

  const choices = useMemo(() => {
    if (useMultipleChoice) {
      return generateChoices(fact, 4)
    }
    return []
  }, [fact, useMultipleChoice])

  if (useMultipleChoice) {
    return (
      <MultipleChoice
        choices={choices}
        onSelect={onAnswer}
        correctAnswer={fact.answer}
        selectedAnswer={selectedAnswer}
        showResult={showResult}
        disabled={disabled}
      />
    )
  }

  return <NumberPad onSubmit={onAnswer} disabled={disabled} />
}
