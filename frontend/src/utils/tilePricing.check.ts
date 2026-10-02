// Self-check for the tile rug estimate: `npx tsx src/utils/tilePricing.check.ts`.
import { createDefaultTileDesign } from '../types/tileDesign'
import { RATE_PER_DESIGN_TILE, RATE_PER_TILE, estimateTileRug } from './tilePricing'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

const empty = createDefaultTileDesign(4, 4)
assert(estimateTileRug(empty).total === 0, 'empty rug costs nothing')

const piece = { swatchId: 's', cutType: 'half' as const, rotation: 0 as const }
const laid = {
  ...empty,
  // Two halves in one cell still use one tile; an empty array is not a tile.
  tiles: { '0-0': [piece, { ...piece, slot: { x: 1, y: 0 } }], '0-1': [{ ...piece, cutType: 'full' as const }], '1-1': [] },
  overlays: [
    { id: 'm', assetId: 'm', row: 0, col: 0, widthTiles: 2, heightTiles: 1, rotation: 0 as const },
    { id: 'b', assetId: 'b', row: 0, col: 0, widthTiles: 4, heightTiles: 1, rotation: 0 as const, thickness: 0.5 as const },
  ],
}
const est = estimateTileRug(laid)
assert(est.tiles === 2, `tiles: ${est.tiles}`)
assert(est.designTiles === 4, `design tiles: ${est.designTiles}`)
assert(est.total === 2 * RATE_PER_TILE + 4 * RATE_PER_DESIGN_TILE, 'total')

console.log('ok: tile pricing')
