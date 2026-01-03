import type { ReactNode } from 'react'
import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'answer'

type ButtonProps = Omit<HTMLMotionProps<'button'>, 'ref'> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  isCorrect?: boolean
  isWrong?: boolean
  children?: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-garden-500 hover:bg-garden-600 text-white shadow-sm',
  secondary: 'bg-warm-100 hover:bg-warm-200 text-gray-800',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
  answer: 'bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 hover:border-garden-300',
}

const sizeStyles = {
  sm: 'py-2 px-4 text-sm',
  md: 'py-3 px-6 text-base',
  lg: 'py-4 px-8 text-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isCorrect, isWrong, className = '', children, ...props }, ref) => {
    let stateStyles = ''
    if (isCorrect) {
      stateStyles = 'bg-garden-500 border-garden-500 text-white'
    } else if (isWrong) {
      stateStyles = 'bg-warm-100 border-warm-300'
    }

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.95 }}
        className={`
          rounded-2xl font-medium transition-colors
          focus:outline-none focus:ring-2 focus:ring-garden-400 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${stateStyles}
          ${className}
        `}
        {...props}
      >
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
