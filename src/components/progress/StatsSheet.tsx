import { motion } from 'framer-motion'
import { X, BarChart3 } from 'lucide-react'
import { MasteryGrid } from './MasteryGrid'
import { ActivityCalendar } from './ActivityCalendar'
import { FactDetailSheet } from './FactDetailSheet'
import { SyncStatusBadge } from './SyncStatusBadge'
import { useState } from 'react'
import type { FactProgress } from '../../types'

type StatsSheetProps = {
  isOpen: boolean
  onClose: () => void
}

export function StatsSheet({ isOpen, onClose }: StatsSheetProps) {
  const [detailFact, setDetailFact] = useState<FactProgress | null>(null)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-50"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-2xl max-h-[85vh] flex flex-col"
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-garden-600" />
            <h2 className="text-lg font-semibold text-gray-800">Detailed Stats</h2>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusBadge />
            <button
              onClick={onClose}
              aria-label="Close stats sheet"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mastery grid card */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Mastery Overview
            </h3>
            <MasteryGrid onFactSelect={setDetailFact} />
          </div>

          {/* Activity calendar card */}
          <ActivityCalendar />
        </div>
      </motion.div>

      {/* Fact detail sheet (nested) */}
      {detailFact && (
        <FactDetailSheet fact={detailFact} onClose={() => setDetailFact(null)} />
      )}
    </>
  )
}
