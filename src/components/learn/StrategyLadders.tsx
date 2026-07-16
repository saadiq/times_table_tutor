import { TrendingUp } from 'lucide-react'
import { LADDERS, type Ladder } from '../../lib/ladders'

interface StrategyLaddersProps {
  onSelect: (ladder: Ladder) => void
}

export function StrategyLadders({ onSelect }: StrategyLaddersProps) {
  return (
    <>
      <h2 className="text-lg font-semibold text-gray-800 mt-4 mb-3">Strategy Ladders</h2>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {LADDERS.map(ladder => (
          <button
            key={ladder.id}
            onClick={() => onSelect(ladder)}
            className="flex-shrink-0 w-40 text-left bg-sky-50 hover:bg-sky-100 rounded-xl p-3 transition-colors"
          >
            <TrendingUp size={18} className="text-sky-600 mb-1" />
            <div className="font-semibold text-gray-800 text-sm">{ladder.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{ladder.subtitle}</div>
          </button>
        ))}
      </div>
    </>
  )
}
