import { useState } from 'react'
import type { ComponentProps } from 'react'
import { ArrowRight, DownloadSimple, Ruler } from '@phosphor-icons/react'
import ProBadge from '../ui/ProBadge'
import type { Swatch } from '../../types/swatch'
import type { CutType, Rotation, TileDesignState } from '../../types/tileDesign'
import { formatRugSize } from '../../types/tileDesign'
import MyStylesPanel from './MyStylesPanel'
import LivePreview from './LivePreview'
import DesignsPanel from './DesignsPanel'
import { summarizeTileDesign } from '../../utils/designSummary'

type Tab = 'colours' | 'motifs' | 'rug'

const TABS: { id: Tab; label: string }[] = [
  { id: 'colours', label: 'Colours' },
  { id: 'motifs', label: 'Motifs' },
  { id: 'rug', label: 'Rug' },
]

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
  /** Hosted in the studio, which has its own summary and room button. */
  embedded?: boolean
  /** Downloads the weaver's sheet (tile map + wool list); Pro only. */
  onExportSheet: () => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onStartDrag: (id: string) => void
  designs: ComponentProps<typeof DesignsPanel>
  /** Picking a motif switches to its tab, so the grid's mode and the open tab agree. */
  tab?: Tab
  onTabChange?: (tab: Tab) => void
}

/** The always-visible design summary and the way forward: pinned to the bottom of the inspector. */
export function SummaryBar({ state, onContinue, saveStatus }: Pick<RightPanelProps, 'state' | 'onContinue' | 'saveStatus'>) {
  const summary = summarizeTileDesign(state)
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-display text-2xl font-medium leading-none text-ink tabular-nums">{formatRugSize(state.widthTiles, state.heightTiles)}</p>
        <p className="mt-1 truncate text-[0.8125rem] text-muted" aria-live="polite">
          {summary.tiles === 0
            ? 'Paint a tile to begin'
            : [plural(summary.tiles, 'tile', 'tiles'), plural(summary.colours, 'colour', 'colours'), summary.motifs > 0 ? plural(summary.motifs, 'motif', 'motifs') : null]
                .filter(Boolean)
                .join(' · ')}
        </p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        disabled={saveStatus === 'saving'}
        className="group inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-full bg-accent px-5 font-semibold text-paper transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saveStatus === 'saving' ? 'Saving…' : 'See it in a room'}
        {saveStatus !== 'saving' && <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-0.5" />}
      </button>
    </div>
  )
}

/** The tile designer's inspector: colours, motifs and the rug itself, one tab at a time. */
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
  embedded = false,
  onExportSheet,
  saveStatus,
  onStartDrag,
  designs,
  tab: controlledTab,
  onTabChange,
}: RightPanelProps) {
  const [ownTab, setOwnTab] = useState<Tab>('colours')
  const tab = controlledTab ?? ownTab
  const setTab = onTabChange ?? setOwnTab
  const previewSwatch = activeBrush ? (swatchesById.get(activeBrush) ?? null) : null

  return (
    <aside aria-label="Inspector" className="flex min-h-0 w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper lg:w-[22rem] lg:shrink-0">
      <div role="tablist" aria-label="Inspector sections" className="flex border-b border-line px-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`relative min-h-12 flex-1 px-2 text-[0.9rem] font-medium transition-colors ${
              tab === t.id ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
            {tab === t.id && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {tab === 'colours' && (
          <>
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
          </>
        )}

        {tab === 'motifs' && <DesignsPanel {...designs} />}

        {tab === 'rug' && (
          <section aria-labelledby="rug-size" className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-surface p-4">
              <Ruler size={24} className="shrink-0 text-accent" weight="duotone" />
              <div className="min-w-0 flex-1">
                <h2 id="rug-size" className="text-sm font-semibold text-ink">
                  Size
                </h2>
                <p className="text-[0.95rem] text-ink-2">
                  {formatRugSize(state.widthTiles, state.heightTiles)} &middot; {state.widthTiles} &times; {state.heightTiles} tiles
                </p>
              </div>
              <button
                type="button"
                onClick={onEditDimensions}
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-[0.9rem] font-medium text-ink transition-colors hover:border-ink"
              >
                Change
              </button>
            </div>
            <p className="text-[0.9rem] leading-relaxed text-muted">
              Every tile is 18″ square, the size weavers work to. Export the design and its colour list to hand to any weaver.
            </p>
          </section>
        )}
      </div>

      {/* On phones the same bar is pinned to the bottom of the screen instead (TileDesignerLayout). */}
      <div className="hidden border-t border-line bg-paper p-4 lg:block">
        {!embedded && <SummaryBar state={state} onContinue={onContinue} saveStatus={saveStatus} />}
        <button
          type="button"
          onClick={onExportSheet}
          className={`${embedded ? '' : 'mt-3 '}flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-line-strong px-4 text-[0.9rem] font-medium text-ink transition-colors hover:border-ink`}
        >
          <DownloadSimple size={14} /> Download weaver&apos;s sheet <ProBadge />
        </button>
        {saveStatus === 'error' && <p className="mt-2 text-[0.8125rem] text-danger">Couldn&apos;t save. Check your connection and try again.</p>}
      </div>
    </aside>
  )
}

export default RightPanel
