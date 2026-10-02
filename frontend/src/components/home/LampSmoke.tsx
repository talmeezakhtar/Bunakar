import { motion, useReducedMotion } from 'motion/react'

/** Genie-tinted smoke, so the plume and the figure that forms out of it read as one substance. */
const SMOKE = 'rgba(156, 205, 245, 0.55)'

/** The reveal plume rises from the spout up and back over the lamp, where the genie takes shape.
 * Starts at 0.2s so the lamp has nearly finished shrinking and the spout has stopped moving. */
const PLUME = [
  { x: -6, y: -40, size: 26, delay: 0.2 },
  { x: -22, y: -80, size: 34, delay: 0.26 },
  { x: -46, y: -118, size: 44, delay: 0.32 },
  { x: -70, y: -150, size: 54, delay: 0.38 },
  { x: -92, y: -186, size: 62, delay: 0.44 },
  { x: -64, y: -210, size: 58, delay: 0.5 },
  { x: -110, y: -230, size: 50, delay: 0.56 },
]

type LampSmokeProps = {
  /** Rub strokes counted so far - each new one puffs a wisp. */
  rubs: number
  revealed: boolean
}

function Puff({ x, y, size, delay, duration }: { x: number; y: number; size: number; delay: number; duration: number }) {
  return (
    <motion.span
      className="absolute rounded-full"
      style={{ width: size, height: size, left: -size / 2, top: -size / 2, background: SMOKE, filter: 'blur(7px)' }}
      initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
      animate={{ opacity: [0, 0.9, 0], x, y, scale: 1.5 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1], opacity: { duration, delay, times: [0, 0.25, 1] } }}
    />
  )
}

function LampSmoke({ rubs, revealed }: LampSmokeProps) {
  const reduce = useReducedMotion()
  if (reduce) return null

  // Only the last few rub wisps stay mounted; older ones have long faded anyway.
  const wisps = []
  for (let i = Math.max(1, rubs - 2); i <= rubs; i++) wisps.push(i)

  return (
    // Anchored on the spout tip of lamp-big.png (~96% across, ~28% down).
    <div className="pointer-events-none absolute left-[96%] top-[28%] z-20 h-0 w-0">
      {wisps.map((i) => (
        <Puff key={`rub-${i}`} x={(i % 2 ? 1 : -1) * 8} y={-34 - i * 3} size={16 + i * 2} delay={0} duration={1.1} />
      ))}
      {revealed && PLUME.map((p, i) => <Puff key={`plume-${i}`} {...p} duration={1.4} />)}
    </div>
  )
}

export default LampSmoke
