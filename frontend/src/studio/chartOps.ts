/**
 * Drawing on a knot chart: pure functions over (cols x rows) grids of palette indexes. Every
 * drawing operation yields cell coordinates; `symmetric` expands each through the chosen symmetry,
 * so a quarter drawn in one corner appears in all four. Nothing here touches the DOM.
 */

export type Cell = { c: number; r: number }

export type Symmetry = 'none' | 'mirror-x' | 'mirror-y' | 'quarter' | 'radial-4' | 'radial-8'

export const SYMMETRIES: { id: Symmetry; label: string; hint: string }[] = [
  { id: 'none', label: 'None', hint: 'Draw freely' },
  { id: 'mirror-x', label: 'Mirror across', hint: 'Left and right halves match' },
  { id: 'mirror-y', label: 'Mirror down', hint: 'Top and bottom halves match' },
  { id: 'quarter', label: 'Quarter', hint: 'Design one quarter; all four match (most Persian rugs)' },
  { id: 'radial-4', label: 'Radial ×4', hint: 'Turned four times about the centre (medallions, round rugs)' },
  { id: 'radial-8', label: 'Radial ×8', hint: 'Turned and mirrored eight ways (stars, rosettes)' },
]

/** The cells a single cell stands for under a symmetry (itself included), inside the chart. */
export function symmetric(cell: Cell, cols: number, rows: number, mode: Symmetry): Cell[] {
  const { c, r } = cell
  const mx = cols - 1 - c
  const my = rows - 1 - r
  let out: Cell[]
  switch (mode) {
    case 'mirror-x':
      out = [cell, { c: mx, r }]
      break
    case 'mirror-y':
      out = [cell, { c, r: my }]
      break
    case 'quarter':
      out = [cell, { c: mx, r }, { c, r: my }, { c: mx, r: my }]
      break
    case 'radial-4':
    case 'radial-8': {
      // Turn about the centre in normalised coordinates, so non-square charts still close up.
      const cx = (cols - 1) / 2
      const cy = (rows - 1) / 2
      const u = (c - cx) / Math.max(cx, 0.5)
      const v = (r - cy) / Math.max(cy, 0.5)
      const turns: [number, number][] = [
        [u, v],
        [-v, u],
        [-u, -v],
        [v, -u],
      ]
      if (mode === 'radial-8') turns.push([-u, v], [v, u], [u, -v], [-v, -u])
      out = turns.map(([a, b]) => ({ c: Math.round(cx + a * cx), r: Math.round(cy + b * cy) }))
      break
    }
    default:
      out = [cell]
  }
  const seen = new Set<number>()
  return out.filter((p) => {
    if (p.c < 0 || p.r < 0 || p.c >= cols || p.r >= rows) return false
    const k = p.r * cols + p.c
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** A square brush of `size` knots centred on the cell. */
export function brush(cell: Cell, size: number): Cell[] {
  const out: Cell[] = []
  const lo = -Math.floor((size - 1) / 2)
  for (let dr = lo; dr < lo + size; dr++) for (let dc = lo; dc < lo + size; dc++) out.push({ c: cell.c + dc, r: cell.r + dr })
  return out
}

/** Bresenham line between two cells, both ends included. */
export function line(a: Cell, b: Cell): Cell[] {
  const out: Cell[] = []
  let { c, r } = a
  const dc = Math.abs(b.c - c)
  const dr = -Math.abs(b.r - r)
  const sc = c < b.c ? 1 : -1
  const sr = r < b.r ? 1 : -1
  let err = dc + dr
  for (;;) {
    out.push({ c, r })
    if (c === b.c && r === b.r) break
    const e2 = 2 * err
    if (e2 >= dr) {
      err += dr
      c += sc
    }
    if (e2 <= dc) {
      err += dc
      r += sr
    }
  }
  return out
}

export function rect(a: Cell, b: Cell, filled: boolean): Cell[] {
  const c0 = Math.min(a.c, b.c)
  const c1 = Math.max(a.c, b.c)
  const r0 = Math.min(a.r, b.r)
  const r1 = Math.max(a.r, b.r)
  const out: Cell[] = []
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) if (filled || r === r0 || r === r1 || c === c0 || c === c1) out.push({ c, r })
  return out
}

/** An ellipse inscribed in the box a-b, outline or filled. */
export function ellipse(a: Cell, b: Cell, filled: boolean): Cell[] {
  const c0 = Math.min(a.c, b.c)
  const c1 = Math.max(a.c, b.c)
  const r0 = Math.min(a.r, b.r)
  const r1 = Math.max(a.r, b.r)
  const cx = (c0 + c1) / 2
  const cy = (r0 + r1) / 2
  const rx = Math.max(0.5, (c1 - c0) / 2 + 0.5)
  const ry = Math.max(0.5, (r1 - r0) / 2 + 0.5)
  const inside = (c: number, r: number) => ((c - cx) / rx) ** 2 + ((r - cy) / ry) ** 2 <= 1
  const out: Cell[] = []
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      if (!inside(c, r)) continue
      if (filled || !inside(c - 1, r) || !inside(c + 1, r) || !inside(c, r - 1) || !inside(c, r + 1)) out.push({ c, r })
    }
  return out
}

/** Flood fill (4-way) from a cell over the area of its colour: the indexes to repaint. */
export function floodFill(cells: Uint8Array, cols: number, rows: number, start: Cell): number[] {
  const target = cells[start.r * cols + start.c]
  const out: number[] = []
  const seen = new Uint8Array(cells.length)
  const stack = [start.r * cols + start.c]
  while (stack.length) {
    const i = stack.pop()!
    if (seen[i] || cells[i] !== target) continue
    // Scan left and right along the row, then queue the rows above and below.
    const r = Math.floor(i / cols)
    let l = i
    let rr = i
    while (l % cols > 0 && cells[l - 1] === target && !seen[l - 1]) l--
    while ((rr % cols) < cols - 1 && cells[rr + 1] === target && !seen[rr + 1]) rr++
    for (let k = l; k <= rr; k++) {
      seen[k] = 1
      out.push(k)
      if (r > 0 && !seen[k - cols] && cells[k - cols] === target) stack.push(k - cols)
      if (r < rows - 1 && !seen[k + cols] && cells[k + cols] === target) stack.push(k + cols)
    }
  }
  return out
}

// ---- selections ---------------------------------------------------------------------------

export type Patch = { cols: number; rows: number; cells: Uint8Array }

export function copyRegion(cells: Uint8Array, cols: number, a: Cell, b: Cell): Patch {
  const c0 = Math.min(a.c, b.c)
  const r0 = Math.min(a.r, b.r)
  const w = Math.abs(b.c - a.c) + 1
  const h = Math.abs(b.r - a.r) + 1
  const out = new Uint8Array(w * h)
  for (let r = 0; r < h; r++) out.set(cells.subarray((r0 + r) * cols + c0, (r0 + r) * cols + c0 + w), r * w)
  return { cols: w, rows: h, cells: out }
}

export function flipPatch(p: Patch, axis: 'x' | 'y'): Patch {
  const out = new Uint8Array(p.cells.length)
  for (let r = 0; r < p.rows; r++)
    for (let c = 0; c < p.cols; c++) {
      const sc = axis === 'x' ? p.cols - 1 - c : c
      const sr = axis === 'y' ? p.rows - 1 - r : r
      out[r * p.cols + c] = p.cells[sr * p.cols + sc]
    }
  return { ...p, cells: out }
}

/** A quarter turn clockwise. */
export function rotatePatch(p: Patch): Patch {
  const out = new Uint8Array(p.cells.length)
  for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) out[c * p.rows + (p.rows - 1 - r)] = p.cells[r * p.cols + c]
  return { cols: p.rows, rows: p.cols, cells: out }
}

/** Where a patch lands when stamped at `at`: indexes and values, skipping its empty (0) cells. */
export function stampCells(p: Patch, at: Cell, cols: number, rows: number): { index: number; value: number }[] {
  const out: { index: number; value: number }[] = []
  for (let r = 0; r < p.rows; r++)
    for (let c = 0; c < p.cols; c++) {
      const v = p.cells[r * p.cols + c]
      const tc = at.c + c
      const tr = at.r + r
      if (!v || tc < 0 || tr < 0 || tc >= cols || tr >= rows) continue
      out.push({ index: tr * cols + tc, value: v })
    }
  return out
}

export type RepeatKind = 'straight' | 'half-drop' | 'brick'

/** Positions to stamp a patch across a box so it tiles: straight grid, half-drop columns, or brick rows. */
export function repeatPositions(p: Patch, box: { c0: number; r0: number; c1: number; r1: number }, kind: RepeatKind, gap = 0): Cell[] {
  const stepC = p.cols + gap
  const stepR = p.rows + gap
  const out: Cell[] = []
  for (let j = -1; box.r0 + j * stepR <= box.r1; j++)
    for (let i = -1; box.c0 + i * stepC <= box.c1; i++) {
      const c = box.c0 + i * stepC + (kind === 'brick' && j % 2 !== 0 ? Math.floor(stepC / 2) : 0)
      const r = box.r0 + j * stepR + (kind === 'half-drop' && i % 2 !== 0 ? Math.floor(stepR / 2) : 0)
      if (c + p.cols > box.c0 && r + p.rows > box.r0 && c <= box.c1 && r <= box.r1) out.push({ c, r })
    }
  return out
}

/**
 * Where a patch lands when stamped centred on `at` under a symmetry: each copy mirrored or
 * turned to match its place, as a quarter-designed rug repeats its corners.
 */
export function symmetricStamps(p: Patch, at: Cell, cols: number, rows: number, mode: Symmetry): { patch: Patch; at: Cell }[] {
  const c0 = at.c - (p.cols >> 1)
  const r0 = at.r - (p.rows >> 1)
  const out: { patch: Patch; at: Cell }[] = [{ patch: p, at: { c: c0, r: r0 } }]
  const fx = (q: Patch) => flipPatch(q, 'x')
  const fy = (q: Patch) => flipPatch(q, 'y')
  if (mode === 'mirror-x' || mode === 'quarter') out.push({ patch: fx(p), at: { c: cols - c0 - p.cols, r: r0 } })
  if (mode === 'mirror-y' || mode === 'quarter') out.push({ patch: fy(p), at: { c: c0, r: rows - r0 - p.rows } })
  if (mode === 'quarter') out.push({ patch: fx(fy(p)), at: { c: cols - c0 - p.cols, r: rows - r0 - p.rows } })
  if (mode === 'radial-4' || mode === 'radial-8') {
    const cx = (cols - 1) / 2
    const cy = (rows - 1) / 2
    const u = (at.c - cx) / Math.max(cx, 0.5)
    const v = (at.r - cy) / Math.max(cy, 0.5)
    const turns: [number, number][] = [
      [u, v],
      [-v, u],
      [-u, -v],
      [v, -u],
    ]
    const rot = [p]
    for (let k = 1; k < 4; k++) rot.push(rotatePatch(rot[k - 1]))
    const place = (q: Patch, [a, b]: [number, number]) => ({ patch: q, at: { c: Math.round(cx + a * cx) - (q.cols >> 1), r: Math.round(cy + b * cy) - (q.rows >> 1) } })
    out.length = 0
    for (let k = 0; k < 4; k++) out.push(place(rot[k], turns[k]))
    // The mirror images: each turn, flipped across.
    if (mode === 'radial-8') for (let k = 0; k < 4; k++) out.push(place(fx(rot[k]), [-turns[k][0], turns[k][1]]))
  }
  const seen = new Set<string>()
  return out.filter((s) => {
    const key = `${s.at.c},${s.at.r},${s.patch.cols}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
