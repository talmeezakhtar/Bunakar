/**
 * The motif catalogue: every piece and border the designer offers, as a generator call with fixed
 * parameters and seed. Specs are generated on first use and cached.
 */
import { Canvas, makeRng } from './geom'
import type { Rng } from './geom'
import { animal, arcs, organic, panel } from './figurative'
import type { OrganicStyle } from './figurative'
import { boteh, gul, herati, jaal, knot, lozenge, medallion, palmette, rosette, sprig, star } from './pieces'
import { guardBorder, meanderBorder, reciprocalBorder, vineBorder } from './borders'
import type { BorderArt } from './borders'
import type { BorderSpec, MotifCategory, MotifSpec, PieceSpec } from './types'

/** Piece height in viewBox units; width = aspect * PIECE_H. */
export const PIECE_H = 100

interface PieceDef {
  id: string
  name: string
  category: Exclude<MotifCategory, 'Borders'>
  kind: 'piece'
  aspect: number
  seed: number
  draw: (cv: Canvas, rng: Rng) => void
}

interface BorderDef {
  id: string
  name: string
  category: 'Borders'
  kind: 'border'
  seed: number
  make: (rng: Rng) => BorderArt
}

export type MotifDef = PieceDef | BorderDef

const piece = (id: string, name: string, category: PieceDef['category'], aspect: number, seed: number, draw: PieceDef['draw']): PieceDef =>
  ({ id, name, category, kind: 'piece', aspect, seed, draw })
const border = (id: string, name: string, seed: number, make: BorderDef['make']): BorderDef =>
  ({ id, name, category: 'Borders', kind: 'border', seed, make })

const traced = (id: string, name: string, src: string, style: OrganicStyle, aspect: number, seed: number) =>
  piece(id, name, 'Organic', aspect, seed, (cv, r) => organic(cv, { traced: src, style }, r))

export const MOTIF_DEFS: readonly MotifDef[] = [
  // Medallions
  piece('medallion-star', 'Star Medallion', 'Medallions', 1.34, 11, (cv, r) => medallion(cv, { shape: 'star', fold: 8, lobes: 32, lobeStyle: 'ogee', pendants: true }, r)),
  piece('medallion-sun', 'Sun Medallion', 'Medallions', 1, 12, (cv, r) => medallion(cv, { shape: 'round', fold: 8, lobes: 16, lobeStyle: 'point' }, r)),
  piece('medallion-garden', 'Garden Medallion', 'Medallions', 1.38, 13, (cv, r) => medallion(cv, { shape: 'oval', fold: 6, lobes: 26, lobeStyle: 'round', pendants: true }, r)),
  piece('medallion-shah-abbas', 'Shah Abbas Medallion', 'Medallions', 1.37, 14, (cv, r) => medallion(cv, { shape: 'lozenge', fold: 8, lobes: 28, lobeStyle: 'ogee' }, r)),
  piece('medallion-caucasian', 'Caucasian Medallion', 'Medallions', 1.32, 15, (cv, r) => medallion(cv, { shape: 'lozenge', fold: 4, lobes: 20, lobeStyle: 'step', stepped: true }, r)),
  piece('medallion-isfahan', 'Isfahan Medallion', 'Medallions', 1.36, 16, (cv, r) => medallion(cv, { shape: 'cartouche', fold: 8, lobes: 30, lobeStyle: 'ogee', pendants: true }, r)),

  // Florals
  piece('rosette-classic', 'Rosette', 'Florals', 1, 21, (cv, r) => rosette(cv, { petals: 8, petal: 'round', leaves: true }, r)),
  piece('rosette-blossom', 'Blossom', 'Florals', 1, 22, (cv, r) => rosette(cv, { petals: 6, petal: 'heart', core: 0.4 }, r)),
  piece('rosette-star', 'Star Flower', 'Florals', 1, 23, (cv, r) => rosette(cv, { petals: 8, petal: 'point', core: 0.34 }, r)),
  piece('palmette-shah-abbasi', 'Shah Abbasi Palmette', 'Florals', 0.95, 24, (cv, r) => palmette(cv, { kind: 'shah-abbasi' }, r)),
  piece('palmette-feather', 'Feather Palmette', 'Florals', 1, 25, (cv, r) => palmette(cv, { kind: 'feather' }, r)),
  piece('palmette-fan', 'Fan Palmette', 'Florals', 0.93, 26, (cv, r) => palmette(cv, { kind: 'fan', lobes: 7 }, r)),
  piece('lotus', 'Lotus', 'Florals', 0.97, 27, (cv, r) => palmette(cv, { kind: 'lotus' }, r)),
  piece('lotus-bud', 'Lotus Bud', 'Florals', 0.9, 28, (cv, r) => palmette(cv, { kind: 'bud' }, r)),
  piece('sprig', 'Sprig', 'Florals', 0.9, 29, (cv, r) => sprig(cv, { kind: 'sprig', pairs: 3 }, r)),
  piece('stem-flower', 'Stem Flower', 'Florals', 0.72, 30, (cv, r) => sprig(cv, { kind: 'stem', head: 'bud', pairs: 2 }, r)),
  piece('flower-spray', 'Flower Spray', 'Florals', 0.75, 31, (cv, r) => sprig(cv, { kind: 'spray', pairs: 2 }, r)),
  piece('leaf-fan', 'Leaf Fan', 'Florals', 0.95, 32, (cv, r) => sprig(cv, { kind: 'leaf-fan' }, r)),
  piece('tree-of-life', 'Tree of Life', 'Florals', 0.7, 33, (cv, r) => sprig(cv, { kind: 'tree', pairs: 4 }, r)),
  piece('herati', 'Herati', 'Florals', 1, 34, (cv, r) => herati(cv, { variant: 'classic' }, r)),

  // Paisley
  piece('boteh', 'Boteh', 'Paisley', 0.6, 41, (cv, r) => boteh(cv, { bend: 1.05, fill: 'flowers' }, r)),
  piece('boteh-banded', 'Banded Boteh', 'Paisley', 0.62, 42, (cv, r) => boteh(cv, { bend: 1.15, fill: 'bands' }, r)),
  piece('boteh-plain', 'Small Boteh', 'Paisley', 0.6, 43, (cv, r) => boteh(cv, { bend: 0.95, fill: 'bands', feather: false }, r)),

  // Geometric
  piece('gul-star', 'Star Gul', 'Geometric', 1.38, 51, (cv, r) => gul(cv, { teeth: true, quarters: 'tree' }, r)),
  piece('gul-octagon', 'Octagon Gul', 'Geometric', 1.2, 52, (cv, r) => gul(cv, { quarters: 'hook' }, r)),
  piece('star-octagram', 'Eight-Point Star', 'Geometric', 1, 53, (cv, r) => star(cv, { points: 8, layers: 3, hooked: true }, r)),
  piece('kilim-diamond', 'Kilim Diamond', 'Geometric', 1.12, 54, (cv) => lozenge(cv, { cols: 27, rows: 23, bands: 4, hooks: true, cross: true })),
  piece('lozenge', 'Lozenge', 'Geometric', 0.74, 55, (cv) => lozenge(cv, { cols: 15, rows: 21, bands: 4, cross: true })),
  piece('lozenge-small', 'Small Lozenge', 'Geometric', 0.85, 56, (cv) => lozenge(cv, { cols: 11, rows: 13, bands: 3 })),
  piece('endless-knot', 'Endless Knot', 'Geometric', 1.0, 57, (cv, r) => knot(cv, r)),
  piece('jaal', 'Jaal Lattice', 'Geometric', 1, 58, (cv, r) => jaal(cv, { cols: 3, rows: 3, ogee: 1 }, r)),

  // Animals
  piece('peacock', 'Peacock', 'Animals', 0.96, 61, (cv) => animal(cv, { kind: 'peacock' })),
  piece('lion', 'Lion', 'Animals', 1.34, 62, (cv) => animal(cv, { kind: 'lion' })),
  piece('hound', 'Tribal Hound', 'Animals', 1.2, 63, (cv) => animal(cv, { kind: 'hound' })),
  piece('bird', 'Bird', 'Animals', 1.1, 64, (cv) => animal(cv, { kind: 'bird' })),
  piece('camel', 'Camel', 'Animals', 1.3, 65, (cv) => animal(cv, { kind: 'camel' })),

  // Modern
  piece('panel-color-field', 'Color Field Panel', 'Modern', 1.63, 71, (cv, r) => panel(cv, { kind: 'field', cells: 5 }, r)),
  piece('panel-cobblestone', 'Cobblestone Panel', 'Modern', 1.15, 72, (cv, r) => panel(cv, { kind: 'cobble', cells: 14 }, r)),
  piece('panel-mosaic', 'Mosaic Panel', 'Modern', 1.44, 73, (cv, r) => panel(cv, { kind: 'mosaic', cells: 14 }, r)),
  piece('panel-mosaic-wide', 'Wide Mosaic Panel', 'Modern', 3, 74, (cv, r) => panel(cv, { kind: 'mosaic', cells: 22 }, r)),
  piece('panel-terrazzo', 'Terrazzo Panel', 'Modern', 1.3, 75, (cv, r) => panel(cv, { kind: 'terrazzo', cells: 26 }, r)),
  piece('carved-arcs', 'Carved Arcs', 'Modern', 2, 76, (cv) => arcs(cv, { rings: 5 })),

  // Organic (outlines traced from the sheet-3 tufted cut-outs)
  traced('organic-splash', 'Ink Splash', 's3-shape-7', 'splash', 0.975, 81),
  traced('organic-cloud', 'Cloud', 's3-shape-8', 'splash', 1.012, 82),
  traced('organic-starburst', 'Starburst', 's3-shape-9', 'splash', 0.994, 83),
  traced('organic-pebble-round', 'Round Pebble', 's3-shape-10', 'pebble', 1.139, 84),
  traced('organic-pebble-tilted', 'Tilted Pebble', 's3-shape-11', 'pebble', 1.078, 85),
  traced('organic-pebble-soft', 'Soft Pebble', 's3-shape-12', 'pebble', 1.06, 86),
  traced('organic-wedge', 'Ribbed Wedge', 's3-shape-13', 'ribbed', 0.817, 87),
  traced('organic-ribbon', 'Ribbon', 's3-shape-14', 'ribbon', 3.255, 88),
  traced('organic-cloud-small', 'Small Cloud', 's3-shape-16', 'splash', 1.087, 89),
  traced('organic-slope', 'Ribbed Slope', 's3-shape-17', 'ribbed', 1.737, 90),
  traced('organic-river-stone', 'River Stone', 's3-shape-18', 'pebble', 1.012, 91),
  traced('organic-oval-stone', 'Oval Stone', 's3-shape-19', 'pebble', 1.125, 92),
  traced('organic-flat-stone', 'Flat Stone', 's3-shape-20', 'pebble', 1.173, 93),
  traced('organic-curved-ribbon', 'Curved Ribbon', 's3-shape-21', 'ribbon', 3.114, 94),
  traced('organic-arc', 'Arc', 's3-shape-22', 'ribbon', 2.069, 95),
  piece('organic-fringed', 'Fringed Square', 'Organic', 1.27, 96, (cv, r) => organic(cv, { style: 'fringed' }, r)),

  // Borders
  border('border-herati-guard', 'Herati Guard', 101, (r) => guardBorder({ variant: 'herati', guard: 'beads', aspect: 2.4 }, r)),
  border('border-crescent-guard', 'Crescent Guard', 102, (r) => guardBorder({ variant: 'crescent', guard: 'flowers', aspect: 2.2 }, r)),
  border('border-tree-band', 'Tree of Life Band', 103, (r) => guardBorder({ variant: 'cypress', guard: 'chevron', aspect: 2.6 }, r)),
  border('border-kilim-lozenge', 'Kilim Lozenge', 104, (r) => reciprocalBorder({ variant: 'lozenge', guard: 'teeth', aspect: 2.4, teeth: 2 }, r)),
  border('border-reciprocal-trefoil', 'Reciprocal Trefoil', 105, (r) => reciprocalBorder({ variant: 'trefoil', guard: 'beads', aspect: 1.6, teeth: 3 }, r)),
  border('border-sawtooth', 'Sawtooth', 106, (r) => reciprocalBorder({ variant: 'sawtooth', guard: 'teeth', aspect: 1.6, teeth: 3 }, r)),
  border('border-vine-scroll', 'Vine Scroll', 107, (r) => vineBorder({ variant: 'scroll', guard: 'flowers', aspect: 2.2 }, r)),
  border('border-lotus-vine', 'Lotus Vine', 108, (r) => vineBorder({ variant: 'lotus', guard: 'beads', aspect: 2.4 }, r)),
  border('border-greek-key', 'Meander Key', 109, (r) => meanderBorder({ variant: 'key', periods: 2 }, r)),
  border('border-wave-ribbon', 'Wave Ribbon', 110, (r) => meanderBorder({ variant: 'wave', periods: 1 }, r)),
  border('border-carved-swirl', 'Carved Swirl', 111, (r) => meanderBorder({ variant: 'swirl', periods: 2 }, r)),
]

const DEFS = new Map(MOTIF_DEFS.map((d) => [d.id, d]))
const cache = new Map<string, MotifSpec>()

/** Build a spec from its definition; pass a seed to get a variant (the catalogue seed by default). */
export function generateMotif(def: MotifDef, seed = def.seed): MotifSpec {
  const rng = makeRng(seed)
  if (def.kind === 'piece') {
    const cv = new Canvas(Math.round(def.aspect * PIECE_H * 100) / 100, PIECE_H)
    def.draw(cv, rng)
    cv.fitInside()
    const art = cv.toArt()
    const spec: PieceSpec = { id: def.id, name: def.name, category: def.category, kind: 'piece', aspect: def.aspect, ...art }
    return spec
  }
  const { repeat, corner } = def.make(rng)
  const aspect = Math.round((repeat.viewBox[2] / repeat.viewBox[3]) * 1000) / 1000
  const spec: BorderSpec = { id: def.id, name: def.name, category: 'Borders', kind: 'border', aspect, ...repeat, corner }
  return spec
}

export function findMotifDef(id: string | null | undefined): MotifDef | undefined {
  return id ? DEFS.get(id) : undefined
}

/** The catalogue spec for `id` (cached), or undefined. */
export function getMotif(id: string | null | undefined): MotifSpec | undefined {
  const def = findMotifDef(id)
  if (!def) return undefined
  let spec = cache.get(def.id)
  if (!spec) {
    spec = generateMotif(def)
    cache.set(def.id, spec)
  }
  return spec
}

export function allMotifs(): MotifSpec[] {
  return MOTIF_DEFS.map((d) => getMotif(d.id)!)
}

export const MOTIF_CATEGORIES: readonly MotifCategory[] = ['Medallions', 'Modern', 'Florals', 'Geometric', 'Paisley', 'Animals', 'Organic', 'Borders']
