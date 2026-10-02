import type { TileDesignState } from '../types/tileDesign'

// ponytail: indicative rates, one place to set real ones from the workshop's price list.
/** One 18" hand-tufted tile. A cell holding only cut pieces still uses up a whole tile. */
export const RATE_PER_TILE = 850
/** Medallion / border handwork, per tile of rug it covers. */
export const RATE_PER_DESIGN_TILE = 450

export interface TileEstimate {
  tiles: number
  designTiles: number
  total: number
}

export function estimateTileRug(state: TileDesignState): TileEstimate {
  const tiles = Object.values(state.tiles).filter((pieces) => pieces.length > 0).length
  // A border strip only covers its thickness of the footprint it runs along.
  const designTiles = state.overlays.reduce((n, o) => n + o.widthTiles * o.heightTiles * (o.thickness ?? 1), 0)
  return { tiles, designTiles, total: Math.round(tiles * RATE_PER_TILE + designTiles * RATE_PER_DESIGN_TILE) }
}

export const formatINR = (n: number) =>
  n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
