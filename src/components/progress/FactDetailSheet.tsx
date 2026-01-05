import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Clock, Target } from 'lucide-react'
import { useAttemptsStore } from '../../stores/attemptsStore'
import type { FactProgress, Confidence } from '../../types'

type FactDetailSheetProps = {
  fact: FactProgress
  onClose: () => void
}

const confidenceColors: Record<Confidence, string> = {
  new: 'bg-gray-200 text-gray-700',
  learning: 'bg-warm-300 text-warm-800',
  confident: 'bg-garden-300 text-garden-800',
  mastered: 'bg-garden-600 text-white',
}

const confidenceLabels: Record<Confidence, string> = {
  new: 'New',
  learning: 'Learning',
  confident: 'Confident',
  mastered: 'Mastered',
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function FactDetailSheet({ fact, onClose }: FactDetailSheetProps) {
  const getFactAttempts = useAttemptsStore(state => state.getFactAttempts)
  const attempts = getFactAttempts(fact.fact)

  // Calculate stats
  const totalAttempts = attempts.length
  const correctAttempts = attempts.filter(a => a.correct).length
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

  // Average response time
  const avgResponseTime = totalAttempts > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.responseTimeMs, 0) / totalAttempts)
    : 0

  // Input method trend (last 5 attempts)
  const recentAttempts = attempts.slice(-5)
  const inputMethodCounts = recentAttempts.reduce(
    (acc, a) => {
      acc[a.inputMethod] = (acc[a.inputMethod] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const primaryMethod = Object.entries(inputMethodCounts).sort((a, b) => b[1] - a[1])[0]
  const inputMethodTrend = primaryMethod
    ? primaryMethod[0] === 'number_pad' ? 'Number pad' : 'Multiple choice'
    : 'No data'

  // Recent streak (last 5 attempts as dots)
  const recentStreak = fact.recentAttempts.slice(-5)

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-[70]"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[80] bg-white rounded-t-3xl shadow-xl safe-area-pb"
      >
        <div className="p-6">
          {/* Handle bar */}
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">
                {fact.a} x {fact.b} = {fact.answer}
              </h2>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${confidenceColors[fact.confidence]}`}>
                {confidenceLabels[fact.confidence]}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Target className="w-5 h-5 mx-auto text-garden-500 mb-1" />
              <div className="text-xl font-bold text-gray-800">{accuracy}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-sky-500 mb-1" />
              <div className="text-xl font-bold text-gray-800">{totalAttempts}</div>
              <div className="text-xs text-gray-500">Attempts</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 mx-auto text-warm-500 mb-1" />
              <div className="text-xl font-bold text-gray-800">
                {avgResponseTime > 0 ? formatResponseTime(avgResponseTime) : '--'}
              </div>
              <div className="text-xs text-gray-500">Avg time</div>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Last practiced</span>
              <span className="font-medium text-gray-800">{formatRelativeTime(fact.lastSeen)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Input method trend</span>
              <span className="font-medium text-gray-800">{inputMethodTrend}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Recent streak</span>
              <div className="flex gap-1">
                {recentStreak.length > 0 ? (
                  recentStreak.map((correct, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${correct ? 'bg-garden-500' : 'bg-red-400'}`}
                    />
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">No attempts</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
