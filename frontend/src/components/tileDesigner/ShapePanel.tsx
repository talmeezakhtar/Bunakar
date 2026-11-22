import { CUT_TYPES } from '../../types/tileDesign'
import type { CutType } from '../../types/tileDesign'
import { cutPath, isPositionable, slotGrid } from './cutShapes'

type ShapePanelProps = {
  activeCut: CutType
  onSelectCut: (cut: CutType) => void
}

/** What each cut is, in words - shown as the button's tooltip and to screen readers. */
const CUT_HINTS: Record<CutType, string> = {
  full: 'A whole 18″ tile',
  half: 'Half a tile, split straight down the middle',
  quad: 'A quarter tile: one corner square',
  third: 'A strip one third of a tile wide',
  quarter: 'A strip one quarter of a tile wide',
  ninth: 'One square of a 3 × 3 split',
  sixteenth: 'One square of a 4 × 4 split',
  diagonal: 'Half a tile, cut corner to corner',
  arc: 'A quarter circle',
  'arc-remnant': 'What is left after cutting the quarter circle',
}

function CutIcon({ cut, active }: { cut: CutType; active: boolean }) {
  const positionable = isPositionable(cut)
  const { cols, rows } = slotGrid(cut)
  const fill = active ? 'var(--color-accent)' : 'var(--color-muted-2)'
  return (
    <svg viewBox="-0.04 -0.04 1.08 1.08" className="h-8 w-8 shrink-0" aria-hidden="true">
      <rect x="0" y="0" width="1" height="1" fill="var(--color-paper)" stroke="var(--color-line-strong)" strokeWidth="0.03" />
      {positionable ? (
        <>
          <path d={cutPath(cut, { x: 0, y: 0 })} fill={fill} />
          {Array.from({ length: cols - 1 }, (_, i) => (
            <line key={`v${i}`} x1={(i + 1) / cols} y1={0} x2={(i + 1) / cols} y2={1} stroke="var(--color-line-strong)" strokeWidth={0.02} />
          ))}
          {Array.from({ length: rows - 1 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={(i + 1) / rows} x2={1} y2={(i + 1) / rows} stroke="var(--color-line-strong)" strokeWidth={0.02} />
          ))}
        </>
      ) : (
        <path d={cutPath(cut)} fill={fill} />
      )}
    </svg>
  )
}

/** The ten tile cuts. A slim two-column rail beside the canvas on desktop; one scrolling strip on phones. */
function ShapePanel({ activeCut, onSelectCut }: ShapePanelProps) {
  return (
    <aside aria-label="Tile cuts" className="min-w-0 lg:w-[9.5rem] lg:shrink-0">
      <h2 className="mb-2 text-sm font-semibold text-ink">Cut</h2>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0">
        {CUT_TYPES.map((cut, i) => {
          const active = activeCut === cut.id
          return (
            <button
              key={cut.id}
              type="button"
              onClick={() => onSelectCut(cut.id)}
              aria-pressed={active}
              aria-label={`${cut.label}: ${CUT_HINTS[cut.id]}`}
              title={`${CUT_HINTS[cut.id]}${isPositionable(cut.id) ? ' - click where in the tile it goes' : ''}`}
              className={`flex min-h-16 w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-1.5 transition-colors lg:w-auto ${
                active ? 'border-ink bg-paper ring-1 ring-ink' : 'border-line bg-paper hover:border-line-hover'
              } ${i === 0 ? 'lg:col-span-2 lg:flex-row lg:gap-2' : ''}`}
            >
              <CutIcon cut={cut.id} active={active} />
              <span className="whitespace-nowrap text-[0.8125rem] leading-tight text-ink-2">{cut.id === 'full' ? 'Full tile' : cut.label}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export default ShapePanel
