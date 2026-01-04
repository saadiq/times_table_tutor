import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, ShoppingBag, Sparkles } from 'lucide-react'
import { useGardenStore } from '../../stores'
import { GARDEN_ITEMS } from '../../lib/constants'
import { Button } from '../common'

type ShopModalProps = {
  isOpen: boolean
  onClose: () => void
}

function getRandomPosition() {
  return { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 }
}

export function ShopModal({ isOpen, onClose }: ShopModalProps) {
  const { coins, spendCoins, addItem } = useGardenStore()

  const allDecorations = Object.entries(GARDEN_ITEMS)
    .filter(([, item]) => item.cost > 0)
    .map(([itemId, item]) => ({
      itemId,
      ...item,
      canAfford: coins >= item.cost,
    }))

  const handlePurchase = (itemId: string, cost: number, type: 'decoration') => {
    if (spendCoins(cost)) {
      addItem({
        type,
        itemId,
        position: getRandomPosition(),
        earnedFor: 'shop_purchase',
      })
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-purple-500" />
                <h2 className="font-semibold text-gray-800">Garden Shop</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-warm-600">
                  <Coins size={16} />
                  <span className="font-medium">{coins}</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Items grid */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-3">
                {allDecorations.map((item) => (
                  <motion.div
                    key={item.itemId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-xl border-2 ${
                      item.canAfford
                        ? 'border-purple-200 bg-purple-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Sparkles
                        size={32}
                        className={item.canAfford ? 'text-purple-500' : 'text-gray-400'}
                      />
                      <span className="text-sm font-medium text-gray-700 mt-2">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-warm-600 mt-1">
                        <Coins size={14} />
                        <span>{item.cost}</span>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => handlePurchase(item.itemId, item.cost, 'decoration')}
                        disabled={!item.canAfford}
                        className="mt-2 text-xs py-1 px-3"
                      >
                        {item.canAfford ? 'Buy' : 'Need more'}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {allDecorations.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No items available for purchase.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
