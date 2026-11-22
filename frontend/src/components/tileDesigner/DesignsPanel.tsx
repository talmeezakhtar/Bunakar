import { useState } from 'react'
import { Minus, Plus, FrameCorners } from '@phosphor-icons/react'
import { DESIGN_CATALOGUE, PIECE_CATEGORIES, findDesignAsset, pieceFootprint } from '../../data/designAssets'
import type { DesignCategory } from '../../data/designAssets'
import type { PaletteInput } from '../../data/motifs/palette'
import MotifPreview from './MotifPreview'

type Tab = 'piece' | 'border'

export type TintChoice = { id: string; name: string; color: string }

type DesignsPanelProps = {
  activeDesignId: string | null
  onSelectDesign: (id: string | null) => void
  pieceSize: number
  maxPieceSize: number
  onPieceSizeChange: (size: number) => void
  borderThickness: 0.5 | 1
  onBorderThicknessChange: (t: 0.5 | 1) => void
  onFrame: () => void
  /** The rug's colours: every preview is drawn in them. */
  palette: PaletteInput
  /** Colour for newly placed motifs: a swatch id, or null to match the rug. */
  tint: string | null
  onTintChange: (tint: string | null) => void
  tintChoices: TintChoice[]
}

const BORDERS = DESIGN_CATALOGUE.filter((a) => a.kind === 'border')

const chip = (on: boolean) =>
  `inline-flex min-h-9 items-center rounded-full border px-3 text-[0.8125rem] font-medium transition-colors ${
    on ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2 hover:border-line-hover'
  }`

/** Colour choice for motifs: follow the rug, or lead with one of the rug's own styles. */
export function TintPicker({
  tint,
  onTintChange,
  tintChoices,
  label = 'Colours',
}: Pick<DesignsPanelProps, 'tint' | 'onTintChange' | 'tintChoices'> & { label?: string }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" aria-pressed={tint === null} onClick={() => onTintChange(null)} className={chip(tint === null)}>
          Match the rug
        </button>
        {tintChoices.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={tint === c.id}
            aria-label={`Lead with ${c.name}`}
            title={`Lead with ${c.name}`}
            onClick={() => onTintChange(c.id)}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 ${
              tint === c.id ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''
            }`}
          >
            <span className="h-7 w-7 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c.color }} />
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** Motifs and borders: vector art laid on top of tiles that are already down, in the rug's colours. */
function DesignsPanel({
  activeDesignId,
  onSelectDesign,
  pieceSize,
  maxPieceSize,
  onPieceSizeChange,
  borderThickness,
  onBorderThicknessChange,
  onFrame,
  palette,
  tint,
  onTintChange,
  tintChoices,
}: DesignsPanelProps) {
  const active = findDesignAsset(activeDesignId)
  const [tab, setTab] = useState<Tab>(active?.kind ?? 'piece')
  const [category, setCategory] = useState<DesignCategory | 'All'>('All')
  const categories = PIECE_CATEGORIES.filter((c) => DESIGN_CATALOGUE.some((a) => a.category === c))
  const pieces = DESIGN_CATALOGUE.filter((a) => a.kind === 'piece' && (category === 'All' || a.category === category))
  const footprint = active?.kind === 'piece' ? pieceFootprint(active, pieceSize) : null
  const tintColor = tint ? tintChoices.find((c) => c.id === tint)?.color : undefined

  function pick(id: string) {
    onSelectDesign(id === activeDesignId ? null : id)
  }

  return (
    <section aria-label="Motifs and borders" className="space-y-4">
      <div role="tablist" aria-label="Motif type" className="grid grid-cols-2 rounded-full bg-surface-2 p-1">
        {(['piece', 'border'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-9 rounded-full text-[0.9rem] font-medium transition-colors ${
              tab === t ? 'bg-paper text-ink shadow-[var(--shadow-soft)]' : 'text-muted hover:text-ink'
            }`}
          >
            {t === 'piece' ? 'Motifs' : 'Borders'}
          </button>
        ))}
      </div>

      <TintPicker tint={tint} onTintChange={onTintChange} tintChoices={tintChoices} />

      {tab === 'piece' ? (
        <div role="tabpanel" className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(['All', ...categories] as const).map((c) => (
              <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chip(category === c)}>
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {pieces.map((a) => {
              const on = a.id === activeDesignId
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pick(a.id)}
                  aria-pressed={on}
                  title={a.name}
                  className={`group flex flex-col items-center gap-1 rounded-lg border bg-surface p-2 transition-colors ${
                    on ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-hover'
                  }`}
                >
                  <span className="flex aspect-square w-full items-center justify-center">
                    <MotifPreview id={a.id} palette={palette} tint={tintColor} className="max-h-full max-w-full transition-transform duration-300 group-hover:scale-[1.04]" />
                  </span>
                  <span className="w-full truncate text-center text-[0.8125rem] text-ink-2">{a.name}</span>
                </button>
              )
            })}
          </div>

          {footprint && active && (
            <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{active.name}</p>
                <p className="text-[0.8125rem] text-muted">
                  {footprint.widthTiles} × {footprint.heightTiles} tiles
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPieceSizeChange(pieceSize - 1)}
                  disabled={pieceSize <= 1}
                  aria-label="Smaller"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-colors pointer-coarse:h-11 pointer-coarse:w-11 hover:border-ink disabled:opacity-30"
                >
                  <Minus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onPieceSizeChange(pieceSize + 1)}
                  disabled={pieceSize >= maxPieceSize}
                  aria-label="Larger"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-colors pointer-coarse:h-11 pointer-coarse:w-11 hover:border-ink disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div role="tabpanel" className="space-y-3">
          <div className="space-y-2">
            {BORDERS.map((a) => {
              const on = a.id === activeDesignId
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pick(a.id)}
                  aria-pressed={on}
                  className={`block w-full rounded-lg border bg-surface p-2 text-left transition-colors ${
                    on ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-hover'
                  }`}
                >
                  <MotifPreview id={a.id} palette={palette} tint={tintColor} repeats={4} className="block h-9 w-full" />
                  <span className="mt-1.5 block text-[0.8125rem] text-ink-2">{a.name}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink">Width</span>
            <div className="grid grid-cols-2 rounded-full bg-surface-2 p-1">
              {([0.5, 1] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={borderThickness === t}
                  onClick={() => onBorderThicknessChange(t)}
                  className={`min-h-9 rounded-full px-3 text-[0.8125rem] font-medium transition-colors ${
                    borderThickness === t ? 'bg-paper text-ink shadow-[var(--shadow-soft)]' : 'text-muted hover:text-ink'
                  }`}
                >
                  {t === 0.5 ? 'Half tile' : 'Full tile'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onFrame}
            disabled={active?.kind !== 'border'}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-ink font-semibold text-paper transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FrameCorners size={16} /> Frame the rug
          </button>
        </div>
      )}

      <p className="text-[0.8125rem] leading-relaxed text-muted">
        {!active
          ? 'Pick a motif, then click the rug. Motifs sit on tiles you have already laid, in the rug’s own colours.'
          : active.kind === 'piece'
            ? 'Click the rug to place it. R rotates it. Placing over another motif replaces it.'
            : 'Frame the whole rug, or drag along a row or column to lay a run.'}
      </p>
    </section>
  )
}

export default DesignsPanel
