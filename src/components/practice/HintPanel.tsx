import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronRight } from 'lucide-react'
import type { StrategyHint } from '../../lib/strategies'
import { VisualArray } from './VisualArray'

type HintPanelProps = {
  strategy: StrategyHint | null
  isOpen: boolean
  onClose: () => void
  rows?: number
  cols?: number
}

export function HintPanel({ strategy, isOpen, onClose, rows, cols }: HintPanelProps) {
  if (!strategy) return null

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
              <h3 className="font-semibold text-gray-800">{strategy.name}</h3>
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
