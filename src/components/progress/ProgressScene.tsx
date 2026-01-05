import { motion } from 'framer-motion'
import { TABLE_CHARACTERS } from '../../stores/progressViewStore'

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
  // Calculate visual progress (0 to 1)
  const progress = Math.min(1, revealedFacts / 144)

  // Tier affects warmth of the colored layer
  const tierWarmth = revealedTier * 0.06 // 0 -> 0.24 sepia for golden hour

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Bottom layer: grayscale/muted version (always visible) */}
      <img
        src="/scene.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ filter: 'grayscale(1) brightness(0.5)' }}
      />

      {/* Top layer: full color version fades in based on progress */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: progress }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        <img
          src="/scene.png"
          alt="Learning Tree"
          className="w-full h-full object-cover object-center"
          style={{ filter: `sepia(${tierWarmth})` }}
        />
      </motion.div>

      {/* Character mask overlays - hide unrevealed characters */}
      {TABLE_CHARACTERS.map((char) => {
        const isRevealed = revealedTables.includes(char.table)
        const isAnimating = animatingCharacter === char.table

        if (isRevealed && !isAnimating) return null

        return (
          <motion.div
            key={char.table}
            className="absolute"
            style={{
              top: char.position.top,
              left: char.position.left,
              width: char.position.width,
              height: char.position.height,
            }}
            initial={isAnimating ? { opacity: 1 } : false}
            animate={isAnimating ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Blur/darken overlay to hide character */}
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `radial-gradient(ellipse at center,
                  rgba(120, 115, 110, 0.98) 0%,
                  rgba(120, 115, 110, 0.85) 50%,
                  rgba(120, 115, 110, 0) 75%)`,
              }}
            />
          </motion.div>
        )
      })}

      {/* Sparkle effect for animating character */}
      {animatingCharacter && (
        <CharacterSparkle
          position={
            TABLE_CHARACTERS.find((c) => c.table === animatingCharacter)?.position
          }
        />
      )}
    </div>
  )
}

function CharacterSparkle({
  position,
}: {
  position?: { top: string; left: string; width: string; height: string }
}) {
  if (!position) return null

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.8] }}
      transition={{ duration: 1, times: [0, 0.2, 0.7, 1] }}
    >
      {/* Sparkle particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-yellow-300 rounded-full"
          style={{
            top: '50%',
            left: '50%',
          }}
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
