/**
 * Geometry kit for the motif generators: a seeded RNG, an affine "pen" that writes absolute
 * M/L/C/Z path data, dense contours (for scallops and offsets), Voronoi cells and pixel grids.
 * Everything is pure and deterministic for a given seed.
 */
import type { MotifArt, MotifLayer, MotifRole, ViewBox } from './types'

export type Pt = readonly [number, number]
/** Affine matrix [a, b, c, d, e, f]: x' = a*x + c*y + e, y' = b*x + d*y + f. */
export type Mat = readonly [number, number, number, number, number, number]

export const TAU = Math.PI * 2
export const I: Mat = [1, 0, 0, 1, 0, 0]

export function mul(m: Mat, n: Mat): Mat {
  // m applied after n
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}
export const translate = (x: number, y: number): Mat => [1, 0, 0, 1, x, y]
export const scaleM = (sx: number, sy = sx, cx = 0, cy = 0): Mat => [sx, 0, 0, sy, cx - sx * cx, cy - sy * cy]
export function rotateM(a: number, cx = 0, cy = 0): Mat {
  const c = Math.cos(a), s = Math.sin(a)
  return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy]
}
export const mirrorXM = (cx: number): Mat => [-1, 0, 0, 1, 2 * cx, 0]
export const mirrorYM = (cy: number): Mat => [1, 0, 0, -1, 0, 2 * cy]
/** Reflection across the line y = x (used for diagonal-symmetric border corners). */
export const swapXYM: Mat = [0, 1, 1, 0, 0, 0]
export const apply = (m: Mat, p: Pt): Pt => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]]

// ---------------------------------------------------------------- random

export interface Rng {
  (): number
  range(lo: number, hi: number): number
  int(lo: number, hi: number): number
  pick<T>(xs: readonly T[]): T
}

/** mulberry32: small, fast, good enough for art. */
export function makeRng(seed: number): Rng {
  let s = (seed >>> 0) ^ 0x9e3779b9
  const next = (() => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }) as Rng
  next.range = (lo, hi) => lo + (hi - lo) * next()
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next())
  next.pick = (xs) => xs[Math.floor(next() * xs.length)]
  return next
}

// ---------------------------------------------------------------- vectors

export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
export const mulv = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k]
export const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
export const len = (a: Pt) => Math.hypot(a[0], a[1])
export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
export const norm = (a: Pt): Pt => {
  const l = len(a) || 1
  return [a[0] / l, a[1] / l]
}
export const perp = (a: Pt): Pt => [-a[1], a[0]]
export const polar = (cx: number, cy: number, r: number, a: number): Pt => [cx + r * Math.cos(a), cy + r * Math.sin(a)]

// ---------------------------------------------------------------- shapes

/** A closed outline: a start point and line ([p]) or cubic ([c1, c2, p]) segments. */
export interface Shape {
  start: Pt
  segs: (readonly [Pt] | readonly [Pt, Pt, Pt])[]
}

export function polyShape(pts: readonly Pt[]): Shape {
  return { start: pts[0], segs: pts.slice(1).map((p) => [p] as const) }
}

/** Closed Catmull-Rom spline through `pts` as cubic segments. */
export function smoothShape(pts: readonly Pt[], tension = 1): Shape {
  const n = pts.length
  const segs: Shape['segs'] = []
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    const k = tension / 6
    segs.push([add(p1, mulv(sub(p2, p0), k)), sub(p2, mulv(sub(p3, p1), k)), p2])
  }
  return { start: pts[0], segs }
}

/** Open Catmull-Rom spline (end tangents clamped), returned as cubic segments from pts[0]. */
export function smoothOpenSegs(pts: readonly Pt[], tension = 1): [Pt, Pt, Pt][] {
  const n = pts.length
  const out: [Pt, Pt, Pt][] = []
  const k = tension / 6
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)]
    out.push([add(p1, mulv(sub(p2, p0), k)), sub(p2, mulv(sub(p3, p1), k)), p2])
  }
  return out
}

export function circleShape(cx: number, cy: number, r: number): Shape {
  return ellipseShape(cx, cy, r, r)
}

export function ellipseShape(cx: number, cy: number, rx: number, ry: number): Shape {
  const k = 0.5523
  return {
    start: [cx + rx, cy],
    segs: [
      [[cx + rx, cy + ry * k], [cx + rx * k, cy + ry], [cx, cy + ry]],
      [[cx - rx * k, cy + ry], [cx - rx, cy + ry * k], [cx - rx, cy]],
      [[cx - rx, cy - ry * k], [cx - rx * k, cy - ry], [cx, cy - ry]],
      [[cx + rx * k, cy - ry], [cx + rx, cy - ry * k], [cx + rx, cy]],
    ],
  }
}

export function rectShape(x: number, y: number, w: number, h: number): Shape {
  return polyShape([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
}

/**
 * Almond / leaf from `base` to `tip`. `w` is the half width; `belly` (0..1) moves the widest
 * point toward the tip; `curl` bends the leaf sideways (fraction of its length).
 */
export function petalShape(base: Pt, tip: Pt, w: number, belly = 0.45, curl = 0): Shape {
  const d = sub(tip, base), L = len(d), u = norm(d), n = perp(u)
  const at = (t: number, s: number): Pt => add(add(base, mulv(u, t * L)), mulv(n, s))
  const c = curl * L
  return {
    start: base,
    segs: [
      [at(belly * 0.35, w * 1.25 + c * 0.4), at(belly + 0.35, w * 1.1 + c), tip],
      [at(belly + 0.35, -w * 1.1 + c), at(belly * 0.35, -w * 1.25 + c * 0.4), base],
    ],
  }
}

/** Onion dome / flame: rounded body with a pointed tip. */
export function domeShape(base: Pt, tip: Pt, w: number, neck = 0.6): Shape {
  const d = sub(tip, base), L = len(d), u = norm(d), n = perp(u)
  const at = (t: number, s: number): Pt => add(add(base, mulv(u, t * L)), mulv(n, s))
  return {
    start: at(0, -w * 0.55),
    segs: [
      [at(0, w * 0.55)],
      [at(0.05, w * 1.35), at(neck, w * 1.1), tip],
      [at(neck, -w * 1.1), at(0.05, -w * 1.35), at(0, -w * 0.55)],
    ],
  }
}

export function starPts(cx: number, cy: number, rOut: number, rIn: number, n: number, rot = -Math.PI / 2): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < n * 2; i++) pts.push(polar(cx, cy, i % 2 ? rIn : rOut, rot + (i * Math.PI) / n))
  return pts
}

// ---------------------------------------------------------------- contours

/** Dense closed polyline. */
export type Contour = Pt[]

/** Superellipse |x/rx|^p + |y/ry|^p = 1: p = 1 lozenge, 2 ellipse, large -> rectangle. */
export function superellipse(cx: number, cy: number, rx: number, ry: number, p = 2, n = 360): Contour {
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const c = Math.cos(a), s = Math.sin(a)
    out.push([cx + rx * Math.sign(c) * Math.abs(c) ** (2 / p), cy + ry * Math.sign(s) * Math.abs(s) ** (2 / p)])
  }
  return out
}

export function polarContour(cx: number, cy: number, r: (a: number) => number, n = 360, rot = 0): Contour {
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU
    out.push(polar(cx, cy, r(a), a))
  }
  return out
}

function signedArea(pts: readonly Pt[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a / 2
}

/** Resample a closed contour to `n` points equally spaced by arc length, starting at index 0. */
export function resample(c: Contour, n: number, phase = 0): Contour {
  const cum = [0]
  for (let i = 1; i <= c.length; i++) cum.push(cum[i - 1] + dist(c[i - 1], c[i % c.length]))
  const total = cum[c.length]
  const out: Pt[] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const s = (((i + phase) / n) % 1) * total
    while (j > 0 && cum[j] > s) j--
    while (cum[j + 1] < s) j++
    const t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1)
    out.push(lerp(c[j], c[(j + 1) % c.length], t))
  }
  return out
}

/** Outward unit normal at each point (orientation-independent). */
function normals(c: Contour): Pt[] {
  const sgn = signedArea(c) > 0 ? 1 : -1
  return c.map((_, i) => {
    const t = norm(sub(c[(i + 1) % c.length], c[(i - 1 + c.length) % c.length]))
    return mulv([t[1], -t[0]], sgn)
  })
}

/** Offset a (mostly convex) contour outward by `d` (negative shrinks). */
export function offset(c: Contour, d: number): Contour {
  const ns = normals(c)
  return c.map((p, i) => add(p, mulv(ns[i], d)))
}

export type LobeStyle = 'round' | 'ogee' | 'point' | 'step'

/**
 * Scalloped outline: `n` lobes laid along contour `c` by arc length. `bulge` is lobe height as a
 * fraction of lobe width; `spread` undercuts the cusps so lobes read as separate petals.
 */
export function scallop(c: Contour, n: number, bulge = 0.35, style: LobeStyle = 'round', spread = 0.15, phase = 0): Shape {
  const cusps = resample(c, n, phase)
  const dense = resample(c, n * 8, phase)
  const ns = normals(dense)
  const segs: Shape['segs'] = []
  for (let i = 0; i < n; i++) {
    const a = cusps[i], b = cusps[(i + 1) % n]
    const nm = ns[i * 8 + 4]
    const w = dist(a, b), h = bulge * w
    const t = norm(sub(b, a))
    if (style === 'round') {
      segs.push([add(add(a, mulv(nm, h * 1.33)), mulv(t, -spread * w)), add(add(b, mulv(nm, h * 1.33)), mulv(t, spread * w)), b])
    } else if (style === 'step') {
      const m1 = add(lerp(a, b, 0.25), mulv(nm, 0)), m2 = add(lerp(a, b, 0.75), mulv(nm, 0))
      segs.push([add(a, mulv(nm, h * 0.5))], [add(m1, mulv(nm, h * 0.5))], [add(m1, mulv(nm, h))], [add(m2, mulv(nm, h))], [add(m2, mulv(nm, h * 0.5))], [add(b, mulv(nm, h * 0.5))], [b])
    } else {
      const tip = add(lerp(a, b, 0.5), mulv(nm, h * (style === 'point' ? 1.1 : 1.25)))
      const k = style === 'point' ? 0.15 : 0.32
      segs.push(
        [add(add(a, mulv(nm, h * 0.75)), mulv(t, -spread * w)), sub(tip, add(mulv(t, w * k), mulv(nm, style === 'point' ? 0 : h * 0.12))), tip],
        [add(tip, sub(mulv(t, w * k), mulv(nm, style === 'point' ? 0 : h * 0.12))), add(add(b, mulv(nm, h * 0.75)), mulv(t, spread * w)), b],
      )
    }
  }
  return { start: cusps[0], segs }
}

/** Smooth closed shape through a dense contour, decimated to `n` control points. */
export function contourShape(c: Contour, n = 48): Shape {
  return smoothShape(resample(c, n))
}

/** Is p inside the closed polygon? */
export function inside(poly: readonly Pt[], p: Pt): boolean {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit
  }
  return hit
}

/** Crossings of the vertical line x with a closed polygon, sorted top to bottom. */
export function verticalHits(poly: readonly Pt[], x: number): number[] {
  const ys: number[] = []
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if (a[0] > x !== b[0] > x) ys.push(a[1] + ((x - a[0]) * (b[1] - a[1])) / (b[0] - a[0]))
  }
  return ys.sort((p, q) => p - q)
}

/** A band of width w along an open polyline, as a polygon (left side then right side back). */
export function ribbonPoly(pts: readonly Pt[], w: number): Pt[] {
  const n = pts.length
  const left: Pt[] = [], right: Pt[] = []
  for (let i = 0; i < n; i++) {
    const t = norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]))
    const nn = perp(t)
    left.push(add(pts[i], mulv(nn, w / 2)))
    right.push(sub(pts[i], mulv(nn, w / 2)))
  }
  return [...left, ...right.reverse()]
}

// ---------------------------------------------------------------- voronoi

function clipHalf(poly: Pt[], p: Pt, q: Pt): Pt[] {
  // keep points closer to p than q
  const m = lerp(p, q, 0.5), nrm = sub(q, p)
  const side = (x: Pt) => (x[0] - m[0]) * nrm[0] + (x[1] - m[1]) * nrm[1]
  const out: Pt[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const sa = side(a), sb = side(b)
    if (sa <= 0) out.push(a)
    if (sa < 0 !== sb < 0 && sa !== sb) out.push(lerp(a, b, sa / (sa - sb)))
  }
  return out
}

export function voronoi(sites: readonly Pt[], x0: number, y0: number, x1: number, y1: number): Pt[][] {
  return sites.map((s) => {
    let poly: Pt[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    for (const t of sites) if (t !== s) poly = clipHalf(poly, s, t)
    return poly
  })
}

export function centroid(poly: readonly Pt[]): Pt {
  let x = 0, y = 0
  for (const p of poly) { x += p[0]; y += p[1] }
  return [x / poly.length, y / poly.length]
}

/** Inset a convex polygon by `d` (edges moved inward and re-intersected). */
export function inset(poly: readonly Pt[], d: number): Pt[] {
  const n = poly.length
  const ccw = signedArea(poly) > 0 ? 1 : -1
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n]
    const u = norm(sub(b, a))
    const nn = mulv([-u[1], u[0]], ccw) // inward
    return { p: add(a, mulv(nn, d)), u }
  })
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n], l2 = lines[i]
    const den = l1.u[0] * l2.u[1] - l1.u[1] * l2.u[0]
    if (Math.abs(den) < 1e-6) { out.push(l2.p); continue }
    const w = sub(l2.p, l1.p)
    const t = (w[0] * l2.u[1] - w[1] * l2.u[0]) / den
    out.push(add(l1.p, mulv(l1.u, t)))
  }
  return out
}

// ---------------------------------------------------------------- path output

type Seg = { c?: readonly [Pt, Pt]; p: Pt }
interface Sub { start: Pt; segs: Seg[]; hole: boolean }

const fmt = (n: number) => {
  const r = Math.round(n * 100) / 100
  return (Object.is(r, -0) ? 0 : r).toString()
}

/** Interior samples of a cubic. */
export function sampleCubic(p0: Pt, c1: Pt, c2: Pt, p1: Pt, n = 16): Pt[] {
  const out: Pt[] = []
  for (let i = 1; i < n; i++) {
    const t = i / n, u = 1 - t
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
    ])
  }
  return out
}

function subArea(s: Sub): number {
  const pts: Pt[] = [s.start]
  let prev = s.start
  for (const g of s.segs) {
    if (g.c) {
      const [c1, c2] = g.c
      for (const t of [0.25, 0.5, 0.75]) {
        const u = 1 - t
        pts.push([
          u * u * u * prev[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * g.p[0],
          u * u * u * prev[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * g.p[1],
        ])
      }
    }
    pts.push(g.p)
    prev = g.p
  }
  return signedArea(pts)
}

function reverse(s: Sub): Sub {
  const pts = [s.start, ...s.segs.map((g) => g.p)]
  const segs: Seg[] = []
  for (let i = s.segs.length - 1; i >= 0; i--) {
    const g = s.segs[i]
    segs.push({ p: pts[i], c: g.c ? [g.c[1], g.c[0]] : undefined })
  }
  return { start: pts[pts.length - 1], segs, hole: s.hole }
}

export class Path {
  subs: Sub[] = []

  add(shape: Shape, m: Mat, hole = false) {
    const segs: Seg[] = shape.segs.map((g) => (g.length === 1 ? { p: apply(m, g[0]) } : { c: [apply(m, g[0]), apply(m, g[1])] as const, p: apply(m, g[2]) }))
    this.subs.push({ start: apply(m, shape.start), segs, hole })
  }

  get empty() {
    return this.subs.length === 0
  }

  /** Points along the drawn outline (cubics sampled), for bounds. */
  points(): Pt[] {
    const out: Pt[] = []
    for (const s of this.subs) {
      let prev = s.start
      out.push(prev)
      for (const g of s.segs) {
        if (g.c) out.push(...sampleCubic(prev, g.c[0], g.c[1], g.p))
        out.push(g.p)
        prev = g.p
      }
    }
    return out
  }

  transform(m: Mat) {
    this.subs = this.subs.map((s) => ({
      start: apply(m, s.start),
      hole: s.hole,
      segs: s.segs.map((g) => ({ p: apply(m, g.p), c: g.c ? ([apply(m, g.c[0]), apply(m, g.c[1])] as const) : undefined })),
    }))
  }

  toD(): string {
    const parts: string[] = []
    for (let s of this.subs) {
      const a = subArea(s)
      if (Math.abs(a) < 1e-6) continue
      if (a > 0 === s.hole) s = reverse(s)
      parts.push(`M${fmt(s.start[0])} ${fmt(s.start[1])}`)
      for (const g of s.segs) {
        if (g.c) parts.push(`C${fmt(g.c[0][0])} ${fmt(g.c[0][1])} ${fmt(g.c[1][0])} ${fmt(g.c[1][1])} ${fmt(g.p[0])} ${fmt(g.p[1])}`)
        else parts.push(`L${fmt(g.p[0])} ${fmt(g.p[1])}`)
      }
      parts.push('Z')
    }
    return parts.join('')
  }
}

/** Writes shapes into a layer through an affine matrix. */
export class Pen {
  readonly path: Path
  readonly m: Mat
  constructor(path: Path, m: Mat = I) {
    this.path = path
    this.m = m
  }

  with(m: Mat): Pen {
    return new Pen(this.path, mul(this.m, m))
  }
  fill(s: Shape, hole = false): this {
    this.path.add(s, this.m, hole)
    return this
  }
  hole(s: Shape): this {
    return this.fill(s, true)
  }
  poly(pts: readonly Pt[], hole = false) {
    return this.fill(polyShape(pts), hole)
  }
  smooth(pts: readonly Pt[], hole = false) {
    return this.fill(smoothShape(pts), hole)
  }
  circle(cx: number, cy: number, r: number, hole = false) {
    return this.fill(circleShape(cx, cy, r), hole)
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, hole = false) {
    return this.fill(ellipseShape(cx, cy, rx, ry), hole)
  }
  rect(x: number, y: number, w: number, h: number, hole = false) {
    return this.fill(rectShape(x, y, w, h), hole)
  }
  ring(cx: number, cy: number, r1: number, r2: number) {
    return this.circle(cx, cy, r2).circle(cx, cy, r1, true)
  }
  /** A band of width w along an open polyline/spline (ribbon), as one closed shape. */
  ribbon(pts: readonly Pt[], w: number | ((t: number) => number), smooth = true) {
    const wf = typeof w === 'number' ? () => w : w
    const n = pts.length
    const left: Pt[] = [], right: Pt[] = []
    for (let i = 0; i < n; i++) {
      const t = norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]))
      const nn = perp(t), hw = wf(i / (n - 1)) / 2
      left.push(add(pts[i], mulv(nn, hw)))
      right.push(sub(pts[i], mulv(nn, hw)))
    }
    if (!smooth) return this.poly([...left, ...right.reverse()])
    right.reverse()
    const a = smoothOpenSegs(left), b = smoothOpenSegs(right)
    return this.fill({ start: left[0], segs: [...a, [right[0]], ...b, [left[0]]] })
  }

  /** Same drawing repeated n times around (cx, cy). */
  radial(n: number, cx: number, cy: number, fn: (p: Pen, i: number) => void, rot = 0) {
    for (let i = 0; i < n; i++) fn(this.with(rotateM(rot + (i * TAU) / n, cx, cy)), i)
    return this
  }
  /** Drawing plus its mirror image across x = cx. */
  mirrorX(cx: number, fn: (p: Pen) => void) {
    fn(this)
    fn(this.with(mirrorXM(cx)))
    return this
  }
  mirrorY(cy: number, fn: (p: Pen) => void) {
    fn(this)
    fn(this.with(mirrorYM(cy)))
    return this
  }
  /** 4-fold mirror symmetry about (cx, cy). */
  quad(cx: number, cy: number, fn: (p: Pen) => void) {
    return this.mirrorX(cx, (p) => p.mirrorY(cy, fn))
  }

  /**
   * Knotted-pile pixel art: each char in `rows` is a cell; `map` picks which chars this pen draws.
   * Horizontal runs merge into one rect; rects overlap a hair so no seams show.
   */
  pixels(rows: readonly string[], x0: number, y0: number, cell: number, chars: string, grow = 0, clamp?: readonly [number, number, number, number]) {
    const o = cell * 0.04 + grow
    const rect = (x: number, y: number, w: number, h: number) => {
      if (!clamp) return this.rect(x, y, w, h)
      const xa = Math.max(clamp[0], x), ya = Math.max(clamp[1], y), xb = Math.min(clamp[2], x + w), yb = Math.min(clamp[3], y + h)
      return xb > xa && yb > ya ? this.rect(xa, ya, xb - xa, yb - ya) : this
    }
    rows.forEach((row, r) => {
      let c = 0
      while (c < row.length) {
        if (!chars.includes(row[c])) { c++; continue }
        let e = c
        while (e + 1 < row.length && chars.includes(row[e + 1])) e++
        rect(x0 + c * cell - o, y0 + r * cell - o, (e - c + 1) * cell + 2 * o, cell + 2 * o)
        c = e + 1
      }
    })
    return this
  }
}

/** Collects role layers in paint order. */
export class Canvas {
  private layers: { role: MotifRole; path: Path }[] = []
  readonly w: number
  readonly h: number
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
  }

  pen(role: MotifRole, m: Mat = I): Pen {
    let last = this.layers[this.layers.length - 1]
    if (!last || last.role !== role) {
      last = { role, path: new Path() }
      this.layers.push(last)
    }
    return new Pen(last.path, m)
  }

  /** Several role pens at once, sharing a transform. */
  pens(m: Mat = I) {
    return {
      ground: () => this.pen('ground', m),
      primary: () => this.pen('primary', m),
      secondary: () => this.pen('secondary', m),
      accent: () => this.pen('accent', m),
      outline: () => this.pen('outline', m),
    }
  }

  /**
   * Scale everything uniformly about the centre so every point (control points included) sits
   * at least `margin` inside the canvas. Used for pieces; borders must not move.
   */
  fitInside(margin = 0.3) {
    const pts = this.layers.flatMap((l) => l.path.points())
    if (!pts.length) return
    const cx = this.w / 2, cy = this.h / 2
    let k = 1
    for (const [x, y] of pts) {
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy)
      if (dx > 1e-9) k = Math.min(k, (this.w / 2 - margin) / dx)
      if (dy > 1e-9) k = Math.min(k, (this.h / 2 - margin) / dy)
    }
    if (k < 1) for (const l of this.layers) l.path.transform(scaleM(k, k, cx, cy))
  }

  toArt(): MotifArt {
    const viewBox: ViewBox = [0, 0, this.w, this.h]
    const layers: MotifLayer[] = []
    for (const l of this.layers) {
      if (l.path.empty) continue
      const d = l.path.toD()
      if (!d) continue
      const prev = layers[layers.length - 1]
      if (prev && prev.role === l.role) prev.d += d
      else layers.push({ role: l.role, d })
    }
    return { viewBox, layers }
  }
}
