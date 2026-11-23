/**
 * Piece generators in the Persian / Bhadohi tradition: medallion, rosette, palmette, sprig,
 * boteh, herati, gul, star, lozenge, knot and jaal. Each draws into a `Canvas` 100 units tall,
 * colour areas separated by thin dark outlines the way knotted pile reads.
 */
import {
  Canvas, TAU, add, dist, circleShape, contourShape, domeShape, lerp, mulv, offset, petalShape, polar, polarContour,
  polyShape, resample, rotateM, scallop, smoothShape, starPts, superellipse, sub, norm, perp, inside,
} from './geom'
import { I } from './geom'
import type { Contour, LobeStyle, Mat, Pt, Rng, Shape } from './geom'
import type { MotifRole } from './types'

/** Outline width (viewBox units at 100 tall). */
export const OW = 1.3

export const circle = (cx: number, cy: number, r: number, n = 180): Contour => polarContour(cx, cy, () => r, n)

/** Draw a shape over a slightly fattened copy of itself in the outline role. */
export function outlined(cv: Canvas, role: MotifRole, make: (grow: number) => Shape | Shape[], ow = OW, m: Mat = I) {
  const o = make(ow), f = make(0)
  const out = cv.pen('outline', m), fill = cv.pen(role, m)
  for (const s of Array.isArray(o) ? o : [o]) out.fill(s)
  for (const s of Array.isArray(f) ? f : [f]) fill.fill(s)
}

/** Shapes as seen through a pen transform (for outlined() with rotations). */
function rot(shape: Shape, a: number, cx: number, cy: number): Shape {
  const m = rotateM(a, cx, cy)
  const ap = (p: Pt): Pt => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]]
  return { start: ap(shape.start), segs: shape.segs.map((g) => g.map(ap) as unknown as Shape['segs'][number]) }
}
function around(n: number, cx: number, cy: number, make: (i: number) => Shape, phase = 0): Shape[] {
  return Array.from({ length: n }, (_, i) => rot(make(i), phase + (i * TAU) / n, cx, cy))
}

// ---------------------------------------------------------------- rosette core

export interface CoreP {
  n: number
  style?: LobeStyle
  rings?: number
}

/** Layered flower head: outer lobed ring, petal veins, inner ring, beaded centre. */
export function rosetteCore(cv: Canvas, cx: number, cy: number, r: number, p: CoreP, rng: Rng) {
  const n = p.n
  const style = p.style ?? 'ogee'
  const bulge = style === 'round' ? 0.3 : 0.42
  const k = r / (1 + bulge * (TAU / n) * 1.05) // keep lobe tips inside r
  outlined(cv, 'primary', (g) => scallop(circle(cx, cy, k + g), n, bulge, style, 0.12))
  // petal veins
  const v = cv.pen('secondary')
  for (const s of around(n, cx, cy, () => petalShape([cx, cy - k * 0.38], [cx, cy - k * 1.02], k * 0.085, 0.4), -Math.PI / 2 + Math.PI / 2)) v.fill(s)
  const rings = p.rings ?? 2
  let rr = k * 0.62
  const roles: MotifRole[] = ['secondary', 'ground', 'accent']
  for (let j = 0; j < rings; j++) {
    const m = j % 2 ? n : Math.max(6, n)
    const st: LobeStyle = j % 2 ? 'round' : rng() < 0.5 ? 'round' : 'ogee'
    const role = roles[j % roles.length]
    const kk = rr / (1 + 0.3 * (TAU / m))
    outlined(cv, role, (g) => scallop(circle(cx, cy, kk + g), m, 0.3, st, 0.1, 0.5 * j))
    rr = kk * 0.6
  }
  outlined(cv, 'accent', (g) => circleShape(cx, cy, rr + g))
  cv.pen('outline').circle(cx, cy, rr * 0.4)
}

// ---------------------------------------------------------------- medallion

export interface MedallionP {
  shape: 'oval' | 'lozenge' | 'round' | 'star' | 'cartouche'
  lobes: number
  lobeStyle: LobeStyle
  fold: number
  pendants?: boolean
  stepped?: boolean
}

export function medallion(cv: Canvas, p: MedallionP, rng: Rng) {
  const { w, h } = cv
  const cx = w / 2, cy = h / 2
  const C: Pt = [cx, cy]
  const pend = p.pendants ? Math.min(w * 0.15, 20) : 0
  const lobeStyle: LobeStyle = p.stepped ? 'step' : p.lobeStyle
  const bulge = lobeStyle === 'step' ? 0.32 : 0.3
  const availX = w / 2 - pend - 1.5, availY = h / 2 - 1.5
  const mk = (ex: number, ey: number): Contour => {
    switch (p.shape) {
      case 'lozenge': return superellipse(cx, cy, ex, ey, 1.15)
      case 'cartouche': return superellipse(cx, cy, ex, ey, 3)
      case 'star': return polarContour(cx, cy, (a) => {
        const t = Math.abs(Math.cos((a * p.fold) / 2))
        const base = (ex * ey) / Math.hypot(ey * Math.cos(a), ex * Math.sin(a))
        return base * (0.86 + 0.14 * t ** 2)
      }, 720)
      default: return superellipse(cx, cy, ex, ey, 2)
    }
  }
  const perim = (c: Contour) => c.reduce((s, q, i) => s + dist(q, c[(i + 1) % c.length]), 0)
  let rx = availX, ry = availY
  if (p.shape === 'round') rx = ry = Math.min(availX, availY)
  for (let it = 0; it < 4; it++) {
    const lobeH = bulge * (perim(mk(rx, ry)) / p.lobes) + OW
    rx = availX - lobeH
    ry = availY - lobeH
    if (p.shape === 'round') rx = ry = Math.min(rx, ry)
  }
  const base = mk(rx, ry)
  const at = (k: number): Contour => base.map((q) => lerp(C, q, k))
  const lob = (k: number, g: number, n = p.lobes, st = lobeStyle, b = bulge, ph = 0.5) => scallop(at(k + g / Math.min(rx, ry)), n, b, st, 0.1, ph)

  // pendants (lantern + finial) on the x axis, drawn first so the body overlaps their stems
  if (pend) {
    for (const s of [-1, 1]) {
      const x0 = cx + s * (rx - 4), x1 = s > 0 ? w - 1.2 : 1.2
      const m = (x0 + x1) / 2
      outlined(cv, 'secondary', (g) => polyShape([[x0, cy - 2.2 - g], [x1 - s * 6, cy - 1.2 - g], [x1 - s * 6, cy + 1.2 + g], [x0, cy + 2.2 + g]]))
      outlined(cv, 'primary', (g) => domeShape([x0 + s * 2, cy], [m + s * (pend * 0.3 + g), cy], 9.5 + g, 0.5))
      outlined(cv, 'accent', (g) => domeShape([x0 + s * 5, cy], [m + s * (pend * 0.05 + g), cy], 4 + g, 0.5))
      outlined(cv, 'primary', (g) => petalShape([m + s * pend * 0.3, cy], [x1 - s * (0.3 - g * 0.7), cy], 2.6 + g, 0.4))
    }
  }

  // outer frame band with a string of pearls, then the field
  outlined(cv, 'secondary', (g) => lob(1, g))
  outlined(cv, 'ground', (g) => lob(0.86, g * 0.8))
  const beadC = at(0.93)
  const bp = cv.pen('accent')
  for (const b of resample(beadC, Math.round(perim(beadC) / 4))) bp.circle(b[0], b[1], 0.8)

  // field: palmettes on the fold axes pointing out from the inner medallion, leaf pairs and
  // small blossoms between them
  const fold = p.fold
  const tips = resample(at(0.71), fold * 2, 0.25 + (p.lobes % 2 ? 0 : 0))
  tips.forEach((q, i) => {
    const dir = norm(sub(q, C))
    const n2 = perp(dir)
    const sz = Math.min(rx, ry) * 0.13
    if (i % 2 === 0) {
      const b = sub(q, mulv(dir, sz * 1.3)), t = add(q, mulv(dir, sz * 1.35))
      outlined(cv, 'primary', (g) => {
        // three-lobed palmette
        const fan = scallop(polarContour(0, 0, (a) => (Math.sin(a) < 0 ? 1 : 0.35) * (sz + g), 120), 5, 0.36, 'ogee', 0.08)
        const ang = Math.atan2(dir[1], dir[0]) + Math.PI / 2
        const ap = (pt: Pt): Pt => add(q, [pt[0] * Math.cos(ang) - pt[1] * Math.sin(ang), pt[0] * Math.sin(ang) + pt[1] * Math.cos(ang)])
        return [{ start: ap(fan.start), segs: fan.segs.map((sg) => sg.map(ap) as unknown as Shape['segs'][number]) }]
      })
      outlined(cv, 'accent', (g) => domeShape(add(b, mulv(dir, sz * 0.9)), add(t, mulv(dir, -sz * 0.75 + g)), sz * 0.22 + g, 0.5))
      // stems curling to each side
      for (const s of [-1, 1]) outlined(cv, 'secondary', (g) => petalShape(add(q, mulv(n2, s * sz * 0.6)), add(add(q, mulv(n2, s * sz * 1.9)), mulv(dir, -sz * 0.5)), sz * 0.22 + g, 0.5, s * 0.12))
    } else {
      outlined(cv, 'secondary', (g) => scallop(circle(q[0], q[1], sz * 0.7 + g), 6, 0.34, 'round', 0.12))
      cv.pen('accent').circle(q[0], q[1], sz * 0.28)
      for (const s of [-1, 1]) {
        const bb = add(q, mulv(dir, sz * 0.75))
        outlined(cv, 'primary', (g) => petalShape(bb, add(add(bb, mulv(dir, sz * 0.95 + g)), mulv(n2, s * sz * 0.75)), sz * 0.2 + g, 0.5))
      }
    }
  })
  // scattered small blossoms close to the frame
  const sp = cv.pen('accent')
  resample(at(0.8), fold * 4, 0.125).forEach((q, i) => {
    if (i % 2) sp.fill(scallop(circle(q[0], q[1], 1.5), 4, 0.4, 'round', 0.15))
  })

  // inner lobed medallion with its own field, then the rosette core
  outlined(cv, 'primary', (g) => lob(0.52, g, fold * 2, lobeStyle === 'step' ? 'step' : 'ogee', 0.34, 0))
  outlined(cv, 'ground', (g) => lob(0.42, g * 0.8, fold * 2, 'round', 0.22, 0))
  const ip = cv.pen('secondary')
  for (const q of resample(at(0.47), fold * 2, 0.5)) ip.circle(q[0], q[1], 0.9)
  rosetteCore(cv, cx, cy, Math.min(rx, ry) * 0.36, { n: fold, style: lobeStyle === 'step' ? 'point' : 'ogee', rings: 2 }, rng)
}

// ---------------------------------------------------------------- rosette / blossom

export interface RosetteP {
  petals: number
  petal: 'round' | 'point' | 'heart'
  core?: number
  leaves?: boolean
}

export function rosette(cv: Canvas, p: RosetteP, rng: Rng) {
  const { w, h } = cv
  const cx = w / 2, cy = h / 2
  const R = Math.min(w, h) / 2 - 2.5
  const n = p.petals
  const coreR = R * (p.core ?? 0.36)
  // leaves between petals
  if (p.leaves) {
    outlined(cv, 'secondary', (g) => around(n, cx, cy, () => petalShape([cx, cy], [cx, cy - R * 0.96 - g * 0.5], R * 0.13 + g, 0.55), Math.PI / n))
  }
  const petal = (g: number): Shape[] => around(n, cx, cy, () => {
    const b: Pt = [cx, cy - coreR * 0.6], t: Pt = [cx, cy - R + (p.leaves ? R * 0.12 : 0) - g * 0.6]
    const wd = (R * Math.sin(Math.PI / n)) * (p.petal === 'point' ? 0.62 : 0.78) + g
    if (p.petal === 'point') return petalShape(b, t, wd, 0.42)
    if (p.petal === 'heart') {
      const L = t[1] - b[1]
      return {
        start: b,
        segs: [
          [[cx + wd * 1.3, b[1] + L * 0.2], [cx + wd * 1.35, t[1] - L * 0.05], [cx + wd * 0.45, t[1]]],
          [[cx + wd * 0.2, t[1]], [cx, t[1] - L * 0.12], [cx, t[1] - L * 0.12]],
          [[cx, t[1] - L * 0.12], [cx - wd * 0.2, t[1]], [cx - wd * 0.45, t[1]]],
          [[cx - wd * 1.35, t[1] - L * 0.05], [cx - wd * 1.3, b[1] + L * 0.2], b],
        ],
      }
    }
    return domeShape(b, t, wd * 0.95, 0.5)
  })
  outlined(cv, 'primary', petal)
  // inner petal panel in a second colour
  const fp = cv.pen('secondary')
  for (const s of around(n, cx, cy, () => {
    const b: Pt = [cx, cy - coreR * 0.9], t: Pt = [cx, cy - R * (p.petal === 'point' ? 0.66 : 0.72)]
    return p.petal === 'point' ? petalShape(b, t, R * Math.sin(Math.PI / n) * 0.28, 0.4) : domeShape(b, t, R * Math.sin(Math.PI / n) * 0.42, 0.5)
  })) fp.fill(s)
  const vp = cv.pen('outline')
  for (const s of around(n, cx, cy, () => petalShape([cx, cy - coreR], [cx, cy - R * 0.62], 0.55, 0.4))) vp.fill(s)
  rosetteCore(cv, cx, cy, coreR * 1.05, { n: Math.max(6, n), style: 'round', rings: 1 }, rng)
}

// ---------------------------------------------------------------- palmette / lotus

export interface PalmetteP {
  kind: 'shah-abbasi' | 'lotus' | 'feather' | 'bud' | 'fan'
  lobes?: number
}

/** Fan of lobes along an arc from angle a0 to a1 (radians, screen coords), as cubic segs. */
function lobedArc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, bulge: number, style: LobeStyle): Shape['segs'] {
  const segs: Shape['segs'] = []
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n, tm = (t0 + t1) / 2
    const A: Pt = [cx + rx * Math.cos(t0), cy + ry * Math.sin(t0)]
    const B: Pt = [cx + rx * Math.cos(t1), cy + ry * Math.sin(t1)]
    const nm = norm([Math.cos(tm) / rx, Math.sin(tm) / ry])
    const W = Math.hypot(B[0] - A[0], B[1] - A[1]), H = bulge * W
    const tg = norm(sub(B, A))
    if (style === 'round') segs.push([add(add(A, mulv(nm, H * 1.33)), mulv(tg, -0.1 * W)), add(add(B, mulv(nm, H * 1.33)), mulv(tg, 0.1 * W)), B])
    else {
      const tip = add(lerp(A, B, 0.5), mulv(nm, H * 1.2))
      segs.push([add(A, mulv(nm, H * 0.8)), sub(tip, mulv(tg, W * 0.3)), tip], [add(tip, mulv(tg, W * 0.3)), add(B, mulv(nm, H * 0.8)), B])
    }
  }
  return segs
}

export function palmette(cv: Canvas, p: PalmetteP, rng: Rng) {
  const { w, h } = cv
  const cx = w / 2
  const baseY = h - 3
  if (p.kind === 'lotus' || p.kind === 'bud') {
    // side-view lotus: outer petals curling out, inner petals, tall central flame, a bowl calyx
    const bud = p.kind === 'bud'
    const top = 3
    const cupY = h * 0.66
    const spread = bud ? 0.3 : 0.44
    for (const s of [-1, 1]) {
      outlined(cv, 'primary', (g) => petalShape([cx + s * w * 0.06, cupY], [cx + s * (w * spread + g), h * (bud ? 0.3 : 0.2) - g], w * 0.09 + g, 0.45, -s * 0.12))
    }
    for (const s of [-1, 1]) {
      outlined(cv, 'secondary', (g) => petalShape([cx + s * w * 0.03, cupY], [cx + s * (w * spread * 0.62 + g), h * (bud ? 0.2 : 0.12) - g], w * 0.08 + g, 0.45, -s * 0.08))
    }
    outlined(cv, 'primary', (g) => domeShape([cx, cupY + g], [cx, top - g * 0.5], w * (bud ? 0.13 : 0.15) + g, 0.55))
    outlined(cv, 'accent', (g) => domeShape([cx, cupY - 4], [cx, top + 16 - g], w * 0.065 + g, 0.5))
    const vp = cv.pen('outline')
    for (const s of [-1, 1]) vp.fill(petalShape([cx + s * w * 0.08, cupY - 2], [cx + s * w * spread * 0.85, h * (bud ? 0.33 : 0.24)], 0.5, 0.45, -s * 0.12))
    // bowl calyx and stalk
    const bw = w * 0.3
    outlined(cv, 'secondary', (g) => ({
      start: [cx - bw - g, cupY - 3 - g],
      segs: [
        [[cx - bw * 0.4, cupY + 1], [cx + bw * 0.4, cupY + 1], [cx + bw + g, cupY - 3 - g]],
        [[cx + bw * 0.9 + g, cupY + 12 + g], [cx + bw * 0.3, cupY + 15 + g], [cx, cupY + 15 + g]],
        [[cx - bw * 0.3, cupY + 15 + g], [cx - bw * 0.9 - g, cupY + 12 + g], [cx - bw - g, cupY - 3 - g]],
      ],
    }))
    const ap = cv.pen('accent')
    for (let i = -2; i <= 2; i++) ap.circle(cx + (i * bw) / 3, cupY + 6 - Math.abs(i) * 0.8, 1.2)
    outlined(cv, 'secondary', (g) => polyShape([[cx - 2 - g, cupY + 14], [cx + 2 + g, cupY + 14], [cx + 2 + g, baseY + g * 0.5], [cx - 2 - g, baseY + g * 0.5]]))
    for (const s of [-1, 1]) outlined(cv, 'primary', (g) => petalShape([cx + s * 1.5, baseY - 4], [cx + s * (w * 0.3 + g), baseY - 12 - g * 0.5], 2.6 + g, 0.5, -s * 0.1))
    return
  }
  // Shah Abbasi / feather / fan palmette: fan of lobes on an arc above a calyx
  const n = p.lobes ?? (p.kind === 'feather' ? 13 : p.kind === 'fan' ? 7 : 9)
  const cy = h * 0.6
  const rx = w / 2 - 3, ry = cy - 3
  const st: LobeStyle = p.kind === 'shah-abbasi' ? 'round' : 'ogee'
  const bul = p.kind === 'feather' ? 0.5 : 0.32
  const a0 = Math.PI * 1.0, a1 = Math.PI * 2.0
  const kfit = (r: number) => r / (1 + bul * (Math.PI / n) * 1.25)
  const fan = (rxx: number, ryy: number, g: number, nn: number, style: LobeStyle, bb: number): Shape => {
    const A: Pt = [cx + rxx * Math.cos(a0), cy + ryy * Math.sin(a0)]
    return {
      start: [cx, cy + ryy * 0.22 + g],
      segs: [
        [[cx - rxx * 0.5, cy + ryy * 0.22], [A[0] - g, cy + ryy * 0.1], [A[0] - g, A[1]]],
        ...lobedArc(cx, cy, rxx + g, ryy + g, a0, a1, nn, bb, style),
        [[cx + rxx + g, cy + ryy * 0.1], [cx + rxx * 0.5, cy + ryy * 0.22], [cx, cy + ryy * 0.22 + g]],
      ],
    }
  }
  // sepals curl up behind the fan
  for (const s of [-1, 1]) outlined(cv, 'secondary', (g) => petalShape([cx + s * 2, baseY - 10], [cx + s * (rx + g * 0.5), cy + ry * 0.08], 3.4 + g, 0.5, -s * 0.16))
  outlined(cv, 'primary', (g) => fan(kfit(rx), kfit(ry), g, n, st, bul))
  outlined(cv, p.kind === 'feather' ? 'accent' : 'secondary', (g) => fan(kfit(rx) * 0.72, kfit(ry) * 0.74, g, Math.max(5, n - 2), st, bul * 0.9))
  outlined(cv, 'ground', (g) => fan(kfit(rx) * 0.46, kfit(ry) * 0.5, g, Math.max(3, n - 4), 'round', 0.3))
  // ribs
  const rp = cv.pen('outline')
  for (let i = 1; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    rp.fill(petalShape([cx + kfit(rx) * 0.5 * Math.cos(a), cy + kfit(ry) * 0.53 * Math.sin(a)], [cx + kfit(rx) * 0.9 * Math.cos(a), cy + kfit(ry) * 0.9 * Math.sin(a)], p.kind === 'feather' ? 0.35 : 0.5))
  }
  const dots = cv.pen('accent')
  for (let i = 0; i < n - 4; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / (n - 4)
    dots.circle(cx + kfit(rx) * 0.36 * Math.cos(a), cy + kfit(ry) * 0.4 * Math.sin(a), 1)
  }
  // core flame and calyx
  outlined(cv, 'secondary', (g) => domeShape([cx, cy + 3], [cx, cy - kfit(ry) * 0.5 - g], kfit(rx) * 0.13 + g, 0.5))
  outlined(cv, 'accent', (g) => domeShape([cx, cy], [cx, cy - kfit(ry) * 0.3 - g], kfit(rx) * 0.05 + g, 0.5))
  const bw = rx * 0.34
  outlined(cv, 'secondary', (g) => ({
    start: [cx - bw - g, cy + 2 - g],
    segs: [
      [[cx - bw * 0.4, cy + 5], [cx + bw * 0.4, cy + 5], [cx + bw + g, cy + 2 - g]],
      [[cx + bw * 0.9 + g, baseY - 18], [cx + bw * 0.3, baseY - 12], [cx + 3 + g, baseY - 10]],
      [[cx + 3 + g, baseY + g * 0.5]], [[cx - 3 - g, baseY + g * 0.5]], [[cx - 3 - g, baseY - 10]],
      [[cx - bw * 0.3, baseY - 12], [cx - bw * 0.9 - g, baseY - 18], [cx - bw - g, cy + 2 - g]],
    ],
  }))
  outlined(cv, 'primary', (g) => scallop(circle(cx, cy + (baseY - cy) * 0.38, bw * 0.34 + g), 5, 0.4, 'round', 0.1))
  cv.pen('accent').circle(cx, cy + (baseY - cy) * 0.38, bw * 0.13)
  void rng
}

/** Dense outline of a Shape (cubics sampled). */
export function shapeContour(s: Shape, per = 14): Contour {
  const out: Pt[] = []
  let prev = s.start
  for (const g of s.segs) {
    if (g.length === 1) { out.push(prev); prev = g[0]; continue }
    const [c1, c2, p] = g
    for (let i = 0; i < per; i++) {
      const t = i / per, u = 1 - t
      out.push([
        u * u * u * prev[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0],
        u * u * u * prev[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1],
      ])
    }
    prev = p
  }
  return out
}

/** Leaf with a serrated (saw-tooth) edge, the way carpet leaves are drawn. */
export function serratedLeaf(base: Pt, tip: Pt, w: number, curl = 0, teeth = 14): Shape {
  return scallop(shapeContour(petalShape(base, tip, w, 0.45, curl)), teeth, 0.3, 'point', 0, 0.5)
}

// ---------------------------------------------------------------- sprig / tree

export interface SprigP {
  kind: 'sprig' | 'stem' | 'spray' | 'tree' | 'leaf-fan'
  head?: 'rosette' | 'palmette' | 'bud'
  pairs?: number
}

export function sprig(cv: Canvas, p: SprigP, rng: Rng) {
  const { w, h } = cv
  const cx = w / 2
  const bottom = h - 2, top = 3
  const leafPairs = p.pairs ?? 3
  const stemTop = p.kind === 'leaf-fan' ? h * 0.55 : p.kind === 'tree' ? 14 : 30
  // stem
  outlined(cv, 'secondary', (g) => ({
    start: [cx - 1.4 - g, bottom],
    segs: [[[cx - 1.4 - g, stemTop]], [[cx + 1.4 + g, stemTop]], [[cx + 1.4 + g, bottom]]],
  }))
  const leaf = (y: number, s: number, L: number, g: number, up: number) =>
    serratedLeaf([cx + s * 1.2, y], [cx + s * (L + g * 0.6), y - up - g * 0.3], L * 0.17 + g, -s * 0.07, 12)
  const ys = Array.from({ length: leafPairs }, (_, i) => lerp([0, bottom - 8], [0, stemTop + 10], i / Math.max(1, leafPairs - 1))[1])
  if (p.kind === 'leaf-fan') {
    // a fan of five big serrated leaves from one point
    const base: Pt = [cx, h * 0.9]
    const L = Math.min(w * 0.6, h * 0.86)
    const angs = [-90, -58, -122, -28, -152].map((d) => (d * Math.PI) / 180)
    for (const a of angs.slice(1).concat(angs[0])) {
      const tip = polar(base[0], base[1], L * (a === angs[0] ? 1 : 0.86), a)
      outlined(cv, a === angs[0] ? 'primary' : 'secondary', (g) => serratedLeaf(base, add(tip, mulv([Math.cos(a), Math.sin(a)], g)), L * 0.15 + g, 0, 14))
      const v = sub(tip, base)
      cv.pen('outline').fill(petalShape(add(base, mulv(v, 0.15)), add(base, mulv(v, 0.9)), 0.6))
      const vp = cv.pen('outline')
      for (const t of [0.35, 0.55, 0.75]) for (const sd of [-1, 1]) {
        const q = add(base, mulv(v, t)), nn = perp(norm(v))
        vp.fill(petalShape(q, add(add(q, mulv(v, 0.12)), mulv(nn, sd * L * 0.08)), 0.35))
      }
    }
    outlined(cv, 'accent', (g) => circleShape(base[0], base[1], 4 + g))
    return
  }
  const flowers: [Pt, number][] = []
  ys.forEach((y, i) => {
    const L = (w / 2 - 4) * (p.kind === 'tree' ? 0.95 - i * 0.12 : 0.8 - i * 0.08)
    for (const s of [-1, 1]) {
      if (p.kind === 'spray' || p.kind === 'tree') {
        // a branch with a small flower at the end
        const end: Pt = [cx + s * L * 0.9, y - 9]
        outlined(cv, 'secondary', (g) => petalShape([cx, y + 2], end, 1.1 + g, 0.5, 0))
        flowers.push([end, Math.min(7, L * 0.25)])
        outlined(cv, 'primary', (g) => leaf(y + 2, s, L * 0.55, g, -4))
      } else {
        outlined(cv, i % 2 ? 'primary' : 'secondary', (g) => leaf(y, s, L, g, 8))
        cv.pen('outline').fill(petalShape([cx + s * 3, y - 0.5], [cx + s * L * 0.8, y - 6.5], 0.4))
      }
    }
  })
  // head
  const headR = p.kind === 'tree' ? Math.min(w * 0.17, 12) : Math.min(w * 0.36, 22)
  const hc: Pt = [cx, top + headR + 1]
  const head = p.head ?? 'rosette'
  if (head === 'bud') {
    outlined(cv, 'primary', (g) => domeShape([cx, stemTop + 6 + g], [cx, top - g * 0.2], headR * 0.55 + g, 0.55))
    outlined(cv, 'accent', (g) => domeShape([cx, stemTop + 4], [cx, top + 10 - g], headR * 0.25 + g, 0.5))
    for (const s of [-1, 1]) outlined(cv, 'secondary', (g) => petalShape([cx, stemTop + 6], [cx + s * (headR * 0.9 + g), stemTop - 4], 2.4 + g, 0.5, -s * 0.1))
  } else if (head === 'palmette') {
    const sub2 = new Canvas(0, 0)
    void sub2
    const n = 7
    outlined(cv, 'primary', (g) => scallop(polarContour(hc[0], hc[1] + headR * 0.2, (a) => headR * (Math.sin(a) < 0 ? 1 : 0.45) * 0.8 + g, 180), n, 0.32, 'ogee'))
    outlined(cv, 'accent', (g) => domeShape([hc[0], hc[1] + headR * 0.55], [hc[0], hc[1] - headR * 0.55 - g], headR * 0.22 + g))
  } else {
    flowers.push([hc, headR])
  }
  for (const [c, r] of flowers) {
    if (r > 9) { rosetteCore(cv, c[0], c[1], r, { n: 8, style: 'ogee', rings: 1 }, rng); continue }
    const petals = rng.pick([5, 6, 8])
    outlined(cv, 'primary', (g) => scallop(circle(c[0], c[1], r * 0.8 + g), petals, 0.34, 'round', 0.14))
    outlined(cv, 'secondary', (g) => scallop(circle(c[0], c[1], r * 0.45 + g), petals, 0.3, 'round', 0.1, 0.5))
    cv.pen('accent').circle(c[0], c[1], r * 0.16)
  }
}

// ---------------------------------------------------------------- boteh (paisley)

export interface BotehP {
  bend: number
  fill: 'flowers' | 'bands'
  feather?: boolean
}

/** Paisley outline in unit space (bulb near y = -0.45), the tip hooked over to the right. */
function botehUnit(bend: number, n = 260): { C: Contour; bulb: Pt } {
  const u0 = 0.6
  const pivotY = 1 - 2 * u0 // y (up = +) where the bending starts
  const bendPt = (x: number, y: number): Pt => {
    const up = (y + 1) / 2
    if (up <= u0) return [x, -y]
    const k = (up - u0) / (1 - u0)
    const a = bend * k ** 1.6
    const dx = x, dy = -(y - pivotY) // screen coords relative to pivot
    return [dx * Math.cos(a) - dy * Math.sin(a), -pivotY + dx * Math.sin(a) + dy * Math.cos(a)]
  }
  const C: Pt[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU
    C.push(bendPt(Math.sin(t) * Math.sin(t / 2) ** 0.95 * 0.6, Math.cos(t)))
  }
  return { C, bulb: [0, 0.42] }
}

function fitContour(C: Contour, extra: Pt[], x0: number, y0: number, x1: number, y1: number): { C: Contour; extra: Pt[] } {
  const xs = C.map((p) => p[0]), ys = C.map((p) => p[1])
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys)
  const k = Math.min((x1 - x0) / (bx1 - bx0), (y1 - y0) / (by1 - by0))
  const ox = x0 + ((x1 - x0) - (bx1 - bx0) * k) / 2 - bx0 * k, oy = y0 + ((y1 - y0) - (by1 - by0) * k) / 2 - by0 * k
  const f = (p: Pt): Pt => [ox + p[0] * k, oy + p[1] * k]
  return { C: C.map(f), extra: extra.map(f) }
}

export function boteh(cv: Canvas, p: BotehP, rng: Rng) {
  const { w, h } = cv
  const feather = p.feather ?? true
  const pad = feather ? 5 : 2.5
  const unit = botehUnit(p.bend)
  const fit = fitContour(unit.C, [unit.bulb], pad, pad, w - pad, h - pad)
  const C = fit.C
  const hh = (h - 2 * pad) / 2, hw = (w - 2 * pad) / 2
  // find body centre (bulb) for scaling inner bands
  const bulb: Pt = fit.extra[0]
  const shrink = (c: Contour, k: number, toward: Pt = bulb): Contour => c.map((q) => lerp(toward, q, k))
  if (feather) {
    outlined(cv, 'secondary', (g) => scallop(shrink(C, 1 + g / hh), 26, 0.45, 'point', 0.05))
  }
  outlined(cv, 'primary', (g) => contourShape(shrink(C, feather ? 0.94 + g / hh : 1 + g / hh), 64))
  outlined(cv, 'ground', (g) => contourShape(shrink(C, 0.8 + g / hh), 64))
  if (p.fill === 'bands') {
    outlined(cv, 'secondary', (g) => scallop(shrink(C, 0.64 + g / hh), 18, 0.35, 'round', 0.08))
    outlined(cv, 'ground', (g) => contourShape(shrink(C, 0.48 + g / hh), 48))
    outlined(cv, 'accent', (g) => contourShape(shrink(C, 0.3 + g / hh), 40))
  } else {
    // flowers along the spine (midpoints of the two sides), largest in the bulb
    const n = C.length
    const spine = (f: number): [Pt, number] => {
      const i = Math.round(n * f), A = C[i], B = C[n - i]
      return [lerp(A, B, 0.5), dist(A, B) / 2]
    }
    rosetteCore(cv, bulb[0], bulb[1], hw * 0.44, { n: 8, style: 'ogee', rings: 1 }, rng)
    ;[0.3, 0.2, 0.12].forEach((f, j) => {
      const [q, half] = spine(f)
      const r = half * 0.5
      outlined(cv, j % 2 ? 'secondary' : 'primary', (g) => scallop(circle(q[0], q[1], r + g), 6, 0.3, 'round'))
      cv.pen('accent').circle(q[0], q[1], r * 0.4)
    })
    // leaves flanking the bulb
    for (const s2 of [-1, 1]) {
      outlined(cv, 'secondary', (g) => petalShape([bulb[0] + s2 * hw * 0.5, bulb[1] + hh * 0.05], [bulb[0] + s2 * hw * 0.55 + g, bulb[1] - hh * 0.3 - g], hw * 0.1 + g, 0.5, s2 * 0.08))
    }
  }
  // seed at the hooked tip
  const [q0] = ((): [Pt, number] => {
    const i = Math.round(C.length * 0.05)
    return [lerp(C[i], C[C.length - i], 0.5), 0]
  })()
  outlined(cv, 'accent', (g) => circleShape(q0[0], q0[1], 1.6 + g))
}

// ---------------------------------------------------------------- herati

export function herati(cv: Canvas, p: { variant: 'classic' | 'open' }, rng: Rng) {
  const { w, h } = cv
  const cx = w / 2, cy = h / 2
  const R = Math.min(w, h) / 2 - 3
  // diamond lattice stem
  const dia = (k: number, g: number): Pt[] => [[cx, cy - R * k - g], [cx + R * k + g, cy], [cx, cy + R * k + g], [cx - R * k - g, cy]]
  const dp = cv.pen('outline')
  dp.poly(dia(0.74, 1.4))
  dp.poly(dia(0.74, -1.4), true)
  cv.pen('secondary').poly(dia(0.74, 0.7)).poly(dia(0.74, -0.7), true)
  // four curved serrated leaves ("fish") hugging the diamond
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + Math.PI / 4
    const m = rotateM(a - Math.PI / 4, cx, cy)
    const pen = (role: MotifRole) => cv.pen(role, m)
    const leaf = (g: number): Shape => serratedLeaf([cx + R * 0.1, cy - R * 0.66 - g], [cx + R * 0.86 + g, cy - R * 0.2], R * 0.15 + g, 0.12, 16)
    pen('outline').fill(leaf(OW))
    pen('primary').fill(leaf(0))
    pen('secondary').fill(petalShape([cx + R * 0.2, cy - R * 0.6], [cx + R * 0.76, cy - R * 0.25], 0.8, 0.5, 0.12))
  }
  // palmettes on the four tips
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 - Math.PI / 2
    const dir: Pt = [Math.cos(a), Math.sin(a)]
    const b = add([cx, cy], mulv(dir, R * 0.6)), t = add([cx, cy], mulv(dir, R * (p.variant === 'open' ? 0.98 : 0.96)))
    outlined(cv, 'secondary', (g) => domeShape(sub(b, mulv(dir, g)), add(t, mulv(dir, g * 0.5)), R * 0.13 + g, 0.5))
    outlined(cv, 'accent', (g) => domeShape(add(b, mulv(dir, R * 0.08)), add(t, mulv(dir, -R * 0.12 + g)), R * 0.05 + g, 0.5))
  }
  rosetteCore(cv, cx, cy, R * 0.4, { n: 8, style: 'ogee', rings: 1 }, rng)
}

// ---------------------------------------------------------------- gul (Turkmen octagon)

export function gul(cv: Canvas, p: { teeth?: boolean; quarters?: 'tree' | 'hook' }, rng: Rng) {
  const { w, h } = cv
  const cx = w / 2, cy = h / 2
  const rx = w / 2 - (p.teeth ? 7 : 3), ry = h / 2 - (p.teeth ? 7 : 3)
  const oct = (ex: number, ey: number): Pt[] => {
    const c = 0.42
    return [[cx - ex * c, cy - ey], [cx + ex * c, cy - ey], [cx + ex, cy - ey * c], [cx + ex, cy + ey * c], [cx + ex * c, cy + ey], [cx - ex * c, cy + ey], [cx - ex, cy + ey * c], [cx - ex, cy - ey * c]]
  }
  if (p.teeth) {
    // hooked teeth around the gul
    const c = resample(oct(rx + 1, ry + 1), 600)
    outlined(cv, 'secondary', (g) => scallop(offset(c, g), 32, 0.55, 'point', 0, 0.5))
  }
  outlined(cv, 'primary', (g) => polyShape(oct(rx + g, ry + g)))
  outlined(cv, 'ground', (g) => polyShape(oct(rx * 0.86 + g, ry * 0.86 + g)))
  // quarters in alternating colours
  const q = oct(rx * 0.86, ry * 0.86)
  const quads: Pt[][] = [
    [[cx, cy], [cx, cy - ry * 0.86], q[1], q[2], [cx + rx * 0.86, cy]],
    [[cx, cy], [cx + rx * 0.86, cy], q[3], q[4], [cx, cy + ry * 0.86]],
    [[cx, cy], [cx, cy + ry * 0.86], q[5], q[6], [cx - rx * 0.86, cy]],
    [[cx, cy], [cx - rx * 0.86, cy], q[7], q[0], [cx, cy - ry * 0.86]],
  ]
  const qp = cv.pen('secondary')
  qp.poly(quads[0]).poly(quads[2])
  const op = cv.pen('outline')
  op.rect(cx - 0.7, cy - ry * 0.86, 1.4, ry * 1.72).rect(cx - rx * 0.86, cy - 0.7, rx * 1.72, 1.4)
  // a small motif in each quarter, pointing diagonally outward
  quads.forEach((_, i) => {
    const sx = i === 0 || i === 1 ? 1 : -1, sy = i === 1 || i === 2 ? 1 : -1
    const mc: Pt = [cx + sx * rx * 0.4, cy + sy * ry * 0.4]
    const role: MotifRole = i % 2 ? 'secondary' : 'ground'
    void role
    const s = Math.min(rx, ry) * 0.2
    if ((p.quarters ?? 'tree') === 'tree') {
      outlined(cv, 'accent', (g) => polyShape(starPts(mc[0], mc[1], s * 1.25 + g, s * 0.55 + g, 4, Math.PI / 4)))
      cv.pen('outline').circle(mc[0], mc[1], s * 0.25)
    } else {
      outlined(cv, 'accent', (g) => polyShape([[mc[0], mc[1] - s - g], [mc[0] + s + g, mc[1]], [mc[0], mc[1] + s + g], [mc[0] - s - g, mc[1]]]))
      for (const [dx, dy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        cv.pen('primary').poly([[mc[0] + dx * s * 0.9, mc[1] + dy * s * 0.9], [mc[0] + dx * s * 1.5, mc[1] + dy * s * 0.9], [mc[0] + dx * s * 1.5, mc[1] + dy * s * 1.5]])
      }
    }
  })
  // centre diamond
  const s = Math.min(rx, ry) * 0.2
  outlined(cv, 'primary', (g) => polyShape([[cx, cy - s - g], [cx + s * 1.3 + g, cy], [cx, cy + s + g], [cx - s * 1.3 - g, cy]]))
  cv.pen('accent').poly([[cx, cy - s * 0.45], [cx + s * 0.6, cy], [cx, cy + s * 0.45], [cx - s * 0.6, cy]])
  void rng
}

// ---------------------------------------------------------------- star (octagram)

export function star(cv: Canvas, p: { points: number; layers?: number; hooked?: boolean }, rng: Rng) {
  const { w, h } = cv
  const cx = w / 2, cy = h / 2
  const R = Math.min(w, h) / 2 - 2.5
  const n = p.points
  const L = p.layers ?? 3
  const roles: MotifRole[] = ['primary', 'secondary', 'ground', 'accent']
  for (let j = 0; j < L; j++) {
    const r = R * (1 - j * (0.62 / L))
    const ri = r * (n >= 8 ? 0.72 : 0.5)
    outlined(cv, roles[j % roles.length], (g) => polyShape(starPts(cx, cy, r - (j ? 0 : 0) + g * 1.4, ri + g, n, -Math.PI / 2 + (j % 2 ? 0 : 0))))
  }
  if (p.hooked) {
    // small hooks between the arms
    const hp = cv.pen('accent')
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) * TAU) / n
      const c = polar(cx, cy, R * 0.72, a)
      hp.circle(c[0], c[1], R * 0.045)
    }
  }
  rosetteCore(cv, cx, cy, R * 0.3, { n, style: 'point', rings: 1 }, rng)
}

// ---------------------------------------------------------------- kilim lozenge (pixel)

/**
 * Hooked kilim diamond drawn on a knot grid: concentric stepped bands, "ram's horn" hooks on
 * the outer edge, an optional cross at the centre.
 */
export function lozenge(cv: Canvas, p: { cols: number; rows: number; bands: number; hooks?: boolean; cross?: boolean }) {
  const { w, h } = cv
  const cols = p.cols, rows = p.rows
  const cell = Math.min((w - 2) / cols, (h - 2) / rows)
  const x0 = (w - cols * cell) / 2, y0 = (h - rows * cell) / 2
  const hx = (cols - 1) / 2, hy = (rows - 1) / 2
  const grid: string[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'))
  const bandChars = ['P', 'G', 'S', 'A', 'P', 'G']
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = Math.abs(c - hx) / (hx - (p.hooks ? 2 : 0)) + Math.abs(r - hy) / hy
    if (d > 1.0001) continue
    const band = Math.min(p.bands - 1, Math.floor((1 - d) * p.bands * 1.0))
    const edge = d > 1 - 1.2 / Math.max(hx, hy)
    grid[r][c] = edge ? 'O' : bandChars[band]
  }
  if (p.hooks) {
    // hooks off the left/right tips and along the upper edges
    for (const s of [-1, 1]) {
      const tipC = Math.round(hx + s * (hx - 2))
      for (const dy of [-2, -1, 0, 1, 2]) {
        const r = Math.round(hy) + dy, c = tipC + s * (Math.abs(dy) === 2 ? 1 : 0)
        if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === '.') grid[r][c] = 'O'
      }
      for (const dy of [-2, 2]) {
        const r = Math.round(hy) + dy
        const c = tipC + s * 2
        if (c >= 0 && c < cols) grid[r][c] = 'O'
      }
    }
    // little hooks on the diagonals
    for (let k = 1; k <= 2; k++) {
      const t = k / 3
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const c = Math.round(hx + sx * (hx - 2) * (1 - t)), r = Math.round(hy + sy * hy * t)
        const c2 = c + sx, r2 = r + sy
        if (r2 >= 0 && r2 < rows && c2 >= 0 && c2 < cols) grid[r2][c2] = 'O'
        const c3 = c2 + sx
        if (r2 >= 0 && r2 < rows && c3 >= 0 && c3 < cols) grid[r2][c3] = 'O'
        const r3 = r2 - sy
        if (r3 >= 0 && r3 < rows && c3 >= 0 && c3 < cols && grid[r3][c3] === '.') grid[r3][c3] = 'O'
      }
    }
  }
  if (p.cross) {
    const r = Math.round(hy), c = Math.round(hx)
    for (let k = -2; k <= 2; k++) {
      if (grid[r][c + k] !== '.') grid[r][c + k] = 'O'
      if (grid[r + k]?.[c] !== undefined && grid[r + k][c] !== '.') grid[r + k][c] = 'O'
    }
    grid[r][c] = 'A'
  }
  const rowsS = grid.map((r) => r.join(''))
  cv.pen('outline').pixels(rowsS, x0, y0, cell, 'O')
  cv.pen('primary').pixels(rowsS, x0, y0, cell, 'P')
  cv.pen('ground').pixels(rowsS, x0, y0, cell, 'G')
  cv.pen('secondary').pixels(rowsS, x0, y0, cell, 'S')
  cv.pen('accent').pixels(rowsS, x0, y0, cell, 'A')
}

// ---------------------------------------------------------------- endless knot

export function knot(cv: Canvas, rng: Rng) {
  const { w, h } = cv
  const cx = w / 2, cy = h / 2
  const R = Math.min(w, h) / 2 - 2
  const a = R / 1.62
  const band = a * 0.15
  const lines = [-a, -a / 3, a / 3, a]
  // the knot is drawn in a frame turned 45deg; u along x', v along y'
  const m = rotateM(Math.PI / 4, cx, cy)
  const P = (u: number, v: number): Pt => [cx + u, cy + v]
  const strands: Pt[][] = []
  for (const u of lines) strands.push([P(u, -a), P(u, a)])
  for (const v of lines) strands.push([P(-a, v), P(a, v)])
  // loops join neighbouring strand ends outside the square
  const loop = (c: Pt, r: number, a0: number): Pt[] => Array.from({ length: 17 }, (_, i) => polar(c[0], c[1], r, a0 + (Math.PI * i) / 16))
  const loops: Pt[][] = []
  for (const s of [-1, 1]) {
    for (const [l0, l1] of [[-a, -a / 3], [a / 3, a]]) {
      const mid = (l0 + l1) / 2, r = (l1 - l0) / 2
      loops.push(loop(P(mid, s * a), r, s > 0 ? 0 : Math.PI)) // top/bottom
      loops.push(loop(P(s * a, mid), r, s > 0 ? -Math.PI / 2 : Math.PI / 2)) // sides
    }
  }
  const op = cv.pen('outline', m), pp = cv.pen('primary', m)
  for (const s of [...strands, ...loops]) op.ribbon(s, band + 2 * OW, s.length > 2)
  for (const s of [...strands, ...loops]) pp.ribbon(s, band, s.length > 2)
  // over/under: at each crossing redraw the "over" strand
  lines.forEach((u, i) => lines.forEach((v, j) => {
    const vertOver = (i + j) % 2 === 0
    const L = band * 1.9
    const seg: Pt[] = vertOver ? [P(u, v - L), P(u, v + L)] : [P(u - L, v), P(u + L, v)]
    op.ribbon(seg, band + 2 * OW, false)
    const segIn: Pt[] = vertOver ? [P(u, v - L - OW), P(u, v + L + OW)] : [P(u - L - OW, v), P(u + L + OW, v)]
    pp.ribbon(segIn, band, false)
  }))
  // a small jewel in each of the nine cells' centre
  const ap = cv.pen('accent', m)
  for (const u of [-2 * a / 3, 0, 2 * a / 3]) for (const v of [-2 * a / 3, 0, 2 * a / 3]) {
    if (u === 0 && v === 0) continue
    ap.poly([P(u, v - band * 0.6), P(u + band * 0.6, v), P(u, v + band * 0.6), P(u - band * 0.6, v)])
  }
  outlined(cv, 'secondary', (g) => polyShape([[cx, cy - band * 1.3 - g], [cx + band * 1.3 + g, cy], [cx, cy + band * 1.3 + g], [cx - band * 1.3 - g, cy]]))
  void rng
}

// ---------------------------------------------------------------- jaal (lattice field)

export function clipRect(poly: readonly Pt[], x0: number, y0: number, x1: number, y1: number): Pt[] {
  let out: Pt[] = [...poly]
  const edges: [(p: Pt) => number][] = [[(p) => x0 - p[0]], [(p) => p[0] - x1], [(p) => y0 - p[1]], [(p) => p[1] - y1]]
  for (const [f] of edges) {
    const inp = out
    out = []
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length]
      const fa = f(a), fb = f(b)
      if (fa <= 0) out.push(a)
      if (fa < 0 !== fb < 0 && fa !== fb) out.push(lerp(a, b, fa / (fa - fb)))
    }
    if (!out.length) break
  }
  return out
}

/** Ogee-edged diamond cell, as a dense polygon. */
function ogeeCell(cx: number, cy: number, hw: number, hh: number, amp: number, inset = 0): Pt[] {
  const corners: Pt[] = [[cx, cy - hh + inset], [cx + hw - inset, cy], [cx, cy + hh - inset], [cx - hw + inset, cy]]
  const out: Pt[] = []
  for (let e = 0; e < 4; e++) {
    const A = corners[e], B = corners[(e + 1) % 4]
    const nn = perp(norm(sub(B, A)))
    for (let i = 0; i < 12; i++) {
      const t = i / 12
      out.push(add(lerp(A, B, t), mulv(nn, Math.sin(t * TAU) * amp * (e % 2 ? -1 : 1))))
    }
  }
  return out
}

export function jaal(cv: Canvas, p: { cols: number; rows: number; ogee: number }, rng: Rng) {
  const { w, h } = cv
  cv.pen('ground').rect(0, 0, w, h)
  const hw = w / p.cols / 2, hh = h / p.rows / 2
  const amp = p.ogee * Math.min(hw, hh) * 0.18
  const centres: Pt[] = []
  for (let r = 0; r <= p.rows * 2; r++) for (let c = 0; c <= p.cols * 2; c++) if ((r + c) % 2 === 0) centres.push([c * hw, r * hh])
  // lattice band = cell outline minus inset, drawn as outline + secondary
  const lat = (role: MotifRole, thick: number) => {
    const pen = cv.pen(role)
    for (const c of centres) {
      const outer = clipRect(ogeeCell(c[0], c[1], hw, hh, amp, -thick), 0, 0, w, h)
      const innerC = clipRect(ogeeCell(c[0], c[1], hw, hh, amp, thick * 1.4), 0, 0, w, h)
      if (outer.length > 2) pen.poly(outer)
      if (innerC.length > 2) pen.poly(innerC, true)
    }
  }
  lat('outline', 1.9)
  lat('secondary', 0.9)
  // cell motifs: alternating palmette and rosette, nodes get small rosettes
  for (const c of centres) {
    const inner = c[0] > hw * 0.5 && c[0] < w - hw * 0.5 && c[1] > hh * 0.5 && c[1] < h - hh * 0.5
    if (!inner) continue
    const r = Math.min(hw, hh) * 0.42
    const odd = Math.round(c[1] / hh) % 2 === 1
    if (odd) {
      outlined(cv, 'primary', (g) => domeShape([c[0], c[1] + r * 0.9 + g], [c[0], c[1] - r * 1.15 - g], r * 0.55 + g, 0.5))
      outlined(cv, 'accent', (g) => domeShape([c[0], c[1] + r * 0.4], [c[0], c[1] - r * 0.6 - g], r * 0.22 + g, 0.5))
    } else {
      outlined(cv, 'primary', (g) => scallop(circle(c[0], c[1], r * 0.75 + g), 8, 0.32, 'ogee'))
      outlined(cv, 'accent', (g) => circleShape(c[0], c[1], r * 0.3 + g))
    }
  }
  // small rosettes where lattice lines cross
  const seen = new Set<string>()
  for (const c of centres) for (const q of [[c[0] + hw, c[1]], [c[0], c[1] + hh]] as Pt[]) {
    const key = q.map((v) => v.toFixed(2)).join()
    const rr = Math.min(hw, hh) * 0.16
    if (seen.has(key) || q[0] - rr < 1 || q[0] + rr > w - 1 || q[1] - rr < 1 || q[1] + rr > h - 1) continue
    seen.add(key)
    outlined(cv, 'accent', (g) => scallop(circle(q[0], q[1], rr + g), 6, 0.35, 'round', 0.12))
    cv.pen('primary').circle(q[0], q[1], rr * 0.35)
  }
  void rng
  void inside
  void smoothShape
}
