import { motion } from 'framer-motion'
import { Button } from '../common'

type MultipleChoiceProps = {
  choices: number[]
  onSelect: (answer: number) => void
  correctAnswer: number
  selectedAnswer: number | null
  showResult: boolean
  disabled: boolean
}

export function MultipleChoice({
  choices,
  onSelect,
  correctAnswer,
  selectedAnswer,
  showResult,
  disabled,
}: MultipleChoiceProps) {
  return (
    <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
      {choices.map((choice, index) => {
        const isSelected = selectedAnswer === choice
        const isCorrect = choice === correctAnswer

        return (
          <motion.div
            key={choice}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              variant="answer"
              size="lg"
              onClick={() => onSelect(choice)}
              disabled={disabled}
              isCorrect={showResult && isCorrect}
              isWrong={showResult && isSelected && !isCorrect}
              className="w-full text-2xl font-semibold min-h-[72px]"
            >
              {choice}
            </Button>
          </motion.div>
        )
      })}
    </div>
  )
}
