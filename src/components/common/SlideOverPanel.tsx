import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

type SlideOverPanelProps = {
  title: string
  onClose: () => void
  children: React.ReactNode
}

/**
 * Full-screen panel that slides in from the right over the whole app, with a
 * titled header and a scrollable body. Render inside an AnimatePresence so the
 * exit animation plays.
 *
 * The panel covers the bottom nav and has no backdrop or Escape dismissal, so
 * the back arrow is the only way out and is never disabled — a caller that
 * blocked it during a slow request could strand the child behind an opaque
 * overlay with every control on screen inert.
 */
export function SlideOverPanel({ title, onClose, children }: SlideOverPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[var(--color-cream)] z-50 flex flex-col"
    >
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-garden-500 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-12">{children}</div>
    </motion.div>
  )
}
