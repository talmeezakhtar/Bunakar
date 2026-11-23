import type { TileDesignState } from '../types/tileDesign'

export interface TileSummary {
  /** Grid cells with anything painted in them. */
  tiles: number
  /** Distinct wool colours used on the tiles. */
  colours: number
  /** Medallions, motifs and borders laid over the grid. */
  motifs: number
}

/** What a tile design is made of, for the designer's summary bar and exports. */
export function summarizeTileDesign(state: TileDesignState): TileSummary {
  const cells = Object.values(state.tiles).filter((pieces) => pieces.length > 0)
  const colours = new Set(cells.flatMap((pieces) => pieces.map((p) => p.swatchId)))
  return { tiles: cells.length, colours: colours.size, motifs: state.overlays.length }
}
