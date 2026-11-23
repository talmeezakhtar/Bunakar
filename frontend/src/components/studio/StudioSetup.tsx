import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import { formatFeetInches } from '../../types/tileDesign'
import type { Construction, Density, RugDoc, RugShapeKind } from '../../studio/model'
import { CONSTRUCTIONS, DENSITY_PRESETS, chartSize, newRug } from '../../studio/model'
import { SIZE_PRESETS, STARTER_PALETTES, paletteYarns } from '../../studio/palettes'
import type { Fibre } from '../../data/materials'
import { defaultBraid, withBraid } from '../../studio/braid'
import { constructionSample } from '../../studio/samples'
import RugPicker from './RugPicker'
import type { RugPick } from './RugPicker'

type ShapeChoice = 'rect' | 'runner' | 'round' | 'oval' | 'octagon'

const SHAPES: { id: ShapeChoice; label: string }[] = [
  { id: 'rect', label: 'Rectangle' },
  { id: 'runner', label: 'Runner' },
  { id: 'round', label: 'Round' },
  { id: 'oval', label: 'Oval' },
  { id: 'octagon', label: 'Octagon' },
]

/** Braided rugs are coiled: only rounds and ovals. */
const SHAPES_FOR: Partial<Record<Construction, ShapeChoice[]>> = { braided: ['round', 'oval'] }

/** The shape's outline, for its button. */
function ShapeIcon({ shape }: { shape: ShapeChoice }) {
  const path = {
    rect: <rect x="8" y="4" width="24" height="20" rx="1" />,
    runner: <rect x="15" y="1" width="10" height="26" rx="1" />,
    round: <circle cx="20" cy="14" r="11" />,
    oval: <ellipse cx="20" cy="14" rx="15" ry="10" />,
    octagon: <polygon points="15,3 25,3 31,9 31,19 25,25 15,25 9,19 9,9" />,
  }[shape]
  return (
    <svg viewBox="0 0 40 28" className="h-7 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {path}
    </svg>
  )
}

/** The rug drawn to scale on a one-foot grid, with its measurements. */
function RugPlan({ shape, w, h }: { shape: ShapeChoice; w: number; h: number }) {
  const pad = Math.max(w, h) * 0.16
  const box = `${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`
  const stroke = Math.max(w, h) / 120
  const outline =
    shape === 'round' ? <circle cx={w / 2} cy={h / 2} r={w / 2} /> : shape === 'oval' ? <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} /> : shape === 'octagon' ? (
      <polygon points={[[0.29, 0], [0.71, 0], [1, 0.29], [1, 0.71], [0.71, 1], [0.29, 1], [0, 0.71], [0, 0.29]].map(([x, y]) => `${x * w},${y * h}`).join(' ')} />
    ) : (
      <rect width={w} height={h} />
    )
  const font = Math.max(w, h) / 13
  return (
    <figure className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-3">
      <svg viewBox={box} className="h-52 w-full" aria-hidden="true">
        <defs>
          <pattern id="foot" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M1 0H0V1" fill="none" stroke="var(--color-line)" strokeWidth={stroke * 0.6} />
          </pattern>
        </defs>
        <g fill="url(#foot)" stroke="var(--color-ink)" strokeWidth={stroke * 1.6}>
          {outline}
        </g>
        <text x={w / 2} y={-pad * 0.35} textAnchor="middle" fontSize={font} fill="var(--color-muted)">
          {formatFeetInches(w)}
        </text>
        {shape !== 'round' && shape !== 'octagon' && (
          <text x={w + pad * 0.35} y={h / 2} textAnchor="middle" fontSize={font} fill="var(--color-muted)" transform={`rotate(90 ${w + pad * 0.35} ${h / 2})`}>
            {formatFeetInches(h)}
          </text>
        )}
      </svg>
      <figcaption className="mt-1 text-[0.8125rem] text-muted">To scale · each square is one foot</figcaption>
    </figure>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-ink">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm text-paper">{n}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/**
 * Starting a studio rug: what kind of rug (how it's made), its shape and size, how fine it is
 * (knots per inch), and the yarns to begin with. Everything can change later except the
 * construction, which decides the editing surface.
 */
export default function StudioSetup({ swatchesById, onStart, initial = 'knotted', fibre = 'wool' }: { swatchesById: Map<string, Swatch>; onStart: (doc: RugDoc) => void; initial?: Construction; fibre?: Fibre }) {
  const [construction, setConstruction] = useState<Construction>(initial)
  // Braided rugs coil: they start as a round, not a rectangle.
  const [shape, setShape] = useState<ShapeChoice>(SHAPES_FOR[initial]?.[0] ?? 'rect')
  const [size, setSize] = useState<[number, number]>(SHAPES_FOR[initial] ? [6, 6] : [6, 9])
  const [densityIndex, setDensityIndex] = useState(0)
  const [paletteId, setPaletteId] = useState(STARTER_PALETTES[0].id)

  const shapes = SHAPES_FOR[construction] ?? SHAPES.map((s) => s.id)
  const presets = SIZE_PRESETS[shape]
  const densities = DENSITY_PRESETS[construction]
  const density: Density = (densities[densityIndex] ?? densities[0]).density
  const cells = useMemo(() => chartSize(size[0], size[1], density), [size, density])
  // Each craft as its sample rug; the starting yarns shown on the rug you've chosen.
  const crafts = useMemo<RugPick<Construction>[]>(() => CONSTRUCTIONS.map((c) => ({ id: c.id, title: c.name, sub: c.hint, source: constructionSample(c.id, swatchesById) })), [swatchesById])
  const yarnPicks = useMemo<RugPick<string>[]>(
    () =>
      STARTER_PALETTES.map((p) => ({
        id: p.id,
        title: p.name,
        sub: p.swatchIds.map((id) => swatchesById.get(id)?.colorName ?? id).join(', '),
        detail: (
          <span className="flex h-3 max-w-56 overflow-hidden rounded-full ring-1 ring-white/25" aria-hidden="true">
            {p.swatchIds.map((id) => (
              <span key={id} className="flex-1" style={{ backgroundColor: swatchesById.get(id)?.swatchColor ?? '#ccc' }} />
            ))}
          </span>
        ),
        source: constructionSample(construction, swatchesById, p.swatchIds),
      })),
    [construction, swatchesById],
  )
  const charted = construction === 'knotted' || construction === 'flatweave' || construction === 'needlepoint'

  function pickConstruction(c: Construction) {
    setConstruction(c)
    setDensityIndex(0)
    const allowed = SHAPES_FOR[c]
    if (allowed && !allowed.includes(shape)) pickShape(allowed[0])
  }

  function pickShape(s: ShapeChoice) {
    setShape(s)
    setSize(SIZE_PRESETS[s][Math.min(1, SIZE_PRESETS[s].length - 1)])
  }

  function start() {
    const palette = STARTER_PALETTES.find((p) => p.id === paletteId) ?? STARTER_PALETTES[0]
    const shapeKind: RugShapeKind = shape === 'runner' ? 'rect' : shape
    const rug = newRug({
        construction,
        shape: { kind: shapeKind },
        widthFt: size[0],
        heightFt: size[1],
        density,
        palette: paletteYarns(palette.swatchIds, fibre),
        rugCategory: shape === 'runner' ? 'runner' : 'area',
        name: `${CONSTRUCTIONS.find((c) => c.id === construction)?.name ?? 'Rug'} ${formatFeetInches(size[0])} x ${formatFeetInches(size[1])}`,
      })
    // A braided rug starts with its braid already coiled.
    onStart(construction === 'braided' ? withBraid(rug, defaultBraid(rug.palette.length)) : rug)
  }

  return (
    <div className="relative isolate px-4 pb-28 pt-28 sm:px-6">
      <div aria-hidden="true" className="bg-girih pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] opacity-[0.07] [mask-image:linear-gradient(#000,transparent)]" />
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-[clamp(2.1rem,4.6vw,3.2rem)] font-semibold leading-[1.08] text-ink">Start a rug</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-2">
          Choose how it&apos;s made, its shape and size, and the yarns to begin with. You can change everything but how it&apos;s made later.
        </p>

        <div className="mt-10">
          <Step n={1} title="How is it made?">
            <RugPicker label="Construction" items={crafts} value={construction} onChange={pickConstruction} />
          </Step>

          <Step n={2} title="Shape and size">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
              <div>
                <div role="radiogroup" aria-label="Shape" className="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-2">
                  {SHAPES.filter((s) => shapes.includes(s.id)).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={shape === s.id}
                      onClick={() => pickShape(s.id)}
                      className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-1 text-[0.8125rem] font-medium transition-colors ${shape === s.id ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'}`}
                    >
                      <ShapeIcon shape={s.id} />
                      {s.label}
                    </button>
                  ))}
                </div>
                <div role="radiogroup" aria-label="Size" className="mt-4 flex flex-wrap gap-2">
                  {presets.map(([w, h]) => {
                    const on = size[0] === w && size[1] === h
                    return (
                      <button
                        key={`${w}x${h}`}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setSize([w, h])}
                        className={`min-h-11 rounded-full border px-4 text-[0.9375rem] tabular-nums transition-colors ${on ? 'border-accent bg-accent-soft/60 text-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}
                      >
                        {shape === 'round' || shape === 'octagon' ? `${formatFeetInches(w)} across` : `${formatFeetInches(w)} × ${formatFeetInches(h)}`}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.9375rem] text-ink-2">
                  <span>Or your own:</span>
                  {(['Width', 'Length'] as const).map((label, i) => (
                    <label key={label} className="inline-flex items-center gap-1.5">
                      <span className="sr-only">{label} in feet</span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        step={0.5}
                        value={size[i]}
                        disabled={i === 1 && (shape === 'round' || shape === 'octagon')}
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(60, Number(e.target.value) || 1))
                          setSize(i === 0 ? (shape === 'round' || shape === 'octagon' ? [v, v] : [v, size[1]]) : [size[0], v])
                        }}
                        className="w-20 rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-base text-ink tabular-nums focus:border-ink focus:outline-none disabled:opacity-50"
                      />
                      {i === 0 ? <span aria-hidden="true">×</span> : <span>ft</span>}
                    </label>
                  ))}
                </div>
              </div>
              <RugPlan shape={shape} w={size[0]} h={size[1]} />
            </div>
          </Step>

          <Step n={3} title={charted ? 'How fine is it?' : 'Detail'}>
            <div role="radiogroup" aria-label="Density" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {densities.map((d, i) => {
                const [main, note] = d.label.replace(')', '').split(' (')
                return (
                  <button
                    key={d.label}
                    type="button"
                    role="radio"
                    aria-checked={densityIndex === i}
                    onClick={() => setDensityIndex(i)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${densityIndex === i ? 'border-accent bg-accent-soft/60' : 'border-line bg-surface hover:border-line-strong'}`}
                  >
                    <span className="block font-medium text-ink">{main}</span>
                    {note && <span className="mt-0.5 block text-[0.875rem] capitalize text-muted">{note}</span>}
                  </button>
                )
              })}
            </div>
            {charted && (
              <p className="mt-3 text-[0.95rem] text-muted">
                Your chart will be {cells.cols.toLocaleString()} × {cells.rows.toLocaleString()} {construction === 'knotted' ? 'knots' : 'cells'} (
                {(cells.cols * cells.rows).toLocaleString()} in all).
              </p>
            )}
          </Step>

          <Step n={4} title="Yarns to begin with">
            <RugPicker label="Starting yarns" items={yarnPicks} value={paletteId} onChange={setPaletteId} />
          </Step>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <p className="min-w-0 truncate text-[0.95rem] text-ink-2">
            <span className="font-semibold text-ink">{CONSTRUCTIONS.find((c) => c.id === construction)?.name}</span> ·{' '}
            {SHAPES.find((s) => s.id === shape)?.label} · {formatFeetInches(size[0])} x {formatFeetInches(size[1])}
          </p>
          <button
            type="button"
            onClick={start}
            className="group inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-paper transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
          >
            Start designing <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
