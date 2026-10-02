import { useState } from 'react'
import { Minus, Plus, FrameCorners } from '@phosphor-icons/react'
import { DESIGN_ASSETS, PIECE_CATEGORIES, findDesignAsset, pieceFootprint } from '../../data/designAssets'
import type { DesignCategory } from '../../data/designAssets'

type Tab = 'piece' | 'border'

type DesignsPanelProps = {
  activeDesignId: string | null
  onSelectDesign: (id: string | null) => void
  pieceSize: number
  maxPieceSize: number
  onPieceSizeChange: (size: number) => void
  borderThickness: 0.5 | 1
  onBorderThicknessChange: (t: 0.5 | 1) => void
  onFrame: () => void
}

const BORDERS = DESIGN_ASSETS.filter((a) => a.kind === 'border')

/** Design pieces and borders: art laid on top of tiles that are already down. */
function DesignsPanel({
  activeDesignId,
  onSelectDesign,
  pieceSize,
  maxPieceSize,
  onPieceSizeChange,
  borderThickness,
  onBorderThicknessChange,
  onFrame,
}: DesignsPanelProps) {
  const active = findDesignAsset(activeDesignId)
  const [tab, setTab] = useState<Tab>(active?.kind ?? 'piece')
  const [category, setCategory] = useState<DesignCategory | 'All'>('All')
  const pieces = DESIGN_ASSETS.filter((a) => a.kind === 'piece' && (category === 'All' || a.category === category))
  const footprint = active?.kind === 'piece' ? pieceFootprint(active, pieceSize) : null

  function pick(id: string) {
    onSelectDesign(id === activeDesignId ? null : id)
  }

  return (
    <section aria-labelledby="designs-heading" className="space-y-3 border-t border-night-700 pt-4">
      <div className="flex items-baseline justify-between">
        <h2 id="designs-heading" className="font-display text-sm tracking-wide text-sand-200">
          Designs
        </h2>
        <p className="text-[11px] text-sand-300/60">Laid over your tiles</p>
      </div>

      <div role="tablist" aria-label="Design type" className="grid grid-cols-2 rounded-full border border-night-600 p-0.5">
        {(['piece', 'border'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full py-1.5 text-xs font-medium transition-colors pointer-coarse:min-h-11 ${
              tab === t ? 'bg-night-700 text-sand-100' : 'text-sand-300 hover:text-sand-100'
            }`}
          >
            {t === 'piece' ? 'Design Pieces' : 'Borders'}
          </button>
        ))}
      </div>

      {tab === 'piece' ? (
        <div role="tabpanel" className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(['All', ...PIECE_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  category === c ? 'border-gold-500 text-gold-300' : 'border-night-600 text-sand-300 hover:border-night-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto pr-0.5">
            {pieces.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => pick(a.id)}
                aria-pressed={a.id === activeDesignId}
                title={a.name}
                className={`flex aspect-square items-center justify-center rounded-md border-2 bg-night-900 p-1 transition-colors ${
                  a.id === activeDesignId ? 'border-gold-500 bg-night-800' : 'border-night-700 hover:border-night-500'
                }`}
              >
                <img src={a.url} alt={a.name} loading="lazy" className="max-h-full max-w-full object-contain" />
              </button>
            ))}
          </div>

          {footprint && active && (
            <div className="flex items-center justify-between rounded-lg border border-night-700 bg-night-900 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-sand-100">{active.name}</p>
                <p className="text-[11px] text-sand-300/70">
                  {footprint.widthTiles} × {footprint.heightTiles} tiles
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPieceSizeChange(pieceSize - 1)}
                  disabled={pieceSize <= 1}
                  aria-label="Smaller"
                  className="rounded-md border border-night-600 p-1 text-sand-300 transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11 hover:text-sand-100 disabled:opacity-30"
                >
                  <Minus size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onPieceSizeChange(pieceSize + 1)}
                  disabled={pieceSize >= maxPieceSize}
                  aria-label="Larger"
                  className="rounded-md border border-night-600 p-1 text-sand-300 transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11 hover:text-sand-100 disabled:opacity-30"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div role="tabpanel" className="space-y-3">
          <div className="space-y-1.5">
            {BORDERS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => pick(a.id)}
                aria-pressed={a.id === activeDesignId}
                className={`block w-full rounded-md border-2 p-1 text-left transition-colors ${
                  a.id === activeDesignId ? 'border-gold-500 bg-night-800' : 'border-night-700 hover:border-night-500'
                }`}
              >
                <span
                  className="block h-7 w-full rounded-sm"
                  style={{ backgroundImage: `url(${a.url})`, backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%' }}
                />
                <span className="mt-1 block px-0.5 text-[11px] text-sand-300">{a.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-sand-300/70">Width</span>
            <div className="grid grid-cols-2 rounded-full border border-night-600 p-0.5">
              {([0.5, 1] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={borderThickness === t}
                  onClick={() => onBorderThicknessChange(t)}
                  className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                    borderThickness === t ? 'bg-night-700 text-sand-100' : 'text-sand-300 hover:text-sand-100'
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
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-gold-500/60 py-2 text-xs font-semibold text-gold-400 transition-colors hover:bg-gold-500 hover:text-night-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gold-400"
          >
            <FrameCorners size={14} /> Frame the rug
          </button>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-sand-300/60">
        {!active
          ? 'Pick a design, then click the rug. Designs sit on tiles you have already laid.'
          : active.kind === 'piece'
            ? 'Click the rug to place it. Rotate with the toolbar. Placing over another design replaces it.'
            : 'Frame the whole rug, or drag along a row or column to lay a run.'}
      </p>
    </section>
  )
}

export default DesignsPanel
