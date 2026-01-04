import { motion } from 'framer-motion'
import { Flower2, TreeDeciduous, Landmark, Armchair, Bird, Bug, Waves, Castle, TreePine, Cherry, Fence } from 'lucide-react'
import type { GardenItem as GardenItemType } from '../../types'
import { GARDEN_ITEMS } from '../../lib/constants'

type GardenItemProps = {
  item: GardenItemType
  onDrag?: (id: string, position: { x: number; y: number }) => void
}

// Item-specific icons
const itemIcons: Record<string, typeof Flower2> = {
  // Flowers
  daisy: Flower2,
  tulip: Flower2,
  sunflower: Flower2,
  rose: Flower2,
  lavender: Flower2,
  // Trees
  oak: TreeDeciduous,
  cherry: Cherry,
  pine: TreePine,
  // Decorations
  bench: Armchair,
  birdhouse: Bird,
  butterfly: Bug,
  pond: Waves,
  // Landmarks
  fountain: Waves,
  treehouse: TreeDeciduous,
  gazebo: Fence,
  castle: Castle,
}

const typeIcons = {
  flower: Flower2,
  tree: TreeDeciduous,
  decoration: Bird,
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
  // Use item-specific icon if available, fall back to type icon
  const Icon = itemIcons[item.itemId] || typeIcons[item.type]
  const itemData = GARDEN_ITEMS[item.itemId]

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={(_, info) => {
        if (onDrag) {
          onDrag(item.id, {
            x: item.position.x + info.offset.x,
            y: item.position.y + info.offset.y,
          })
        }
      }}
      initial={{ scale: 0, x: 0, y: 0 }}
      animate={{ scale: 1, x: 0, y: 0 }}
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
