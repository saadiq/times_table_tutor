import { motion } from 'framer-motion'
import { Flower2, TreeDeciduous, Landmark, Sparkles } from 'lucide-react'
import type { GardenItem as GardenItemType } from '../../types'
import { GARDEN_ITEMS } from '../../lib/constants'

type GardenItemProps = {
  item: GardenItemType
  onDrag?: (id: string, position: { x: number; y: number }) => void
}

const typeIcons = {
  flower: Flower2,
  tree: TreeDeciduous,
  decoration: Sparkles,
  landmark: Landmark,
}

const typeColors = {
  flower: 'text-pink-500',
  tree: 'text-green-600',
  decoration: 'text-purple-500',
  landmark: 'text-amber-500',
}

const typeSizes = {
  flower: 32,
  tree: 48,
  decoration: 36,
  landmark: 56,
}

export function GardenItem({ item, onDrag }: GardenItemProps) {
  const Icon = typeIcons[item.type]
  const itemData = GARDEN_ITEMS[item.itemId]

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (onDrag) {
          onDrag(item.id, {
            x: item.position.x + info.offset.x,
            y: item.position.y + info.offset.y,
          })
        }
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileDrag={{ scale: 1.2, zIndex: 50 }}
      className="absolute cursor-grab active:cursor-grabbing"
      style={{ left: item.position.x, top: item.position.y }}
    >
      <div className="flex flex-col items-center">
        <Icon
          size={typeSizes[item.type]}
          className={`${typeColors[item.type]} drop-shadow-md`}
        />
        <span className="text-xs text-gray-500 mt-1 bg-white/80 px-1 rounded">
          {itemData?.name || item.itemId}
        </span>
      </div>
    </motion.div>
  )
}
