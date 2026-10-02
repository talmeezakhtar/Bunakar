import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { Swatch } from '../../types/swatch'
import type { CutType, DesignOverlay, Rotation, Slot, TileDesignState } from '../../types/tileDesign'
import { tileKey } from '../../types/tileDesign'
import { canPlacePiece, cutPath, findPieceIndexAt, isPositionable, slotAt, slotGrid } from './cutShapes'
import { patternPrefix, renderOverlays, renderTileFills, swatchFill, tilePatternDefs } from './renderTiles'
import { canPlaceOverlay, overlaysUnder } from '../../store/tileDesignReducer'

type CellPoint = { row: number; col: number }
type HoverPoint = CellPoint & { slot?: Slot }

type PaletteDragPiece = { swatchId: string; cutType: CutType; rotation: Rotation } | null

export type SelectedPiece = { row: number; col: number; index: number }

/** The design piece or border currently being laid (design mode). A piece's footprint is
 * already turned by `rotation`; a border's footprint comes from the run the user drags. */
export type DesignTool = {
  assetId: string
  kind: 'piece' | 'border'
  widthTiles: number
  heightTiles: number
  rotation: Rotation
  thickness: 0.5 | 1
}

export type NewOverlay = Omit<DesignOverlay, 'id'>

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
  designTool: DesignTool | null
  selectedOverlayId: string | null
  onSelectOverlay: (id: string | null) => void
  onPlaceOverlay: (overlay: NewOverlay) => void
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
  designTool,
  selectedOverlayId,
  onSelectOverlay,
  onPlaceOverlay,
}: TileGridSvgProps) {
  const prefix = patternPrefix(useId())
  const { widthTiles: W, heightTiles: H, orientation, tiles } = state
  const rootGroupRef = useRef<SVGGElement>(null)
  const isPaintingRef = useRef(false)
  const strokeStartRef = useRef<HoverPoint | null>(null)
  const [hover, setHover] = useState<HoverPoint | null>(null)
  // Keyboard cursor: a cell plus a position inside it (0..1 each axis), so the sub-cell slot
  // re-derives correctly when the cut or rotation changes. Only shown while the grid has focus.
  const [kbCursor, setKbCursor] = useState({ row: 0, col: 0, fx: 0.25, fy: 0.25 })
  const [kbFocused, setKbFocused] = useState(false)
  const [kbMessage, setKbMessage] = useState('')

  // The piece that would be placed right now, whether from an in-flight palette drag or
  // simply from the currently-selected brush + cut while hovering (no drag needed).
  const previewPiece: PaletteDragPiece = designTool
    ? null
    : (dragPiece ?? (activeBrush ? { swatchId: activeBrush, cutType: activeCut, rotation: activeRotation } : null))

  // Border runs are dragged out from this cell (design mode only).
  const [runStart, setRunStart] = useState<CellPoint | null>(null)

  /** Topmost design covering point (x, y) in tile units. */
  function overlayAt(x: number, y: number): DesignOverlay | undefined {
    for (let i = state.overlays.length - 1; i >= 0; i--) {
      const o = state.overlays[i]
      if (x >= o.col && x < o.col + o.widthTiles && y >= o.row && y < o.row + o.heightTiles) return o
    }
    return undefined
  }

  /** Where the active tool would land for pointer cell `cell` (or a run dragged from `from`). */
  function candidateAt(cell: CellPoint, from: CellPoint | null = null): NewOverlay | null {
    if (!designTool) return null
    const { assetId, thickness } = designTool
    if (designTool.kind === 'piece') {
      // Centred on the pointer, nudged inside the rug.
      const w = designTool.widthTiles
      const h = designTool.heightTiles
      const row = Math.min(Math.max(0, cell.row - Math.floor((h - 1) / 2)), Math.max(0, H - h))
      const col = Math.min(Math.max(0, cell.col - Math.floor((w - 1) / 2)), Math.max(0, W - w))
      return { assetId, row, col, widthTiles: w, heightTiles: h, rotation: designTool.rotation }
    }
    // A run along whichever axis the drag mostly follows, its outer edge facing the nearer
    // side of the rug - so a run near the bottom reads as the rug's bottom border.
    const a = from ?? cell
    const horizontal = Math.abs(cell.col - a.col) >= Math.abs(cell.row - a.row)
    if (horizontal) {
      const col = Math.min(a.col, cell.col)
      return {
        assetId, thickness, row: a.row, col, widthTiles: Math.abs(cell.col - a.col) + 1, heightTiles: 1,
        rotation: a.row + 0.5 <= H / 2 ? 0 : 180,
      }
    }
    const row = Math.min(a.row, cell.row)
    return {
      assetId, thickness, row, col: a.col, widthTiles: 1, heightTiles: Math.abs(cell.row - a.row) + 1,
      rotation: a.col + 0.5 <= W / 2 ? 270 : 90,
    }
  }

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

    if (designTool) {
      // Design mode: clicking a design selects it; anywhere else lays the active one.
      if (selectedPiece) onDeselectPiece()
      const hit = overlayAt(local.x, local.y)
      if (hit) {
        onSelectOverlay(hit.id)
        return
      }
      if (selectedOverlayId) onSelectOverlay(null)
      if (designTool.kind === 'piece') {
        const candidate = candidateAt({ row, col })
        if (candidate) onPlaceOverlay(candidate)
        return
      }
      // Keep receiving moves/up while the run is dragged, even off the grid.
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      setRunStart({ row, col })
      return
    }
    if (selectedOverlayId) onSelectOverlay(null)

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

  function handlePointerUp(e: ReactPointerEvent) {
    if (!runStart) return
    const local = screenToLocal(e.clientX, e.clientY)
    const end = local
      ? { row: Math.min(H - 1, Math.max(0, Math.floor(local.y))), col: Math.min(W - 1, Math.max(0, Math.floor(local.x))) }
      : runStart
    const candidate = candidateAt(end, runStart)
    setRunStart(null)
    if (candidate) onPlaceOverlay(candidate)
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

  // The cursor can outlive a resize/rotate that shrank the grid - clamp rather than store twice.
  const kbRow = Math.min(kbCursor.row, H - 1)
  const kbCol = Math.min(kbCursor.col, W - 1)
  const kbPoint: HoverPoint | null = kbFocused
    ? { row: kbRow, col: kbCol, slot: slotAt(activeCut, kbCursor.fx, kbCursor.fy, activeRotation) }
    : null

  function describeCell(row: number, col: number) {
    const count = tiles[tileKey(row, col)]?.length ?? 0
    const contents = count === 0 ? 'empty' : count === 1 ? '1 piece' : `${count} pieces`
    return `Row ${row + 1} of ${H}, column ${col + 1} of ${W}, ${contents}.`
  }

  /** Same as a click at the cursor: select a piece already there, otherwise paint the brush. */
  function activateAtCursor() {
    if (designTool) {
      const hit = overlayAt(kbCol + kbCursor.fx, kbRow + kbCursor.fy)
      if (hit) {
        onSelectOverlay(hit.id)
        setKbMessage('Design selected. Use Replace or Remove in the toolbar, or Escape to cancel.')
        return
      }
      const candidate = candidateAt({ row: kbRow, col: kbCol })
      if (candidate) onPlaceOverlay(candidate)
      setKbMessage(`Design placed at row ${kbRow + 1}, column ${kbCol + 1}.`)
      return
    }
    const pieces = tiles[tileKey(kbRow, kbCol)] ?? []
    const hitIndex = findPieceIndexAt(pieces, kbCursor.fx, kbCursor.fy)
    if (hitIndex >= 0) {
      onSelectPiece(kbRow, kbCol, hitIndex)
      setKbMessage('Piece selected. Use Replace or Delete in the toolbar, or Escape to cancel.')
      return
    }
    if (selectedPiece) onDeselectPiece()
    if (!activeBrush) {
      setKbMessage('Choose a style from My Styles first.')
      return
    }
    const slot = slotAt(activeCut, kbCursor.fx, kbCursor.fy, activeRotation)
    onStrokeBegin()
    onStrokeUpdate(kbRow, kbCol, kbRow, kbCol, activeBrush, activeCut, activeRotation, slot)
    onStrokeEnd()
    // `tiles` here is still the pre-paint snapshot, so name the spot rather than its contents.
    setKbMessage(`Placed at row ${kbRow + 1}, column ${kbCol + 1}.`)
  }

  function handleKeyDown(e: ReactKeyboardEvent) {
    const step: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    if (e.key in step) {
      e.preventDefault()
      const [dr, dc] = step[e.key]
      if (e.shiftKey && isPositionable(activeCut)) {
        // Shift+arrow steps between the cut's sub-cell slots (e.g. left/right half).
        const { cols, rows } = slotGrid(activeCut, activeRotation)
        const sx = Math.min(cols - 1, Math.max(0, Math.floor(kbCursor.fx * cols) + dc))
        const sy = Math.min(rows - 1, Math.max(0, Math.floor(kbCursor.fy * rows) + dr))
        setKbCursor({ row: kbRow, col: kbCol, fx: (sx + 0.5) / cols, fy: (sy + 0.5) / rows })
        setKbMessage(`Part ${sy * cols + sx + 1} of ${cols * rows} in this tile.`)
        return
      }
      const row = Math.min(H - 1, Math.max(0, kbRow + dr))
      const col = Math.min(W - 1, Math.max(0, kbCol + dc))
      setKbCursor({ ...kbCursor, row, col })
      setKbMessage(describeCell(row, col))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activateAtCursor()
    } else if (e.key === 'Escape' && (selectedPiece || selectedOverlayId)) {
      if (selectedPiece) onDeselectPiece()
      if (selectedOverlayId) onSelectOverlay(null)
      setKbMessage('Selection cleared.')
    }
  }

  const diag = Math.sqrt(W * W + H * H)
  const viewW = orientation === 'diagonal' ? diag : W
  const viewH = orientation === 'diagonal' ? diag : H
  const offsetX = (viewW - W) / 2
  const offsetY = (viewH - H) / 2
  const rotation = orientation === 'diagonal' ? 45 : 0

  const cells: ReturnType<typeof renderTileFills> = renderTileFills(state, swatchesById, prefix)
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

  // The mouse wins while it's over the grid; otherwise the keyboard cursor drives the preview.
  const shown = hover ?? kbPoint

  let ghost = null
  if (previewPiece && shown) {
    const hover = shown
    const swatch = swatchesById.get(previewPiece.swatchId)
    const existing = tiles[tileKey(hover.row, hover.col)] ?? []
    const candidate = { cutType: previewPiece.cutType, rotation: previewPiece.rotation, slot: hover.slot }
    const valid = canPlacePiece(existing, candidate)
    const ghostRotation = isPositionable(previewPiece.cutType) ? 0 : previewPiece.rotation
    ghost = (
      <g key="hover-ghost" transform={`translate(${hover.col} ${hover.row})`} className="pointer-events-none">
        {tilePatternDefs([swatch], `${prefix}g`)}
        <g transform={`rotate(${ghostRotation} 0.5 0.5)`}>
          <path
            d={cutPath(previewPiece.cutType, hover.slot, previewPiece.rotation)}
            fill={!valid ? '#dc2626' : swatch ? swatchFill(swatch, `${prefix}g`) : '#999'}
            fillOpacity={0.55}
            stroke={valid ? '#16a34a' : '#dc2626'}
            strokeWidth={0.02}
            strokeDasharray="0.06 0.04"
          />
        </g>
      </g>
    )
  }

  let designGhost = null
  const designCell = shown && designTool ? candidateAt(shown, runStart) : null
  if (designCell) {
    const valid = canPlaceOverlay(state, designCell)
    const replaced = overlaysUnder(state, designCell)
    designGhost = (
      <g key="design-ghost" className="pointer-events-none">
        {/* The finish filter is skipped here - it's costly to redraw on every pointer move. */}
        <g opacity={valid ? 0.85 : 0.3}>{renderOverlays([{ ...designCell, id: 'ghost' }], `${prefix}d`, false)}</g>
        {valid &&
          replaced.map((o) => (
            <rect
              key={`replace-${o.id}`}
              x={o.col + 0.03}
              y={o.row + 0.03}
              width={o.widthTiles - 0.06}
              height={o.heightTiles - 0.06}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={0.025}
              strokeDasharray="0.08 0.05"
            />
          ))}
        <rect
          x={designCell.col}
          y={designCell.row}
          width={designCell.widthTiles}
          height={designCell.heightTiles}
          fill={valid ? 'none' : '#dc262633'}
          stroke={valid ? '#16a34a' : '#dc2626'}
          strokeWidth={0.03}
          strokeDasharray="0.1 0.06"
        />
      </g>
    )
  }

  const selectedOverlay = selectedOverlayId ? state.overlays.find((o) => o.id === selectedOverlayId) : undefined
  const overlayHighlight = selectedOverlay && (
    <rect
      key="overlay-highlight"
      x={selectedOverlay.col}
      y={selectedOverlay.row}
      width={selectedOverlay.widthTiles}
      height={selectedOverlay.heightTiles}
      fill="none"
      stroke="#f0c774"
      strokeWidth={0.04}
      strokeDasharray="0.1 0.06"
      className="pointer-events-none"
    />
  )

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
    <>
    <svg
      viewBox={`${-offsetX} ${-offsetY} ${viewW} ${viewH}`}
      className="h-full w-full select-none"
      style={{ touchAction: 'none' }}
      tabIndex={previewMode ? -1 : 0}
      role="application"
      aria-roledescription="rug design grid"
      aria-label={`Rug design grid, ${W} by ${H} tiles`}
      aria-describedby="tile-grid-help"
      onKeyDown={previewMode ? undefined : handleKeyDown}
      onFocus={() => {
        setKbFocused(true)
        setKbMessage(describeCell(kbRow, kbCol))
      }}
      onBlur={() => setKbFocused(false)}
    >
      <g ref={rootGroupRef} transform={`rotate(${rotation} ${W / 2} ${H / 2})`}>
        {!previewMode && (
          <rect x={0} y={0} width={W} height={H} fill="none" stroke="#ffffff" strokeWidth={0.03} />
        )}
        {cells}
        {marks}
        {ghost}
        {designGhost}
        {selectionHighlight}
        {overlayHighlight}
        {kbPoint && (
          <rect
            x={kbPoint.col + 0.02}
            y={kbPoint.row + 0.02}
            width={0.96}
            height={0.96}
            fill="none"
            stroke="#f0c774"
            strokeWidth={0.05}
            className="pointer-events-none"
          />
        )}
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="transparent"
          style={{ pointerEvents: 'all' }}
          className={designTool ? 'cursor-copy' : activeBrush || dragPiece ? 'cursor-crosshair' : 'cursor-default'}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </g>
    </svg>
    <p id="tile-grid-help" className="sr-only">
      Arrow keys move between tiles. Shift plus arrow keys moves between the parts of a split cut.
      Enter or Space places the selected style, or selects a piece that is already there. Escape
      clears the selection.
    </p>
    <p className="sr-only" aria-live="polite">
      {kbFocused ? kbMessage : ''}
    </p>
    </>
  )
}

export default TileGridSvg
