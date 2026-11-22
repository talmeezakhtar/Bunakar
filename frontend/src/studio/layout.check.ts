// Self-check for the layout scaffold: `npx tsx src/studio/layout.check.ts`.
import type { Stamper } from './layout'
import { defaultLayout, layoutGeometry, renderLayout, withLayout } from './layout'
import type { LayoutSpec } from './model'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}
const density = { across: 10, down: 10 }
const cols = 72 * 10 // 6 ft
const rows = 108 * 10 // 9 ft
const at = (cells: Uint8Array, c: number, r: number) => cells[r * cols + c]

// Plain bands, field and medallion, with no motif art.
const plain: LayoutSpec = { ...defaultLayout(4), borders: defaultLayout(4).borders.map((b) => ({ ...b, motifId: undefined })), medallion: { ...defaultLayout(4).medallion!, motifId: undefined } }
const a = renderLayout(plain, cols, rows, density)
const { bands, field } = layoutGeometry(plain, cols, rows, density)
assert(bands[1].ox === 15 && bands[2].ox === 75 && field.c0 === 90 && field.r1 === rows - 90, `band insets: ${bands.map((b) => b.ox)} field ${field.c0}`)
assert(at(a, 0, 0) === 3 && at(a, 20, 500) === 2 && at(a, 80, 500) === 3, 'outer guard, main band, inner guard')
assert(at(a, 100, 110) === 2, 'a spandrel fills the field corner')
assert(at(a, cols / 2, rows / 2) === 2 && at(a, 150, rows / 2) === 1, 'medallion at the centre, field around it')
let symmetric = true
for (let r = 0; r < rows && symmetric; r += 7) for (let c = 0; c < cols; c += 7) if (at(a, c, r) !== at(a, cols - 1 - c, rows - 1 - r) || at(a, c, r) !== at(a, cols - 1 - c, r)) symmetric = false
assert(symmetric, 'a plain layout is quarter-symmetric')

// Border art: bottom is the top turned half round, right is the left turned half round.
const fake: Stamper = {
  aspect: () => 2,
  draw: (_id, _part, w, h) => {
    const cells = new Uint8Array(w * h)
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) cells[r * w + c] = c < w / 2 ? 5 : r < h / 2 ? 6 : 0
    return { cols: w, rows: h, cells }
  },
}
for (const corners of ['flowing', 'mitred', 'block'] as const) {
  const spec: LayoutSpec = { borders: [{ role: 'main', widthIn: 6, ground: 2, motifId: 'x' }], corners, field: 1 }
  const b = renderLayout(spec, cols, rows, density, fake)
  let turned = true
  for (let r = 0; r < 60 && turned; r++) for (let c = 0; c < cols; c += 3) if (at(b, c, r) !== at(b, cols - 1 - c, rows - 1 - r)) turned = false
  for (let r = 0; r < rows && turned; r += 3) for (let c = 0; c < 60; c++) if (at(b, c, r) !== at(b, cols - 1 - c, rows - 1 - r)) turned = false
  assert(turned, `${corners}: border art turns half round`)
  let mirrored = true
  for (let r = 0; r < 60 && mirrored; r++) for (let c = 0; c < cols; c += 3) if (at(b, c, r) !== at(b, cols - 1 - c, r)) mirrored = false
  assert(mirrored, `${corners}: border runs mirror at the middle of each side`)
  assert(b.subarray(0, cols * 60).some((v) => v === 5) && b.subarray(0, cols * 60).some((v) => v === 6), `${corners}: art drawn on the top band`)
  assert(at(b, 300, 500) === 1, `${corners}: field untouched`)
}

// Prayer niche: spandrel above the arch at the field's top corners, niche ground below.
const niche = renderLayout({ borders: [{ role: 'main', widthIn: 4, ground: 2 }], corners: 'mitred', field: 1, niche: { ground: 3, archPct: 40, spandrel: 4 } }, cols, rows, density)
assert(at(niche, 45, 45) === 4 && at(niche, cols / 2, 60) === 4 && at(niche, cols / 2, 120) === 3 && at(niche, 45, rows - 60) === 3, 'niche arch and spandrels')

// Compartments: lines in their colour, panels in theirs, a 3 x 4 grid.
const comp = renderLayout({ borders: [], corners: 'mitred', field: 1, compartments: { cols: 3, rows: 4, lineWidthIn: 1, ground: 2, line: 3 } }, cols, rows, density)
assert(at(comp, 5, 500) === 3 && at(comp, 120, 135) === 2 && at(comp, 240, 500) === 3, 'compartment lines and panels')

// An all-over repeat centred on the field.
const rep = renderLayout({ borders: [], corners: 'mitred', field: 1, repeat: { motifId: 'x', everyIn: 8, drop: 'half-drop', color: 4 } }, cols, rows, density, fake)
const painted = rep.reduce((n, v) => n + (v === 4 ? 1 : 0), 0)
assert(painted > cols * rows * 0.1 && painted < cols * rows * 0.6, `repeat covers part of the field: ${painted}`)

console.log('layout: ok')

// Presets: every motif exists in the catalogue, and applying one merges yarns and draws the layout.
{
  const { PRESETS, mergePreset } = await import('./presets')
  const { findMotifDef } = await import('../data/motifs/catalogue')
  const { newRug } = await import('./model')
  const { withLayout } = await import('./layout')
  for (const p of PRESETS) {
    const ids = [...p.layout.borders.map((b) => b.motifId), p.layout.niche?.motifId, p.layout.medallion?.motifId, p.layout.spandrels?.motifId, p.layout.compartments?.motifId, p.layout.repeat?.motifId]
    for (const id of ids) assert(!id || findMotifDef(id), `${p.id}: unknown motif ${id}`)
  }
  const rug = newRug({ construction: 'knotted', widthFt: 4, heightFt: 6, palette: [{ swatchId: 'solid-navy', fibre: 'wool' }] })
  const kashan = PRESETS.find((p) => p.id === 'kashan')!
  assert(mergePreset(rug, kashan).doc.palette.map((y) => y.swatchId).join() === kashan.swatchIds.join(), 'an unpainted rug takes the preset yarns as they are')
  const chart = rug.layers[0]
  if (chart.kind === 'chart') chart.cells[5] = 1 + (chart.cells[0] === 1 ? 1 : 0)
  const { doc, layout } = mergePreset(rug, kashan)
  assert(doc.palette.length === 6 && doc.palette[0].swatchId === 'solid-navy' && layout.borders[1].ground === 1, 'a painted rug keeps its yarns; kashan merged with navy as yarn 1')
  const laid = withLayout(doc, layout)
  assert(laid.layers.length === 2 && laid.layers[0].kind === 'chart' && laid.layers[0].role === 'layout', 'layout layer at the bottom')
  const top = laid.layers[1]
  assert(top.kind === 'chart' && top.cells[5] !== 0, 'a painted drawing layer is kept')
  const fresh = withLayout(mergePreset(newRug({ construction: 'knotted', widthFt: 4, heightFt: 6, palette: [{ swatchId: 'solid-navy', fibre: 'wool' }] }), kashan).doc, kashan.layout)
  const freshTop = fresh.layers[1]
  assert(freshTop.kind === 'chart' && freshTop.cells.every((v) => v === 0), 'an untouched drawing layer is cleared to show the layout')
  const again = withLayout(laid, { ...layout, field: 2 })
  assert(again.layers.length === 2 && again.layers[0].id === laid.layers[0].id, 'changing the layout redraws the same layer')
  assert(withLayout(again, null).layers.length === 1 && withLayout(again, null).layout === null, 'removing the layout')
  console.log('presets: ok')
}

// Geometric fields: every pattern uses all its colours and stays symmetric across.
for (const kind of ['stripes', 'chevron', 'diamonds', 'ikat'] as const) {
  const g = renderLayout({ borders: [], corners: 'mitred', field: 1, pattern: { kind, sizeIn: 12, bands: 4, colors: [2, 3, 4] } }, cols, rows, density)
  const seen = new Set(g)
  assert(seen.has(2) && seen.has(3) && seen.has(4) && !seen.has(1), `${kind}: bands in all three colours`)
  if (kind !== 'ikat') {
    let mirrored = true
    for (let r = 0; r < rows && mirrored; r += 11) for (let c = 0; c < cols; c += 5) if (at(g, c, r) !== at(g, cols - 1 - c, r)) mirrored = false
    assert(mirrored, `${kind}: mirrored across`)
  }
}
console.log('patterns: ok')

// A round rug's bands follow its edge: the band colour on the circle, the field inside it.
{
  const n = 600
  const d = { across: 10, down: 10 }
  const g = renderLayout({ borders: [{ role: 'main', widthIn: 4, ground: 2 }], corners: 'mitred', field: 1 }, n, n, d, undefined, 'round')
  const px = (c: number, r: number) => g[r * n + c]
  assert(px(300, 10) === 2 && px(10, 300) === 2 && px(5, 5) === 0 && px(300, 60) === 1, 'band at the circle edge, field inside')
  // On the diagonal the band sits where the circle is, not in the square's corner.
  const k = Math.round(300 - 300 / Math.SQRT2 + 10)
  assert(px(k, k) === 2 && px(130, 130) === 1, `band follows the curve: ${px(k, k)} ${px(130, 130)}`)
  console.log('shaped layout: ok')
}

// Resizing a rug: stretch keeps the design across the new size; keep trims or pads around the centre.
{
  const { resizeChart, resizeRug } = await import('./resize')
  const { newRug } = await import('./model')
  const base = { kind: 'chart' as const, id: 'c', name: 'C', visible: true, cols: 4, rows: 2, cells: new Uint8Array([1, 1, 2, 2, 3, 3, 4, 4]) }
  const s = resizeChart(base, 8, 4, 'stretch')
  assert(s.cells[0] === 1 && s.cells[7] === 2 && s.cells[31] === 4 && s.cells.length === 32, 'stretched')
  const k = resizeChart(base, 6, 4, 'keep')
  assert(k.cells[0] === 0 && k.cells[1 * 6 + 1] === 1 && k.cells[2 * 6 + 4] === 4 && k.cells[3 * 6 + 5] === 0, 'kept and padded')
  const t = resizeChart(base, 2, 2, 'keep')
  assert(t.cells.join() === '1,2,3,4', `trimmed: ${t.cells.join()}`)
  const rug = withLayout(newRug({ construction: 'knotted', widthFt: 4, heightFt: 6, palette: [{ swatchId: 'a', fibre: 'wool' }, { swatchId: 'b', fibre: 'wool' }] }), defaultLayout(2))
  const big = resizeRug(rug, 5, 8, 'stretch')
  assert(resizeRug({ ...rug, name: "Hand-knotted 4' x 6'" }, 5, 8, 'keep').name === "Hand-knotted 5' x 8'", 'an automatic name follows the size')
  assert(resizeRug({ ...rug, name: 'Grandma' }, 5, 8, 'keep').name === 'Grandma', 'a chosen name stays')
  assert(big.layers.every((l) => l.kind !== 'chart' || (l.cols === 600 && l.rows === 960)) && big.layout === rug.layout, 'every chart and the layout at the new size')
  console.log('resize: ok')
}

// Braids: rounds in each band's yarns, following an oval's edge; nothing outside it.
{
  const { renderBraid, withBraid, defaultBraid } = await import('./braid')
  const { newRug } = await import('./model')
  const d = { across: 6, down: 6 }
  const cols = 36 * 6
  const rows = 48 * 6
  const g = renderBraid({ braidIn: 2, bands: [[1, 2, 3], [4, 4, 4]] }, cols, rows, d, 'oval')
  const px = (c: number, r: number) => g[r * cols + c]
  assert(px(2, 2) === 0, 'outside the oval: empty')
  assert([1, 2, 3].includes(px(cols / 2, 3)) && px(cols / 2, 15) === 4 && [1, 2, 3].includes(px(cols / 2, 27)), 'first round in band one, second in band two, then band one again')
  const strands = new Set<number>()
  for (let c = 60; c < 160; c++) if (px(c, 3)) strands.add(px(c, 3))
  assert(strands.size === 3, `all three strands show along a round: ${[...strands]}`)
  const rug = withBraid(newRug({ construction: 'braided', shape: { kind: 'oval' }, widthFt: 5, heightFt: 8, palette: [1, 2, 3, 4].map((i) => ({ swatchId: `y${i}`, fibre: 'wool' as const })) }), defaultBraid(4))
  assert(rug.layers[0].kind === 'chart' && rug.layers[0].name === 'Braid' && rug.braid?.bands.length === 4, 'braid layer drawn')
  const top = rug.layers[1]
  assert(top.kind === 'chart' && top.cells.every((v) => v === 0), 'the unpainted chart above is cleared')
  console.log('braid: ok')
}
