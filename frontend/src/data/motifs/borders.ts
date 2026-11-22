/**
 * Border generators: guard, reciprocal, meander and vine. Each builds one seamless repeat unit
 * (100 tall, runs along +x, rug edge at y = 0) and a matching top-left corner square that is
 * symmetric about its diagonal (see `BorderSpec`).
 *
 * Bands, outside -> in: edge stripe, minor guard, line, main band, line, minor guard, stripe.
 */
import {
  Canvas, I, TAU, ribbonPoly, circleShape, domeShape, lerp, petalShape, polyShape, scallop, starPts, swapXYM,
} from './geom'
import type { Mat, Pen, Pt, Rng, Shape } from './geom'
import { OW, circle, clipRect, outlined, rosetteCore, serratedLeaf } from './pieces'
import type { MotifArt, MotifRole } from './types'

export const BH = 100
const STRIPE = 4.5
const GUARD = 12
const LINE = 2.2
/** Main band top / bottom. */
const M0 = STRIPE + GUARD + LINE
const M1 = BH - M0
const MC = BH / 2

export type GuardPattern = 'beads' | 'teeth' | 'flowers' | 'chevron' | 'none'

interface Frame {
  guard: GuardPattern
  /** Modern borders skip the minor guards and stripes. */
  plain?: boolean
}

/** Bands for the repeat (horizontal rects) or the corner (L shapes about the diagonal). */
function band(cv: Canvas, role: MotifRole, d1: number, d2: number, corner: boolean) {
  const W = cv.w
  if (corner) cv.pen(role).poly([[d1, d1], [W, d1], [W, d2], [d2, d2], [d2, W], [d1, W]])
  else cv.pen(role).rect(0, d1, W, d2 - d1)
}

/** Draw fn into the corner twice (as-is and mirrored across the diagonal), once in a repeat. */
function both(corner: boolean, fn: (m: Mat) => void) {
  fn(I)
  if (corner) fn(swapXYM)
}

/** Polygons tiled across the repeat seam: parts past x = 0 or x = W reappear on the other side. */
function wrapPolys(cv: Canvas, role: MotifRole, polys: Pt[][]) {
  const W = cv.w
  const pen = cv.pen(role)
  for (const poly of polys) for (const dx of [-W, 0, W]) {
    const c = clipRect(poly.map(([x, y]): Pt => [x + dx, y]), 0, 0, W, BH)
    if (c.length > 2) pen.poly(c)
  }
}
function wrapped(cv: Canvas, role: MotifRole, make: (g: number) => Pt[][]) {
  wrapPolys(cv, 'outline', make(OW))
  wrapPolys(cv, role, make(0))
}
/** A ribbon clipped to the canvas (for corner stubs that must end exactly on the edge). */
function clippedRibbon(cv: Canvas, role: MotifRole, pts: Pt[], w: number, m: Mat = I) {
  const n = pts.length
  const ext: Pt[] = [...pts, [pts[n - 1][0] + (pts[n - 1][0] - pts[n - 2][0]) * 3, pts[n - 1][1] + (pts[n - 1][1] - pts[n - 2][1]) * 3]]
  const c = clipRect(ribbonPoly(ext, w), 0, 0, cv.w, cv.h)
  if (c.length > 2) cv.pen(role, m).poly(c)
}

/** A seamless stem: a ribbon whose ends run past the seam are clipped and wrapped. */
function stem(cv: Canvas, role: MotifRole | null, pts: Pt[], w: number) {
  const W = cv.w
  // extend one sample past each end so the clipped band is square to the seam
  const n = pts.length
  const ext: Pt[] = [[pts[0][0] - (pts[1][0] - pts[0][0]), pts[0][1] - (pts[1][1] - pts[0][1])], ...pts, [pts[n - 1][0] + (pts[n - 1][0] - pts[n - 2][0]), pts[n - 1][1] + (pts[n - 1][1] - pts[n - 2][1])]]
  if (role) wrapPolys(cv, role, [ribbonPoly(ext, w)].map((p) => p.map(([x, y]): Pt => [Math.min(W * 2, Math.max(-W, x)), y])))
}
const ngon = (cx: number, cy: number, r: number, n = 28): Pt[] => Array.from({ length: n }, (_, i): Pt => [cx + r * Math.cos((i / n) * TAU), cy + r * Math.sin((i / n) * TAU)])

function guardMotif(cv: Canvas, pat: GuardPattern, x: number, y: number, s: number, m: Mat, up: boolean) {
  const pen = (r: MotifRole) => cv.pen(r, m)
  switch (pat) {
    case 'beads':
      pen('outline').circle(x, y, s * 0.42 + OW * 0.6)
      pen('accent').circle(x, y, s * 0.42)
      break
    case 'flowers':
      pen('outline').fill(scallop(circle(x, y, s * 0.36 + OW * 0.6), 4, 0.4, 'round', 0.15))
      pen('primary').fill(scallop(circle(x, y, s * 0.36), 4, 0.4, 'round', 0.15))
      pen('accent').circle(x, y, s * 0.14)
      break
    case 'teeth': {
      const t = up ? -1 : 1
      pen('primary').poly([[x - s / 2, y - (t * s) / 2], [x + s / 2, y - (t * s) / 2], [x, y + (t * s) / 2]])
      break
    }
    case 'chevron':
      pen('primary').poly([[x - s * 0.5, y - s * 0.3], [x, y + s * 0.2], [x + s * 0.5, y - s * 0.3], [x + s * 0.5, y + s * 0.05], [x, y + s * 0.55], [x - s * 0.5, y + s * 0.05]])
      break
    default:
  }
}

/** Frame bands plus minor guard ornaments for a repeat or a corner. */
function frame(cv: Canvas, f: Frame, corner: boolean) {
  const W = cv.w
  if (f.plain) {
    band(cv, 'outline', 0, 3, corner)
    band(cv, 'ground', 3, BH - 3, corner)
    band(cv, 'outline', BH - 3, BH, corner)
    return
  }
  band(cv, 'outline', 0, STRIPE, corner)
  band(cv, 'secondary', STRIPE, STRIPE + GUARD, corner)
  band(cv, 'outline', STRIPE + GUARD, M0, corner)
  band(cv, 'ground', M0, M1, corner)
  band(cv, 'outline', M1, M1 + LINE, corner)
  band(cv, 'secondary', M1 + LINE, BH - STRIPE, corner)
  band(cv, 'outline', BH - STRIPE, BH, corner)
  if (f.guard === 'none') return
  const s = GUARD * 0.78
  const gy = [STRIPE + GUARD / 2, M1 + LINE + GUARD / 2]
  if (!corner) {
    const k = Math.max(1, Math.round(W / (s * 1.35)))
    for (let i = 0; i < k; i++) {
      const x = ((i + 0.5) * W) / k
      gy.forEach((y, j) => guardMotif(cv, f.guard, x, y, s, I, j === 0))
    }
    return
  }
  // corner: along both arms of each guard L, from the far edge inward
  const step = s * 1.35
  gy.forEach((y, j) => {
    both(true, (m) => {
      for (let x = W - step / 2; x > y + step * 0.5; x -= step) guardMotif(cv, f.guard, x, y, s, m, j === 0)
    })
    guardMotif(cv, f.guard, y, y, s, I, j === 0)
  })
}

/** Cornerpiece: a rosette on the diagonal of the main band. */
function cornerRosette(cv: Canvas, rng: Rng, n = 8, scale = 1) {
  rosetteCore(cv, MC, MC, (M1 - M0) * 0.42 * scale, { n, style: 'ogee', rings: 1 }, rng)
}

export interface BorderArt {
  repeat: MotifArt
  corner: MotifArt
}

function build(W: number, draw: (cv: Canvas, corner: boolean) => void): BorderArt {
  const r = new Canvas(W, BH)
  draw(r, false)
  const c = new Canvas(BH, BH)
  draw(c, true)
  return { repeat: r.toArt(), corner: c.toArt() }
}

// ---------------------------------------------------------------- guard

export type GuardVariant = 'herati' | 'crescent' | 'cypress'

export function guardBorder(p: { variant: GuardVariant; guard: GuardPattern; aspect: number }, rng: Rng): BorderArt {
  return build(BH * p.aspect, (cv, corner) => {
    frame(cv, { guard: p.guard }, corner)
    if (corner) {
      if (p.variant === 'cypress') {
        // a cypress pointing into the corner along the diagonal
        outlined(cv, 'primary', (g) => domeShape([M1 - 4 + g, M1 - 4 + g], [M0 + 4 - g, M0 + 4 - g], 9 + g, 0.55))
        outlined(cv, 'accent', (g) => domeShape([M1 - 12, M1 - 12], [M0 + 14 - g, M0 + 14 - g], 3.5 + g, 0.5))
      } else cornerRosette(cv, rng)
      return
    }
    const W = cv.w
    const half = (M1 - M0) / 2
    if (p.variant === 'herati') {
      // thin vine behind, rosettes alternating with herati diamonds
      const vp: Pt[] = []
      for (let i = 0; i <= 40; i++) vp.push([(W * i) / 40, MC + Math.sin((i / 40) * TAU * 2) * half * 0.42])
      stem(cv, 'outline', vp, 4.4)
      stem(cv, 'secondary', vp, 2.2)
      rosetteCore(cv, W * 0.25, MC, half * 0.98, { n: 8, style: 'ogee', rings: 2 }, rng)
      const x = W * 0.75, r = half * 0.92
      outlined(cv, 'primary', (g) => polyShape([[x, MC - r - g], [x + r * 1.25 + g, MC], [x, MC + r + g], [x - r * 1.25 - g, MC]]))
      outlined(cv, 'ground', (g) => polyShape([[x, MC - r * 0.62 - g], [x + r * 0.8 + g, MC], [x, MC + r * 0.62 + g], [x - r * 0.8 - g, MC]]))
      for (const s of [-1, 1]) outlined(cv, 'secondary', (g) => petalShape([x - s * r * 0.55, MC + s * r * 0.08], [x + s * r * 0.55, MC - s * r * 0.08 - g], r * 0.16 + g, 0.5, s * 0.1))
      outlined(cv, 'accent', (g) => circleShape(x, MC, r * 0.16 + g))
    } else if (p.variant === 'crescent') {
      // facing crescents (S-curls) with small diamonds between
      const k = 2
      for (let i = 0; i < k; i++) {
        const x = (W * (i + 0.5)) / k
        for (const s of [-1, 1]) {
          const cxx = x + s * half * 0.42
          outlined(cv, 'primary', (g) => ({
            start: [cxx, MC - half * 0.78 - g],
            segs: [
              [[cxx - s * half * 0.95 - s * g, MC - half * 0.7], [cxx - s * half * 0.95 - s * g, MC + half * 0.7], [cxx, MC + half * 0.78 + g]],
              [[cxx - s * half * 0.45, MC + half * 0.5], [cxx - s * half * 0.45, MC - half * 0.5], [cxx, MC - half * 0.78 - g]],
            ],
          }))
        }
        outlined(cv, 'accent', (g) => polyShape([[x, MC - half * 0.32 - g], [x + half * 0.22 + g, MC], [x, MC + half * 0.32 + g], [x - half * 0.22 - g, MC]]))
        const xm = (W * i) / k
        wrapped(cv, 'secondary', (g) => [starPts(xm, MC, half * 0.36 + g, half * 0.16 + g, 4, -Math.PI / 2)])
      }
    } else {
      // cypress trees alternating with flowering shrubs (tree-of-life band)
      const k = 4
      for (let i = 0; i < k; i++) {
        const x = (W * (i + 0.5)) / k
        if (i % 2 === 0) {
          cv.pen('outline').rect(x - 1.2, M1 - 8, 2.4, 6)
          outlined(cv, 'primary', (g) => serratedLeaf([x, M1 - 6 + g], [x, M0 + 3 - g], half * 0.3 + g, 0, 14))
          outlined(cv, 'secondary', (g) => domeShape([x, M1 - 12], [x, M0 + 12 - g], half * 0.12 + g, 0.55))
          cv.pen('outline').rect(x - 0.5, M0 + 16, 1, M1 - M0 - 30)
        } else {
          outlined(cv, 'secondary', (g) => polyShape([[x - 1.6 - g, MC - 6], [x + 1.6 + g, MC - 6], [x + 1.6 + g, M1 - 2], [x - 1.6 - g, M1 - 2]]))
          for (const s of [-1, 1]) for (const [y, L] of [[MC + 2, 0.62], [MC + 14, 0.5]]) {
            outlined(cv, 'secondary', (g) => serratedLeaf([x, y + 4], [x + s * (half * L + g), y - 6], 3.4 + g, -s * 0.06, 8))
          }
          rosetteCore(cv, x, M0 + half * 0.5, half * 0.44, { n: 6, style: 'round', rings: 1 }, rng)
        }
      }
    }
  })
}

// ---------------------------------------------------------------- reciprocal

export type ReciprocalVariant = 'sawtooth' | 'trefoil' | 'lozenge'

export function reciprocalBorder(p: { variant: ReciprocalVariant; guard: GuardPattern; aspect: number; teeth: number }, rng: Rng): BorderArt {
  return build(BH * p.aspect, (cv, corner) => {
    frame(cv, { guard: p.guard }, corner)
    if (corner) {
      if (p.variant === 'lozenge') {
        const r = (M1 - M0) * 0.4
        outlined(cv, 'primary', (g) => polyShape(starPts(MC, MC, r + g, r * 0.45 + g, 8, -Math.PI / 2)))
        outlined(cv, 'secondary', (g) => polyShape(starPts(MC, MC, r * 0.58 + g, r * 0.3 + g, 8, -Math.PI / 2 + Math.PI / 8)))
        cv.pen('accent').circle(MC, MC, r * 0.16)
      } else cornerRosette(cv, rng, 8, 0.95)
      return
    }
    const W = cv.w
    const n = p.teeth
    const s = W / n
    const H = M1 - M0
    if (p.variant === 'sawtooth') {
      const zig: Pt[] = []
      for (let i = 0; i <= n * 2; i++) zig.push([(i * s) / 2, i % 2 ? M0 + H * 0.78 : M0 + H * 0.22])
      cv.pen('primary').poly([[0, M0], [W, M0], ...zig.slice().reverse()])
      stem(cv, 'outline', zig, 2.4)
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * s
        outlined(cv, 'accent', (g) => polyShape([[x, M0 + H * 0.2 - g], [x + s * 0.13 + g, M0 + H * 0.32], [x, M0 + H * 0.44 + g], [x - s * 0.13 - g, M0 + H * 0.32]]))
      }
      for (let i = 0; i < n; i++) {
        const x = i * s
        wrapped(cv, 'secondary', (g) => [[[x, M0 + H * 0.56 - g], [x + s * 0.13 + g, M0 + H * 0.68], [x, M0 + H * 0.8 + g], [x - s * 0.13 - g, M0 + H * 0.68]]])
      }
    } else if (p.variant === 'trefoil') {
      const tooth = (x: number, down: boolean, g: number): Pt[][] => {
        const d = down ? 1 : -1
        const y0 = down ? M0 : M1
        const neck = y0 + d * H * 0.38, head = y0 + d * H * 0.6
        const r = s * 0.16
        return [
          [[x - s * 0.24 - g, y0], [x + s * 0.24 + g, y0], [x + s * 0.09 + g, neck], [x - s * 0.09 - g, neck]],
          ngon(x, head, r + g),
          ngon(x - r * 1.15, head - d * r * 0.9, r * 0.8 + g),
          ngon(x + r * 1.15, head - d * r * 0.9, r * 0.8 + g),
          [[x - s * 0.09 - g, neck - d], [x + s * 0.09 + g, neck - d], [x + s * 0.05 + g, head], [x - s * 0.05 - g, head]],
        ]
      }
      for (let i = 0; i < n; i++) wrapped(cv, 'primary', (g) => tooth((i + 0.5) * s, true, g))
      for (let i = 0; i < n; i++) wrapped(cv, 'secondary', (g) => tooth(i * s, false, g))
      for (let i = 0; i < n; i++) cv.pen('accent').circle((i + 0.5) * s, M0 + H * 0.6, s * 0.06)
    } else {
      // chain of stepped lozenges, half-triangles off both edges
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * s
        const rx = s * 0.46, ry = H * 0.42
        const step = (k: number, g: number): Shape => {
          const ex = rx * k + g, ey = ry * k + g
          const pts: Pt[] = []
          const st = 4
          for (let j = 0; j < st; j++) pts.push([x + (ex * j) / st, MC - ey + (ey * j) / st], [x + (ex * (j + 1)) / st, MC - ey + (ey * j) / st])
          const q = pts.slice()
          const full: Pt[] = [...q, ...q.map(([a, b]): Pt => [a, 2 * MC - b]).reverse()]
          const left = full.map(([a, b]): Pt => [2 * x - a, b]).reverse()
          return polyShape([...full, ...left])
        }
        outlined(cv, 'primary', (g) => step(1, g))
        outlined(cv, 'ground', (g) => step(0.64, g))
        outlined(cv, 'secondary', (g) => step(0.34, g))
        cv.pen('accent').circle(x, MC, Math.min(rx, ry) * 0.1)
        // triangles in the gaps
        const xg = i * s
        wrapped(cv, 'accent', (g) => [[[xg - s * 0.16 - g, M0], [xg + s * 0.16 + g, M0], [xg, M0 + H * 0.3 + g]], [[xg - s * 0.16 - g, M1], [xg + s * 0.16 + g, M1], [xg, M1 - H * 0.3 - g]]])
      }
    }
  })
}

// ---------------------------------------------------------------- meander

export type MeanderVariant = 'key' | 'wave' | 'swirl'

const KEY = ['PPPPPPP.', 'P.....P.', 'P.PPP.P.', 'P.P.P.P.', 'P.P...P.', 'P.PPPPP.', 'P.......', 'PPPPPPPP']

export function meanderBorder(p: { variant: MeanderVariant; periods: number }, rng: Rng): BorderArt {
  const H = M1 - M0
  if (p.variant === 'key') {
    const cell = H / 8
    const W = cell * 8 * p.periods
    return build(W, (cv, corner) => {
      frame(cv, { guard: 'beads' }, corner)
      if (corner) {
        const rows = ['........', '.PPPPPP.', '.P....P.', '.P.PP.P.', '.P.PP.P.', '.P....P.', '.PPPPPP.', '........']
        cv.pen('outline').pixels(rows, M0, M0, cell, 'P', 0.5)
        cv.pen('primary').pixels(rows, M0, M0, cell, 'P')
        cv.pen('accent').rect(M0 + cell * 3, M0 + cell * 3, cell * 2, cell * 2)
        return
      }
      const rows = KEY.map((r) => r.repeat(p.periods))
      cv.pen('outline').pixels(rows, 0, M0, cell, 'P', 0.5, [0, 0, W, BH])
      cv.pen('primary').pixels(rows, 0, M0, cell, 'P', 0, [0, 0, W, BH])
    })
  }
  if (p.variant === 'wave') {
    const W = BH * 3
    return build(W, (cv, corner) => {
      frame(cv, { guard: 'none', plain: true }, corner)
      const roles: MotifRole[] = ['secondary', 'primary', 'accent']
      roles.forEach((role, j) => {
        const amp = 14 - j * 3, y0 = 36 + j * 14, wdt = 12 - j * 2
        if (corner) {
          // the ribbon turns the corner on a quarter circle about the inner corner
          const r = BH - y0
          const arc: Pt[] = []
          for (let i = 0; i <= 24; i++) {
            const a = (Math.PI / 2) * (i / 24)
            arc.push([BH - r * Math.sin(a), BH - r * Math.cos(a)])
          }
          clippedRibbon(cv, role, [[BH + 1, y0], ...arc.slice(1, -1), [y0, BH + 1]], wdt)
          return
        }
        const pts: Pt[] = []
        for (let i = 0; i <= 60; i++) {
          const x = (W * i) / 60
          pts.push([x, y0 + Math.sin((x / W) * TAU * (j + 1)) * amp])
        }
        stem(cv, role, pts, wdt)
      })
    })
  }
  // swirl: running-dog curls on a carved ground
  const W = H * 1.4 * p.periods
  return build(W, (cv, corner) => {
    frame(cv, { guard: 'none', plain: true }, corner)
    const curl = (cx: number, cy: number, r: number, dir: number, m: Mat) => {
      const pts: Pt[] = []
      for (let i = 0; i <= 40; i++) {
        const t = i / 40
        const a = dir * t * TAU * 1.15
        const rr = r * (1 - t * 0.78)
        pts.push([cx + rr * Math.cos(a + Math.PI / 2) * dir, cy + rr * Math.sin(a + Math.PI / 2)])
      }
      cv.pen('outline', m).ribbon(pts, (t) => 7 * (1 - t * 0.55))
      cv.pen(dir > 0 ? 'primary' : 'secondary', m).ribbon(pts, (t) => 4.4 * (1 - t * 0.6))
    }
    if (corner) {
      curl(MC, MC, H * 0.4, 1, I)
      return
    }
    const s = W / p.periods
    const base: Pt[] = []
    for (let i = 0; i <= 60; i++) base.push([(W * i) / 60, MC + Math.sin(((W * i) / 60 / s) * TAU) * H * 0.08])
    stem(cv, 'outline', base, 6)
    stem(cv, 'accent', base, 3.4)
    for (let i = 0; i < p.periods; i++) {
      curl((i + 0.25) * s, MC - H * 0.16, H * 0.28, 1, I)
      curl((i + 0.75) * s, MC + H * 0.16, H * 0.28, -1, I)
    }
    void rng
  })
}

// ---------------------------------------------------------------- vine

export type VineVariant = 'scroll' | 'lotus'

export function vineBorder(p: { variant: VineVariant; guard: GuardPattern; aspect: number }, rng: Rng): BorderArt {
  const H = M1 - M0
  const amp = H * 0.22
  return build(BH * p.aspect, (cv, corner) => {
    frame(cv, { guard: p.guard }, corner)
    const W = cv.w
    const stemW = 3.2
    const flower = (x: number, y: number, dir: number, m: Mat) => {
      // dir -1 = pointing up (toward rug edge), +1 = down
      const L = H * 0.5
      if (p.variant === 'lotus') {
        for (const s of [-1, 1]) outlined(cv, 'primary', (g) => petalShape([x, y], [x + s * (L * 0.55 + g), y + dir * (L * 0.75 + g)], L * 0.16 + g, 0.5, s * dir * -0.08), OW, m)
        outlined(cv, 'secondary', (g) => domeShape([x, y], [x, y + dir * (L + g)], L * 0.26 + g, 0.55), OW, m)
        outlined(cv, 'accent', (g) => domeShape([x, y + dir * L * 0.15], [x, y + dir * (L * 0.62 + g)], L * 0.1 + g, 0.5), OW, m)
      } else {
        const c: Pt = [x, y + dir * L * 0.52]
        outlined(cv, 'primary', (g) => scallop(circle(c[0], c[1], L * 0.4 + g), 7, 0.36, 'ogee', 0.1), OW, m)
        outlined(cv, 'secondary', (g) => scallop(circle(c[0], c[1], L * 0.22 + g), 7, 0.3, 'round', 0.1, 0.5), OW, m)
        cv.pen('accent', m).circle(c[0], c[1], L * 0.09)
      }
    }
    const leaf = (x: number, y: number, dir: number, side: number, m: Mat) => {
      outlined(cv, 'secondary', (g) => serratedLeaf([x, y], [x + side * (H * 0.26 + g), y + dir * (H * 0.3 + g)], H * 0.065 + g, side * 0.05, 10), OW, m)
    }
    if (corner) {
      // stubs from the corner rosette that meet the strip's stem at the edges
      both(true, (m) => {
        const pts: Pt[] = []
        for (let i = 0; i <= 20; i++) {
          const x = MC + ((W - MC) * i) / 20
          const t = (x - MC) / (W - MC)
          const sm = t * t * (3 - 2 * t)
          pts.push([x, MC + Math.sin(((x - W) / W) * TAU) * amp * sm])
        }
        clippedRibbon(cv, 'outline', pts, stemW + 2 * OW, m)
        clippedRibbon(cv, 'primary', pts, stemW, m)
        leaf(MC + H * 0.42, MC, 1, 1, m)
      })
      cornerRosette(cv, rng, 8, 0.85)
      return
    }
    const pts: Pt[] = []
    for (let i = 0; i <= 80; i++) {
      const x = (W * i) / 80
      pts.push([x, MC + Math.sin((x / W) * TAU) * amp])
    }
    stem(cv, 'outline', pts, stemW + 2 * OW)
    stem(cv, 'primary', pts, stemW)
    // flowers at the crests, opening away from the stem; leaves where the stem crosses the centre
    flower(W * 0.25, MC + amp - 1, -1, I)
    flower(W * 0.75, MC - amp + 1, 1, I)
    leaf(W * 0.5, MC, -1, 1, I)
    leaf(W * 0.5, MC, 1, -1, I)
    // tendril buds in the hollows
    for (const [x, y, d] of [[W * 0.25, MC - amp - 2, -1], [W * 0.75, MC + amp + 2, 1]]) {
      // a bud on a short stalk in each hollow, and leaves either side of it
      outlined(cv, 'accent', (g) => domeShape([x, y - d * 2], [x, y + d * (H * 0.2 + g)], H * 0.06 + g, 0.5))
      for (const s of [-1, 1]) leaf(x + s * H * 0.08, y - d * 3, d, s, I)
    }
    leaf(W * 0.12, MC + amp * 0.45, -1, -1, I)
    leaf(W * 0.88, MC - amp * 0.45, 1, 1, I)
    void lerp
  })
}

export type { Pen }
