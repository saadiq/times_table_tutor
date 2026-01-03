import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

type ProgressBarProps = {
  current: number
  total: number
  showStars?: boolean
}

export function ProgressBar({ current, total, showStars = true }: ProgressBarProps) {
  const percentage = Math.min((current / total) * 100, 100)

  return (
    <div className="w-full">
      {showStars && (
        <div className="flex justify-between mb-1">
          {Array.from({ length: total }).map((_, i) => (
            <Star
              key={i}
              size={16}
              className={`transition-colors ${
                i < current
                  ? 'text-warm-400 fill-warm-400'
                  : 'text-gray-200'
              }`}
            />
          ))}
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-garden-400 to-garden-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
