import { TIMES_TABLES } from '../../lib/constants'

type FocusTablePickerProps = {
  selectedTables: number[]
  onToggle: (table: number) => void
  compact?: boolean
}

export function FocusTablePicker({
  selectedTables,
  onToggle,
  compact = false,
}: FocusTablePickerProps) {
  const tables = Array.from(
    { length: TIMES_TABLES.max - TIMES_TABLES.min + 1 },
    (_, i) => i + TIMES_TABLES.min
  )

  const buttonSize = compact ? 'w-8 h-8 text-sm' : 'w-12 h-12'
  const gap = compact ? 'gap-1' : 'gap-2'

  return (
    <div className={`flex ${gap} overflow-x-auto pb-2`}>
      {tables.map(table => {
        const isSelected = selectedTables.includes(table)
        return (
          <button
            key={table}
            onClick={() => onToggle(table)}
            className={`flex-shrink-0 ${buttonSize} rounded-xl font-bold transition-colors ${
              isSelected
                ? 'bg-garden-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {table}
          </button>
        )
      })}
    </div>
  )
}
