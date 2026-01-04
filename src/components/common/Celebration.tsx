import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Sparkles } from 'lucide-react'

type CelebrationProps = {
  show: boolean
  type?: 'correct' | 'streak' | 'goal'
}

type ParticleData = {
  xOffset: number
  yFactor: number
  rotation: number
}

function generateParticles(count: number): ParticleData[] {
  return Array.from({ length: count }, () => ({
    xOffset: (Math.random() - 0.5) * 300,
    yFactor: Math.random() * 0.5,
    rotation: Math.random() * 360,
  }))
}

export function Celebration({ show, type = 'correct' }: CelebrationProps) {
  const particleCount = type === 'goal' ? 20 : type === 'streak' ? 12 : 6

  const particles = useMemo(
    () => generateParticles(particleCount),
    [particleCount]
  )

  const Icon = type === 'goal' ? Star : Sparkles
  const iconSize = type === 'goal' ? 32 : 24
  const iconClass =
    type === 'goal'
      ? 'text-warm-400 fill-warm-400'
      : type === 'streak'
        ? 'text-garden-400'
        : 'text-sky-300'

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {particles.map((particle, i) => (
            <motion.div
              key={i}
              initial={{
                x: i % 2 === 0 ? -50 : window.innerWidth + 50,
                y: window.innerHeight / 2,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                x: window.innerWidth / 2 + particle.xOffset,
                y: particle.yFactor * window.innerHeight,
                scale: [0, 1.5, 1],
                rotate: particle.rotation,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                duration: 0.8,
                delay: i * 0.03,
                ease: 'easeOut',
              }}
              className="absolute"
            >
              <Icon size={iconSize} className={iconClass} />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
