import { CUT_TYPES } from '../../types/tileDesign'
import type { CutType } from '../../types/tileDesign'
import { cutPath, isPositionable, slotGrid } from './cutShapes'

type ShapePanelProps = {
  activeCut: CutType
  onSelectCut: (cut: CutType) => void
}

function ShapePanel({ activeCut, onSelectCut }: ShapePanelProps) {
  const standard = CUT_TYPES[0]
  const cuts = CUT_TYPES.slice(1)

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-40">
      <h2 className="font-display text-sm tracking-wide text-sand-200">Tile Shape</h2>

      <button
        type="button"
        onClick={() => onSelectCut(standard.id)}
        aria-pressed={activeCut === standard.id}
        className={`flex w-full flex-col items-center gap-2 rounded-lg border-2 px-3 py-4 transition-colors ${
          activeCut === standard.id ? 'border-gold-500 bg-night-800' : 'border-night-700 bg-night-900 hover:border-night-500'
        }`}
      >
        <svg width="28" height="28" viewBox="0 0 1 1" aria-hidden="true">
          <path d={cutPath('full')} fill="none" stroke="#e6d5b3" strokeWidth="0.05" />
        </svg>
        <span className="text-xs font-medium text-sand-100">{standard.label}</span>
      </button>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sand-300/60">Cuts</p>
        <div className="grid grid-cols-1 gap-2">
          {cuts.map((cut) => {
            const active = activeCut === cut.id
            const positionable = isPositionable(cut.id)
            const { cols, rows } = slotGrid(cut.id)
            return (
              <button
                key={cut.id}
                type="button"
                onClick={() => onSelectCut(cut.id)}
                aria-pressed={active}
                title={positionable ? `${cut.label} - drag anywhere in the tile to position` : cut.label}
                className={`flex w-full items-center gap-3 rounded-md border px-2.5 py-2.5 transition-colors ${
                  active ? 'border-gold-500 bg-night-800' : 'border-night-700 bg-night-900 hover:border-night-500'
                }`}
              >
                <svg width="40" height="40" viewBox="0 0 1 1" className="shrink-0" aria-hidden="true">
                  <rect x="0" y="0" width="1" height="1" fill="none" stroke="#3a4470" strokeWidth="0.02" />
                  {positionable ? (
                    <>
                      <path d={cutPath(cut.id, { x: 0, y: 0 })} fill={active ? '#f0c774' : '#7d88b3'} />
                      {Array.from({ length: cols - 1 }, (_, i) => (
                        <line
                          key={`v-${i}`}
                          x1={((i + 1) / cols).toFixed(4)}
                          y1={0}
                          x2={((i + 1) / cols).toFixed(4)}
                          y2={1}
                          stroke="#3a4470"
                          strokeWidth={0.016}
                        />
                      ))}
                      {Array.from({ length: rows - 1 }, (_, i) => (
                        <line
                          key={`h-${i}`}
                          x1={0}
                          y1={((i + 1) / rows).toFixed(4)}
                          x2={1}
                          y2={((i + 1) / rows).toFixed(4)}
                          stroke="#3a4470"
                          strokeWidth={0.016}
                        />
                      ))}
                    </>
                  ) : (
                    <path d={cutPath(cut.id)} fill={active ? '#f0c774' : '#7d88b3'} />
                  )}
                </svg>
                <span className="text-sm text-sand-300">{cut.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

export default ShapePanel
