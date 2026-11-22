import { useEffect, useMemo, useRef, useState } from 'react'
import ShortcutSheet from '../ui/ShortcutSheet'
import type { ShortcutGroup } from '../ui/ShortcutSheet'
import { useToast } from '../common/Toast'
import type { Swatch } from '../../types/swatch'
import type { CutType, Rotation, RugCategory, Slot, TileDesignState } from '../../types/tileDesign'
import { tileKey } from '../../types/tileDesign'
import type { TileDesignAction } from '../../store/tileDesignReducer'
import { canPlaceOverlay, frameRuns } from '../../store/tileDesignReducer'
import ShapePanel from './ShapePanel'
import TileCanvas from './TileCanvas'
import type { DesignTool, NewOverlay, SelectedPiece } from './TileGridSvg'
import { defaultPieceSize, findDesignAsset, pieceFootprint } from '../../data/designAssets'
import { tileWeaverSheetSvg } from '../../utils/tileProduction'
import { downloadText } from '../../utils/freeformProduction'
import { useProGate } from '../../hooks/usePlan'
import type { SaveStatus } from '../../hooks/useDesignPersistence'
import { rugPalette } from './renderTiles'
import RightPanel from './RightPanel'
import StyleBrowserOverlay from './StyleBrowserOverlay'
import DimensionsModal from './DimensionsModal'

export const TILE_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Painting',
    items: [
      { keys: ['1', '–', '9'], label: 'Pick a colour from My Styles' },
      { keys: ['R'], label: 'Rotate the cut' },
      { keys: ['←', '↑', '→', '↓'], label: 'Move around the grid' },
      { keys: ['Enter'], label: 'Paint the tile under the cursor' },
      { keys: ['Esc'], label: 'Clear the selection' },
    ],
  },
  {
    title: 'Editing',
    items: [
      { keys: ['Mod', 'Z'], label: 'Undo' },
      { keys: ['Mod', 'Y'], label: 'Redo' },
      { keys: ['?'], label: 'Show these shortcuts' },
    ],
  },
]

/** The undo history the tile editor works through: the tile page's own, or a studio rug's tile layer. */
export interface TileHistory {
  state: TileDesignState
  commit: (action: TileDesignAction) => void
  beginStroke: () => void
  updateStroke: (action: TileDesignAction) => void
  endStroke: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

/**
 * The tile-rug editor without a page around it: cut shapes, the tile grid, the colours / motifs /
 * rug panel and their dialogs, over any `TileHistory`. The tile designer page and the studio's
 * tile rugs both host it.
 */
export function useTileWorkbench({
  history,
  swatches,
  blocked = false,
  onContinue,
  saveStatus,
  embedded = false,
}: {
  history: TileHistory
  swatches: Swatch[]
  /** Another dialog owns the keyboard (the leave-page prompt). */
  blocked?: boolean
  onContinue: () => void
  saveStatus: SaveStatus
  /** Hosted in the studio: its panel leaves the summary and room button to the studio. */
  embedded?: boolean
}) {
  const { state } = history
  const { showToast } = useToast()
  const requirePro = useProGate()
  const [activeBrush, setActiveBrush] = useState<string | null>(() => history.state.myStyles[0] ?? null)
  const [activeCut, setActiveCut] = useState<CutType>('full')
  const [activeRotation, setActiveRotation] = useState<Rotation>(0)
  const [styleBrowserOpen, setStyleBrowserOpen] = useState(false)
  const [dimensionsOpen, setDimensionsOpen] = useState(false)
  const [dragPiece, setDragPiece] = useState<{ swatchId: string; cutType: CutType; rotation: Rotation } | null>(null)
  const dragHoverRef = useRef<{ row: number; col: number; slot: Slot | undefined } | null>(null)
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece | null>(null)
  // Design pieces & borders: picking one switches the grid into design mode.
  const [activeDesign, setActiveDesign] = useState<string | null>(null)
  const [pieceSize, setPieceSize] = useState(1)
  const [borderThickness, setBorderThickness] = useState<0.5 | 1>(0.5)
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  // Colour for new motifs: a swatch id from My Styles, or null to match the rug.
  const [motifTint, setMotifTint] = useState<string | null>(null)

  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  // Read through a ref so the one listener always sees this render's state and handlers.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      // Typing in a field (renaming, custom sizes) keeps the browser's own keys; dialogs own theirs.
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (blocked || styleBrowserOpen || dimensionsOpen || shortcutsOpen) return
      const k = e.key.toLowerCase()
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault()
          handleUndo()
        } else if ((k === 'z' && e.shiftKey) || k === 'y') {
          e.preventDefault()
          handleRedo()
        }
        return
      }
      if (e.altKey) return
      if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(true)
      } else if (k === 'r' && !e.shiftKey) {
        handleRotateBrush()
      } else if (/^[1-9]$/.test(e.key)) {
        const id = state.myStyles[Number(e.key) - 1]
        if (id) handleSelectBrush(id)
      }
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // A style-chip drag session: commits the piece into whichever cell was last hovered
  // when the pointer is released, or does nothing if it was released off the grid.
  useEffect(() => {
    if (!dragPiece) return
    function finishDrag() {
      const cell = dragHoverRef.current
      if (cell) {
        history.commit({
          type: 'PAINT_RANGE',
          r0: cell.row,
          c0: cell.col,
          r1: cell.row,
          c1: cell.col,
          swatchId: dragPiece!.swatchId,
          cutType: dragPiece!.cutType,
          rotation: dragPiece!.rotation,
          slot: cell.slot,
        })
      }
      setDragPiece(null)
      dragHoverRef.current = null
    }
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', finishDrag)
    return () => {
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', finishDrag)
    }
  }, [dragPiece, history])

  const swatchesById = useMemo(() => new Map(swatches.map((s) => [s.id, s])), [swatches])
  const palette = useMemo(() => rugPalette(state, swatchesById), [state, swatchesById])
  const tintChoices = useMemo(
    () =>
      state.myStyles.flatMap((id) => {
        const sw = swatchesById.get(id)
        return sw ? [{ id, name: sw.colorName, color: sw.swatchColor }] : []
      }),
    [state.myStyles, swatchesById],
  )
  const categories = useMemo(() => Array.from(new Set(swatches.flatMap((s) => s.categories))), [swatches])

  function handleAddSelectedStyles(ids: string[]) {
    if (ids.length === 0) return
    history.commit({ type: 'ADD_STYLES', swatchIds: ids })
    setActiveBrush((current) => current ?? ids[0])
  }

  function handleRemoveStyle(id: string) {
    history.commit({ type: 'REMOVE_STYLE', swatchId: id })
    setActiveBrush((current) => (current === id ? null : current))
  }

  function handleRotateBrush() {
    setActiveRotation((r) => ((r + 90) % 360) as Rotation)
  }

  // A selected piece is addressed by row/col/index, which a grid-reshaping action (rotate,
  // resize, insert/remove row or column, undo/redo) can invalidate or repoint at a different
  // piece - clear the selection whenever one of those runs.
  function handleUndo() {
    setSelectedPiece(null)
    history.undo()
  }

  function handleRedo() {
    setSelectedPiece(null)
    history.redo()
  }

  function handleRotateGrid() {
    setSelectedPiece(null)
    history.commit({ type: 'ROTATE_GRID' })
  }

  function handleInsertRowTop() {
    setSelectedPiece(null)
    history.commit({ type: 'INSERT_ROW_TOP' })
  }

  function handleRemoveRowTop() {
    setSelectedPiece(null)
    history.commit({ type: 'REMOVE_ROW_TOP' })
  }

  function handleInsertColLeft() {
    setSelectedPiece(null)
    history.commit({ type: 'INSERT_COL_LEFT' })
  }

  function handleRemoveColLeft() {
    setSelectedPiece(null)
    history.commit({ type: 'REMOVE_COL_LEFT' })
  }

  const designAsset = findDesignAsset(activeDesign)
  // Largest piece size (tiles tall) whose footprint - turned with the brush - still fits the rug.
  const sideways = activeRotation === 90 || activeRotation === 270
  let maxPieceSize = 1
  if (designAsset?.kind === 'piece') {
    for (let size = 1; size <= Math.max(state.widthTiles, state.heightTiles); size++) {
      const fp = pieceFootprint(designAsset, size)
      const [w, h] = sideways ? [fp.heightTiles, fp.widthTiles] : [fp.widthTiles, fp.heightTiles]
      if (w > state.widthTiles || h > state.heightTiles) break
      maxPieceSize = size
    }
  }
  let designTool: DesignTool | null = null
  if (designAsset) {
    const fp = pieceFootprint(designAsset, Math.min(pieceSize, maxPieceSize))
    designTool = {
      assetId: designAsset.id,
      kind: designAsset.kind,
      widthTiles: sideways ? fp.heightTiles : fp.widthTiles,
      heightTiles: sideways ? fp.widthTiles : fp.heightTiles,
      rotation: activeRotation,
      thickness: borderThickness,
    }
  }
  // A selection outlives its design when undo/resize/delete-under removes it - just drop it.
  const liveSelectedOverlayId = state.overlays.some((o) => o.id === selectedOverlayId) ? selectedOverlayId : null

  function newOverlayId() {
    return `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  }

  const [inspectorTab, setInspectorTab] = useState<'colours' | 'motifs' | 'rug'>('colours')
  // Leaving the motifs tab puts the grid back into painting, so what you see is what you get.
  function handleInspectorTab(tab: 'colours' | 'motifs' | 'rug') {
    setInspectorTab(tab)
    if (tab !== 'motifs') setActiveDesign(null)
  }

  function handleSelectDesign(id: string | null) {
    setActiveDesign(id)
    setSelectedPiece(null)
    const asset = findDesignAsset(id)
    if (asset?.kind === 'piece') setPieceSize(defaultPieceSize(asset))
  }

  function handleSelectBrush(id: string) {
    setActiveBrush(id)
    setActiveDesign(null)
    setInspectorTab('colours')
  }

  function handleSelectOverlay(id: string | null) {
    setSelectedOverlayId(id)
    if (id) setSelectedPiece(null)
  }

  function handlePlaceOverlay(overlay: NewOverlay) {
    if (!canPlaceOverlay(state, overlay)) {
      showToast({ tone: 'info', message: 'Designs sit on tiles. Lay tiles under the whole highlighted area first.' })
      return
    }
    history.commit({ type: 'PLACE_OVERLAY', overlay: { ...overlay, id: newOverlayId(), ...(motifTint ? { tint: motifTint } : {}) } })
  }

  function handleExportSheet() {
    if (!requirePro("Weaver's sheets")) return
    const slug = (state.name || 'tile-rug').replace(/\s+/g, '-').toLowerCase()
    downloadText(`${slug}-weavers-sheet.svg`, tileWeaverSheetSvg(state, swatchesById), 'image/svg+xml')
  }

  function handleFrame() {
    if (designAsset?.kind !== 'border') return
    const idPrefix = newOverlayId()
    if (!frameRuns(state, designAsset.id, borderThickness, idPrefix).every((run) => canPlaceOverlay(state, run))) {
      showToast({ tone: 'info', message: 'Lay tiles all the way around the edge of the rug first, then frame it.' })
      return
    }
    history.commit({ type: 'FRAME_BORDER', assetId: designAsset.id, thickness: borderThickness, idPrefix, tint: motifTint ?? undefined })
  }

  function handleReplaceOverlay() {
    if (!liveSelectedOverlayId || !designAsset) return
    history.commit({ type: 'REPLACE_OVERLAY_ASSET', id: liveSelectedOverlayId, assetId: designAsset.id })
    setSelectedOverlayId(null)
  }

  function handleRemoveOverlay() {
    if (!liveSelectedOverlayId) return
    history.commit({ type: 'REMOVE_OVERLAY', id: liveSelectedOverlayId })
    setSelectedOverlayId(null)
  }

  function handleSelectPiece(row: number, col: number, index: number) {
    setSelectedPiece({ row, col, index })
  }

  function handleDeselectPiece() {
    setSelectedPiece(null)
  }

  function handleReplaceSelected() {
    if (!selectedPiece || !activeBrush) return
    const existing = state.tiles[tileKey(selectedPiece.row, selectedPiece.col)]?.[selectedPiece.index]
    history.commit({
      type: 'REPLACE_PIECE',
      row: selectedPiece.row,
      col: selectedPiece.col,
      index: selectedPiece.index,
      piece: { swatchId: activeBrush, cutType: activeCut, rotation: activeRotation, slot: existing?.slot },
    })
    setSelectedPiece(null)
  }

  function handleDeleteSelected() {
    if (!selectedPiece) return
    history.commit({
      type: 'DELETE_PIECE',
      row: selectedPiece.row,
      col: selectedPiece.col,
      index: selectedPiece.index,
    })
    setSelectedPiece(null)
  }

  function handleStartDrag(swatchId: string) {
    setActiveBrush(swatchId)
    setActiveDesign(null)
    dragHoverRef.current = null
    setDragPiece({ swatchId, cutType: activeCut, rotation: activeRotation })
  }

  function handleDragHoverTile(row: number, col: number, slot: Slot | undefined) {
    dragHoverRef.current = { row, col, slot }
  }

  function handleSaveDimensions(widthTiles: number, heightTiles: number, rugCategory: RugCategory) {
    setSelectedPiece(null)
    history.commit({ type: 'RESIZE', widthTiles, heightTiles, rugCategory })
    setDimensionsOpen(false)
  }


  const shapePanel = <ShapePanel activeCut={activeCut} onSelectCut={setActiveCut} />
  const canvas = (
<div className="flex h-[min(70vh,40rem)] min-h-0 min-w-0 flex-col lg:h-auto lg:flex-1">
        <TileCanvas
          state={state}
          swatchesById={swatchesById}
          activeBrush={activeBrush}
          activeCut={activeCut}
          activeRotation={activeRotation}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onStrokeBegin={history.beginStroke}
          onStrokeUpdate={(r0, c0, r1, c1, swatchId, cutType, rotation, slot) =>
            history.updateStroke({ type: 'PAINT_RANGE', r0, c0, r1, c1, swatchId, cutType, rotation, slot })
          }
          onStrokeEnd={history.endStroke}
          onSetBackground={(backgroundId) => history.commit({ type: 'SET_BACKGROUND', backgroundId })}
          onRotateBrush={handleRotateBrush}
          onRotateGrid={handleRotateGrid}
          onInsertRowTop={handleInsertRowTop}
          onRemoveRowTop={handleRemoveRowTop}
          onInsertColLeft={handleInsertColLeft}
          onRemoveColLeft={handleRemoveColLeft}
          dragPiece={dragPiece}
          onDragHoverTile={handleDragHoverTile}
          selectedPiece={selectedPiece}
          onSelectPiece={handleSelectPiece}
          onReplaceSelected={handleReplaceSelected}
          onDeleteSelected={handleDeleteSelected}
          onDeselectPiece={handleDeselectPiece}
          designTool={designTool}
          selectedOverlayId={liveSelectedOverlayId}
          onSelectOverlay={handleSelectOverlay}
          onPlaceOverlay={handlePlaceOverlay}
          onReplaceOverlay={handleReplaceOverlay}
          onRemoveOverlay={handleRemoveOverlay}
          palette={palette}
          tintChoices={tintChoices}
          onTintOverlay={(tint) => liveSelectedOverlayId && history.commit({ type: 'SET_OVERLAY_TINT', id: liveSelectedOverlayId, tint })}
        />
        </div>
  )
  const side = (
        <RightPanel
          state={state}
          swatchesById={swatchesById}
          activeBrush={activeBrush}
          activeCut={activeCut}
          activeRotation={activeRotation}
          onSelectBrush={handleSelectBrush}
          onRemoveStyle={handleRemoveStyle}
          onAddMoreStyles={() => setStyleBrowserOpen(true)}
          onEditDimensions={() => setDimensionsOpen(true)}
          onContinue={onContinue}
          embedded={embedded}
          onExportSheet={handleExportSheet}
          saveStatus={saveStatus}
          onStartDrag={handleStartDrag}
          tab={inspectorTab}
          onTabChange={handleInspectorTab}
          designs={{
            activeDesignId: activeDesign,
            onSelectDesign: handleSelectDesign,
            pieceSize: Math.min(pieceSize, maxPieceSize),
            maxPieceSize,
            onPieceSizeChange: setPieceSize,
            borderThickness,
            onBorderThicknessChange: setBorderThickness,
            onFrame: handleFrame,
            palette,
            tint: motifTint && state.myStyles.includes(motifTint) ? motifTint : null,
            onTintChange: setMotifTint,
            tintChoices,
          }}
        />
  )
  const overlays = (
    <>
      {styleBrowserOpen && (
        <StyleBrowserOverlay
          swatches={swatches}
          categories={categories}
          onClose={() => setStyleBrowserOpen(false)}
          onAddSelected={handleAddSelectedStyles}
        />
      )}

      {dimensionsOpen && (
        <DimensionsModal
          widthTiles={state.widthTiles}
          heightTiles={state.heightTiles}
          rugCategory={state.rugCategory}
          onClose={() => setDimensionsOpen(false)}
          onSave={handleSaveDimensions}
        />
      )}
      {shortcutsOpen && <ShortcutSheet groups={TILE_SHORTCUTS} onClose={() => setShortcutsOpen(false)} />}
    </>
  )

  return {
    shapePanel,
    canvas,
    side,
    overlays,
    showShortcuts: () => setShortcutsOpen(true),
    /** After a design is opened or reset: brush on its first colour, nothing selected. */
    reset: (next: TileDesignState) => {
      setActiveBrush(next.myStyles[0] ?? null)
      setSelectedPiece(null)
    },
    /** New colours were added from outside (a starter set): brush on the first if none. */
    setBrushIfNone: (id: string | undefined) => id && setActiveBrush((b) => b ?? id),
  }
}
