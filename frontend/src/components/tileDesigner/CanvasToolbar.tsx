import type { ReactNode } from 'react'
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
  /** The 2D / 3D switch, when this device can show 3D. */
  viewToggle?: ReactNode
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
  viewToggle,
}: CanvasToolbarProps) {
  return (
    <div className="flex flex-nowrap items-center justify-between gap-2 overflow-x-auto border-b border-line bg-paper px-2.5 py-1.5 [scrollbar-width:none]">
      <div className="flex shrink-0 items-center gap-1.5">
        {viewToggle}
        {viewToggle && <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"
          className="inline-flex items-center justify-center rounded-md h-9 w-9 text-ink-2 pointer-coarse:h-11 pointer-coarse:w-11 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowCounterClockwise size={18} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)"
          className="inline-flex items-center justify-center rounded-md h-9 w-9 text-ink-2 pointer-coarse:h-11 pointer-coarse:w-11 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowClockwise size={18} />
        </button>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        <button
          type="button"
          onClick={onTogglePreview}
          aria-pressed={previewMode}
          className={`flex items-center gap-1.5 rounded-md min-h-9 px-2 text-sm pointer-coarse:min-h-11 transition-colors ${
            previewMode ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
          }`}
        >
          <Eye size={18} /> Preview
        </button>
      </div>

      <label className="flex shrink-0 items-center gap-2 text-sm text-ink-2">
        <span className="hidden sm:inline">Floor</span>
        <select
          aria-label="Floor under the rug"
          value={backgroundId}
          onChange={(e) => onSetBackground(e.target.value as BackgroundId)}
          className="min-h-9 rounded-md border border-line-strong bg-paper px-2 text-sm text-ink pointer-coarse:min-h-11 focus:border-accent"
        >
          {BACKGROUNDS.map((bg) => (
            <option key={bg.id} value={bg.id}>
              {bg.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onRotateBrush}
          aria-label="Rotate the cut (R)"
          title="Rotate the cut before placing it (R)"
          className="flex items-center gap-1.5 rounded-md min-h-9 px-2 text-sm text-ink-2 pointer-coarse:min-h-11 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowsClockwise size={18} /> <span className="hidden sm:inline">Rotate cut</span>
        </button>
        <button
          type="button"
          onClick={onRotateGrid}
          aria-label="Rotate the whole rug"
          title="Turn the whole rug 90 degrees"
          className="flex items-center gap-1.5 rounded-md min-h-9 px-2 text-sm text-ink-2 pointer-coarse:min-h-11 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowsCounterClockwise size={18} /> <span className="hidden sm:inline">Rotate rug</span>
        </button>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="inline-flex items-center justify-center rounded-md h-9 w-9 text-ink-2 pointer-coarse:h-11 pointer-coarse:w-11 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <MagnifyingGlassMinus size={18} />
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="inline-flex items-center justify-center rounded-md h-9 w-9 text-ink-2 pointer-coarse:h-11 pointer-coarse:w-11 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <MagnifyingGlassPlus size={18} />
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          className="inline-flex items-center justify-center rounded-md h-9 w-9 text-ink-2 pointer-coarse:h-11 pointer-coarse:w-11 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {isFullscreen ? <CornersIn size={18} /> : <CornersOut size={18} />}
        </button>
      </div>
    </div>
  )
}

export default CanvasToolbar
