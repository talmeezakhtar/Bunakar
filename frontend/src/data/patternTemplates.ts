import type { Swatch } from '../types/swatch'
import type { CutType, DesignOverlay, Rotation, Slot, TileCell, TileDesignState } from '../types/tileDesign'
import { canPlaceOverlay, footprintsOverlap, frameRuns } from '../store/tileDesignReducer'
import { tileKey } from '../types/tileDesign'

/**
 * Pattern templates: parametric layouts that fill a rug of any tile size with real cut pieces,
 * so everything they place stays editable in the designer. Colors are "roles" (0 = ground,
 * 1 = primary figure, 2 = secondary, 3 = accent) that a colorway maps onto catalog swatches.
 */

type Role = 0 | 1 | 2 | 3
type Piece = { role: Role; cut: CutType; rotation?: Rotation; slot?: Slot }
type Build = (widthTiles: number, heightTiles: number) => Record<string, Piece[]>

export type TemplateCategory = 'Persian & classical' | 'Tribal' | 'Flatweave'

export interface PatternTemplate {
  id: string
  name: string
  category: TemplateCategory
  /** One line on the tradition the layout comes from. */
  origin: string
  colorwayId: string
  build: Build
  /** Fine woven detail laid over the tiles: a border frame, a centre medallion, a field repeat. */
  decor?: TemplateDecor
}

export interface TemplateDecor {
  /** A border motif framed round the rug (its corners turn), and its thickness in tiles. */
  border?: string
  thickness?: 0.5 | 1
  /** A centre piece (medallion, star) and its height-to-width ratio from the motif catalogue. */
  centre?: { id: string; aspect: number; /** Widest it may get, in tiles. */ maxTiles?: number }
  /** A small motif repeated across the field every `every` tiles, around the centre piece. */
  field?: { id: string; every: number }
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


// ---- templates -------------------------------------------------------------------------


/**
 * A rug's border: an outer guard stripe, the main border and an inner guard, scaled to the rug.
 * Returns the role to draw, or null inside the field.
 */
function frame(x: number, y: number, Wp: number, Hp: number): Role | null {
  const width = Math.min(3, Math.floor(Math.min(Wp, Hp) / 8))
  if (width < 1) return null
  const edge = Math.min(x, y, Wp - 1 - x, Hp - 1 - y)
  if (edge >= width) return null
  if (edge === 0) return 1
  if (edge === width - 1) return 2
  return mod(x + y, 2) === 0 ? 3 : 1
}

export const PATTERN_TEMPLATES: PatternTemplate[] = [
  {
    id: 'beni-ourain-lattice',
    name: 'Beni Ourain Lattice',
    category: 'Tribal',
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
    category: 'Flatweave',
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
    category: 'Flatweave',
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
    category: 'Flatweave',
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
    category: 'Persian & classical',
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
    decor: { border: 'border-herati-guard', centre: { id: 'medallion-isfahan', aspect: 1.36 } },
  },
  {
    id: 'ikat-diamond',
    name: 'Ikat Diamond',
    category: 'Tribal',
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
    category: 'Flatweave',
    origin: 'Indian cotton dhurrie: banded flatweave stripes',
    colorwayId: 'atlas-clay',
    build: pixels(4, (_x, y) => ([0, 0, 0, 0, 1, 1, 0, 3, 0, 2, 2, 0] as Role[])[y % 12]),
  },
  {
    id: 'moorish-star',
    name: 'Moorish Star',
    category: 'Persian & classical',
    origin: 'Concave four-point stars from Andalusian zellige tilework',
    colorwayId: 'kilim-red',
    build: cells((r, c) => arc(0, 1, [0, 90, 270, 180][(r % 2) * 2 + (c % 2)])),
    decor: { border: 'border-greek-key', thickness: 0.5 },
  },
  {
    id: 'turkmen-gul',
    name: 'Turkmen Gul',
    category: 'Tribal',
    origin: 'Tekke Turkmen rugs: rows of quartered octagonal guls on a madder field',
    colorwayId: 'kilim-red',
    build: pixels(4, (x, y, Wp, Hp) => frame(x, y, Wp, Hp) ?? (mod(y, 8) === 7 && mod(x, 2) === 0 ? 1 : 0)),
    decor: { border: 'border-kilim-lozenge', field: { id: 'gul-octagon', every: 1 } },
  },
  {
    id: 'herati-lattice',
    name: 'Herati Lattice',
    category: 'Persian & classical',
    origin: 'The Herati "mahi" field of Persian rugs: a diamond lattice with rosettes',
    colorwayId: 'midnight-gold',
    build: pixels(4, (x, y, Wp, Hp) => {
      const f = frame(x, y, Wp, Hp)
      if (f !== null) return f
      // A faint diamond trellis behind the Herati motifs.
      return mod(x + y, 8) === 0 && mod(x - y, 8) === 0 ? 3 : 0
    }),
    decor: { border: 'border-vine-scroll', field: { id: 'herati', every: 1 } },
  },
  {
    id: 'mamluk-star',
    name: 'Mamluk Star',
    category: 'Persian & classical',
    origin: 'Cairo Mamluk carpets: an eight-point star inside concentric octagons',
    colorwayId: 'oasis',
    build: pixels(4, (x, y, Wp, Hp) => {
      const f = frame(x, y, Wp, Hp)
      if (f !== null) return f
      const ax = Math.abs(x - (Wp - 1) / 2)
      const ay = Math.abs(y - (Hp - 1) / 2)
      const r = Math.min(Wp, Hp) / 2
      const oct = Math.max(ax, ay, (ax + ay) / 1.4) / r
      const star = Math.min(ax + ay, Math.max(ax, ay) * 1.6) / r
      if (star <= 0.32) return 3
      if (oct <= 0.48) return 2
      if (oct <= 0.56) return 1
      if (oct <= 0.78) return mod(x + y, 4) === 0 ? 2 : 0
      return 0
    }),
    decor: { border: 'border-reciprocal-trefoil', centre: { id: 'star-octagram', aspect: 1 } },
  },
  {
    id: 'kazak-medallions',
    name: 'Kazak Medallions',
    category: 'Tribal',
    origin: 'Caucasian Kazak rugs: bold stepped medallions stacked down the field',
    colorwayId: 'atlas-clay',
    build: pixels(4, (x, y, Wp, Hp) => frame(x, y, Wp, Hp) ?? 0),
    decor: { border: 'border-sawtooth', centre: { id: 'medallion-caucasian', aspect: 1.32 }, field: { id: 'lozenge-small', every: 3 } },
  },
  {
    id: 'gabbeh-field',
    name: 'Gabbeh Field',
    category: 'Tribal',
    origin: 'Qashqai gabbeh: an open, softly banded field with a few small motifs',
    colorwayId: 'atlas-clay',
    build: pixels(4, (x, y, Wp, Hp) => {
      // Abrash: the field's dye shifts in soft horizontal bands, as hand-dyed wool batches do.
      const f = frame(x, y, Wp, Hp)
      if (f !== null) return f
      return hashAt(Math.floor(y / 5), 11) > 0.8 ? 2 : 0
    }),
    decor: { centre: { id: 'camel', aspect: 1.3, maxTiles: 2 } },
  },
]

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['Persian & classical', 'Tribal', 'Flatweave']

/**
 * Layouts that were retired (quilt blocks and suiting fabrics, not rugs), each pointed at the
 * closest rug layout, so old shared links and drafts still open something sensible.
 */
const RETIRED_TEMPLATES: Record<string, string> = {
  'flying-geese': 'kilim-chevron',
  pinwheel: 'moorish-star',
  'drunkards-path': 'moorish-star',
  housetop: 'mamluk-star',
  harlequin: 'kilim-stepped-diamond',
  'bauhaus-circles': 'moorish-star',
  'deco-fan': 'moorish-star',
  checkerboard: 'turkmen-gul',
  'tonal-brick': 'dhurrie-stripe',
  houndstooth: 'ikat-diamond',
  herringbone: 'kilim-chevron',
  tartan: 'dhurrie-stripe',
  'buffalo-check': 'turkmen-gul',
  tattersall: 'herati-lattice',
  basketweave: 'beni-ourain-lattice',
}

export function findTemplate(id: string | undefined) {
  const wanted = id && RETIRED_TEMPLATES[id] ? RETIRED_TEMPLATES[id] : id
  return PATTERN_TEMPLATES.find((t) => t.id === wanted)
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
  const laid = { ...base, name: `${template.name} - ${colorway.name}`, tiles, myStyles }
  return template.decor ? { ...laid, overlays: decorOverlays(laid, template.decor) } : laid
}

/**
 * A template's woven detail as designer overlays (so it can be edited like any other): the
 * border frame round the edge, the centre piece in the middle of the field, and the field motif
 * repeated around it. Anything that doesn't fit the rug's size is left out.
 */
export function decorOverlays(state: TileDesignState, decor: TemplateDecor): DesignOverlay[] {
  const { widthTiles: W, heightTiles: H } = state
  const out: DesignOverlay[] = []
  const fits = (o: DesignOverlay) => canPlaceOverlay(state, o) && !out.some((x) => footprintsOverlap(x, o))
  const thickness = decor.thickness ?? 1
  const inset = decor.border && W >= 3 && H >= 3 ? 1 : 0
  if (inset) out.push(...frameRuns(state, decor.border!, thickness, 'tpl-frame'))
  const fw = W - inset * 2
  const fh = H - inset * 2
  if (decor.centre && fw >= 1 && fh >= 1) {
    // As large as the field allows (leaving a tile round it on bigger rugs), centred.
    const room = fw >= 5 && fh >= 5 ? 2 : 0
    // Shrink a tile when that lets it sit exactly in the middle; otherwise it sits half a tile off.
    let w = Math.max(1, Math.min(fw - room, Math.floor((fh - room) / decor.centre.aspect), decor.centre.maxTiles ?? Infinity))
    if ((fw - w) % 2 && w > 1) w--
    let h = Math.max(1, Math.min(fh - room, Math.round(w * decor.centre.aspect)))
    if ((fh - h) % 2 && h > 1) h--
    const o: DesignOverlay = { id: 'tpl-centre', assetId: decor.centre.id, row: inset + Math.floor((fh - h) / 2), col: inset + Math.floor((fw - w) / 2), widthTiles: w, heightTiles: h, rotation: 0 }
    if (fits(o)) out.push(o)
  }
  if (decor.field && fw >= 2 && fh >= 2) {
    const step = decor.field.every
    for (let r = inset + Math.floor(((fh - 1) % step) / 2); r < H - inset; r += step)
      for (let c = inset + Math.floor(((fw - 1) % step) / 2); c < W - inset; c += step) {
        const o: DesignOverlay = { id: `tpl-f-${r}-${c}`, assetId: decor.field.id, row: r, col: c, widthTiles: 1, heightTiles: 1, rotation: 0 }
        if (fits(o)) out.push(o)
      }
  }
  return out
}
