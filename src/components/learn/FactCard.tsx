import { motion } from 'framer-motion'
import type { FactProgress, Confidence } from '../../types'
import { Circle, CircleDot, CircleCheck, Star } from 'lucide-react'

type FactCardProps = {
  fact: FactProgress
  onClick: () => void
}

const confidenceIcons: Record<Confidence, typeof Circle> = {
  new: Circle,
  learning: CircleDot,
  confident: CircleCheck,
  mastered: Star,
}

const confidenceColors: Record<Confidence, string> = {
  new: 'bg-gray-100 border-gray-200',
  learning: 'bg-sky-50 border-sky-200',
  confident: 'bg-garden-50 border-garden-200',
  mastered: 'bg-warm-50 border-warm-200',
}

export function FactCard({ fact, onClick }: FactCardProps) {
  const Icon = confidenceIcons[fact.confidence]

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-3 rounded-xl border-2 text-center transition-colors ${confidenceColors[fact.confidence]}`}
    >
      <div className="text-lg font-bold text-gray-800">
        {fact.a} × {fact.b}
      </div>
      <div className="flex items-center justify-center gap-1 mt-1">
        <Icon size={12} className="text-gray-400" />
        <span className="text-xs text-gray-500">{fact.answer}</span>
      </div>
    </motion.button>
  )
}
