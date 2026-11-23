import ProBadge from '../ui/ProBadge'
import { useState } from 'react'
import { ArrowRight, DownloadSimple, X } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import type { FreeformDesignState, SurfaceFinish } from '../../types/freeform'
import { CARVINGS, FREEFORM_SIZE_LIMITS, PILE_HEIGHTS, PILE_TEXTURES } from '../../types/freeform'
import type { FreeformTarget } from '../../store/freeformOps'
import { describeFinish } from '../../utils/freeformProduction'
import MyStylesPanel from '../tileDesigner/MyStylesPanel'
import FinishSample from './FinishSample'

type FreeformSidePanelProps = {
  state: FreeformDesignState
  swatchesById: Map<string, Swatch>
  selected: FreeformTarget | null
  /** The finish being edited: the selection's, or the brush's when nothing is selected. */
  finish: SurfaceFinish
  onFinishChange: (patch: Partial<SurfaceFinish>) => void
  onRemoveStyle: (id: string) => void
  onAddMoreStyles: () => void
  onSelectGround: () => void
  onDeselect: () => void
  onResize: (widthFt: number, heightFt: number) => void
  onContinue: () => void
  /** Hosted in the studio, which has its own room button. */
  embedded?: boolean
  onDownloadTemplate: () => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-2.5 py-1 text-[0.8125rem] transition-colors pointer-coarse:min-h-11 ${
            value === o.id ? 'border-accent bg-accent/15 text-accent-deep' : 'border-line-strong text-muted hover:border-line-hover'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function FreeformSidePanel({
  state,
  swatchesById,
  selected,
  finish,
  onFinishChange,
  onRemoveStyle,
  onAddMoreStyles,
  onSelectGround,
  onDeselect,
  onResize,
  onContinue,
  embedded = false,
  onDownloadTemplate,
  saveStatus,
}: FreeformSidePanelProps) {
  const [sizeDraft, setSizeDraft] = useState<{ w: string; h: string } | null>(null)
  const swatch = swatchesById.get(finish.swatchId)
  const selectedShape = selected && selected !== 'ground' ? state.shapes.find((s) => s.id === selected) : undefined
  const target = selected === 'ground' ? 'Editing the ground' : selectedShape ? 'Editing the selected shape' : 'Paint and new shapes use'
  const w = sizeDraft?.w ?? String(state.widthFt)
  const h = sizeDraft?.h ?? String(state.heightFt)
  const { min, max } = FREEFORM_SIZE_LIMITS
  const wn = Number(w)
  const hn = Number(h)
  const sizeValid = wn >= min && wn <= max && hn >= min && hn <= max

  return (
    <aside aria-label="Yarn, finish and size" className="flex w-full flex-col gap-5 rounded-[var(--radius-card)] border border-line bg-paper p-4 lg:min-h-0 lg:w-[22rem] lg:shrink-0 lg:overflow-y-auto">
      <MyStylesPanel
        myStyles={state.myStyles}
        swatchesById={swatchesById}
        activeBrush={finish.swatchId}
        onSelectBrush={(id) => onFinishChange({ swatchId: id })}
        onRemove={onRemoveStyle}
        onAddMore={onAddMoreStyles}
        onStartDrag={(id) => onFinishChange({ swatchId: id })}
        hint={selected ? 'Click a colour to recolour what you have selected.' : 'Click a colour, then paint or draw with it.'}
      />

      <section aria-labelledby="ff-finish" className="space-y-3.5 border-t border-line pt-5">
        <h2 id="ff-finish" className="text-sm font-semibold text-ink">
          Texture &amp; finish
        </h2>
        <div className={`flex items-center gap-3 rounded-lg border p-2.5 ${selected ? 'border-accent/50 bg-accent/5' : 'border-line bg-surface'}`}>
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-black/30">
            <FinishSample finish={finish} swatch={swatch} id="fs-current" size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] text-muted">{target}</p>
            <p className="truncate text-sm text-ink" title={describeFinish(finish, swatch)}>
              {swatch ? `${swatch.colorName}, ${PILE_TEXTURES.find((t) => t.id === finish.texture)?.label.toLowerCase()}` : 'Pick a colour'}
            </p>
          </div>
          {selected ? (
            <button type="button" onClick={onDeselect} title="Done (Esc)" aria-label="Done editing, deselect" className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink pointer-coarse:min-h-11 pointer-coarse:min-w-11">
              <X size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSelectGround}
              title="Change the rug's background colour and finish"
              className="shrink-0 rounded-full border border-line-strong px-2.5 py-1 text-[0.8125rem] text-ink-2 transition-colors hover:border-accent hover:text-accent-deep pointer-coarse:min-h-11"
            >
              Edit ground
            </button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Pile texture">
          {PILE_TEXTURES.map((t) => {
            const disabled = t.id === 'photo' && !swatch?.imageUrl
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                aria-pressed={finish.texture === t.id}
                title={disabled ? 'Only for styles with a tile photo' : `${t.label} - ${t.hint}`}
                onClick={() => onFinishChange({ texture: t.id })}
                className={`flex flex-col items-center gap-1 rounded-md border p-1 text-[0.8125rem] leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                  finish.texture === t.id ? 'border-accent text-accent-deep' : 'border-line text-muted hover:border-line-hover'
                }`}
              >
                <FinishSample finish={{ ...finish, texture: t.id, carve: 'none' }} swatch={swatch} id={`fs-${t.id}`} size={30} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="space-y-1">
          <p className="text-[0.8125rem] text-muted">Carving</p>
          <Chips label="Carving" options={CARVINGS} value={finish.carve} onChange={(carve) => onFinishChange({ carve })} />
        </div>
        {finish.carve === 'ribbed' && (
          <label className="block space-y-1 text-[0.8125rem] text-muted">
            Rib direction <span className="text-ink">{finish.carveAngle}°</span>
            <input
              type="range"
              min={0}
              max={165}
              step={15}
              value={finish.carveAngle}
              onChange={(e) => onFinishChange({ carveAngle: Number(e.target.value) })}
              className="w-full accent-accent"
            />
          </label>
        )}
        <div className="space-y-1">
          <p className="text-[0.8125rem] text-muted">Pile height</p>
          <Chips label="Pile height" options={PILE_HEIGHTS} value={finish.pile} onChange={(pile) => onFinishChange({ pile })} />
        </div>

      </section>

      <section aria-labelledby="ff-size" className="space-y-2 border-t border-line pt-5">
        <h2 id="ff-size" className="text-sm font-semibold text-ink">
          Rug size
        </h2>
        <div className="flex items-center gap-2">
          {(['w', 'h'] as const).map((k, i) => (
            <label key={k} className="flex items-center gap-1 text-[0.8125rem] text-muted">
              <input
                type="number"
                min={min}
                max={max}
                step={0.5}
                value={k === 'w' ? w : h}
                onChange={(e) => setSizeDraft({ w, h, [k]: e.target.value })}
                aria-label={k === 'w' ? 'Width in feet' : 'Length in feet'}
                className="w-16 rounded-md border border-line-strong bg-paper px-2 py-1 text-center text-sm text-ink focus:border-accent"
              />
              {i === 0 ? 'x' : 'ft'}
            </label>
          ))}
          <button
            type="button"
            disabled={!sizeDraft || !sizeValid}
            onClick={() => {
              onResize(wn, hn)
              setSizeDraft(null)
            }}
            className="ml-auto inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-[0.9rem] font-semibold text-paper transition-colors hover:bg-ink-2 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
        {!sizeValid ? <p className="text-[0.8125rem] text-danger">Width and length must be {min} to {max} ft.</p> : <p className="text-[0.8125rem] text-muted-2">Shapes keep their size and place; anything past the edge is trimmed.</p>}
      </section>

      <div className="space-y-2 border-t border-line pt-5 lg:sticky lg:-bottom-4 lg:-mx-4 lg:-mb-4 lg:mt-auto lg:bg-paper lg:px-4 lg:pb-4">
        <button
          type="button"
          onClick={onContinue}
          disabled={saveStatus === 'saving'}
          className={`hidden min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-accent px-4 font-semibold text-paper transition-colors hover:bg-accent-hover disabled:opacity-60 ${embedded ? '' : 'lg:flex'}`}
        >
          {saveStatus === 'saving' ? 'Saving…' : 'See it in a room'}
          {saveStatus !== 'saving' && <ArrowRight size={16} />}
        </button>
        {saveStatus === 'error' && <p className="text-center text-[0.8125rem] text-danger">Couldn't save. Try again.</p>}
        <button
          type="button"
          onClick={onDownloadTemplate}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-line-strong px-4 text-[0.9rem] font-medium text-ink transition-colors hover:border-ink"
        >
          <DownloadSimple size={14} /> Download tufting template <ProBadge />
        </button>
        <p className="text-center text-[0.8125rem] text-muted-2">A full-size SVG for the tufter, with a yarn legend.</p>
      </div>
    </aside>
  )
}

export default FreeformSidePanel
