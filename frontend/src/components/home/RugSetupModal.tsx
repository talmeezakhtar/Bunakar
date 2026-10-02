import { useRef, useState } from 'react'
import { useModalFocus } from '../../hooks/useModalFocus'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Ruler, X } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type { DesignShape } from '../../types/design'
import { MAX_RUG_FT, feetToTiles } from '../../types/tileDesign'
import { COLORWAYS, PATTERN_TEMPLATES, TEMPLATE_CATEGORIES, findColorway } from '../../data/patternTemplates'
import type { TemplateCategory } from '../../data/patternTemplates'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import PatternThumb from './PatternThumb'
import type { PatternFamily } from './PatternThumb'
import TemplatePreview from './TemplatePreview'
import FreeformPreview from './FreeformPreview'
import { FREEFORM_GENERATORS, FREEFORM_PALETTES } from '../../data/freeformGenerators'
import type { GeneratorId } from '../../data/freeformGenerators'

type RugType = 'runner' | 'area' | 'wall'

const RUG_TYPES: { value: RugType; label: string }[] = [
  { value: 'runner', label: 'Runners' },
  { value: 'area', label: 'Area Rug' },
  { value: 'wall', label: 'Wall to Wall' },
]

const TYPE_SIZE_PRESETS: Record<RugType, { label: string; widthFt: number; heightFt: number }[]> = {
  runner: [
    { label: "3' x 9'", widthFt: 3, heightFt: 9 },
    { label: "3' x 12'", widthFt: 3, heightFt: 12 },
    { label: "3' x 15'", widthFt: 3, heightFt: 15 },
  ],
  area: [
    { label: "5' x 7'", widthFt: 5, heightFt: 7 },
    { label: "8' x 10'", widthFt: 8, heightFt: 10 },
    { label: "10' x 12'", widthFt: 10, heightFt: 12 },
  ],
  wall: [],
}

const TYPE_TO_SHAPE: Record<RugType, DesignShape> = {
  runner: 'runner',
  area: 'rectangle',
  wall: 'rectangle',
}

function TypeGlyph({ type, selected }: { type: RugType; selected: boolean }) {
  const stroke = selected ? '#d9a441' : '#5b6591'
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      {type === 'runner' && <rect x="14" y="3" width="12" height="34" rx="2" fill="none" stroke={stroke} strokeWidth="2.5" />}
      {type === 'area' && <rect x="5" y="9" width="30" height="22" rx="2" fill="none" stroke={stroke} strokeWidth="2.5" />}
      {type === 'wall' && (
        <>
          <rect x="3" y="3" width="34" height="34" rx="2" fill="none" stroke={stroke} strokeWidth="2.5" />
          <path d="M3 3 L37 37 M37 3 L3 37" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
        </>
      )}
    </svg>
  )
}

type Step = 'pattern' | 'look' | 'type' | 'size'

const STEP_LABELS: Record<Step, string> = { pattern: 'Pattern', look: 'Look', type: 'Type', size: 'Size' }

function swatchColor([familyId, colorName]: readonly [string, string]) {
  return MOCK_SWATCHES.find((s) => s.familyId === familyId && s.colorName === colorName)?.swatchColor
}

type RugSetupModalProps = {
  onClose: () => void
  patternName: string
  patternFamily: PatternFamily
}

function RugSetupModal({ onClose, patternName, patternFamily }: RugSetupModalProps) {
  const navigate = useNavigate()
  const steps: Step[] =
    patternFamily === 'template' ? ['pattern', 'type', 'size'] : patternFamily === 'freeform' ? ['look', 'type', 'size'] : ['type', 'size']
  const [look, setLook] = useState<{ generator: GeneratorId; paletteId: string }>({
    generator: FREEFORM_GENERATORS[0].id,
    paletteId: FREEFORM_GENERATORS[0].paletteId,
  })
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const [templateId, setTemplateId] = useState(PATTERN_TEMPLATES[0].id)
  const [colorwayId, setColorwayId] = useState(PATTERN_TEMPLATES[0].colorwayId)
  const [category, setCategory] = useState<TemplateCategory | 'All'>('All')
  const [rugType, setRugType] = useState<RugType>('runner')
  const [sizeIndex, setSizeIndex] = useState<number | 'custom'>(0)
  const [customWidth, setCustomWidth] = useState('')
  const [customHeight, setCustomHeight] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  useModalFocus(dialogRef, onClose)

  const presets = TYPE_SIZE_PRESETS[rugType]
  const isCustomOnly = presets.length === 0
  const widthFt =
    !isCustomOnly && sizeIndex !== 'custom' ? presets[sizeIndex].widthFt : Number(customWidth) || 0
  const heightFt =
    !isCustomOnly && sizeIndex !== 'custom' ? presets[sizeIndex].heightFt : Number(customHeight) || 0
  // Past the max the designer grid would be too big to render (and the API rejects it).
  const tooBig = widthFt > MAX_RUG_FT || heightFt > MAX_RUG_FT
  const canProceed = step !== 'size' || (widthFt > 0 && heightFt > 0 && !tooBig)
  const template = PATTERN_TEMPLATES.find((t) => t.id === templateId)!
  const colorway = findColorway(colorwayId) ?? COLORWAYS[0]
  const visibleTemplates = category === 'All' ? PATTERN_TEMPLATES : PATTERN_TEMPLATES.filter((t) => t.category === category)

  function selectType(type: RugType) {
    setRugType(type)
    setSizeIndex(TYPE_SIZE_PRESETS[type].length === 0 ? 'custom' : 0)
    setCustomWidth('')
    setCustomHeight('')
  }

  // Picking a template also picks its signature colorway; the colorway row can then override it.
  function selectTemplate(id: string) {
    setTemplateId(id)
    setColorwayId(PATTERN_TEMPLATES.find((t) => t.id === id)!.colorwayId)
  }

  function handlePrimary() {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1)
      return
    }
    if (patternFamily === 'freeform') {
      // Freeform rugs are one hand-tufted piece: their own designer, sized in feet.
      navigate('/freeform', { state: { generator: look.generator, paletteId: look.paletteId, widthFt, heightFt, rugCategory: rugType } })
      return
    }
    navigate('/designer', {
      state: {
        shape: TYPE_TO_SHAPE[rugType],
        rugCategory: rugType,
        widthFt,
        heightFt,
        ...(patternFamily === 'template' && { templateId, colorwayId }),
      },
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-night-950/80 backdrop-blur-sm" />
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rug-setup-title"
        className={`relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-2xl border border-night-600 bg-night-900 shadow-[0_30px_80px_rgba(0,0,0,0.6)] ${
          step === 'pattern' || step === 'look' ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        <header className="flex items-center justify-between border-b border-night-700 px-5 py-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display tracking-wide text-sand-100">{patternName}</span>
            <span className="text-night-600">/</span>
            <span className="text-sand-300">{STEP_LABELS[step]}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center rounded-full bg-transparent p-1.5 text-sand-300 pointer-coarse:min-h-11 pointer-coarse:min-w-11 transition-colors hover:text-gold-400"
          >
            <X size={18} />
          </button>
        </header>

        {step === 'look' ? (
          <div className="px-6 py-8">
            <h3 id="rug-setup-title" className="font-display text-2xl tracking-wide text-sand-100">
              Choose a look
            </h3>
            <p className="mt-1 text-sm text-sand-300/80">
              A starting layout for your hand-tufted rug. Every shape, yarn, texture and carving stays editable.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {FREEFORM_GENERATORS.map((g) => {
                const selected = g.id === look.generator
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLook({ generator: g.id, paletteId: g.paletteId })}
                    className={`flex flex-col rounded-xl border p-2 text-left transition-colors ${
                      selected ? 'border-gold-500 bg-night-800' : 'border-night-600 hover:border-night-500'
                    }`}
                  >
                    <FreeformPreview
                      generatorId={g.id}
                      paletteId={selected ? look.paletteId : g.paletteId}
                      widthFt={4}
                      heightFt={5}
                      className="aspect-[4/5] w-full rounded-md"
                    />
                    <span className="mt-2 text-sm font-medium text-sand-100">{g.name}</span>
                    <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-sand-300/70">{g.description}</span>
                  </button>
                )
              })}
            </div>
            <fieldset className="mt-6">
              <legend className="text-xs uppercase tracking-wide text-sand-300/60">Palette</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FREEFORM_PALETTES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setLook({ ...look, paletteId: p.id })}
                    aria-pressed={p.id === look.paletteId}
                    className={`flex items-center gap-2 rounded-full border py-1.5 pl-2 pr-3.5 text-xs transition-colors ${
                      p.id === look.paletteId ? 'border-gold-500 text-sand-100' : 'border-night-600 text-sand-300 hover:border-night-500'
                    }`}
                  >
                    <span className="flex -space-x-1" aria-hidden="true">
                      {[p.ground, ...p.colors].slice(0, 5).map((ref, i) => (
                        <span key={i} className="h-4 w-4 rounded-full border border-night-900" style={{ background: swatchColor(ref) }} />
                      ))}
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : step === 'pattern' ? (
          <div className="px-6 py-8">
            <h3 id="rug-setup-title" className="font-display text-2xl tracking-wide text-sand-100">
              Choose a pattern
            </h3>
            <p className="mt-1 text-sm text-sand-300/80">
              {PATTERN_TEMPLATES.length} layouts drawn from weaving traditions. Every piece stays editable in the designer.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {(['All', ...TEMPLATE_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    category === c
                      ? 'border-gold-500 bg-gold-500/15 text-gold-300'
                      : 'border-night-600 text-sand-300 hover:border-night-500'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleTemplates.map((t) => {
                const selected = t.id === templateId
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTemplate(t.id)}
                    aria-pressed={selected}
                    className={`flex flex-col rounded-xl border p-2 text-left transition-colors ${
                      selected ? 'border-gold-500 bg-night-800' : 'border-night-600 hover:border-night-500'
                    }`}
                  >
                    <TemplatePreview
                      template={t}
                      colorway={selected ? colorway : (findColorway(t.colorwayId) ?? COLORWAYS[0])}
                      widthTiles={4}
                      heightTiles={5}
                      className="aspect-[4/5] w-full rounded-md"
                    />
                    <span className="mt-2 text-sm font-medium text-sand-100">{t.name}</span>
                    <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-sand-300/70">{t.origin}</span>
                  </button>
                )
              })}
            </div>

            <fieldset className="mt-6">
              <legend className="text-xs uppercase tracking-wide text-sand-300/60">Colorway</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLORWAYS.map((cw) => (
                  <button
                    key={cw.id}
                    type="button"
                    onClick={() => setColorwayId(cw.id)}
                    aria-pressed={cw.id === colorwayId}
                    className={`flex items-center gap-2 rounded-full border py-1.5 pl-2 pr-3.5 text-xs transition-colors ${
                      cw.id === colorwayId
                        ? 'border-gold-500 text-sand-100'
                        : 'border-night-600 text-sand-300 hover:border-night-500'
                    }`}
                  >
                    <span className="flex -space-x-1" aria-hidden="true">
                      {cw.roles.map((ref, i) => (
                        <span
                          key={i}
                          className="h-4 w-4 rounded-full border border-night-900"
                          style={{ background: swatchColor(ref) }}
                        />
                      ))}
                    </span>
                    {cw.name}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
        <div className="flex flex-col gap-8 px-6 py-8 sm:flex-row sm:gap-10">
          <div className="flex-1">
            {step === 'type' ? (
              <>
                <h3 id="rug-setup-title" className="font-display text-2xl tracking-wide text-sand-100">
                  What type of rug are you designing?
                </h3>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {RUG_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => selectType(t.value)}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                        rugType === t.value ? 'border-gold-500 bg-night-800' : 'border-night-600 hover:border-night-500'
                      }`}
                    >
                      <TypeGlyph type={t.value} selected={rugType === t.value} />
                      <span className="text-sm font-medium text-sand-100">{t.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3 id="rug-setup-title" className="font-display text-2xl tracking-wide text-sand-100">
                  What size rug do you need?
                </h3>

                {!isCustomOnly && (
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {presets.map((preset, i) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setSizeIndex(i)}
                        className={`rounded-xl border p-3 text-center transition-colors ${
                          sizeIndex === i ? 'border-gold-500 bg-night-800' : 'border-night-600 hover:border-night-500'
                        }`}
                      >
                        {patternFamily === 'freeform' ? (
                          <FreeformPreview
                            generatorId={look.generator}
                            paletteId={look.paletteId}
                            widthFt={preset.widthFt}
                            heightFt={preset.heightFt}
                            preserveAspectRatio="none"
                            className="mx-auto h-24 w-auto max-w-full rounded-md"
                            style={{ aspectRatio: `${preset.widthFt} / ${preset.heightFt}` }}
                          />
                        ) : patternFamily === 'template' ? (
                          <TemplatePreview
                            template={template}
                            colorway={colorway}
                            widthTiles={feetToTiles(preset.widthFt)}
                            heightTiles={feetToTiles(preset.heightFt)}
                            preserveAspectRatio="none"
                            className="mx-auto h-24 w-auto max-w-full rounded-md"
                            style={{ aspectRatio: `${preset.widthFt} / ${preset.heightFt}` }}
                          />
                        ) : (
                          <PatternThumb
                            family={patternFamily}
                            variant={i}
                            preserveAspectRatio="none"
                            className="mx-auto h-24 w-auto max-w-full rounded-md"
                            style={{ aspectRatio: `${preset.widthFt} / ${preset.heightFt}` }}
                          />
                        )}
                        <span className="mt-2 block text-sm text-sand-200">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                <p className="mt-6 text-center text-xs uppercase tracking-wide text-sand-300/60">
                  {isCustomOnly ? 'Enter your area (feet)' : 'Or enter a custom size (feet)'}
                </p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={MAX_RUG_FT}
                    placeholder="Width"
                    aria-label="Custom width in feet"
                    value={customWidth}
                    onChange={(e) => {
                      setCustomWidth(e.target.value)
                      setSizeIndex('custom')
                    }}
                    className="w-24 rounded-md border border-night-600 bg-night-950 px-3 py-2 text-center text-sm text-sand-100 placeholder:text-sand-300/70 focus:border-gold-500 focus:outline-none"
                  />
                  <span className="text-sand-300/60">x</span>
                  <input
                    type="number"
                    min={1}
                    max={MAX_RUG_FT}
                    placeholder="Length"
                    aria-label="Custom length in feet"
                    value={customHeight}
                    onChange={(e) => {
                      setCustomHeight(e.target.value)
                      setSizeIndex('custom')
                    }}
                    className="w-24 rounded-md border border-night-600 bg-night-950 px-3 py-2 text-center text-sm text-sand-100 placeholder:text-sand-300/70 focus:border-gold-500 focus:outline-none"
                  />
                  <span className="text-sm text-sand-300/60">ft</span>
                </div>
                {tooBig && (
                  <p role="alert" className="mt-2 text-center text-xs text-red-300">
                    The largest rug we can weave here is {MAX_RUG_FT} ft on a side.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-night-700 bg-night-950/60 px-5 py-6 text-center sm:w-48">
            <Ruler size={28} className="text-gold-400" weight="duotone" />
            <p className="text-sm font-medium text-sand-100">Measure twice, weave once</p>
            <p className="text-xs leading-relaxed text-sand-300/70">
              Every rug is knotted to your exact size. You can fine-tune it further in the
              designer.
            </p>
          </div>
        </div>
        )}

        <footer className="flex items-center justify-between border-t border-night-700 px-6 py-4">
          <button
            type="button"
            onClick={() => (stepIndex === 0 ? onClose() : setStepIndex(stepIndex - 1))}
            className="rounded-full border border-night-600 bg-transparent px-5 py-2 text-sm pointer-coarse:min-h-11 font-medium text-sand-200 transition-colors hover:border-sand-300"
          >
            {stepIndex === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            disabled={!canProceed}
            className="rounded-full bg-gold-500 px-6 py-2 text-sm pointer-coarse:min-h-11 font-semibold text-night-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {stepIndex < steps.length - 1 ? 'Next' : 'Start Designing'}
          </button>
        </footer>
      </motion.div>
    </div>,
    document.body,
  )
}

export default RugSetupModal
