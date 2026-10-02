import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import lampImg from '../../assets/lamp-big.webp'
import genieImg from '../../assets/genie-wave.webp'
import LampSmoke from './LampSmoke'
import LampSparkles from './LampSparkles'
import DesignOption from './DesignOption'
import RugSetupModal from './RugSetupModal'
import { useAuth } from '../../hooks/useAuth'
import PatternThumb from './PatternThumb'
import type { PatternFamily } from './PatternThumb'

function GridVisual() {
  return (
    <PatternThumb
      family="blank"
      className="aspect-[3/2] w-full overflow-hidden rounded-md border border-night-600"
    />
  )
}

function ThumbGrid({ family }: { family: PatternFamily }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <PatternThumb
          key={i}
          family={family}
          variant={i}
          className="aspect-square w-full overflow-hidden rounded-md border border-night-600"
        />
      ))}
    </div>
  )
}

const designs: {
  eyebrow: string
  title: string
  wishLabel: string
  family: PatternFamily
  description: string
  visual: ReactNode
}[] = [
  {
    eyebrow: 'Start from a',
    title: 'Blank Canvas',
    wishLabel: 'Wish One',
    family: 'blank',
    description: 'Begin with an empty grid and make your own rug with a wide world of custom design possibilities.',
    visual: <GridVisual />,
  },
  {
    eyebrow: 'Start from a',
    title: 'Pattern Template',
    wishLabel: 'Wish Two',
    family: 'template',
    description: 'Bring a custom rug pattern to life with colors and styles that speak to you.',
    visual: <ThumbGrid family="template" />,
  },
  {
    eyebrow: 'Start from a',
    title: 'Pre-Designed Rug',
    wishLabel: 'Wish Three',
    family: 'predesigned',
    description: 'Choose one of our most loved rug design templates and make it your own.',
    visual: <ThumbGrid family="predesigned" />,
  },
  {
    eyebrow: 'Start from a',
    title: 'Freeform Rug',
    wishLabel: 'Wish Four',
    family: 'freeform',
    description: 'Hand-tufted in one piece: flowing shapes, carved grooves and plush pile in any colour.',
    visual: <ThumbGrid family="freeform" />,
  },
]

const RUB_REVERSALS_NEEDED = 5
const RUB_MOVE_THRESHOLD = 4

/** Reveal choreography, in seconds after the lamp is opened: the lamp settles, smoke leaves the
 * spout (LampSmoke, ~0.2s), the genie condenses out of it, sparkles flash as he forms
 * (LampSparkles), then the three wishes arrive (DesignOption, from ~0.95s). */
const REVEAL_TIMING = { genie: 0.45 }

/** Rubbing needs a hovering mouse; touch and pen visitors get told to tap instead. */
const canRub = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

function CreateDesignSection() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Back from logging in to start a design: the lamp is already open and that design's setup resumes.
  const resumeDesign = user ? (location.state as { startDesign?: number } | null)?.startDesign : undefined
  const [revealed, setRevealed] = useState(resumeDesign !== undefined)
  const [rubbing, setRubbing] = useState(false)
  const [rubs, setRubs] = useState(0)
  const [activeDesign, setActiveDesign] = useState<number | null>(resumeDesign ?? null)

  /** Choosing a rug type, template or size is for signed-in users - log in first, then resume. */
  function startDesign(index: number) {
    if (user) setActiveDesign(index)
    else navigate('/login', { state: { from: '/#create-design', fromState: { startDesign: index } } })
  }
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef)
  const rubState = useRef({ lastX: 0, lastDir: 0 })

  const reveal = () => setRevealed(true)
  const rubProgress = Math.min(rubs / RUB_REVERSALS_NEEDED, 1)
  // The wobble grows with every stroke, so the lamp visibly "wakes up" under the hand.
  const wobble = 3 + rubProgress * 4

  function handlePointerEnter(e: React.PointerEvent) {
    if (revealed || e.pointerType !== 'mouse') return
    rubState.current = { lastX: e.clientX, lastDir: 0 }
    setRubbing(true)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (revealed || e.pointerType !== 'mouse') return
    const dx = e.clientX - rubState.current.lastX
    if (Math.abs(dx) < RUB_MOVE_THRESHOLD) return
    const dir = dx > 0 ? 1 : -1
    if (rubState.current.lastDir !== 0 && dir !== rubState.current.lastDir) {
      const next = rubs + 1
      setRubs(next)
      if (next >= RUB_REVERSALS_NEEDED) reveal()
    }
    rubState.current.lastDir = dir
    rubState.current.lastX = e.clientX
  }

  // Progress survives slipping off the lamp - only the direction tracking restarts.
  function handlePointerLeave() {
    setRubbing(false)
    rubState.current.lastDir = 0
  }

  const active = activeDesign !== null ? designs[activeDesign] : null
  const hint = rubs > 0 ? 'Keep rubbing…' : canRub ? 'Rub the lamp to begin' : 'Tap the lamp to begin'

  return (
    <section
      ref={sectionRef}
      id="create-design"
      className="scroll-mt-16 overflow-hidden bg-night-950 px-4 py-24 sm:py-28"
    >
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="font-display text-3xl tracking-wide text-sand-100 sm:text-4xl">
          Begin With a Pattern
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-sand-300/80">
          Start from a pattern our weavers know by heart, then reshape it into something only you
          have.
        </p>
      </div>

      <div
        className={`mx-auto mt-16 flex max-w-5xl flex-col items-center gap-12 md:flex-row md:gap-10 ${
          revealed ? '' : 'md:justify-center'
        }`}
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="flex shrink-0 flex-col items-center"
        >
          <div className="flex flex-col items-center">
            {revealed && (
              // Outer layer: the idle float, pivoting on the tail so the genie sways from the
              // spout. Parks while the section is offscreen.
              <motion.div
                style={{ transformOrigin: '76% 98%' }}
                className="-mb-6 w-[240px] drop-shadow-[0_22px_26px_rgba(0,0,0,0.5)] sm:w-[280px] md:w-[320px]"
                animate={reduce || !inView ? { y: 0, rotate: 0 } : { y: [0, -8, 0], rotate: [0, 1.2, 0, -1.2, 0] }}
                transition={
                  reduce || !inView
                    ? { duration: 0.4 }
                    : {
                        y: { duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: REVEAL_TIMING.genie + 1 },
                        rotate: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: REVEAL_TIMING.genie + 1 },
                      }
                }
              >
                {/* Inner layer: the entrance - he condenses out of the smoke, growing from the
                    tail tip, which sits over the lamp's spout. */}
                <motion.img
                  src={genieImg}
                  alt=""
                  aria-hidden="true"
                  style={{ transformOrigin: '76% 98%' }}
                  initial={reduce ? false : { opacity: 0, scale: 0.12, rotate: 14, filter: 'blur(12px)' }}
                  animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }}
                  transition={{
                    delay: reduce ? 0 : REVEAL_TIMING.genie,
                    scale: { type: 'spring', stiffness: 120, damping: 14, delay: REVEAL_TIMING.genie },
                    rotate: { type: 'spring', stiffness: 120, damping: 14, delay: REVEAL_TIMING.genie },
                    opacity: { duration: 0.35, delay: REVEAL_TIMING.genie },
                    filter: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: REVEAL_TIMING.genie },
                  }}
                  className="w-full select-none"
                />
              </motion.div>
            )}

            <div className="relative flex items-end justify-center">
              {/* Glow brightens with each rub stroke (outer), pulses only while the lamp is
                  still waiting and on screen (inner), then holds steady once opened. */}
              <motion.div
                aria-hidden="true"
                className="absolute inset-x-0 top-1/4 h-2/3"
                animate={{ opacity: revealed ? 1 : 0.55 + rubProgress * 0.45, scale: 1 + rubProgress * 0.15 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="h-full w-full rounded-full bg-gold-500/25 blur-3xl"
                  animate={
                    reduce || revealed || !inView
                      ? { opacity: 0.3, scale: 1 }
                      : { opacity: [0.25, 0.55, 0.25], scale: [0.9, 1, 0.9] }
                  }
                  transition={
                    reduce || revealed || !inView
                      ? { duration: 0.6 }
                      : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
                  }
                />
              </motion.div>

              <LampSmoke rubs={rubs} revealed={revealed} />
              <LampSparkles active={revealed} />

              <motion.button
                type="button"
                onClick={reveal}
                onPointerEnter={handlePointerEnter}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                aria-label="Open the lamp to reveal the starting patterns"
                layout
                transition={{ type: 'spring', stiffness: 160, damping: 16 }}
                className={`group relative z-10 cursor-pointer bg-transparent ${
                  revealed ? 'w-[170px] sm:w-[200px] md:w-[220px]' : 'w-[300px] sm:w-[360px] md:w-[400px]'
                }`}
              >
                <motion.img
                  src={lampImg}
                  alt="A golden magic lamp"
                  loading="lazy"
                  decoding="async"
                  width={700}
                  height={382}
                  className="w-full select-none drop-shadow-[0_18px_22px_rgba(0,0,0,0.45)]"
                  animate={
                    reduce
                      ? {}
                      : rubbing && !revealed
                        ? { rotate: [-wobble, wobble, -wobble] }
                        : { rotate: 0 }
                  }
                  transition={
                    rubbing && !revealed
                      ? { duration: 0.35, repeat: Infinity, ease: 'easeInOut' }
                      : { type: 'spring', stiffness: 300, damping: 18 }
                  }
                />
              </motion.button>
            </div>
          </div>

          <motion.p
            aria-hidden={revealed}
            aria-live="polite"
            animate={{ opacity: revealed ? 0 : 1 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none mt-4 text-sm text-sand-300/70"
          >
            {hint}
          </motion.p>
        </motion.div>

        {revealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex w-full flex-col gap-4"
          >
            {designs.map((design, index) => (
              <DesignOption
                key={design.title}
                eyebrow={design.eyebrow}
                title={design.title}
                wishLabel={design.wishLabel}
                visual={design.visual}
                description={design.description}
                index={index}
                onStart={() => startDesign(index)}
              />
            ))}
          </motion.div>
        )}
      </div>

      {active && (
        <RugSetupModal
          onClose={() => setActiveDesign(null)}
          patternName={active.title}
          patternFamily={active.family}
        />
      )}
    </section>
  )
}

export default CreateDesignSection
