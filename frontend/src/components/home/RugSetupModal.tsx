import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Ruler, X } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type { DesignShape } from '../../types/design'
import PatternThumb from './PatternThumb'
import type { PatternFamily } from './PatternThumb'

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

type RugSetupModalProps = {
  onClose: () => void
  patternName: string
  patternFamily: PatternFamily
}

function RugSetupModal({ onClose, patternName, patternFamily }: RugSetupModalProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [rugType, setRugType] = useState<RugType>('runner')
  const [sizeIndex, setSizeIndex] = useState<number | 'custom'>(0)
  const [customWidth, setCustomWidth] = useState('')
  const [customHeight, setCustomHeight] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const focusableSelector =
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    dialog.querySelector<HTMLElement>(focusableSelector)?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const presets = TYPE_SIZE_PRESETS[rugType]
  const isCustomOnly = presets.length === 0
  const widthFt =
    !isCustomOnly && sizeIndex !== 'custom' ? presets[sizeIndex].widthFt : Number(customWidth) || 0
  const heightFt =
    !isCustomOnly && sizeIndex !== 'custom' ? presets[sizeIndex].heightFt : Number(customHeight) || 0
  const canProceedStep2 = widthFt > 0 && heightFt > 0

  function selectType(type: RugType) {
    setRugType(type)
    setSizeIndex(TYPE_SIZE_PRESETS[type].length === 0 ? 'custom' : 0)
    setCustomWidth('')
    setCustomHeight('')
  }

  function handlePrimary() {
    if (step === 1) {
      setStep(2)
      return
    }
    navigate('/designer', { state: { shape: TYPE_TO_SHAPE[rugType], rugCategory: rugType, widthFt, heightFt } })
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
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-night-600 bg-night-900 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <header className="flex items-center justify-between border-b border-night-700 px-5 py-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display tracking-wide text-sand-100">{patternName}</span>
            <span className="text-night-600">/</span>
            <span className="text-sand-300">{step === 1 ? 'Type' : 'Size'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-transparent p-1.5 text-sand-300 transition-colors hover:text-gold-400"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex flex-col gap-8 px-6 py-8 sm:flex-row sm:gap-10">
          <div className="flex-1">
            {step === 1 ? (
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
                        <PatternThumb
                          family={patternFamily}
                          variant={i}
                          className="mx-auto w-full rounded-md"
                          style={{ aspectRatio: `${preset.widthFt} / ${preset.heightFt}` }}
                        />
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
                    placeholder="Width"
                    value={customWidth}
                    onChange={(e) => {
                      setCustomWidth(e.target.value)
                      setSizeIndex('custom')
                    }}
                    className="w-24 rounded-md border border-night-600 bg-night-950 px-3 py-2 text-center text-sm text-sand-100 placeholder:text-sand-300/55 focus:border-gold-500 focus:outline-none"
                  />
                  <span className="text-sand-300/60">x</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="Height"
                    value={customHeight}
                    onChange={(e) => {
                      setCustomHeight(e.target.value)
                      setSizeIndex('custom')
                    }}
                    className="w-24 rounded-md border border-night-600 bg-night-950 px-3 py-2 text-center text-sm text-sand-100 placeholder:text-sand-300/55 focus:border-gold-500 focus:outline-none"
                  />
                  <span className="text-sm text-sand-300/60">ft</span>
                </div>
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

        <footer className="flex items-center justify-between border-t border-night-700 px-6 py-4">
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep(1))}
            className="rounded-full border border-night-600 bg-transparent px-5 py-2 text-sm font-medium text-sand-200 transition-colors hover:border-sand-300"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            disabled={step === 2 && !canProceedStep2}
            className="rounded-full bg-gold-500 px-6 py-2 text-sm font-semibold text-night-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 1 ? 'Next' : 'Start Designing'}
          </button>
        </footer>
      </motion.div>
    </div>,
    document.body,
  )
}

export default RugSetupModal
