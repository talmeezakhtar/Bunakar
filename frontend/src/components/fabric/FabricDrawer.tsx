import { Suspense, lazy, useRef, useState } from 'react'
import { ArrowCounterClockwise, X } from '@phosphor-icons/react'
import { FIBRES, MATERIALS, fibreMaterial } from '../../data/materials'
import type { Fibre } from '../../data/materials'
import type { PileTexture } from '../../types/freeform'
import { useModalFocus } from '../../hooks/useModalFocus'
import { canShow3D } from '../../three/canShow3D'
import FibreFacts from '../ui/FibreFacts'
import FabricCloseUp from './FabricCloseUp'

const FabricViewer3D = lazy(() => import('../../three/fabric/FabricViewer3D'))

export interface FeelTarget {
  hex: string
  name: string
  fibre: Fibre | string
  pile?: PileTexture
  flat?: boolean
}

/**
 * A drawer to look at one yarn up close: the 3D close-up (lamp, brush, corner lift), what the
 * fibre is like to live with, and the same colour in another fibre side by side.
 */
export default function FabricDrawer({ target, onClose, onUseFibre }: { target: FeelTarget; onClose: () => void; onUseFibre?: (f: Fibre) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, onClose)
  const [fibre, setFibre] = useState<Fibre>(fibreMaterial(target.fibre).id)
  const [compare, setCompare] = useState<Fibre | ''>('')
  const [tilt, setTilt] = useState(0.35)
  const [lifted, setLifted] = useState(false)
  const [reset, setReset] = useState(0)
  const m = MATERIALS[fibre]
  const can3D = canShow3D()
  const view = (f: Fibre) =>
    can3D ? (
      <Suspense fallback={<div className="h-full w-full animate-pulse bg-[#2a241f]" />}>
        <FabricViewer3D hex={target.hex} fibre={f} pile={target.pile} flat={target.flat} tilt={tilt} lifted={lifted} resetKey={reset} />
      </Suspense>
    ) : (
      <FabricCloseUp hex={target.hex} fibre={f} pile={target.pile} flat={target.flat} />
    )
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`${target.name} in ${m.name}, up close`}
        className="flex h-full w-full max-w-[44rem] flex-col overflow-y-auto bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-[0.8125rem] text-muted">Feel the fabric</p>
            <h2 className="font-display text-xl text-ink">
              {target.name} · {m.name}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-2 text-ink-2 hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>

        <div className={`grid gap-1 bg-[#1d1915] ${compare ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="relative aspect-square">
            {view(fibre)}
            {compare && <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-0.5 text-[0.75rem] text-white">{m.short}</span>}
          </div>
          {compare && (
            <div className="relative aspect-square">
              {view(compare)}
              <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-0.5 text-[0.75rem] text-white">{MATERIALS[compare].short}</span>
            </div>
          )}
        </div>
        <p className="px-5 pt-2 text-[0.8125rem] text-muted">
          {can3D ? 'Move the pointer to move the lamp. Drag across the pile to brush it: away from you goes against the nap.' : 'Move the pointer to move the light.'}
        </p>

        {can3D && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 pt-3">
            <label className="flex items-center gap-2 text-sm text-ink-2">
              View
              <input type="range" min={0} max={1} step={0.01} value={tilt} onChange={(e) => setTilt(Number(e.target.value))} aria-label="Camera angle, from above to low" />
            </label>
            <button type="button" onClick={() => setLifted((v) => !v)} aria-pressed={lifted} className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-2">
              {lifted ? 'Lay it flat' : 'Lift the corner'}
            </button>
            <button type="button" onClick={() => setReset((n) => n + 1)} className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-2">
              <ArrowCounterClockwise size={14} /> Smooth the pile
            </button>
          </div>
        )}

        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-sm text-ink-2">
              <span className="mb-1 block">Fibre</span>
              <select className="min-h-9 rounded-md border border-line-strong bg-surface px-2 text-ink" value={fibre} onChange={(e) => setFibre(e.target.value as Fibre)}>
                {FIBRES.map((f) => (
                  <option key={f} value={f}>
                    {MATERIALS[f].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-ink-2">
              <span className="mb-1 block">Compare with</span>
              <select className="min-h-9 rounded-md border border-line-strong bg-surface px-2 text-ink" value={compare} onChange={(e) => setCompare(e.target.value as Fibre | '')}>
                <option value="">Nothing</option>
                {FIBRES.filter((f) => f !== fibre).map((f) => (
                  <option key={f} value={f}>
                    {MATERIALS[f].name}
                  </option>
                ))}
              </select>
            </label>
            {onUseFibre && fibre !== fibreMaterial(target.fibre).id && (
              <button type="button" onClick={() => onUseFibre(fibre)} className="min-h-9 rounded-md bg-ink px-3 text-sm text-paper hover:opacity-90">
                Use {m.short} for this yarn
              </button>
            )}
          </div>
          <FibreFacts fibre={fibre} className="text-[0.8125rem]" />
          <p className="text-[0.95rem] leading-relaxed text-ink-2">{m.description}</p>
          <dl className="grid gap-x-6 gap-y-3 text-[0.875rem] sm:grid-cols-2">
            <div>
              <dt className="text-muted">Feels</dt>
              <dd className="text-ink">{m.facts.feel}</dd>
            </div>
            <div>
              <dt className="text-muted">From</dt>
              <dd className="text-ink">{m.facts.origin}</dd>
            </div>
            <div>
              <dt className="text-muted">Best in</dt>
              <dd className="text-ink">{m.facts.rooms.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-muted">Care</dt>
              <dd className="text-ink">{m.facts.care}</dd>
            </div>
          </dl>
          <p className="text-[0.75rem] text-muted">Typical values for the fibre, not a measured spec.</p>
        </div>
      </div>
    </div>
  )
}
