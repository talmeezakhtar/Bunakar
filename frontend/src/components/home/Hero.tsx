import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import { COLORWAYS, findTemplate } from '../../data/patternTemplates'
import type { Colorway } from '../../data/patternTemplates'
import { applyTemplate } from '../../data/patternTemplates'
import { ROOM_PHOTOS } from '../../data/roomPhotos'
import { createDefaultTileDesign } from '../../types/tileDesign'
import RugPhotoSlide from '../tileDesigner/RugPhotoSlide'
import type { RugArt } from '../tileDesigner/RugPhotoSlide'
import { introDelay } from '../../utils/intro'
import { renderTileFills } from '../tileDesigner/renderTiles'

const SWATCHES_BY_ID = new Map(MOCK_SWATCHES.map((s) => [s.id, s]))
const HERO_ROOM = ROOM_PHOTOS.find((p) => p.id === 'area-2') ?? ROOM_PHOTOS[0]
const HERO_TEMPLATE = findTemplate('persian-medallion')
// A 9 x 6 ft rug: 6 x 4 of the 18" tiles, the proportions of the rug space in the photo.
const HERO_SIZE = { w: 6, h: 4 }

function swatchColor([familyId, colorName]: readonly [string, string]) {
  return MOCK_SWATCHES.find((s) => s.familyId === familyId && s.colorName === colorName)?.swatchColor ?? '#ccc'
}

function heroRug(colorway: Colorway): RugArt {
  const state = HERO_TEMPLATE
    ? applyTemplate(createDefaultTileDesign(HERO_SIZE.w, HERO_SIZE.h), HERO_TEMPLATE, colorway, MOCK_SWATCHES)
    : createDefaultTileDesign(HERO_SIZE.w, HERO_SIZE.h)
  return { width: HERO_SIZE.w, height: HERO_SIZE.h, render: (prefix) => renderTileFills(state, SWATCHES_BY_ID, prefix) }
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

/** The 2D hero, for devices without WebGL (the 3D tour replaces it everywhere else). */
function Hero() {
  const reduce = useReducedMotion()
  const [colorwayId, setColorwayId] = useState('kilim-red')
  const colorway = COLORWAYS.find((c) => c.id === colorwayId) ?? COLORWAYS[0]
  const rug = useMemo(() => heroRug(colorway), [colorway])

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay: delay + introDelay(), ease: [0.22, 1, 0.36, 1] as const },
        }

  return (
    <section className="relative overflow-x-clip bg-paper pt-16">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:py-14">
        <div className="max-w-xl">
          <HeroCopy enter={enter} />
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] ring-1 ring-line">
            <RugPhotoSlide photo={HERO_ROOM} rug={rug} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">{HERO_TEMPLATE?.name}</span> &middot; 9 &times; 6 ft &middot; {colorway.name}
            </p>
            <ColourwayPicker value={colorway.id} onChange={setColorwayId} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero
