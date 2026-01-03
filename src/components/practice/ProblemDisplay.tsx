import { motion } from 'framer-motion'
import type { FactProgress } from '../../types'

type ProblemDisplayProps = {
  fact: FactProgress
}

export function ProblemDisplay({ fact }: ProblemDisplayProps) {
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
      <div className="mt-4 text-gray-400 text-lg">
        What's the answer?
      </div>
    </motion.div>
  )
}
