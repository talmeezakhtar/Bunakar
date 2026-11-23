import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Plus, Minus, TrashSimple, X } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import { swatchBackground } from '../../types/swatch'
import type { BackgroundId, CutType, Rotation, Slot, TileDesignState } from '../../types/tileDesign'
import { CUT_TYPES, tileKey } from '../../types/tileDesign'
import CanvasToolbar from './CanvasToolbar'
import TileGridSvg from './TileGridSvg'
import type { DesignTool, NewOverlay, SelectedPiece } from './TileGridSvg'
import { findDesignAsset } from '../../data/designAssets'
import type { PaletteInput } from '../../data/motifs/palette'
import MotifPreview from './MotifPreview'
import ViewToggle from '../ui/ViewToggle'
import { canShow3D } from '../../three/canShow3D'

// three.js loads only when someone switches to 3D.
const RugPreview3D = lazy(() => import('../../three/rug/RugPreview3D'))
import { TintPicker } from './DesignsPanel'
import type { TintChoice } from './DesignsPanel'
import lightWoodImg from '../../assets/floors/light-wood.webp'
import darkWoodImg from '../../assets/floors/dark-wood.webp'
import concreteImg from '../../assets/floors/concrete.webp'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.2
const MAX_TILES_PER_SIDE = 30

const FLOOR_IMAGES: Partial<Record<BackgroundId, string>> = {
  'light-wood': lightWoodImg,
  'dark-wood': darkWoodImg,
  concrete: concreteImg,
}

type TileCanvasProps = {
  state: TileDesignState
  swatchesById: Map<string, Swatch>
  activeBrush: string | null
  activeCut: CutType
  activeRotation: Rotation
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
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
  onSetBackground: (id: BackgroundId) => void
  onRotateBrush: () => void
  onRotateGrid: () => void
  onInsertRowTop: () => void
  onRemoveRowTop: () => void
  onInsertColLeft: () => void
  onRemoveColLeft: () => void
  dragPiece: { swatchId: string; cutType: CutType; rotation: Rotation } | null
  onDragHoverTile: (row: number, col: number, slot: Slot | undefined) => void
  selectedPiece: SelectedPiece | null
  onSelectPiece: (row: number, col: number, index: number) => void
  onReplaceSelected: () => void
  onDeleteSelected: () => void
  onDeselectPiece: () => void
  designTool: DesignTool | null
  selectedOverlayId: string | null
  onSelectOverlay: (id: string | null) => void
  onPlaceOverlay: (overlay: NewOverlay) => void
  onReplaceOverlay: () => void
  onRemoveOverlay: () => void
  palette: PaletteInput
  tintChoices: TintChoice[]
  onTintOverlay: (tint: string | null) => void
}

function TileCanvas({
  state,
  swatchesById,
  activeBrush,
  activeCut,
  activeRotation,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onStrokeBegin,
  onStrokeUpdate,
  onStrokeEnd,
  onSetBackground,
  onRotateBrush,
  onRotateGrid,
  onInsertRowTop,
  onRemoveRowTop,
  onInsertColLeft,
  onRemoveColLeft,
  dragPiece,
  onDragHoverTile,
  selectedPiece,
  onSelectPiece,
  onReplaceSelected,
  onDeleteSelected,
  onDeselectPiece,
  designTool,
  selectedOverlayId,
  onSelectOverlay,
  onPlaceOverlay,
  onReplaceOverlay,
  onRemoveOverlay,
  palette,
  tintChoices,
  onTintOverlay,
}: TileCanvasProps) {
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [view, setView] = useState<'2d' | '3d'>('2d')
  const [has3D] = useState(canShow3D)
  const source3D = useMemo(() => ({ kind: 'tile' as const, state, swatchesById }), [state, swatchesById])
  const containerRef = useRef<HTMLDivElement>(null)
  // The floor area's size, so the rug is fitted to the space it has, then zoomed from there.
  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      setStage({ width: box.width, height: box.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current?.requestFullscreen()
    }
  }

  // Diagonal orientation pads the SVG viewBox to a square (to fit the rotated grid without
  // clipping), so the CSS box must match that square or the SVG letterboxes with blank bars.
  const aspect = state.orientation === 'diagonal' ? 1 : state.widthTiles / state.heightTiles
  const floorImage = FLOOR_IMAGES[state.backgroundId]
  // Leave room for the row/column buttons (about 48px each side) and a margin of floor.
  const fitWidth =
    stage.width > 0 ? Math.max(180, Math.min((stage.width - 120) * 0.92, (stage.height - 110) * 0.92 * aspect)) : Math.min(560, 340 * aspect)

  const selectedPieceCell = selectedPiece
    ? state.tiles[tileKey(selectedPiece.row, selectedPiece.col)]?.[selectedPiece.index]
    : undefined
  const selectedSwatch = selectedPieceCell ? swatchesById.get(selectedPieceCell.swatchId) : undefined
  const selectedCutLabel = selectedPieceCell
    ? (CUT_TYPES.find((c) => c.id === selectedPieceCell.cutType)?.label ?? selectedPieceCell.cutType)
    : ''

  const selectedOverlay = selectedOverlayId ? state.overlays.find((o) => o.id === selectedOverlayId) : undefined
  const selectedDesign = findDesignAsset(selectedOverlay?.assetId)
  const replacement = findDesignAsset(designTool?.assetId)
  const canReplaceOverlay =
    !!replacement && !!selectedDesign && replacement.kind === selectedDesign.kind && replacement.id !== selectedDesign.id

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <CanvasToolbar
        backgroundId={state.backgroundId}
        onSetBackground={onSetBackground}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode((v) => !v)}
        onRotateBrush={onRotateBrush}
        onRotateGrid={onRotateGrid}
        onZoomIn={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
        onZoomOut={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        viewToggle={has3D ? <ViewToggle value={view} onChange={setView} /> : null}
      />

      {view === '3d' && (
        <div className="relative min-h-[22rem] flex-1">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-muted">Loading 3D…</div>}>
            <RugPreview3D source={source3D} />
          </Suspense>
        </div>
      )}

      {view === '2d' && selectedPieceCell && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <span
              className="h-4 w-4 shrink-0 rounded-sm border border-black/20"
              style={swatchBackground(selectedSwatch)}
            />
            Selected: {selectedSwatch?.colorName ?? 'Unknown'} &middot; {selectedCutLabel}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReplaceSelected}
              disabled={!activeBrush}
              title={activeBrush ? 'Replace with the active style' : 'Select a style first'}
              className="inline-flex min-h-9 items-center rounded-full bg-ink px-3.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-danger/40 px-3.5 text-sm font-semibold text-danger transition-colors hover:bg-accent-soft"
            >
              <TrashSimple size={13} /> Delete
            </button>
            <button
              type="button"
              onClick={onDeselectPiece}
              aria-label="Cancel selection"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {view === '2d' && selectedOverlay && selectedDesign && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <MotifPreview id={selectedDesign.id} palette={palette} tint={selectedOverlay.tint ? tintChoices.find((c) => c.id === selectedOverlay.tint)?.color : undefined} repeats={1} className="h-7 w-7 shrink-0" />
            Selected: {selectedDesign.name} &middot; {selectedOverlay.widthTiles} × {selectedOverlay.heightTiles} tiles
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReplaceOverlay}
              disabled={!canReplaceOverlay}
              title={canReplaceOverlay ? `Replace with ${replacement!.name}` : `Pick another ${selectedDesign.kind === 'border' ? 'border' : 'design piece'} first`}
              className="inline-flex min-h-9 items-center rounded-full bg-ink px-3.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onRemoveOverlay}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-danger/40 px-3.5 text-sm font-semibold text-danger transition-colors hover:bg-accent-soft"
            >
              <TrashSimple size={13} /> Remove
            </button>
            <button
              type="button"
              onClick={() => onSelectOverlay(null)}
              aria-label="Cancel selection"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
          <div className="w-full pt-1">
            <TintPicker
              label="Colour of this motif"
              tint={selectedOverlay.tint && tintChoices.some((c) => c.id === selectedOverlay.tint) ? selectedOverlay.tint : null}
              onTintChange={onTintOverlay}
              tintChoices={tintChoices}
            />
          </div>
        </div>
      )}

      <div
        ref={stageRef}
        hidden={view === '3d'}
        className="flex min-h-[22rem] flex-1 items-center justify-center gap-2 overflow-auto p-4"
        style={
          floorImage
            ? { backgroundImage: `url(${floorImage})`, backgroundRepeat: 'repeat', backgroundSize: '220px auto' }
            : { backgroundColor: 'var(--color-surface-2)' }
        }
      >
        {!previewMode && (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onInsertRowTop}
              disabled={state.heightTiles >= MAX_TILES_PER_SIDE}
              aria-label="Add a row at the top" title="Add a row at the top"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line-strong bg-paper/95 text-ink-2 shadow-sm transition-colors pointer-coarse:h-11 pointer-coarse:w-11 hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={onRemoveRowTop}
              disabled={state.heightTiles <= 1}
              aria-label="Remove the top row" title="Remove the top row"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line-strong bg-paper/95 text-ink-2 shadow-sm transition-colors pointer-coarse:h-11 pointer-coarse:w-11 hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-col items-center gap-1.5">
          {!previewMode && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onInsertColLeft}
                disabled={state.widthTiles >= MAX_TILES_PER_SIDE}
                aria-label="Add a column on the left" title="Add a column on the left"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line-strong bg-paper/95 text-ink-2 shadow-sm transition-colors pointer-coarse:h-11 pointer-coarse:w-11 hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={onRemoveColLeft}
                disabled={state.widthTiles <= 1}
                aria-label="Remove the left column" title="Remove the left column"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line-strong bg-paper/95 text-ink-2 shadow-sm transition-colors pointer-coarse:h-11 pointer-coarse:w-11 hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus size={14} />
              </button>
            </div>
          )}

          <div
            className="relative shrink-0 shadow-[0_18px_40px_-12px_rgba(31,27,22,0.45)]"
            style={{
              width: `${fitWidth * zoom}px`,
              aspectRatio: `${aspect}`,
            }}
          >
            <TileGridSvg
              state={state}
              swatchesById={swatchesById}
              activeBrush={activeBrush}
              activeCut={activeCut}
              activeRotation={activeRotation}
              previewMode={previewMode}
              onStrokeBegin={onStrokeBegin}
              onStrokeUpdate={onStrokeUpdate}
              onStrokeEnd={onStrokeEnd}
              dragPiece={dragPiece}
              onDragHoverTile={onDragHoverTile}
              selectedPiece={selectedPiece}
              onSelectPiece={onSelectPiece}
              onDeselectPiece={onDeselectPiece}
              designTool={designTool}
              selectedOverlayId={selectedOverlayId}
              onSelectOverlay={onSelectOverlay}
              onPlaceOverlay={onPlaceOverlay}
            />
            {/* Wool pile over the painted tiles, so colours read as yarn while staying crisp to edit. */}
            {state.orientation === 'normal' && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url('/textures/pile.jpg')] bg-[length:140px] opacity-35 mix-blend-multiply" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TileCanvas
