import type { Swatch } from '../types/swatch'
import type { CutType, Rotation, Slot, TileCell, TileDesignState } from '../types/tileDesign'
import { tileKey } from '../types/tileDesign'

/**
 * Pattern templates: parametric layouts that fill a rug of any tile size with real cut pieces,
 * so everything they place stays editable in the designer. Colors are "roles" (0 = ground,
 * 1 = primary figure, 2 = secondary, 3 = accent) that a colorway maps onto catalog swatches.
 */

type Role = 0 | 1 | 2 | 3
type Piece = { role: Role; cut: CutType; rotation?: Rotation; slot?: Slot }
type Build = (widthTiles: number, heightTiles: number) => Record<string, Piece[]>

export type TemplateCategory = 'Heritage' | 'Quilt' | 'Modern' | 'Woven Classics'

export interface PatternTemplate {
  id: string
  name: string
  category: TemplateCategory
  /** One line on the tradition the layout comes from. */
  origin: string
  colorwayId: string
  build: Build
}

/** Swatches are referenced by family + color name, since catalog ids are database-generated. */
type SwatchRef = readonly [familyId: string, colorName: string]

const NAVY: SwatchRef = ['solid', 'Navy']
const GOLD: SwatchRef = ['solid', 'Gold']
const IVORY: SwatchRef = ['solid', 'Ivory']
const WINE: SwatchRef = ['solid', 'Wine']
const FOREST: SwatchRef = ['solid', 'Forest']
const EMERALD: SwatchRef = ['geometric-bloom', 'Emerald']
const CLAY: SwatchRef = ['geometric-bloom', 'Clay']
const SLATE: SwatchRef = ['geometric-bloom', 'Slate']
const RUST: SwatchRef = ['tribal-weave', 'Clay & Gold']
const CHARCOAL: SwatchRef = ['tribal-weave', 'Charcoal']

export interface Colorway {
  id: string
  name: string
  roles: readonly [SwatchRef, SwatchRef, SwatchRef, SwatchRef]
}

export const COLORWAYS: Colorway[] = [
  { id: 'midnight-gold', name: 'Midnight Gold', roles: [NAVY, GOLD, IVORY, SLATE] },
  { id: 'kilim-red', name: 'Kilim Red', roles: [WINE, GOLD, NAVY, IVORY] },
  { id: 'atlas-clay', name: 'Atlas Clay', roles: [IVORY, RUST, CLAY, CHARCOAL] },
  { id: 'oasis', name: 'Oasis', roles: [FOREST, EMERALD, IVORY, GOLD] },
  { id: 'berber-ivory', name: 'Berber Ivory', roles: [IVORY, CHARCOAL, SLATE, CLAY] },
]

// ---- geometry helpers ------------------------------------------------------------------

const mod = (a: number, n: number) => ((a % n) + n) % n

export function hashAt(seed: number, index: number) {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const turn = (rot: number) => mod(rot, 360) as Rotation

/** Two half-square triangles: `a` fills the corner `rot` points at (0 TL, 90 TR, 180 BR, 270 BL). */
function tri(a: Role, b: Role, rot: number): Piece[] {
  if (a === b) return [{ role: a, cut: 'full' }]
  return [
    { role: a, cut: 'diagonal', rotation: turn(rot) },
    { role: b, cut: 'diagonal', rotation: turn(rot + 180) },
  ]
}

/** Quarter disc `a` centered on corner `rot` (0 TL, 90 TR, 180 BR, 270 BL), remainder `b`. */
function arc(a: Role, b: Role, rot: number): Piece[] {
  if (a === b) return [{ role: a, cut: 'full' }]
  return [
    { role: a, cut: 'arc', rotation: turn(rot) },
    { role: b, cut: 'arc-remnant', rotation: turn(rot) },
  ]
}

const STRIP: Record<number, CutType> = { 2: 'half', 3: 'third', 4: 'quarter' }
const GRID: Record<number, CutType> = { 2: 'quad', 3: 'ninth', 4: 'sixteenth' }

/** Encode one tile's k x k pixel block with the fewest pieces: full, strips, quads, then fine grid. */
export function encodeBlock(b: Role[][], k: number): Piece[] {
  const flat = b.flat()
  if (flat.every((v) => v === flat[0])) return [{ role: flat[0], cut: 'full' }]
  if (b.every((row) => row.every((v) => v === row[0]))) {
    return b.map((row, y): Piece => ({ role: row[0], cut: STRIP[k], rotation: 90, slot: { x: 0, y } }))
  }
  if (b[0].every((v, x) => b.every((row) => row[x] === v))) {
    return b[0].map((v, x): Piece => ({ role: v, cut: STRIP[k], rotation: 0, slot: { x, y: 0 } }))
  }
  if (k === 4 && flat.every((v, i) => v === b[2 * Math.floor(i / 8)][2 * Math.floor((i % 4) / 2)])) {
    return [0, 1, 2, 3].map((i): Piece => ({ role: b[2 * (i >> 1)][2 * (i & 1)], cut: 'quad', slot: { x: i & 1, y: i >> 1 } }))
  }
  return flat.map((v, i): Piece => ({ role: v, cut: GRID[k], slot: { x: i % k, y: Math.floor(i / k) } }))
}

/** Template drawn per tile with triangles/arcs. */
function cells(fn: (r: number, c: number, W: number, H: number) => Piece[]): Build {
  return (W, H) => {
    const out: Record<string, Piece[]> = {}
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) out[tileKey(r, c)] = fn(r, c, W, H)
    return out
  }
}

/** Template drawn as pixels at `k` per tile edge (k = 4 -> 4.5" pixels on an 18" tile). */
function pixels(k: 2 | 3 | 4, fn: (x: number, y: number, Wp: number, Hp: number) => Role): Build {
  return (W, H) => {
    const Wp = W * k
    const Hp = H * k
    const out: Record<string, Piece[]> = {}
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const block = Array.from({ length: k }, (_, y) => Array.from({ length: k }, (_, x) => fn(c * k + x, r * k + y, Wp, Hp)))
        out[tileKey(r, c)] = encodeBlock(block, k)
      }
    }
    return out
  }
}

/** Plain 2/2 twill: shows the warp color where the warp floats, the weft color elsewhere. */
function twill(x: number, y: number, warp: Role, weft: Role, dir = 1): Role {
  return mod(x + dir * y, 4) < 2 ? warp : weft
}

// ---- templates -------------------------------------------------------------------------

export const PATTERN_TEMPLATES: PatternTemplate[] = [
  // Heritage
  {
    id: 'beni-ourain-lattice',
    name: 'Beni Ourain Lattice',
    category: 'Heritage',
    origin: 'Moroccan Middle Atlas: dark diamond lines on undyed wool',
    colorwayId: 'berber-ivory',
    build: pixels(4, (x, y) => {
      if (mod(x + y, 8) === 0 || mod(x - y, 8) === 0) return 1
      if (mod(x + y, 8) === 4 && mod(x - y, 8) === 4) return 3
      return 0
    }),
  },
  {
    id: 'kilim-stepped-diamond',
    name: 'Kilim Stepped Diamond',
    category: 'Heritage',
    origin: 'Anatolian kilim: stepped diamonds in a half-drop repeat',
    colorwayId: 'kilim-red',
    build: pixels(4, (x, y) => {
      const shift = mod(Math.floor(y / 8), 2) * 4
      const d = Math.abs(mod(x + shift, 8) - 3.5) + Math.abs(mod(y, 8) - 3.5)
      return d <= 2 ? 3 : d <= 4 ? 2 : d <= 5 ? 1 : 0
    }),
  },
  {
    id: 'kilim-chevron',
    name: 'Kilim Chevron',
    category: 'Heritage',
    origin: 'Flatweave zigzag bands, as in Turkish and Persian kilims',
    colorwayId: 'kilim-red',
    build: cells((r, c) => {
      const band = (i: number) => ([1, 0, 2, 0, 3, 0] as Role[])[mod(i, 6)]
      return tri(band(r), band(r + 1), c % 2 ? 90 : 0)
    }),
  },
  {
    id: 'eye-dazzler',
    name: 'Eye Dazzler',
    category: 'Heritage',
    origin: 'Navajo Germantown "eye dazzler" weavings of the 1880s',
    colorwayId: 'kilim-red',
    build: pixels(4, (x, y, Wp, Hp) => {
      const d = Math.abs(x - (Wp - 1) / 2) + Math.abs(y - (Hp - 1) / 2)
      return ([1, 0, 2, 3] as Role[])[Math.floor(d / 2) % 4]
    }),
  },
  {
    id: 'persian-medallion',
    name: 'Medallion & Corners',
    category: 'Heritage',
    origin: 'Safavid Persian layout: central medallion, corner spandrels, guard border',
    colorwayId: 'midnight-gold',
    build: pixels(4, (x, y, Wp, Hp) => {
      const border = Math.min(3, Math.floor(Math.min(Wp, Hp) / 8))
      const edge = Math.min(x, y, Wp - 1 - x, Hp - 1 - y)
      if (edge < border) return edge === border - 1 && border > 1 ? 2 : 1
      const dx = Math.abs(x - (Wp - 1) / 2) / (Wp / 2)
      const dy = Math.abs(y - (Hp - 1) / 2) / (Hp / 2)
      if (dx + dy <= 0.22) return 3
      if (dx + dy <= 0.4) return 2
      if (dx + dy <= 0.6) return 1
      if (dx + dy >= 1.45) return 1
      return 0
    }),
  },
  {
    id: 'ikat-diamond',
    name: 'Ikat Diamond',
    category: 'Heritage',
    origin: 'Central Asian ikat: resist-dyed diamonds with feathered edges',
    colorwayId: 'oasis',
    build: pixels(4, (x, y) => {
      const jitter = Math.floor(hashAt(y, 7) * 3) - 1
      const d = Math.abs(mod(x, 8) - 3.5 + jitter) + Math.abs(mod(y, 8) - 3.5)
      return d <= 2 ? 2 : d <= 4 ? 1 : 0
    }),
  },
  {
    id: 'dhurrie-stripe',
    name: 'Dhurrie Stripe',
    category: 'Heritage',
    origin: 'Indian cotton dhurrie: banded flatweave stripes',
    colorwayId: 'atlas-clay',
    build: pixels(4, (_x, y) => ([0, 0, 0, 0, 1, 1, 0, 3, 0, 2, 2, 0] as Role[])[y % 12]),
  },

  // Quilt
  {
    id: 'flying-geese',
    name: 'Flying Geese',
    category: 'Quilt',
    origin: 'American patchwork: triangle "geese" against a sky',
    colorwayId: 'atlas-clay',
    build: cells((r, c) => {
      const goose = ([1, 2, 3] as Role[])[r % 3]
      return c % 2 ? tri(0, goose, 90) : tri(0, goose, 0)
    }),
  },
  {
    id: 'pinwheel',
    name: 'Pinwheel',
    category: 'Quilt',
    origin: 'Four half-square triangles spinning around a center',
    colorwayId: 'midnight-gold',
    build: cells((r, c) => {
      const blade: Role = (Math.floor(r / 2) + Math.floor(c / 2)) % 2 ? 2 : 1
      const q = (r % 2) * 2 + (c % 2)
      return tri(blade, 0, [90, 180, 0, 270][q])
    }),
  },
  {
    id: 'drunkards-path',
    name: "Drunkard's Path",
    category: 'Quilt',
    origin: 'Quarter circles set in squares, forming a meandering curve',
    colorwayId: 'oasis',
    build: cells((r, c) => ((r + c) % 2 ? arc(0, 1, 180) : arc(1, 0, 0))),
  },
  {
    id: 'housetop',
    name: 'Housetop',
    category: 'Quilt',
    origin: "Gee's Bend half-log-cabin: concentric frames",
    colorwayId: 'atlas-clay',
    build: pixels(2, (x, y, Wp, Hp) => {
      const ring = Math.min(x, y, Wp - 1 - x, Hp - 1 - y)
      return ([1, 0, 2, 0, 3, 0] as Role[])[ring % 6]
    }),
  },

  // Modern
  {
    id: 'harlequin',
    name: 'Harlequin',
    category: 'Modern',
    origin: 'Commedia dell\'arte diamonds, two tones on a ground',
    colorwayId: 'midnight-gold',
    build: cells((r, c) => {
      const inner: Role = (Math.floor(r / 2) + Math.floor(c / 2)) % 2 ? 2 : 1
      const q = (r % 2) * 2 + (c % 2)
      return tri(0, inner, [0, 90, 270, 180][q])
    }),
  },
  {
    id: 'bauhaus-circles',
    name: 'Bauhaus Circles',
    category: 'Modern',
    origin: 'Mid-century circle grid built from four quarter discs',
    colorwayId: 'oasis',
    build: cells((r, c) => {
      const disc: Role = (Math.floor(r / 2) + Math.floor(c / 2)) % 2 ? 3 : 1
      const q = (r % 2) * 2 + (c % 2)
      return arc(disc, 0, [180, 270, 90, 0][q])
    }),
  },
  {
    id: 'moorish-star',
    name: 'Moorish Star',
    category: 'Modern',
    origin: 'Concave four-point stars from Andalusian zellige tilework',
    colorwayId: 'kilim-red',
    build: cells((r, c) => arc(0, 1, [0, 90, 270, 180][(r % 2) * 2 + (c % 2)])),
  },
  {
    id: 'deco-fan',
    name: 'Deco Fan',
    category: 'Modern',
    origin: 'Art Deco fans, stacked like seigaiha waves',
    colorwayId: 'midnight-gold',
    build: cells((r, c) => {
      const seq: Role[] = [1, 2, 0]
      return arc(seq[r % 3], seq[mod(r - 1, 3)], (c + r) % 2 ? 270 : 180)
    }),
  },
  {
    id: 'checkerboard',
    name: 'Checkerboard',
    category: 'Modern',
    origin: 'Quarter-turn tile layout in two contrasting tones',
    colorwayId: 'berber-ivory',
    build: cells((r, c) => [{ role: (r + c) % 2 ? 1 : 0, cut: 'full' }]),
  },
  {
    id: 'tonal-brick',
    name: 'Tonal Brick',
    category: 'Modern',
    origin: 'Ashlar / brick-bond carpet-tile installation, mixed tones',
    colorwayId: 'atlas-clay',
    build: pixels(4, (x, y) => {
      const row = Math.floor(y / 2)
      const brick = Math.floor((x + (row % 2) * 2) / 4)
      // brick + 2 * row (mod 4) differs from all six neighbors, so every brick reads on its own.
      return mod(brick + 2 * row, 4) as Role
    }),
  },

  // Woven classics
  {
    id: 'houndstooth',
    name: 'Houndstooth',
    category: 'Woven Classics',
    origin: 'Scottish Lowlands twill, four dark / four light',
    colorwayId: 'berber-ivory',
    build: pixels(4, (x, y) => twill(x, y, mod(x, 8) < 4 ? 1 : 0, mod(y, 8) < 4 ? 1 : 0)),
  },
  {
    id: 'herringbone',
    name: 'Herringbone',
    category: 'Woven Classics',
    origin: 'Broken twill reversing direction every column',
    colorwayId: 'midnight-gold',
    build: pixels(4, (x, y) => twill(x, y, 1, 0, Math.floor(x / 4) % 2 ? -1 : 1)),
  },
  {
    id: 'tartan',
    name: 'Tartan',
    category: 'Woven Classics',
    origin: 'Highland sett woven in twill, same stripes warp and weft',
    colorwayId: 'oasis',
    build: pixels(4, (x, y) => {
      const sett: Role[] = [0, 0, 0, 0, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0, 0, 2]
      return twill(x, y, sett[x % 16], sett[y % 16])
    }),
  },
  {
    id: 'buffalo-check',
    name: 'Buffalo Check',
    category: 'Woven Classics',
    origin: 'Oversized two-color check with a blended overlap',
    colorwayId: 'kilim-red',
    build: cells((r, c) => [{ role: r % 2 && c % 2 ? 1 : r % 2 || c % 2 ? 2 : 3, cut: 'full' }]),
  },
  {
    id: 'tattersall',
    name: 'Tattersall',
    category: 'Woven Classics',
    origin: 'English country check: alternating fine overchecks',
    colorwayId: 'atlas-clay',
    build: pixels(4, (x, y) => (x % 8 === 0 || y % 8 === 0 ? 1 : x % 8 === 4 || y % 8 === 4 ? 3 : 0)),
  },
  {
    id: 'basketweave',
    name: 'Basketweave',
    category: 'Woven Classics',
    origin: 'Alternating plank directions, as in basketweave tile layouts',
    colorwayId: 'berber-ivory',
    build: pixels(4, (x, y) => {
      const vertical = (Math.floor(x / 4) + Math.floor(y / 4)) % 2
      return (vertical ? x : y) % 2 ? 2 : 0
    }),
  },
]

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['Heritage', 'Quilt', 'Modern', 'Woven Classics']

export function findTemplate(id: string | undefined) {
  return PATTERN_TEMPLATES.find((t) => t.id === id)
}

export function findColorway(id: string | undefined) {
  return COLORWAYS.find((c) => c.id === id)
}

/**
 * Fill `base` with a template in a colorway, resolved against whatever swatch catalog loaded.
 * Roles whose swatch isn't in the catalog are left unpainted rather than failing.
 */
export function applyTemplate(
  base: TileDesignState,
  template: PatternTemplate,
  colorway: Colorway,
  catalog: Swatch[],
): TileDesignState {
  const ids = colorway.roles.map(([familyId, colorName]) => catalog.find((s) => s.familyId === familyId && s.colorName === colorName)?.id)
  const built = template.build(base.widthTiles, base.heightTiles)
  const tiles: Record<string, TileCell[]> = {}
  const used = new Set<string>()
  for (const [key, pieces] of Object.entries(built)) {
    const placed = pieces.flatMap((p) => {
      const swatchId = ids[p.role]
      if (!swatchId) return []
      used.add(swatchId)
      return [{ swatchId, cutType: p.cut, rotation: p.rotation ?? 0, slot: p.slot }]
    })
    if (placed.length) tiles[key] = placed
  }
  // Palette in role order (ground first), so the designer's first brush is the ground color.
  const myStyles = [...new Set(ids)].filter((id): id is string => !!id && used.has(id))
  return { ...base, name: `${template.name} - ${colorway.name}`, tiles, myStyles }
}
