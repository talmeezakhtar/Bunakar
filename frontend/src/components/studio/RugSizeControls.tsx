import { useState } from 'react'
import type { ResizeMode } from '../../studio/resize'

/**
 * Width and length in feet, applied together. A charted rug also chooses what happens to its
 * knots: stretch the design to the new size, or keep the knots and trim or add at the edges.
 */
export default function RugSizeControls({ widthFt, heightFt, charted, square, onApply }: { widthFt: number; heightFt: number; charted: boolean; square: boolean; onApply: (w: number, h: number, mode: ResizeMode) => void }) {
  const [w, setW] = useState(String(widthFt))
  const [h, setH] = useState(String(heightFt))
  const [mode, setMode] = useState<ResizeMode>('stretch')
  const nw = Number(w)
  const nh = square ? nw : Number(h)
  const valid = nw >= 1 && nw <= 60 && nh >= 1 && nh <= 60
  const changed = nw !== widthFt || nh !== heightFt
  const input = 'mt-1 block w-24 rounded-lg border border-line-strong bg-surface px-3 py-2 text-base text-ink tabular-nums focus:border-ink focus:outline-none disabled:opacity-50'
  const radio = (on: boolean) => `min-h-9 rounded-full border px-3 text-[0.8125rem] transition-colors ${on ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2 hover:border-ink'}`
  return (
    <div className="space-y-2.5">
      <div className="flex items-end gap-2">
        <label className="text-sm text-ink-2">
          {square ? 'Across (ft)' : 'Width (ft)'}
          <input type="number" min={1} max={60} step={0.5} value={w} onChange={(e) => setW(e.target.value)} className={input} />
        </label>
        {!square && (
          <label className="text-sm text-ink-2">
            Length (ft)
            <input type="number" min={1} max={60} step={0.5} value={h} onChange={(e) => setH(e.target.value)} className={input} />
          </label>
        )}
      </div>
      {charted && changed && (
        <div role="radiogroup" aria-label="What happens to the knots" className="flex flex-wrap gap-1.5">
          <button type="button" role="radio" aria-checked={mode === 'stretch'} className={radio(mode === 'stretch')} onClick={() => setMode('stretch')}>
            Stretch the design
          </button>
          <button type="button" role="radio" aria-checked={mode === 'keep'} className={radio(mode === 'keep')} onClick={() => setMode('keep')}>
            Keep the knots
          </button>
        </div>
      )}
      {charted && changed && (
        <p className="text-[0.8125rem] text-muted">
          {mode === 'stretch' ? 'Your drawing is resampled to fill the new size.' : 'Your drawing stays knot for knot, centred; edges are trimmed or added.'} The layout redraws to fit.
        </p>
      )}
      {!valid && <p className="text-[0.8125rem] text-danger">Sizes run from 1 to 60 ft.</p>}
      <button
        type="button"
        disabled={!valid || !changed}
        onClick={() => onApply(nw, nh, mode)}
        className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-[0.875rem] font-medium text-paper transition-colors hover:bg-ink-2 disabled:opacity-40"
      >
        Apply the size
      </button>
    </div>
  )
}
