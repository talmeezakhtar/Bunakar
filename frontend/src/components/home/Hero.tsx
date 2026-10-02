import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useAnimationControls, useInView, useReducedMotion } from 'motion/react'
import palaceImg from '../../assets/palace-bg.webp'
import aladdinImg from '../../assets/aladdin-carpet.webp'

// The carpet's shadow reads its height: higher = softer, wider, fainter. Same structure in
// every value so Motion can interpolate between them.
const SHADOW_FAR = 'drop-shadow(0px 50px 55px rgba(0,0,0,0.15))'
const SHADOW_REST = 'drop-shadow(0px 25px 35px rgba(0,0,0,0.5))'
const SHADOW_HIGH = 'drop-shadow(0px 34px 44px rgba(0,0,0,0.36))'

function Hero() {
  const reduce = useReducedMotion()
  const riderControls = useAnimationControls()
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef)
  const [landed, setLanded] = useState(false)

  useEffect(() => {
    if (reduce) {
      riderControls.set({ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1, filter: SHADOW_REST })
      return
    }
    let cancelled = false
    riderControls
      .start({
        x: ['-62vw', '-16vw', '0vw'],
        y: ['-40vh', '3vh', '0vh'],
        rotate: [-18, 5, 0],
        opacity: [0, 1, 1],
        scale: [0.7, 1.04, 1],
        filter: [SHADOW_FAR, SHADOW_REST, SHADOW_REST],
        transition: {
          duration: 2.8,
          delay: 0.3,
          times: [0, 0.72, 1],
          ease: ['easeIn', 'easeOut'],
        },
      })
      .then(() => {
        if (!cancelled) setLanded(true)
      })
    return () => {
      cancelled = true
    }
  }, [reduce, riderControls])

  // Hover on the air once landed: the tilt runs on a different period than the bob so the
  // carpet never repeats the same pose, and the loop parks whenever the hero is scrolled away.
  useEffect(() => {
    if (!landed || reduce) return
    if (!inView) {
      riderControls.start({ y: '0vh', rotate: 0, filter: SHADOW_REST, transition: { duration: 0.4 } })
      return
    }
    const bob = { duration: 3.8, repeat: Infinity, ease: 'easeInOut' } as const
    riderControls.start({
      y: ['0vh', '-1.2vh', '0vh'],
      filter: [SHADOW_REST, SHADOW_HIGH, SHADOW_REST],
      rotate: [0, 1.4, 0, -1.4, 0],
      transition: {
        y: bob,
        filter: bob,
        rotate: { duration: 5.3, repeat: Infinity, ease: 'easeInOut' },
      },
    })
  }, [landed, inView, reduce, riderControls])

  // Copy lands while the carpet is still in flight - nobody waits out the entrance to read.
  const textDelayBase = reduce ? 0 : 0.6

  return (
    <section ref={sectionRef} className="relative h-[100dvh] overflow-hidden bg-night-950">
      <motion.div
        className="absolute inset-0"
        initial={reduce ? false : { opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
      >
        <img
          src={palaceImg}
          alt="A golden-domed palace above a lantern-lit desert town at sunset"
          width={1199}
          height={595}
          // The largest thing in the first view: fetch it ahead of everything else.
          fetchPriority="high"
          className="h-full w-full object-cover object-bottom"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-night-950/70 via-night-950/15 to-night-950" />
        <div className="absolute inset-0 bg-night-950/20" />
      </motion.div>

      <div className="relative z-10 grid h-full grid-rows-[1fr_auto] px-4 pb-[3%] pt-16 sm:pt-20">
        <div className="flex min-h-0 items-center justify-center overflow-hidden">
          <motion.img
            src={aladdinImg}
            alt="A rider soaring on a flying carpet"
            initial={
              reduce
                ? false
                : { x: '-62vw', y: '-40vh', rotate: -18, opacity: 0, scale: 0.7, filter: SHADOW_FAR }
            }
            animate={riderControls}
            style={reduce ? { filter: SHADOW_REST } : undefined}
            className="h-[clamp(100px,24vh,300px)] max-h-full w-auto select-none"
          />
        </div>

        <div className="flex flex-col items-center pb-2 text-center">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: textDelayBase }}
            className="max-w-2xl text-balance font-display text-[clamp(1.75rem,5vw,3.75rem)] leading-tight tracking-wide text-sand-100"
          >
            Let&apos;s Weave a Rug
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: textDelayBase + 0.25 }}
            className="mt-3 max-w-md text-balance text-[clamp(0.85rem,1.6vw,1.125rem)] text-sand-300 sm:mt-5"
          >
            Design a handwoven rug your way. Pick the shape, pattern and colors, then watch your carpet come to life.
          </motion.p>

          <motion.div
            className="mt-5 sm:mt-9"
            initial={reduce ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: textDelayBase + 0.5 }}
          >
            <Link
              to="/#create-design"
              className="inline-flex items-center rounded-full bg-gold-500 px-6 py-3 font-sans text-sm font-semibold tracking-wide text-night-950 shadow-[0_10px_30px_rgba(217,164,65,0.35)] transition-transform hover:-translate-y-0.5 hover:bg-gold-400 active:translate-y-0 active:scale-[0.98] sm:px-8 sm:py-3.5"
            >
              Let&apos;s Design
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Hero
