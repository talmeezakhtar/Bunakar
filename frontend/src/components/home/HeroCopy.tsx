import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import { COLORWAYS } from '../../data/patternTemplates'

function swatchColor([familyId, colorName]: readonly [string, string]) {
  return MOCK_SWATCHES.find((s) => s.familyId === familyId && s.colorName === colorName)?.swatchColor ?? '#ccc'
}

/** Five colourway chips; the hero rug (photo or 3D) follows the one picked. */
export function ColourwayPicker({ value, onChange, onDark = false }: { value: string; onChange: (id: string) => void; onDark?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Try a colourway" className="flex gap-1.5">
      {COLORWAYS.map((c) => {
        const selected = c.id === value
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.id)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 ${
              selected ? `ring-2 ring-ink ring-offset-2 ${onDark ? 'ring-offset-transparent' : 'ring-offset-paper'}` : ''
            }`}
          >
            <span className="grid h-8 w-8 grid-cols-2 overflow-hidden rounded-full ring-1 ring-black/10">
              {c.roles.map((role, i) => (
                <span key={i} style={{ backgroundColor: swatchColor(role) }} />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function HeroCopy({ enter }: { enter: (delay: number) => object }) {
  return (
    <>
      <motion.h1
        {...enter(0)}
        className="font-display text-[clamp(2.5rem,5.4vw,4.6rem)] font-medium leading-[1.02] tracking-[-0.02em] text-ink"
      >
        Design your own hand-knotted rug.
      </motion.h1>
      <motion.p {...enter(0.12)} className="mt-6 max-w-md text-lg leading-relaxed text-ink-2 max-lg:hidden">
        Draw it knot by knot, start from a Persian classic, or turn a photo into a chart. See it woven in a room, then hand
        the weavers of Bhadohi a chart they can knot from.
      </motion.p>
      <motion.div {...enter(0.24)} className="mt-8 flex flex-wrap items-center gap-3 max-lg:mt-4">
        <Link
          to="/studio?new=1"
          className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-paper transition-[background-color,transform] duration-200 hover:bg-accent-hover active:scale-[0.98]"
        >
          Design your rug
          <ArrowRight size={18} weight="bold" className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
        <Link
          to="/#how-it-works"
          className="inline-flex min-h-12 items-center rounded-full px-5 text-base font-medium text-ink underline decoration-line-strong underline-offset-[6px] transition-colors hover:decoration-ink"
        >
          How it works
        </Link>
      </motion.div>
      <motion.p {...enter(0.32)} className="mt-6 text-sm text-ink-2 max-lg:hidden">
        <span className="font-semibold text-ink">Free to start.</span>{' '}
        <Link to="/pricing" className="underline decoration-line-strong underline-offset-4 hover:text-accent">
          Pro
        </Link>{' '}
        adds unlimited designs and production exports.
      </motion.p>
    </>
  )
}
