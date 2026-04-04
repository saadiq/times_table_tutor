import { motion } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import type { FactProgress } from '../../types'
import { useSettingsStore } from '../../stores'
import { speakProblem } from '../../lib/speech'

type ProblemDisplayProps = {
  fact: FactProgress
}

export function ProblemDisplay({ fact }: ProblemDisplayProps) {
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled)

  return (
    <motion.div
      key={fact.fact}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-8"
    >
      <div className="text-6xl md:text-7xl font-bold text-gray-800 tracking-tight">
        <span>{fact.a}</span>
        <span className="text-garden-500 mx-3">×</span>
        <span>{fact.b}</span>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-lg">
        <span>What's the answer?</span>
        {ttsEnabled && (
          <button
            onClick={() => speakProblem(fact.a, fact.b)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Hear the problem read aloud"
          >
            <Volume2 size={20} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
