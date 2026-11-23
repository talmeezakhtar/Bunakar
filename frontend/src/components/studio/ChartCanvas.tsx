import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Ref } from 'react'
import type { ChartLayer, RugDoc } from '../../studio/model'
import type { Cell, Patch, Symmetry } from '../../studio/chartOps'
import { brush, ellipse, floodFill, line, rect, stampCells, symmetric, symmetricStamps } from '../../studio/chartOps'
import { Stroke } from '../../studio/history'
import { shapePathFt } from '../../studio/compose'
import { knotSprite } from '../../three/fabric/knotSprite'

export type ChartTool = 'pencil' | 'eraser' | 'line' | 'rect' | 'rect-fill' | 'ellipse' | 'ellipse-fill' | 'fill' | 'pick' | 'select' | 'hand'

export type Selection = { a: Cell; b: Cell } | null

export type ChartCanvasHandle = {
  fit: () => void
  zoomBy: (k: number) => void
}

type Props = {
  doc: RugDoc
  layer: ChartLayer
  rgb: [number, number, number][]
  tool: ChartTool
  brushSize: number
  symmetry: Symmetry
  /** 1-based palette index painted by drawing tools. */
  yarn: number
  selection: Selection
  /** A copied region following the pointer; a click stamps it. */
  paste: Patch | null
  /** Weave problems to mark: boundaries between column c and c + 1, rows r0 to r1. */
  marks?: { c: number; r0: number; r1: number }[]
  onPick: (yarn: number) => void
  onSelect: (s: Selection) => void
  onStamped: () => void
  /** A finished stroke: one undo step. */
  onStroke: (stroke: Stroke) => void
  ref?: Ref<ChartCanvasHandle>
}

type View = { s: number; ox: number; oy: number }

const SHAPE_TOOLS = new Set<ChartTool>(['line', 'rect', 'rect-fill', 'ellipse', 'ellipse-fill'])

function shapeCells(tool: ChartTool, a: Cell, b: Cell): Cell[] {
  if (tool === 'line') return line(a, b)
  if (tool === 'rect' || tool === 'rect-fill') return rect(a, b, tool === 'rect-fill')
  return ellipse(a, b, tool === 'ellipse-fill')
}

/**
 * The naksha: a knot chart you draw on. Painting writes into the chart in place and repaints only
 * the touched knots; nothing re-renders React until the stroke ends (then it's one undo step).
 * The chart is drawn crisp at any zoom with graph-paper lines (every knot when zoomed in, a
 * stronger line every 10), numbered rulers, symmetry guides and a live preview of shapes.
 */
export default function ChartCanvas({ doc, layer, rgb, tool, brushSize, symmetry, yarn, selection, paste, marks, onPick, onSelect, onStamped, onStroke, ref }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const chartImage = useRef<{ canvas: HTMLCanvasElement; data: ImageData } | null>(null)
  const view = useRef<View>({ s: 1, ox: 0, oy: 0 })
  const fitted = useRef(false)
  const preview = useRef<Cell[]>([])
  const hover = useRef<Cell | null>(null)
  const drag = useRef<{ kind: 'paint' | 'shape' | 'pan' | 'select'; start: Cell; last: Cell; stroke?: Stroke; px?: number; py?: number; ox?: number; oy?: number } | null>(null)
  const spaceDown = useRef(false)
  const raf = useRef(0)
  const [cursor, setCursor] = useState<Cell>({ c: 0, r: 0 })
  const [readout, setReadout] = useState('')
  const { cols, rows } = layer

  // ---- the chart as an image: all visible chart layers, top-most non-empty knot wins -----
  const charts = doc.layers.filter((l): l is ChartLayer => l.kind === 'chart' && l.visible && l.cols === cols && l.rows === rows)

  const colourAt = useCallback(
    (i: number): [number, number, number, number] => {
      for (let k = charts.length - 1; k >= 0; k--) {
        const v = charts[k].cells[i]
        if (v) {
          const c = rgb[v] ?? [204, 204, 204]
          return [c[0], c[1], c[2], 255]
        }
      }
      return [0, 0, 0, 0]
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- charts is derived from doc
    [doc, rgb],
  )

  const rebuild = useCallback(() => {
    const c = document.createElement('canvas')
    c.width = cols
    c.height = rows
    const ctx = c.getContext('2d')!
    const data = ctx.createImageData(cols, rows)
    for (let i = 0; i < cols * rows; i++) data.data.set(colourAt(i), i * 4)
    ctx.putImageData(data, 0, 0)
    chartImage.current = { canvas: c, data }
  }, [cols, rows, colourAt])

  /** Repaint just these knots in the chart image (after an in-place edit). */
  const refresh = useCallback(
    (indexes: number[]) => {
      const img = chartImage.current
      if (!img || !indexes.length) return
      let c0 = cols
      let r0 = rows
      let c1 = -1
      let r1 = -1
      for (const i of indexes) {
        img.data.data.set(colourAt(i), i * 4)
        const c = i % cols
        const r = (i - c) / cols
        if (c < c0) c0 = c
        if (c > c1) c1 = c
        if (r < r0) r0 = r
        if (r > r1) r1 = r
      }
      img.canvas.getContext('2d')!.putImageData(img.data, 0, 0, c0, r0, c1 - c0 + 1, r1 - r0 + 1)
    },
    [cols, rows, colourAt],
  )

  // ---- drawing the screen -----------------------------------------------------------------
  /** A knot's height over its width: across / down knots per inch (1 for square knots). */
  const aspect = doc.density.across / doc.density.down
  /** The rug's outline in feet when it isn't a rectangle. */
  const outline = doc.shape.kind === 'rect' ? null : shapePathFt(doc.shape, doc.widthFt, doc.heightFt)
  const draw = useCallback(() => {
    raf.current = 0
    const cv = canvas.current
    const img = chartImage.current
    if (!cv || !img) return
    const dpr = window.devicePixelRatio || 1
    const W = cv.width / dpr
    const H = cv.height / dpr
    const g = cv.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, W, H)
    const { s, ox, oy } = view.current
    // Knots aren't always square (a kilim has more weft rows than warps per inch): y has its own scale.
    const sy = s * aspect
    // The rug, crisp, on a soft shadow; empty knots show a light checker so they read as empty.
    g.save()
    g.shadowColor = 'rgba(31,27,22,0.28)'
    g.shadowBlur = 24
    g.shadowOffsetY = 10
    g.fillStyle = '#e9e1d2'
    g.fillRect(ox, oy, cols * s, rows * sy)
    g.restore()
    g.imageSmoothingEnabled = false
    g.drawImage(img.canvas, ox, oy, cols * s, rows * sy)

    const c0 = Math.max(0, Math.floor(-ox / s))
    const r0 = Math.max(0, Math.floor(-oy / sy))
    const c1 = Math.min(cols, Math.ceil((W - ox) / s))
    const r1 = Math.min(rows, Math.ceil((H - oy) / sy))
    // Close enough to see knots: each takes its yarn's fibre and pile (wool fuzzy, silk glossy).
    const flat = doc.construction === 'flatweave'
    const sprites = doc.palette.map((y) => knotSprite(y.fibre, doc.construction === 'knotted' ? y.pile : undefined, flat))
    const one = sprites.every((sp) => sp === sprites[0]) ? sprites[0] : null
    if (sprites.length && s >= (one ? 4 : 7)) {
      g.save()
      g.globalCompositeOperation = 'overlay'
      g.imageSmoothingEnabled = true
      if (one) {
        // Every yarn the same fibre: one tiled fill over the painted knots.
        const pattern = g.createPattern(one, 'repeat')!
        pattern.setTransform(new DOMMatrix([s / one.width, 0, 0, sy / one.height, ox, oy]))
        g.globalCompositeOperation = 'source-over'
        const tmp = document.createElement('canvas')
        tmp.width = Math.ceil((c1 - c0) * s)
        tmp.height = Math.ceil((r1 - r0) * sy)
        const t = tmp.getContext('2d')!
        // Mask the pattern to painted knots via the chart image's alpha.
        t.imageSmoothingEnabled = false
        t.drawImage(img.canvas, c0, r0, c1 - c0, r1 - r0, 0, 0, tmp.width, tmp.height)
        t.globalCompositeOperation = 'source-in'
        t.translate(-(ox + c0 * s), -(oy + r0 * sy))
        t.fillStyle = pattern
        t.fillRect(ox + c0 * s, oy + r0 * sy, tmp.width, tmp.height)
        g.globalCompositeOperation = 'overlay'
        g.drawImage(tmp, ox + c0 * s, oy + r0 * sy)
      } else {
        for (let r = r0; r < r1; r++)
          for (let c = c0; c < c1; c++) {
            const i = r * cols + c
            let v = 0
            for (let k = charts.length - 1; k >= 0 && !v; k--) v = charts[k].cells[i]
            const sprite = v ? sprites[v - 1] : undefined
            if (sprite) g.drawImage(sprite, ox + c * s, oy + r * sy, s, sy)
          }
      }
      g.restore()
    }
    // Graph paper: every knot when there's room, and every tenth knot stronger.
    g.lineWidth = 1
    if (s >= 6) {
      g.strokeStyle = 'rgba(31,27,22,0.12)'
      g.beginPath()
      for (let c = c0; c <= c1; c++) {
        const x = Math.round(ox + c * s) + 0.5
        g.moveTo(x, oy + r0 * sy)
        g.lineTo(x, oy + r1 * sy)
      }
      for (let r = r0; r <= r1; r++) {
        const y = Math.round(oy + r * sy) + 0.5
        g.moveTo(ox + c0 * s, y)
        g.lineTo(ox + c1 * s, y)
      }
      g.stroke()
    }
    if (s >= 1.2) {
      g.strokeStyle = 'rgba(31,27,22,0.32)'
      g.beginPath()
      for (let c = Math.ceil(c0 / 10) * 10; c <= c1; c += 10) {
        const x = Math.round(ox + c * s) + 0.5
        g.moveTo(x, oy + r0 * sy)
        g.lineTo(x, oy + r1 * sy)
      }
      for (let r = Math.ceil(r0 / 10) * 10; r <= r1; r += 10) {
        const y = Math.round(oy + r * sy) + 0.5
        g.moveTo(ox + c0 * s, y)
        g.lineTo(ox + c1 * s, y)
      }
      g.stroke()
    }
    // A shaped rug: knots outside its outline are veiled, and its edge drawn.
    if (outline) {
      g.save()
      g.translate(ox, oy)
      g.scale((cols * s) / doc.widthFt, (rows * sy) / doc.heightFt)
      g.fillStyle = 'rgba(236,229,216,0.78)'
      g.fill(new Path2D(`M0,0H${doc.widthFt}V${doc.heightFt}H0Z${outline}`), 'evenodd')
      g.restore()
      g.save()
      g.translate(ox, oy)
      g.scale((cols * s) / doc.widthFt, (rows * sy) / doc.heightFt)
      g.lineWidth = (1.5 * doc.widthFt) / (cols * s)
      g.strokeStyle = 'rgba(31,27,22,0.55)'
      g.stroke(new Path2D(outline))
      g.restore()
    }
    // Long kilim slits, marked in red along their boundary.
    if (marks?.length) {
      g.save()
      g.strokeStyle = '#c0392b'
      g.lineWidth = Math.max(2, s * 0.35)
      g.beginPath()
      for (const m of marks.slice(0, 2000)) {
        const x = ox + (m.c + 1) * s
        g.moveTo(x, oy + m.r0 * sy)
        g.lineTo(x, oy + (m.r1 + 1) * sy)
      }
      g.stroke()
      g.restore()
    }
    // Symmetry guides.
    if (symmetry !== 'none') {
      g.save()
      g.strokeStyle = 'rgba(168,53,43,0.7)'
      g.setLineDash([6, 4])
      g.beginPath()
      if (symmetry !== 'mirror-y') {
        g.moveTo(ox + (cols / 2) * s, oy)
        g.lineTo(ox + (cols / 2) * s, oy + rows * sy)
      }
      if (symmetry !== 'mirror-x') {
        g.moveTo(ox, oy + (rows / 2) * sy)
        g.lineTo(ox + cols * s, oy + (rows / 2) * sy)
      }
      if (symmetry === 'radial-8') {
        g.moveTo(ox, oy)
        g.lineTo(ox + cols * s, oy + rows * sy)
        g.moveTo(ox + cols * s, oy)
        g.lineTo(ox, oy + rows * sy)
      }
      g.stroke()
      g.restore()
    }
    // Shape preview, paste ghost.
    const ghost = (cells: Cell[], fill: string) => {
      g.fillStyle = fill
      for (const p of cells) g.fillRect(ox + p.c * s, oy + p.r * sy, Math.max(1, s), Math.max(1, sy))
    }
    const yc = rgb[yarn] ?? [168, 53, 43]
    if (preview.current.length) ghost(preview.current, tool === 'eraser' ? 'rgba(255,255,255,0.7)' : `rgba(${yc[0]},${yc[1]},${yc[2]},0.85)`)
    if (paste && hover.current) {
      g.globalAlpha = 0.7
      for (const copy of symmetricStamps(paste, hover.current, cols, rows, symmetry))
        for (const { index, value } of stampCells(copy.patch, copy.at, cols, rows)) {
          const c = rgb[value] ?? [204, 204, 204]
          g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`
          g.fillRect(ox + (index % cols) * s, oy + Math.floor(index / cols) * sy, Math.max(1, s), Math.max(1, sy))
        }
      g.globalAlpha = 1
    }
    // Selection marquee.
    if (selection) {
      const x = ox + Math.min(selection.a.c, selection.b.c) * s
      const y = oy + Math.min(selection.a.r, selection.b.r) * sy
      const w = (Math.abs(selection.b.c - selection.a.c) + 1) * s
      const h = (Math.abs(selection.b.r - selection.a.r) + 1) * sy
      g.save()
      g.strokeStyle = '#1f1b16'
      g.setLineDash([5, 4])
      g.lineWidth = 1.5
      g.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h)
      g.restore()
    }
    // Hover / keyboard cursor.
    const cur = hover.current
    if (cur) {
      g.strokeStyle = '#e2a73a'
      g.lineWidth = 2
      const size = tool === 'pencil' || tool === 'eraser' ? brushSize : 1
      const lo = -Math.floor((size - 1) / 2)
      g.strokeRect(ox + (cur.c + lo) * s, oy + (cur.r + lo) * sy, Math.max(2, s * size), Math.max(2, sy * size))
    }
    // Rulers: numbers every 10 knots along the top and left.
    if (s >= 3) {
      g.fillStyle = 'rgba(251,248,242,0.9)'
      g.fillRect(0, 0, W, 16)
      g.fillRect(0, 0, 26, H)
      g.fillStyle = '#5a5248'
      g.font = '10px system-ui, sans-serif'
      g.textAlign = 'center'
      const step = s >= 6 ? 10 : s >= 3 ? 20 : 50
      for (let c = Math.ceil(c0 / step) * step; c <= c1; c += step) if (ox + c * s > 30) g.fillText(String(c), ox + c * s, 11)
      g.textAlign = 'right'
      for (let r = Math.ceil(r0 / step) * step; r <= r1; r += step) if (oy + r * sy > 20) g.fillText(String(r), 23, oy + r * sy + 3)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- charts is derived from doc
  }, [cols, rows, symmetry, rgb, yarn, tool, brushSize, paste, selection, outline, doc, marks, aspect])

  const schedule = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(draw)
  }, [draw])

  const fit = useCallback(() => {
    const el = box.current
    if (!el) return
    const W = el.clientWidth
    const H = el.clientHeight
    const s = Math.max(0.05, Math.min((W - 60) / cols, (H - 60) / (rows * aspect)))
    view.current = { s, ox: (W - cols * s) / 2 + 10, oy: (H - rows * s * aspect) / 2 + 8 }
    schedule()
  }, [cols, rows, schedule, aspect])

  const zoomAt = useCallback(
    (k: number, px: number, py: number) => {
      const v = view.current
      const s = Math.max(0.05, Math.min(64, v.s * k))
      const f = s / v.s
      view.current = { s, ox: px - (px - v.ox) * f, oy: py - (py - v.oy) * f }
      schedule()
    },
    [schedule],
  )

  useImperativeHandle(ref, () => ({
    fit,
    zoomBy: (k) => {
      const el = box.current
      if (el) zoomAt(k, el.clientWidth / 2, el.clientHeight / 2)
    },
  }))

  // Rebuild the chart image when the document changes (undo, layers, palette), then draw.
  useEffect(() => {
    rebuild()
    schedule()
  }, [rebuild, schedule])

  // Size the canvas to its box (sharp on high-DPI screens); fit the first time.
  useEffect(() => {
    const el = box.current
    const cv = canvas.current
    if (!el || !cv) return
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      cv.width = Math.round(el.clientWidth * dpr)
      cv.height = Math.round(el.clientHeight * dpr)
      cv.style.width = `${el.clientWidth}px`
      cv.style.height = `${el.clientHeight}px`
      if (!fitted.current) {
        fitted.current = true
        fit()
      } else schedule()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit, schedule])

  useEffect(() => schedule(), [schedule])
  useEffect(
    () => () => {
      // Clear the handle too, or a remount (React's dev double-mount) could never draw again.
      cancelAnimationFrame(raf.current)
      raf.current = 0
    },
    [],
  )

  // ---- input ----------------------------------------------------------------------------
  const cellAt = (e: { clientX: number; clientY: number }): Cell => {
    const r = canvas.current!.getBoundingClientRect()
    const { s, ox, oy } = view.current
    return { c: Math.floor((e.clientX - r.left - ox) / s), r: Math.floor((e.clientY - r.top - oy) / (s * aspect)) }
  }
  const inside = (p: Cell) => p.c >= 0 && p.r >= 0 && p.c < cols && p.r < rows
  const value = tool === 'eraser' ? 0 : yarn

  const describe = useCallback(
    (p: Cell) => {
      if (!inside(p)) return ''
      const i = p.r * cols + p.c
      const v = colourAt(i)[3] ? charts.findLast((l) => l.cells[i])?.cells[i] ?? 0 : 0
      return `Column ${p.c + 1}, row ${p.r + 1}${v ? `, yarn ${v}` : ', empty'}`
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- charts is derived from doc
    [cols, colourAt, doc],
  )

  /** Paint cells (expanded by symmetry) into the active layer, in place. */
  const paintCells = (stroke: Stroke, cells: Cell[], v: number) => {
    const touched: number[] = []
    for (const cell of cells)
      for (const p of symmetric(cell, cols, rows, symmetry)) {
        const i = p.r * cols + p.c
        if (stroke.set(layer, i, v)) touched.push(i)
      }
    refresh(touched)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    canvas.current?.focus()
    const p = cellAt(e)
    const panning = tool === 'hand' || spaceDown.current || e.button === 1
    canvas.current?.setPointerCapture(e.pointerId)
    if (panning) {
      drag.current = { kind: 'pan', start: p, last: p, px: e.clientX, py: e.clientY, ox: view.current.ox, oy: view.current.oy }
      return
    }
    if (e.button !== 0 || !inside(p)) return
    setCursor(p)
    if (paste) {
      const stroke = new Stroke(layer.id)
      const touched: number[] = []
      for (const copy of symmetricStamps(paste, p, cols, rows, symmetry))
        for (const { index, value: v } of stampCells(copy.patch, copy.at, cols, rows)) if (stroke.set(layer, index, v)) touched.push(index)
      refresh(touched)
      onStroke(stroke)
      onStamped()
      schedule()
      return
    }
    if (tool === 'pick') {
      const i = p.r * cols + p.c
      const v = charts.findLast((l) => l.cells[i])?.cells[i] ?? 0
      if (v) onPick(v)
      return
    }
    if (tool === 'fill') {
      const stroke = new Stroke(layer.id)
      const touched: number[] = []
      for (const start of symmetric(p, cols, rows, symmetry))
        for (const i of floodFill(layer.cells, cols, rows, start)) if (stroke.set(layer, i, yarn)) touched.push(i)
      refresh(touched)
      onStroke(stroke)
      schedule()
      return
    }
    if (tool === 'select') {
      drag.current = { kind: 'select', start: p, last: p }
      onSelect({ a: p, b: p })
      return
    }
    if (SHAPE_TOOLS.has(tool)) {
      drag.current = { kind: 'shape', start: p, last: p }
      preview.current = symmetricCells(shapeCells(tool, p, p))
      schedule()
      return
    }
    const stroke = new Stroke(layer.id)
    drag.current = { kind: 'paint', start: p, last: p, stroke }
    paintCells(stroke, brush(p, brushSize), value)
    schedule()
  }

  const symmetricCells = (cells: Cell[]) => cells.flatMap((c) => symmetric(c, cols, rows, symmetry))

  const onPointerMove = (e: React.PointerEvent) => {
    const p = cellAt(e)
    hover.current = inside(p) ? p : null
    const d = drag.current
    if (!d) {
      setReadout(describe(p))
      schedule()
      return
    }
    if (d.kind === 'pan') {
      view.current = { ...view.current, ox: d.ox! + (e.clientX - d.px!), oy: d.oy! + (e.clientY - d.py!) }
      schedule()
      return
    }
    if (p.c === d.last.c && p.r === d.last.r) return
    if (d.kind === 'paint' && d.stroke) paintCells(d.stroke, line(d.last, p).flatMap((q) => brush(q, brushSize)), value)
    else if (d.kind === 'shape') preview.current = symmetricCells(shapeCells(tool, d.start, p))
    else if (d.kind === 'select') onSelect({ a: d.start, b: { c: Math.max(0, Math.min(cols - 1, p.c)), r: Math.max(0, Math.min(rows - 1, p.r)) } })
    d.last = p
    schedule()
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.kind === 'paint' && d.stroke) onStroke(d.stroke)
    else if (d.kind === 'shape') {
      const stroke = new Stroke(layer.id)
      const touched: number[] = []
      for (const q of preview.current) {
        if (!inside(q)) continue
        const i = q.r * cols + q.c
        if (stroke.set(layer, i, value)) touched.push(i)
      }
      preview.current = []
      refresh(touched)
      onStroke(stroke)
    }
    schedule()
  }

  const onWheel = (e: React.WheelEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
  }

  // Keyboard drawing: arrows move the cursor, Enter/Space paints it (with the brush and symmetry).
  const onKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const m = moves[e.key]
    if (m) {
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      const next = { c: Math.max(0, Math.min(cols - 1, cursor.c + m[0] * step)), r: Math.max(0, Math.min(rows - 1, cursor.r + m[1] * step)) }
      setCursor(next)
      hover.current = next
      setReadout(describe(next))
      schedule()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const stroke = new Stroke(layer.id)
      paintCells(stroke, brush(cursor, brushSize), value)
      onStroke(stroke)
      setReadout(describe(cursor))
      schedule()
    }
  }

  // Space held: pan while dragging.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement)?.closest('input,textarea,select,button')) spaceDown.current = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const cursorStyle = tool === 'hand' ? 'cursor-grab' : tool === 'pick' ? 'cursor-copy' : 'cursor-crosshair'

  return (
    <div ref={box} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvas}
        tabIndex={0}
        role="application"
        aria-roledescription="knot chart"
        aria-label={`Knot chart, ${cols} by ${rows}. Arrow keys move, Shift moves by ten, Enter paints.`}
        className={`block touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent ${cursorStyle}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          if (!drag.current) {
            hover.current = null
            schedule()
          }
        }}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => e.preventDefault()}
      />
      <p className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-paper/90 px-3 py-1 text-[0.8125rem] text-ink-2 shadow-[var(--shadow-soft)]" aria-live="polite">
        {readout || `${cols.toLocaleString()} × ${rows.toLocaleString()} knots`}
      </p>
    </div>
  )
}
