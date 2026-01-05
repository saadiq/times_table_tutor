import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TreeDeciduous } from 'lucide-react'
import { useP5 } from './p5'

type ProgressSceneProps = {
  revealedFacts: number
  revealedTables: number[]
  revealedTier: number
  animatingCharacter?: number | null
}

export function ProgressScene({
  revealedFacts,
  revealedTables,
  revealedTier,
  animatingCharacter,
}: ProgressSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Observe container size for responsive canvas
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setDimensions({ width: Math.floor(width), height: Math.floor(height) })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const { isReady, error } = useP5(containerRef, {
    revealedFacts,
    revealedTables,
    revealedTier,
    animatingCharacter: animatingCharacter ?? null,
    width: dimensions.width,
    height: dimensions.height,
  })

  // Fallback UI when canvas fails
  if (error) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 to-garden-200 flex items-center justify-center">
        <div className="text-center text-garden-600">
          <TreeDeciduous size={64} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm opacity-75">Your learning tree</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ opacity: isReady ? 1 : 0, transition: 'opacity 0.3s ease-in' }}
      />

      {/* Sparkle effect for animating character */}
      {animatingCharacter && <CharacterSparkle tableNum={animatingCharacter} />}
    </div>
  )
}

function CharacterSparkle({ tableNum }: { tableNum: number }) {
  // Position sparkles based on animal positions (matching animals.ts order)
  const positions = [
    { top: '88%', left: '8%' },
    { top: '45%', left: '85%' },
    { top: '32%', left: '62%' },
    { top: '50%', left: '38%' },
    { top: '85%', left: '88%' },
    { top: '82%', left: '15%' },
    { top: '22%', left: '50%' },
    { top: '80%', left: '78%' },
    { top: '90%', left: '25%' },
    { top: '28%', left: '30%' },
    { top: '88%', left: '70%' },
    { top: '78%', left: '55%' },
  ]

  const pos = positions[tableNum - 1]
  if (!pos) return null

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        top: pos.top,
        left: pos.left,
        width: '15%',
        height: '12%',
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.8] }}
      transition={{ duration: 1, times: [0, 0.2, 0.7, 1] }}
    >
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-yellow-300 rounded-full"
          style={{ top: '50%', left: '50%' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((i * Math.PI) / 4) * 40,
            y: Math.sin((i * Math.PI) / 4) * 40,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      ))}
    </motion.div>
  )
}
