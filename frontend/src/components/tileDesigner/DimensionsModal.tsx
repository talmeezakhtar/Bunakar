import { useRef, useState } from 'react'
import { useModalFocus } from '../../hooks/useModalFocus'
import { createPortal } from 'react-dom'
import { Ruler, X } from '@phosphor-icons/react'
import type { RugCategory } from '../../types/tileDesign'
import { MAX_RUG_FT, feetToTiles, formatRugSize, SIZE_PRESETS } from '../../types/tileDesign'

const RUG_CATEGORIES: { id: RugCategory; label: string }[] = [
  { id: 'area', label: 'Area Rug' },
  { id: 'runner', label: 'Runner' },
  { id: 'wall', label: 'Wall to Wall' },
]

type DimensionsModalProps = {
  widthTiles: number
  heightTiles: number
  rugCategory: RugCategory
  onClose: () => void
  onSave: (widthTiles: number, heightTiles: number, rugCategory: RugCategory) => void
}

function DimensionsModal({ widthTiles, heightTiles, rugCategory, onClose, onSave }: DimensionsModalProps) {
  const presetMatch = SIZE_PRESETS.findIndex(
    (p) => p.widthTiles === widthTiles && p.heightTiles === heightTiles,
  )
  const [selected, setSelected] = useState<number | 'custom'>(presetMatch >= 0 ? presetMatch : 'custom')
  const [customWidthFt, setCustomWidthFt] = useState('8')
  const [customHeightFt, setCustomHeightFt] = useState('10')
  const [category, setCategory] = useState<RugCategory>(rugCategory)

  const dialogRef = useRef<HTMLDivElement>(null)
  useModalFocus(dialogRef, onClose)

  const customW = feetToTiles(Number(customWidthFt) || 1)
  const customH = feetToTiles(Number(customHeightFt) || 1)

  const nextWidth = selected === 'custom' ? customW : SIZE_PRESETS[selected].widthTiles
  const nextHeight = selected === 'custom' ? customH : SIZE_PRESETS[selected].heightTiles
  // feetToTiles clamps to the max, so check the typed feet - not the clamped tiles.
  const tooBig =
    selected === 'custom' && (Number(customWidthFt) > MAX_RUG_FT || Number(customHeightFt) > MAX_RUG_FT)

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-night-950/80 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dimensions-title"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-night-600 bg-night-900 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <header className="flex items-center justify-between border-b border-night-700 px-5 py-4">
          <h2 id="dimensions-title" className="font-display text-lg tracking-wide text-sand-100">
            Edit Dimensions
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center rounded-full bg-transparent p-1.5 text-sand-300 pointer-coarse:min-h-11 pointer-coarse:min-w-11 transition-colors hover:text-gold-400"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sand-300/60">Rug Type</p>
            <div className="inline-flex rounded-full border border-night-600 p-0.5">
              {RUG_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  aria-pressed={category === c.id}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    category === c.id ? 'bg-gold-500 text-night-950' : 'text-sand-300 hover:text-sand-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-sand-300/60">Sets which room photos your preview uses.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SIZE_PRESETS.map((preset, i) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSelected(i)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                  selected === i ? 'border-gold-500 bg-night-800' : 'border-night-600 hover:border-night-500'
                }`}
              >
                <Ruler size={22} className="text-gold-400" />
                <span className="text-sm font-medium text-sand-100">{preset.label}</span>
                <span className="text-xs text-sand-300/60">{preset.widthTiles * preset.heightTiles} tiles</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelected('custom')}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                selected === 'custom' ? 'border-gold-500 bg-night-800' : 'border-night-600 hover:border-night-500'
              }`}
            >
              <Ruler size={22} className="text-gold-400" />
              <span className="text-sm font-medium text-sand-100">Custom Size</span>
              <span className="text-xs text-sand-300/60">{customW * customH} tiles</span>
            </button>
          </div>

          {selected === 'custom' && (
            <div className="flex items-center justify-center gap-3 rounded-lg border border-night-700 bg-night-950/60 px-4 py-4">
              <label className="flex flex-col items-center gap-1 text-xs text-sand-300">
                Width (ft)
                <input
                  type="number"
                  min={1}
                  max={MAX_RUG_FT}
                  value={customWidthFt}
                  onChange={(e) => setCustomWidthFt(e.target.value)}
                  className="w-20 rounded-md border border-night-600 bg-night-950 px-2 py-1.5 text-center text-sm text-sand-100 focus:border-gold-500 focus:outline-none"
                />
              </label>
              <span className="mt-4 text-sand-300/60">x</span>
              <label className="flex flex-col items-center gap-1 text-xs text-sand-300">
                Length (ft)
                <input
                  type="number"
                  min={1}
                  max={MAX_RUG_FT}
                  value={customHeightFt}
                  onChange={(e) => setCustomHeightFt(e.target.value)}
                  className="w-20 rounded-md border border-night-600 bg-night-950 px-2 py-1.5 text-center text-sm text-sand-100 focus:border-gold-500 focus:outline-none"
                />
              </label>
            </div>
          )}

          <p className="text-center text-xs text-sand-300/70">
            New size: {formatRugSize(nextWidth, nextHeight)} ({nextWidth * nextHeight} tiles)
          </p>
          {tooBig && (
            <p role="alert" className="text-center text-xs text-red-300">
              The largest rug we can weave here is {MAX_RUG_FT} ft on a side.
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-night-700 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-night-600 bg-transparent px-4 py-2 text-sm pointer-coarse:min-h-11 font-medium text-sand-200 transition-colors hover:border-sand-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(nextWidth, nextHeight, category)}
            disabled={tooBig}
            className="rounded-full bg-gold-500 px-4 py-2 text-sm pointer-coarse:min-h-11 font-semibold text-night-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save Changes
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

export default DimensionsModal
