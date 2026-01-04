import { motion } from 'framer-motion'

type VisualArrayProps = {
  rows: number
  cols: number
}

export function VisualArray({ rows, cols }: VisualArrayProps) {
  // Limit display size for large numbers
  const displayRows = Math.min(rows, 10)
  const displayCols = Math.min(cols, 10)
  const isTruncated = rows > 10 || cols > 10

  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${displayCols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: displayRows * displayCols }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className="w-4 h-4 rounded-full bg-garden-400"
          />
        ))}
      </div>
      {isTruncated && (
        <p className="text-xs text-gray-400 mt-2">
          (Showing {displayRows}×{displayCols} of {rows}×{cols})
        </p>
      )}
      <p className="text-sm text-gray-600 mt-2">
        {rows} rows × {cols} columns = <span className="font-bold text-garden-600">?</span>
      </p>
    </div>
  )
}
