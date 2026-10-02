import type { BackgroundId, RugCategory } from './tileDesign'

/**
 * Freeform rugs: one hand-tufted piece (not modular tiles). A ground surface covers the whole rug
 * and free-form shapes are laid over it, back to front. Everything is measured in feet from the
 * rug's top-left corner, so shapes cross any imaginary grid freely.
 */

/** Generated pile surfaces that take any yarn colour; `photo` uses the style's own tile photo. */
export type PileTexture = 'cut' | 'loop' | 'shag' | 'highlow' | 'photo'
/** Relief worked into the pile: an outline groove, parallel ribs, or topographic contour lines. */
export type Carving = 'none' | 'groove' | 'ribbed' | 'contour'
export type PileHeight = 'low' | 'standard' | 'high'

export interface SurfaceFinish {
  swatchId: string
  texture: PileTexture
  carve: Carving
  /** Direction of ribbed carving, in degrees. */
  carveAngle: number
  pile: PileHeight
}

export interface Point {
  x: number
  y: number
}

export interface FreeformShape extends SurfaceFinish {
  id: string
  points: Point[]
  /** Smooth closed curve through the points (true) or straight-edged polygon (false). */
  smooth: boolean
}

export interface FreeformDesignState {
  id: string | null
  name: string
  widthFt: number
  heightFt: number
  rugCategory: RugCategory
  backgroundId: BackgroundId
  ground: SurfaceFinish
  shapes: FreeformShape[]
  /** Swatch ids in this design's palette, in the order they were added. */
  myStyles: string[]
}

export interface FreeformDesignRecord extends Omit<FreeformDesignState, 'id'> {
  id: string
  updatedAt?: string
}

export const PILE_TEXTURES: { id: PileTexture; label: string; hint: string }[] = [
  { id: 'cut', label: 'Cut Pile', hint: 'Plush, velvety' },
  { id: 'loop', label: 'Loop', hint: 'Nubbly rows of loops' },
  { id: 'shag', label: 'Shag', hint: 'Long, tousled yarn' },
  { id: 'highlow', label: 'High-Low', hint: 'Cut and loop mixed' },
  { id: 'photo', label: 'Tile Photo', hint: "The style's own photo" },
]

export const CARVINGS: { id: Carving; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'groove', label: 'Groove' },
  { id: 'ribbed', label: 'Ribbed' },
  { id: 'contour', label: 'Contour' },
]

export const PILE_HEIGHTS: { id: PileHeight; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'standard', label: 'Standard' },
  { id: 'high', label: 'High' },
]

export const FREEFORM_SIZE_LIMITS = { min: 2, max: 30 }

export function defaultFinish(swatchId: string): SurfaceFinish {
  return { swatchId, texture: 'cut', carve: 'none', carveAngle: 45, pile: 'standard' }
}

export function createDefaultFreeformDesign(widthFt = 5, heightFt = 8, groundSwatch = ''): FreeformDesignState {
  return {
    id: null,
    name: 'Untitled Freeform Rug',
    widthFt,
    heightFt,
    rugCategory: 'area',
    backgroundId: 'light-wood',
    ground: defaultFinish(groundSwatch),
    shapes: [],
    myStyles: groundSwatch ? [groundSwatch] : [],
  }
}

export function freeformStateToRecord(state: FreeformDesignState): Omit<FreeformDesignRecord, 'id' | 'updatedAt'> {
  const { id: _id, ...rest } = state
  return rest
}

export function freeformRecordToState(record: FreeformDesignRecord): FreeformDesignState {
  const { updatedAt: _updatedAt, ...rest } = record
  return { ...rest, id: record.id }
}
