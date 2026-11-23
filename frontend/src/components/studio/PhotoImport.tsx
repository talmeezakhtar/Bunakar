import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ArrowCounterClockwise, ImageSquare, UploadSimple, X } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import type { Point, Quad } from '../../utils/perspective'
import type { PhotoChartResult } from '../../studio/photoChart'
import { applySwaps } from '../../studio/photoChart'
import { photoToChartAsync } from '../../studio/photoChartClient'

type Photo = { data: Uint8ClampedArray; width: number; height: number; url: string }
type Corner = keyof Quad
const CORNERS: { id: Corner; label: string }[] = [
  { id: 'topLeft', label: 'Top-left corner' },
  { id: 'topRight', label: 'Top-right corner' },
  { id: 'bottomRight', label: 'Bottom-right corner' },
  { id: 'bottomLeft', label: 'Bottom-left corner' },
]
/** Photos are read at most this long a side: plenty for any chart, light to move to the worker. */
const MAX_SIDE = 2000
const PREVIEW_CELLS = 180

async function readPhoto(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  await img.decode()
  const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * k))
  const height = Math.max(1, Math.round(img.naturalHeight * k))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, width, height)
  return { data: ctx.getImageData(0, 0, width, height).data, width, height, url }
}

/** RGB pixels (3 per knot) or chart cells in the given yarns, as a data URL one pixel per knot. */
function pixelsUrl(cols: number, rows: number, at: (i: number) => [number, number, number]): string {
  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(cols, rows)
  for (let i = 0; i < cols * rows; i++) {
    const [r, g, b] = at(i)
    img.data[i * 4] = r
    img.data[i * 4 + 1] = g
    img.data[i * 4 + 2] = b
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}
const hexRgb = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
/** Area of the marked quad, in photo pixels (shoelace). */
const quadArea = (q: Quad) => {
  const p = [q.topLeft, q.topRight, q.bottomRight, q.bottomLeft]
  return Math.abs(p.reduce((a, v, i) => a + v.x * p[(i + 1) % 4].y - p[(i + 1) % 4].x * v.y, 0)) / 2
}
const LOUPE = 132

const insetQuad = (w: number, h: number): Quad => {
  const m = 0.01
  return { topLeft: { x: w * m, y: h * m }, topRight: { x: w * (1 - m), y: h * m }, bottomRight: { x: w * (1 - m), y: h * (1 - m) }, bottomLeft: { x: w * m, y: h * (1 - m) } }
}

/**
 * Turn a photo into a knot chart: choose a photo, drag four handles to the rug's corners so it's
 * read straight, choose how many yarns, then make the chart. A preview re-runs as you adjust.
 */
export default function PhotoImport({
  cols,
  rows,
  swatches,
  paletteSwatchIds,
  onDone,
  onClose,
}: {
  cols: number
  rows: number
  swatches: Swatch[]
  paletteSwatchIds: string[]
  onDone: (result: PhotoChartResult) => void
  onClose: () => void
}) {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [quad, setQuad] = useState<Quad | null>(null)
  const [colors, setColors] = useState(12)
  const [only, setOnly] = useState<'catalogue' | 'rug'>('catalogue')
  const [cleanup, setCleanup] = useState<0 | 1 | 2>(1)
  const [evenLight, setEvenLight] = useState(true)
  const [raw, setRaw] = useState<PhotoChartResult | null>(null)
  const [swaps, setSwaps] = useState<Record<string, string>>({})
  const [swapping, setSwapping] = useState<string | null>(null)
  const [show, setShow] = useState<'chart' | 'photo'>('chart')
  const [loupe, setLoupe] = useState<{ corner: Corner; p: Point } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const img = useRef<HTMLImageElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const byId = new Map(swatches.map((s) => [s.id, s]))

  const yarns = (only === 'rug' ? paletteSwatchIds.map((id) => byId.get(id)).filter((s): s is Swatch => !!s) : swatches)
    .filter((s) => /^#[0-9a-f]{6}$/i.test(s.swatchColor))
    .map((s) => ({ id: s.id, hex: s.swatchColor }))
  const yarnKey = yarns.map((y) => y.id).join()

  useEffect(() => {
    dialog.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url)
  }, [photo])

  // The preview: the same conversion at a small size, after the settings settle.
  useEffect(() => {
    if (!photo || !quad || !yarns.length) return
    let live = true
    const k = Math.min(1, PREVIEW_CELLS / Math.max(cols, rows))
    const pc = Math.max(4, Math.round(cols * k))
    const pr = Math.max(4, Math.round(rows * k))
    const t = window.setTimeout(() => {
      photoToChartAsync({ data: photo.data, width: photo.width, height: photo.height, quad, cols: pc, rows: pr, colors, yarns, cleanup, evenLight, withSample: true })
        .then((res) => live && setRaw(res))
        .catch(() => live && setError('The preview could not be made from this photo.'))
    }, 220)
    return () => {
      live = false
      window.clearTimeout(t)
    }
    // byId and yarns are rebuilt each render; yarnKey stands for them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, quad, colors, yarnKey, cleanup, evenLight, cols, rows])

  // Swaps and the photo/chart toggle redraw from the last result, without running it again.
  const swapKey = JSON.stringify(swaps)
  const preview = useMemo(() => {
    if (!raw) return null
    const res = applySwaps(raw, JSON.parse(swapKey) as Record<string, string>)
    const rgb = res.swatchIds.map((id) => hexRgb(byId.get(id)?.swatchColor ?? '#888888'))
    const sample = raw.sample
    return {
      chart: pixelsUrl(res.cols, res.rows, (i) => rgb[res.cells[i] - 1]),
      photo: sample ? pixelsUrl(raw.cols, raw.rows, (i) => [sample[i * 3], sample[i * 3 + 1], sample[i * 3 + 2]]) : null,
    }
    // byId is rebuilt each render from the same swatches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, swapKey])
  const total = raw ? raw.counts.reduce((a, b) => a + b, 0) : 1

  async function choose(file: File | undefined) {
    if (!file) return
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) return setError('Choose a JPEG, PNG or WebP photo.')
    setError(null)
    try {
      const p = await readPhoto(file)
      setPhoto(p)
      setQuad(insetQuad(p.width, p.height))
      setRaw(null)
      setSwaps({})
    } catch {
      setError('That photo could not be read.')
    }
  }

  /** A pointer position in photo pixels. */
  const toPhoto = (clientX: number, clientY: number): Point | null => {
    const r = img.current?.getBoundingClientRect()
    if (!r || !photo) return null
    return { x: Math.min(photo.width, Math.max(0, ((clientX - r.left) / r.width) * photo.width)), y: Math.min(photo.height, Math.max(0, ((clientY - r.top) / r.height) * photo.height)) }
  }
  const drag = (corner: Corner) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const el = e.currentTarget
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // A pointer the browser no longer tracks; the drag still follows its moves over the handle.
    }
    const move = (ev: PointerEvent) => {
      const p = toPhoto(ev.clientX, ev.clientY)
      if (!p) return
      setQuad((q) => q && { ...q, [corner]: p })
      setLoupe({ corner, p })
    }
    const up = () => {
      setLoupe(null)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }
  const nudge = (corner: Corner) => (e: ReactKeyboardEvent) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!d || !photo) return
    e.preventDefault()
    const step = (e.shiftKey ? 10 : 1) * Math.max(1, photo.width / 400)
    setQuad((q) => q && { ...q, [corner]: { x: Math.min(photo.width, Math.max(0, q[corner].x + d[0] * step)), y: Math.min(photo.height, Math.max(0, q[corner].y + d[1] * step)) } })
  }

  async function make() {
    if (!photo || !quad || !yarns.length) return
    setBusy(true)
    setError(null)
    try {
      onDone(applySwaps(await photoToChartAsync({ data: photo.data, width: photo.width, height: photo.height, quad, cols, rows, colors, yarns, cleanup, evenLight }), swaps))
    } catch {
      setError('The chart could not be made. Try fewer colours or another photo.')
      setBusy(false)
    }
  }

  const pct = (p: Point) => (photo ? { left: `${(p.x / photo.width) * 100}%`, top: `${(p.y / photo.height) * 100}%` } : {})
  const radio = (on: boolean) => `min-h-9 rounded-full border px-3 text-[0.875rem] transition-colors ${on ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2 hover:border-ink hover:text-ink'}`

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-3 backdrop-blur-sm sm:p-6" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="photo-title" className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-paper shadow-[var(--shadow-soft)] outline-none">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h2 id="photo-title" className="font-display text-xl font-semibold text-ink">
              Chart from a photo
            </h2>
            <p className="text-[0.875rem] text-muted">
              {cols.toLocaleString()} × {rows.toLocaleString()} knots, matched to real yarns
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {!photo ? (
          <div className="p-5">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                void choose(e.dataTransfer.files[0])
              }}
              className={`flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 text-center transition-colors ${dragOver ? 'border-accent bg-accent-soft/40' : 'border-line-strong bg-surface'}`}
            >
              <ImageSquare size={40} className="text-muted" aria-hidden="true" />
              <p className="text-lg font-medium text-ink">Drop a photo of a rug, or a picture to weave</p>
              <p className="max-w-md text-[0.95rem] text-ink-2">Shot from above in even light works best. You&apos;ll mark its corners next, so a photo taken at an angle is fine.</p>
              <button type="button" onClick={() => fileInput.current?.click()} className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 font-medium text-paper transition-colors hover:bg-ink-2">
                <UploadSimple size={17} /> Choose a photo
              </button>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" onChange={(e) => void choose(e.target.files?.[0])} />
            </div>
            <p className="mt-3 text-[0.8125rem] text-muted">Use only photos you took or have permission to use. The photo stays on this device; only the finished chart is saved with your rug.</p>
            {error && <p role="alert" className="mt-2 text-[0.875rem] text-accent">{error}</p>}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1fr_20rem]">
            <div className="flex flex-col gap-2 border-b border-line p-4 lg:sticky lg:top-0 lg:self-start lg:border-b-0 lg:border-r">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.9rem] text-ink-2">Drag the four handles to the rug&apos;s corners (or focus one and use the arrow keys).</p>
                <button type="button" onClick={() => setQuad(insetQuad(photo.width, photo.height))} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[0.875rem] text-ink-2 hover:bg-surface-2 hover:text-ink">
                  <ArrowCounterClockwise size={15} /> Reset corners
                </button>
              </div>
              <div className="flex items-center justify-center rounded-xl bg-surface-2/60 p-3 lg:min-h-0 lg:flex-1">
                <div className="relative inline-block max-h-[50svh] touch-none select-none lg:max-h-[60vh]">
                  <img ref={img} src={photo.url} alt="Your photo" draggable={false} className="block max-h-[50svh] max-w-full rounded-md lg:max-h-[60vh]" />
                  {quad && (
                    <>
                      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${photo.width} ${photo.height}`} preserveAspectRatio="none" aria-hidden="true">
                        <polygon
                          points={CORNERS.map((c) => `${quad[c.id].x},${quad[c.id].y}`).join(' ')}
                          fill="rgba(168,53,43,0.12)"
                          stroke="#a8352b"
                          strokeWidth={Math.max(2, photo.width / 300)}
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                      {CORNERS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          aria-label={c.label}
                          onPointerDown={drag(c.id)}
                          onKeyDown={nudge(c.id)}
                          style={pct(quad[c.id])}
                          className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-paper bg-accent shadow-md outline-none ring-accent/40 transition-transform focus-visible:scale-125 focus-visible:ring-4 active:cursor-grabbing"
                        />
                      ))}
                      {loupe && img.current && (
                        // A magnifier on the far side from the corner being placed, so a finger doesn't hide it.
                        <div
                          aria-hidden="true"
                          className={`pointer-events-none absolute top-2 overflow-hidden rounded-full border-4 border-paper shadow-lg ${loupe.corner === 'topLeft' || loupe.corner === 'bottomLeft' ? 'right-2' : 'left-2'}`}
                          style={(() => {
                            const z = (img.current.clientWidth / photo.width) * 4
                            return {
                              width: LOUPE,
                              height: LOUPE,
                              backgroundImage: `url(${photo.url})`,
                              backgroundSize: `${photo.width * z}px ${photo.height * z}px`,
                              backgroundPosition: `${LOUPE / 2 - loupe.p.x * z}px ${LOUPE / 2 - loupe.p.y * z}px`,
                              backgroundRepeat: 'no-repeat',
                            }
                          })()}
                        >
                          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-accent" />
                          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-accent" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              {quad && quadArea(quad) < cols * rows * 0.6 && (
                <p className="rounded-lg bg-saffron/20 px-3 py-2 text-[0.875rem] text-ink">
                  This photo has fewer pixels across the rug than your chart has knots, so fine detail will come out soft. A larger photo gives a sharper chart.
                </p>
              )}
              <button type="button" onClick={() => fileInput.current?.click()} className="self-start text-[0.875rem] text-ink-2 underline underline-offset-4 hover:text-ink">
                Choose another photo
              </button>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" onChange={(e) => void choose(e.target.files?.[0])} />
            </div>

            <div className="flex flex-col gap-4 p-4">
              <label className="block text-[0.875rem] text-ink-2">
                <span className="flex justify-between">
                  Colours <span className="tabular-nums text-ink">{colors}</span>
                </span>
                <input type="range" min={4} max={32} value={colors} onChange={(e) => setColors(Number(e.target.value))} className="mt-1 w-full accent-[var(--color-accent)]" />
              </label>
              <div role="radiogroup" aria-label="Yarns to use" className="flex flex-wrap gap-1.5">
                <button type="button" role="radio" aria-checked={only === 'catalogue'} className={radio(only === 'catalogue')} onClick={() => setOnly('catalogue')}>
                  Any catalogue yarn
                </button>
                <button type="button" role="radio" aria-checked={only === 'rug'} className={radio(only === 'rug')} onClick={() => setOnly('rug')}>
                  Only this rug&apos;s yarns
                </button>
              </div>
              <div role="radiogroup" aria-label="Tidy" className="flex flex-wrap gap-1.5">
                {(
                  [
                    [0, 'As it is'],
                    [1, 'No lone knots'],
                    [2, 'Smooth edges'],
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={cleanup === v} className={radio(cleanup === v)} onClick={() => setCleanup(v)}>
                    {l}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 text-[0.875rem] text-ink-2">
                <input type="checkbox" checked={evenLight} onChange={(e) => setEvenLight(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
                Even out the light (shadows, lamps)
              </label>
              <div>
                <div role="radiogroup" aria-label="Preview shows" className="mb-1.5 inline-flex rounded-full border border-line p-0.5">
                  {(['chart', 'photo'] as const).map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={show === v} onClick={() => setShow(v)} className={`min-h-8 rounded-full px-3 text-[0.8125rem] capitalize transition-colors ${show === v ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>
                      {v === 'chart' ? 'Chart' : 'Photo'}
                    </button>
                  ))}
                </div>
                <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-surface-2/60 p-2">
                  {preview ? (
                    <img
                      src={show === 'photo' && preview.photo ? preview.photo : preview.chart}
                      alt={show === 'photo' ? 'The photo, straightened' : 'Preview of the chart'}
                      className="max-h-full max-w-full rounded-sm shadow-sm [image-rendering:pixelated]"
                    />
                  ) : (
                    <span className="text-[0.875rem] text-muted">Preparing a preview…</span>
                  )}
                </div>
              </div>
              {raw && (
                <div>
                  <p className="text-[0.8125rem] text-muted">{raw.swatchIds.length} yarns, most used first. Tap one to swap it.</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {raw.swatchIds.map((id, i) => {
                      const now = swaps[id] ?? id
                      const sw = byId.get(now)
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={swapping === id}
                          aria-label={`${sw?.colorName ?? now}, ${Math.round((raw.counts[i] / total) * 100)}% of the rug${swaps[id] ? `, swapped from ${byId.get(id)?.colorName ?? id}` : ''}. Swap it`}
                          title={`${sw?.colorName ?? now} · ${Math.round((raw.counts[i] / total) * 100)}%`}
                          onClick={() => setSwapping(swapping === id ? null : id)}
                          className={`relative h-8 w-8 rounded-md ring-1 ring-black/10 transition-transform hover:-translate-y-0.5 ${swapping === id ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''}`}
                          style={{ backgroundColor: sw?.swatchColor }}
                        >
                          {swaps[id] && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-paper bg-accent" />}
                        </button>
                      )
                    })}
                  </div>
                  {swapping && (
                    <div className="mt-2 rounded-xl border border-line bg-surface p-2.5">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[0.8125rem] text-ink">Swap {byId.get(swapping)?.colorName ?? swapping} for</p>
                        {swaps[swapping] && (
                          <button
                            type="button"
                            className="text-[0.8125rem] text-ink-2 underline underline-offset-2 hover:text-ink"
                            onClick={() => {
                              const next = { ...swaps }
                              delete next[swapping]
                              setSwaps(next)
                            }}
                          >
                            Keep the original
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {swatches.map((sw) => (
                          <button
                            key={sw.id}
                            type="button"
                            title={`${sw.familyName} ${sw.colorName}`}
                            aria-label={`${sw.familyName} ${sw.colorName}`}
                            aria-pressed={(swaps[swapping] ?? swapping) === sw.id}
                            onClick={() => {
                              const next = { ...swaps }
                              if (sw.id === swapping) delete next[swapping]
                              else next[swapping] = sw.id
                              setSwaps(next)
                              setSwapping(null)
                            }}
                            className={`aspect-square rounded ring-1 ring-black/10 transition-transform hover:scale-110 ${(swaps[swapping] ?? swapping) === sw.id ? 'ring-2 ring-ink' : ''}`}
                            style={{ backgroundColor: sw.swatchColor }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {error && (
                <p role="alert" className="text-[0.875rem] text-accent">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={busy || !raw}
                onClick={make}
                className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 font-semibold text-paper transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? 'Making the chart…' : 'Make the chart'}
              </button>
              <p className="text-[0.8125rem] text-muted">It goes on a new layer above your drawing, so nothing is lost.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
