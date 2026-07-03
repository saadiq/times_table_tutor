import { Lightbulb, SkipForward } from 'lucide-react'
import { Button } from '../common'

type PracticeActionsProps = {
  onHint: () => void
  onSkip: () => void
}

export function PracticeActions({ onHint, onSkip }: PracticeActionsProps) {
  return (
    <div className="flex justify-center gap-4 mt-4">
      <Button variant="ghost" onClick={onHint} className="flex items-center gap-2">
        <Lightbulb size={18} />
        Hint
      </Button>
      <Button variant="ghost" onClick={onSkip} className="flex items-center gap-2">
        <SkipForward size={18} />
        Skip
      </Button>
    </div>
  )
}
