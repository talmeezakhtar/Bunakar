/**
 * Braided rugs, generated: rounds of three-strand braid following the rug's outline from the
 * edge inward, each round in its band's three yarns, with the braid's chevron along it.
 */
import { insetInches } from './layout'
import type { BraidSpec, ChartLayer, Density, RugDoc, RugShapeKind } from './model'
import { chartSize, newId } from './model'

export function renderBraid(spec: BraidSpec, cols: number, rows: number, density: Density, shape: RugShapeKind): Uint8Array {
  const out = new Uint8Array(cols * rows)
  if (!spec.bands.length) return out
  const W = cols / density.across
  const H = rows / density.down
  const w = Math.max(0.25, spec.braidIn)
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const d = insetInches(shape, c, r, cols, rows, density)
      if (d < 0) continue
      const ring = Math.floor(d / w)
      const band = spec.bands[ring % spec.bands.length]
      const across = (d % w) / w // 0 at the round's outer side, 1 at its inner
      // Position along the round: angle round the centre times the radius, in braid widths.
      const x = (c + 0.5) / density.across - W / 2
      const y = (r + 0.5) / density.down - H / 2
      const along = (Math.atan2(y / H, x / W) * Math.hypot(x, y)) / (w * 0.55)
      // The chevron: strands cross the braid at a slant, mirrored at its middle.
      const strand = ((Math.floor(along + Math.abs(across - 0.5) * 1.6 + ring * 0.5) % 3) + 3) % 3
      out[r * cols + c] = band[strand]
    }
  return out
}

/** A first braid for a palette of n yarns: bands that walk through the yarns. */
export function defaultBraid(n: number): BraidSpec {
  const y = (i: number) => ((i % Math.max(1, n)) + 1) as number
  return { braidIn: 1.5, bands: [[y(0), y(1), y(2)], [y(1), y(1), y(3)], [y(0), y(2), y(0)], [y(3), y(4), y(1)]] }
}

/** The rug with its braid set and drawn as its bottom chart layer (replacing the last one). */
export function withBraid(doc: RugDoc, spec: BraidSpec): RugDoc {
  const { cols, rows } = chartSize(doc.widthFt, doc.heightFt, doc.density)
  const old = doc.layers.find((l): l is ChartLayer => l.kind === 'chart' && l.role === 'layout')
  const layer: ChartLayer = { kind: 'chart', id: old?.id ?? newId(), name: 'Braid', visible: old?.visible ?? true, role: 'layout', cols, rows, cells: renderBraid(spec, cols, rows, doc.density, doc.shape.kind) }
  // Unpainted chart layers (one colour all over) would hide the braid: clear them.
  const others = doc.layers
    .filter((l) => !(l.kind === 'chart' && l.role === 'layout'))
    .map((l) => (l.kind === 'chart' && l.cells.length && l.cells.every((v) => v === l.cells[0]) && l.cells[0] !== 0 ? { ...l, cells: new Uint8Array(l.cells.length) } : l))
  return { ...doc, braid: spec, layers: [layer, ...others] }
}
