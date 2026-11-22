/**
 * Photo to knot chart. A photo of a rug (or any picture) is straightened by its four marked
 * corners, sampled once per knot, reduced to a few colours by k-means in OKLab (a colour space
 * where distance matches what the eye sees), each colour matched to the nearest real yarn, and
 * tidied so no knot stands alone. Pure: runs in a worker or the checks; no DOM.
 */
import type { Quad } from '../utils/perspective'
import { rectToQuadHomography } from '../utils/perspective'

export interface PhotoChartInput {
  /** RGBA pixels of the photo, row-major. */
  data: Uint8ClampedArray
  width: number
  height: number
  /** The rug's four corners in the photo, in its pixels. */
  quad: Quad
  cols: number
  rows: number
  /** How many colours to keep (4 to 32). */
  colors: number
  /** The yarns it may use: catalogue swatch ids and their colours (#rrggbb). */
  yarns: { id: string; hex: string }[]
  /** 0 none, 1 removes lone knots, 2 also smooths ragged edges. */
  cleanup: 0 | 1 | 2
  /** Even out uneven light (a shadow or a lamp across the photo) before choosing colours. */
  evenLight?: boolean
  /** Also return the straightened photo, one colour per knot (for the preview). */
  withSample?: boolean
}

export interface PhotoChartResult {
  cols: number
  rows: number
  /** 1-based indexes into `swatchIds`; most used yarn first. */
  cells: Uint8Array
  swatchIds: string[]
  counts: number[]
  /** The straightened photo, RGB per knot, when asked for. */
  sample?: Uint8ClampedArray
}

// ---- colour ------------------------------------------------------------------------------------

const LIN = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  LIN[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** sRGB bytes to OKLab, written into out at o. */
export function oklab(r: number, g: number, b: number, out: Float32Array, o: number) {
  const lr = LIN[r]
  const lg = LIN[g]
  const lb = LIN[b]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  out[o] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  out[o + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  out[o + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
}

const hexLab = (hex: string) => {
  const out = new Float32Array(3)
  oklab(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), out, 0)
  return out
}

// ---- straighten and sample --------------------------------------------------------------------

/** One colour per knot: the photo inside the quad, straightened, 2 x 2 samples averaged. */
export function sampleGrid(input: Pick<PhotoChartInput, 'data' | 'width' | 'height' | 'quad' | 'cols' | 'rows'>): Uint8ClampedArray {
  const { data, width, height, quad, cols, rows } = input
  const H = rectToQuadHomography(cols, rows, quad)
  const out = new Uint8ClampedArray(cols * rows * 3)
  const px = (x: number, y: number, ch: number) => {
    // Bilinear, clamped to the photo.
    const fx = Math.min(width - 1, Math.max(0, x - 0.5))
    const fy = Math.min(height - 1, Math.max(0, y - 0.5))
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const x1 = Math.min(width - 1, x0 + 1)
    const y1 = Math.min(height - 1, y0 + 1)
    const tx = fx - x0
    const ty = fy - y0
    const a = data[(y0 * width + x0) * 4 + ch] * (1 - tx) + data[(y0 * width + x1) * 4 + ch] * tx
    const b = data[(y1 * width + x0) * 4 + ch] * (1 - tx) + data[(y1 * width + x1) * 4 + ch] * tx
    return a * (1 - ty) + b * ty
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let R = 0
      let G = 0
      let B = 0
      for (const dv of [0.25, 0.75])
        for (const du of [0.25, 0.75]) {
          const u = c + du
          const v = r + dv
          const w = H[6] * u + H[7] * v + H[8]
          const x = (H[0] * u + H[1] * v + H[2]) / w
          const y = (H[3] * u + H[4] * v + H[5]) / w
          R += px(x, y, 0)
          G += px(x, y, 1)
          B += px(x, y, 2)
        }
      const o = (r * cols + c) * 3
      out[o] = R / 4
      out[o + 1] = G / 4
      out[o + 2] = B / 4
    }
  return out
}

// ---- light ----------------------------------------------------------------------------------

/**
 * Flatten the light: each knot's lightness (OKLab L, every third float) is compared with the
 * average light around it, a box about a quarter of the chart across, and moved so the whole
 * chart sits at one level. Patterns are far smaller than that box, so they stay; a shadow goes.
 */
export function evenLight(lab: Float32Array, cols: number, rows: number) {
  const n = cols * rows
  // Summed-area table of L, for any box average in constant time.
  const sat = new Float64Array((cols + 1) * (rows + 1))
  let total = 0
  for (let r = 0; r < rows; r++) {
    let line = 0
    for (let c = 0; c < cols; c++) {
      const L = lab[(r * cols + c) * 3]
      line += L
      total += L
      sat[(r + 1) * (cols + 1) + c + 1] = sat[r * (cols + 1) + c + 1] + line
    }
  }
  const mean = total / n
  const rx = Math.max(2, Math.round(cols / 8))
  const ry = Math.max(2, Math.round(rows / 8))
  for (let r = 0; r < rows; r++) {
    const r0 = Math.max(0, r - ry)
    const r1 = Math.min(rows, r + ry + 1)
    for (let c = 0; c < cols; c++) {
      const c0 = Math.max(0, c - rx)
      const c1 = Math.min(cols, c + rx + 1)
      const sum = sat[r1 * (cols + 1) + c1] - sat[r0 * (cols + 1) + c1] - sat[r1 * (cols + 1) + c0] + sat[r0 * (cols + 1) + c0]
      const local = sum / ((r1 - r0) * (c1 - c0))
      const o = (r * cols + c) * 3
      lab[o] = Math.min(1, Math.max(0, lab[o] + mean - local))
    }
  }
}

// ---- k-means --------------------------------------------------------------------------------

function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

/**
 * k colour centres for OKLab points (3 floats each): k-means++ start, then Lloyd's steps on a
 * sample of up to 40,000 points (the whole chart is assigned afterwards).
 */
export function kmeans(lab: Float32Array, k: number, seed = 7): Float32Array {
  const n = lab.length / 3
  const rand = rng(seed)
  const m = Math.min(n, 40_000)
  const sample = new Float32Array(m * 3)
  for (let i = 0; i < m; i++) {
    const j = m === n ? i : Math.floor(rand() * n)
    sample.set(lab.subarray(j * 3, j * 3 + 3), i * 3)
  }
  k = Math.max(1, Math.min(k, m))
  const cent = new Float32Array(k * 3)
  const d2 = new Float32Array(m).fill(Infinity)
  cent.set(sample.subarray(0, 3), 0)
  for (let c = 1; c < k; c++) {
    // k-means++: the next centre far from the ones chosen, with probability by squared distance.
    let total = 0
    for (let i = 0; i < m; i++) {
      const o = i * 3
      const p = (c - 1) * 3
      const d = (sample[o] - cent[p]) ** 2 + (sample[o + 1] - cent[p + 1]) ** 2 + (sample[o + 2] - cent[p + 2]) ** 2
      if (d < d2[i]) d2[i] = d
      total += d2[i]
    }
    let t = rand() * total
    let pick = m - 1
    for (let i = 0; i < m; i++) if ((t -= d2[i]) <= 0) {
      pick = i
      break
    }
    cent.set(sample.subarray(pick * 3, pick * 3 + 3), c * 3)
  }
  const label = new Uint8Array(m)
  for (let iter = 0; iter < 16; iter++) {
    let moved = 0
    for (let i = 0; i < m; i++) {
      const best = nearest(sample, i * 3, cent, k)
      if (best !== label[i]) moved++
      label[i] = best
    }
    const sum = new Float64Array(k * 3)
    const cnt = new Uint32Array(k)
    for (let i = 0; i < m; i++) {
      const c = label[i]
      cnt[c]++
      sum[c * 3] += sample[i * 3]
      sum[c * 3 + 1] += sample[i * 3 + 1]
      sum[c * 3 + 2] += sample[i * 3 + 2]
    }
    for (let c = 0; c < k; c++) if (cnt[c]) for (let ch = 0; ch < 3; ch++) cent[c * 3 + ch] = sum[c * 3 + ch] / cnt[c]
    if (iter > 0 && moved < m * 0.002) break
  }
  return cent
}

function nearest(pts: Float32Array, o: number, cent: Float32Array, k: number): number {
  let best = 0
  let bd = Infinity
  for (let c = 0; c < k; c++) {
    const p = c * 3
    const d = (pts[o] - cent[p]) ** 2 + (pts[o + 1] - cent[p + 1]) ** 2 + (pts[o + 2] - cent[p + 2]) ** 2
    if (d < bd) {
      bd = d
      best = c
    }
  }
  return best
}

// ---- tidy -----------------------------------------------------------------------------------

/**
 * Replace knots that don't belong: a knot with fewer than `keep` of its 8 neighbours in its own
 * colour takes the colour most of its neighbours have. keep 1 removes lone knots; 3 smooths edges.
 */
export function tidy(cells: Uint8Array, cols: number, rows: number, keep: number): Uint8Array {
  const out = cells.slice()
  const tally = new Uint16Array(256)
  const seen: number[] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      const v = cells[i]
      let same = 0
      seen.length = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue
          const w = cells[rr * cols + cc]
          if (w === v) same++
          if (!tally[w]++) seen.push(w)
        }
      if (same < keep) {
        let best = v
        let bn = 0
        for (const w of seen) if (tally[w] > bn) {
          bn = tally[w]
          best = w
        }
        out[i] = best
      }
      for (const w of seen) tally[w] = 0
    }
  return out
}

// ---- all together ---------------------------------------------------------------------------

export function photoToChart(input: PhotoChartInput): PhotoChartResult {
  const { cols, rows } = input
  const n = cols * rows
  const rgb = sampleGrid(input)
  const lab = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) oklab(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], lab, i * 3)
  if (input.evenLight) evenLight(lab, cols, rows)
  const k = Math.max(2, Math.min(32, Math.round(input.colors)))
  const cent = kmeans(lab, k)
  // Colours that would cover almost nothing (under 0.2% of knots, specks and blends) are dropped:
  // their knots go to the nearest colour that stays.
  const label = new Uint8Array(n)
  const size = new Uint32Array(k)
  for (let i = 0; i < n; i++) size[(label[i] = nearest(lab, i * 3, cent, k))]++
  const keep = [...size.keys()].filter((c) => size[c] >= n * 0.002)
  if (keep.length && keep.length < k) {
    const kept = new Float32Array(keep.length * 3)
    keep.forEach((c, j) => kept.set(cent.subarray(c * 3, c * 3 + 3), j * 3))
    for (let i = 0; i < n; i++) if (size[label[i]] < n * 0.002) label[i] = keep[nearest(lab, i * 3, kept, keep.length)]
  }
  const yarnOf = assignYarns(cent, keep.length ? keep : [...size.keys()], size, input.yarns.map((y) => hexLab(y.hex)))
  let cells: Uint8Array = new Uint8Array(n)
  for (let i = 0; i < n; i++) cells[i] = yarnOf[label[i]] + 1
  if (input.cleanup >= 1) cells = tidy(cells, cols, rows, 1)
  if (input.cleanup >= 2) cells = tidy(tidy(cells, cols, rows, 3), cols, rows, 1)
  const out = renumber(cells, input.yarns.map((y) => y.id), cols, rows)
  return input.withSample ? { ...out, sample: rgb } : out
}

/**
 * A yarn for each colour centre, the biggest first. Each takes its nearest yarn, but when that
 * yarn is already taken and another free yarn is nearly as close (within 0.05 in OKLab, a small
 * visible step), it takes that one, so two reds the eye tells apart stay two yarns.
 */
export function assignYarns(cent: Float32Array, centres: number[], size: Uint32Array, yarnLab: Float32Array[]): Int32Array {
  const yarnOf = new Int32Array(cent.length / 3)
  const taken = new Set<number>()
  for (const c of [...centres].sort((a, b) => size[b] - size[a])) {
    const dist = yarnLab.map((y, j) => ({ j, d: Math.sqrt((cent[c * 3] - y[0]) ** 2 + (cent[c * 3 + 1] - y[1]) ** 2 + (cent[c * 3 + 2] - y[2]) ** 2) })).sort((a, b) => a.d - b.d)
    const best = dist[0]
    const free = dist.find((x) => !taken.has(x.j))
    const pick = taken.has(best.j) && free && free.d - best.d < 0.05 ? free.j : best.j
    yarnOf[c] = pick
    taken.add(pick)
  }
  return yarnOf
}

/** Cells numbered to the yarns actually used, most used first (the ground leads, as in every palette). */
function renumber(cells: Uint8Array, ids: string[], cols: number, rows: number): PhotoChartResult {
  const counts = new Uint32Array(ids.length + 1)
  for (let i = 0; i < cells.length; i++) counts[cells[i]]++
  const used = [...counts.keys()].filter((y) => y > 0 && counts[y] > 0).sort((a, b) => counts[b] - counts[a])
  const remap = new Uint8Array(counts.length)
  used.forEach((y, j) => (remap[y] = j + 1))
  const out = new Uint8Array(cells.length)
  for (let i = 0; i < cells.length; i++) out[i] = remap[cells[i]]
  return { cols, rows, cells: out, swatchIds: used.map((y) => ids[y - 1]), counts: used.map((y) => counts[y]) }
}

/** The chart with some yarns swapped for others (old id -> new id); yarns that meet merge. */
export function applySwaps(res: PhotoChartResult, swaps: Record<string, string>): PhotoChartResult {
  const ids = res.swatchIds.map((id) => swaps[id] ?? id)
  const unique = [...new Set(ids)]
  const to = ids.map((id) => unique.indexOf(id) + 1)
  const cells = res.cells.map((v) => (v ? to[v - 1] : 0))
  return renumber(cells, unique, res.cols, res.rows)
}
