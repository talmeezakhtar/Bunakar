import { ArrowRight } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import type { CutType, Rotation, TileDesignState } from '../../types/tileDesign'
import { formatRugSize } from '../../types/tileDesign'
import MyStylesPanel from './MyStylesPanel'
import LivePreview from './LivePreview'
import DesignsPanel from './DesignsPanel'
import type { ComponentProps } from 'react'
import { estimateTileRug, formatINR } from '../../utils/tilePricing'

type RightPanelProps = {
  state: TileDesignState
  swatchesById: Map<string, Swatch>
  activeBrush: string | null
  activeCut: CutType
  activeRotation: Rotation
  onSelectBrush: (id: string) => void
  onRemoveStyle: (id: string) => void
  onAddMoreStyles: () => void
  onEditDimensions: () => void
  onContinue: () => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onStartDrag: (id: string) => void
  designs: ComponentProps<typeof DesignsPanel>
}

function RightPanel({
  state,
  swatchesById,
  activeBrush,
  activeCut,
  activeRotation,
  onSelectBrush,
  onRemoveStyle,
  onAddMoreStyles,
  onEditDimensions,
  onContinue,
  saveStatus,
  onStartDrag,
  designs,
}: RightPanelProps) {
  const estimate = estimateTileRug(state)
  const previewSwatch = activeBrush ? (swatchesById.get(activeBrush) ?? null) : null

  return (
    <aside aria-label="Styles and size" className="flex w-full flex-col gap-5 lg:w-80 lg:shrink-0">
      <MyStylesPanel
        myStyles={state.myStyles}
        swatchesById={swatchesById}
        activeBrush={activeBrush}
        onSelectBrush={onSelectBrush}
        onRemove={onRemoveStyle}
        onAddMore={onAddMoreStyles}
        onStartDrag={onStartDrag}
      />

      <LivePreview swatch={previewSwatch} cutType={activeCut} rotation={activeRotation} />

      <DesignsPanel {...designs} />

      <section className="flex items-center justify-between border-t border-night-700 pt-4">
        <div>
          <p className="text-xs text-sand-300/70">Rug Size</p>
          <p className="text-sm font-semibold text-sand-100">{formatRugSize(state.widthTiles, state.heightTiles)}</p>
        </div>
        <button
          type="button"
          onClick={onEditDimensions}
          className="text-xs font-medium text-gold-400 underline decoration-gold-500/40 underline-offset-2 transition-colors pointer-coarse:min-h-11 hover:text-gold-300"
        >
          Edit Dimensions
        </button>
      </section>

      <section aria-labelledby="tile-price" className="border-t border-night-700 pt-4">
        <div className="flex items-baseline justify-between">
          <h2 id="tile-price" className="text-xs text-sand-300/70">
            Estimated price
          </h2>
          <span className="font-display text-lg text-gold-300" aria-live="polite">
            {formatINR(estimate.total)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-sand-300/60">
          {estimate.tiles === 0
            ? 'Lay some tiles to see a price.'
            : `${estimate.tiles} ${estimate.tiles === 1 ? 'tile' : 'tiles'}${estimate.designTiles > 0 ? ' + design work' : ''} · indicative, final quote on order`}
        </p>
      </section>

      <div className="space-y-2 border-t border-night-700 pt-4">
        <button
          type="button"
          onClick={onContinue}
          disabled={saveStatus === 'saving'}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gold-500 px-4 py-2.5 text-sm font-semibold tracking-wide text-night-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Continue'}
          {saveStatus !== 'saving' && <ArrowRight size={16} />}
        </button>
        {saveStatus === 'error' && <p className="text-center text-xs text-red-400">Couldn't save. Try again.</p>}
        <p className="text-center text-xs text-sand-300/60">See your rug in a room, then export or share it.</p>
      </div>
    </aside>
  )
}

export default RightPanel
