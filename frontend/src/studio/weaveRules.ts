/**
 * What a construction can and can't weave. In a slit-tapestry kilim, where two colours meet
 * along a vertical line the wefts turn back on either side and leave a slit; a long slit makes
 * a weak rug, so weavers keep them short by stepping the edge sideways now and then (or use an
 * interlocked dhurrie, or soumak, which have no slits). Pure; no DOM.
 */
import type { RugDoc } from './model'

/** A slit: the boundary between column `c` and `c + 1`, from row `r0` to `r1` inclusive. */
export type Slit = { c: number; r0: number; r1: number }

/** All visible charts of the rug flattened (top-most knot wins), or null when it has none. */
export function compositeChart(doc: RugDoc): { cols: number; rows: number; cells: Uint8Array } | null {
  const charts = doc.layers.filter((l) => l.kind === 'chart' && l.visible)
  if (!charts.length) return null
  const { cols, rows } = charts[0] as { cols: number; rows: number }
  const out = new Uint8Array(cols * rows)
  for (const l of charts) {
    if (l.kind !== 'chart' || l.cols !== cols || l.rows !== rows) continue
    for (let i = 0; i < out.length; i++) if (l.cells[i]) out[i] = l.cells[i]
  }
  return { cols, rows, cells: out }
}

/** Longest slit a kilim should have, in weft rows: about three quarters of an inch. */
export const maxSlitRows = (rowsPerInch: number) => Math.max(3, Math.round(rowsPerInch * 0.75))

/** Vertical colour boundaries that run longer than `maxRows` rows without a step. */
export function findSlits(cells: Uint8Array, cols: number, rows: number, maxRows: number): Slit[] {
  const out: Slit[] = []
  for (let c = 0; c < cols - 1; c++) {
    let start = -1
    for (let r = 0; r <= rows; r++) {
      const i = r * cols + c
      const split = r < rows && cells[i] !== 0 && cells[i + 1] !== 0 && cells[i] !== cells[i + 1]
      if (split && start < 0) start = r
      if (!split && start >= 0) {
        if (r - start > maxRows) out.push({ c, r0: start, r1: r - 1 })
        start = -1
      }
    }
  }
  return out
}

/**
 * Knots to repaint so every slit is broken into runs no longer than `maxRows`: after each run,
 * one knot on the right of the boundary takes the left colour, stepping the edge.
 */
export function stepSlits(cells: Uint8Array, cols: number, slits: Slit[], maxRows: number): { index: number; value: number }[] {
  const out: { index: number; value: number }[] = []
  for (const s of slits)
    // Runs of `maxRows`, then one stepped row: every (maxRows + 1)th row, through the last.
    for (let r = s.r0 + maxRows; r <= s.r1; r += maxRows + 1) {
      const i = r * cols + s.c
      out.push({ index: i + 1, value: cells[i] })
    }
  return out
}

/**
 * Step every long slit, repeating on the result (stepping one edge can lengthen its neighbour
 * where vertical lines are a knot wide) until none are left or four passes have run.
 * Returns the knots to repaint and how many long slits remain.
 */
export function fixSlits(cells: Uint8Array, cols: number, rows: number, maxRows: number): { changes: { index: number; value: number }[]; left: number } {
  const work = cells.slice()
  const changed = new Map<number, number>()
  let slits = findSlits(work, cols, rows, maxRows)
  for (let pass = 0; pass < 4 && slits.length; pass++) {
    for (const { index, value } of stepSlits(work, cols, slits, maxRows)) {
      work[index] = value
      changed.set(index, value)
    }
    slits = findSlits(work, cols, rows, maxRows)
  }
  return { changes: [...changed].filter(([i, v]) => cells[i] !== v).map(([index, value]) => ({ index, value })), left: slits.length }
}
