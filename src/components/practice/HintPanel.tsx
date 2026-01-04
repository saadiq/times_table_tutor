import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronRight, ChevronLeft } from 'lucide-react'
import type { StrategyHint } from '../../lib/strategies'
import { VisualArray } from './VisualArray'

type HintPanelProps = {
  strategies: StrategyHint[]
  isOpen: boolean
  onClose: () => void
  rows?: number
  cols?: number
}

export function HintPanel({ strategies, isOpen, onClose, rows, cols }: HintPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Reset to first strategy when panel opens with new strategies
  useEffect(() => {
    if (isOpen) setCurrentIndex(0)
  }, [isOpen, strategies])

  if (strategies.length === 0) return null

  const strategy = strategies[currentIndex]
  const hasMultiple = strategies.length > 1

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-warm-50 rounded-2xl p-4 border border-warm-200"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-warm-200 rounded-xl">
              <Lightbulb size={20} className="text-warm-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{strategy.name}</h3>
                {hasMultiple && (
                  <span className="text-xs text-gray-400">
                    {currentIndex + 1} of {strategies.length}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>

              {strategy.visual === 'array' && rows && cols && (
                <VisualArray rows={rows} cols={cols} />
              )}

              <ul className="mt-3 space-y-2">
                {strategy.steps.map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <ChevronRight size={16} className="text-garden-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{step}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {hasMultiple && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-warm-200">
              <button
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                onClick={() => setCurrentIndex(i => Math.min(strategies.length - 1, i + 1))}
                disabled={currentIndex === strategies.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Got it, let me try
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
