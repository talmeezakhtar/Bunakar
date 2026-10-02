import type { FreeformShape, Point } from '../types/freeform'

/** Deterministic PRNG (mulberry32) so a generator seed always rebuilds the same rug. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function polygonArea(pts: Point[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p.x * q.y - q.x * p.y
  }
  return Math.abs(a) / 2
}

export function centroid(pts: Point[]): Point {
  let x = 0
  let y = 0
  for (const p of pts) {
    x += p.x
    y += p.y
  }
  return { x: x / pts.length, y: y / pts.length }
}

export function pointInPolygon(p: Point, pts: Point[]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]
    const b = pts[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/** Clip a convex polygon to the half-plane { q : (q - p) . n <= 0 } (Sutherland-Hodgman). */
function clipHalfPlane(poly: Point[], p: Point, n: Point): Point[] {
  const out: Point[] = []
  const side = (q: Point) => (q.x - p.x) * n.x + (q.y - p.y) * n.y
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const sa = side(a)
    const sb = side(b)
    if (sa <= 0) out.push(a)
    if (sa <= 0 !== sb <= 0) {
      const t = sa / (sa - sb)
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    }
  }
  return out
}

/** Voronoi cells of `sites` inside the W x H rectangle (O(n^2) half-plane clipping - fine for
 * the few dozen cells a rug uses). Cell i belongs to sites[i]. */
export function voronoiCells(sites: Point[], W: number, H: number): Point[][] {
  return sites.map((s, i) => {
    let cell: Point[] = [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: W, y: H },
      { x: 0, y: H },
    ]
    for (let j = 0; j < sites.length && cell.length > 2; j++) {
      if (j === i) continue
      const o = sites[j]
      const mid = { x: (s.x + o.x) / 2, y: (s.y + o.y) / 2 }
      cell = clipHalfPlane(cell, mid, { x: o.x - s.x, y: o.y - s.y })
    }
    return cell
  })
}

/** Spread random sites: a jittered grid (or, with `scatter`, fully random points), then Lloyd
 * relaxation toward cell centroids - more iterations = more even cells. */
export function relaxedSites(count: number, W: number, H: number, rand: () => number, iterations = 2, scatter = false): Point[] {
  const cols = Math.max(1, Math.round(Math.sqrt((count * W) / H)))
  const rows = Math.max(1, Math.ceil(count / cols))
  let sites: Point[] = []
  if (scatter) {
    for (let i = 0; i < count; i++) sites.push({ x: rand() * W, y: rand() * H })
  } else {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        sites.push({ x: ((c + 0.2 + rand() * 0.6) * W) / cols, y: ((r + 0.2 + rand() * 0.6) * H) / rows })
      }
    }
  }
  for (let k = 0; k < iterations; k++) {
    sites = voronoiCells(sites, W, H).map((cell, i) => (cell.length > 2 ? centroid(cell) : sites[i]))
  }
  return sites
}

/** Shrink a convex polygon by `d` (each edge moves inward) - leaves even gaps between cells. */
export function insetConvex(poly: Point[], d: number): Point[] {
  const c = centroid(poly)
  let out = poly
  for (let i = 0; i < poly.length && out.length > 2; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const ex = b.x - a.x
    const ey = b.y - a.y
    const len = Math.hypot(ex, ey) || 1
    // Inward normal (towards the centroid).
    let nx = -ey / len
    let ny = ex / len
    if ((c.x - a.x) * nx + (c.y - a.y) * ny < 0) {
      nx = -nx
      ny = -ny
    }
    const p = { x: a.x + nx * d, y: a.y + ny * d }
    out = clipHalfPlane(out, p, { x: -nx, y: -ny })
  }
  return out
}

/** Chaikin corner cutting: rounds a closed polygon's corners, `iterations` times. */
export function chaikin(pts: Point[], iterations = 2): Point[] {
  let out = pts
  for (let k = 0; k < iterations; k++) {
    const next: Point[] = []
    for (let i = 0; i < out.length; i++) {
      const a = out[i]
      const b = out[(i + 1) % out.length]
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 })
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 })
    }
    out = next
  }
  return out
}

/** SVG path for a shape: a closed Catmull-Rom curve through its points, or a plain polygon. */
export function shapePath(points: Point[], smooth: boolean): string {
  const n = points.length
  if (n < 3) return ''
  const f = (v: number) => Math.round(v * 1000) / 1000
  if (!smooth) return `M${points.map((p) => `${f(p.x)},${f(p.y)}`).join('L')}Z`
  let d = `M${f(points[0].x)},${f(points[0].y)}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += `C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(p2.x)},${f(p2.y)}`
  }
  return `${d}Z`
}

/** The shape's outline as a dense polygon (curves sampled), for hit tests and areas. */
export function flattenShape(shape: Pick<FreeformShape, 'points' | 'smooth'>, steps = 8): Point[] {
  const { points, smooth } = shape
  const n = points.length
  if (!smooth || n < 3) return points
  const out: Point[] = []
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const t2 = t * t
      const t3 = t2 * t
      const k = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: k(p0.x, p1.x, p2.x, p3.x), y: k(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  return out
}

export function transformPoints(points: Point[], fn: (p: Point) => Point): Point[] {
  return points.map(fn)
}

/** Scale and rotate points about their centroid. */
export function scaleRotate(points: Point[], scale: number, degrees: number): Point[] {
  const c = centroid(points)
  const r = (degrees * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  return points.map((p) => {
    const x = (p.x - c.x) * scale
    const y = (p.y - c.y) * scale
    return { x: c.x + x * cos - y * sin, y: c.y + x * sin + y * cos }
  })
}

export function boundsOf(points: Point[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}

/** Smoothly interpolated value noise over a W x H area, `scale` feet per cell. */
export function valueNoise(rand: () => number, W: number, H: number, scale: number): (x: number, y: number) => number {
  const gw = Math.ceil(W / scale) + 3
  const gh = Math.ceil(H / scale) + 3
  const g = Array.from({ length: gw * gh }, rand)
  const s = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number) => {
    const fx = Math.max(0, x) / scale
    const fy = Math.max(0, y) / scale
    const ix = Math.floor(fx)
    const iy = Math.floor(fy)
    const tx = s(fx - ix)
    const ty = s(fy - iy)
    const v = (i: number, j: number) => g[Math.min(gh - 1, j) * gw + Math.min(gw - 1, i)]
    const a = v(ix, iy) + (v(ix + 1, iy) - v(ix, iy)) * tx
    const b = v(ix, iy + 1) + (v(ix + 1, iy + 1) - v(ix, iy + 1)) * tx
    return a + (b - a) * ty
  }
}

/** Split every edge into pieces no longer than `maxLen` (deterministic, so a shared edge splits
 * into the same points from either side). */
export function densify(poly: Point[], maxLen: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / maxLen))
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })
  }
  return out
}

/**
 * A smooth displacement field over the rug that fades to nothing at its edges. Applying the same
 * field to neighbouring cells bends their shared edges identically - curved boundaries, no gaps -
 * while the rug's outline stays straight.
 */
export function warpField(W: number, H: number, seed: number, amplitude: number): (p: Point) => Point {
  const rand = rng(seed)
  const scale = Math.min(W, H) * 0.42
  const nx = valueNoise(rand, W, H, scale)
  const ny = valueNoise(rand, W, H, scale)
  const fadeLen = Math.min(W, H) * 0.18
  return (p) => {
    const edge = Math.min(p.x, p.y, W - p.x, H - p.y)
    const t = Math.max(0, Math.min(1, edge / fadeLen))
    const fade = t * t * (3 - 2 * t)
    return { x: p.x + (nx(p.x, p.y) - 0.5) * 2 * amplitude * fade, y: p.y + (ny(p.x, p.y) - 0.5) * 2 * amplitude * fade }
  }
}

const contourCache = new Map<string, string>()

/** Unsigned distance from `p` to the nearest edge of any polygon. */
function distToEdges(p: Point, polys: Point[][]): number {
  let best = Infinity
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]
      const b = poly[(i + 1) % poly.length]
      const ex = b.x - a.x
      const ey = b.y - a.y
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / (ex * ex + ey * ey || 1)))
      best = Math.min(best, Math.hypot(p.x - a.x - ex * t, p.y - a.y - ey * t))
    }
  }
  return best
}

/**
 * Topographic carving lines (the maze-like grooves of a contour-carved ground): iso-lines of a
 * smooth noise field over the rug, traced with marching squares. Near `around` (shape outlines)
 * the field follows the distance to them, so the lines ripple outward from each shape. Returned
 * as one SVG path of short segments; cached by rug size, seed and outlines.
 */
export function contourLinesPath(W: number, H: number, around: Point[][] = [], seed = 5, lineSpacing = 0.14): string {
  const f = (n: number) => Math.round(n * 100) / 100
  const key = `${W}x${H}:${seed}:${lineSpacing}:${around.map((poly) => poly.map((p) => `${f(p.x)},${f(p.y)}`).join(' ')).join('|')}`
  const hit = contourCache.get(key)
  if (hit) return hit
  const rand = rng(seed)
  // Two octaves of smoothly interpolated value noise.
  const n1 = valueNoise(rand, W, H, 1.2)
  const n2 = valueNoise(rand, W, H, 0.55)
  // Distance to the outlines, on a coarse grid (bilinear between), so dragging a shape stays quick.
  const dres = Math.max(0.12, Math.sqrt(W * H) / 60)
  const dc = Math.ceil(W / dres) + 1
  const dr = Math.ceil(H / dres) + 1
  const dist: number[] = []
  if (around.length) for (let j = 0; j < dr; j++) for (let i = 0; i < dc; i++) dist.push(distToEdges({ x: i * dres, y: j * dres }, around))
  const distAt = (x: number, y: number) => {
    const fx = Math.min(dc - 1.001, x / dres)
    const fy = Math.min(dr - 1.001, y / dres)
    const i = Math.floor(fx)
    const j = Math.floor(fy)
    const tx = fx - i
    const ty = fy - j
    const v = (a: number, b: number) => dist[b * dc + a]
    const top = v(i, j) + (v(i + 1, j) - v(i, j)) * tx
    return top + (v(i, j + 1) + (v(i + 1, j + 1) - v(i, j + 1)) * tx - top) * ty
  }
  // Rings: a ramp rising at the same rate the noise does (so lines keep their spacing), fading
  // into the free-running noise about a foot and a half out.
  const R = 1.5
  const field = (x: number, y: number) => {
    const n = n1(x, y) + 0.45 * n2(x, y)
    if (!around.length) return n
    const w = Math.exp(-distAt(x, y) / R)
    return n * (1 - w) + 0.8 * R * (1 - w)
  }
  // Level step chosen so neighbouring lines sit about `lineSpacing` feet apart.
  const levelStep = lineSpacing * 0.8
  const res = 0.06
  const cols = Math.ceil(W / res)
  const rows = Math.ceil(H / res)
  const val: number[] = []
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) val.push(field(Math.min(W, i * res), Math.min(H, j * res)))
  const at = (i: number, j: number) => val[j * (cols + 1) + i]
  const parts: string[] = []
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const c = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]
      const lo = Math.ceil(Math.min(...c) / levelStep)
      const hi = Math.floor(Math.max(...c) / levelStep)
      const x0 = i * res
      const y0 = j * res
      const corners = [
        [x0, y0],
        [x0 + res, y0],
        [x0 + res, y0 + res],
        [x0, y0 + res],
      ]
      for (let k = lo; k <= hi; k++) {
        const L = k * levelStep
        const pts: number[][] = []
        for (let e = 0; e < 4; e++) {
          const a = c[e]
          const b = c[(e + 1) % 4]
          if ((a < L) !== (b < L)) {
            const t = (L - a) / (b - a)
            const [ax, ay] = corners[e]
            const [bx, by] = corners[(e + 1) % 4]
            pts.push([ax + (bx - ax) * t, ay + (by - ay) * t])
          }
        }
        for (let p = 0; p + 1 < pts.length; p += 2) parts.push(`M${f(pts[p][0])},${f(pts[p][1])}L${f(pts[p + 1][0])},${f(pts[p + 1][1])}`)
      }
    }
  }
  const d = parts.join('')
  // ponytail: crude bound - each drag frame adds an entry; an LRU if it ever shows in profiles.
  if (contourCache.size > 24) contourCache.clear()
  contourCache.set(key, d)
  return d
}
