import { motion } from 'framer-motion'
import { Check, Loader2, Cloud, CloudOff } from 'lucide-react'
import { useAttemptsStore } from '../../stores/attemptsStore'

type StatusConfig = {
  icon: typeof Check
  color: string
  bgColor: string
  text: string
}

const statusConfigs: Record<string, StatusConfig> = {
  synced: {
    icon: Check,
    color: 'text-garden-500',
    bgColor: 'bg-garden-100',
    text: 'Synced',
  },
  syncing: {
    icon: Loader2,
    color: 'text-sky-500',
    bgColor: 'bg-sky-100',
    text: 'Syncing...',
  },
  offline: {
    icon: CloudOff,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    text: 'Offline',
  },
  error: {
    icon: Cloud,
    color: 'text-warm-500',
    bgColor: 'bg-warm-100',
    text: 'Sync failed',
  },
}

type SyncStatusBadgeProps = {
  showText?: boolean
}

export function SyncStatusBadge({ showText = true }: SyncStatusBadgeProps) {
  const syncStatus = useAttemptsStore((s) => s.syncStatus)
  const pendingSync = useAttemptsStore((s) => s.pendingSync)

  const config = statusConfigs[syncStatus]
  const Icon = config.icon
  const pendingCount = pendingSync.length
  const showPendingCount = pendingCount > 0 && syncStatus !== 'syncing'

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgColor}`}
    >
      {syncStatus === 'syncing' ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
        </motion.div>
      ) : (
        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
      )}

      {showText && <span className={config.color}>{config.text}</span>}

      {showPendingCount && (
        <span className="rounded-full bg-warm-200 px-1.5 text-[10px] text-warm-700">
          {pendingCount}
        </span>
      )}
    </div>
  )
}
