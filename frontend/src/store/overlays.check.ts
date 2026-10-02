// Self-check for design-piece / border rules: `npx tsx src/store/overlays.check.ts`.
import { createDefaultTileDesign, tileKey } from '../types/tileDesign'
import type { DesignOverlay, TileDesignState } from '../types/tileDesign'
import { tileDesignReducer as reduce } from './tileDesignReducer'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

const piece = (id: string, row: number, col: number, w = 2, h = 2): DesignOverlay => ({
  id, assetId: 'm', row, col, widthTiles: w, heightTiles: h, rotation: 0,
})

const empty = createDefaultTileDesign(4, 5)
const paint = (s: TileDesignState) => reduce(s, { type: 'PAINT_RANGE', r0: 0, c0: 0, r1: s.heightTiles - 1, c1: s.widthTiles - 1, swatchId: 'x', cutType: 'full', rotation: 0 })

// Nothing beneath -> refused.
assert(reduce(empty, { type: 'PLACE_OVERLAY', overlay: piece('a', 0, 0) }).overlays.length === 0, 'needs tiles beneath')

const s = paint(empty)
let t = reduce(s, { type: 'PLACE_OVERLAY', overlay: piece('a', 0, 0) })
assert(t.overlays.length === 1, 'placed on tiles')
assert(reduce(s, { type: 'PLACE_OVERLAY', overlay: piece('z', 4, 3) }).overlays.length === 0, 'off the rug refused')

// Overlays never stack: an overlapping one replaces, a disjoint one adds.
t = reduce(t, { type: 'PLACE_OVERLAY', overlay: piece('b', 1, 1) })
assert(t.overlays.map((o) => o.id).join() === 'b', 'overlap replaces')
t = reduce(t, { type: 'PLACE_OVERLAY', overlay: piece('c', 3, 0, 1, 1) })
assert(t.overlays.length === 2, 'disjoint adds')

// Deleting a tile under an overlay removes the overlay (nothing beneath any more).
const u = reduce(t, { type: 'DELETE_PIECE', row: 2, col: 2, index: 0 })
assert(u.overlays.map((o) => o.id).join() === 'c', 'lost footing -> removed')

// No-op actions keep identity (dirty tracking compares states by reference).
assert(reduce(t, { type: 'REMOVE_OVERLAY', id: 'nope' }) === t, 'no-op keeps identity')

// Rotate: a 2x1 piece at (0,0) on a 4-wide x 5-tall rug lands at (0, 5-0-1=4) as 1x2.
const r = reduce(reduce(s, { type: 'PLACE_OVERLAY', overlay: piece('p', 0, 0, 2, 1) }), { type: 'ROTATE_GRID' })
const p = r.overlays[0]
assert(p && p.row === 0 && p.col === 4 && p.widthTiles === 1 && p.heightTiles === 2 && p.rotation === 90, `rotate ${JSON.stringify(p)}`)

// Inserting a row keeps the overlay over the same tiles.
const ins = reduce(t, { type: 'INSERT_ROW_TOP' })
assert(ins.overlays.find((o) => o.id === 'b')?.row === 2, 'insert row shifts overlay')

// Frame: all four sides, facing outward; refused if any edge cell is bare.
const f = reduce(s, { type: 'FRAME_BORDER', assetId: 'b1', thickness: 0.5, idPrefix: 'f' })
assert(f.overlays.map((o) => `${o.id}:${o.rotation}`).join() === 'f-t:0,f-b:180,f-l:270,f-r:90', 'frame runs')
const holed = { ...s, tiles: { ...s.tiles } }
delete holed.tiles[tileKey(4, 2)]
assert(reduce(holed, { type: 'FRAME_BORDER', assetId: 'b1', thickness: 1, idPrefix: 'f' }) === holed, 'frame needs full edge')

// Replacing a design keeps its spot.
const rep = reduce(t, { type: 'REPLACE_OVERLAY_ASSET', id: 'b', assetId: 'm2' })
assert(rep.overlays.find((o) => o.id === 'b')?.assetId === 'm2', 'replace asset')

console.log('ok: overlay rules')
