// Self-check for the studio's rug document: `npx tsx src/studio/model.check.ts`.
import { createDefaultFreeformDesign } from '../types/freeform'
import { createDefaultTileDesign } from '../types/tileDesign'
import type { TileDesignState } from '../types/tileDesign'
import { decodeDoc, docToDraft, draftToDoc, encodeDoc, rleDecode, rleEncode } from './compress'
import { freeformToDoc, shapeLayerState, tileLayerState, tileToDoc } from './convert'
import type { ChartLayer, ShapeLayer, TileLayer } from './model'
import { chartSize, newRug, usedSwatches } from './model'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

// Chart size follows size x density.
const s = chartSize(9, 12, { across: 10, down: 10 })
assert(s.cols === 1080 && s.rows === 1440, `9x12 ft at 10x10 per inch: ${JSON.stringify(s)}`)

// A big chart survives saving and loading exactly, and compresses well.
const rug = newRug({ construction: 'knotted', widthFt: 9, heightFt: 12, palette: [{ swatchId: 'solid-wine', fibre: 'wool' }, { swatchId: 'solid-gold', fibre: 'wool' }] })
const chart = rug.layers[0] as ChartLayer
for (let r = 0; r < chart.rows; r++) for (let c = 0; c < chart.cols; c++) if ((r * 7 + c * 3) % 50 < 9) chart.cells[r * chart.cols + c] = 2
const stored = await encodeDoc(rug)
const json = JSON.stringify(stored)
assert(json.length < 200_000, `a patterned 9x12 chart stores small: ${json.length} bytes`)
const back = await decodeDoc(JSON.parse(json))
const backChart = back.layers[0] as ChartLayer
assert(backChart.cells.length === chart.cells.length && backChart.cells.every((v, i) => v === chart.cells[i]), 'chart round-trips exactly')
assert([...usedSwatches(back)].sort().join() === 'solid-gold,solid-wine', 'used yarns')

// A damaged chart is refused, not half-loaded.
const broken = JSON.parse(json)
broken.layers[0].rows += 1
let refused = false
await decodeDoc(broken).catch(() => (refused = true))
assert(refused, 'damaged chart refused')

// Old tile designs convert with nothing lost.
const tile: TileDesignState = {
  ...createDefaultTileDesign(4, 6),
  name: 'Old tile rug',
  tiles: { '0-0': [{ swatchId: 'solid-wine', cutType: 'half', rotation: 90, slot: { x: 0, y: 0 } }] },
  myStyles: ['solid-wine', 'solid-navy'],
  overlays: [{ id: 'o1', assetId: 'medallion-star', row: 1, col: 1, widthTiles: 2, heightTiles: 2, rotation: 0 }],
}
const tdoc = tileToDoc(tile)
assert(tdoc.construction === 'tiles' && tdoc.widthFt === 6 && tdoc.heightFt === 9, 'tile size in feet')
const tback = tileLayerState(tdoc, tdoc.layers[0] as TileLayer)
for (const k of ['widthTiles', 'heightTiles', 'orientation', 'tiles', 'overlays', 'backgroundId', 'rugCategory'] as const)
  assert(JSON.stringify(tback[k]) === JSON.stringify(tile[k]), `tile ${k} preserved`)

// Old freeform designs convert with nothing lost.
const ff = { ...createDefaultFreeformDesign(5, 8, 'solid-ivory'), name: 'Old freeform', shapes: [{ id: 's1', points: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }], smooth: true, swatchId: 'solid-wine', texture: 'loop' as const, carve: 'groove' as const, carveAngle: 0, pile: 'high' as const }] }
const fdoc = freeformToDoc(ff)
assert(fdoc.construction === 'tufted', 'freeform becomes tufted')
const fback = shapeLayerState(fdoc, fdoc.layers[0] as ShapeLayer)
for (const k of ['widthFt', 'heightFt', 'ground', 'shapes', 'backgroundId', 'rugCategory'] as const)
  assert(JSON.stringify(fback[k]) === JSON.stringify(ff[k]), `freeform ${k} preserved`)

// Drafts: run-length encoding round-trips, and stays small for charts.
{
  const draft = docToDraft(rug)
  const text = JSON.stringify(draft)
  const restored = draftToDoc(JSON.parse(text))
  const cells = (restored.layers[0] as ChartLayer).cells
  assert(cells.every((v, i) => v === chart.cells[i]), 'draft round-trips')
  assert(rleEncode(new Uint8Array([0, 0, 0, 5, 5, 1])) === '0*3,5*2,1', 'rle format')
  assert(rleDecode('0*3,5*2,1', 6).join() === '0,0,0,5,5,1', 'rle decode')
}

console.log(`ok: studio model (9x12 chart stores in ${Math.round(json.length / 1024)} KB)`)

// The old editors hosted on studio layers: edits land on the layer and the rug, no-ops stay no-ops.
{
  const { throughShapes, throughTiles } = await import('./convert')
  const { newRug } = await import('./model')
  const tufted = newRug({ construction: 'tufted', widthFt: 5, heightFt: 8, palette: [{ swatchId: 'wool-ivory', fibre: 'silk' }] })
  const layerId = tufted.layers[0].id
  assert(throughShapes(tufted, layerId, (s) => s) === tufted, 'a no-op edit changes nothing')
  const shape = { id: 'x1', points: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }], smooth: true, swatchId: 'wool-coral', texture: 'cut', carve: 'none', carveAngle: 0, pile: 'standard' } as never
  const edited = throughShapes(tufted, layerId, (s) => ({ ...s, shapes: [shape], myStyles: [...s.myStyles, 'wool-coral'], widthFt: 6 }))
  const l = edited.layers[0]
  assert(l.kind === 'shapes' && l.shapes.length === 1 && edited.widthFt === 6, 'shape and size written back')
  assert(edited.palette.length === 2 && edited.palette[0].fibre === 'silk', 'palette follows the styles, fibres kept')
  const tiles = newRug({ construction: 'tiles', widthFt: 6, heightFt: 9, palette: [{ swatchId: 'solid-navy', fibre: 'wool' }] })
  const tiled = throughTiles(tiles, tiles.layers[0].id, (s) => ({ ...s, widthTiles: 5, tiles: { '0,0': [{ swatchId: 'solid-navy', cutType: 'full', rotation: 0 }] } }))
  assert(tiled.widthFt === 7.5 && tiled.layers[0].kind === 'tiles' && Object.keys(tiled.layers[0].tiles).length === 1, 'tiles and size written back')
}

