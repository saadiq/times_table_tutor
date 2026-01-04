import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Coins, Palette } from 'lucide-react'
import { useGardenStore } from '../../stores'
import { GardenItem } from './GardenItem'

export function GardenView() {
  const { items, coins, currentTheme, moveItem } = useGardenStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDrag = (id: string, position: { x: number; y: number }) => {
    // Constrain to container bounds
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect()
      const constrainedPosition = {
        x: Math.max(0, Math.min(position.x, bounds.width - 50)),
        y: Math.max(0, Math.min(position.y, bounds.height - 50)),
      }
      moveItem(id, constrainedPosition)
    }
  }

  const themeBackgrounds = {
    flower: 'bg-gradient-to-b from-sky-100 via-green-50 to-green-100',
    forest: 'bg-gradient-to-b from-sky-200 via-green-100 to-green-200',
    underwater: 'bg-gradient-to-b from-blue-200 via-blue-100 to-cyan-100',
    space: 'bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-800',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Coins size={20} className="text-warm-500" />
          <span className="font-semibold text-gray-800">{coins}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Palette size={18} />
          <span className="text-sm capitalize">{currentTheme} Garden</span>
        </div>
      </div>

      {/* Garden area */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden ${themeBackgrounds[currentTheme]}`}
      >
        {/* Ground line */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-green-200/50 to-transparent" />

        {/* Items */}
        {items.map(item => (
          <GardenItem key={item.id} item={item} onDrag={handleDrag} />
        ))}

        {/* Empty state */}
        {items.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center p-6 bg-white/80 rounded-2xl max-w-xs">
              <p className="text-gray-600">
                Your garden is waiting to grow!
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Practice some problems to earn flowers and decorations.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
