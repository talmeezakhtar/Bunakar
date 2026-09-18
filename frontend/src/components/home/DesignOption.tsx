import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type DesignOptionProps = {
  eyebrow: string
  title: string
  description: string
  wishLabel: string
  visual: ReactNode
  index: number
  onStart: () => void
}

function DesignOption({ eyebrow, title, description, wishLabel, visual, index, onStart }: DesignOptionProps) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: -32, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 210,
        damping: 22,
        delay: reduce ? 0 : 0.55 + index * 0.16,
      }}
      className="flex flex-col gap-5 rounded-2xl border border-night-600 bg-night-800 p-5 sm:flex-row sm:gap-6"
    >
      <div className="sm:w-48 sm:shrink-0">
        <span className="inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-semibold tracking-wide text-night-950">
          {wishLabel}
        </span>
        <div className="mt-3">{visual}</div>
      </div>

      <div className="flex flex-1 flex-col">
        <p className="text-xs uppercase tracking-wide text-sand-300/60">{eyebrow}</p>
        <h3 className="font-display text-xl tracking-wide text-sand-100">{title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-sand-300/80">{description}</p>

        <button
          type="button"
          onClick={onStart}
          className="mt-4 inline-flex w-fit items-center justify-center rounded-full border border-gold-500/60 bg-transparent px-5 py-2.5 text-sm font-semibold tracking-wide text-gold-400 transition-colors hover:border-gold-400 hover:bg-gold-500 hover:text-night-950 active:scale-[0.98]"
        >
          Start Designing
        </button>
      </div>
    </motion.div>
  )
}

export default DesignOption
