/**
 * A studio rug's finish on its rasterized colour image (RGBA, w x h), before shading. Shared by
 * the woven picture and the 3D textures. Pure; deterministic for a given rug.
 * - abrash: bands across the rug where a dye lot changed, a little lighter or darker
 * - antique wash: colours faded and warmed, contrast softened, and worn patches (mostly where
 *   feet go, towards the middle) where the cotton foundation shows through
 * - fibre: each fibre's colour lift from `data/materials` (silk brighter and richer, cotton flatter)
 */
import type { RugDoc } from './model'
import { compositeChart } from './weaveRules'
import { fibreColour, fibreMaterial } from '../data/materials'

function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

function hashText(t: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193)
  return h >>> 0
}

/** Smooth value noise in 0..1 at (x, y), lattice spacing 1. */
function noise(x: number, y: number, seed: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const h = (a: number, b: number) => {
    let n = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(seed, 2246822519)
    n = Math.imul(n ^ (n >>> 13), 1274126177)
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296
  }
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const top = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * sx
  const bot = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * sx
  return top + (bot - top) * sy
}

/** Lightness per image row for abrash: 1 is unchanged. Bands 3-14% of the length, about half shifted. */
export function abrashRows(h: number, strength: number, seed: number): Float32Array {
  const out = new Float32Array(h).fill(1)
  if (strength <= 0) return out
  const rand = rng(seed)
  const level = new Float32Array(h)
  for (let y = 0; y < h; ) {
    const band = Math.max(2, Math.round(h * (0.03 + rand() * 0.11)))
    const shift = rand() < 0.5 ? (rand() * 2 - 1) * 0.16 * strength : 0
    level.fill(shift, y, Math.min(h, y + band))
    y += band
  }
  // Soften each change over about 1.5% of the length, as a new skein blends in.
  const r = Math.max(1, Math.round(h * 0.0075))
  for (let y = 0; y < h; y++) {
    let sum = 0
    let n = 0
    for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) {
      sum += level[k]
      n++
    }
    out[y] = 1 + sum / n
  }
  return out
}

export function applyFinish(rgba: Uint8ClampedArray, w: number, h: number, doc: RugDoc) {
  const { abrash, wash } = doc.finish
  const seed = hashText(`${doc.widthFt}x${doc.heightFt}:${doc.palette.map((y) => y.swatchId).join()}`)
  // Yarn fibre per pixel, where the rug is charted.
  const fibres = doc.palette.map((y) => fibreMaterial(y.fibre))
  const flat = fibres.some((f) => f.render.saturation !== 1 || f.render.lift !== 1) ? compositeChart(doc) : null
  const rows = abrashRows(h, abrash, seed)
  const W = 6 / Math.max(w, h) // wear noise: about six blobs along the rug
  for (let y = 0; y < h; y++) {
    const ab = rows[y]
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (!rgba[i + 3]) continue
      let r = rgba[i]
      let g = rgba[i + 1]
      let b = rgba[i + 2]
      if (flat) {
        const v = flat.cells[Math.min(flat.rows - 1, Math.floor((y * flat.rows) / h)) * flat.cols + Math.min(flat.cols - 1, Math.floor((x * flat.cols) / w))]
        const fibre = v ? fibres[v - 1] : undefined
        if (fibre) [r, g, b] = fibreColour(r, g, b, fibre)
      }
      if (ab !== 1) {
        // A lighter lot reads a little warmer, a darker one a little cooler.
        r *= ab * (ab > 1 ? 1.01 : 0.995)
        g *= ab
        b *= ab * (ab > 1 ? 0.985 : 1.01)
      }
      if (wash > 0) {
        const L = 0.299 * r + 0.587 * g + 0.114 * b
        const keep = 1 - 0.45 * wash
        // Fade towards a warm grey of the same lightness, and soften the darks.
        r = (L + (r - L) * keep) * (1 - 0.16 * wash) + (L * 0.06 + 34) * wash
        g = (L + (g - L) * keep) * (1 - 0.16 * wash) + (L * 0.03 + 28) * wash
        b = (L + (b - L) * keep) * (1 - 0.16 * wash) + 14 * wash
        // Worn patches, more of them towards the middle of the rug.
        const cx = x / w - 0.5
        const cy = y / h - 0.5
        const traffic = 1 - Math.min(1, (cx * cx + cy * cy) * 2.2)
        const n = noise(x * W, y * W, seed) * 0.65 + noise(x * W * 3.1, y * W * 3.1, seed + 7) * 0.35
        const wear = Math.max(0, Math.min(1, (n - 0.62 + 0.1 * traffic) * 4)) * wash * traffic
        if (wear > 0) {
          r += (217 - r) * wear * 0.55
          g += (207 - g) * wear * 0.55
          b += (190 - b) * wear * 0.55
        }
      }
      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
    }
  }
}
