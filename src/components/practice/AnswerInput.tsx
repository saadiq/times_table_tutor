import { useMemo } from 'react'
import type { FactProgress } from '../../types'
import { useActiveOperation } from '../../hooks'
import { MultipleChoice } from './MultipleChoice'
import { NumberPad } from './NumberPad'

type AnswerInputProps = {
  fact: FactProgress
  useMultipleChoice: boolean
  onAnswer: (answer: number) => void
  selectedAnswer: number | null
  showResult: boolean
  disabled: boolean
}

export function AnswerInput({
  fact,
  useMultipleChoice,
  onAnswer,
  selectedAnswer,
  showResult,
  disabled,
}: AnswerInputProps) {
  const operation = useActiveOperation()

  const choices = useMemo(() => {
    if (useMultipleChoice) {
      return operation.generateChoices(fact, 4)
    }
    return []
  }, [fact, useMultipleChoice, operation])

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
