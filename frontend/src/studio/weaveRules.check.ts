// Self-check for weave rules: `npx tsx src/studio/weaveRules.check.ts`.
import { findSlits, maxSlitRows, stepSlits } from './weaveRules'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

// A 10 x 30 chart: left half yarn 1, right half yarn 2, a straight edge all the way down.
const cols = 10
const rows = 30
const cells = new Uint8Array(cols * rows)
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells[r * cols + c] = c < 5 ? 1 : 2
const max = maxSlitRows(8)
assert(max === 6, `three quarters of an inch at 8 rows per inch: ${max}`)
const slits = findSlits(cells, cols, rows, max)
assert(slits.length === 1 && slits[0].c === 4 && slits[0].r0 === 0 && slits[0].r1 === 29, `one long slit: ${JSON.stringify(slits)}`)

// Stepping the edge breaks it into short runs.
const fix = stepSlits(cells, cols, slits, max)
for (const { index, value } of fix) cells[index] = value
assert(findSlits(cells, cols, rows, max).length === 0, 'no long slits after stepping')
// A run just one row too long gets its step too.
{
  const g = new Uint8Array(4 * 7)
  for (let r = 0; r < 7; r++) g.set([1, 1, 2, 2], r * 4)
  const s = findSlits(g, 4, 7, 6)
  assert(s.length === 1 && stepSlits(g, 4, s, 6).length === 1, 'seven rows over a limit of six: one step')
}

// A stepped diagonal (a kilim's classic edge) has none to begin with; empty knots don't count.
const diag = new Uint8Array(cols * rows)
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) diag[r * cols + c] = c < (r % 10) / 2 + 2 ? 1 : 2
assert(findSlits(diag, cols, rows, max).length === 0, 'a stepped edge has no long slits')
assert(findSlits(new Uint8Array(cols * rows), cols, rows, max).length === 0, 'empty chart')

console.log('weave rules: ok')

// Thin vertical lines side by side need more than one pass.
{
  const { fixSlits } = await import('./weaveRules')
  const g = new Uint8Array(12 * 40)
  for (let r = 0; r < 40; r++) for (let c = 0; c < 12; c++) g[r * 12 + c] = c === 5 ? 2 : c === 6 ? 3 : 1
  const before = findSlits(g, 12, 40, 6).length
  const { changes, left } = fixSlits(g, 12, 40, 6)
  for (const { index, value } of changes) g[index] = value
  assert(before === 3 && left === 0 && findSlits(g, 12, 40, 6).length === 0, `thin lines fixed: ${before} -> ${left}`)
}
console.log('weave fix: ok')
