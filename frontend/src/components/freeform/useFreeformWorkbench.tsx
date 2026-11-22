import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowArcLeft,
  ArrowArcRight,
  ArrowDown,
  ArrowUp,
  ArrowsClockwise,
  ArrowsCounterClockwise,
  ArrowsIn,
  ArrowsOut,
  Copy,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  TrashSimple,
} from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import { BACKGROUNDS } from '../../types/tileDesign'
import type { BackgroundId } from '../../types/tileDesign'
import type { FreeformDesignState, FreeformShape, SurfaceFinish } from '../../types/freeform'
import { defaultFinish } from '../../types/freeform'
import { FREEFORM_GENERATORS, applyGenerator, findGenerator, findPalette, newShapeId } from '../../data/freeformGenerators'
import type { GeneratorId } from '../../data/freeformGenerators'
import { addShape, addStyles, duplicateShape, moveShape, removeShape, removeStyle, removeVertex, reorderShape, resizeRug, setFinish, setSmooth, transformShape } from '../../store/freeformOps'
import type { FreeformTarget } from '../../store/freeformOps'
import StyleBrowserOverlay from '../tileDesigner/StyleBrowserOverlay'
import FreeformCanvas from './FreeformCanvas'
import type { FreeformTool } from './FreeformCanvas'
import FreeformToolsPanel, { TOOLS, ToolSwitcher } from './FreeformToolsPanel'
import type { GeneratorSettings } from './FreeformToolsPanel'
import FreeformSidePanel from './FreeformSidePanel'
import ShortcutSheet from '../ui/ShortcutSheet'
import type { ShortcutGroup } from '../ui/ShortcutSheet'
import { downloadText, tuftingTemplateSvg } from '../../utils/freeformProduction'
import { useProGate } from '../../hooks/usePlan'
import { useToast } from '../common/Toast'
import type { SaveStatus } from '../../hooks/useDesignPersistence'

/** The undo history the workbench edits through: the freeform page's own, or a studio rug's shape layer. */
export interface FreeformHistory {
  state: FreeformDesignState
  commit: (edit: (s: FreeformDesignState) => FreeformDesignState) => void
  begin: () => void
  live: (edit: (s: FreeformDesignState) => FreeformDesignState) => void
  end: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

type ShapeAction = 'smooth' | 'straight' | 'forward' | 'back' | 'duplicate' | 'delete' | 'grow' | 'shrink' | 'rotate-cw' | 'rotate-ccw'

export function BarButton({ label, onClick, children, danger, showLabel }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean; showLabel?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 min-h-9 min-w-9 justify-center rounded-md px-2 text-[0.8125rem] transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11 ${
        danger ? 'text-danger hover:bg-accent-soft' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
      }`}
    >
      {children}
      {showLabel && <span className="hidden md:inline">{label}</span>}
    </button>
  )
}

export const FREEFORM_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Tools',
    items: [
      ...TOOLS.map((t) => ({ keys: [t.key.toUpperCase()], label: t.label })),
      { keys: ['Enter'], label: 'Finish the shape you are drawing' },
      { keys: ['Esc'], label: 'Cancel or clear the selection' },
    ],
  },
  {
    title: 'Selected shape',
    items: [
      { keys: ['←', '↑', '→', '↓'], label: 'Nudge' },
      { keys: [']'], label: 'Bring forward' },
      { keys: ['['], label: 'Send back' },
      { keys: ['Mod', 'D'], label: 'Duplicate' },
      { keys: ['Delete'], label: 'Delete' },
    ],
  },
  {
    title: 'Editing',
    items: [
      { keys: ['Mod', 'Z'], label: 'Undo' },
      { keys: ['Mod', 'Y'], label: 'Redo' },
      { keys: ['?'], label: 'Show these shortcuts' },
    ],
  },
]

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line-strong bg-paper px-1 py-px font-sans text-[0.8125rem] text-ink-2">{children}</kbd>
}

/** A sensible starting brush: the most-used shape colour that isn't the ground. */
export function brushFor(state: FreeformDesignState): string {
  const counts = new Map<string, number>()
  for (const s of state.shapes) if (s.swatchId !== state.ground.swatchId) counts.set(s.swatchId, (counts.get(s.swatchId) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? state.myStyles.find((id) => id !== state.ground.swatchId) ?? state.myStyles[0] ?? ''
}

/**
 * The freeform (hand-tufted) drawing editor, without a page around it: tools, canvas, the
 * colours-and-finish panel, and their dialogs, over any `FreeformHistory`. The freeform page
 * and the studio's tufted and hooked rugs both host it.
 */
export function useFreeformWorkbench({
  history,
  swatches,
  initialGenerator,
  blocked = false,
  toolbarStart,
  stage,
  onContinue,
  saveStatus,
  embedded = false,
}: {
  history: FreeformHistory
  swatches: Swatch[]
  initialGenerator?: { id?: GeneratorId; paletteId?: string }
  /** Another dialog owns the keyboard (the leave-page prompt). */
  blocked?: boolean
  /** Extra controls at the start of the canvas toolbar (the page's 2D/3D toggle). */
  toolbarStart?: ReactNode
  /** Shown in place of the canvas when set (the page's 3D view). */
  stage?: ReactNode
  onContinue: () => void
  saveStatus: SaveStatus
  /** Hosted in the studio: its panel leaves the room button to the studio. */
  embedded?: boolean
}) {
  const { state } = history
  const requirePro = useProGate()
  const { showToast } = useToast()
  const [tool, setTool] = useState<FreeformTool>('select')
  const [penSmooth, setPenSmooth] = useState(true)
  const [stamp, setStamp] = useState({ libraryId: 's3-shape-10', size: 1.5, rotation: 0 })
  const startGen = findGenerator(initialGenerator?.id) ?? FREEFORM_GENERATORS[0]
  const [generator, setGenerator] = useState<GeneratorSettings>({ id: startGen.id, paletteId: initialGenerator?.paletteId ?? startGen.paletteId, ...startGen.defaults })
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6))
  const [selected, setSelected] = useState<FreeformTarget | null>(null)
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null)
  const [brush, setBrush] = useState<SurfaceFinish>(() => defaultFinish(brushFor(state)))
  const [zoom, setZoom] = useState(1)
  const [styleBrowserOpen, setStyleBrowserOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const swatchesById = useMemo(() => new Map(swatches.map((s) => [s.id, s])), [swatches])
  const categories = useMemo(() => Array.from(new Set(swatches.flatMap((s) => s.categories))), [swatches])

  // The selection disappears when undo/redo removes its shape.
  const liveSelected = selected === 'ground' || state.shapes.some((s) => s.id === selected) ? selected : null
  const selectedShape = liveSelected && liveSelected !== 'ground' ? state.shapes.find((s) => s.id === liveSelected) : undefined
  const editingFinish: SurfaceFinish = liveSelected === 'ground' ? state.ground : (selectedShape ?? brush)

  function handleFinishChange(patch: Partial<SurfaceFinish>) {
    setBrush((b) => ({ ...b, ...patch }))
    if (liveSelected) history.commit((s) => setFinish(s, liveSelected, patch))
  }
  function handleSelect(target: FreeformTarget | null, vertex: number | null = null) {
    setSelected(target)
    setSelectedVertex(vertex)
  }
  function handleAddShape(shape: FreeformShape) {
    history.commit((s) => addShape(s, shape))
    if (tool === 'pen') {
      setSelected(shape.id)
      setSelectedVertex(null)
    }
  }
  function handleDeleteSelection() {
    if (!selectedShape) return
    if (selectedVertex !== null && selectedShape.points.length > 3) {
      history.commit((s) => removeVertex(s, selectedShape.id, selectedVertex))
      setSelectedVertex(null)
    } else {
      history.commit((s) => removeShape(s, selectedShape.id))
      setSelected(null)
      setSelectedVertex(null)
    }
  }
  function handleShapeAction(action: ShapeAction) {
    if (!selectedShape) return
    const id = selectedShape.id
    switch (action) {
      case 'smooth':
      case 'straight':
        return history.commit((s) => setSmooth(s, id, action === 'smooth'))
      case 'forward':
        return history.commit((s) => reorderShape(s, id, 1))
      case 'back':
        return history.commit((s) => reorderShape(s, id, -1))
      case 'grow':
        return history.commit((s) => transformShape(s, id, 1.1, 0))
      case 'shrink':
        return history.commit((s) => transformShape(s, id, 1 / 1.1, 0))
      case 'rotate-cw':
        return history.commit((s) => transformShape(s, id, 1, 15))
      case 'rotate-ccw':
        return history.commit((s) => transformShape(s, id, 1, -15))
      case 'duplicate': {
        const copy = newShapeId()
        history.commit((s) => duplicateShape(s, id, copy))
        return setSelected(copy)
      }
      case 'delete':
        history.commit((s) => removeShape(s, id))
        return setSelected(null)
    }
  }
  function handleGenerate(shuffle: boolean) {
    const g = findGenerator(generator.id)
    const palette = findPalette(generator.paletteId)
    if (!g || !palette) return
    const nextSeed = shuffle ? Math.floor(Math.random() * 1e6) : seed
    setSeed(nextSeed)
    const next = applyGenerator(state, g, palette, { seed: nextSeed, density: generator.density, gap: generator.gap, ribbed: generator.ribbed }, swatches)
    history.commit(() => next)
    setBrush((b) => ({ ...b, swatchId: brushFor(next) || b.swatchId }))
    setSelected(null)
  }
  function handleDownloadTemplate() {
    if (!requirePro('Tufting templates')) return
    const slug = (state.name || 'freeform-rug').replace(/\s+/g, '-').toLowerCase()
    downloadText(`${slug}-tufting-template.svg`, tuftingTemplateSvg(state, swatchesById), 'image/svg+xml')
  }

  // Keyboard: undo/redo, tool keys (V B P S), Ctrl+D duplicate, [ ] stacking, Delete.
  // Read through a ref so the one listener always sees this render's selection and handlers.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]') || blocked || styleBrowserOpen || shortcutsOpen) return
      const k = e.key.toLowerCase()
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault()
          history.undo()
        } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
          e.preventDefault()
          history.redo()
        } else if (k === 'd' && selectedShape) {
          e.preventDefault()
          handleShapeAction('duplicate')
        }
        return
      }
      if (e.altKey || e.defaultPrevented) return
      if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }
      const toolKey = TOOLS.find((t) => t.key.toLowerCase() === k)
      if (toolKey) setTool(toolKey.id)
      else if (selectedShape && (k === ']' || k === '[')) handleShapeAction(k === ']' ? 'forward' : 'back')
      else if (selectedShape && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        handleDeleteSelection()
      } else if (e.key === 'Escape' && liveSelected) handleSelect(null)
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const selectionHint = selectedShape
    ? 'Drag to move. Drag a point to reshape; click a faint dot between points to add one.'
    : liveSelected === 'ground'
      ? 'Ground selected. Pick a colour or finish on the right to change it.'
      : null
  const toolHint: Record<FreeformTool, ReactNode> = {
    select: selectionHint ?? 'Click a shape to edit it, or click the bare ground to change the background.',
    paint: 'Click any shape, or the ground, to give it the current colour and finish.',
    pen: (
      <>
        Click to drop points. Click the first point, double-click or press <Kbd>Enter</Kbd> to finish. <Kbd>Esc</Kbd> cancels.
      </>
    ),
    stamp: 'Click the rug to place the shape. Pick the shape, size and rotation on the left.',
  }

  const tools = <FreeformToolsPanel tool={tool} penSmooth={penSmooth} onPenSmoothChange={setPenSmooth} stamp={stamp} onStampChange={setStamp} generator={generator} onGeneratorChange={setGenerator} onGenerate={handleGenerate} />

  const canvas = (
    <div className="flex min-h-[460px] min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper lg:min-h-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-2.5 py-2">
        {toolbarStart}
        <ToolSwitcher tool={tool} onToolChange={setTool} />
        <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
        <div className="flex items-center">
          <BarButton label="Undo (Ctrl+Z)" onClick={history.undo}>
            <ArrowArcLeft size={18} className={history.canUndo ? '' : 'opacity-30'} />
          </BarButton>
          <BarButton label="Redo (Ctrl+Y)" onClick={history.redo}>
            <ArrowArcRight size={18} className={history.canRedo ? '' : 'opacity-30'} />
          </BarButton>
        </div>
        <div className="ml-auto flex items-center">
          <BarButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(1)))}>
            <MagnifyingGlassMinus size={18} />
          </BarButton>
          <button
            type="button"
            onClick={() => setZoom(1)}
            title="Fit the rug (reset zoom)"
            className="min-h-9 w-14 rounded-md text-center text-[0.8125rem] tabular-nums text-ink-2 transition-colors pointer-coarse:min-h-11 hover:bg-surface-2 hover:text-ink"
          >
            {Math.round(zoom * 100)}%
          </button>
          <BarButton label="Zoom in" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(1)))}>
            <MagnifyingGlassPlus size={18} />
          </BarButton>
          <label className="ml-2 flex items-center gap-1.5 text-[0.8125rem] text-muted">
            <span className="hidden sm:inline">Floor</span>
            <select
              value={state.backgroundId}
              onChange={(e) => history.commit((s) => ({ ...s, backgroundId: e.target.value as BackgroundId }))}
              aria-label="Floor shown under the rug"
              className="min-h-9 rounded-md border border-line-strong bg-paper px-2 text-[0.8125rem] text-ink pointer-coarse:min-h-11"
            >
              {BACKGROUNDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-paper/40 px-3 py-1.5 text-[0.8125rem] text-muted" aria-live="polite">
        <p className="min-w-0 flex-1">{toolHint[tool]}</p>
        <p className="shrink-0 tabular-nums text-muted-2">
          {state.widthFt}&prime; x {state.heightFt}&prime;, {state.shapes.length} {state.shapes.length === 1 ? 'shape' : 'shapes'}
        </p>
      </div>

      {selectedShape && (
        <div role="toolbar" aria-label="Selected shape" className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-2/70 px-2.5 py-1">
          <span className="mr-1.5 text-[0.8125rem] font-medium text-accent-deep">Shape</span>
          <div role="radiogroup" aria-label="Edges" className="mr-1 flex rounded-md border border-line-strong p-0.5">
            {(['smooth', 'straight'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={(v === 'smooth') === selectedShape.smooth}
                onClick={() => handleShapeAction(v)}
                className={`rounded px-2 py-1 text-[0.8125rem] transition-colors pointer-coarse:min-h-11 ${(v === 'smooth') === selectedShape.smooth ? 'bg-line-strong text-ink' : 'text-muted hover:text-ink'}`}
              >
                {v === 'smooth' ? 'Curved' : 'Straight'}
              </button>
            ))}
          </div>
          <BarButton label="Bring forward" onClick={() => handleShapeAction('forward')} showLabel>
            <ArrowUp size={16} />
          </BarButton>
          <BarButton label="Send back" onClick={() => handleShapeAction('back')} showLabel>
            <ArrowDown size={16} />
          </BarButton>
          <BarButton label="Larger" onClick={() => handleShapeAction('grow')}>
            <ArrowsOut size={16} />
          </BarButton>
          <BarButton label="Smaller" onClick={() => handleShapeAction('shrink')}>
            <ArrowsIn size={16} />
          </BarButton>
          <BarButton label="Rotate left" onClick={() => handleShapeAction('rotate-ccw')}>
            <ArrowsCounterClockwise size={16} />
          </BarButton>
          <BarButton label="Rotate right" onClick={() => handleShapeAction('rotate-cw')}>
            <ArrowsClockwise size={16} />
          </BarButton>
          <BarButton label="Duplicate (Ctrl+D)" onClick={() => handleShapeAction('duplicate')}>
            <Copy size={16} />
          </BarButton>
          <span className="ml-auto" />
          <BarButton label="Delete" onClick={() => handleShapeAction('delete')} danger showLabel>
            <TrashSimple size={16} />
          </BarButton>
        </div>
      )}

      {stage}
      <div className="relative flex flex-1 flex-col" hidden={!!stage}>
        <FreeformCanvas
          state={state}
          swatchesById={swatchesById}
          tool={tool}
          zoom={zoom}
          brush={brush}
          penSmooth={penSmooth}
          stamp={stamp}
          selected={liveSelected}
          selectedVertex={selectedVertex}
          onSelect={handleSelect}
          onPaint={(target) => history.commit((s) => setFinish(s, target, brush))}
          onAddShape={handleAddShape}
          onDeleteSelection={handleDeleteSelection}
          onNudge={(dx, dy) => selectedShape && history.commit((s) => moveShape(s, selectedShape.id, dx, dy))}
          begin={history.begin}
          live={history.live}
          end={history.end}
        />
        {state.shapes.length === 0 && tool !== 'pen' && tool !== 'stamp' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
            <div className="pointer-events-auto flex max-w-md flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-line-strong bg-paper/95 px-4 py-3 text-center text-sm text-ink-2 shadow-[var(--shadow-soft)]">
              <span>This rug is just ground so far.</span>
              <button type="button" onClick={() => setTool('pen')} className="font-semibold text-accent-hover hover:text-accent-deep">
                Draw a shape
              </button>
              <span className="text-muted-2">or</span>
              <button type="button" onClick={() => setTool('stamp')} className="font-semibold text-accent-hover hover:text-accent-deep">
                stamp one
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const side = (
    <FreeformSidePanel
      state={state}
      swatchesById={swatchesById}
      selected={liveSelected}
      finish={editingFinish}
      onFinishChange={handleFinishChange}
      onRemoveStyle={(id) => {
        const next = removeStyle(state, id)
        if (next === state) showToast({ tone: 'info', message: 'That colour is still on the rug. Repaint those areas first.' })
        else history.commit(() => next)
      }}
      onAddMoreStyles={() => setStyleBrowserOpen(true)}
      onSelectGround={() => handleSelect('ground')}
      onDeselect={() => handleSelect(null)}
      onResize={(w, h) => history.commit((s) => resizeRug(s, w, h))}
      onContinue={onContinue}
      onDownloadTemplate={handleDownloadTemplate}
      saveStatus={saveStatus}
      embedded={embedded}
    />
  )

  const overlays = (
    <>
      {styleBrowserOpen && (
        <StyleBrowserOverlay
          swatches={swatches}
          categories={categories}
          onClose={() => setStyleBrowserOpen(false)}
          onAddSelected={(ids) => {
            history.commit((s) => addStyles(s, ids))
            if (ids[0]) handleFinishChange({ swatchId: ids[0] })
          }}
        />
      )}
      {shortcutsOpen && <ShortcutSheet groups={FREEFORM_SHORTCUTS} onClose={() => setShortcutsOpen(false)} />}
    </>
  )

  return {
    tools,
    canvas,
    side,
    overlays,
    generator,
    seed,
    showShortcuts: () => setShortcutsOpen(true),
    /** After a design is opened or reset: no selection, and a brush in a colour the rug uses. */
    reset: (next: FreeformDesignState, fallbackBrush = '') => {
      setSelected(null)
      setSelectedVertex(null)
      setBrush(defaultFinish(brushFor(next) || fallbackBrush))
    },
  }
}
