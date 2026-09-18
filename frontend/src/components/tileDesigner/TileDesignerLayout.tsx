import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { Swatch } from '../../types/swatch'
import type { CutType, Rotation, RugCategory, Slot, TileDesignRecord } from '../../types/tileDesign'
import { createDefaultTileDesign, feetToTiles, recordToState, stateToRecord, tileKey } from '../../types/tileDesign'
import { useTileDesignHistory } from '../../store/useTileDesignHistory'
import DesignerHeader from './DesignerHeader'
import ShapePanel from './ShapePanel'
import TileCanvas from './TileCanvas'
import type { SelectedPiece } from './TileGridSvg'
import RightPanel from './RightPanel'
import StyleBrowserOverlay from './StyleBrowserOverlay'
import DimensionsModal from './DimensionsModal'
import { deleteDesign, listMyDesigns, loadDesign, loadSwatchCatalog, saveDesign } from './tileDesignStorage'

type TileDesignerLayoutProps = {
  initialShape?: string
  initialRugCategory?: RugCategory
  initialWidthFt?: number
  initialHeightFt?: number
  initialDesignId?: string
}

function TileDesignerLayout({
  initialRugCategory,
  initialWidthFt,
  initialHeightFt,
  initialDesignId,
}: TileDesignerLayoutProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

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

  useEffect(() => {
    let cancelled = false
    loadSwatchCatalog().then(({ swatches: loaded, usedFallback: fallback }) => {
      if (cancelled) return
      setSwatches(loaded)
      setUsedFallback(fallback)
      setCatalogLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    listMyDesigns(!!user).then((designs) => {
      if (!cancelled) setMyDesigns(designs)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  // Reopen a specific saved design (e.g. returning from the room preview via "Back to Editing").
  useEffect(() => {
    if (!initialDesignId) return
    let cancelled = false
    loadDesign(initialDesignId).then((record) => {
      if (cancelled || !record) return
      history.replaceAll(recordToState(record))
      setActiveBrush(record.myStyles[0] ?? null)
      setSelectedPiece(null)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDesignId])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMod = e.ctrlKey || e.metaKey
      if (!isMod) return
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
    const saved = await saveDesign(stateToRecord(state), state.id, !!user)
    history.replaceAll(recordToState(saved))
    setMyDesigns((prev) => {
      const exists = prev.some((d) => d.id === saved.id)
      return exists ? prev.map((d) => (d.id === saved.id ? saved : d)) : [...prev, saved]
    })
    return saved
  }

  async function persist() {
    setSaveStatus('saving')
    try {
      await persistDesign()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  async function handleContinue() {
    setSaveStatus('saving')
    try {
      const saved = await persistDesign()
      setSaveStatus('idle')
      navigate(`/designer/preview?design=${saved.id}`)
    } catch {
      setSaveStatus('error')
    }
  }

  async function handleDelete() {
    if (!state.id) return
    if (!window.confirm(`Delete "${state.name}"? This can't be undone.`)) return
    await deleteDesign(state.id, !!user)
    setMyDesigns((prev) => prev.filter((d) => d.id !== state.id))
    history.replaceAll(createDefaultTileDesign())
    setActiveBrush(null)
    setSelectedPiece(null)
  }

  function handleNew() {
    history.replaceAll(createDefaultTileDesign())
    setActiveBrush(null)
    setSelectedPiece(null)
  }

  function handleLoad(id: string) {
    const record = myDesigns.find((d) => d.id === id)
    if (!record) return
    history.replaceAll(recordToState(record))
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
        />

        <RightPanel
          state={state}
          swatchesById={swatchesById}
          activeBrush={activeBrush}
          activeCut={activeCut}
          activeRotation={activeRotation}
          onSelectBrush={setActiveBrush}
          onRemoveStyle={handleRemoveStyle}
          onAddMoreStyles={() => setStyleBrowserOpen(true)}
          onEditDimensions={() => setDimensionsOpen(true)}
          onContinue={handleContinue}
          saveStatus={saveStatus}
          onStartDrag={handleStartDrag}
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
    </div>
  )
}

export default TileDesignerLayout
