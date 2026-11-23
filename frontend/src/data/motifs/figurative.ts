/**
 * Animals (tribal knot-grid figures and a vector peacock), modern carved panels (Voronoi mosaics,
 * cobblestones, colour fields) and organic tufted shapes (from the traced sheet-3 outlines).
 */
import { TRACED_SHAPES } from '../shapeLibraryTraced'
import {
  Canvas, TAU, centroid, circleShape, ellipseShape, inset, lerp, makeRng, petalShape, polar, resample,
  smoothShape, verticalHits, voronoi, domeShape, polyShape,
} from './geom'
import type { Pt, Rng, Shape } from './geom'
import { OW, outlined } from './pieces'
import type { MotifRole } from './types'

// ---------------------------------------------------------------- tribal animals

/** Knot-grid figures. P body, S second colour, A accent (eye/beak), . empty. Facing right. */
const ANIMALS = {
  hound: [
    '........................',
    '...................PP...',
    '..................PPPP..',
    '.................PPAPPPP',
    '.................PPPPPPP',
    '................PPPP....',
    'P..............PPPP.....',
    'PP.............PPPP.....',
    '.PP...PPPPPPPPPPPPP.....',
    '..PPPPPPPPPPPPPPPPP.....',
    '...PPSPSPSPSPSPSPPP.....',
    '...PPPPPPPPPPPPPPPP.....',
    '...PP.PP......PP.PP.....',
    '...PP..PP.....PP..PP....',
    '...P....P.....P....P....',
    '..PP...PP....PP...PP....',
  ],
  lion: [
    '..................SSS.....',
    '................SSSSSSS...',
    '...............SSSPPPSSS..',
    '..............SSSPAPPPPS..',
    '..PP..........SSSPPPPPPP..',
    '.P..P.........SSSPPPPPP...',
    '.P..P.........SSSSPPPPS...',
    '..P...........SSSSSSSSS...',
    '..P..PPPPPPPPPPSSSSSSS....',
    '...PPPPPPPPPPPPPSSSSSS....',
    '...PPPPPPPPPPPPPPSSS......',
    '...PPPSPPSPPSPPPPPPP......',
    '...PPPPPPPPPPPPPPPPP......',
    '...PPP.PPP....PPP.PPP.....',
    '...PP...PP....PP...PP.....',
    '...PP...PP....PP...PP.....',
    '..PPP..PPP...PPP..PPP.....',
  ],
  bird: [
    '...........PP...',
    '..........PPPP..',
    '.........PPSPPA.',
    '.........PPPPAAA',
    '.SS.....PPPP....',
    'SSSS...PPPPP....',
    '.SSSSPPPPPPP....',
    '..SSPSPSPSPP....',
    '...SPPPPPPP.....',
    '.....PPPPP......',
    '......P..P......',
    '.....PP.PP......',
  ],
  camel: [
    '.....................PP.',
    '....................PAPP',
    '....................PPPP',
    '.........PP........PP...',
    '........PPPP.......PP...',
    '.......PPPPPP......PP...',
    '.....PPPPPPPPP....PPP...',
    '....PPPPSPSPSPPPPPPP....',
    '...PPPPPPPPPPPPPPPPP....',
    '..P.PPPPPPPPPPPPPP......',
    '..P..PP.PP....PP.PP.....',
    '.....PP..PP...PP..PP....',
    '.....P....P...P....P....',
    '.....P....P...P....P....',
    '....PP...PP..PP...PP....',
  ],
} as const

export type AnimalKind = keyof typeof ANIMALS | 'peacock'

function pixelFigure(cv: Canvas, rows: readonly string[], mirror: boolean) {
  const { w, h } = cv
  const cols = rows[0].length
  const cell = Math.min((w - 4) / cols, (h - 4) / rows.length)
  const x0 = (w - cols * cell) / 2, y0 = (h - rows.length * cell) / 2
  const rr = mirror ? rows.map((r) => [...r].reverse().join('')) : rows
  cv.pen('outline').pixels(rr, x0, y0, cell, 'PSA', OW)
  cv.pen('primary').pixels(rr, x0, y0, cell, 'P')
  cv.pen('secondary').pixels(rr, x0, y0, cell, 'S')
  cv.pen('accent').pixels(rr, x0, y0, cell, 'A')
}

function peacock(cv: Canvas) {
  const { w, h } = cv
  const cx = w * 0.44, by = h - 4
  // fanned tail of eyed feathers behind the body
  const fc: Pt = [cx - 2, h * 0.66]
  const R = Math.min(h * 0.6, w * 0.5)
  const feathers = 9
  for (let i = 0; i < feathers; i++) {
    const a = Math.PI * (1.08 + (0.84 * i) / (feathers - 1))
    const tip = polar(fc[0], fc[1], R, a)
    outlined(cv, 'secondary', (g) => petalShape(fc, polar(fc[0], fc[1], R + g, a), R * 0.13 + g, 0.72))
    const eye = polar(fc[0], fc[1], R * 0.8, a)
    outlined(cv, 'primary', (g) => circleShape(eye[0], eye[1], R * 0.085 + g))
    cv.pen('accent').circle(eye[0], eye[1], R * 0.04)
    void tip
  }
  // body, neck and head
  outlined(cv, 'primary', (g) => ({
    start: [cx - 12 - g, h * 0.7],
    segs: [
      [[cx - 13 - g, h * 0.52], [cx - 2, h * 0.5], [cx + 2, h * 0.4]],
      [[cx + 5, h * 0.3], [cx + 4, h * 0.2], [cx + 8, h * 0.14 - g]],
      [[cx + 12 + g, h * 0.1], [cx + 16 + g, h * 0.16], [cx + 13 + g, h * 0.21]],
      [[cx + 10, h * 0.26], [cx + 11, h * 0.36], [cx + 14 + g, h * 0.46]],
      [[cx + 19 + g, h * 0.6], [cx + 12, h * 0.76 + g], [cx - 2, h * 0.78 + g]],
      [[cx - 8, h * 0.78 + g], [cx - 12 - g, h * 0.75], [cx - 12 - g, h * 0.7]],
    ],
  }))
  // wing
  outlined(cv, 'secondary', (g) => petalShape([cx - 7, h * 0.58], [cx + 12 + g, h * 0.7], 4.5 + g, 0.4, 0.06))
  // beak, eye, crest
  cv.pen('outline').poly([[cx + 15, h * 0.13], [cx + 20, h * 0.16], [cx + 15, h * 0.18]])
  cv.pen('accent').circle(cx + 11.5, h * 0.145, 1.1)
  for (let i = 0; i < 3; i++) {
    const tip: Pt = [cx + 6 + i * 3, h * 0.04 + (i === 1 ? -1 : 0) + 2]
    cv.pen('outline').fill(petalShape([cx + 9, h * 0.11], tip, 0.35))
    outlined(cv, 'accent', (g) => circleShape(tip[0], tip[1], 1.2 + g))
  }
  // legs
  const lp = cv.pen('outline')
  for (const dx of [-4, 3]) {
    lp.rect(cx + dx, h * 0.77, 1.2, by - h * 0.77 - 1)
    lp.rect(cx + dx - 2.2, by - 1.4, 5.6, 1.2)
  }
}

export function animal(cv: Canvas, p: { kind: AnimalKind; mirror?: boolean }) {
  if (p.kind === 'peacock') peacock(cv)
  else pixelFigure(cv, ANIMALS[p.kind], !!p.mirror)
}

// ---------------------------------------------------------------- modern panels

function sites(rng: Rng, n: number, w: number, h: number, relax = 2): Pt[] {
  let s: Pt[] = Array.from({ length: n }, () => [rng.range(2, w - 2), rng.range(2, h - 2)] as Pt)
  for (let k = 0; k < relax; k++) s = voronoi(s, 0, 0, w, h).map(centroid)
  return s
}

/** Smooth closed outline that keeps the polygon's corners rounded by `r`. */
function roundPoly(poly: readonly Pt[], k = 0.32): Shape {
  const pts: Pt[] = []
  poly.forEach((p, i) => {
    const a = poly[(i - 1 + poly.length) % poly.length], b = poly[(i + 1) % poly.length]
    pts.push(lerp(p, a, k * 0.5), lerp(p, b, k * 0.5))
  })
  return smoothShape(pts, 0.9)
}

export type PanelKind = 'mosaic' | 'cobble' | 'field' | 'terrazzo'

export function panel(cv: Canvas, p: { kind: PanelKind; cells?: number }, rng: Rng) {
  const { w, h } = cv
  const roles: MotifRole[] = ['primary', 'secondary', 'accent', 'ground']
  if (p.kind === 'field') {
    cv.pen('ground').rect(0, 0, w, h)
    const blobs = p.cells ?? 5
    for (let i = 0; i < blobs; i++) {
      const c: Pt = [rng.range(w * 0.15, w * 0.85), rng.range(h * 0.15, h * 0.85)]
      const r = rng.range(0.22, 0.4) * Math.min(w, h)
      const pts: Pt[] = Array.from({ length: 7 }, (_, j) => {
        const a = (j / 7) * TAU + rng.range(-0.25, 0.25)
        const q = polar(c[0], c[1], r * rng.range(0.7, 1.25), a)
        return [Math.min(w - 1.5, Math.max(1.5, q[0])), Math.min(h - 1.5, Math.max(1.5, q[1]))] as Pt
      })
      const role = roles[i % 3]
      cv.pen('outline').fill(smoothShape(pts.map((q) => lerp(c, q, 1.04))))
      cv.pen(role).fill(smoothShape(pts))
    }
    return
  }
  const n = p.cells ?? 16
  const cells = voronoi(sites(rng, n, w, h, p.kind === 'mosaic' ? 1 : 3), 0, 0, w, h)
  cv.pen(p.kind === 'cobble' ? 'secondary' : 'outline').rect(0, 0, w, h)
  cells.forEach((poly, i) => {
    if (p.kind === 'cobble') {
      const ins = inset(poly, 1.8)
      cv.pen(i % 5 === 0 ? 'accent' : 'primary').fill(roundPoly(ins, 0.7))
      return
    }
    if (p.kind === 'terrazzo') {
      const ins = inset(poly, 0.9)
      cv.pen('ground').poly(ins)
      const c = centroid(ins)
      const chip: Pt[] = Array.from({ length: 5 }, (_, j) => polar(c[0], c[1], rng.range(1.2, 3.2), (j / 5) * TAU + rng.range(0, 0.6)))
      cv.pen(roles[i % 3]).poly(chip)
      return
    }
    const ins = inset(poly, 0.75)
    const role = roles[(i * 7 + rng.int(0, 3)) % 4]
    cv.pen(role).poly(ins)
    if (i % 4 === 1) {
      // carved ribs inside some tiles
      const xs = ins.map((q) => q[0])
      const rp = cv.pen('outline')
      for (let x = Math.min(...xs) + 1.6; x < Math.max(...xs) - 0.8; x += 2.4) {
        const ys = verticalHits(ins, x)
        for (let k = 0; k + 1 < ys.length; k += 2) if (ys[k + 1] - ys[k] > 1.6) rp.rect(x, ys[k] + 0.6, 0.45, ys[k + 1] - ys[k] - 1.2)
      }
    }
  })
}

// ---------------------------------------------------------------- organic tufted shapes

export type OrganicStyle = 'pebble' | 'splash' | 'ribbed' | 'ribbon' | 'fringed'

const TRACED = new Map(TRACED_SHAPES.map((s) => [s.id, s.points]))

/** Traced outline fitted into the canvas with padding, as a closed point list. */
function fitted(cv: Canvas, id: string, pad: number): Pt[] {
  const pts = TRACED.get(id) ?? []
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const k = Math.min((cv.w - 2 * pad) / (x1 - x0), (cv.h - 2 * pad) / (y1 - y0))
  const ox = (cv.w - (x1 - x0) * k) / 2, oy = (cv.h - (y1 - y0) * k) / 2
  return pts.map((p) => [ox + (p[0] - x0) * k, oy + (p[1] - y0) * k] as Pt)
}

/** Resample and relax a traced outline so pixel stair-steps become smooth pile edges. */
function relax(pts: readonly Pt[], n: number, iterations = 3): Pt[] {
  let q = resample([...pts], n)
  for (let it = 0; it < iterations; it++) {
    q = q.map((p, i) => {
      const a = q[(i - 1 + q.length) % q.length], b = q[(i + 1) % q.length]
      return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4] as Pt
    })
  }
  return q
}

export function organic(cv: Canvas, p: { traced?: string; style: OrganicStyle }, rng: Rng) {
  const { w, h } = cv
  if (p.style === 'fringed') {
    // tufted square with a loose fringe on all sides
    const m = 9
    const fp = cv.pen('secondary')
    const r2 = makeRng(7)
    for (let x = m; x < w - m; x += 2.2) {
      fp.fill(petalShape([x + 1, m + 1], [x + r2.range(-1, 1), r2.range(1.5, 3.5)], 0.7))
      fp.fill(petalShape([x + 1, h - m - 1], [x + r2.range(-1, 1), h - r2.range(1.5, 3.5)], 0.7))
    }
    for (let y = m; y < h - m; y += 2.2) {
      fp.fill(petalShape([m + 1, y + 1], [r2.range(1.5, 3.5), y + r2.range(-1, 1)], 0.7))
      fp.fill(petalShape([w - m - 1, y + 1], [w - r2.range(1.5, 3.5), y + r2.range(-1, 1)], 0.7))
    }
    cv.pen('primary').fill(roundPoly([[m, m], [w - m, m], [w - m, h - m], [m, h - m]], 0.08))
    cv.pen('outline').fill(roundPoly([[m + 5, m + 5], [w - m - 5, m + 5], [w - m - 5, h - m - 5], [m + 5, h - m - 5]], 0.1))
    cv.pen('primary').fill(roundPoly([[m + 5.6, m + 5.6], [w - m - 5.6, m + 5.6], [w - m - 5.6, h - m - 5.6], [m + 5.6, h - m - 5.6]], 0.1))
    return
  }
  const detailed = p.style === 'splash'
  const pts = relax(fitted(cv, p.traced ?? 's3-shape-10', 2), detailed ? 110 : 44, detailed ? 1 : 3)
  const c = centroid(resample(pts, 120))
  const outlineShape = smoothShape(pts)
  const ring = (k: number) => smoothShape(pts.map((q) => lerp(c, q, k)))
  const channel = (k: number, wd = 0.025) => cv.pen('outline').fill(ring(k)).hole(ring(k - wd))
  if (p.style === 'ribbed') {
    cv.pen('secondary').fill(outlineShape)
    const rp = cv.pen('primary')
    const dense = resample(pts, 400)
    const xs = dense.map((q) => q[0])
    for (let x = Math.min(...xs) + 2.5; x < Math.max(...xs) - 1.5; x += 4.2) {
      const ys = verticalHits(dense, x)
      for (let k = 0; k + 1 < ys.length; k += 2) if (ys[k + 1] - ys[k] > 4) rp.rect(x, ys[k] + 1.8, 1.4, ys[k + 1] - ys[k] - 3.6)
    }
    return
  }
  if (p.style === 'ribbon') {
    // two-tone ribbon: the second colour runs along the lower edge
    cv.pen('primary').fill(outlineShape)
    cv.pen('secondary').fill(smoothShape(pts.map((q) => (q[1] > c[1] ? lerp(c, q, 0.92) : lerp(c, q, 0.15))).map((q) => [q[0], q[1] + (h * 0.02)] as Pt)))
    return
  }
  cv.pen('primary').fill(outlineShape)
  if (p.style === 'pebble') {
    channel(0.8)
    channel(0.5 + rng.range(0, 0.06))
  } else {
    channel(0.55, 0.03)
  }
}

// ---------------------------------------------------------------- organic modern extras

/** Carved arcs: concentric half-rings, a common hand-tufted modern motif. */
export function arcs(cv: Canvas, p: { rings: number }) {
  const { w, h } = cv
  const cx = w / 2, by = h - 2
  const R = Math.min(w / 2 - 2, h - 4)
  const roles: MotifRole[] = ['primary', 'secondary', 'ground', 'accent']
  for (let i = 0; i < p.rings; i++) {
    const r = R * (1 - i / p.rings)
    const half = (rr: number): Shape => ({
      start: [cx - rr, by],
      segs: [[[cx - rr, by - rr * 1.33], [cx + rr, by - rr * 1.33], [cx + rr, by]]],
    })
    cv.pen('outline').fill(half(r))
    cv.pen(roles[i % roles.length]).fill(half(r - OW))
  }
  void ellipseShape
  void domeShape
  void polyShape
}
