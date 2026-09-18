import {
  ArrowCounterClockwise,
  ArrowClockwise,
  Eye,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  CornersOut,
  CornersIn,
  ArrowsClockwise,
  ArrowsCounterClockwise,
} from '@phosphor-icons/react'
import type { BackgroundId } from '../../types/tileDesign'
import { BACKGROUNDS } from '../../types/tileDesign'

type CanvasToolbarProps = {
  backgroundId: BackgroundId
  onSetBackground: (id: BackgroundId) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  previewMode: boolean
  onTogglePreview: () => void
  onRotateBrush: () => void
  onRotateGrid: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

function CanvasToolbar({
  backgroundId,
  onSetBackground,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  previewMode,
  onTogglePreview,
  onRotateBrush,
  onRotateGrid,
  onZoomIn,
  onZoomOut,
  isFullscreen,
  onToggleFullscreen,
}: CanvasToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-night-700 bg-night-900 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          className="rounded-md p-1.5 text-sand-300 transition-colors hover:bg-night-800 hover:text-sand-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowCounterClockwise size={18} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          className="rounded-md p-1.5 text-sand-300 transition-colors hover:bg-night-800 hover:text-sand-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowClockwise size={18} />
        </button>

        <span className="mx-1 h-5 w-px bg-night-700" aria-hidden="true" />

        <button
          type="button"
          onClick={onTogglePreview}
          aria-pressed={previewMode}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
            previewMode ? 'bg-gold-500 text-night-950' : 'text-sand-300 hover:bg-night-800 hover:text-sand-100'
          }`}
        >
          <Eye size={18} /> Preview
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-sand-300">
        Floor Type
        <select
          value={backgroundId}
          onChange={(e) => onSetBackground(e.target.value as BackgroundId)}
          className="rounded-md border border-night-600 bg-night-950 px-2 py-1 text-sm text-sand-100 focus:border-gold-500 focus:outline-none"
        >
          {BACKGROUNDS.map((bg) => (
            <option key={bg.id} value={bg.id}>
              {bg.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onRotateBrush}
          aria-label="Rotate tile"
          title="Rotate the active cut tile before placing it"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-sand-300 transition-colors hover:bg-night-800 hover:text-sand-100"
        >
          <ArrowsClockwise size={18} /> Rotate Tile
        </button>
        <button
          type="button"
          onClick={onRotateGrid}
          aria-label="Rotate grid"
          title="Rotate the whole design 90 degrees"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-sand-300 transition-colors hover:bg-night-800 hover:text-sand-100"
        >
          <ArrowsCounterClockwise size={18} /> Rotate Grid
        </button>

        <span className="mx-1 h-5 w-px bg-night-700" aria-hidden="true" />

        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="rounded-md p-1.5 text-sand-300 transition-colors hover:bg-night-800 hover:text-sand-100"
        >
          <MagnifyingGlassMinus size={18} />
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="rounded-md p-1.5 text-sand-300 transition-colors hover:bg-night-800 hover:text-sand-100"
        >
          <MagnifyingGlassPlus size={18} />
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          className="rounded-md p-1.5 text-sand-300 transition-colors hover:bg-night-800 hover:text-sand-100"
        >
          {isFullscreen ? <CornersIn size={18} /> : <CornersOut size={18} />}
        </button>
      </div>
    </div>
  )
}

export default CanvasToolbar
