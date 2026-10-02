import { Cursor, PaintBucket, PenNib, Shuffle, Sparkle, Stamp } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { FREEFORM_GENERATORS, FREEFORM_PALETTES, SHAPE_LIBRARY } from '../../data/freeformGenerators'
import type { GeneratorId } from '../../data/freeformGenerators'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import { shapePath } from '../../utils/freeformGeometry'
import FreeformPreview from '../home/FreeformPreview'
import type { FreeformTool } from './FreeformCanvas'

export const TOOLS: { id: FreeformTool; label: string; icon: Icon; key: string }[] = [
  { id: 'select', label: 'Select', icon: Cursor, key: 'V' },
  { id: 'paint', label: 'Paint', icon: PaintBucket, key: 'B' },
  { id: 'pen', label: 'Draw', icon: PenNib, key: 'P' },
  { id: 'stamp', label: 'Stamp', icon: Stamp, key: 'S' },
]

/** The four canvas tools as one segmented control; lives in the canvas toolbar. */
export function ToolSwitcher({ tool, onToolChange }: { tool: FreeformTool; onToolChange: (tool: FreeformTool) => void }) {
  return (
    <div role="radiogroup" aria-label="Canvas tool" className="flex rounded-lg border border-night-600 bg-night-950 p-0.5">
      {TOOLS.map(({ id, label, icon: ToolIcon, key }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={tool === id}
          aria-keyshortcuts={key}
          title={`${label} (${key})`}
          onClick={() => onToolChange(id)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors pointer-coarse:min-h-11 ${
            tool === id ? 'bg-gold-500 text-night-950' : 'text-sand-300 hover:bg-night-800 hover:text-sand-100'
          }`}
        >
          <ToolIcon size={16} weight={tool === id ? 'fill' : 'regular'} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

const swatchHex = ([familyId, colorName]: readonly [string, string]) =>
  MOCK_SWATCHES.find((s) => s.familyId === familyId && s.colorName === colorName)?.swatchColor

export type GeneratorSettings = { id: GeneratorId; paletteId: string; density: number; gap: number; ribbed: number }

type FreeformToolsPanelProps = {
  tool: FreeformTool
  penSmooth: boolean
  onPenSmoothChange: (v: boolean) => void
  stamp: { libraryId: string; size: number; rotation: number }
  onStampChange: (stamp: { libraryId: string; size: number; rotation: number }) => void
  generator: GeneratorSettings
  onGeneratorChange: (g: GeneratorSettings) => void
  onGenerate: (shuffle: boolean) => void
}

function Slider({ label, value, display, min, max, step, onChange }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between text-xs text-sand-300">
        {label}
        <span className="tabular-nums text-sand-100">{display}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-gold-500" />
    </label>
  )
}

function FreeformToolsPanel({ tool, penSmooth, onPenSmoothChange, stamp, onStampChange, generator, onGeneratorChange, onGenerate }: FreeformToolsPanelProps) {
  const gen = FREEFORM_GENERATORS.find((g) => g.id === generator.id)!
  const palette = FREEFORM_PALETTES.find((p) => p.id === generator.paletteId)

  return (
    <aside aria-label="Shapes and layouts" className="flex w-full flex-col gap-6 lg:w-64 lg:shrink-0">
      {tool === 'pen' && (
        <section aria-labelledby="ff-pen" className="space-y-2.5">
          <h2 id="ff-pen" className="font-display text-sm tracking-wide text-sand-200">
            Draw a shape
          </h2>
          <div role="radiogroup" aria-label="Edges" className="grid grid-cols-2 rounded-lg border border-night-600 p-0.5">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={penSmooth === v}
                onClick={() => onPenSmoothChange(v)}
                className={`rounded-md py-1.5 text-xs transition-colors pointer-coarse:min-h-11 ${penSmooth === v ? 'bg-night-700 text-sand-100' : 'text-sand-300 hover:text-sand-100'}`}
              >
                {v ? 'Curved edges' : 'Straight edges'}
              </button>
            ))}
          </div>
        </section>
      )}

      {tool === 'stamp' && (
        <section aria-labelledby="ff-stamp" className="space-y-3">
          <h2 id="ff-stamp" className="font-display text-sm tracking-wide text-sand-200">
            Stamp a shape
          </h2>
          <div role="radiogroup" aria-label="Shape to stamp" className="grid max-h-48 grid-cols-5 gap-1.5 overflow-y-auto pr-0.5 lg:grid-cols-4">
            {SHAPE_LIBRARY.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                title={s.name}
                aria-label={s.name}
                aria-checked={stamp.libraryId === s.id}
                onClick={() => onStampChange({ ...stamp, libraryId: s.id })}
                className={`flex aspect-square items-center justify-center rounded-md border-2 bg-night-900 p-1.5 transition-colors ${
                  stamp.libraryId === s.id ? 'border-gold-500 bg-night-800' : 'border-night-700 hover:border-night-500'
                }`}
              >
                <svg viewBox="-0.05 -0.05 1.1 1.1" className="h-full w-full" aria-hidden="true">
                  <path d={shapePath(s.points, true)} fill={stamp.libraryId === s.id ? '#f0c774' : '#d8c9ad'} />
                </svg>
              </button>
            ))}
          </div>
          <Slider label="Size" value={stamp.size} display={`${stamp.size.toFixed(1)} ft`} min={0.5} max={6} step={0.25} onChange={(size) => onStampChange({ ...stamp, size })} />
          <Slider label="Rotation" value={stamp.rotation} display={`${stamp.rotation}°`} min={0} max={345} step={15} onChange={(rotation) => onStampChange({ ...stamp, rotation })} />
        </section>
      )}

      <section aria-labelledby="ff-layouts" className={`space-y-4 ${tool === 'pen' || tool === 'stamp' ? 'border-t border-night-700 pt-5' : ''}`}>
        <div className="space-y-1">
          <h2 id="ff-layouts" className="font-display text-sm tracking-wide text-sand-200">
            Start from a layout
          </h2>
          <p className="text-xs leading-relaxed text-sand-300/70">Fill the rug in one click, then edit any shape.</p>
        </div>

        <div role="radiogroup" aria-label="Layout" className="grid grid-cols-4 gap-2 lg:grid-cols-2">
          {FREEFORM_GENERATORS.filter((g) => g.id !== 'blank').map((g) => {
            const active = generator.id === g.id
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={active}
                title={g.description}
                onClick={() => onGeneratorChange({ id: g.id, paletteId: active ? generator.paletteId : g.paletteId, ...g.defaults })}
                className={`group flex flex-col gap-1.5 rounded-lg border-2 p-1.5 text-left transition-colors ${
                  active ? 'border-gold-500 bg-night-800' : 'border-night-700 hover:border-night-500'
                }`}
              >
                <FreeformPreview
                  generatorId={g.id}
                  paletteId={active ? generator.paletteId : g.paletteId}
                  widthFt={4}
                  heightFt={3}
                  className="aspect-[4/3] w-full rounded-sm"
                />
                <span className={`px-0.5 text-xs ${active ? 'text-sand-100' : 'text-sand-300'}`}>{g.name}</span>
              </button>
            )
          })}
          <button
            type="button"
            role="radio"
            aria-checked={generator.id === 'blank'}
            onClick={() => onGeneratorChange({ id: 'blank', paletteId: generator.paletteId, ...FREEFORM_GENERATORS.find((g) => g.id === 'blank')!.defaults })}
            className={`col-span-4 rounded-lg border-2 px-3 py-2 text-left text-xs transition-colors lg:col-span-2 ${
              generator.id === 'blank' ? 'border-gold-500 bg-night-800 text-sand-100' : 'border-night-700 text-sand-300 hover:border-night-500'
            }`}
          >
            Blank rug <span className="text-sand-300/70">- just the ground, add your own shapes</span>
          </button>
        </div>
        {generator.id !== 'blank' && <p className="text-xs leading-relaxed text-sand-300/70">{gen.description}.</p>}

        <div className="space-y-2">
          <p className="flex items-baseline justify-between text-xs text-sand-300">
            Colours <span className="text-sand-100">{palette?.name}</span>
          </p>
          <div role="radiogroup" aria-label="Colour palette" className="flex flex-wrap gap-1.5">
            {FREEFORM_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={generator.paletteId === p.id}
                title={p.name}
                aria-label={p.name}
                onClick={() => onGeneratorChange({ ...generator, paletteId: p.id })}
                className={`flex -space-x-1 rounded-full border-2 p-1 transition-colors pointer-coarse:min-h-11 pointer-coarse:items-center ${
                  generator.paletteId === p.id ? 'border-gold-500' : 'border-night-700 hover:border-night-500'
                }`}
              >
                {[p.ground, ...p.colors].slice(0, 5).map((ref, i) => (
                  <span key={i} className="h-4 w-4 rounded-full border border-night-900" style={{ background: swatchHex(ref) }} />
                ))}
              </button>
            ))}
          </div>
        </div>

        {gen.controls.density && (
          <Slider label="Shapes" value={generator.density} display={generator.density < 0.34 ? 'Few' : generator.density < 0.67 ? 'Some' : 'Many'} min={0} max={1} step={0.05} onChange={(density) => onGeneratorChange({ ...generator, density })} />
        )}
        {gen.controls.gap && (
          <Slider label="Gap between shapes" value={generator.gap} display={`${Math.round(generator.gap * 12 * 10) / 10}"`} min={0.04} max={0.5} step={0.02} onChange={(gap) => onGeneratorChange({ ...generator, gap })} />
        )}
        {gen.controls.ribbed && (
          <Slider label="Ribbed panels" value={generator.ribbed} display={`${Math.round(generator.ribbed * 100)}%`} min={0} max={1} step={0.05} onChange={(ribbed) => onGeneratorChange({ ...generator, ribbed })} />
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onGenerate(false)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gold-500 py-2 text-xs font-semibold text-night-950 transition-colors hover:bg-gold-400 active:scale-[0.98] pointer-coarse:min-h-11"
          >
            <Sparkle size={14} weight="fill" /> Generate
          </button>
          <button
            type="button"
            onClick={() => onGenerate(true)}
            title="Same settings, new arrangement"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gold-500/60 py-2 text-xs font-semibold text-gold-400 transition-colors hover:bg-gold-500 hover:text-night-950 active:scale-[0.98] pointer-coarse:min-h-11"
          >
            <Shuffle size={14} /> Shuffle
          </button>
        </div>
        <p className="text-xs text-sand-300/60">Generating replaces the shapes on the rug. Ctrl+Z brings them back.</p>
      </section>
    </aside>
  )
}

export default FreeformToolsPanel
