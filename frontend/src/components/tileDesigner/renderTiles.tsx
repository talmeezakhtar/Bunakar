import type { ReactNode } from 'react'
import type { Swatch } from '../../types/swatch'
import type { TileDesignState } from '../../types/tileDesign'
import { tileKey } from '../../types/tileDesign'
import { cutPath, isPositionable } from './cutShapes'

/**
 * Renders just the painted cut pieces of a tile design as `<g>` fills in the design's own
 * 0..widthTiles x 0..heightTiles unit-square coordinate space - no grid lines, marks, or
 * interaction. Shared by the interactive grid and the read-only room-scene rug so both stay
 * geometrically identical.
 */
export function renderTileFills(state: TileDesignState, swatchesById: Map<string, Swatch>): ReactNode[] {
  const { widthTiles: W, heightTiles: H, tiles } = state
  const fills: ReactNode[] = []
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const pieces = tiles[tileKey(row, col)]
      if (!pieces) continue
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i]
        const swatch = swatchesById.get(piece.swatchId)
        if (!swatch) continue
        // Rotation is meaningless for slot-based pieces except the strip cuts (third/quarter),
        // which bake it directly into the path's own orientation - never spin those visually.
        const pieceRotation = isPositionable(piece.cutType) ? 0 : piece.rotation
        fills.push(
          <g key={`fill-${row}-${col}-${i}`} transform={`translate(${col} ${row})`}>
            <g transform={`rotate(${pieceRotation} 0.5 0.5)`}>
              <path d={cutPath(piece.cutType, piece.slot, piece.rotation)} fill={swatch.swatchColor} />
            </g>
          </g>,
        )
      }
    }
  }
  return fills
}
