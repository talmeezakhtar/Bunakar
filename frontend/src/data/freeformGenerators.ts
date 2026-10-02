import type { Swatch } from '../types/swatch'
import type { Carving, FreeformDesignState, FreeformShape, PileHeight, PileTexture, Point, SurfaceFinish } from '../types/freeform'
import { chaikin, densify, insetConvex, relaxedSites, rng, scaleRotate, voronoiCells, warpField } from '../utils/freeformGeometry'
import { TRACED_SHAPES } from './shapeLibraryTraced'

/**
 * Generators lay out a whole freeform rug from a seed - the quick way to the looks people ask
 * for (cobblestone, mosaic, colour field, splash). Every shape they make stays editable.
 * Colours are palette roles resolved against whatever swatch catalog loaded.
 */

type SwatchRef = readonly [familyId: string, colorName: string]
const wool = (name: string): SwatchRef => ['tufted-wool', name]

export interface FreeformPalette {
  id: string
  name: string
  ground: SwatchRef
  colors: SwatchRef[]
}

export const FREEFORM_PALETTES: FreeformPalette[] = [
  { id: 'desert-sand', name: 'Desert Sand', ground: wool('Ivory'), colors: [wool('Sand'), wool('Camel'), wool('Oat')] },
  { id: 'gallery', name: 'Gallery Mono', ground: wool('Ivory'), colors: [wool('Charcoal'), wool('Stone'), wool('Oat')] },
  { id: 'petrol-stone', name: 'Petrol Stone', ground: wool('Oat'), colors: [wool('Charcoal'), wool('Petrol'), wool('Stone'), wool('Ivory'), wool('Graphite')] },
  { id: 'riviera', name: 'Riviera', ground: wool('Blush'), colors: [wool('Aqua'), wool('Blush'), wool('Coral'), wool('Mustard')] },
  { id: 'sage-garden', name: 'Sage Garden', ground: wool('Ivory'), colors: [wool('Sage'), wool('Terracotta'), wool('Oat'), wool('Mustard')] },
]

export type GeneratorId = 'cobblestone' | 'mosaic' | 'colorfield' | 'splash' | 'blank'

export interface GeneratorParams {
  seed: number
  /** 0..1 - how many shapes. */
  density: number
  /** Channel between shapes, in feet (cobblestone / mosaic). */
  gap: number
  /** 0..1 - share of cells carved with ribs (mosaic). */
  ribbed: number
}

/** A finish with its colour given as a palette role (-1 = the palette's ground colour). */
interface FinishSpec {
  color: number
  texture: PileTexture
  carve: Carving
  carveAngle?: number
  pile: PileHeight
}
interface ShapeSpec extends FinishSpec {
  points: Point[]
  smooth: boolean
}
interface Layout {
  ground: FinishSpec
  shapes: ShapeSpec[]
}

export interface FreeformGenerator {
  id: GeneratorId
  name: string
  description: string
  paletteId: string
  /** Which sliders make sense for this look. */
  controls: { density: boolean; gap: boolean; ribbed: boolean }
  defaults: Omit<GeneratorParams, 'seed'>
  build: (W: number, H: number, p: GeneratorParams) => Layout
}

function cellCount(W: number, H: number, perSqFt: number): number {
  return Math.max(3, Math.min(160, Math.round(W * H * perSqFt)))
}

/** A splat: a round core with a few long arms ending in soft bulbs (rug-2 style). */
export function splatPoints(cx: number, cy: number, R: number, rand: () => number): Point[] {
  // Short, fat, uneven arms around a lumpy core - spilled paint rather than a star.
  const arms = Array.from({ length: 5 + Math.floor(rand() * 5) }, () => ({
    a: rand() * Math.PI * 2,
    len: 0.2 + rand() * 0.55,
    w: 0.18 + rand() * 0.22,
  }))
  const lumps = [rand() * 6, rand() * 6, rand() * 6]
  const pts: Point[] = []
  const N = 56
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2
    let r = 0.75 + 0.1 * Math.sin(t * 2 + lumps[0]) + 0.07 * Math.sin(t * 5 + lumps[1]) + 0.05 * Math.sin(t * 9 + lumps[2])
    for (const arm of arms) {
      let d = Math.abs(t - arm.a)
      d = Math.min(d, Math.PI * 2 - d)
      r += arm.len * Math.exp(-((d / arm.w) ** 2))
    }
    pts.push({ x: cx + Math.cos(t) * r * R * 0.55, y: cy + Math.sin(t) * r * R * 0.55 })
  }
  return pts
}

function ellipse(cx: number, cy: number, rx: number, ry: number, n = 14, wobble = 0, rand = Math.random): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2
    const k = 1 + (rand() - 0.5) * wobble
    return { x: cx + Math.cos(t) * rx * k, y: cy + Math.sin(t) * ry * k }
  })
}

export const FREEFORM_GENERATORS: FreeformGenerator[] = [
  {
    id: 'cobblestone',
    name: 'Cobblestone',
    description: 'Rounded stones in high pile, set in a low loop channel',
    paletteId: 'desert-sand',
    controls: { density: true, gap: true, ribbed: false },
    defaults: { density: 0.45, gap: 0.16, ribbed: 0 },
    build(W, H, p) {
      const rand = rng(p.seed)
      // Scattered, lightly relaxed sites: stones of mixed sizes with no grid showing through.
      const cells = voronoiCells(relaxedSites(cellCount(W, H, 0.2 + p.density * 0.6), W, H, rand, 1, true), W, H)
      const shapes: ShapeSpec[] = []
      for (const cell of cells) {
        const inset = insetConvex(cell, p.gap / 2 + 0.02)
        if (inset.length < 3) continue
        shapes.push({ points: chaikin(inset, 1), smooth: true, color: rand() < 0.9 ? 0 : 1, texture: 'cut', carve: 'none', pile: 'high' })
      }
      return { ground: { color: -1, texture: 'loop', carve: 'none', pile: 'low' }, shapes }
    },
  },
  {
    id: 'mosaic',
    name: 'Mosaic',
    description: 'Straight-edged panels with carved seams and ribbed accents',
    paletteId: 'petrol-stone',
    controls: { density: true, gap: true, ribbed: true },
    defaults: { density: 0.35, gap: 0.08, ribbed: 0.22 },
    build(W, H, p) {
      const rand = rng(p.seed)
      const cells = voronoiCells(relaxedSites(cellCount(W, H, 0.2 + p.density * 0.5), W, H, rand, 1), W, H)
      const shapes: ShapeSpec[] = []
      for (const cell of cells) {
        const inset = insetConvex(cell, p.gap / 2)
        if (inset.length < 3) continue
        const ribbed = rand() < p.ribbed
        shapes.push({
          points: inset,
          smooth: false,
          color: Math.floor(rand() * 5),
          texture: 'cut',
          carve: ribbed ? 'ribbed' : 'groove',
          carveAngle: [0, 45, 90, 135][Math.floor(rand() * 4)],
          pile: ribbed ? 'standard' : rand() < 0.5 ? 'high' : 'standard',
        })
      }
      return { ground: { color: -1, texture: 'cut', carve: 'none', pile: 'low' }, shapes }
    },
  },
  {
    id: 'colorfield',
    name: 'Color Field',
    description: 'A few large flowing shapes that meet in soft curves',
    paletteId: 'riviera',
    controls: { density: true, gap: false, ribbed: false },
    defaults: { density: 0.3, gap: 0, ribbed: 0 },
    build(W, H, p) {
      const rand = rng(p.seed)
      const count = 4 + Math.round(p.density * 5)
      const cells = voronoiCells(relaxedSites(count, W, H, rand, 1), W, H)
      // One shared warp bends every boundary into a flowing curve; neighbours stay flush.
      // Strong enough to flow, gentle enough that no boundary folds back over itself.
      const warp = warpField(W, H, p.seed + 101, Math.min(W, H) * 0.19)
      const shapes: ShapeSpec[] = []
      cells.forEach((cell, i) => {
        if (cell.length < 3) return
        // Smooth curves through the warped edge points - flowing boundaries; the ground (also a
        // palette colour) fills the soft junctions where three shapes meet.
        shapes.push({ points: densify(cell, 0.45).map(warp), smooth: true, color: i % 4, texture: 'cut', carve: 'groove', pile: 'standard' })
      })
      // A rounded accent or two across the joins, like the coral forms in the reference.
      const accents = Math.round(p.density * 2)
      for (let i = 0; i < accents; i++) {
        const r = Math.min(W, H) * (0.1 + rand() * 0.06)
        shapes.push({
          points: ellipse(r + rand() * (W - 2 * r), r + rand() * (H - 2 * r), r, r * (1.1 + rand() * 0.4), 12, 0.15, rand),
          smooth: true,
          color: (i + 2) % 4,
          texture: 'cut',
          carve: 'groove',
          pile: 'high',
        })
      }
      return { ground: { color: -1, texture: 'cut', carve: 'none', pile: 'standard' }, shapes }
    },
  },
  {
    id: 'splash',
    name: 'Splash',
    description: 'Splats of high pile over a carved contour ground',
    paletteId: 'gallery',
    controls: { density: true, gap: false, ribbed: false },
    defaults: { density: 0.35, gap: 0, ribbed: 0 },
    build(W, H, p) {
      const rand = rng(p.seed)
      const count = 2 + Math.round(p.density * 3)
      const shapes: ShapeSpec[] = []
      for (let i = 0; i < count; i++) {
        // Spread down the rug's long diagonal, with some drift.
        const t = (i + 0.5) / count
        const cx = W * (0.25 + 0.5 * t + (rand() - 0.5) * 0.25)
        const cy = H * (0.12 + 0.76 * t + (rand() - 0.5) * 0.1)
        const R = Math.min(W, H) * (0.22 + rand() * 0.1)
        shapes.push({ points: splatPoints(cx, cy, R, rand), smooth: true, color: i % 3, texture: 'cut', carve: 'none', pile: 'high' })
      }
      return { ground: { color: -1, texture: 'cut', carve: 'contour', pile: 'low' }, shapes }
    },
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Just the ground - draw or stamp your own shapes',
    paletteId: 'desert-sand',
    controls: { density: false, gap: false, ribbed: false },
    defaults: { density: 0, gap: 0, ribbed: 0 },
    build: () => ({ ground: { color: -1, texture: 'cut', carve: 'none', pile: 'standard' }, shapes: [] }),
  },
]

export function findGenerator(id: string | undefined) {
  return FREEFORM_GENERATORS.find((g) => g.id === id)
}

export function findPalette(id: string | undefined) {
  return FREEFORM_PALETTES.find((p) => p.id === id)
}

function resolve(catalog: Swatch[], [familyId, colorName]: SwatchRef): string {
  return catalog.find((s) => s.familyId === familyId && s.colorName === colorName)?.id ?? catalog[0]?.id ?? ''
}

let idCounter = 0
export function newShapeId(): string {
  idCounter = (idCounter + 1) % 1e6
  return `s${Date.now().toString(36)}${idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
}

/** Lay a generator's output onto `base`, replacing its ground and shapes. */
export function applyGenerator(
  base: FreeformDesignState,
  generator: FreeformGenerator,
  palette: FreeformPalette,
  params: GeneratorParams,
  catalog: Swatch[],
): FreeformDesignState {
  const layout = generator.build(base.widthFt, base.heightFt, params)
  const groundId = resolve(catalog, palette.ground)
  const colorIds = palette.colors.map((ref) => resolve(catalog, ref))
  const finish = (f: FinishSpec): SurfaceFinish => ({
    swatchId: f.color < 0 ? groundId : colorIds[f.color % colorIds.length],
    texture: f.texture,
    carve: f.carve,
    carveAngle: f.carveAngle ?? 45,
    pile: f.pile,
  })
  const shapes: FreeformShape[] = layout.shapes.map((s) => ({ id: newShapeId(), points: s.points, smooth: s.smooth, ...finish(s) }))
  const used = [finish(layout.ground).swatchId, ...shapes.map((s) => s.swatchId)]
  const myStyles = [...new Set([...base.myStyles, ...[groundId, ...colorIds].filter((id) => used.includes(id))])].filter(Boolean)
  return { ...base, ground: finish(layout.ground), shapes, myStyles }
}

/** The stamp library: traced organic shapes plus a few simple primitives, in a unit box. */
export const SHAPE_LIBRARY: { id: string; name: string; points: Point[] }[] = [
  { id: 'circle', name: 'Circle', points: ellipse(0.5, 0.5, 0.5, 0.5, 12) },
  { id: 'oval', name: 'Oval', points: ellipse(0.5, 0.5, 0.5, 0.32, 12) },
  { id: 'splat', name: 'Splat', points: normalise(splatPoints(0, 0, 1, rng(7))) },
  ...TRACED_SHAPES.map((s) => ({ id: s.id, name: s.name, points: s.points.map(([x, y]) => ({ x, y })) })),
]

function normalise(points: Point[]): Point[] {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const s = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1
  return points.map((p) => ({ x: (p.x - minX) / s, y: (p.y - minY) / s }))
}

/** A library shape placed centred on `at`, `size` feet across its longer side. */
export function stampPoints(libraryId: string, at: Point, size: number, rotation = 0): Point[] {
  const entry = SHAPE_LIBRARY.find((s) => s.id === libraryId) ?? SHAPE_LIBRARY[0]
  const placed = entry.points.map((p) => ({ x: at.x + (p.x - 0.5) * size, y: at.y + (p.y - 0.5) * size }))
  return rotation ? scaleRotate(placed, 1, rotation) : placed
}
