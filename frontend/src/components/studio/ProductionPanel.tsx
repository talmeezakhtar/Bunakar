import { useMemo, useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import type { RugDoc } from '../../studio/model'
import { compositeChart } from '../../studio/weaveRules'
import { isQuarterSymmetric, weaverChartHtml, yarnUsage } from '../../studio/weaverChart'
import { downloadText } from '../../utils/freeformProduction'
import { useProGate } from '../../hooks/usePlan'
import ProBadge from '../ui/ProBadge'

/**
 * What the weaver needs: knots and estimated weight per yarn (shown to everyone), and the
 * printable knot chart to download (Pro).
 */
export default function ProductionPanel({ doc, swatchesById }: { doc: RugDoc; swatchesById: Map<string, Swatch> }) {
  const requirePro = useProGate()
  const usage = useMemo(() => yarnUsage(doc, swatchesById), [doc, swatchesById])
  const symmetric = useMemo(() => {
    const flat = compositeChart(doc)
    return !!flat && isQuarterSymmetric(flat.cells, flat.cols, flat.rows)
  }, [doc])
  const [quarter, setQuarter] = useState<boolean | null>(null)
  const quarterOnly = quarter ?? symmetric
  const totalKg = usage.reduce((n, u) => n + u.grams, 0) / 1000
  const unit = doc.construction === 'knotted' ? 'knots' : 'cells'

  function download() {
    if (!requirePro("Weaver's charts")) return
    const slug = (doc.name || 'rug').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    downloadText(`${slug}-weavers-chart.html`, weaverChartHtml(doc, swatchesById, { quarter: quarterOnly }), 'text/html')
  }

  return (
    <section className="border-b border-line px-4 py-4 last:border-b-0">
      <h3 className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-muted">For the weaver</h3>
      <div className="mt-3 space-y-3">
        {usage.length ? (
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-1 font-medium">Yarn</th>
                <th className="pb-1 text-right font-medium capitalize">{unit}</th>
                <th className="pb-1 text-right font-medium">Est.</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.index} className="border-t border-line">
                  <td className="py-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-sm ring-1 ring-black/10" style={{ backgroundColor: u.hex }} aria-hidden="true" />
                      <span className="truncate text-ink">{u.name}</span>
                    </span>
                  </td>
                  <td className="py-1 text-right tabular-nums text-ink-2">{u.knots.toLocaleString()}</td>
                  <td className="py-1 text-right tabular-nums text-ink-2">{(u.grams / 1000).toFixed(2)} kg</td>
                </tr>
              ))}
              <tr className="border-t border-line-strong font-medium text-ink">
                <td className="py-1">Whole rug</td>
                <td className="py-1 text-right tabular-nums">{usage.reduce((n, u) => n + u.knots, 0).toLocaleString()}</td>
                <td className="py-1 text-right tabular-nums">{totalKg.toFixed(2)} kg</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="text-[0.875rem] text-ink-2">Paint the chart and its yarn counts appear here.</p>
        )}
        <p className="text-[0.8125rem] text-muted">Weights are estimates of pile yarn, with 10% for waste.</p>
        <label className="flex items-start gap-2 text-[0.875rem] text-ink-2">
          <input type="checkbox" checked={quarterOnly} onChange={(e) => setQuarter(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
          <span>
            Chart one quarter only
            <span className="block text-[0.8125rem] text-muted">{symmetric ? 'This design mirrors in four, so a quarter is all the weaver needs.' : "This design doesn't mirror in four; chart the whole rug."}</span>
          </span>
        </label>
        <button
          type="button"
          onClick={download}
          disabled={!usage.length}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-line-strong px-4 text-[0.9rem] font-medium text-ink transition-colors hover:border-ink disabled:opacity-40"
        >
          <DownloadSimple size={15} /> Download the weaver&apos;s chart <ProBadge />
        </button>
        <p className="text-[0.8125rem] text-muted">A printable file: a yarn legend, then the chart in numbered pages, each knot with its colour and symbol.</p>
      </div>
    </section>
  )
}
