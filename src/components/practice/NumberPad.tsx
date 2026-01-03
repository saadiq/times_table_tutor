import { useState } from 'react'
import { motion } from 'framer-motion'
import { Delete, Check } from 'lucide-react'

type NumberPadProps = {
  onSubmit: (answer: number) => void
  disabled: boolean
}

export function NumberPad({ onSubmit, disabled }: NumberPadProps) {
  const [value, setValue] = useState('')

  const handleNumber = (num: string) => {
    if (value.length < 3) {
      setValue(prev => prev + num)
    }
  }

  const handleDelete = () => {
    setValue(prev => prev.slice(0, -1))
  }

  const handleSubmit = () => {
    if (value) {
      onSubmit(parseInt(value, 10))
      setValue('')
    }
  }

  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']

  return (
    <div className="max-w-xs mx-auto">
      {/* Display */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-4 text-center min-h-[64px] flex items-center justify-center">
        <span className="text-4xl font-bold text-gray-800">
          {value || <span className="text-gray-300">?</span>}
        </span>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {buttons.map((btn) => {
          if (btn === 'del') {
            return (
              <motion.button
                key={btn}
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                disabled={disabled || !value}
                className="p-4 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <Delete size={24} className="text-gray-600" />
              </motion.button>
            )
          }

          if (btn === 'ok') {
            return (
              <motion.button
                key={btn}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={disabled || !value}
                className="p-4 rounded-xl bg-garden-500 hover:bg-garden-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <Check size={24} className="text-white" />
              </motion.button>
            )
          }

          return (
            <motion.button
              key={btn}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNumber(btn)}
              disabled={disabled}
              className="p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-garden-300 transition-colors disabled:opacity-50 text-2xl font-semibold text-gray-800"
            >
              {btn}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
