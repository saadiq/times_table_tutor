import { motion } from 'framer-motion'
import { Flower2 } from 'lucide-react'
import { Button } from '../common'

type GoalCompleteProps = {
  onKeepGoing: () => void
  onViewProgress: () => void
}

export function GoalComplete({ onKeepGoing, onViewProgress }: GoalCompleteProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="mb-4"
      >
        <Flower2 size={80} className="text-garden-500 mx-auto" />
      </motion.div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Goal Complete!</h2>
      <p className="text-gray-600 mb-6">
        Amazing work! Your scene is coming to life.
      </p>
      <div className="flex gap-3">
        <Button onClick={onKeepGoing}>Keep Going</Button>
        <Button variant="secondary" onClick={onViewProgress}>
          View Progress
        </Button>
      </div>
    </div>
  )
}
