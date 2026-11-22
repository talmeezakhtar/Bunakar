// Self-check for the weaver's chart: `npx tsx src/studio/weaverChart.check.ts`.
import type { Swatch } from '../types/swatch'
import { newRug } from './model'
import { isQuarterSymmetric, weaverChartHtml, yarnUsage } from './weaverChart'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}
const swatches = new Map<string, Swatch>([
  ['a', { id: 'a', familyName: 'Solid', colorName: 'Wine <red>', swatchColor: '#7a2436' } as Swatch],
  ['b', { id: 'b', familyName: 'Solid', colorName: 'Ivory', swatchColor: '#efe8da' } as Swatch],
])
const rug = newRug({ construction: 'knotted', widthFt: 2, heightFt: 3, palette: [{ swatchId: 'a', fibre: 'wool' }, { swatchId: 'b', fibre: 'wool' }] })
const chart = rug.layers[0]
if (chart.kind !== 'chart') throw new Error('chart expected')
// 240 x 360 knots of yarn 1, with a centred ivory block (quarter-symmetric).
for (let r = 150; r < 210; r++) for (let c = 90; c < 150; c++) chart.cells[r * 240 + c] = 2

const use = yarnUsage(rug, swatches)
assert(use.length === 2 && use[0].index === 1 && use[1].knots === 3600 && use[0].knots + use[1].knots === 86400, 'knots per yarn')
// 2 x 3 ft = 864 sq in at 1.55 g, plus 10%: about 1.47 kg in all.
const total = use.reduce((n, u) => n + u.grams, 0)
assert(Math.abs(total - 864 * 1.55 * 1.1) < 3, `estimated weight: ${total} g`)
assert(isQuarterSymmetric(chart.cells, 240, 360), 'centred block is quarter-symmetric')
{
  const lopsided = chart.cells.slice()
  for (let r = 0; r < 120; r++) for (let c = 0; c < 80; c++) lopsided[r * 240 + c] = 2
  assert(!isQuarterSymmetric(lopsided, 240, 360), 'a block in one corner only is not')
}

const html = weaverChartHtml(rug, swatches, { quarter: false })
assert(html.includes('Wine &lt;red&gt;') && !html.includes('Wine <red>'), 'yarn names escaped')
assert(html.includes('20 pages of 60 × 80') && html.includes('86,400 knots'), 'pages and knot count: 4 across x 5 down (rounded up) for 240 x 360')
const quarter = weaverChartHtml(rug, swatches, { quarter: true })
assert(quarter.includes('bottom-left quarter') && quarter.includes('6 pages'), 'a quarter is 120 x 180: 2 x 3 pages')
assert(html.length < 60_000, `the file stays small: ${html.length}`)
console.log('weaver chart: ok')
