import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Swatch } from '../../types/swatch'
import type { SaveStatus } from '../../hooks/useDesignPersistence'
import type { RugDoc, TileLayer } from '../../studio/model'
import { throughTiles, tileLayerState } from '../../studio/convert'
import { tileDesignReducer } from '../../store/tileDesignReducer'
import { useTileWorkbench } from '../tileDesigner/useTileWorkbench'
import type { TileHistory } from '../tileDesigner/useTileWorkbench'

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
 * Tile rugs in the studio: the tile editor working on the rug's tile layer. Cut shapes and the
 * grid fill the stage; the colours, motifs and rug panel goes into the inspector's Tiles tab.
 */
export default function TileWorkbench({
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
  layer: TileLayer
  history: StudioHistory
  swatches: Swatch[]
  active: boolean
  blocked: boolean
  sideTarget: HTMLElement | null
  onContinue: () => void
  saveStatus: SaveStatus
}) {
  const id = layer.id
  const state = useMemo(() => tileLayerState(doc, layer), [doc, layer])
  const lens: TileHistory = {
    state,
    commit: (action) => history.commit((d) => throughTiles(d, id, (s) => tileDesignReducer(s, action))),
    beginStroke: history.begin,
    updateStroke: (action) => history.live((d) => throughTiles(d, id, (s) => tileDesignReducer(s, action))),
    endStroke: history.end,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
  const wb = useTileWorkbench({ history: lens, swatches, blocked: blocked || !active, onContinue, saveStatus, embedded: true })
  return (
    <>
      <div hidden={!active} className="absolute inset-0 overflow-auto">
        <div className="flex min-h-full flex-col gap-3 p-3 lg:flex-row">
          {wb.shapePanel}
          {wb.canvas}
        </div>
      </div>
      {sideTarget && createPortal(wb.side, sideTarget)}
      {wb.overlays}
    </>
  )
}
