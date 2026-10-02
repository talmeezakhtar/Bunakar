import { useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { Swatch } from '../../types/swatch'
import type { FreeformDesignState, FreeformShape, Point, SurfaceFinish } from '../../types/freeform'
import { shapePath } from '../../utils/freeformGeometry'
import { newShapeId, stampPoints } from '../../data/freeformGenerators'
import { insertVertex, moveShape, moveVertex, topShapeAt } from '../../store/freeformOps'
import type { FreeformTarget } from '../../store/freeformOps'
import { patternPrefix } from '../tileDesigner/renderTiles'
import { renderFreeform } from './renderFreeform'
import lightWoodImg from '../../assets/floors/light-wood.jpg'
import darkWoodImg from '../../assets/floors/dark-wood.jpg'
import concreteImg from '../../assets/floors/concrete.jpg'

export type FreeformTool = 'select' | 'paint' | 'pen' | 'stamp'

const FLOORS: Record<string, string | undefined> = { 'light-wood': lightWoodImg, 'dark-wood': darkWoodImg, concrete: concreteImg }

type Drag =
  | { kind: 'move'; id: string; start: Point }
  | { kind: 'vertex'; id: string; index: number }
  | null

type FreeformCanvasProps = {
  state: FreeformDesignState
  swatchesById: Map<string, Swatch>
  tool: FreeformTool
  zoom: number
  brush: SurfaceFinish
  penSmooth: boolean
  stamp: { libraryId: string; size: number; rotation: number }
  selected: FreeformTarget | null
  selectedVertex: number | null
  onSelect: (target: FreeformTarget | null, vertex?: number | null) => void
  onPaint: (target: FreeformTarget) => void
  onAddShape: (shape: FreeformShape) => void
  onDeleteSelection: () => void
  onNudge: (dx: number, dy: number) => void
  begin: () => void
  live: (edit: (baseline: FreeformDesignState) => FreeformDesignState) => void
  end: () => void
}

/** The freeform editing surface: the rug (in feet) over a floor, with tool interactions. */
function FreeformCanvas({
  state,
  swatchesById,
  tool,
  zoom,
  brush,
  penSmooth,
  stamp,
  selected,
  selectedVertex,
  onSelect,
  onPaint,
  onAddShape,
  onDeleteSelection,
  onNudge,
  begin,
  live,
  end,
}: FreeformCanvasProps) {
  const prefix = patternPrefix(useId())
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<Drag>(null)
  const [penDraft, setDraft] = useState<Point[]>([])
  // The in-progress pen outline belongs to the pen tool; other tools simply don't see it.
  const draft = tool === 'pen' ? penDraft : []
  const [cursor, setCursor] = useState<Point | null>(null)
  const { widthFt: W, heightFt: H } = state

  // On-screen size: fits the stage, then zooms. Handles are sized in screen pixels via this.
  const aspect = W / H
  const baseW = aspect >= 1 ? 560 : 560 * aspect
  const widthPx = Math.max(120, baseW * zoom)
  const heightPx = widthPx / aspect
  const ftPerPx = W / widthPx
  const handleR = 6 * ftPerPx


  const rugArt = useMemo(() => renderFreeform(state, swatchesById, prefix), [state, swatchesById, prefix])

  function toRug(e: { clientX: number; clientY: number }): Point | null {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  const selectedShape = selected && selected !== 'ground' ? state.shapes.find((s) => s.id === selected) : undefined

  function finishPen(points: Point[]) {
    if (points.length >= 3) onAddShape({ id: newShapeId(), points, smooth: penSmooth, ...brush })
    setDraft([])
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    const p = toRug(e)
    if (!p) return
    svgRef.current?.focus()
    const handle = (e.target as Element).closest('[data-handle]')

    if (tool !== 'pen' && penDraft.length) setDraft([])

    if (tool === 'select') {
      if (handle && selectedShape) {
        const kind = handle.getAttribute('data-handle')
        let index = Number(handle.getAttribute('data-index'))
        begin()
        if (kind === 'mid') {
          // A "+" between two points: insert one there and drag it straight away.
          live((s) => insertVertex(s, selectedShape.id, index))
          index += 1
        }
        onSelect(selectedShape.id, index)
        setDrag({ kind: 'vertex', id: selectedShape.id, index })
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        return
      }
      const hit = topShapeAt(state, p)
      if (!hit) {
        onSelect(p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H ? 'ground' : null)
        return
      }
      onSelect(hit.id, null)
      begin()
      setDrag({ kind: 'move', id: hit.id, start: p })
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      return
    }
    if (tool === 'paint') {
      const hit = topShapeAt(state, p)
      if (hit) onPaint(hit.id)
      else if (p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H) onPaint('ground')
      return
    }
    if (tool === 'pen') {
      // Clicking back on the first point closes the shape.
      if (draft.length >= 3 && Math.hypot(p.x - draft[0].x, p.y - draft[0].y) < handleR * 2) {
        finishPen(draft)
        return
      }
      setDraft([...draft, p])
      return
    }
    if (tool === 'stamp') {
      onAddShape({ id: newShapeId(), points: stampPoints(stamp.libraryId, p, stamp.size, stamp.rotation), smooth: true, ...brush })
    }
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const p = toRug(e)
    setCursor(p)
    if (!p || !drag) return
    if (drag.kind === 'move') live((s) => moveShape(s, drag.id, p.x - drag.start.x, p.y - drag.start.y))
    else live((s) => moveVertex(s, drag.id, drag.index, p))
  }

  function handlePointerUp() {
    if (!drag) return
    setDrag(null)
    end()
  }

  function handleKeyDown(e: ReactKeyboardEvent) {
    if (tool === 'pen' && e.key === 'Enter') {
      e.preventDefault()
      finishPen(draft)
    } else if (e.key === 'Escape') {
      if (draft.length) setDraft([])
      else onSelect(null)
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      e.preventDefault()
      onDeleteSelection()
    } else if (e.key.startsWith('Arrow') && selectedShape) {
      e.preventDefault()
      const step = e.shiftKey ? 0.5 : 0.1
      onNudge(e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)
    }
  }

  const floor = FLOORS[state.backgroundId]
  const cursorClass = tool === 'select' ? (drag ? 'cursor-grabbing' : 'cursor-default') : tool === 'paint' ? 'cursor-pointer' : 'cursor-crosshair'
  const stampGhost = tool === 'stamp' && cursor ? shapePath(stampPoints(stamp.libraryId, cursor, stamp.size, stamp.rotation), true) : null

  return (
    <div
      className="flex flex-1 items-center justify-center overflow-auto p-8"
      style={floor ? { backgroundImage: `url(${floor})`, backgroundSize: '220px auto' } : { backgroundColor: '#1c2444' }}
    >
      <svg
        ref={svgRef}
        width={widthPx}
        height={heightPx}
        viewBox={`0 0 ${W} ${H}`}
        tabIndex={0}
        role="application"
        aria-roledescription="freeform rug canvas"
        aria-label={`Freeform rug, ${W} by ${H} feet. ${state.shapes.length} shapes.`}
        className={`shrink-0 touch-none select-none overflow-visible shadow-[0_14px_36px_rgba(0,0,0,0.5)] outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${cursorClass}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => setCursor(null)}
        onDoubleClick={() => tool === 'pen' && finishPen(draft)}
        onKeyDown={handleKeyDown}
      >
        {rugArt}

        {selected === 'ground' && (
          <rect x={0} y={0} width={W} height={H} fill="none" stroke="#f0c774" strokeWidth={2 * ftPerPx} strokeDasharray={`${8 * ftPerPx} ${5 * ftPerPx}`} className="pointer-events-none" />
        )}

        {selectedShape && (
          <g>
            <path
              d={shapePath(selectedShape.points, selectedShape.smooth)}
              fill="none"
              stroke="#f0c774"
              strokeWidth={2 * ftPerPx}
              strokeDasharray={`${8 * ftPerPx} ${5 * ftPerPx}`}
              className="pointer-events-none"
            />
            {tool === 'select' && (
              <>
                {selectedShape.points.map((p, i) => {
                  const q = selectedShape.points[(i + 1) % selectedShape.points.length]
                  return (
                    <circle
                      key={`m${i}`}
                      data-handle="mid"
                      data-index={i}
                      cx={(p.x + q.x) / 2}
                      cy={(p.y + q.y) / 2}
                      r={handleR * 0.6}
                      fill="#f0c774"
                      fillOpacity={0.45}
                      className="cursor-copy"
                    />
                  )
                })}
                {selectedShape.points.map((p, i) => (
                  <circle
                    key={`v${i}`}
                    data-handle="vertex"
                    data-index={i}
                    cx={p.x}
                    cy={p.y}
                    r={handleR}
                    fill={i === selectedVertex ? '#f0c774' : '#0b0f22'}
                    stroke="#f0c774"
                    strokeWidth={1.5 * ftPerPx}
                    className="cursor-move"
                  />
                ))}
              </>
            )}
          </g>
        )}

        {tool === 'pen' && draft.length > 0 && (
          <g className="pointer-events-none">
            <path
              d={`M${[...draft, ...(cursor ? [cursor] : [])].map((p) => `${p.x},${p.y}`).join('L')}`}
              fill="none"
              stroke="#f0c774"
              strokeWidth={2 * ftPerPx}
            />
            {draft.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? handleR * 1.4 : handleR * 0.8} fill={i === 0 ? '#f0c774' : '#0b0f22'} stroke="#f0c774" strokeWidth={1.5 * ftPerPx} />
            ))}
          </g>
        )}

        {stampGhost && (
          <path d={stampGhost} fill={swatchesById.get(brush.swatchId)?.swatchColor ?? '#ccc'} fillOpacity={0.6} stroke="#f0c774" strokeWidth={1.5 * ftPerPx} className="pointer-events-none" />
        )}
      </svg>
    </div>
  )
}

export default FreeformCanvas
