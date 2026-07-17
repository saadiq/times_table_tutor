import { motion } from 'framer-motion'

type VisualArrayProps = {
  rows: number
  cols: number
  /** Overrides the default multiplication rows x columns caption. */
  caption?: string
  /** Render the last N rows dimmed — a group being taken away. */
  fadedRows?: number
  /** Render the last N rows in gold — a group being added. */
  accentRows?: number
}

export function VisualArray({ rows, cols, caption, fadedRows = 0, accentRows = 0 }: VisualArrayProps) {
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
        {Array.from({ length: displayRows * displayCols }).map((_, i) => {
          const row = Math.floor(i / displayCols)
          const faded = fadedRows > 0 && row >= displayRows - fadedRows
          const accented = !faded && accentRows > 0 && row >= displayRows - accentRows
          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`w-4 h-4 rounded-full ${
                faded ? 'bg-gray-300 opacity-40' : accented ? 'bg-warm-400' : 'bg-garden-400'
              }`}
            />
          )
        })}
      </div>
      {isTruncated && (
        <p className="text-xs text-gray-400 mt-2">
          (Showing {displayRows}×{displayCols} of {rows}×{cols})
        </p>
      )}
      <p className="text-sm text-gray-600 mt-2">
        {caption ?? (
          <>
            {rows} rows × {cols} columns = <span className="font-bold text-garden-600">?</span>
          </>
        )}
      </p>
    </div>
  )
}
