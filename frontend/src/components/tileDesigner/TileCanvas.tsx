import { useEffect, useRef, useState } from 'react'
import { Plus, Minus, TrashSimple, X } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import type { BackgroundId, CutType, Rotation, Slot, TileDesignState } from '../../types/tileDesign'
import { CUT_TYPES, tileKey } from '../../types/tileDesign'
import CanvasToolbar from './CanvasToolbar'
import TileGridSvg from './TileGridSvg'
import type { SelectedPiece } from './TileGridSvg'
import lightWoodImg from '../../assets/floors/light-wood.jpg'
import darkWoodImg from '../../assets/floors/dark-wood.jpg'
import concreteImg from '../../assets/floors/concrete.jpg'

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
}: TileCanvasProps) {
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const selectedPieceCell = selectedPiece
    ? state.tiles[tileKey(selectedPiece.row, selectedPiece.col)]?.[selectedPiece.index]
    : undefined
  const selectedSwatch = selectedPieceCell ? swatchesById.get(selectedPieceCell.swatchId) : undefined
  const selectedCutLabel = selectedPieceCell
    ? (CUT_TYPES.find((c) => c.id === selectedPieceCell.cutType)?.label ?? selectedPieceCell.cutType)
    : ''

  return (
    <div ref={containerRef} className="flex flex-1 flex-col overflow-hidden rounded-lg border border-night-700 bg-night-900">
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
      />

      {selectedPieceCell && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-night-700 bg-night-800 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-sand-200">
            <span
              className="h-4 w-4 shrink-0 rounded-sm border border-black/20"
              style={{ backgroundColor: selectedSwatch?.swatchColor ?? '#999' }}
            />
            Selected: {selectedSwatch?.colorName ?? 'Unknown'} &middot; {selectedCutLabel}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReplaceSelected}
              disabled={!activeBrush}
              title={activeBrush ? 'Replace with the active style' : 'Select a style first'}
              className="rounded-full border border-gold-500/60 bg-transparent px-3 py-1 text-xs font-semibold tracking-wide text-gold-400 transition-colors hover:border-gold-400 hover:bg-gold-500 hover:text-night-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gold-400"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="inline-flex items-center gap-1 rounded-full border border-red-500/50 px-3 py-1 text-xs font-semibold tracking-wide text-red-400 transition-colors hover:bg-red-500/10"
            >
              <TrashSimple size={13} /> Delete
            </button>
            <button
              type="button"
              onClick={onDeselectPiece}
              aria-label="Cancel selection"
              className="rounded-full bg-transparent p-1 text-sand-400 transition-colors hover:text-sand-100"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div
        className="flex flex-1 items-center justify-center gap-2 overflow-auto p-6"
        style={
          floorImage
            ? { backgroundImage: `url(${floorImage})`, backgroundRepeat: 'repeat', backgroundSize: '220px auto' }
            : { backgroundColor: '#1c2444' }
        }
      >
        {!previewMode && (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onInsertRowTop}
              disabled={state.heightTiles >= MAX_TILES_PER_SIDE}
              aria-label="Add row"
              className="rounded-md border border-night-600 bg-night-800 p-1 text-sand-300 shadow transition-colors hover:bg-night-700 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={onRemoveRowTop}
              disabled={state.heightTiles <= 1}
              aria-label="Remove row"
              className="rounded-md border border-night-600 bg-night-800 p-1 text-sand-300 shadow transition-colors hover:bg-night-700 disabled:cursor-not-allowed disabled:opacity-30"
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
                aria-label="Add column"
                className="rounded-md border border-night-600 bg-night-800 p-1 text-sand-300 shadow transition-colors hover:bg-night-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={onRemoveColLeft}
                disabled={state.widthTiles <= 1}
                aria-label="Remove column"
                className="rounded-md border border-night-600 bg-night-800 p-1 text-sand-300 shadow transition-colors hover:bg-night-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus size={14} />
              </button>
            </div>
          )}

          <div
            className="shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
            style={{
              width: `${Math.min(560, 340 * aspect) * zoom}px`,
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
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TileCanvas
