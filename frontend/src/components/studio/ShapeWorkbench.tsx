import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Swatch } from '../../types/swatch'
import type { SaveStatus } from '../../hooks/useDesignPersistence'
import type { RugDoc, ShapeLayer } from '../../studio/model'
import { shapeLayerState, throughShapes } from '../../studio/convert'
import { useFreeformWorkbench } from '../freeform/useFreeformWorkbench'
import type { FreeformHistory } from '../freeform/useFreeformWorkbench'

type StudioHistory = {
  commit: (edit: (d: RugDoc) => RugDoc) => void
  begin: () => void
  live: (edit: (d: RugDoc) => RugDoc) => void
  end: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

/**
 * Tufted and hooked rugs in the studio: the freeform drawing editor working on the rug's shape
 * layer. Its tools and canvas fill the stage; its colours-and-finish panel goes into the
 * inspector's Shapes tab (`sideTarget`).
 */
export default function ShapeWorkbench({
  doc,
  layer,
  history,
  swatches,
  active,
  blocked,
  sideTarget,
  onContinue,
  saveStatus,
}: {
  doc: RugDoc
  layer: ShapeLayer
  history: StudioHistory
  swatches: Swatch[]
  /** The drawing view is showing (not the woven or 3D view). */
  active: boolean
  blocked: boolean
  sideTarget: HTMLElement | null
  onContinue: () => void
  saveStatus: SaveStatus
}) {
  const id = layer.id
  const state = useMemo(() => shapeLayerState(doc, layer), [doc, layer])
  const lens: FreeformHistory = {
    state,
    commit: (edit) => history.commit((d) => throughShapes(d, id, edit)),
    begin: history.begin,
    live: (edit) => history.live((d) => throughShapes(d, id, edit)),
    end: history.end,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
  const wb = useFreeformWorkbench({ history: lens, swatches, blocked: blocked || !active, onContinue, saveStatus, embedded: true })
  return (
    <>
      <div hidden={!active} className="absolute inset-0 overflow-auto">
        <div className="flex min-h-full flex-col gap-3 p-3 lg:flex-row">
          <div className="order-2 flex min-h-0 lg:order-none">{wb.tools}</div>
          <div className="order-1 flex min-h-0 min-w-0 flex-1 lg:order-none">{wb.canvas}</div>
        </div>
      </div>
      {sideTarget && createPortal(wb.side, sideTarget)}
      {wb.overlays}
    </>
  )
}
