// Self-check for freeform rugs: `npx tsx src/store/freeform.check.ts`.
import { MOCK_SWATCHES } from '../data/mockSwatches'
import { FREEFORM_GENERATORS, FREEFORM_PALETTES, SHAPE_LIBRARY, applyGenerator, stampPoints } from '../data/freeformGenerators'
import { createDefaultFreeformDesign, freeformRecordToState, freeformStateToRecord } from '../types/freeform'
import type { FreeformShape } from '../types/freeform'
import { contourLinesPath, flattenShape, polygonArea, voronoiCells } from '../utils/freeformGeometry'
import { finishUsage, tuftingTemplateSvg } from '../utils/freeformProduction'
import { addShape, moveShape, removeStyle, reorderShape, setFinish, topShapeAt } from './freeformOps'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

// Voronoi cells tile the rectangle exactly.
const cells = voronoiCells([{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 4 }], 4, 5)
const area = cells.reduce((a, c) => a + polygonArea(c), 0)
assert(Math.abs(area - 20) < 1e-6, `voronoi area ${area}`)

const byId = new Map(MOCK_SWATCHES.map((s) => [s.id, s]))
for (const g of FREEFORM_GENERATORS) {
  for (const [w, h] of [[5, 8], [3, 12], [9, 12]]) {
    const pal = FREEFORM_PALETTES.find((p) => p.id === g.paletteId)!
    const s = applyGenerator(createDefaultFreeformDesign(w, h), g, pal, { seed: 42, ...g.defaults }, MOCK_SWATCHES)
    assert(byId.has(s.ground.swatchId), `${g.id}: ground resolves`)
    for (const sh of s.shapes) {
      assert(sh.points.length >= 3 && sh.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), `${g.id}: shape points`)
      assert(byId.has(sh.swatchId), `${g.id}: shape colour resolves`)
    }
    if (g.id !== 'blank') assert(s.shapes.length > 0, `${g.id}: makes shapes`)
    // Same seed -> same rug.
    const again = applyGenerator(createDefaultFreeformDesign(w, h), g, pal, { seed: 42, ...g.defaults }, MOCK_SWATCHES)
    assert(JSON.stringify(again.shapes.map((x) => x.points)) === JSON.stringify(s.shapes.map((x) => x.points)), `${g.id}: deterministic`)
    // Usage covers the whole rug, whatever overlaps.
    const total = finishUsage(s, 0.1).reduce((a, u) => a + u.areaSqFt, 0)
    assert(Math.abs(total - w * h) < 0.5, `${g.id} ${w}x${h}: usage ${total}`)
  }
}

// Ops: fills replace, topmost wins, identity on no-ops.
let d = createDefaultFreeformDesign(4, 4, 'wool-ivory')
const sq = (id: string, x: number): FreeformShape => ({
  id, points: [{ x, y: 1 }, { x: x + 2, y: 1 }, { x: x + 2, y: 3 }, { x, y: 3 }], smooth: false,
  swatchId: 'wool-coral', texture: 'cut', carve: 'none', carveAngle: 45, pile: 'standard',
})
d = addShape(addShape(d, sq('a', 0.5)), sq('b', 1.5))
assert(topShapeAt(d, { x: 2, y: 2 })?.id === 'b', 'topmost shape wins')
assert(topShapeAt(reorderShape(d, 'b', -1), { x: 2, y: 2 })?.id === 'a', 'reorder')
const painted = setFinish(d, 'a', { swatchId: 'wool-teal', texture: 'shag' })
assert(painted.shapes[0].texture === 'shag' && painted.myStyles.includes('wool-teal'), 'fill replaces + adds style')
assert(setFinish(painted, 'a', { texture: 'shag' }) === painted, 'no-op keeps identity')
assert(moveShape(d, 'a', 0, 0) === d, 'zero move keeps identity')
assert(removeStyle(d, 'wool-coral') === d, 'in-use yarn stays in palette')
assert(flattenShape({ points: sq('x', 0).points, smooth: true }).length === 32, 'smooth flatten')

// Record round trip.
const rec = { ...freeformStateToRecord(d), id: 'r1' }
assert(JSON.stringify(freeformRecordToState(rec).shapes) === JSON.stringify(d.shapes), 'record round trip')

// Usage + template.
const usage = finishUsage(d, 0.05)
assert(usage[0].code === 'A' && usage.length === 2 && usage[0].areaSqFt > 0, 'usage codes + area')
const svg = tuftingTemplateSvg(d, byId)
assert(svg.includes('width="198in"') && svg.includes('>A<') && svg.includes('(ground)'), 'template')

// Stamps land where asked.
const st = stampPoints(SHAPE_LIBRARY[0].id, { x: 3, y: 3 }, 2)
const xs = st.map((p) => p.x)
assert(Math.abs(Math.min(...xs) - 2) < 0.01 && Math.abs(Math.max(...xs) - 4) < 0.01, 'stamp size/position')

// Mosaic's ribbed share slider drives how many panels get ribs.
const mosaic = FREEFORM_GENERATORS.find((g) => g.id === 'mosaic')!
const mosaicPal = FREEFORM_PALETTES.find((p) => p.id === mosaic.paletteId)!
const ribs = (ribbed: number) =>
  applyGenerator(createDefaultFreeformDesign(6, 9), mosaic, mosaicPal, { seed: 3, ...mosaic.defaults, ribbed }, MOCK_SWATCHES).shapes.filter((x) => x.carve === 'ribbed').length
assert(ribs(0) === 0 && ribs(1) > 0 && ribs(1) === applyGenerator(createDefaultFreeformDesign(6, 9), mosaic, mosaicPal, { seed: 3, ...mosaic.defaults, ribbed: 1 }, MOCK_SWATCHES).shapes.length, 'ribbed share')

// Contour grooves ring the shapes: lines cross a ray out from a shape at roughly even spacing.
const ring = [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 3, y: 4 }]
const plain = contourLinesPath(8, 8)
const ringed = contourLinesPath(8, 8, [ring])
assert(plain && ringed && plain !== ringed, 'contour follows shapes')
const nearCrossings = ringed.split('M').filter((seg) => {
  const [a, b] = seg.split('L').map((xy) => xy.split(',').map(Number))
  return a && b && Math.min(a[1], b[1]) <= 3.5 && Math.max(a[1], b[1]) >= 3.5 && a[0] > 4 && a[0] < 5
}).length
assert(nearCrossings >= 5, `contour rings near shape: ${nearCrossings}`)

console.log(`ok: freeform (${FREEFORM_GENERATORS.length} generators, ${SHAPE_LIBRARY.length} library shapes)`)
