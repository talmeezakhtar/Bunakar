import type { BackgroundId, CutType, Orientation, Rotation, RugCategory, Slot, TileCell, TileDesignState } from '../types/tileDesign'
import { tileKey } from '../types/tileDesign'
import { canPlacePiece } from '../components/tileDesigner/cutShapes'

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

export function tileDesignReducer(state: TileDesignState, action: TileDesignAction): TileDesignState {
  switch (action.type) {
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
        tiles[tileKey(newRow, newCol)] = pieces.map((p) => ({ ...p, rotation: rotateRight90(p.rotation) }))
      }
      return { ...state, widthTiles: H, heightTiles: W, tiles }
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
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const [row, col] = key.split('-').map(Number)
        tiles[tileKey(row + 1, col)] = pieces
      }
      return { ...state, heightTiles: state.heightTiles + 1, tiles }
    }

    case 'REMOVE_ROW_TOP': {
      if (state.heightTiles <= 1) return state
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const [row, col] = key.split('-').map(Number)
        if (row === 0) continue
        tiles[tileKey(row - 1, col)] = pieces
      }
      return { ...state, heightTiles: state.heightTiles - 1, tiles }
    }

    case 'INSERT_COL_LEFT': {
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const [row, col] = key.split('-').map(Number)
        tiles[tileKey(row, col + 1)] = pieces
      }
      return { ...state, widthTiles: state.widthTiles + 1, tiles }
    }

    case 'REMOVE_COL_LEFT': {
      if (state.widthTiles <= 1) return state
      const tiles: TileDesignState['tiles'] = {}
      for (const [key, pieces] of Object.entries(state.tiles)) {
        const [row, col] = key.split('-').map(Number)
        if (col === 0) continue
        tiles[tileKey(row, col - 1)] = pieces
      }
      return { ...state, widthTiles: state.widthTiles - 1, tiles }
    }

    default:
      return state
  }
}
