/**
 * The layout scaffold: border bands, field, medallion and pendants, corner spandrels, a prayer
 * niche, compartments and an all-over repeat, generated as a knot chart from `LayoutSpec`. It is
 * settings, not painting: change a setting and the layout layer is drawn again. The designer
 * paints on layers above it.
 *
 * Motif art comes through a `Stamper`, so this file stays pure (the browser one rasterises the
 * catalogue's vector motifs; the checks pass a fake).
 */
import type { Patch } from './chartOps'
import { flipPatch, repeatPositions, rotatePatch } from './chartOps'
import type { ChartLayer, Density, LayoutSpec, RugDoc, RugShapeKind } from './model'
import { chartSize, newId } from './model'

export interface Stamper {
  /** Width / height of a motif (one repeat for a border), or undefined if unknown. */
  aspect(motifId: string): number | undefined
  /**
   * The motif at exactly w x h cells, in palette indexes, 0 where it's empty. `part` picks a
   * border's repeat or corner. `ground` is the palette index under it, which its art avoids; with
   * `solid` the motif's own ground is painted in it too, so its outline shows (a medallion).
   */
  draw(motifId: string, part: 'piece' | 'unit' | 'corner', w: number, h: number, ground: number, solid?: boolean): Patch | null
}

type Box = { c0: number; r0: number; c1: number; r1: number } // c1, r1 exclusive

/** Where each band and the field sit, in cells. */
export function layoutGeometry(spec: LayoutSpec, cols: number, rows: number, density: Density) {
  let ox = 0
  let oy = 0
  const bands = spec.borders.map((b) => {
    const wx = Math.max(1, Math.round(b.widthIn * density.across))
    const wy = Math.max(1, Math.round(b.widthIn * density.down))
    const band = { ...b, ox, oy, wx, wy }
    ox += wx
    oy += wy
    return band
  })
  const field: Box = { c0: Math.min(ox, cols >> 1), r0: Math.min(oy, rows >> 1), c1: Math.max(cols - ox, cols >> 1), r1: Math.max(rows - oy, rows >> 1) }
  return { bands, field }
}

/** A steady 0..1 value per cell, for the ikat feathering. */
function hash2(a: number, b: number) {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * How far a cell lies inside the rug's outline, in inches (negative outside): the border bands of a
 * round, oval or octagonal rug follow its edge rather than a rectangle.
 */
export function insetInches(shape: RugShapeKind, c: number, r: number, cols: number, rows: number, density: Density): number {
  const W = cols / density.across
  const H = rows / density.down
  const x = (c + 0.5) / density.across
  const y = (r + 0.5) / density.down
  const ex = Math.min(x, W - x)
  const ey = Math.min(y, H - y)
  if (shape === 'round' || shape === 'oval') {
    const a = W / 2
    const b = H / 2
    const dx = x - a
    const dy = y - b
    const e = Math.hypot(dx / a, dy / b)
    return e === 0 ? Math.min(a, b) : Math.hypot(dx, dy) * (1 / e - 1)
  }
  if (shape === 'octagon') return Math.min(ex, ey, (ex + ey - Math.min(W, H) * 0.29) / Math.SQRT2)
  return Math.min(ex, ey)
}

/** A patch made mirror-symmetric: its left half reflected onto its right (and top onto bottom). */
export function mirrorPatch(p: Patch, across: boolean, down: boolean): Patch {
  const cells = p.cells.slice()
  for (let r = 0; r < p.rows; r++)
    for (let c = 0; c < p.cols; c++) {
      const sc = across && c >= p.cols / 2 ? p.cols - 1 - c : c
      const sr = down && r >= p.rows / 2 ? p.rows - 1 - r : r
      cells[r * p.cols + c] = p.cells[sr * p.cols + sc]
    }
  return { ...p, cells }
}

export function renderLayout(spec: LayoutSpec, cols: number, rows: number, density: Density, stamper?: Stamper, shape: RugShapeKind = 'rect'): Uint8Array {
  const out = new Uint8Array(cols * rows)
  const { bands, field } = layoutGeometry(spec, cols, rows, density)
  const fw = field.c1 - field.c0
  const fh = field.r1 - field.r0

  const fill = (b: Box, v: number, test?: (c: number, r: number) => boolean) => {
    const c0 = Math.max(0, b.c0)
    const r0 = Math.max(0, b.r0)
    const c1 = Math.min(cols, b.c1)
    const r1 = Math.min(rows, b.r1)
    for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) if (!test || test(c, r)) out[r * cols + c] = v
  }
  /** Write a patch's non-empty cells at (c0, r0), inside `clip` and where `test` allows. */
  const put = (p: Patch | null, c0: number, r0: number, clip: Box, recolor?: number, test?: (c: number, r: number) => boolean) => {
    if (!p) return
    for (let r = 0; r < p.rows; r++) {
      const tr = r0 + r
      if (tr < clip.r0 || tr >= clip.r1) continue
      for (let c = 0; c < p.cols; c++) {
        const v = p.cells[r * p.cols + c]
        const tc = c0 + c
        if (!v || tc < clip.c0 || tc >= clip.c1 || (test && !test(tc, tr))) continue
        out[tr * cols + tc] = recolor || v
      }
    }
  }
  /**
   * A motif fitted inside a box, keeping its proportions, centred. With `turn`, a wide motif in a
   * tall box (or the reverse) is drawn a quarter turn round, as a medallion follows the rug.
   */
  const fitted = (motifId: string, b: Box, ground: number, opts: { solid?: boolean; turn?: boolean; mirror?: boolean } = {}) => {
    if (!stamper) return null
    const bw = b.c1 - b.c0
    const bh = b.r1 - b.r0
    let a = stamper.aspect(motifId) ?? 1
    const turned = !!opts.turn && a !== 1 && a > 1 !== bw / density.across > bh / density.down
    if (turned) a = 1 / a
    // Cells per inch may differ across and down; aspect is in inches.
    const k = density.across / density.down
    let w = bw
    let h = Math.round(bw / (a * k))
    if (h > bh) {
      h = bh
      w = Math.round(bh * a * k)
    }
    // Same parity as the box, so the motif sits exactly in its middle.
    if ((bw - w) % 2) w--
    if ((bh - h) % 2) h--
    if (w < 2 || h < 2) return null
    const drawn = turned ? stamper.draw(motifId, 'piece', h, w, ground, opts.solid) : stamper.draw(motifId, 'piece', w, h, ground, opts.solid)
    if (!drawn) return null
    const p = turned ? rotatePatch(drawn) : drawn
    // A medallion is designed as one quarter, mirrored: so is this one.
    return { p: opts.mirror ? mirrorPatch(p, true, true) : p, c: b.c0 + ((bw - w) >> 1), r: b.r0 + ((bh - h) >> 1) }
  }
  const placeFitted = (motifId: string, b: Box, ground: number, clip: Box, test?: (c: number, r: number) => boolean, opts?: { solid?: boolean; turn?: boolean; mirror?: boolean }) => {
    const f = fitted(motifId, b, ground, opts)
    if (f) put(f.p, f.c, f.r, clip, undefined, test)
  }

  // 1. Field ground.
  fill(field, spec.field)

  // 1b. A geometric field pattern, in bands of its colours.
  if (spec.pattern && spec.pattern.colors.length) {
    const { kind, sizeIn, bands, colors } = spec.pattern
    const pw = Math.max(2, sizeIn * density.across)
    const ph = Math.max(2, sizeIn * density.down)
    const n = Math.max(1, bands)
    const cx = field.c0 + fw / 2
    const cy = field.r0 + fh / 2
    for (let r = field.r0; r < field.r1; r++)
      for (let c = field.c0; c < field.c1; c++) {
        // Positions in repeats, centred on the field so the pattern is symmetric.
        const x = Math.abs(c + 0.5 - cx) / pw
        const y = Math.abs(r + 0.5 - cy) / ph
        let t: number // band position, in bands
        if (kind === 'stripes') t = y * n
        else if (kind === 'chevron') t = (y + Math.abs((x % 1) - 0.5)) * n
        else {
          // Concentric diamonds in a lattice: distance from the nearest diamond centre.
          const u = Math.abs((x % 1) - 0.5) * 2
          const v = Math.abs(((y + 0.5) % 1) - 0.5) * 2
          let d = 1 - (u + v) / 2
          if (kind === 'ikat') d += (hash2(c, r >> 3) - 0.5) * (1.2 / n) // feathered, as the dyed warps shift
          t = Math.max(0, d) * n
        }
        out[r * cols + c] = colors[Math.floor(t) % colors.length]
      }
  }

  // 2. All-over repeat across the field.
  if (spec.repeat && stamper) {
    const { motifId, everyIn, drop, color } = spec.repeat
    const step = Math.max(2, Math.round(everyIn * density.across))
    const a = stamper.aspect(motifId) ?? 1
    // The motif fills 80% of its repeat; the rest is breathing room.
    const w = Math.max(2, Math.round(step * 0.8))
    const h = Math.max(2, Math.round((w / a) * (density.down / density.across)))
    const p = stamper.draw(motifId, 'piece', w, h, spec.field)
    if (p) {
      const pad = { cols: step, rows: Math.max(2, Math.round(h / 0.8)), cells: new Uint8Array(0) }
      // Centre the repeat on the field so it's symmetric.
      const nx = Math.ceil(fw / pad.cols / 2)
      const ny = Math.ceil(fh / pad.rows / 2)
      const cx = field.c0 + (fw >> 1) - nx * pad.cols - (pad.cols >> 1)
      const cy = field.r0 + (fh >> 1) - ny * pad.rows - (pad.rows >> 1)
      for (const at of repeatPositions(pad, { c0: cx, r0: cy, c1: field.c1, r1: field.r1 }, drop))
        put(p, at.c + ((pad.cols - w) >> 1), at.r + ((pad.rows - h) >> 1), field, color)
    }
  }

  // 3. Compartments: a grid of panels (garden rugs), each with a motif.
  if (spec.compartments) {
    const { cols: nc, rows: nr, lineWidthIn, ground, line, motifId } = spec.compartments
    const lx = Math.max(1, Math.round(lineWidthIn * density.across))
    const ly = Math.max(1, Math.round(lineWidthIn * density.down))
    fill(field, line)
    const cw = (fw - lx) / nc
    const ch = (fh - ly) / nr
    for (let j = 0; j < nr; j++)
      for (let i = 0; i < nc; i++) {
        const b = { c0: field.c0 + Math.round(i * cw) + lx, r0: field.r0 + Math.round(j * ch) + ly, c1: field.c0 + Math.round((i + 1) * cw), r1: field.r0 + Math.round((j + 1) * ch) }
        fill(b, ground)
        if (motifId) {
          const m = Math.round(Math.min(b.c1 - b.c0, b.r1 - b.r0) * 0.12)
          placeFitted(motifId, { c0: b.c0 + m, r0: b.r0 + m, c1: b.c1 - m, r1: b.r1 - m }, ground, b)
        }
      }
  }

  // 4. Prayer niche: a pointed arch; above it, the spandrels in their own colour.
  if (spec.niche) {
    const { ground, archPct, spandrel } = spec.niche
    const spring = field.r0 + fh * Math.min(0.9, Math.max(0.1, archPct / 100))
    const apex = field.r0 + fh * 0.04
    const cx = field.c0 + fw / 2
    const half = fw / 2
    const archY = (c: number) => spring - (spring - apex) * Math.sqrt(Math.max(0, 1 - Math.abs(c + 0.5 - cx) / half))
    fill(field, ground, (c, r) => r + 0.5 >= archY(c))
    fill(field, spandrel, (c, r) => r + 0.5 < archY(c))
    // A tree or lamp standing in the niche.
    if (spec.niche.motifId) {
      const m = fw * 0.16
      placeFitted(spec.niche.motifId, { c0: Math.round(field.c0 + m), r0: Math.round(spring + fh * 0.04), c1: Math.round(field.c1 - m), r1: Math.round(field.r1 - fh * 0.06) }, ground, field)
    }
  }

  // 5. Corner spandrels: a quarter medallion in each corner of the field.
  if (spec.spandrels) {
    const { ground, motifId } = spec.spandrels
    const inches = Math.min(fw / density.across, fh / density.down) * 0.3
    const rx = Math.max(2, inches * density.across)
    const ry = Math.max(2, inches * density.down)
    const corners: [number, number][] = [
      [field.c0, field.r0],
      [field.c1, field.r0],
      [field.c0, field.r1],
      [field.c1, field.r1],
    ]
    const tl = motifId
      ? fitted(motifId, { c0: Math.round(field.c0 - rx * 0.8), r0: Math.round(field.r0 - ry * 0.8), c1: Math.round(field.c0 + rx * 0.8), r1: Math.round(field.r0 + ry * 0.8) }, ground)
      : null
    for (const [x, y] of corners) {
      const inside = (c: number, r: number) => ((c + 0.5 - x) / rx) ** 2 + ((r + 0.5 - y) / ry) ** 2 <= 1
      fill(field, ground, inside)
      // Each corner's piece is the top-left one mirrored into place, so the four answer one another.
      if (tl) {
        const right = x === field.c1
        const bottom = y === field.r1
        let q = tl.p
        if (right) q = flipPatch(q, 'x')
        if (bottom) q = flipPatch(q, 'y')
        put(q, right ? cols - tl.c - q.cols : tl.c, bottom ? rows - tl.r - q.rows : tl.r, field, undefined, inside)
      }
    }
  }

  // 6. Medallion, with pendants above and below. A catalogue medallion brings its own outline.
  if (spec.medallion?.motifId && stamper) {
    const { widthPct, heightPct, ground, motifId } = spec.medallion
    const rx = (fw * widthPct) / 200
    const ry = (fh * heightPct) / 200
    const cx = field.c0 + fw / 2
    const cy = field.r0 + fh / 2
    placeFitted(motifId, { c0: Math.round(cx - rx), r0: Math.round(cy - ry), c1: Math.round(cx + rx), r1: Math.round(cy + ry) }, ground, field, undefined, { solid: true, turn: true, mirror: true })
  } else if (spec.medallion) {
    const { shape, widthPct, heightPct, ground, pendants } = spec.medallion
    const cx = field.c0 + fw / 2
    const cy = field.r0 + fh / 2
    let rx = (fw * widthPct) / 200
    let ry = (fh * heightPct) / 200
    if (shape === 'round') {
      const inches = Math.min(rx / density.across, ry / density.down)
      rx = inches * density.across
      ry = inches * density.down
    }
    const inShape = (u: number, v: number) => {
      if (shape === 'lozenge') return Math.abs(u) + Math.abs(v) <= 1
      if (shape === 'star') {
        // Eight points: radius runs from the inner notch (0.62) out to each tip.
        const k = ((Math.atan2(v, u) / (Math.PI * 2)) * 8 + 8.5) % 1
        return Math.hypot(u, v) <= 0.62 + 0.38 * Math.abs(2 * k - 1)
      }
      return u * u + v * v <= 1
    }
    const inMedallion = (c: number, r: number) => inShape((c + 0.5 - cx) / rx, (r + 0.5 - cy) / ry)
    const box = { c0: Math.floor(cx - rx), r0: Math.floor(cy - ry), c1: Math.ceil(cx + rx), r1: Math.ceil(cy + ry) }
    if (pendants) {
      // A small lozenge, then a finial, at each end of the long axis.
      const pw = rx * 0.32
      const ph = ry * 0.22
      for (const s of [-1, 1]) {
        const py = cy + s * (ry + ph * 0.55)
        fill({ c0: Math.floor(cx - pw), r0: Math.floor(py - ph), c1: Math.ceil(cx + pw), r1: Math.ceil(py + ph) }, ground, (c, r) => Math.abs((c + 0.5 - cx) / pw) + Math.abs((r + 0.5 - py) / ph) <= 1)
        const fy = py + s * ph
        const fr = Math.max(1, ph * 0.28)
        fill({ c0: Math.floor(cx - fr), r0: Math.floor(fy - fr * 2), c1: Math.ceil(cx + fr), r1: Math.ceil(fy + fr * 2) }, ground, (c, r) => ((c + 0.5 - cx) / fr) ** 2 + ((r + 0.5 - fy) / (fr * 2)) ** 2 <= 1)
      }
    }
    fill(box, ground, inMedallion)
  }

  // 7. Border bands. A shaped rug's bands follow its outline, plain (repeats run on straight edges).
  if (shape !== 'rect' && shape !== 'free') {
    const edges: { from: number; to: number; ground: number }[] = []
    let o = 0
    for (const b of spec.borders) edges.push({ from: o, to: (o += b.widthIn), ground: b.ground })
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const d = insetInches(shape, c, r, cols, rows, density)
          if (d < 0) out[r * cols + c] = 0 // outside the rug: no knots
          if (d < 0 || d >= o) continue
          const band = edges.find((e) => d < e.to)
          if (band) out[r * cols + c] = band.ground
        }
    return out
  }
  for (const b of bands) {
    const outer: Box = { c0: b.ox, r0: b.oy, c1: cols - b.ox, r1: rows - b.oy }
    const inner: Box = { c0: b.ox + b.wx, r0: b.oy + b.wy, c1: cols - b.ox - b.wx, r1: rows - b.oy - b.wy }
    const inBand = (c: number, r: number) => c < inner.c0 || c >= inner.c1 || r < inner.r0 || r >= inner.r1
    fill(outer, b.ground, inBand)
    if (!b.motifId || !stamper) continue
    const id = b.motifId
    const aspect = stamper.aspect(id) ?? 2
    const { wx, wy } = b
    /**
     * A border run mirrors at the middle of its side, as on a quarter-designed rug: units in the
     * second half are flipped, and one straddling the middle is made symmetric itself.
     */
    const mirrored = (u: Patch | null, a: number, z: number, len: number) => {
      if (!u) return null
      if (a >= len / 2) return flipPatch(u, 'x')
      if (z > len / 2 && a < len / 2) return mirrorPatch(u, true, false)
      return u
    }
    /** Units fitted to a run of `len` cells: whole repeats, stretched a little to meet exactly. */
    const run = (len: number, unitLen: number) => {
      const n = Math.max(1, Math.round(len / unitLen))
      // Boundaries rounded on the first half and mirrored on the second, so the run mirrors exactly.
      const at = (i: number) => (i <= n / 2 ? Math.round((i * len) / n) : len - Math.round(((n - i) * len) / n))
      return Array.from({ length: n }, (_, i) => [at(i), at(i + 1)] as const)
    }
    const flowing = spec.corners === 'flowing'
    const block = spec.corners === 'block'
    // Top and bottom run between the corners, or the full width under a mitre.
    const hStart = spec.corners === 'mitred' ? outer.c0 : inner.c0
    const hLen = (spec.corners === 'mitred' ? outer.c1 : inner.c1) - hStart
    const unitW = (wy * aspect * density.across) / density.down
    for (const [a, z] of run(hLen, unitW)) {
      const u = mirrored(stamper.draw(id, 'unit', z - a, wy, b.ground), a, z, hLen)
      if (!u) continue
      put(u, hStart + a, outer.r0, outer, undefined, inBand)
      put(flipPatch(flipPatch(u, 'x'), 'y'), cols - hStart - z, inner.r1, outer, undefined, inBand)
    }
    // Left and right: the unit turned a quarter. Under a mitre they take the corner below the diagonal.
    const vStart = inner.r0
    const vLen = inner.r1 - inner.r0
    const unitH = (wx * aspect * density.down) / density.across
    const mitre = (c: number, r: number) => {
      if (spec.corners !== 'mitred') return true
      const lx = c < inner.c0 ? (c - outer.c0 + 0.5) / wx : (outer.c1 - c - 0.5) / wx
      const ly = r < inner.r0 ? (r - outer.r0 + 0.5) / wy : r >= inner.r1 ? (outer.r1 - r - 0.5) / wy : 2
      return ly > lx
    }
    const sideStart = spec.corners === 'mitred' ? outer.r0 : vStart
    const sideLen = spec.corners === 'mitred' ? outer.r1 - outer.r0 : vLen
    for (const [a, z] of run(sideLen, unitH)) {
      const u = mirrored(stamper.draw(id, 'unit', z - a, wx, b.ground), a, z, sideLen)
      if (!u) continue
      const right = rotatePatch(u)
      put(right, inner.c1, sideStart + a, outer, undefined, (c, r) => inBand(c, r) && mitre(c, r))
      put(flipPatch(flipPatch(right, 'x'), 'y'), outer.c0, rows - sideStart - z, outer, undefined, (c, r) => inBand(c, r) && mitre(c, r))
    }
    if (flowing || block) {
      // The corner square: the border's own corner piece (flowing) or a rosette block.
      const cornerArt = (w: number, h: number) => (flowing ? stamper.draw(id, 'corner', w, h, b.ground) : stamper.draw('rosette-star', 'piece', w, h, b.ground))
      const tl = cornerArt(wx, wy)
      if (block) {
        // A block corner sits on the outer guard's colour (or the band's own), so it reads as a block.
        const blockGround = bands[0] !== b ? bands[0].ground : b.ground
        for (const [c0, r0] of [
          [outer.c0, outer.r0],
          [inner.c1, outer.r0],
          [outer.c0, inner.r1],
          [inner.c1, inner.r1],
        ])
          fill({ c0, r0, c1: c0 + wx, r1: r0 + wy }, blockGround)
      }
      if (tl) {
        // The other three corners mirror the top-left one.
        const right = cols - outer.c0 - tl.cols
        const bottom = rows - outer.r0 - tl.rows
        put(tl, outer.c0, outer.r0, outer)
        put(flipPatch(tl, 'x'), right, outer.r0, outer)
        put(flipPatch(tl, 'y'), outer.c0, bottom, outer)
        put(flipPatch(flipPatch(tl, 'x'), 'y'), right, bottom, outer)
      }
    }
  }
  return out
}

/** A sensible first layout for a palette of n yarns: field 1, borders and medallion from the rest. */
export function defaultLayout(n: number): LayoutSpec {
  const y = (i: number) => Math.min(n, i)
  return {
    borders: [
      { role: 'outer-guard', widthIn: 1.5, ground: y(3) },
      { role: 'main', widthIn: 6, ground: y(2), motifId: 'border-herati-guard' },
      { role: 'inner-guard', widthIn: 1.5, ground: y(3) },
    ],
    corners: 'flowing',
    field: 1,
    medallion: { shape: 'lozenge', widthPct: 58, heightPct: 48, ground: y(2), pendants: true, motifId: 'medallion-shah-abbas' },
    spandrels: { ground: y(2) },
  }
}

/** The layout's yarn numbers moved through `map` (old palette index -> new; 0 drops a colour). */
export function remapLayout(spec: LayoutSpec, map: (i: number) => number): LayoutSpec {
  const m = (i: number) => map(i) || 1
  return {
    ...spec,
    borders: spec.borders.map((b) => ({ ...b, ground: m(b.ground) })),
    field: m(spec.field),
    ...(spec.medallion ? { medallion: { ...spec.medallion, ground: m(spec.medallion.ground) } } : {}),
    ...(spec.spandrels ? { spandrels: { ...spec.spandrels, ground: m(spec.spandrels.ground) } } : {}),
    ...(spec.niche ? { niche: { ...spec.niche, ground: m(spec.niche.ground), spandrel: m(spec.niche.spandrel) } } : {}),
    ...(spec.compartments ? { compartments: { ...spec.compartments, ground: m(spec.compartments.ground), line: m(spec.compartments.line) } } : {}),
    ...(spec.pattern ? { pattern: { ...spec.pattern, colors: spec.pattern.colors.map(m) } } : {}),
    ...(spec.repeat ? { repeat: { ...spec.repeat, ...(spec.repeat.color ? { color: m(spec.repeat.color) } : {}) } } : {}),
  }
}

/**
 * The rug with its layout set and the layout layer drawn (bottom of the stack), or removed when
 * `spec` is null. Chart layers nobody has painted yet (one colour all over) are cleared so the
 * layout shows through them.
 */
export function withLayout(doc: RugDoc, spec: LayoutSpec | null, stamper?: Stamper): RugDoc {
  const others = doc.layers.filter((l) => !(l.kind === 'chart' && l.role === 'layout'))
  if (!spec) return { ...doc, layout: null, layers: others.length ? others : doc.layers }
  const { cols, rows } = chartSize(doc.widthFt, doc.heightFt, doc.density)
  const cells = renderLayout(spec, cols, rows, doc.density, stamper, doc.shape.kind)
  const old = doc.layers.find((l): l is ChartLayer => l.kind === 'chart' && l.role === 'layout')
  const layer: ChartLayer = { kind: 'chart', id: old?.id ?? newId(), name: 'Layout', visible: old?.visible ?? true, role: 'layout', cols, rows, cells }
  const cleared = others.map((l) => (l.kind === 'chart' && l.cells.length && l.cells.every((v) => v === l.cells[0]) && l.cells[0] !== 0 ? { ...l, cells: new Uint8Array(l.cells.length) } : l))
  return { ...doc, layout: spec, layers: [layer, ...cleared] }
}
