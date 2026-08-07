import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Modal } from './Modal'
import { Toggle } from './Toggle'
import { FocusTablePicker } from './FocusTablePicker'
import { SciencePage } from './SciencePage'
import { ProfileEditor } from './ProfileEditor'
import { useFocusTablesStore, useSettingsStore } from '../../stores'
import { useProfileStore } from '../../stores/profileStore'
import { useActiveOperation } from '../../hooks'
import { iconMap } from '../../lib/iconMap'
import type { ProfileIcon } from '../../types/api'

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { focusTables, toggleTable, clearTables, isEnabled, setEnabled } = useFocusTablesStore()
  const { ttsEnabled, setTtsEnabled } = useSettingsStore()
  const operation = useActiveOperation()
  const [showScience, setShowScience] = useState(false)
  const currentProfile = useProfileStore((s) => s.currentProfile)
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const ProfileIconComponent = currentProfile ? iconMap[currentProfile.icon as ProfileIcon] : null

  const hasSelection = focusTables.length > 0

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Settings">
        <div className="space-y-6">
          {currentProfile && ProfileIconComponent && (
            <button
              onClick={() => setShowProfileEditor(true)}
              className="flex items-center gap-3 w-full py-3 text-left hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center bg-${currentProfile.color}`}
              >
                <ProfileIconComponent className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-800">{currentProfile.name}</span>
                <p className="text-xs text-gray-500 mt-0.5">Change name, icon, or color</p>
              </div>
            </button>
          )}

          <div className="flex items-center justify-between py-3">
            <div>
              <span className="text-sm font-medium text-gray-800">Read aloud</span>
              <p className="text-xs text-gray-500 mt-0.5">Hear facts spoken out loud</p>
            </div>
            <Toggle checked={ttsEnabled} onChange={setTtsEnabled} ariaLabel="Read facts aloud" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-medium text-gray-800">
                {operation.copy.focusTitle}
              </h3>
              {hasSelection && (
                <button
                  onClick={clearTables}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              {hasSelection
                ? operation.copy.focusSummary(focusTables)
                : 'Select numbers to focus on, or practice all'}
            </p>
            <FocusTablePicker
              selectedTables={focusTables}
              onToggle={toggleTable}
            />
          </div>

          {hasSelection && (
            <div className="flex items-center justify-between py-3 border-t border-gray-100">
              <span className="text-sm text-gray-600">Apply focus during practice</span>
              <Toggle checked={isEnabled} onChange={setEnabled} ariaLabel="Apply focus during practice" />
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowScience(true)}
              className="flex items-center gap-3 w-full py-3 text-left text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <BookOpen size={18} className="text-garden-500" />
              <div>
                <span className="font-medium text-gray-800">The science behind this app</span>
                <p className="text-xs text-gray-500 mt-0.5">Why it works the way it does</p>
              </div>
            </button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {showScience && <SciencePage onClose={() => setShowScience(false)} />}
        {showProfileEditor && (
          <ProfileEditor onClose={() => setShowProfileEditor(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
