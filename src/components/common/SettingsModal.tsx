import { Modal } from './Modal'
import { FocusTablePicker } from './FocusTablePicker'
import { useFocusTablesStore } from '../../stores'

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { focusTables, toggleTable, clearTables, isEnabled, setEnabled } = useFocusTablesStore()

  const hasSelection = focusTables.length > 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-6">
        {/* Focus Tables Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-gray-800">
              Focus Tables
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
              ? `Practicing: ${focusTables.join(', ')} times tables`
              : 'Select tables to focus on, or practice all'}
          </p>
          <FocusTablePicker
            selectedTables={focusTables}
            onToggle={toggleTable}
          />
        </div>

        {/* Enable/Disable Toggle */}
        {hasSelection && (
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <span className="text-sm text-gray-600">Apply focus during practice</span>
            <button
              onClick={() => setEnabled(!isEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                isEnabled ? 'bg-garden-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
