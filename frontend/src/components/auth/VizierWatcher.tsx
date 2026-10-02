import { useEffect } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'motion/react'
import vizierImg from '../../assets/jafar.webp'

/**
 * idle      - waiting behind the gate
 * reading   - leaning over the card while you type your name/email
 * scheming  - password focused: he looms closer, the cobra staff starts to glow
 * gloating  - password shown: he's right over your shoulder, staff blazing
 * banished  - logged in: he vanishes in a puff of red smoke
 */
export type VizierMood = 'idle' | 'reading' | 'scheming' | 'gloating' | 'banished'

type VizierWatcherProps = {
  mood: VizierMood
  /** Bumped on every failed attempt - he cackles once. */
  errorCount: number
  /** Fires once the banish animation has finished. */
  onBanished: () => void
}

/** How far he leans toward the card on his right, per mood, pivoting at his feet. Kept small
 * enough that even gloating stays inside the gap beside the card - he never overlaps it. */
const LOOM: Record<VizierMood, { x: number; rotate: number; scale: number }> = {
  idle: { x: 0, rotate: 0, scale: 1 },
  reading: { x: 3, rotate: 1.5, scale: 1.03 },
  scheming: { x: 5, rotate: 2.5, scale: 1.06 },
  gloating: { x: 6, rotate: 3.5, scale: 1.09 },
  banished: { x: 0, rotate: 0, scale: 1 },
}

/** Staff-glow strength per mood - his hypnosis charging up as the password comes in. */
const GLOW: Record<VizierMood, number> = { idle: 0.35, reading: 0.5, scheming: 0.85, gloating: 1, banished: 0 }

const SMOKE_PUFFS = [
  { x: -70, y: -40, size: 90 },
  { x: 60, y: -70, size: 110 },
  { x: -20, y: -120, size: 120 },
  { x: 80, y: 10, size: 80 },
  { x: -90, y: 30, size: 80 },
  { x: 10, y: -10, size: 140 },
]

function VizierWatcher({ mood, errorCount, onBanished }: VizierWatcherProps) {
  const reduce = useReducedMotion()
  const cackle = useAnimationControls()
  const banished = mood === 'banished'

  useEffect(() => {
    if (errorCount === 0 || reduce) return
    // A shoulder-shaking laugh: quick small hops with a slight head-back tilt.
    cackle.start({
      y: [0, -7, 0, -7, 0, -5, 0],
      rotate: [0, -2, 1, -2, 1, -1, 0],
      transition: { duration: 0.75, ease: 'easeInOut' },
    })
  }, [errorCount, reduce, cackle])

  useEffect(() => {
    if (banished && reduce) onBanished()
  }, [banished, reduce, onBanished])

  const loom = reduce ? LOOM.idle : LOOM[mood]
  const glow = GLOW[mood]

  return (
    <div className="pointer-events-none relative w-[120px] lg:w-[190px] xl:w-[270px]" aria-hidden="true">
      {/* Red sorcery behind him - separates his black robe from the night sky. */}
      <motion.div
        style={{ x: '-50%' }}
        className="absolute left-1/2 top-[8%] h-[45%] w-[110%] rounded-full bg-[radial-gradient(closest-side,rgba(190,30,45,0.55),rgba(120,20,60,0.25)_55%,transparent)] blur-2xl"
        animate={{ opacity: banished ? 0 : 0.55 + glow * 0.45, scale: 0.9 + glow * 0.2 }}
        transition={{ duration: 0.5 }}
      />

      <motion.div
        animate={
          banished && !reduce
            ? { opacity: 0, scale: 0.55, y: -30, filter: 'blur(14px)' }
            : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
        }
        initial={reduce ? false : { opacity: 0, y: 40, filter: 'blur(8px)' }}
        transition={banished ? { duration: 0.7, ease: [0.55, 0, 0.9, 0.4], delay: 0.15 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => {
          if (banished && !reduce) onBanished()
        }}
      >
        {/* Slow, sinister breathing. */}
        <motion.div
          animate={reduce || banished ? {} : { y: [0, -6, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div animate={cackle}>
            <motion.div
              style={{ transformOrigin: '50% 100%' }}
              animate={loom}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              className="relative"
            >
              <img src={vizierImg} alt="" className="w-full select-none drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]" draggable={false} />

              {/* Cobra-staff eyes, calibrated to the snake head in jafar.png (~66% across,
                  ~37% down). Pulses while idle, burns steady as he schemes. */}
              <motion.span
                style={{ x: '-50%', y: '-50%' }}
                className="absolute left-[66%] top-[37%] h-[9%] w-[16%] rounded-full bg-[radial-gradient(closest-side,rgba(255,70,70,0.95),rgba(220,30,60,0.45)_45%,transparent)] mix-blend-screen blur-[3px]"
                animate={
                  reduce
                    ? { opacity: glow }
                    : mood === 'idle'
                      ? { opacity: [0.15, 0.45, 0.15], scale: [0.85, 1, 0.85] }
                      : { opacity: glow, scale: 0.9 + glow * 0.5 }
                }
                transition={mood === 'idle' && !reduce ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.35 }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Banish: a burst of red smoke where he stood. */}
      {banished && !reduce && (
        <div className="absolute left-1/2 top-[25%] h-0 w-0">
          {SMOKE_PUFFS.map((p, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-[radial-gradient(closest-side,rgba(170,35,60,0.7),rgba(90,20,70,0.35)_60%,transparent)] blur-md"
              style={{ width: p.size, height: p.size, left: -p.size / 2, top: -p.size / 2 }}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
              animate={{ opacity: [0, 0.95, 0], x: p.x, y: p.y, scale: 1.6 }}
              transition={{ duration: 1.1, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default VizierWatcher
