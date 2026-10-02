import type { BackgroundId, CutType, DesignOverlay, Orientation, Rotation, RugCategory, Slot, TileCell, TileDesignState } from '../types/tileDesign'
import { MAX_TILES_PER_SIDE, tileKey } from '../types/tileDesign'
import { canPlacePiece, isPositionable, slotGrid } from '../components/tileDesigner/cutShapes'

export type TileDesignAction =
  | {
      type: 'PAINT_RANGE'
      r0: number
      c0: number
      r1: number
      c1: number
      swatchId: string
      cutType: CutType
      rotation: Rotation
      slot?: Slot
    }
  | { type: 'SET_ORIENTATION'; orientation: Orientation }
  | { type: 'ROTATE_GRID' }
  | { type: 'SET_BACKGROUND'; backgroundId: BackgroundId }
  | { type: 'RENAME'; name: string }
  | { type: 'ADD_STYLES'; swatchIds: string[] }
  | { type: 'REMOVE_STYLE'; swatchId: string }
  | { type: 'RESIZE'; widthTiles: number; heightTiles: number; rugCategory?: RugCategory }
  | { type: 'SET_RUG_CATEGORY'; rugCategory: RugCategory }
  | { type: 'INSERT_ROW_TOP' }
  | { type: 'REMOVE_ROW_TOP' }
  | { type: 'INSERT_COL_LEFT' }
  | { type: 'REMOVE_COL_LEFT' }
  | { type: 'REPLACE_PIECE'; row: number; col: number; index: number; piece: TileCell }
  | { type: 'DELETE_PIECE'; row: number; col: number; index: number }
  | { type: 'PLACE_OVERLAY'; overlay: DesignOverlay }
  | { type: 'FRAME_BORDER'; assetId: string; thickness: 0.5 | 1; idPrefix: string }
  | { type: 'REPLACE_OVERLAY_ASSET'; id: string; assetId: string }
  | { type: 'REMOVE_OVERLAY'; id: string }

export type Footprint = Pick<DesignOverlay, 'row' | 'col' | 'widthTiles' | 'heightTiles'>

function footprintsOverlap(a: Footprint, b: Footprint): boolean {
  return a.col < b.col + b.widthTiles && b.col < a.col + a.widthTiles && a.row < b.row + b.heightTiles && b.row < a.row + a.heightTiles
}

/** An overlay needs something beneath it: in bounds, and every cell it covers holds a tile. */
export function canPlaceOverlay(state: TileDesignState, fp: Footprint): boolean {
  if (fp.row < 0 || fp.col < 0 || fp.row + fp.heightTiles > state.heightTiles || fp.col + fp.widthTiles > state.widthTiles) {
    return false
  }
  for (let r = fp.row; r < fp.row + fp.heightTiles; r++) {
    for (let c = fp.col; c < fp.col + fp.widthTiles; c++) {
      if (!state.tiles[tileKey(r, c)]?.length) return false
    }
  }
  return true
}

/** Overlays a new one at `fp` would replace (overlays never stack). */
export function overlaysUnder(state: TileDesignState, fp: Footprint): DesignOverlay[] {
  return state.overlays.filter((o) => footprintsOverlap(o, fp))
}

/** The four runs of a border around the rug's edge, each strip's outer edge facing outward.
 * Top and bottom span the full width; the sides fill in between them. */
export function frameRuns(state: TileDesignState, assetId: string, thickness: 0.5 | 1, idPrefix: string): DesignOverlay[] {
  const { widthTiles: W, heightTiles: H } = state
  const runs: DesignOverlay[] = [{ id: `${idPrefix}-t`, assetId, thickness, row: 0, col: 0, widthTiles: W, heightTiles: 1, rotation: 0 }]
  if (H > 1) runs.push({ id: `${idPrefix}-b`, assetId, thickness, row: H - 1, col: 0, widthTiles: W, heightTiles: 1, rotation: 180 })
  if (H > 2) {
    const reach = 1 - thickness
    runs.push({ id: `${idPrefix}-l`, assetId, thickness, reach, row: 1, col: 0, widthTiles: 1, heightTiles: H - 2, rotation: 270 })
    if (W > 1) runs.push({ id: `${idPrefix}-r`, assetId, thickness, reach, row: 1, col: W - 1, widthTiles: 1, heightTiles: H - 2, rotation: 90 })
  }
  return runs
}

function withOverlay(state: TileDesignState, overlay: DesignOverlay): TileDesignState {
  if (!canPlaceOverlay(state, overlay)) return state
  return { ...state, overlays: [...state.overlays.filter((o) => !footprintsOverlap(o, overlay)), overlay] }
}

function shiftOverlays(overlays: DesignOverlay[], dr: number, dc: number): DesignOverlay[] {
  return overlays.map((o) => ({ ...o, row: o.row + dr, col: o.col + dc }))
}

/** Drops overlays that lost their footing (resized off the rug, or a tile under them was
 * deleted). Returns the same object when nothing changed, so no-op actions stay no-ops. */
function pruneOverlays(state: TileDesignState): TileDesignState {
  const kept = state.overlays.filter((o) => canPlaceOverlay(state, o))
  return kept.length === state.overlays.length ? state : { ...state, overlays: kept }
}

/**
 * Adds `piece` to a cell's existing pieces, unless it overlaps one of them (in which case
 * the cell is returned unchanged - "if they overlap, just don't put it in there"). This
 * applies to a `full` piece too: it can only fill an empty cell or recolor an existing lone
 * `full` piece - it must never silently swallow cut pieces already placed there. Replacing or
 * clearing occupied cells is only done through the explicit select + Replace/Delete flow.
 */
function placePiece(existing: TileCell[] | undefined, piece: TileCell): TileCell[] {
  const current = existing ?? []
  if (!canPlacePiece(current, piece)) return current
  if (piece.cutType === 'full') return [piece]
  return [...current, piece]
}

function rotateRight90(rotation: Rotation): Rotation {
  return (((rotation + 90) % 360) as Rotation)
}

/** Turn one piece 90 deg clockwise with its cell. Slot-based pieces also move to the slot the
 * turn carries them to - point (x, y) in a cell lands at (1 - y, x). */
function rotatePieceRight90(p: TileCell): TileCell {
  const rotation = rotateRight90(p.rotation)
  if (!isPositionable(p.cutType)) return { ...p, rotation }
  const { rows } = slotGrid(p.cutType, p.rotation)
  const slot = p.slot ?? { x: 0, y: 0 }
  return { ...p, rotation, slot: { x: rows - 1 - slot.y, y: slot.x } }
}

export function tileDesignReducer(state: TileDesignState, action: TileDesignAction): TileDesignState {
  return pruneOverlays(reduce(state, action))
}

function reduce(state: TileDesignState, action: TileDesignAction): TileDesignState {
  switch (action.type) {
    case 'PLACE_OVERLAY':
      return withOverlay(state, action.overlay)

    case 'FRAME_BORDER': {
      // All or nothing: a frame with a gap would look like a mistake, not a choice.
      const runs = frameRuns(state, action.assetId, action.thickness, action.idPrefix)
      if (!runs.every((run) => canPlaceOverlay(state, run))) return state
      return runs.reduce(withOverlay, state)
    }

    case 'REPLACE_OVERLAY_ASSET': {
      if (!state.overlays.some((o) => o.id === action.id)) return state
      return { ...state, overlays: state.overlays.map((o) => (o.id === action.id ? { ...o, assetId: action.assetId } : o)) }
    }

    case 'REMOVE_OVERLAY': {
      const overlays = state.overlays.filter((o) => o.id !== action.id)
      return overlays.length === state.overlays.length ? state : { ...state, overlays }
    }

    case 'PAINT_RANGE': {
      const tiles = { ...state.tiles }
      const rMin = Math.min(action.r0, action.r1)
      const rMax = Math.max(action.r0, action.r1)
      const cMin = Math.min(action.c0, action.c1)
      const cMax = Math.max(action.c0, action.c1)
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          const key = tileKey(r, c)
          tiles[key] = placePiece(tiles[key], {
            swatchId: action.swatchId,
            cutType: action.cutType,
            rotation: action.rotation,
            slot: action.slot,
          })
        }
      }
      return { ...state, tiles }
    }

    case 'REPLACE_PIECE': {
      const key = tileKey(action.row, action.col)
      const current = state.tiles[key]
      if (!current || !current[action.index]) return state
      // A full tile covers the whole cell, so replacing one piece with a full tile clears
      // any sibling pieces too, rather than leaving them drawn underneath it.
      const next = action.piece.cutType === 'full' ? [action.piece] : current.map((p, i) => (i === action.index ? action.piece : p))
      return { ...state, tiles: { ...state.tiles, [key]: next } }
    }

    case 'DELETE_PIECE': {
      const key = tileKey(action.row, action.col)
      const current = state.tiles[key]
      if (!current || !current[action.index]) return state
      const next = current.filter((_, i) => i !== action.index)
      const tiles = { ...state.tiles }
      if (next.length === 0) delete tiles[key]
      else tiles[key] = next
      return { ...state, tiles }
    }

    case 'SET_ORIENTATION':
      return { ...state, orientation: action.orientation }

    case 'ROTATE_GRID': {
      // Rotate the whole assembled design 90 deg clockwise: swap dimensions, remap every
      // piece's cell, and spin each piece's own rotation to match so shapes stay coherent
      // (e.g. a left-half border piece becomes a top-half piece after the turn).
      const { widthTiles: W, heightTiles: H } = state
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const [row, col] = key.split('-').map(Number)
        const newRow = col
        const newCol = H - 1 - row
        tiles[tileKey(newRow, newCol)] = pieces.map(rotatePieceRight90)
      }
      // A footprint's top-left lands at (col, H - row - height), and its sides swap.
      const overlays = state.overlays.map((o) => ({
        ...o,
        row: o.col,
        col: H - o.row - o.heightTiles,
        widthTiles: o.heightTiles,
        heightTiles: o.widthTiles,
        rotation: rotateRight90(o.rotation),
      }))
      return { ...state, widthTiles: H, heightTiles: W, tiles, overlays }
    }

    case 'SET_BACKGROUND':
      return { ...state, backgroundId: action.backgroundId }

    case 'SET_RUG_CATEGORY':
      return { ...state, rugCategory: action.rugCategory }

    case 'RENAME':
      return { ...state, name: action.name }

    case 'ADD_STYLES': {
      const existing = new Set(state.myStyles)
      const additions = action.swatchIds.filter((id) => !existing.has(id))
      return { ...state, myStyles: [...state.myStyles, ...additions] }
    }

    case 'REMOVE_STYLE': {
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const remaining = pieces.filter((p) => p.swatchId !== action.swatchId)
        if (remaining.length > 0) tiles[key] = remaining
      }
      return {
        ...state,
        myStyles: state.myStyles.filter((id) => id !== action.swatchId),
        tiles,
      }
    }

    case 'RESIZE': {
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const [row, col] = key.split('-').map(Number)
        if (row < action.heightTiles && col < action.widthTiles) tiles[key] = pieces
      }
      return {
        ...state,
        widthTiles: action.widthTiles,
        heightTiles: action.heightTiles,
        rugCategory: action.rugCategory ?? state.rugCategory,
        tiles,
      }
    }

    case 'INSERT_ROW_TOP': {
      if (state.heightTiles >= MAX_TILES_PER_SIDE) return state
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const [row, col] = key.split('-').map(Number)
        tiles[tileKey(row + 1, col)] = pieces
      }
      return { ...state, heightTiles: state.heightTiles + 1, tiles, overlays: shiftOverlays(state.overlays, 1, 0) }
    }

    case 'REMOVE_ROW_TOP': {
      if (state.heightTiles <= 1) return state
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const [row, col] = key.split('-').map(Number)
        if (row === 0) continue
        tiles[tileKey(row - 1, col)] = pieces
      }
      return { ...state, heightTiles: state.heightTiles - 1, tiles, overlays: shiftOverlays(state.overlays, -1, 0) }
    }

    case 'INSERT_COL_LEFT': {
      if (state.widthTiles >= MAX_TILES_PER_SIDE) return state
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const [row, col] = key.split('-').map(Number)
        tiles[tileKey(row, col + 1)] = pieces
      }
      return { ...state, widthTiles: state.widthTiles + 1, tiles, overlays: shiftOverlays(state.overlays, 0, 1) }
    }

    case 'REMOVE_COL_LEFT': {
      if (state.widthTiles <= 1) return state
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const [row, col] = key.split('-').map(Number)
        if (col === 0) continue
        tiles[tileKey(row, col - 1)] = pieces
      }
      return { ...state, widthTiles: state.widthTiles - 1, tiles, overlays: shiftOverlays(state.overlays, 0, -1) }
    }

    default:
      return state
  }
}
