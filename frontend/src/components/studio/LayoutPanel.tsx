import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ImageSquare, Plus, Trash } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import MotifPicker from './MotifPicker'
import type { BorderBand, CornerStyle, FieldPattern, LayoutSpec, RugDoc, RugShapeKind } from '../../studio/model'
import { defaultLayout, renderLayout } from '../../studio/layout'
import { catalogueStamper } from '../../studio/motifStamp'
import type { RugPreset } from '../../studio/presets'
import { PRESETS, PRESET_GROUPS } from '../../studio/presets'

const ROLE_NAMES: Record<BorderBand['role'], string> = {
  'outer-guard': 'Outer guard',
  main: 'Main border',
  'inner-guard': 'Inner guard',
}

const field = 'min-h-9 w-full rounded-lg border border-line-strong bg-surface px-2.5 text-[0.875rem] text-ink focus:border-ink focus:outline-none'
const label = 'block text-[0.8125rem] text-ink-2'

function Section({ title, on, onToggle, children }: { title: string; on?: boolean; onToggle?: (on: boolean) => void; children?: ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-muted">{title}</h3>
        {onToggle && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-[0.8125rem] text-ink-2">
            <input type="checkbox" checked={!!on} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
            {on ? 'On' : 'Off'}
          </label>
        )}
      </div>
      {(on ?? true) && children && <div className="mt-3 space-y-3">{children}</div>}
    </section>
  )
}

/** Pick a yarn from the rug's palette. */
export function YarnPick({ name, value, onChange, doc, swatchesById }: { name: string; value: number; onChange: (i: number) => void; doc: RugDoc; swatchesById: Map<string, Swatch> }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1">
      {doc.palette.map((y, i) => {
        const sw = swatchesById.get(y.swatchId)
        const on = value === i + 1
        return (
          <button
            key={`${y.swatchId}-${i}`}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${name}: ${sw?.colorName ?? y.swatchId}`}
            title={sw?.colorName ?? y.swatchId}
            onClick={() => onChange(i + 1)}
            className={`h-7 w-7 rounded-md ring-1 ring-black/10 transition-transform hover:-translate-y-0.5 ${on ? 'ring-2 ring-ink ring-offset-1 ring-offset-paper' : ''}`}
            style={{ backgroundColor: sw?.swatchColor ?? '#ccc' }}
          />
        )
      })}
    </div>
  )
}

function MotifSelect({ value, onChange, borders, aria, palette, required }: { value?: string; onChange: (id: string | undefined) => void; borders?: boolean; aria: string; palette: string[]; required?: boolean }) {
  return (
    <MotifPicker
      kind={borders ? 'border' : 'piece'}
      value={value}
      onChange={(id) => onChange(id ?? undefined)}
      palette={palette}
      label={aria}
      noneLabel={borders ? 'Plain band' : 'Plain colour'}
      allowNone={!required}
    />
  )
}

/** A style drawn small, in its own yarns and the rug's proportions and shape. */
function PresetThumb({ preset, widthFt, heightFt, shape, swatchesById, delay }: { preset: RugPreset; widthFt: number; heightFt: number; shape: RugShapeKind; swatchesById: Map<string, Swatch>; delay: number }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    // One at a time, so opening the tab doesn't stall on twenty layouts.
    const id = window.setTimeout(() => {
      const k = 132 / (Math.max(widthFt, heightFt) * 12)
      const density = { across: k, down: k }
      const cols = Math.max(8, Math.round(widthFt * 12 * k))
      const rows = Math.max(8, Math.round(heightFt * 12 * k))
      const hexes = preset.swatchIds.map((sid) => swatchesById.get(sid)?.swatchColor ?? '#888888')
      const cells = renderLayout(preset.layout, cols, rows, density, catalogueStamper(hexes), shape)
      const canvas = document.createElement('canvas')
      canvas.width = cols
      canvas.height = rows
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const img = ctx.createImageData(cols, rows)
      const rgb = hexes.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)))
      for (let i = 0; i < cells.length; i++) {
        const c = rgb[cells[i] - 1]
        if (!c) continue
        img.data.set([c[0], c[1], c[2], 255], i * 4)
      }
      ctx.putImageData(img, 0, 0)
      setUrl(canvas.toDataURL())
    }, delay)
    return () => window.clearTimeout(id)
  }, [preset, widthFt, heightFt, shape, swatchesById, delay])
  return (
    <span className="flex h-24 items-center justify-center rounded-md bg-surface-2/70" aria-hidden="true">
      {url ? <img src={url} alt="" className="max-h-[5.5rem] max-w-full rounded-[2px] shadow-sm [image-rendering:pixelated]" /> : <span className="h-16 w-11 animate-pulse rounded-sm bg-line" />}
    </span>
  )
}

/** A slider that applies its value once let go (the layout redraws the whole rug). */
export function Slider({ name, value, min, max, step = 1, unit, onCommit }: { name: string; value: number; min: number; max: number; step?: number; unit: string; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<number | null>(null)
  const shown = draft ?? value
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft)
    setDraft(null)
  }
  return (
    <label className={label}>
      <span className="flex justify-between">
        {name}
        <span className="tabular-nums text-ink">
          {shown}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="mt-1 w-full accent-[var(--color-accent)]"
      />
    </label>
  )
}

/**
 * The rug's layout as settings: start from a traditional style, then adjust borders, field,
 * medallion, corners, niche, compartments and an all-over repeat. Every change redraws the layout
 * layer under the designer's own drawing.
 */
export default function LayoutPanel({
  doc,
  swatchesById,
  onLayout,
  onPreset,
  onPhoto,
}: {
  doc: RugDoc
  swatchesById: Map<string, Swatch>
  onLayout: (spec: LayoutSpec | null) => void
  onPreset: (p: RugPreset) => void
  onPhoto: () => void
}) {
  const spec = doc.layout
  const hexes = doc.palette.map((y) => swatchesById.get(y.swatchId)?.swatchColor ?? '#888888')
  const set = (patch: Partial<LayoutSpec>) => spec && onLayout({ ...spec, ...patch })
  const yarn = (name: string, value: number, onChange: (i: number) => void) => (
    <div>
      <p className={label}>{name}</p>
      <div className="mt-1">
        <YarnPick name={name} value={value} onChange={onChange} doc={doc} swatchesById={swatchesById} />
      </div>
    </div>
  )
  const setBand = (i: number, patch: Partial<BorderBand>) =>
    spec &&
    set({
      borders: spec.borders.map((b, j) => (j === i ? { ...b, ...patch } : b)),
    })

  return (
    <>
      <Section title="Start from a photo">
        <p className="text-[0.875rem] text-ink-2">Weave a rug you photographed, or any picture: mark its corners and it becomes a knot chart in real yarns.</p>
        <button type="button" onClick={onPhoto} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-[0.9rem] font-medium text-paper transition-colors hover:bg-ink-2">
          <ImageSquare size={16} /> Chart from a photo
        </button>
      </Section>

      <Section title="Start from a style">
        {PRESET_GROUPS.map((group) => (
          <div key={group}>
            <p className="mb-1.5 text-[0.8125rem] font-medium text-ink-2">{group}</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.filter((p) => p.group === group).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPreset(p)}
                  title={p.hint}
                  className="rounded-lg border border-line bg-surface p-2 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <PresetThumb preset={p} widthFt={doc.widthFt} heightFt={doc.heightFt} shape={doc.shape.kind} swatchesById={swatchesById} delay={PRESETS.indexOf(p) * 30} />
                  <span className="mt-1.5 block truncate text-[0.875rem] font-medium text-ink">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[0.8125rem] text-muted">A style draws its layout under your drawing. Before you paint, it brings its own yarns; after, it adds the ones it needs.</p>
      </Section>

      {!spec ? (
        <Section title="Layout">
          <p className="text-[0.875rem] text-ink-2">Borders, a field, a medallion and corners, set as values rather than drawn knot by knot.</p>
          <button
            type="button"
            onClick={() => onLayout(defaultLayout(doc.palette.length))}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[0.9rem] font-medium text-paper transition-colors hover:bg-ink-2"
          >
            <Plus size={15} /> Add a layout
          </button>
        </Section>
      ) : (
        <>
          <Section title={`Borders (${spec.borders.length})`}>
            {doc.shape.kind !== 'rect' && doc.shape.kind !== 'free' && (
              <p className="text-[0.8125rem] text-muted">On a {doc.shape.kind} rug the bands follow its edge in plain colour; border patterns and corners run on rectangular rugs.</p>
            )}
            <label className={label}>
              Corners
              <select className={`${field} mt-1`} value={spec.corners} onChange={(e) => set({ corners: e.target.value as CornerStyle })}>
                <option value="flowing">Flowing turn (the border's corner piece)</option>
                <option value="mitred">Mitred (cut on the diagonal)</option>
                <option value="block">Block (a rosette square)</option>
              </select>
            </label>
            {spec.borders.map((b, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center gap-2">
                  <select aria-label={`Band ${i + 1} role`} className={field} value={b.role} onChange={(e) => setBand(i, { role: e.target.value as BorderBand['role'] })}>
                    {Object.entries(ROLE_NAMES).map(([id, n]) => (
                      <option key={id} value={id}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Remove band ${i + 1}`}
                    onClick={() => set({ borders: spec.borders.filter((_, j) => j !== i) })}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
                  >
                    <Trash size={15} />
                  </button>
                </div>
                <Slider name="Width" value={b.widthIn} min={0.5} max={16} step={0.5} unit=" in" onCommit={(v) => setBand(i, { widthIn: v })} />
                {yarn('Ground', b.ground, (g) => setBand(i, { ground: g }))}
                <MotifSelect palette={hexes} borders aria={`Band ${i + 1} pattern`} value={b.motifId} onChange={(id) => setBand(i, { motifId: id })} />
              </div>
            ))}
            {spec.borders.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  set({
                    borders: [
                      ...spec.borders,
                      {
                        role: 'inner-guard',
                        widthIn: 1.5,
                        ground: Math.min(3, doc.palette.length),
                      },
                    ],
                  })
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[0.875rem] text-ink hover:border-ink"
              >
                <Plus size={14} /> Add a band inside
              </button>
            )}
          </Section>

          <Section title="Field">{yarn('Ground', spec.field, (g) => set({ field: g }))}</Section>

          <Section
            title="Woven pattern"
            on={!!spec.pattern}
            onToggle={(on) => set({ pattern: on ? { kind: 'diamonds', sizeIn: 16, bands: 4, colors: doc.palette.slice(0, 3).map((_, i) => i + 1) } : undefined })}
          >
            {spec.pattern && (
              <>
                <label className={label}>
                  Pattern
                  <select className={`${field} mt-1`} value={spec.pattern.kind} onChange={(e) => set({ pattern: { ...spec.pattern!, kind: e.target.value as FieldPattern } })}>
                    <option value="stripes">Stripes (dhurrie)</option>
                    <option value="chevron">Chevrons (kilim)</option>
                    <option value="diamonds">Nested diamonds (kilim, Navajo)</option>
                    <option value="ikat">Ikat diamonds (feathered)</option>
                  </select>
                </label>
                <Slider name="Repeat" value={spec.pattern.sizeIn} min={2} max={48} unit=" in" onCommit={(v) => set({ pattern: { ...spec.pattern!, sizeIn: v } })} />
                <Slider name="Bands per repeat" value={spec.pattern.bands} min={1} max={16} unit="" onCommit={(v) => set({ pattern: { ...spec.pattern!, bands: v } })} />
                {spec.pattern.colors.map((c, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">{yarn(`Band ${i + 1}`, c, (g) => set({ pattern: { ...spec.pattern!, colors: spec.pattern!.colors.map((x, j) => (j === i ? g : x)) } }))}</div>
                    <button
                      type="button"
                      aria-label={`Remove band ${i + 1} colour`}
                      disabled={spec.pattern!.colors.length === 1}
                      onClick={() => set({ pattern: { ...spec.pattern!, colors: spec.pattern!.colors.filter((_, j) => j !== i) } })}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-30"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
                {spec.pattern.colors.length < 12 && (
                  <button
                    type="button"
                    onClick={() => set({ pattern: { ...spec.pattern!, colors: [...spec.pattern!.colors, spec.field] } })}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[0.875rem] text-ink hover:border-ink"
                  >
                    <Plus size={14} /> Add a colour
                  </button>
                )}
              </>
            )}
          </Section>

          <Section
            title="Medallion"
            on={!!spec.medallion}
            onToggle={(on) =>
              set({
                medallion: on
                  ? {
                      shape: 'lozenge',
                      widthPct: 46,
                      heightPct: 40,
                      ground: Math.min(2, doc.palette.length),
                      pendants: true,
                    }
                  : undefined,
              })
            }
          >
            {spec.medallion && (
              <>
                <MotifSelect palette={hexes} aria="Medallion pattern" value={spec.medallion.motifId} onChange={(id) => set({ medallion: { ...spec.medallion!, motifId: id } })} />
                {!spec.medallion.motifId && (
                  <label className={label}>
                    Shape
                    <select
                      className={`${field} mt-1`}
                      value={spec.medallion.shape}
                      onChange={(e) =>
                        set({
                          medallion: {
                            ...spec.medallion!,
                            shape: e.target.value as 'oval',
                          },
                        })
                      }
                    >
                      <option value="lozenge">Lozenge</option>
                      <option value="oval">Oval</option>
                      <option value="round">Round</option>
                      <option value="star">Star</option>
                    </select>
                  </label>
                )}
                <Slider name="Width" value={spec.medallion.widthPct} min={10} max={95} unit="%" onCommit={(v) => set({ medallion: { ...spec.medallion!, widthPct: v } })} />
                <Slider name="Height" value={spec.medallion.heightPct} min={10} max={95} unit="%" onCommit={(v) => set({ medallion: { ...spec.medallion!, heightPct: v } })} />
                {yarn('Ground', spec.medallion.ground, (g) => set({ medallion: { ...spec.medallion!, ground: g } }))}
                {!spec.medallion.motifId && (
                  <label className="inline-flex items-center gap-2 text-[0.875rem] text-ink-2">
                    <input
                      type="checkbox"
                      checked={spec.medallion.pendants}
                      onChange={(e) =>
                        set({
                          medallion: {
                            ...spec.medallion!,
                            pendants: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                    Pendants above and below
                  </label>
                )}
              </>
            )}
          </Section>

          <Section
            title="Corners of the field"
            on={!!spec.spandrels}
            onToggle={(on) =>
              set({
                spandrels: on ? { ground: Math.min(2, doc.palette.length) } : undefined,
              })
            }
          >
            {spec.spandrels && (
              <>
                {yarn('Ground', spec.spandrels.ground, (g) => set({ spandrels: { ...spec.spandrels!, ground: g } }))}
                <MotifSelect palette={hexes} aria="Corner pattern" value={spec.spandrels.motifId} onChange={(id) => set({ spandrels: { ...spec.spandrels!, motifId: id } })} />
              </>
            )}
          </Section>

          <Section
            title="Prayer niche"
            on={!!spec.niche}
            onToggle={(on) =>
              set({
                niche: on
                  ? {
                      ground: spec.field,
                      archPct: 34,
                      spandrel: Math.min(2, doc.palette.length),
                    }
                  : undefined,
              })
            }
          >
            {spec.niche && (
              <>
                <Slider name="Arch springs at" value={spec.niche.archPct} min={10} max={80} unit="%" onCommit={(v) => set({ niche: { ...spec.niche!, archPct: v } })} />
                {yarn('Niche', spec.niche.ground, (g) => set({ niche: { ...spec.niche!, ground: g } }))}
                {yarn('Above the arch', spec.niche.spandrel, (g) => set({ niche: { ...spec.niche!, spandrel: g } }))}
                <MotifSelect palette={hexes} aria="In the niche" value={spec.niche.motifId} onChange={(id) => set({ niche: { ...spec.niche!, motifId: id } })} />
              </>
            )}
          </Section>

          <Section
            title="Compartments"
            on={!!spec.compartments}
            onToggle={(on) =>
              set({
                compartments: on
                  ? {
                      cols: 3,
                      rows: 4,
                      lineWidthIn: 2,
                      ground: spec.field,
                      line: Math.min(2, doc.palette.length),
                    }
                  : undefined,
              })
            }
          >
            {spec.compartments && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(['cols', 'rows'] as const).map((k) => (
                    <label key={k} className={label}>
                      {k === 'cols' ? 'Across' : 'Down'}
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={spec.compartments![k]}
                        onChange={(e) =>
                          set({
                            compartments: {
                              ...spec.compartments!,
                              [k]: Math.max(1, Math.min(12, Number(e.target.value) || 1)),
                            },
                          })
                        }
                        className={`${field} mt-1`}
                      />
                    </label>
                  ))}
                </div>
                <Slider
                  name="Channel width"
                  value={spec.compartments.lineWidthIn}
                  min={0.5}
                  max={6}
                  step={0.5}
                  unit=" in"
                  onCommit={(v) =>
                    set({
                      compartments: { ...spec.compartments!, lineWidthIn: v },
                    })
                  }
                />
                {yarn('Panels', spec.compartments.ground, (g) => set({ compartments: { ...spec.compartments!, ground: g } }))}
                {yarn('Channels', spec.compartments.line, (g) => set({ compartments: { ...spec.compartments!, line: g } }))}
                <MotifSelect palette={hexes}
                  aria="Panel pattern"
                  value={spec.compartments.motifId}
                  onChange={(id) =>
                    set({
                      compartments: { ...spec.compartments!, motifId: id },
                    })
                  }
                />
              </>
            )}
          </Section>

          <Section
            title="All-over repeat"
            on={!!spec.repeat}
            onToggle={(on) =>
              set({
                repeat: on ? { motifId: 'herati', everyIn: 8, drop: 'half-drop' } : undefined,
              })
            }
          >
            {spec.repeat && (
              <>
                <MotifSelect palette={hexes} required aria="Repeated motif" value={spec.repeat.motifId} onChange={(id) => id && set({ repeat: { ...spec.repeat!, motifId: id } })} />
                <Slider name="Every" value={spec.repeat.everyIn} min={2} max={36} unit=" in" onCommit={(v) => set({ repeat: { ...spec.repeat!, everyIn: v } })} />
                <label className={label}>
                  Arrangement
                  <select
                    className={`${field} mt-1`}
                    value={spec.repeat.drop}
                    onChange={(e) =>
                      set({
                        repeat: {
                          ...spec.repeat!,
                          drop: e.target.value as 'straight',
                        },
                      })
                    }
                  >
                    <option value="straight">Grid</option>
                    <option value="half-drop">Half-drop</option>
                    <option value="brick">Brick</option>
                  </select>
                </label>
                <label className="inline-flex items-center gap-2 text-[0.875rem] text-ink-2">
                  <input
                    type="checkbox"
                    checked={!!spec.repeat.color}
                    onChange={(e) =>
                      set({
                        repeat: {
                          ...spec.repeat!,
                          color: e.target.checked ? Math.min(2, doc.palette.length) : undefined,
                        },
                      })
                    }
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  In one colour
                </label>
                {spec.repeat.color ? yarn('Colour', spec.repeat.color, (g) => set({ repeat: { ...spec.repeat!, color: g } })) : null}
              </>
            )}
          </Section>

          <Section title="Remove">
            <button
              type="button"
              onClick={() => onLayout(null)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[0.875rem] text-ink hover:border-ink"
            >
              <Trash size={14} /> Remove the layout
            </button>
          </Section>
        </>
      )}
    </>
  )
}
