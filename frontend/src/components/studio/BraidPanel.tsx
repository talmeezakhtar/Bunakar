import { Plus, Trash } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import type { BraidSpec, RugDoc } from '../../studio/model'
import { YarnPick } from './LayoutPanel'

/**
 * A braided rug's braid: how wide it is, and its bands, each a round of three strands. The
 * bands repeat from the edge inward until the centre.
 */
export default function BraidPanel({ doc, swatchesById, onBraid }: { doc: RugDoc; swatchesById: Map<string, Swatch>; onBraid: (spec: BraidSpec) => void }) {
  const spec = doc.braid ?? { braidIn: 1.5, bands: [] }
  const setBand = (i: number, k: number, v: number) => onBraid({ ...spec, bands: spec.bands.map((b, j) => (j === i ? (b.map((x, n) => (n === k ? v : x)) as [number, number, number]) : b)) })
  return (
    <>
      <section className="border-b border-line px-4 py-4">
        <h3 className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-muted">Braid</h3>
        <label className="mt-3 block text-[0.875rem] text-ink-2">
          Braid width
          <select className="mt-1 block min-h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-[0.9rem] text-ink" value={spec.braidIn} onChange={(e) => onBraid({ ...spec, braidIn: Number(e.target.value) })}>
            {[0.75, 1, 1.25, 1.5, 2, 2.5, 3].map((w) => (
              <option key={w} value={w}>
                {w} in
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-[0.8125rem] text-muted">Each band is one round of braid. They repeat from the edge to the centre.</p>
      </section>
      <section className="space-y-3 px-4 py-4">
        {spec.bands.map((band, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.875rem] font-medium text-ink">Band {i + 1}</p>
              <button
                type="button"
                aria-label={`Remove band ${i + 1}`}
                disabled={spec.bands.length === 1}
                onClick={() => onBraid({ ...spec, bands: spec.bands.filter((_, j) => j !== i) })}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-30"
              >
                <Trash size={15} />
              </button>
            </div>
            {band.map((v, k) => (
              <div key={k}>
                <p className="text-[0.8125rem] text-ink-2">Strand {k + 1}</p>
                <div className="mt-1">
                  <YarnPick name={`Band ${i + 1}, strand ${k + 1}`} value={v} onChange={(y) => setBand(i, k, y)} doc={doc} swatchesById={swatchesById} />
                </div>
              </div>
            ))}
          </div>
        ))}
        {spec.bands.length < 12 && (
          <button
            type="button"
            onClick={() => onBraid({ ...spec, bands: [...spec.bands, [...(spec.bands[spec.bands.length - 1] ?? [1, 1, 1])] as [number, number, number]] })}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[0.875rem] text-ink hover:border-ink"
          >
            <Plus size={14} /> Add a band
          </button>
        )}
      </section>
    </>
  )
}
