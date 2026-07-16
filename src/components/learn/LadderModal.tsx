import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, PartyPopper, X } from 'lucide-react'
import type { FactProgress } from '../../types'
import type { Ladder, LadderTryStep } from '../../lib/ladders'
import { multiplyOperation } from '../../lib/operations'
import { MultipleChoice } from '../practice/MultipleChoice'
import { VisualArray } from '../practice/VisualArray'
import { Button, Celebration } from '../common'

type LadderModalProps = {
  ladder: Ladder
  onClose: () => void
}

/** Build a throwaway FactProgress so multiplyOperation.generateChoices can run. */
function tryFact(step: LadderTryStep): FactProgress {
  return {
    fact: `${step.a}x${step.b}`, a: step.a, b: step.b, answer: step.a * step.b,
    confidence: 'new', correctCount: 0, incorrectCount: 0,
    lastSeen: null, lastCorrect: null, recentAttempts: [], preferredStrategy: null,
  }
}

export function LadderModal({ ladder, onClose }: LadderModalProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const isComplete = stepIndex >= ladder.steps.length
  const step = isComplete ? null : ladder.steps[stepIndex]
  const choices = useMemo(
    () => (step?.kind === 'try' ? multiplyOperation.generateChoices(tryFact(step), 4) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stepIndex]
  )

  const goNext = () => {
    setSelectedAnswer(null)
    setShowResult(false)
    setStepIndex(i => i + 1)
  }
  const goPrev = () => {
    setSelectedAnswer(null)
    setShowResult(false)
    setStepIndex(i => Math.max(0, i - 1))
  }
  const tryAnswered = step?.kind !== 'try' || showResult
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 flex flex-col">
      <Celebration show={isComplete} type="goal" />
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">{ladder.title}</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <X size={24} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div key={stepIndex} initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {isComplete ? (
              <div className="text-center py-12 space-y-4">
                <PartyPopper size={48} className="mx-auto text-warm-500" />
                <h3 className="text-2xl font-bold text-gray-800">Nice climbing!</h3>
                <p className="text-gray-600">{ladder.subtitle} — now you can build these yourself.</p>
                <Button onClick={onClose}>Done</Button>
              </div>
            ) : step?.kind === 'show' ? (
              <>
                <div className="bg-sky-50 rounded-2xl p-4">
                  <h3 className="font-semibold text-sky-700 text-lg">{step.title}</h3>
                  <p className="text-gray-700 mt-1">{step.text}</p>
                </div>
                {step.array && (
                  <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                    <VisualArray rows={step.array.rows} cols={step.array.cols}
                      caption={step.array.caption} fadedRows={step.array.fadedRows} />
                  </div>
                )}
              </>
            ) : step ? (
              <>
                <div className="bg-sky-50 rounded-2xl p-4 text-center">
                  <h3 className="font-semibold text-sky-700 text-lg">{step.prompt}</h3>
                </div>
                <MultipleChoice choices={choices}
                  onSelect={(answer) => { setSelectedAnswer(answer); setShowResult(true) }}
                  correctAnswer={step.a * step.b} selectedAnswer={selectedAnswer}
                  showResult={showResult} disabled={showResult} />
                {showResult && (
                  <p className="text-center text-gray-600">
                    {selectedAnswer === step.a * step.b
                      ? 'You built it yourself!'
                      : `It's ${step.a * step.b} — look back at the picture and try the next one.`}
                  </p>
                )}
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {!isComplete && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <button onClick={goPrev} disabled={stepIndex === 0}
            className="flex items-center gap-1 px-4 py-2 text-gray-600 disabled:opacity-30">
            <ChevronLeft size={20} /> Back
          </button>
          <div className="flex gap-1">
            {ladder.steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === stepIndex ? 'bg-sky-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <button onClick={goNext} disabled={!tryAnswered}
            className="flex items-center gap-1 px-4 py-2 text-gray-600 disabled:opacity-30">
            Next <ChevronRight size={20} />
          </button>
        </div>
      )}
    </motion.div>
  )
}
