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
          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors pointer-coarse:min-h-11 ${
            value === o.id ? 'border-gold-500 bg-gold-500/15 text-gold-300' : 'border-night-600 text-sand-300 hover:border-night-500'
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
    <aside aria-label="Yarn, finish and size" className="flex w-full flex-col gap-5 lg:w-80 lg:shrink-0">
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

      <section aria-labelledby="ff-finish" className="space-y-3.5 border-t border-night-700 pt-5">
        <h2 id="ff-finish" className="font-display text-sm tracking-wide text-sand-200">
          Texture &amp; finish
        </h2>
        <div className={`flex items-center gap-3 rounded-lg border p-2.5 ${selected ? 'border-gold-500/50 bg-gold-500/5' : 'border-night-700 bg-night-900'}`}>
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-black/30">
            <FinishSample finish={finish} swatch={swatch} id="fs-current" size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-sand-300/80">{target}</p>
            <p className="truncate text-sm text-sand-100" title={describeFinish(finish, swatch)}>
              {swatch ? `${swatch.colorName}, ${PILE_TEXTURES.find((t) => t.id === finish.texture)?.label.toLowerCase()}` : 'Pick a colour'}
            </p>
          </div>
          {selected ? (
            <button type="button" onClick={onDeselect} title="Done (Esc)" aria-label="Done editing, deselect" className="rounded-md p-1.5 text-sand-300 transition-colors hover:bg-night-800 hover:text-sand-100 pointer-coarse:min-h-11 pointer-coarse:min-w-11">
              <X size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSelectGround}
              title="Change the rug's background colour and finish"
              className="shrink-0 rounded-full border border-night-600 px-2.5 py-1 text-xs text-sand-200 transition-colors hover:border-gold-500 hover:text-gold-300 pointer-coarse:min-h-11"
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
                className={`flex flex-col items-center gap-1 rounded-md border p-1 text-[10px] leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                  finish.texture === t.id ? 'border-gold-500 text-gold-300' : 'border-night-700 text-sand-300 hover:border-night-500'
                }`}
              >
                <FinishSample finish={{ ...finish, texture: t.id, carve: 'none' }} swatch={swatch} id={`fs-${t.id}`} size={30} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-sand-300">Carving</p>
          <Chips label="Carving" options={CARVINGS} value={finish.carve} onChange={(carve) => onFinishChange({ carve })} />
        </div>
        {finish.carve === 'ribbed' && (
          <label className="block space-y-1 text-xs text-sand-300">
            Rib direction <span className="text-sand-100">{finish.carveAngle}°</span>
            <input
              type="range"
              min={0}
              max={165}
              step={15}
              value={finish.carveAngle}
              onChange={(e) => onFinishChange({ carveAngle: Number(e.target.value) })}
              className="w-full accent-gold-500"
            />
          </label>
        )}
        <div className="space-y-1">
          <p className="text-xs text-sand-300">Pile height</p>
          <Chips label="Pile height" options={PILE_HEIGHTS} value={finish.pile} onChange={(pile) => onFinishChange({ pile })} />
        </div>

      </section>

      <section aria-labelledby="ff-size" className="space-y-2 border-t border-night-700 pt-5">
        <h2 id="ff-size" className="font-display text-sm tracking-wide text-sand-200">
          Rug size
        </h2>
        <div className="flex items-center gap-2">
          {(['w', 'h'] as const).map((k, i) => (
            <label key={k} className="flex items-center gap-1 text-xs text-sand-300">
              <input
                type="number"
                min={min}
                max={max}
                step={0.5}
                value={k === 'w' ? w : h}
                onChange={(e) => setSizeDraft({ w, h, [k]: e.target.value })}
                aria-label={k === 'w' ? 'Width in feet' : 'Length in feet'}
                className="w-16 rounded-md border border-night-600 bg-night-950 px-2 py-1 text-center text-sm text-sand-100 focus:border-gold-500 focus:outline-none"
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
            className="ml-auto rounded-full border border-gold-500/60 px-3 py-1 text-xs font-semibold text-gold-400 transition-colors hover:bg-gold-500 hover:text-night-950 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gold-400"
          >
            Apply
          </button>
        </div>
        {!sizeValid ? <p className="text-xs text-red-400">Width and length must be {min} to {max} ft.</p> : <p className="text-xs text-sand-300/60">Shapes keep their size and place; anything past the edge is trimmed.</p>}
      </section>

      <div className="space-y-2 border-t border-night-700 pt-5">
        <button
          type="button"
          onClick={onContinue}
          disabled={saveStatus === 'saving'}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gold-500 px-4 py-2.5 text-sm font-semibold tracking-wide text-night-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
        >
          {saveStatus === 'saving' ? 'Saving...' : 'See it in a room'}
          {saveStatus !== 'saving' && <ArrowRight size={16} />}
        </button>
        {saveStatus === 'error' && <p className="text-center text-xs text-red-400">Couldn't save. Try again.</p>}
        <button
          type="button"
          onClick={onDownloadTemplate}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-night-600 px-4 py-2 text-xs font-medium text-sand-200 transition-colors hover:border-sand-300"
        >
          <DownloadSimple size={14} /> Download tufting template
        </button>
        <p className="text-center text-xs text-sand-300/60">A full-size SVG for the tufter, with a yarn legend.</p>
      </div>
    </aside>
  )
}

export default FreeformSidePanel
