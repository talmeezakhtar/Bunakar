import { useEffect, useMemo, useRef, useState } from 'react'
import { CaretDown, X } from '@phosphor-icons/react'
import { MOTIF_DEFS, getMotif } from '../../data/motifs/catalogue'
import { artPaths, motifToSvg, resolveRoles } from '../../data/motifs/palette'
import type { MotifSpec } from '../../data/motifs/types'

const svgUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

/** A motif drawn in the rug's colours: a piece whole, a border as a strip of three repeats. */
function previewUrl(spec: MotifSpec, palette: string[]): string {
  const colors = resolveRoles(spec, palette.map((color, i) => ({ color, weight: palette.length - i })))
  if (spec.kind !== 'border') return svgUrl(motifToSvg(spec, colors))
  const [, , w, h] = spec.viewBox
  const units = [0, 1, 2].map((i) => `<g transform="translate(${i * w} 0)">${artPaths(spec, colors)}</g>`).join('')
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * 3} ${h}">${units}</svg>`)
}

/**
 * Choose a catalogue motif by sight: a button showing the current one, opening a grid of every
 * motif drawn in the rug's own colours, filtered by category.
 */
export default function MotifPicker({
  kind,
  value,
  onChange,
  palette,
  label,
  noneLabel,
  allowNone = true,
}: {
  kind: 'piece' | 'border'
  value: string | null | undefined
  onChange: (id: string | null) => void
  /** The rug's yarn colours, ground first. */
  palette: string[]
  label: string
  noneLabel: string
  allowNone?: boolean
}) {
  const [open, setOpen] = useState(false)
  const defs = useMemo(() => MOTIF_DEFS.filter((d) => d.kind === kind), [kind])
  const categories = useMemo(() => [...new Set(defs.map((d) => d.category))], [defs])
  const [category, setCategory] = useState<string>('All')
  const box = useRef<HTMLDivElement>(null)
  const paletteKey = palette.join()
  // Previews only once the grid is open (generating every motif costs a little).
  const previews = useMemo(() => {
    if (!open) return new Map<string, string>()
    const p = paletteKey.split(',')
    return new Map(defs.map((d) => [d.id, previewUrl(getMotif(d.id)!, p)]))
  }, [open, defs, paletteKey])
  const current = value ? getMotif(value) : undefined
  const currentUrl = useMemo(() => (current ? previewUrl(current, paletteKey.split(',')) : null), [current, paletteKey])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false))
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const pick = (id: string | null) => {
    onChange(id)
    setOpen(false)
  }
  const shown = category === 'All' ? defs : defs.filter((d) => d.category === category)
  const chip = (on: boolean) => `min-h-8 rounded-full px-3 text-[0.8125rem] transition-colors ${on ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={`${label}: ${current?.name ?? noneLabel}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-line-strong bg-surface px-2 text-left text-[0.875rem] text-ink transition-colors hover:border-ink"
      >
        <span className={`flex h-8 shrink-0 items-center justify-center overflow-hidden rounded bg-paper ${kind === 'border' ? 'w-16' : 'w-8'}`}>
          {currentUrl ? <img src={currentUrl} alt="" className="max-h-full max-w-full" /> : <span className="h-3 w-3 rounded-full border border-line-strong" />}
        </span>
        <span className="min-w-0 flex-1 truncate">{current?.name ?? noneLabel}</span>
        <CaretDown size={14} className="shrink-0 text-muted" />
      </button>
      {open && (
        <div role="dialog" aria-label={label} className="absolute left-0 top-full z-40 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-paper p-2 shadow-[var(--shadow-soft)]">
          {categories.length > 1 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {['All', ...categories].map((c) => (
                <button key={c} type="button" className={chip(category === c)} aria-pressed={category === c} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className={`grid max-h-[20rem] gap-1.5 overflow-y-auto pr-0.5 ${kind === 'border' ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {allowNone && (
              <button type="button" onClick={() => pick(null)} aria-pressed={!value} className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-1.5 text-[0.75rem] text-ink-2 ${!value ? 'border-ink' : 'border-line hover:border-line-strong'}`}>
                <X size={18} />
                {noneLabel}
              </button>
            )}
            {shown.map((d) => (
              <button
                key={d.id}
                type="button"
                title={d.name}
                aria-label={d.name}
                aria-pressed={value === d.id}
                onClick={() => pick(d.id)}
                className={`group flex flex-col items-center gap-1 rounded-lg border bg-surface p-1.5 transition-[border-color,transform] hover:-translate-y-0.5 ${value === d.id ? 'border-ink' : 'border-line hover:border-line-strong'}`}
              >
                <span className={`flex w-full items-center justify-center ${kind === 'border' ? 'h-10' : 'aspect-square'}`}>
                  {previews.get(d.id) && <img src={previews.get(d.id)} alt="" loading="lazy" className="max-h-full max-w-full" />}
                </span>
                <span className="w-full truncate text-center text-[0.6875rem] leading-tight text-ink-2">{d.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
