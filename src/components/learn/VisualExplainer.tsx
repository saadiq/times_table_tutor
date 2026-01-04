import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { FactProgress } from '../../types'
import { getStrategiesForFact } from '../../lib/strategies'
import { VisualArray } from '../practice/VisualArray'

type VisualExplainerProps = {
  fact: FactProgress
  onClose: () => void
}

export function VisualExplainer({ fact, onClose }: VisualExplainerProps) {
  const strategies = getStrategiesForFact(fact)
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentStrategy = strategies[currentIndex]

  const goNext = () => setCurrentIndex(i => Math.min(i + 1, strategies.length - 1))
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">
          {fact.a} × {fact.b} = {fact.answer}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={24} className="text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="bg-garden-50 rounded-2xl p-4">
              <h3 className="font-semibold text-garden-700 text-lg">
                {currentStrategy.name}
              </h3>
              <p className="text-gray-600 mt-1">
                {currentStrategy.description}
              </p>
            </div>

            {currentStrategy.visual === 'array' && (
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                <VisualArray rows={fact.a} cols={fact.b} />
              </div>
            )}

            <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
              <h4 className="font-medium text-gray-700 mb-3">Steps:</h4>
              <ol className="space-y-3">
                {currentStrategy.steps.map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex gap-3"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-garden-100 text-garden-600 flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </motion.li>
                ))}
              </ol>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 px-4 py-2 text-gray-600 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        <div className="flex gap-1">
          {strategies.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === currentIndex ? 'bg-garden-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={currentIndex === strategies.length - 1}
          className="flex items-center gap-1 px-4 py-2 text-gray-600 disabled:opacity-30"
        >
          Next
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  )
}
