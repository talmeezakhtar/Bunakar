import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Swatch } from '../../types/swatch'
import type { CutType, Rotation, Slot, TileDesignState } from '../../types/tileDesign'
import { tileKey } from '../../types/tileDesign'
import { canPlacePiece, cutPath, findPieceIndexAt, isPositionable, slotAt } from './cutShapes'
import { renderTileFills } from './renderTiles'

type CellPoint = { row: number; col: number }
type HoverPoint = CellPoint & { slot?: Slot }

type PaletteDragPiece = { swatchId: string; cutType: CutType; rotation: Rotation } | null

export type SelectedPiece = { row: number; col: number; index: number }

type TileGridSvgProps = {
  state: TileDesignState
  swatchesById: Map<string, Swatch>
  activeBrush: string | null
  activeCut: CutType
  activeRotation: Rotation
  previewMode: boolean
  onStrokeBegin: () => void
  onStrokeUpdate: (
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    swatchId: string,
    cutType: CutType,
    rotation: Rotation,
    slot: Slot | undefined,
  ) => void
  onStrokeEnd: () => void
  /** A style-chip drag currently in flight (originates outside the grid, from My Styles). */
  dragPiece: PaletteDragPiece
  onDragHoverTile: (row: number, col: number, slot: Slot | undefined) => void
  selectedPiece: SelectedPiece | null
  onSelectPiece: (row: number, col: number, index: number) => void
  onDeselectPiece: () => void
}

function TileGridSvg({
  state,
  swatchesById,
  activeBrush,
  activeCut,
  activeRotation,
  previewMode,
  onStrokeBegin,
  onStrokeUpdate,
  onStrokeEnd,
  dragPiece,
  onDragHoverTile,
  selectedPiece,
  onSelectPiece,
  onDeselectPiece,
}: TileGridSvgProps) {
  const { widthTiles: W, heightTiles: H, orientation, tiles } = state
  const rootGroupRef = useRef<SVGGElement>(null)
  const isPaintingRef = useRef(false)
  const strokeStartRef = useRef<HoverPoint | null>(null)
  const [hover, setHover] = useState<HoverPoint | null>(null)

  // The piece that would be placed right now, whether from an in-flight palette drag or
  // simply from the currently-selected brush + cut while hovering (no drag needed).
  const previewPiece: PaletteDragPiece = dragPiece ?? (activeBrush ? { swatchId: activeBrush, cutType: activeCut, rotation: activeRotation } : null)

  function screenToLocal(clientX: number, clientY: number): { x: number; y: number } | null {
    const g = rootGroupRef.current
    if (!g) return null
    const ctm = g.getScreenCTM()
    if (!ctm) return null
    const svg = g.ownerSVGElement
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const local = pt.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }

  function pointFromEvent(e: ReactPointerEvent): HoverPoint | null {
    const local = screenToLocal(e.clientX, e.clientY)
    if (!local) return null
    const col = Math.floor(local.x)
    const row = Math.floor(local.y)
    if (col < 0 || col >= W || row < 0 || row >= H) return null
    const fracX = local.x - col
    const fracY = local.y - row
    const cutType = dragPiece?.cutType ?? activeCut
    const rotation = dragPiece?.rotation ?? activeRotation
    const slot = slotAt(cutType, fracX, fracY, rotation)
    return { row, col, slot }
  }

  function handlePointerDown(e: ReactPointerEvent) {
    if (e.button !== 0 || dragPiece) return
    const local = screenToLocal(e.clientX, e.clientY)
    if (!local) {
      if (selectedPiece) onDeselectPiece()
      return
    }
    const col = Math.floor(local.x)
    const row = Math.floor(local.y)
    if (col < 0 || col >= W || row < 0 || row >= H) {
      if (selectedPiece) onDeselectPiece()
      return
    }
    const fracX = local.x - col
    const fracY = local.y - row

    // Clicking directly on an already-placed piece selects it for editing instead of
    // painting over it; clicking anywhere else - including empty space - clears any
    // existing selection so the edit toolbar only shows while a piece is actually selected.
    const existingPieces = tiles[tileKey(row, col)] ?? []
    const hitIndex = findPieceIndexAt(existingPieces, fracX, fracY)
    if (hitIndex >= 0) {
      onSelectPiece(row, col, hitIndex)
      return
    }
    if (selectedPiece) onDeselectPiece()

    if (!activeBrush) return
    const slot = slotAt(activeCut, fracX, fracY, activeRotation)
    const point: HoverPoint = { row, col, slot }
    isPaintingRef.current = true
    strokeStartRef.current = point
    onStrokeBegin()
    onStrokeUpdate(point.row, point.col, point.row, point.col, activeBrush, activeCut, activeRotation, point.slot)
  }

  function handlePointerMove(e: ReactPointerEvent) {
    const point = pointFromEvent(e)
    setHover(point)
    if (!point) return

    if (dragPiece) {
      onDragHoverTile(point.row, point.col, point.slot)
      return
    }
    if (isPaintingRef.current && activeBrush && strokeStartRef.current) {
      const start = strokeStartRef.current
      onStrokeUpdate(start.row, start.col, point.row, point.col, activeBrush, activeCut, activeRotation, start.slot)
    }
  }

  function handlePointerLeave() {
    setHover(null)
  }

  // Window-level so a stroke still ends correctly even if the pointer is released after
  // dragging outside the grid's own hit area.
  useEffect(() => {
    function onUp() {
      if (isPaintingRef.current) {
        isPaintingRef.current = false
        strokeStartRef.current = null
        onStrokeEnd()
      }
    }
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [onStrokeEnd])

  const diag = Math.sqrt(W * W + H * H)
  const viewW = orientation === 'diagonal' ? diag : W
  const viewH = orientation === 'diagonal' ? diag : H
  const offsetX = (viewW - W) / 2
  const offsetY = (viewH - H) / 2
  const rotation = orientation === 'diagonal' ? 45 : 0

  const cells: ReturnType<typeof renderTileFills> = renderTileFills(state, swatchesById)
  const marks = []
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      if (!previewMode) {
        cells.push(
          <rect
            key={`grid-${row}-${col}`}
            x={col}
            y={row}
            width={1}
            height={1}
            fill="none"
            stroke="#ffffffb3"
            strokeWidth={0.012}
            className="pointer-events-none"
          />,
        )
        marks.push(
          <path
            key={`mark-${row}-${col}`}
            d={`M${col + 0.46},${row + 0.5} h0.08 M${col + 0.5},${row + 0.46} v0.08`}
            stroke="#ffffffcc"
            strokeWidth={0.012}
            className="pointer-events-none"
          />,
        )
      }
    }
  }

  let ghost = null
  if (previewPiece && hover) {
    const swatch = swatchesById.get(previewPiece.swatchId)
    const existing = tiles[tileKey(hover.row, hover.col)] ?? []
    const candidate = { cutType: previewPiece.cutType, rotation: previewPiece.rotation, slot: hover.slot }
    const valid = canPlacePiece(existing, candidate)
    const ghostRotation = isPositionable(previewPiece.cutType) ? 0 : previewPiece.rotation
    ghost = (
      <g key="hover-ghost" transform={`translate(${hover.col} ${hover.row})`} className="pointer-events-none">
        <g transform={`rotate(${ghostRotation} 0.5 0.5)`}>
          <path
            d={cutPath(previewPiece.cutType, hover.slot, previewPiece.rotation)}
            fill={valid ? (swatch?.swatchColor ?? '#999') : '#dc2626'}
            fillOpacity={0.55}
            stroke={valid ? '#16a34a' : '#dc2626'}
            strokeWidth={0.02}
            strokeDasharray="0.06 0.04"
          />
        </g>
      </g>
    )
  }

  let selectionHighlight = null
  if (selectedPiece) {
    const piece = tiles[tileKey(selectedPiece.row, selectedPiece.col)]?.[selectedPiece.index]
    if (piece) {
      const highlightRotation = isPositionable(piece.cutType) ? 0 : piece.rotation
      selectionHighlight = (
        <g
          key="selection-highlight"
          transform={`translate(${selectedPiece.col} ${selectedPiece.row})`}
          className="pointer-events-none"
        >
          <g transform={`rotate(${highlightRotation} 0.5 0.5)`}>
            <path
              d={cutPath(piece.cutType, piece.slot, piece.rotation)}
              fill="none"
              stroke="#f0c774"
              strokeWidth={0.035}
              strokeDasharray="0.08 0.05"
            />
          </g>
        </g>
      )
    }
  }

  return (
    <svg
      viewBox={`${-offsetX} ${-offsetY} ${viewW} ${viewH}`}
      className="h-full w-full select-none"
      style={{ touchAction: 'none' }}
    >
      <g ref={rootGroupRef} transform={`rotate(${rotation} ${W / 2} ${H / 2})`}>
        {!previewMode && (
          <rect x={0} y={0} width={W} height={H} fill="none" stroke="#ffffff" strokeWidth={0.03} />
        )}
        {cells}
        {marks}
        {ghost}
        {selectionHighlight}
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="transparent"
          style={{ pointerEvents: 'all' }}
          className={activeBrush || dragPiece ? 'cursor-crosshair' : 'cursor-default'}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        />
      </g>
    </svg>
  )
}

export default TileGridSvg
