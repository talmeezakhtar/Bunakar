import type { FreeformShape, PileTexture, SurfaceFinish } from '../types/freeform'
import type { BackgroundId, DesignOverlay, Orientation, RugCategory, TileCell } from '../types/tileDesign'

/**
 * The Bunakar Studio rug document: one model for every kind of rug.
 *
 * A rug has a construction (how it's made), a shape and size, a density (knots or stitches per
 * inch), one palette of yarns, a layout scaffold, and a stack of layers drawn bottom to top:
 * - chart:  a naksha, one cell per knot, each a palette index (0 = empty)
 * - shapes: vector shapes with pile finishes (tufted and hooked rugs; the old freeform designer)
 * - motifs: catalogue motifs placed in feet
 * - tiles:  an 18-inch tile grid with cuts and overlays (modular tile rugs; the old tile designer)
 *
 * Sizes are in feet; chart cells come from size x density. Pure data, no DOM.
 */

export type Construction = 'knotted' | 'flatweave' | 'tufted' | 'hooked' | 'braided' | 'needlepoint' | 'tiles'
export type KnotTechnique = 'symmetric' | 'asymmetric'
export type FlatweaveTechnique = 'kilim' | 'soumak' | 'dhurrie'
export type RugShapeKind = 'rect' | 'round' | 'oval' | 'octagon' | 'free'

export interface RugShape {
  kind: RugShapeKind
  /** Free outlines only: points in feet from the top-left corner. */
  outline?: { x: number; y: number }[]
}

/** Knots (or stitches, or cells) per inch, across the rug and down it. */
export interface Density {
  across: number
  down: number
}

import type { Fibre } from '../data/materials'
export type { Fibre }

/** One yarn in the rug's palette: a catalogue swatch, its fibre and (for pile rugs) its pile. */
export interface Yarn {
  swatchId: string
  fibre: Fibre
  pile?: PileTexture
}

export type CornerStyle = 'mitred' | 'block' | 'flowing'

/** A band of the border, outermost first; widths in inches. */
export interface BorderBand {
  role: 'outer-guard' | 'main' | 'inner-guard'
  widthIn: number
  /** Palette index (1-based) of the band's ground. */
  ground: number
  /** A catalogue border motif run along the band, if any. */
  motifId?: string
}

export type FieldPattern = 'stripes' | 'chevron' | 'diamonds' | 'ikat'

export interface LayoutSpec {
  borders: BorderBand[]
  corners: CornerStyle
  /** Palette index of the field's ground. */
  field: number
  medallion?: { shape: 'oval' | 'lozenge' | 'star' | 'round'; widthPct: number; heightPct: number; ground: number; pendants: boolean; motifId?: string }
  spandrels?: { ground: number; motifId?: string }
  /** A prayer niche: the field below a pointed arch; `archPct` is how far down the arch springs. */
  niche?: { ground: number; archPct: number; spandrel: number; motifId?: string }
  compartments?: { cols: number; rows: number; lineWidthIn: number; ground: number; line: number; motifId?: string }
  /**
   * A woven geometric field: stripes (dhurrie), chevrons (kilim), concentric diamonds (kilim,
   * Navajo eye-dazzler) or ikat diamonds with feathered edges. `colors` cycle band by band.
   */
  pattern?: { kind: FieldPattern; sizeIn: number; bands: number; colors: number[] }
  /** All-over repeat of a motif across the field. */
  repeat?: { motifId: string; everyIn: number; drop: 'straight' | 'half-drop' | 'brick'; color?: number }
}

interface LayerBase {
  id: string
  name: string
  visible: boolean
}

export interface ChartLayer extends LayerBase {
  kind: 'chart'
  /** 'layout': generated from the rug's layout settings, rewritten when they change. */
  role?: 'layout'
  cols: number
  rows: number
  /** Row-major, top row first; 0 = empty, n = palette[n - 1]. */
  cells: Uint8Array
}

export interface ShapeLayer extends LayerBase {
  kind: 'shapes'
  /** A full-rug ground under the shapes (the freeform designer's ground), or none. */
  ground: SurfaceFinish | null
  shapes: FreeformShape[]
}

export interface MotifPlacement {
  id: string
  motifId: string
  /** Feet from the rug's top-left corner, and size in feet. */
  x: number
  y: number
  w: number
  h: number
  rotation: 0 | 90 | 180 | 270
  /** A swatch id to lead the motif's colours; unset = match the rug. */
  tint?: string
}

export interface MotifLayer extends LayerBase {
  kind: 'motifs'
  motifs: MotifPlacement[]
}

export interface TileLayer extends LayerBase {
  kind: 'tiles'
  widthTiles: number
  heightTiles: number
  orientation: Orientation
  tiles: Record<string, TileCell[]>
  overlays: DesignOverlay[]
}

export type Layer = ChartLayer | ShapeLayer | MotifLayer | TileLayer

export interface Finish {
  /** Dye variation in bands down the rug, 0 (none) to 1 (strong). */
  abrash: number
  /** Antique wash: faded, worn look, 0 to 1. */
  wash: number
  edges: 'fringe' | 'binding' | 'kilim-end'
  /** Carve the pile lower along every colour outline (hand-carved, embossed look). */
  carve?: boolean
}

/**
 * A braided rug: a braid coiled from the edge inward. Each band is one round of braid, three
 * strands (palette indexes); the bands repeat inward. `braidIn` is the braid's width.
 */
export interface BraidSpec {
  braidIn: number
  bands: [number, number, number][]
}

export interface RugDoc {
  v: 1
  id: string | null
  name: string
  construction: Construction
  knot?: KnotTechnique
  flatweave?: FlatweaveTechnique
  shape: RugShape
  widthFt: number
  heightFt: number
  density: Density
  palette: Yarn[]
  layout: LayoutSpec | null
  braid?: BraidSpec
  layers: Layer[]
  finish: Finish
  /** Which room-photo category it previews in, and the floor under it in 2D. */
  rugCategory: RugCategory
  backgroundId: BackgroundId
}

/** Densities offered per construction (per inch, across x down), most common first. */
export const DENSITY_PRESETS: Record<Construction, { label: string; density: Density }[]> = {
  knotted: [
    { label: '100 knots / sq in (Bhadohi standard)', density: { across: 10, down: 10 } },
    { label: '64 knots / sq in (village weave)', density: { across: 8, down: 8 } },
    { label: '144 knots / sq in (fine)', density: { across: 12, down: 12 } },
    { label: '225 knots / sq in (very fine, silk)', density: { across: 15, down: 15 } },
    { label: '40 knots / sq in (coarse, Gabbeh)', density: { across: 5, down: 8 } },
  ],
  flatweave: [
    { label: '8 weft rows per inch (kilim)', density: { across: 4, down: 8 } },
    { label: '12 weft rows per inch (fine kilim)', density: { across: 6, down: 12 } },
  ],
  needlepoint: [{ label: '10 stitches per inch', density: { across: 10, down: 10 } }],
  tufted: [{ label: 'Drawn freehand', density: { across: 4, down: 4 } }],
  hooked: [{ label: 'Drawn freehand', density: { across: 4, down: 4 } }],
  braided: [{ label: 'Braid bands', density: { across: 6, down: 6 } }],
  tiles: [{ label: '18-inch tiles', density: { across: 4, down: 4 } }],
}

export const CONSTRUCTIONS: { id: Construction; name: string; hint: string }[] = [
  { id: 'knotted', name: 'Hand-knotted', hint: 'Persian, Turkish, Tibetan: drawn knot by knot on a chart' },
  { id: 'flatweave', name: 'Flatweave', hint: 'Kilim, soumak, dhurrie: no pile, woven in weft rows' },
  { id: 'tufted', name: 'Hand-tufted', hint: 'Shot with a tufting gun: freehand shapes, cut or loop pile, carving' },
  { id: 'hooked', name: 'Hand-hooked', hint: 'Looped pile pulled through a backing, freehand' },
  { id: 'braided', name: 'Braided', hint: 'Braided bands coiled into rounds and ovals' },
  { id: 'needlepoint', name: 'Needlepoint', hint: 'Fine stitches on canvas: Aubusson and Bessarabian styles' },
  { id: 'tiles', name: 'Tile rug', hint: 'Modular 18-inch tiles in ten cuts' },
]

/** Chart size in cells for a rug's size and density. */
export function chartSize(widthFt: number, heightFt: number, density: Density) {
  return { cols: Math.max(1, Math.round(widthFt * 12 * density.across)), rows: Math.max(1, Math.round(heightFt * 12 * density.down)) }
}

let nextId = 1
export const newId = (prefix = 'l') => `${prefix}${Date.now().toString(36)}${(nextId++).toString(36)}`

export function emptyChart(widthFt: number, heightFt: number, density: Density, fill = 0, name = 'Chart'): ChartLayer {
  const { cols, rows } = chartSize(widthFt, heightFt, density)
  return { kind: 'chart', id: newId(), name, visible: true, cols, rows, cells: new Uint8Array(cols * rows).fill(fill) }
}

export function defaultFinish(construction: Construction): Finish {
  return { abrash: 0, wash: 0, edges: construction === 'flatweave' ? 'kilim-end' : construction === 'tufted' || construction === 'hooked' || construction === 'braided' ? 'binding' : 'fringe' }
}

/** A new rug of a construction, shape and size, with one chart (or the construction's own layer). */
export function newRug(opts: { construction: Construction; shape?: RugShape; widthFt: number; heightFt: number; density?: Density; palette: Yarn[]; name?: string; rugCategory?: RugCategory }): RugDoc {
  const density = opts.density ?? DENSITY_PRESETS[opts.construction][0].density
  const layers: Layer[] =
    opts.construction === 'tufted' || opts.construction === 'hooked'
      ? [{ kind: 'shapes', id: newId(), name: 'Shapes', visible: true, ground: opts.palette[0] ? { swatchId: opts.palette[0].swatchId, texture: opts.construction === 'hooked' ? 'loop' : 'cut', carve: 'none', carveAngle: 0, pile: 'standard' } : null, shapes: [] }]
      : opts.construction === 'tiles'
        ? [{ kind: 'tiles', id: newId(), name: 'Tiles', visible: true, widthTiles: Math.max(1, Math.round(opts.widthFt / 1.5)), heightTiles: Math.max(1, Math.round(opts.heightFt / 1.5)), orientation: 'normal', tiles: {}, overlays: [] }]
        : [emptyChart(opts.widthFt, opts.heightFt, density, opts.palette.length ? 1 : 0)]
  return {
    v: 1,
    id: null,
    name: opts.name ?? 'Untitled rug',
    construction: opts.construction,
    ...(opts.construction === 'knotted' ? { knot: 'symmetric' as const } : {}),
    ...(opts.construction === 'flatweave' ? { flatweave: 'kilim' as const } : {}),
    shape: opts.shape ?? { kind: 'rect' },
    widthFt: opts.widthFt,
    heightFt: opts.heightFt,
    density,
    palette: opts.palette,
    layout: null,
    layers,
    finish: defaultFinish(opts.construction),
    rugCategory: opts.rugCategory ?? (opts.widthFt * 2.5 <= opts.heightFt || opts.heightFt * 2.5 <= opts.widthFt ? 'runner' : 'area'),
    backgroundId: 'light-wood',
  }
}

/** Swatch ids the rug uses, for the content hash and the yarn list. */
export function usedSwatches(doc: RugDoc): Set<string> {
  const ids = new Set<string>()
  for (const layer of doc.layers) {
    if (!layer.visible) continue
    if (layer.kind === 'chart') {
      const seen = new Uint8Array(256)
      for (let i = 0; i < layer.cells.length; i++) seen[layer.cells[i]] = 1
      for (let k = 1; k < 256; k++) if (seen[k] && doc.palette[k - 1]) ids.add(doc.palette[k - 1].swatchId)
    } else if (layer.kind === 'shapes') {
      if (layer.ground) ids.add(layer.ground.swatchId)
      for (const s of layer.shapes) ids.add(s.swatchId)
    } else if (layer.kind === 'tiles') {
      for (const pieces of Object.values(layer.tiles)) for (const p of pieces) ids.add(p.swatchId)
    }
  }
  return ids
}
