import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import lampImg from '../../assets/lamp-big.png'
import genieImg from '../../assets/genie-wave.png'
import LampSparkles from './LampSparkles'
import DesignOption from './DesignOption'
import RugSetupModal from './RugSetupModal'
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
]

const RUB_REVERSALS_NEEDED = 5
const RUB_MOVE_THRESHOLD = 4

function CreateDesignSection() {
  const [revealed, setRevealed] = useState(false)
  const [rubbing, setRubbing] = useState(false)
  const [activeDesign, setActiveDesign] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const rubState = useRef({ lastX: 0, lastDir: 0, count: 0 })

  const reveal = () => setRevealed(true)

  function handlePointerEnter(e: React.PointerEvent) {
    if (revealed || e.pointerType !== 'mouse') return
    rubState.current = { lastX: e.clientX, lastDir: 0, count: 0 }
    setRubbing(true)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (revealed || e.pointerType !== 'mouse') return
    const dx = e.clientX - rubState.current.lastX
    if (Math.abs(dx) < RUB_MOVE_THRESHOLD) return
    const dir = dx > 0 ? 1 : -1
    if (rubState.current.lastDir !== 0 && dir !== rubState.current.lastDir) {
      rubState.current.count += 1
      if (rubState.current.count >= RUB_REVERSALS_NEEDED) {
        reveal()
      }
    }
    rubState.current.lastDir = dir
    rubState.current.lastX = e.clientX
  }

  function handlePointerLeave() {
    setRubbing(false)
    rubState.current.count = 0
    rubState.current.lastDir = 0
  }

  const active = activeDesign !== null ? designs[activeDesign] : null

  return (
    <section
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
              <motion.img
                src={genieImg}
                alt=""
                aria-hidden="true"
                style={{ transformOrigin: '50% 100%' }}
                initial={reduce ? false : { opacity: 0, y: 60, scale: 0.2, rotate: -10 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 110, damping: 12, delay: reduce ? 0 : 0.3 }}
                className="-mb-3 w-[240px] select-none drop-shadow-[0_22px_26px_rgba(0,0,0,0.5)] sm:w-[280px] md:w-[320px]"
              />
            )}

            <div className="relative flex items-end justify-center">
              <motion.div
                aria-hidden="true"
                className="absolute inset-x-0 top-1/4 h-2/3 rounded-full bg-gold-500/25 blur-3xl"
                animate={
                  reduce
                    ? { opacity: 0.25 }
                    : { opacity: [0.15, 0.32, 0.15], scale: [0.9, 1, 0.9] }
                }
                transition={{ duration: 3.4, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' }}
              />

              <LampSparkles active={revealed} />

              <motion.button
                type="button"
                onClick={reveal}
                onPointerEnter={handlePointerEnter}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onFocus={reveal}
                aria-label="Rub the lamp to reveal the starting patterns"
                layout
                transition={{ type: 'spring', stiffness: 160, damping: 16 }}
                className={`group relative z-10 cursor-pointer bg-transparent ${
                  revealed ? 'w-[170px] sm:w-[200px] md:w-[220px]' : 'w-[300px] sm:w-[360px] md:w-[400px]'
                }`}
              >
                <motion.img
                  src={lampImg}
                  alt="A golden magic lamp"
                  className="w-full select-none drop-shadow-[0_18px_22px_rgba(0,0,0,0.45)]"
                  animate={
                    reduce
                      ? {}
                      : rubbing && !revealed
                        ? { rotate: [-3, 3, -3] }
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
            animate={{ opacity: revealed ? 0 : 1 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none mt-4 text-sm text-sand-300/70"
          >
            Rub the lamp to begin
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
                onStart={() => setActiveDesign(index)}
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
