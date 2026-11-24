import FabricChip from '../ui/FabricChip'
import { fibreMaterial } from '../../data/materials'
import {
  ArrowClockwise,
  ArrowsOut,
  Broom,
  Copy,
  FlipHorizontal,
  FlipVertical,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  SquaresFour,
  Stamp,
  X,
} from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import MotifPicker from './MotifPicker'
import type { RepeatKind, Symmetry } from '../../studio/chartOps'
import { SYMMETRIES } from '../../studio/chartOps'
import type { Yarn } from '../../studio/model'
import type { ChartTool } from './ChartCanvas'
import { TOOLS } from './toolList'

const tb = (on: boolean) =>
  `inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${on ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`

/** The vertical tool strip beside the chart. */
export function ToolStrip({ tool, onTool, onFit, onZoom }: { tool: ChartTool; onTool: (t: ChartTool) => void; onFit: () => void; onZoom: (k: number) => void }) {
  return (
    <div role="toolbar" aria-label="Drawing tools" aria-orientation="vertical" className="flex shrink-0 flex-col items-center gap-1 border-r border-line bg-paper p-1.5">
      {TOOLS.map((t) => (
        <button key={t.id} type="button" className={tb(tool === t.id)} aria-pressed={tool === t.id} aria-label={`${t.label} (${t.key})`} title={`${t.label} (${t.key})`} onClick={() => onTool(t.id)}>
          {t.icon}
        </button>
      ))}
      <span className="my-1 h-px w-7 bg-line" aria-hidden="true" />
      <button type="button" className={tb(false)} aria-label="Zoom in (+)" title="Zoom in (+)" onClick={() => onZoom(1.25)}>
        <MagnifyingGlassPlus size={19} />
      </button>
      <button type="button" className={tb(false)} aria-label="Zoom out (-)" title="Zoom out (-)" onClick={() => onZoom(0.8)}>
        <MagnifyingGlassMinus size={19} />
      </button>
      <button type="button" className={tb(false)} aria-label="Fit the rug (0)" title="Fit the rug (0)" onClick={onFit}>
        <ArrowsOut size={19} />
      </button>
    </div>
  )
}

/** Above the chart: brush size, symmetry, and what to do with a selection. */
export function ToolOptions({
  tool,
  brushSize,
  onBrushSize,
  symmetry,
  onSymmetry,
  hasSelection,
  pasting,
  onCopy,
  onFlip,
  onRotate,
  onRepeat,
  onClear,
  onDeselect,
}: {
  tool: ChartTool
  brushSize: number
  onBrushSize: (n: number) => void
  symmetry: Symmetry
  onSymmetry: (s: Symmetry) => void
  hasSelection: boolean
  pasting: boolean
  onCopy: () => void
  onFlip: (axis: 'x' | 'y') => void
  onRotate: () => void
  onRepeat: (kind: RepeatKind) => void
  onClear: () => void
  onDeselect: () => void
}) {
  const sel = 'min-h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-[0.875rem] text-ink focus:border-ink focus:outline-none'
  const act = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[0.875rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink'
  return (
    <div className="contents">
      {(tool === 'pencil' || tool === 'eraser') && (
        <label className="flex items-center gap-2 text-[0.875rem] text-ink-2">
          Brush
          <input type="range" min={1} max={15} value={brushSize} onChange={(e) => onBrushSize(Number(e.target.value))} className="w-24 accent-[var(--color-accent)]" aria-valuetext={`${brushSize} knots`} />
          <span className="w-6 tabular-nums text-ink">{brushSize}</span>
        </label>
      )}
      <label className="flex items-center gap-2 text-[0.875rem] text-ink-2">
        Symmetry
        <select className={sel} value={symmetry} onChange={(e) => onSymmetry(e.target.value as Symmetry)} title={SYMMETRIES.find((s) => s.id === symmetry)?.hint}>
          {SYMMETRIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {pasting && <span className="rounded-full bg-saffron/20 px-3 py-1 text-[0.8125rem] text-ink">Click the chart to stamp it · Esc to stop</span>}
      {hasSelection && !pasting && (
        <div className="flex flex-wrap items-center gap-0.5 rounded-xl border border-line bg-surface px-1 py-0.5" role="group" aria-label="Selection">
          <button type="button" className={act} onClick={onCopy}>
            <Copy size={16} /> Copy
          </button>
          <button type="button" className={act} onClick={() => onFlip('x')} aria-label="Flip across">
            <FlipHorizontal size={16} />
          </button>
          <button type="button" className={act} onClick={() => onFlip('y')} aria-label="Flip down">
            <FlipVertical size={16} />
          </button>
          <button type="button" className={act} onClick={onRotate} aria-label="Turn a quarter">
            <ArrowClockwise size={16} />
          </button>
          <span className="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />
          <span className="inline-flex items-center gap-1 pl-1 text-[0.8125rem] text-muted">
            <SquaresFour size={15} /> Repeat
          </span>
          {(['straight', 'half-drop', 'brick'] as const).map((k) => (
            <button key={k} type="button" className={act} onClick={() => onRepeat(k)}>
              {k === 'straight' ? 'Grid' : k === 'half-drop' ? 'Half-drop' : 'Brick'}
            </button>
          ))}
          <span className="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />
          <button type="button" className={act} onClick={onClear} aria-label="Clear the selection">
            <Broom size={16} />
          </button>
          <button type="button" className={act} onClick={onDeselect} aria-label="Deselect (Esc)">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

/** The yarns as a strip under the chart: click (or press 1-9) to paint with one. */
export function YarnStrip({ palette, swatchesById, yarn, onYarn }: { palette: Yarn[]; swatchesById: Map<string, Swatch>; yarn: number; onYarn: (i: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Yarn to paint with" className="flex flex-wrap items-center gap-1.5 border-t border-line bg-paper px-3 py-2">
      {palette.map((y, i) => {
        const sw = swatchesById.get(y.swatchId)
        const n = i + 1
        return (
          <button
            key={`${y.swatchId}-${i}`}
            type="button"
            role="radio"
            aria-checked={yarn === n}
            aria-label={`${sw?.colorName ?? y.swatchId}${n <= 9 ? ` (${n})` : ''}`}
            title={`${sw?.colorName ?? y.swatchId} · ${fibreMaterial(y.fibre).name}${n <= 9 ? ` · key ${n}` : ''}`}
            onClick={() => onYarn(n)}
            className={`relative h-9 w-9 rounded-lg ring-1 ring-black/10 transition-transform hover:-translate-y-0.5 ${yarn === n ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''}`}
          >
            <FabricChip hex={sw?.swatchColor ?? '#cccccc'} fibre={y.fibre} pile={y.pile} size={36} className="h-full w-full rounded-lg" />
            {n <= 9 && <span className="absolute -bottom-1 -right-1 rounded-full bg-paper px-1 text-[0.75rem] font-semibold leading-tight text-ink shadow">{n}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Stamp a catalogue motif: pick one by sight and its width, then click the chart to place it (Esc to stop). */
export function StampPicker({ motifId, sizeIn, maxIn, palette, onPick, onSize }: { motifId: string | null; sizeIn: number; maxIn: number; palette: string[]; onPick: (id: string | null) => void; onSize: (n: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[0.875rem] text-ink-2">
      <Stamp size={17} aria-hidden="true" />
      <div className="w-[13rem]">
        <MotifPicker kind="piece" value={motifId} onChange={onPick} palette={palette} label="Stamp a motif" noneLabel="Stamp a motif…" />
      </div>
      {motifId && (
        <label className="flex items-center gap-2">
          Width
          <input
            type="number"
            min={1}
            max={maxIn}
            value={sizeIn}
            onChange={(e) => onSize(Math.max(1, Math.min(maxIn, Number(e.target.value) || 1)))}
            className="min-h-9 w-16 rounded-lg border border-line-strong bg-surface px-2 text-ink tabular-nums focus:border-ink focus:outline-none"
          />
          in
        </label>
      )}
    </div>
  )
}
