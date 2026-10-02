import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Trash, Plus } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import { swatchBackground } from '../../types/swatch'

const DRAG_THRESHOLD_PX = 6

type MyStylesPanelProps = {
  myStyles: string[]
  swatchesById: Map<string, Swatch>
  activeBrush: string | null
  onSelectBrush: (id: string) => void
  onRemove: (id: string) => void
  onAddMore: () => void
  onStartDrag: (id: string) => void
  /** How to use the chips here; the tile designer's grid wording is the default. */
  hint?: string
}

const GRID_HINT = 'Click a style to select it, or drag it onto the grid to place it.'

function StyleChip({
  swatch,
  active,
  onSelectBrush,
  onRemove,
  onStartDrag,
  hint,
}: {
  hint: string
  swatch: Swatch
  active: boolean
  onSelectBrush: () => void
  onRemove: () => void
  onStartDrag: () => void
}) {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)

  function handlePointerDown(e: ReactPointerEvent) {
    if (e.button !== 0) return
    startRef.current = { x: e.clientX, y: e.clientY }
    draggingRef.current = false
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!startRef.current || draggingRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      draggingRef.current = true
      onStartDrag()
    }
  }

  function handlePointerUp() {
    if (!draggingRef.current) onSelectBrush()
    startRef.current = null
    draggingRef.current = false
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`flex w-full cursor-grab flex-col items-center gap-1 rounded-md border-2 p-1.5 transition-colors active:cursor-grabbing ${
          active ? 'border-gold-500 bg-night-800' : 'border-night-700 bg-night-900 hover:border-night-500'
        }`}
        aria-pressed={active}
        title={`${swatch.familyName} - ${swatch.colorName}. ${hint}`}
      >
        <span
          className="h-12 w-full shrink-0 rounded-sm border border-black/20"
          style={swatchBackground(swatch)}
        />
        <span className="w-full truncate text-center text-[11px] text-sand-300">{swatch.colorName}</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${swatch.colorName}`}
        className="absolute -right-1.5 -top-1.5 rounded-full border border-night-600 bg-night-900 p-0.5 text-sand-400 opacity-0 shadow-sm transition-opacity hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:-right-2.5 pointer-coarse:-top-2.5 pointer-coarse:p-1.5 pointer-coarse:opacity-100"
      >
        <Trash size={12} />
      </button>
    </div>
  )
}

function MyStylesPanel({
  myStyles,
  swatchesById,
  activeBrush,
  onSelectBrush,
  onRemove,
  onAddMore,
  onStartDrag,
  hint = GRID_HINT,
}: MyStylesPanelProps) {
  return (
    <section aria-labelledby="my-styles-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="my-styles-heading" className="font-display text-sm tracking-wide text-sand-200">
          My Styles
        </h2>
        <button
          type="button"
          onClick={onAddMore}
          className="inline-flex items-center gap-1 text-xs font-medium text-gold-400 transition-colors pointer-coarse:min-h-11 hover:text-gold-300"
        >
          <Plus size={13} /> Add More
        </button>
      </div>

      {myStyles.length === 0 ? (
        <p className="rounded-md border border-dashed border-night-600 px-3 py-4 text-center text-xs text-sand-300/70">
          No styles yet. Add a style to start painting the grid.
        </p>
      ) : (
        <>
          <p className="text-xs text-sand-300/70">{hint}</p>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
            {myStyles.map((id) => {
              const swatch = swatchesById.get(id)
              if (!swatch) return null
              return (
                <li key={id}>
                  <StyleChip
                    swatch={swatch}
                    active={activeBrush === id}
                    onSelectBrush={() => onSelectBrush(id)}
                    onRemove={() => onRemove(id)}
                    onStartDrag={() => onStartDrag(id)}
                    hint={hint}
                  />
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

export default MyStylesPanel
