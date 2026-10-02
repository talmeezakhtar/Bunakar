import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { setLogoutGuard } from '../../hooks/useAuth'
import { tileDesignsApi } from '../../services/api'
import { useToast } from '../common/Toast'
import type { Swatch } from '../../types/swatch'
import type { CutType, Rotation, RugCategory, Slot, TileDesignRecord, TileDesignState } from '../../types/tileDesign'
import { createDefaultTileDesign, feetToTiles, recordToState, stateToRecord, tileKey } from '../../types/tileDesign'
import { useTileDesignHistory } from '../../store/useTileDesignHistory'
import { COLORWAYS, applyTemplate, findColorway, findTemplate } from '../../data/patternTemplates'
import DesignerHeader from './DesignerHeader'
import ShapePanel from './ShapePanel'
import TileCanvas from './TileCanvas'
import type { DesignTool, NewOverlay, SelectedPiece } from './TileGridSvg'
import { defaultPieceSize, findDesignAsset, pieceFootprint } from '../../data/designAssets'
import { canPlaceOverlay, frameRuns } from '../../store/tileDesignReducer'
import RightPanel from './RightPanel'
import StyleBrowserOverlay from './StyleBrowserOverlay'
import DimensionsModal from './DimensionsModal'
import UnsavedChangesDialog from './UnsavedChangesDialog'
import { loadDesign, loadSwatchCatalog } from './tileDesignStorage'

type TileDesignerLayoutProps = {
  initialShape?: string
  initialRugCategory?: RugCategory
  initialWidthFt?: number
  initialHeightFt?: number
  initialDesignId?: string
  initialTemplateId?: string
  initialColorwayId?: string
}

function TileDesignerLayout({
  initialRugCategory,
  initialWidthFt,
  initialHeightFt,
  initialDesignId,
  initialTemplateId,
  initialColorwayId,
}: TileDesignerLayoutProps) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [swatches, setSwatches] = useState<Swatch[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [usedFallback, setUsedFallback] = useState(false)

  const initialDesign = useMemo(() => {
    const base =
      initialWidthFt && initialHeightFt
        ? createDefaultTileDesign(feetToTiles(initialWidthFt), feetToTiles(initialHeightFt))
        : createDefaultTileDesign()
    // The wizard's own type choice (Runner/Area Rug/Wall to Wall) is authoritative over the
    // dimension-based guess, since a custom "wall to wall" size can easily look area-rug-sized.
    return initialRugCategory ? { ...base, rugCategory: initialRugCategory } : base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const history = useTileDesignHistory(initialDesign)
  const { state } = history

  const [activeBrush, setActiveBrush] = useState<string | null>(null)
  const [activeCut, setActiveCut] = useState<CutType>('full')
  const [activeRotation, setActiveRotation] = useState<Rotation>(0)
  const [styleBrowserOpen, setStyleBrowserOpen] = useState(false)
  const [dimensionsOpen, setDimensionsOpen] = useState(false)
  const [myDesigns, setMyDesigns] = useState<TileDesignRecord[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [dragPiece, setDragPiece] = useState<{ swatchId: string; cutType: CutType; rotation: Rotation } | null>(null)
  const dragHoverRef = useRef<{ row: number; col: number; slot: Slot | undefined } | null>(null)
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece | null>(null)
  // Design pieces & borders: picking one switches the grid into design mode.
  const [activeDesign, setActiveDesign] = useState<string | null>(null)
  const [pieceSize, setPieceSize] = useState(1)
  const [borderThickness, setBorderThickness] = useState<0.5 | 1>(0.5)
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)

  // The design as last saved or opened. History keeps state objects as-is, so "unsaved" is a
  // cheap identity check - and undoing back to the saved version counts as clean again.
  const [savedState, setSavedState] = useState<TileDesignState>(initialDesign)
  const dirty = state !== savedState
  // Read by navigation/logout/unload handlers, which fire outside React's render.
  const dirtyRef = useRef(false)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  const [leavePrompt, setLeavePrompt] = useState<{ resolve: (ok: boolean) => void } | null>(null)
  const [leaveStatus, setLeaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  /** Replace the canvas with a design that counts as saved (opened, saved, or fresh). */
  function resetTo(next: TileDesignState) {
    history.replaceAll(next)
    setSavedState(next)
  }

  useEffect(() => {
    let cancelled = false
    loadSwatchCatalog().then(({ swatches: loaded, usedFallback: fallback }) => {
      if (cancelled) return
      setSwatches(loaded)
      setUsedFallback(fallback)
      setCatalogLoading(false)
      // A template from the setup wizard is laid down once the catalog is known, since its
      // colors resolve to whichever swatch ids that catalog uses.
      const template = findTemplate(initialTemplateId)
      if (template && !initialDesignId) {
        const colorway = findColorway(initialColorwayId ?? template.colorwayId) ?? COLORWAYS[0]
        const next = applyTemplate(initialDesign, template, colorway, loaded)
        resetTo(next)
        setActiveBrush(next.myStyles[0] ?? null)
      }
    })
    return () => {
      cancelled = true
    }
    // Mount-only: the wizard's template is applied once, never re-applied over the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    tileDesignsApi
      .mine()
      .then((designs) => {
        if (!cancelled) setMyDesigns(designs)
      })
      .catch(() => {
        // Server unreachable - the list stays empty; saving will report the problem.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Reopen a specific saved design (e.g. returning from the room preview via "Back to Editing").
  useEffect(() => {
    if (!initialDesignId) return
    let cancelled = false
    loadDesign(initialDesignId).then((record) => {
      if (cancelled) return
      if (!record) {
        showToast({ tone: 'error', message: "We couldn't open that design. It may have been deleted." })
        return
      }
      resetTo(recordToState(record))
      setActiveBrush(record.myStyles[0] ?? null)
      setSelectedPiece(null)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDesignId])

  // Unsaved work: ask before leaving via an in-app link, logging out, or closing the tab.
  const blocker = useBlocker(() => dirtyRef.current)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    confirmLeave().then((ok) => (ok ? blocker.proceed() : blocker.reset()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state])

  useEffect(() => {
    setLogoutGuard(confirmLeave)
    return () => setLogoutGuard(null)
  })

  useEffect(() => {
    // Refresh/close can't show a custom dialog - browsers only allow their own prompt.
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMod = e.ctrlKey || e.metaKey
      if (!isMod) return
      // Typing in a field (renaming, custom sizes) keeps the browser's own text undo.
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history])

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

  function handleSelectDesign(id: string | null) {
    setActiveDesign(id)
    setSelectedPiece(null)
    const asset = findDesignAsset(id)
    if (asset?.kind === 'piece') setPieceSize(defaultPieceSize(asset))
  }

  function handleSelectBrush(id: string) {
    setActiveBrush(id)
    setActiveDesign(null)
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
    history.commit({ type: 'PLACE_OVERLAY', overlay: { ...overlay, id: newOverlayId() } })
  }

  function handleFrame() {
    if (designAsset?.kind !== 'border') return
    const idPrefix = newOverlayId()
    if (!frameRuns(state, designAsset.id, borderThickness, idPrefix).every((run) => canPlaceOverlay(state, run))) {
      showToast({ tone: 'info', message: 'Lay tiles all the way around the edge of the rug first, then frame it.' })
      return
    }
    history.commit({ type: 'FRAME_BORDER', assetId: designAsset.id, thickness: borderThickness, idPrefix })
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

  async function persistDesign(): Promise<TileDesignRecord> {
    const record = stateToRecord(state)
    const saved = state.id ? await tileDesignsApi.update(state.id, record) : await tileDesignsApi.create(record)
    resetTo(recordToState(saved))
    // Now, not after the re-render: "Continue" navigates straight away and must not be blocked.
    dirtyRef.current = false
    setMyDesigns((prev) => {
      const exists = prev.some((d) => d.id === saved.id)
      return exists ? prev.map((d) => (d.id === saved.id ? saved : d)) : [...prev, saved]
    })
    return saved
  }

  /** Save failures always surface - the header Save button has no inline error of its own. */
  function reportSaveError(err: unknown) {
    setSaveStatus('error')
    showToast({
      tone: 'error',
      message: err instanceof Error ? `Couldn't save your design. ${err.message}` : "Couldn't save your design.",
    })
  }

  async function persist() {
    setSaveStatus('saving')
    try {
      await persistDesign()
      setSaveStatus('saved')
      showToast({ tone: 'success', message: 'Design saved.', durationMs: 2500 })
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      reportSaveError(err)
    }
  }

  async function handleContinue() {
    setSaveStatus('saving')
    try {
      const saved = await persistDesign()
      setSaveStatus('idle')
      navigate(`/designer/preview?design=${saved.id}`)
    } catch (err) {
      reportSaveError(err)
    }
  }

  async function handleDelete() {
    if (!state.id) return
    if (!window.confirm(`Delete "${state.name}"? This can't be undone.`)) return
    try {
      await tileDesignsApi.remove(state.id)
    } catch (err) {
      showToast({
        tone: 'error',
        message: err instanceof Error ? `Couldn't delete this design. ${err.message}` : "Couldn't delete this design.",
      })
      return
    }
    setMyDesigns((prev) => prev.filter((d) => d.id !== state.id))
    resetTo(createDefaultTileDesign())
    setActiveBrush(null)
    setSelectedPiece(null)
  }

  /** Resolves true once it's fine to drop the current canvas - saved, discarded, or clean. */
  function confirmLeave(): Promise<boolean> {
    if (!dirtyRef.current) return Promise.resolve(true)
    setLeaveStatus('idle')
    return new Promise((resolve) => setLeavePrompt({ resolve }))
  }

  function closeLeavePrompt(ok: boolean) {
    if (ok) dirtyRef.current = false
    leavePrompt?.resolve(ok)
    setLeavePrompt(null)
  }

  async function handleLeaveSave() {
    setLeaveStatus('saving')
    try {
      await persistDesign()
      closeLeavePrompt(true)
    } catch {
      setLeaveStatus('error')
    }
  }

  async function handleNew() {
    if (!(await confirmLeave())) return
    resetTo(createDefaultTileDesign())
    setActiveBrush(null)
    setSelectedPiece(null)
  }

  async function handleLoad(id: string) {
    const record = myDesigns.find((d) => d.id === id)
    if (!record || !(await confirmLeave())) return
    resetTo(recordToState(record))
    setActiveBrush(record.myStyles[0] ?? null)
    setSelectedPiece(null)
  }

  if (catalogLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-night-950 text-sand-300">
        Loading your styles...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-night-950">
      <DesignerHeader
        name={state.name}
        onRename={(name) => history.commit({ type: 'RENAME', name })}
        onSave={persist}
        saveStatus={saveStatus}
        myDesigns={myDesigns.map((d) => ({ id: d.id, name: d.name }))}
        currentId={state.id}
        onLoad={handleLoad}
        onDelete={handleDelete}
        onNew={handleNew}
      />

      {usedFallback && (
        <p className="border-b border-gold-600/30 bg-gold-500/10 px-6 py-1.5 text-center text-xs text-gold-300">
          Showing sample styles &mdash; the live catalog isn&apos;t reachable yet.
        </p>
      )}

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row">
        <ShapePanel activeCut={activeCut} onSelectCut={setActiveCut} />

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
        />

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
          onContinue={handleContinue}
          saveStatus={saveStatus}
          onStartDrag={handleStartDrag}
          designs={{
            activeDesignId: activeDesign,
            onSelectDesign: handleSelectDesign,
            pieceSize: Math.min(pieceSize, maxPieceSize),
            maxPieceSize,
            onPieceSizeChange: setPieceSize,
            borderThickness,
            onBorderThicknessChange: setBorderThickness,
            onFrame: handleFrame,
          }}
        />
      </div>

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

      {leavePrompt && (
        <UnsavedChangesDialog
          designName={state.name}
          saving={leaveStatus === 'saving'}
          error={leaveStatus === 'error'}
          onSave={handleLeaveSave}
          onDiscard={() => closeLeavePrompt(true)}
          onCancel={() => closeLeavePrompt(false)}
        />
      )}
    </div>
  )
}

export default TileDesignerLayout
