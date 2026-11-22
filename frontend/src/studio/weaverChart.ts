/**
 * The weaver's knot chart (naksha) for a charted studio rug, as one printable HTML file: the
 * rug's facts, a yarn legend (symbol, colour, code, knots, estimated weight), a page map, then
 * the chart itself in pages of 60 x 80 knots, every knot in its colour with its yarn's symbol,
 * numbered from the bottom row up, as the rug is woven. The file carries the chart as compact
 * run-length data and draws its pages when opened, so it stays small; print it to PDF.
 */
import type { Swatch } from '../types/swatch'
import { formatFeetInches } from '../types/tileDesign'
import { rleEncode } from './compress'
import type { RugDoc } from './model'
import { CONSTRUCTIONS } from './model'
import { fibreMaterial } from '../data/materials'
import { compositeChart } from './weaveRules'

/** Distinct marks, so colours stay readable in black-and-white print and to colour-blind eyes. */
export const SYMBOLS = ['●', '○', '■', '□', '▲', '△', '▼', '▽', '◆', '◇', '★', '☆', '✚', '✕', '♥', '♦', '♣', '♠', '◐', '◑', '◒', '◓', '⬟', '⬢', '✱', '✳', '❖', '✦', '✧', '⊕', '⊗', '⊞', '⊠', '∴', '≡', '#', '%', '&', '@', '$']
export const symbolFor = (index: number) => SYMBOLS[index - 1] ?? String(index)

export const PAGE_COLS = 60
export const PAGE_ROWS = 80

/** Grams of yarn per square inch of rug, by construction (pile wool at about 10 mm for knotted). */
const GRAMS_PER_SQ_IN: Record<string, number> = { knotted: 1.55, flatweave: 0.8, needlepoint: 0.45, braided: 2.2 }
const PILE_FACTOR: Record<string, number> = { cut: 1, highlow: 1.3, shag: 1.8, loop: 1.1 }

export interface YarnUse {
  index: number
  swatchId: string
  name: string
  hex: string
  fibre: string
  knots: number
  share: number
  /** Estimated grams, with 10% for waste. */
  grams: number
}

/** Knots and estimated weight per yarn, most used first. */
export function yarnUsage(doc: RugDoc, swatchesById: Map<string, Swatch>): YarnUse[] {
  const flat = compositeChart(doc)
  if (!flat) return []
  const counts = new Uint32Array(256)
  for (let i = 0; i < flat.cells.length; i++) counts[flat.cells[i]]++
  const total = flat.cells.length - counts[0]
  const sqInPerKnot = 1 / (doc.density.across * doc.density.down)
  const base = GRAMS_PER_SQ_IN[doc.construction] ?? 1
  return doc.palette
    .map((y, i) => {
      const knots = counts[i + 1]
      const sw = swatchesById.get(y.swatchId)
      const fibre = fibreMaterial(y.fibre).facts.weight
      return {
        index: i + 1,
        swatchId: y.swatchId,
        name: sw ? `${sw.familyName} ${sw.colorName}` : y.swatchId,
        hex: sw?.swatchColor ?? '#888888',
        fibre: y.fibre,
        knots,
        share: total ? knots / total : 0,
        grams: Math.round(knots * sqInPerKnot * base * (PILE_FACTOR[y.pile ?? 'cut'] ?? 1) * fibre * 1.1),
      }
    })
    .filter((u) => u.knots > 0)
    .sort((a, b) => b.knots - a.knots)
}

/**
 * Whether the chart reads the same mirrored across and down (designed as one quarter). A
 * centred motif can land a knot off on an even grid, so 99.5% of sampled knots must mirror.
 */
export function isQuarterSymmetric(cells: Uint8Array, cols: number, rows: number): boolean {
  let seen = 0
  let off = 0
  for (let r = 0; r < rows; r += 3)
    for (let c = 0; c < cols; c += 3) {
      const v = cells[r * cols + c]
      seen++
      if (v !== cells[r * cols + (cols - 1 - c)] || v !== cells[(rows - 1 - r) * cols + c]) off++
    }
  return seen > 0 && off / seen <= 0.005
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)

export function weaverChartHtml(doc: RugDoc, swatchesById: Map<string, Swatch>, opts: { quarter: boolean }): string {
  const flat = compositeChart(doc)
  if (!flat) throw new Error('This rug has no chart to export')
  // The part to chart: all of it, or the bottom-left quarter (woven first; the rest mirrors it).
  const qc = opts.quarter ? Math.ceil(flat.cols / 2) : flat.cols
  const qr = opts.quarter ? Math.ceil(flat.rows / 2) : flat.rows
  const r0 = flat.rows - qr
  const part = new Uint8Array(qc * qr)
  for (let r = 0; r < qr; r++) part.set(flat.cells.subarray((r0 + r) * flat.cols, (r0 + r) * flat.cols + qc), r * qc)
  const usage = yarnUsage(doc, swatchesById)
  const totalKnots = usage.reduce((n, u) => n + u.knots, 0)
  const totalGrams = usage.reduce((n, u) => n + u.grams, 0)
  const construction = CONSTRUCTIONS.find((c) => c.id === doc.construction)?.name ?? doc.construction
  const technique = doc.construction === 'flatweave' ? ` (${doc.flatweave ?? 'kilim'})` : doc.construction === 'knotted' ? ` (${doc.knot ?? 'symmetric'} knot)` : ''
  const pagesAcross = Math.ceil(qc / PAGE_COLS)
  const pagesDown = Math.ceil(qr / PAGE_ROWS)
  const yarns = doc.palette.map((y, i) => ({ hex: swatchesById.get(y.swatchId)?.swatchColor ?? '#888888', symbol: symbolFor(i + 1) }))
  // JSON inside a <script>: no "</" can end it early.
  const data = JSON.stringify({ cols: qc, rows: qr, rle: rleEncode(part), yarns, pageCols: PAGE_COLS, pageRows: PAGE_ROWS }).replace(/</g, '\\u003c')
  const unit = doc.construction === 'knotted' ? 'knots' : 'cells'
  const pageMap = Array.from({ length: pagesDown }, (_, j) =>
    `<tr>${Array.from({ length: pagesAcross }, (_, i) => `<td>${(pagesDown - 1 - j) * pagesAcross + i + 1}</td>`).join('')}</tr>`,
  ).join('')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(doc.name)} · weaver's chart</title>
<style>
@page { size: A4 portrait; margin: 10mm }
html { background: #fff; color-scheme: light }
body { font: 13px/1.45 system-ui, sans-serif; color: #1f1b16; margin: 0 }
.sheet { padding: 8mm 6mm; page-break-after: always }
h1 { font-size: 22px; margin: 0 0 4px } h2 { font-size: 15px; margin: 18px 0 6px }
.facts { color: #5a5248 } table { border-collapse: collapse } th, td { border: 1px solid #cfc6b6; padding: 3px 7px; text-align: left }
td.n { text-align: right; font-variant-numeric: tabular-nums } .sw { width: 22px; height: 16px; border: 1px solid #0002 }
.sym { font-size: 15px; text-align: center } .map td { width: 30px; height: 22px; text-align: center; color: #5a5248 }
.page { page-break-after: always; padding: 4mm 0 } .page img { width: 100%; display: block } .label { font-size: 12px; color: #5a5248; margin-bottom: 3px }
.note { font-size: 12px; color: #5a5248; max-width: 170mm }
</style></head><body>
<section class="sheet">
<h1>${esc(doc.name)}</h1>
<p class="facts">${esc(construction)}${esc(technique)} · ${formatFeetInches(doc.widthFt)} × ${formatFeetInches(doc.heightFt)} · ${doc.density.across} × ${doc.density.down} ${unit} per inch · ${flat.cols.toLocaleString()} × ${flat.rows.toLocaleString()} = ${(flat.cols * flat.rows).toLocaleString()} ${unit}</p>
<p class="note">Each square is one ${unit === 'knots' ? 'knot' : 'cell'}, in its yarn's colour and symbol. Rows are numbered from the bottom, the first row woven; columns from the left. A bold line falls every 10. ${opts.quarter ? `<strong>This chart shows the bottom-left quarter</strong> (${qc} × ${qr}); mirror it across and up for the rest of the rug.` : ''}</p>
<h2>Yarns</h2>
<table><thead><tr><th>Symbol</th><th>Colour</th><th>Yarn</th><th>Code</th><th>Fibre</th><th>${unit === 'knots' ? 'Knots' : 'Cells'}</th><th>Share</th><th>Est. weight</th></tr></thead><tbody>
${usage
  .map(
    (u) =>
      `<tr><td class="sym">${esc(symbolFor(u.index))}</td><td><div class="sw" style="background:${esc(u.hex)}"></div></td><td>${esc(u.name)}</td><td>${esc(u.swatchId)}</td><td>${esc(fibreMaterial(u.fibre).name)}</td><td class="n">${u.knots.toLocaleString()}</td><td class="n">${(u.share * 100).toFixed(1)}%</td><td class="n">${(u.grams / 1000).toFixed(2)} kg</td></tr>`,
  )
  .join('\n')}
<tr><th colspan="5">Whole rug</th><th class="n">${totalKnots.toLocaleString()}</th><th></th><th class="n">${(totalGrams / 1000).toFixed(2)} kg</th></tr>
</tbody></table>
<p class="note">Weights are estimates for pile ${doc.construction === 'knotted' ? 'wool at about 10 mm' : 'yarn'}, with 10% allowed for waste; ask your weaver to confirm. Foundation (warp and weft) is extra.</p>
<h2>Pages</h2>
<p class="note">${pagesAcross * pagesDown} pages of ${PAGE_COLS} × ${PAGE_ROWS}. Laid out as the rug, bottom row of pages first:</p>
<table class="map">${pageMap}</table>
</section>
<div id="pages"><p class="sheet">Drawing the chart pages…</p></div>
<script>
const D = ${data}
const cells = new Uint8Array(D.cols * D.rows)
let at = 0
for (const part of D.rle.split(',')) { const [v, n] = part.split('*'); const c = n ? parseInt(n, 36) : 1; cells.fill(parseInt(v, 36), at, at + c); at += c }
const S = 15, M = 34
const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 }
const host = document.getElementById('pages')
host.innerHTML = ''
const across = Math.ceil(D.cols / D.pageCols), down = Math.ceil(D.rows / D.pageRows)
const canvas = document.createElement('canvas')
const g = canvas.getContext('2d')
let page = 0
for (let pj = 0; pj < down; pj++) for (let pi = 0; pi < across; pi++) {
  page++
  // Pages start at the bottom: page row pj counts up from the last chart row.
  const c0 = pi * D.pageCols, c1 = Math.min(D.cols, c0 + D.pageCols)
  const rEnd = D.rows - pj * D.pageRows, rStart = Math.max(0, rEnd - D.pageRows)
  const w = c1 - c0, h = rEnd - rStart
  canvas.width = M + w * S + 8; canvas.height = M + h * S + 8
  g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height)
  g.font = '9px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let r = rStart; r < rEnd; r++) for (let c = c0; c < c1; c++) {
    const v = cells[r * D.cols + c]; if (!v) continue
    const y = D.yarns[v - 1], x = M + (c - c0) * S, yy = M + (r - rStart) * S
    g.fillStyle = y.hex; g.fillRect(x, yy, S, S)
    g.fillStyle = lum(y.hex) > 0.55 ? '#1f1b16' : '#ffffff'; g.fillText(y.symbol, x + S / 2, yy + S / 2 + 0.5)
  }
  for (let c = c0; c <= c1; c++) { g.strokeStyle = c % 10 ? 'rgba(0,0,0,0.25)' : '#1f1b16'; g.lineWidth = c % 10 ? 0.5 : 1.4; g.beginPath(); g.moveTo(M + (c - c0) * S, M); g.lineTo(M + (c - c0) * S, M + h * S); g.stroke() }
  for (let r = rStart; r <= rEnd; r++) { const n = D.rows - r; g.strokeStyle = n % 10 ? 'rgba(0,0,0,0.25)' : '#1f1b16'; g.lineWidth = n % 10 ? 0.5 : 1.4; g.beginPath(); g.moveTo(M, M + (r - rStart) * S); g.lineTo(M + w * S, M + (r - rStart) * S); g.stroke() }
  g.fillStyle = '#1f1b16'; g.font = '10px system-ui, sans-serif'
  for (let c = c0; c < c1; c++) if ((c + 1) % 10 === 0 || c === c0) g.fillText(String(c + 1), M + (c - c0) * S + S / 2, M / 2)
  g.textAlign = 'right'
  for (let r = rStart; r < rEnd; r++) { const n = D.rows - r; if (n % 10 === 0 || r === rEnd - 1) g.fillText(String(n), M - 4, M + (r - rStart) * S + S / 2) }
  const box = document.createElement('section'); box.className = 'page'
  const label = document.createElement('div'); label.className = 'label'
  label.textContent = 'Page ' + page + ' of ' + across * down + ' · columns ' + (c0 + 1) + '–' + c1 + ', rows ' + (D.rows - rEnd + 1) + '–' + (D.rows - rStart)
  const img = new Image(); img.src = canvas.toDataURL('image/png'); img.alt = label.textContent
  box.append(label, img); host.append(box)
}
</script>
</body></html>`
}
