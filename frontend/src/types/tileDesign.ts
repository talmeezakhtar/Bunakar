export type Orientation = 'normal' | 'diagonal'

export type RugCategory = 'area' | 'runner' | 'wall'

/** Best-guess rug type from proportions alone - used only as a one-time default (at creation,
 * or when loading an older saved design that predates the explicit `rugCategory` field). Once
 * set, a design's `rugCategory` is never re-derived from its dimensions again, so resizing a
 * runner doesn't silently turn it into an area rug. */
export function classifyRugCategory(widthTiles: number, heightTiles: number): RugCategory {
  const long = Math.max(widthTiles, heightTiles)
  const short = Math.min(widthTiles, heightTiles)
  const ratio = long / short
  const area = widthTiles * heightTiles
  if (ratio >= 2.2) return 'runner'
  if (area >= 100) return 'wall'
  return 'area'
}

export type BackgroundId = 'light-wood' | 'dark-wood' | 'concrete' | 'none'

export const BACKGROUNDS: { id: BackgroundId; label: string }[] = [
  { id: 'light-wood', label: 'Light Wood' },
  { id: 'dark-wood', label: 'Dark Wood' },
  { id: 'concrete', label: 'Concrete' },
  { id: 'none', label: 'None' },
]

/** Feet per tile edge. FLOR-style modular tiles run roughly 18"-24" square; we use 1.5ft (18"). */
export const TILE_SIZE_FT = 1.5

export type CutType =
  | 'full'
  | 'half'
  | 'quad'
  | 'third'
  | 'quarter'
  | 'ninth'
  | 'sixteenth'
  | 'diagonal'
  | 'arc'
  | 'arc-remnant'

export type Rotation = 0 | 90 | 180 | 270

export const CUT_TYPES: { id: CutType; label: string }[] = [
  { id: 'full', label: 'Standard Tile' },
  { id: 'half', label: 'Half' },
  { id: 'quad', label: 'Quad' },
  { id: 'third', label: '1/3' },
  { id: 'quarter', label: '1/4' },
  { id: 'ninth', label: '1/9' },
  { id: 'sixteenth', label: '1/16' },
  { id: 'diagonal', label: 'Diagonal' },
  { id: 'arc', label: 'Arc' },
  { id: 'arc-remnant', label: 'Arc Remnant' },
]

/** Sub-cell grid index for cuts that divide a tile into a grid/strip (quad, third, quarter,
 * ninth, sixteenth) - which slot of that grid the piece occupies. Unused (and omitted) for
 * fixed-orientation cuts (full, half, diagonal, arc, arc-remnant), which use `rotation` instead. */
export interface Slot {
  x: number
  y: number
}

export interface TileCell {
  swatchId: string
  cutType: CutType
  rotation: Rotation
  slot?: Slot
}

export interface TileDesignState {
  id: string | null
  name: string
  widthTiles: number
  heightTiles: number
  orientation: Orientation
  backgroundId: BackgroundId
  /** Which of the staged room-photo categories this design previews in - set once at creation
   * (or on explicit change via the dimensions editor), never re-derived from size changes. */
  rugCategory: RugCategory
  /**
   * Sparse map, key `${row}-${col}` -> the pieces placed in that cell. Multiple
   * non-overlapping cut pieces (e.g. two "half" tiles) can share one cell; a "full"
   * piece always occupies the array alone. Absent key = unpainted.
   */
  tiles: Record<string, TileCell[]>
  /** swatch ids added to this design's palette, in the order they were added */
  myStyles: string[]
}

export function tileKey(row: number, col: number): string {
  return `${row}-${col}`
}

export function createDefaultTileDesign(widthTiles = 4, heightTiles = 5): TileDesignState {
  return {
    id: null,
    name: 'Untitled Design',
    widthTiles,
    heightTiles,
    orientation: 'normal',
    backgroundId: 'light-wood',
    rugCategory: classifyRugCategory(widthTiles, heightTiles),
    tiles: {},
    myStyles: [],
  }
}

export function feetToTiles(ft: number): number {
  return Math.max(1, Math.round(ft / TILE_SIZE_FT))
}

export function tilesToFeet(tiles: number): number {
  return tiles * TILE_SIZE_FT
}

export function formatFeetInches(ft: number): string {
  const totalInches = Math.round(ft * 12)
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return inches === 0 ? `${feet}'` : `${feet}'${inches}"`
}

export function formatRugSize(widthTiles: number, heightTiles: number): string {
  return `${formatFeetInches(tilesToFeet(widthTiles))} x ${formatFeetInches(tilesToFeet(heightTiles))}`
}

export const SIZE_PRESETS: { label: string; widthTiles: number; heightTiles: number }[] = [
  { label: "5' x 7'", widthTiles: feetToTiles(5), heightTiles: feetToTiles(7) },
  { label: "8' x 10'", widthTiles: feetToTiles(8), heightTiles: feetToTiles(10) },
  { label: "10' x 12'", widthTiles: feetToTiles(10), heightTiles: feetToTiles(12) },
]

/** Serialized shape used for persistence (API + localStorage). */
export interface TileDesignRecord {
  id: string
  name: string
  widthTiles: number
  heightTiles: number
  orientation: Orientation
  backgroundId: BackgroundId
  /** Optional for backward compatibility with designs saved before this field existed. */
  rugCategory?: RugCategory
  tiles: { row: number; col: number; swatchId: string; cutType: CutType; rotation: Rotation; slot?: Slot }[]
  myStyles: string[]
  updatedAt?: string
}

export function stateToRecord(state: TileDesignState): Omit<TileDesignRecord, 'id' | 'updatedAt'> {
  return {
    name: state.name,
    widthTiles: state.widthTiles,
    heightTiles: state.heightTiles,
    orientation: state.orientation,
    backgroundId: state.backgroundId,
    rugCategory: state.rugCategory,
    tiles: Object.entries(state.tiles).flatMap(([key, pieces]) => {
      const [row, col] = key.split('-').map(Number)
      return pieces.map((piece) => ({ row, col, ...piece }))
    }),
    myStyles: state.myStyles,
  }
}

export function recordToState(record: TileDesignRecord): TileDesignState {
  const tiles: Record<string, TileCell[]> = {}
  for (const t of record.tiles) {
    const key = tileKey(t.row, t.col)
    const piece: TileCell = { swatchId: t.swatchId, cutType: t.cutType, rotation: t.rotation, slot: t.slot }
    ;(tiles[key] ??= []).push(piece)
  }
  return {
    id: record.id,
    name: record.name,
    widthTiles: record.widthTiles,
    heightTiles: record.heightTiles,
    orientation: record.orientation,
    backgroundId: record.backgroundId,
    rugCategory: record.rugCategory ?? classifyRugCategory(record.widthTiles, record.heightTiles),
    tiles,
    myStyles: record.myStyles,
  }
}
