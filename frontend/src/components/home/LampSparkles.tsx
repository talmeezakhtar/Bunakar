import { Sparkle } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'

type SparklePoint = { x: number; y: number; size: number; delay: number }

const POINTS: SparklePoint[] = [
  { x: -18, y: -6, size: 16, delay: 0 },
  { x: 14, y: -22, size: 20, delay: 0.07 },
  { x: 42, y: 4, size: 14, delay: 0.14 },
  { x: -4, y: 18, size: 12, delay: 0.21 },
  { x: 28, y: 24, size: 16, delay: 0.28 },
  { x: -30, y: 14, size: 12, delay: 0.35 },
]

type LampSparklesProps = {
  active: boolean
}

function LampSparkles({ active }: LampSparklesProps) {
  const reduce = useReducedMotion()
  if (reduce) return null

  return (
    // Burst from the spout tip (same anchor as LampSmoke), where the genie emerges.
    <div className="pointer-events-none absolute left-[96%] top-[28%] z-20 h-0 w-0">
      {POINTS.map((point, i) => (
        <motion.span
          key={i}
          className="absolute text-gold-300"
          style={{ left: point.x, top: point.y }}
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={
            active
              ? { opacity: [0, 1, 0], scale: [0.2, 1, 0.4], rotate: [0, 90] }
              : { opacity: 0, scale: 0 }
          }
          transition={{
            duration: 0.65,
            // Offset to flash as the genie forms (CreateDesignSection's REVEAL_TIMING.genie).
            delay: 0.45 + point.delay,
            ease: 'easeOut',
          }}
        >
          <Sparkle size={point.size} weight="fill" />
        </motion.span>
      ))}
    </div>
  )
}

export default LampSparkles
