/**
 * Changing a rug's size after it's begun. A chart can be stretched (every knot resampled to the
 * new grid, so the design fills the new size) or kept (knots stay as they are, centred; the
 * edges are trimmed or new empty knots added). The layout is redrawn to fit either way.
 */
import type { Stamper } from './layout'
import { withLayout } from './layout'
import { withBraid } from './braid'
import type { ChartLayer, RugDoc } from './model'
import { chartSize } from './model'
import { formatFeetInches } from '../types/tileDesign'

export type ResizeMode = 'stretch' | 'keep'

export function resizeChart(layer: ChartLayer, cols: number, rows: number, mode: ResizeMode): ChartLayer {
  if (cols === layer.cols && rows === layer.rows) return layer
  const cells = new Uint8Array(cols * rows)
  if (mode === 'stretch') {
    for (let r = 0; r < rows; r++) {
      const sr = Math.min(layer.rows - 1, Math.floor(((r + 0.5) * layer.rows) / rows))
      for (let c = 0; c < cols; c++) cells[r * cols + c] = layer.cells[sr * layer.cols + Math.min(layer.cols - 1, Math.floor(((c + 0.5) * layer.cols) / cols))]
    }
  } else {
    const dc = Math.floor((cols - layer.cols) / 2)
    const dr = Math.floor((rows - layer.rows) / 2)
    for (let r = 0; r < rows; r++) {
      const sr = r - dr
      if (sr < 0 || sr >= layer.rows) continue
      for (let c = 0; c < cols; c++) {
        const sc = c - dc
        if (sc >= 0 && sc < layer.cols) cells[r * cols + c] = layer.cells[sr * layer.cols + sc]
      }
    }
  }
  return { ...layer, cols, rows, cells }
}

/** The rug at a new size in feet: its charts resized and its layout redrawn. */
export function resizeRug(doc: RugDoc, widthFt: number, heightFt: number, mode: ResizeMode, stamper?: Stamper): RugDoc {
  const { cols, rows } = chartSize(widthFt, heightFt, doc.density)
  // A name still ending in its size (as new rugs are named) follows the new size.
  const oldSize = `${formatFeetInches(doc.widthFt)} x ${formatFeetInches(doc.heightFt)}`
  const name = doc.name.endsWith(oldSize) ? doc.name.slice(0, -oldSize.length) + `${formatFeetInches(widthFt)} x ${formatFeetInches(heightFt)}` : doc.name
  const resized: RugDoc = {
    ...doc,
    name,
    widthFt,
    heightFt,
    rugCategory: widthFt * 2.5 <= heightFt || heightFt * 2.5 <= widthFt ? 'runner' : doc.rugCategory === 'runner' ? 'area' : doc.rugCategory,
    layers: doc.layers.map((l) => (l.kind === 'chart' && l.role !== 'layout' ? resizeChart(l, cols, rows, mode) : l)),
  }
  if (doc.braid) return withBraid(resized, doc.braid)
  return doc.layout ? withLayout(resized, doc.layout, stamper) : resized
}
