import type { FibreMaterial } from '../../data/materials'
import { fibreColour } from '../../data/materials'
import type { PileTexture } from '../../types/freeform'

/**
 * A close-up patch of one dyed yarn, as pure pixel data: the knots or loops it is tufted into, the
 * strands within each, and the fibre's own character (wool fuzzy, silk smooth and combed, jute
 * coarse and streaky). Shared by the fabric chips (2D, shaded) and the fabric viewer (3D maps).
 * Pure, no DOM; deterministic for the same inputs.
 */

export interface PatchOptions {
  /** Patch side in px (square). */
  size: number
  /** Knots (or loops) across the patch. */
  knots: number
  pile?: PileTexture
  /** Flat-woven instead of piled: weft ribs, no knots (kilim, dhurrie, jute flatweave). */
  flat?: boolean
  seed?: number
  /** Tileable grain (values about 1), e.g. from `grainFrom`, at `grainW` x `grainH`. */
  grain?: Float32Array | null
  grainW?: number
  grainH?: number
}

export interface Patch {
  size: number
  /** Height 0..1 per pixel, row 0 at the top. */
  height: Float32Array
  /** Dyed colour per pixel (RGBA8). */
  color: Uint8ClampedArray<ArrayBuffer>
}

const hash = (x: number, y: number, s: number) => {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2246822519)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

/** Smooth value noise, lattice 1, wrapping every `period` cells so the patch tiles. */
function noise(x: number, y: number, s: number, period: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const p = (v: number) => ((v % period) + period) % period
  const h = (a: number, b: number) => hash(p(a), p(b), s)
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const top = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * sx
  const bot = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * sx
  return top + (bot - top) * sy
}

/** Fibre character: strand noise, fuzz and streaks, per fibre. */
function character(f: FibreMaterial) {
  switch (f.render.grain) {
    case 'velvet': // silk and bamboo silk: combed, long smooth strands, little fuzz
      return { strands: 0.025, stretch: 16, fuzz: 0.002, streak: 0.01, heather: 0.03 }
    case 'jute': // coarse plant fibre: strong streaks, uneven
      return { strands: 0.12, stretch: 6, fuzz: 0.05, streak: 0.12, heather: 0.1 }
    case 'yarn': // cotton: tight, even twist
      return { strands: 0.06, stretch: 4, fuzz: 0.03, streak: 0.03, heather: 0.03 }
    default: // wool: springy, fuzzy, a little heathered
      return { strands: 0.07, stretch: 1.7, fuzz: 0.07, streak: 0.025, heather: 0.06 }
  }
}

export function fabricPatch(dye: [number, number, number], fibre: FibreMaterial, opts: PatchOptions): Patch {
  const { size: n, knots, pile = 'cut', flat = false, seed = 1, grain = null, grainW = 1, grainH = 1 } = opts
  const ch = character(fibre)
  const relief = fibre.render.relief
  const height = new Float32Array(n * n)
  const color = new Uint8ClampedArray(n * n * 4)
  const cell = n / knots
  const [br, bg, bb] = fibreColour(dye[0], dye[1], dye[2], fibre)
  const depth = fibre.render.grainDepth
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = x / cell
      const v = y / cell
      const cu = Math.floor(u)
      const cv = Math.floor(v)
      const dx = u - cu - 0.5
      const dy = v - cv - 0.5
      // Each knot sits a touch off its grid and a touch higher or lower than its neighbours.
      const jitter = hash(cu, cv, seed) - 0.5
      let base: number
      if (flat) {
        // Weft-faced weave: a rib per row, bumped where it passes each warp.
        base = 0.5 + 0.12 * (1 - 4 * dy * dy) * (0.75 + 0.25 * Math.cos(dx * Math.PI * 2))
      } else if (pile === 'loop') {
        const r = Math.sqrt(dx * dx + dy * dy)
        base = 0.45 + 0.22 * relief * Math.max(0, 1 - Math.abs(r - 0.3) * 4.5)
      } else if (pile === 'shag') {
        base = 0.55 + 0.3 * relief * (1 - Math.min(1, (dx * dx + dy * dy) * 2.2)) + 0.12 * jitter
      } else {
        // Cut pile: tufts packed shoulder to shoulder, each a soft dome a little off-centre and
        // split into its plies, so the surface reads as one dense pile, not a grid of nubs.
        const ox = (hash(cu, cv, seed + 1) - 0.5) * 0.22
        const oy = (hash(cu, cv, seed + 2) - 0.5) * 0.22
        const r2 = (dx - ox) ** 2 + (dy - oy) ** 2
        const dome = 0.1 * relief * (1 - Math.min(1, r2 * 1.7))
        const plies = 0.07 * relief * (noise(u * 2.6, v * 2.6, seed + 4, Math.max(1, Math.round(knots * 2.6))) - 0.5)
        base = (pile === 'highlow' && (cu + cv) % 3 === 0 ? 0.6 : 0.5) + dome + plies + 0.03 * jitter
      }
      // Strands: noise stretched along the pile (down the patch).
      const period = Math.max(1, Math.round(knots * 4))
      const strand = noise((x / n) * period, (y / n) * (period / ch.stretch), seed + 3, period) - 0.5
      const fuzz = hash(x, y, seed + 9) - 0.5
      const streak = noise((x / n) * period * 2, 0.5, seed + 5, period * 2) - 0.5
      let g = 1
      if (grain) g = grain[(y % grainH) * grainW + (x % grainW)]
      // Glossy fibres are combed smooth: their grain shows in colour more than in relief.
      const hgt = base + ch.strands * strand + ch.fuzz * fuzz + ch.streak * streak + (g - 1) * depth * 0.5 * relief * relief
      height[y * n + x] = hgt
      // Colour: the dye, heathered strand to strand, a little darker deep between knots.
      const shade = 1 + ch.heather * (strand * 1.6 + streak) + (g - 1) * depth * 0.6 + (flat ? 0 : (base - 0.56) * 0.5)
      const i = (y * n + x) * 4
      color[i] = br * shade
      color[i + 1] = bg * shade
      color[i + 2] = bb * shade
      color[i + 3] = 255
    }
  }
  return { size: n, height, color }
}
