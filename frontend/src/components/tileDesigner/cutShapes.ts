import type { CutType, Rotation, Slot, TileCell } from '../../types/tileDesign'

/**
 * Path data for the fixed-orientation cuts, in a local 0..1 unit square (before rotation).
 * Rotation (0/90/180/270) is applied separately around the cell's own center, so the same
 * base shape can point at any edge/corner of the tile.
 */
const CUT_PATHS: Record<string, string> = {
  full: 'M0,0 L1,0 L1,1 L0,1 Z',
  diagonal: 'M0,0 L1,0 L0,1 Z',
  arc: 'M0,0 L1,0 A1,1 0 0 1 0,1 Z',
  'arc-remnant': 'M1,0 L1,1 L0,1 A1,1 0 0 0 1,0 Z',
}

/**
 * Cuts that subdivide a tile into a grid/strip of equal pieces (quad = 2x2, half/third/quarter =
 * strips, ninth/sixteenth = 3x3/4x4). These are placed by exact sub-cell position - "slot" -
 * rather than by rotation, so e.g. a "1/3" piece can land in the left, middle, *or* right
 * third, not just wherever a 90-degree turn happens to put it.
 *
 * The strip cuts (half, third, quarter) additionally use `rotation` for the one thing rotation can
 * still mean for a strip: which way it runs. 0/180 keeps the strip horizontal; 90/270 turns it
 * vertical (and transposes the slot grid to match). The square subdivisions (quad, ninth,
 * sixteenth) are rotationally symmetric, so rotation is ignored for those.
 */
const ROTATABLE_STRIP_TYPES: CutType[] = ['half', 'third', 'quarter']

export function slotGrid(cutType: CutType, rotation: Rotation = 0): { cols: number; rows: number } {
  const base = (() => {
    switch (cutType) {
      case 'quad':
        return { cols: 2, rows: 2 }
      case 'half':
        return { cols: 2, rows: 1 }
      case 'third':
        return { cols: 3, rows: 1 }
      case 'quarter':
        return { cols: 4, rows: 1 }
      case 'ninth':
        return { cols: 3, rows: 3 }
      case 'sixteenth':
        return { cols: 4, rows: 4 }
      default:
        return { cols: 1, rows: 1 }
    }
  })()
  if (ROTATABLE_STRIP_TYPES.includes(cutType) && (rotation === 90 || rotation === 270)) {
    return { cols: base.rows, rows: base.cols }
  }
  return base
}

export function isPositionable(cutType: CutType): boolean {
  const { cols, rows } = slotGrid(cutType)
  return cols > 1 || rows > 1
}

/** Does this cut type's own rotation change its shape/orientation (as opposed to being fully
 * absorbed into slot positioning, or applying a visual spin around the tile center)? */
export function isRotatableStrip(cutType: CutType): boolean {
  return ROTATABLE_STRIP_TYPES.includes(cutType)
}

function clampSlot(cutType: CutType, slot: Slot | undefined, rotation: Rotation): Slot {
  const { cols, rows } = slotGrid(cutType, rotation)
  if (!slot) return { x: 0, y: 0 }
  return {
    x: Math.min(Math.max(slot.x, 0), cols - 1),
    y: Math.min(Math.max(slot.y, 0), rows - 1),
  }
}

/** Which slot does a fractional position within the cell (0..1 each axis) fall into? */
export function slotAt(cutType: CutType, fracX: number, fracY: number, rotation: Rotation = 0): Slot | undefined {
  const { cols, rows } = slotGrid(cutType, rotation)
  if (cols === 1 && rows === 1) return undefined
  const x = Math.min(cols - 1, Math.max(0, Math.floor(fracX * cols)))
  const y = Math.min(rows - 1, Math.max(0, Math.floor(fracY * rows)))
  return { x, y }
}

function slotRect(cutType: CutType, slot: Slot | undefined, rotation: Rotation = 0) {
  const { cols, rows } = slotGrid(cutType, rotation)
  const { x, y } = clampSlot(cutType, slot, rotation)
  const w = 1 / cols
  const h = 1 / rows
  return { x0: x * w, y0: y * h, x1: (x + 1) * w, y1: (y + 1) * h }
}

export function cutPath(cutType: CutType, slot?: Slot, rotation: Rotation = 0): string {
  if (isPositionable(cutType)) {
    const r = slotRect(cutType, slot, rotation)
    return `M${r.x0},${r.y0} L${r.x1},${r.y0} L${r.x1},${r.y1} L${r.x0},${r.y1} Z`
  }
  return CUT_PATHS[cutType] ?? CUT_PATHS.full
}

/** Is point (x,y), in the base (rotation 0) 0..1 unit square, inside this fixed-orientation cut? */
function pointInBaseCut(cutType: CutType, x: number, y: number): boolean {
  switch (cutType) {
    case 'full':
      return true
    case 'diagonal':
      return x + y <= 1
    case 'arc':
      return x * x + y * y <= 1
    case 'arc-remnant':
      return x * x + y * y > 1
    default:
      return true
  }
}

/** Is point (x,y) inside this piece's occupied area (accounting for slot or rotation)? */
function pointInCut(piece: Pick<TileCell, 'cutType' | 'rotation' | 'slot'>, x: number, y: number): boolean {
  if (isPositionable(piece.cutType)) {
    const r = slotRect(piece.cutType, piece.slot, piece.rotation)
    return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1
  }
  const rad = (-piece.rotation * Math.PI) / 180
  const dx = x - 0.5
  const dy = y - 0.5
  const rx = dx * Math.cos(rad) - dy * Math.sin(rad) + 0.5
  const ry = dx * Math.sin(rad) + dy * Math.cos(rad) + 0.5
  return pointInBaseCut(piece.cutType, rx, ry)
}

/** Which piece (if any) sits under point (x,y), in a cell's own 0..1 unit square? Since pieces
 * in a cell never overlap, at most one can match; searches topmost (last-placed) first. */
export function findPieceIndexAt(pieces: TileCell[], x: number, y: number): number {
  for (let i = pieces.length - 1; i >= 0; i--) {
    if (pointInCut(pieces[i], x, y)) return i
  }
  return -1
}

const OVERLAP_SAMPLE_RESOLUTION = 12

/** Do these two cut pieces (each with its own shape + rotation/slot) share any area within the cell? */
export function cutsOverlap(
  a: Pick<TileCell, 'cutType' | 'rotation' | 'slot'>,
  b: Pick<TileCell, 'cutType' | 'rotation' | 'slot'>,
): boolean {
  if (a.cutType === 'full' || b.cutType === 'full') return true
  if (isPositionable(a.cutType) && isPositionable(b.cutType)) {
    const ra = slotRect(a.cutType, a.slot, a.rotation)
    const rb = slotRect(b.cutType, b.slot, b.rotation)
    return ra.x0 < rb.x1 && ra.x1 > rb.x0 && ra.y0 < rb.y1 && ra.y1 > rb.y0
  }
  const n = OVERLAP_SAMPLE_RESOLUTION
  // Unequal off-center offsets keep samples off shared edges (both diagonals), which both
  // complementary triangles count as "inside" - centered samples made that pair un-placeable.
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = (i + 0.37) / n
      const y = (j + 0.61) / n
      if (pointInCut(a, x, y) && pointInCut(b, x, y)) return true
    }
  }
  return false
}

/**
 * Would placing `piece` into a cell already holding `existing` pieces actually change anything?
 * A `full` piece only succeeds against an empty cell or a lone existing `full` piece (a plain
 * recolor) - it must never silently swallow cut pieces already there. Any other piece succeeds
 * only if it overlaps none of the existing pieces. Shared by the paint reducer and the hover
 * ghost so the preview never shows "valid" for a placement that would actually be rejected.
 */
export function canPlacePiece(
  existing: TileCell[],
  piece: Pick<TileCell, 'cutType' | 'rotation' | 'slot'>,
): boolean {
  if (piece.cutType === 'full') {
    return existing.length === 0 || (existing.length === 1 && existing[0].cutType === 'full')
  }
  return !existing.some((other) => cutsOverlap(piece, other))
}

export type { Rotation }
