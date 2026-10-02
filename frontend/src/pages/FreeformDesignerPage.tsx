import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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
import type { ReactNode } from 'react'
import type { Swatch } from '../types/swatch'
import type { RugCategory } from '../types/tileDesign'
import { BACKGROUNDS } from '../types/tileDesign'
import type { BackgroundId } from '../types/tileDesign'
import type { FreeformDesignRecord, FreeformDesignState, FreeformShape, SurfaceFinish } from '../types/freeform'
import { FREEFORM_SIZE_LIMITS, createDefaultFreeformDesign, defaultFinish, freeformRecordToState, freeformStateToRecord } from '../types/freeform'
import { FREEFORM_GENERATORS, applyGenerator, findGenerator, findPalette, newShapeId } from '../data/freeformGenerators'
import type { GeneratorId } from '../data/freeformGenerators'
import {
  addShape,
  addStyles,
  duplicateShape,
  moveShape,
  removeShape,
  removeStyle,
  removeVertex,
  reorderShape,
  resizeRug,
  setFinish,
  setSmooth,
  transformShape,
} from '../store/freeformOps'
import type { FreeformTarget } from '../store/freeformOps'
import { useUndoable } from '../store/useUndoable'
import { freeformDesignsApi } from '../services/api'
import { loadSwatchCatalog } from '../components/tileDesigner/tileDesignStorage'
import DesignerHeader from '../components/tileDesigner/DesignerHeader'
import StyleBrowserOverlay from '../components/tileDesigner/StyleBrowserOverlay'
import FreeformCanvas from '../components/freeform/FreeformCanvas'
import type { FreeformTool } from '../components/freeform/FreeformCanvas'
import FreeformToolsPanel, { TOOLS, ToolSwitcher } from '../components/freeform/FreeformToolsPanel'
import UnsavedChangesDialog from '../components/tileDesigner/UnsavedChangesDialog'
import { setLogoutGuard } from '../hooks/useAuth'
import FreeformSidePanel from '../components/freeform/FreeformSidePanel'
import { downloadText, tuftingTemplateSvg } from '../utils/freeformProduction'
import { useToast } from '../components/common/Toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

/** What the setup wizard hands over when it opens the freeform designer. */
export interface FreeformNavState {
  generator?: GeneratorId
  paletteId?: string
  widthFt?: number
  heightFt?: number
  rugCategory?: RugCategory
}

const clampFt = (v: number | undefined, fallback: number) =>
  Math.min(FREEFORM_SIZE_LIMITS.max, Math.max(FREEFORM_SIZE_LIMITS.min, v || fallback))

type ShapeAction = 'smooth' | 'straight' | 'forward' | 'back' | 'duplicate' | 'delete' | 'grow' | 'shrink' | 'rotate-cw' | 'rotate-ccw'

function BarButton({ label, onClick, children, danger, showLabel }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean; showLabel?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11 ${
        danger ? 'text-red-300 hover:bg-red-500/15' : 'text-sand-200 hover:bg-night-700 hover:text-sand-100'
      }`}
    >
      {children}
      {showLabel && <span className="hidden md:inline">{label}</span>}
    </button>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-night-600 bg-night-950 px-1 py-px font-sans text-[10px] text-sand-200">{children}</kbd>
}

function FreeformDesignerPage() {
  useDocumentTitle('Freeform rug designer')
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const nav = (location.state as FreeformNavState | null) ?? {}
  const designId = searchParams.get('design')

  const initial = useMemo(() => {
    const d = createDefaultFreeformDesign(clampFt(nav.widthFt, 5), clampFt(nav.heightFt, 8))
    return nav.rugCategory ? { ...d, rugCategory: nav.rugCategory } : d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const history = useUndoable<FreeformDesignState>(initial)
  const { state } = history

  const [swatches, setSwatches] = useState<Swatch[]>([])
  const [loading, setLoading] = useState(true)
  const [tool, setTool] = useState<FreeformTool>('select')
  const [penSmooth, setPenSmooth] = useState(true)
  const [stamp, setStamp] = useState({ libraryId: 's3-shape-10', size: 1.5, rotation: 0 })
  const startGen = findGenerator(nav.generator) ?? FREEFORM_GENERATORS[0]
  const [generator, setGenerator] = useState({ id: startGen.id, paletteId: nav.paletteId ?? startGen.paletteId, ...startGen.defaults })
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6))
  const [selected, setSelected] = useState<FreeformTarget | null>(null)
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null)
  const [brush, setBrush] = useState<SurfaceFinish>(defaultFinish(''))
  const [zoom, setZoom] = useState(1)
  const [styleBrowserOpen, setStyleBrowserOpen] = useState(false)
  const [myDesigns, setMyDesigns] = useState<FreeformDesignRecord[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [leavePrompt, setLeavePrompt] = useState<{ resolve: (ok: boolean) => void } | null>(null)
  const [leaveStatus, setLeaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  // "Unsaved" = the canvas differs from what was last saved or opened (compared by reference).
  const savedRef = useRef<FreeformDesignState>(initial)
  const dirty = state !== savedRef.current
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const swatchesById = useMemo(() => new Map(swatches.map((s) => [s.id, s])), [swatches])
  const categories = useMemo(() => Array.from(new Set(swatches.flatMap((s) => s.categories))), [swatches])

  function resetTo(next: FreeformDesignState) {
    history.replaceAll(next)
    savedRef.current = next
    setSelected(null)
    setSelectedVertex(null)
  }

  // Catalog first (colours resolve against it), then either the saved design or a fresh layout.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { swatches: catalog } = await loadSwatchCatalog()
      if (cancelled) return
      setSwatches(catalog)
      const fallbackBrush =
        catalog.find((s) => s.familyId === 'tufted-wool' && s.colorName === 'Charcoal')?.id ?? catalog[0]?.id ?? ''
      let opened: FreeformDesignState = initial
      if (designId) {
        const record = await freeformDesignsApi.get(designId).catch(() => null)
        if (cancelled) return
        if (record) opened = freeformRecordToState(record)
        else showToast({ tone: 'error', message: "We couldn't open that design." })
      } else {
        const g = findGenerator(generator.id) ?? FREEFORM_GENERATORS[0]
        const palette = findPalette(generator.paletteId) ?? findPalette(g.paletteId)!
        opened = applyGenerator(initial, g, palette, { seed, density: generator.density, gap: generator.gap, ribbed: generator.ribbed }, catalog)
      }
      resetTo(opened)
      // Start the brush on a colour already in the palette, so the panel and the rug agree.
      setBrush(defaultFinish(brushFor(opened) || fallbackBrush))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designId])

  useEffect(() => {
    freeformDesignsApi
      .mine()
      .then(setMyDesigns)
      .catch(() => {
        // Offline: the list stays empty; saving reports the problem.
      })
  }, [])

  // Keyboard: undo/redo, tool keys (V B P S), Ctrl+D duplicate, [ ] stacking, Delete.
  // Read through a ref so the one listener always sees this render's selection and handlers.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {})
  keyHandler.current = (e: KeyboardEvent) => {
    // Text fields keep their own keys; a dialog on top owns the keyboard.
    if ((e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]') || leavePrompt || styleBrowserOpen) return
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
    const toolKey = TOOLS.find((t) => t.key.toLowerCase() === k)
    if (toolKey) {
      setTool(toolKey.id)
    } else if (selectedShape && (k === ']' || k === '[')) {
      handleShapeAction(k === ']' ? 'forward' : 'back')
    } else if (selectedShape && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      handleDeleteSelection()
    } else if (e.key === 'Escape' && liveSelected) {
      handleSelect(null)
    }
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Leaving with unsaved work: in-app navigation asks; closing the tab gets the browser prompt.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    confirmLeave().then((ok) => (ok ? blocker.proceed() : blocker.reset()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state])
  useEffect(() => {
    setLogoutGuard(confirmLeave)
    return () => setLogoutGuard(null)
  })
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  // The selection disappears when undo/redo removes its shape.
  const liveSelected = selected === 'ground' || state.shapes.some((s) => s.id === selected) ? selected : null
  const selectedShape = liveSelected && liveSelected !== 'ground' ? state.shapes.find((s) => s.id === liveSelected) : undefined
  const editingFinish: SurfaceFinish = liveSelected === 'ground' ? state.ground : (selectedShape ?? brush)

  /** Unsaved work: ask to save, discard or stay. Resolves true when it's fine to move on. */
  function confirmLeave(): Promise<boolean> {
    if (!dirtyRef.current) return Promise.resolve(true)
    setLeaveStatus('idle')
    return new Promise((resolve) => setLeavePrompt({ resolve }))
  }

  function closeLeavePrompt(ok: boolean) {
    if (ok) dirtyRef.current = false
    leavePrompt?.resolve(ok)
    setLeavePrompt(null)
  }

  async function handleLeaveSave() {
    setLeaveStatus('saving')
    try {
      await persist()
      closeLeavePrompt(true)
    } catch {
      setLeaveStatus('error')
    }
  }

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

  async function persist(): Promise<FreeformDesignRecord> {
    const record = freeformStateToRecord(state)
    const saved = state.id ? await freeformDesignsApi.update(state.id, record) : await freeformDesignsApi.create(record)
    const next = freeformRecordToState(saved)
    history.replaceAll(next)
    savedRef.current = next
    dirtyRef.current = false
    setMyDesigns((prev) => (prev.some((d) => d.id === saved.id) ? prev.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...prev]))
    return saved
  }

  async function handleSave() {
    setSaveStatus('saving')
    try {
      await persist()
      setSaveStatus('saved')
      showToast({ tone: 'success', message: 'Rug saved.', durationMs: 2500 })
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveStatus('error')
      showToast({ tone: 'error', message: err instanceof Error ? err.message : "Couldn't save the rug." })
    }
  }

  async function handleContinue() {
    setSaveStatus('saving')
    try {
      const saved = await persist()
      setSaveStatus('idle')
      navigate(`/designer/preview?kind=freeform&design=${saved.id}`)
    } catch (err) {
      setSaveStatus('error')
      showToast({ tone: 'error', message: err instanceof Error ? err.message : "Couldn't save the rug." })
    }
  }

  async function handleLoad(id: string) {
    if (!(await confirmLeave())) return
    const record = await freeformDesignsApi.get(id).catch(() => null)
    if (record) resetTo(freeformRecordToState(record))
    else showToast({ tone: 'error', message: "We couldn't open that design." })
  }

  async function handleDelete() {
    if (!state.id || !window.confirm(`Delete "${state.name}"? This can't be undone.`)) return
    try {
      await freeformDesignsApi.remove(state.id)
    } catch (err) {
      showToast({
        tone: 'error',
        message: err instanceof Error ? `Couldn't delete this rug. ${err.message}` : "Couldn't delete this rug.",
      })
      return
    }
    setMyDesigns((prev) => prev.filter((d) => d.id !== state.id))
    resetTo(createDefaultFreeformDesign(state.widthFt, state.heightFt, state.ground.swatchId))
  }

  async function handleNew() {
    if (!(await confirmLeave())) return
    resetTo(createDefaultFreeformDesign(state.widthFt, state.heightFt, state.ground.swatchId))
  }

  function handleDownloadTemplate() {
    const slug = (state.name || 'freeform-rug').replace(/\s+/g, '-').toLowerCase()
    downloadText(`${slug}-tufting-template.svg`, tuftingTemplateSvg(state, swatchesById), 'image/svg+xml')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-night-950" aria-busy="true" aria-label="Loading the freeform designer">
        <div className="h-14 border-b border-night-700 bg-night-900" />
        <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row">
          <div className="hidden w-64 shrink-0 space-y-3 lg:block">
            <div className="h-4 w-32 animate-pulse rounded bg-night-800" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-night-800" />
              ))}
            </div>
          </div>
          <div className="flex min-h-[520px] flex-1 items-center justify-center rounded-lg border border-night-700 bg-night-900">
            <div className="h-[60%] w-[34%] animate-pulse rounded-sm bg-night-800" />
          </div>
          <div className="hidden w-80 shrink-0 space-y-3 lg:block">
            <div className="h-4 w-24 animate-pulse rounded bg-night-800" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-night-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

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

  return (
    <div className="flex min-h-screen flex-col bg-night-950">
      <DesignerHeader
        name={state.name}
        onRename={(name) => history.commit((s) => (s.name === name ? s : { ...s, name }))}
        onSave={handleSave}
        saveStatus={saveStatus}
        myDesigns={myDesigns.map((d) => ({ id: d.id, name: d.name }))}
        currentId={state.id}
        onLoad={handleLoad}
        onDelete={handleDelete}
        onNew={handleNew}
      />

      <div className="flex flex-1 flex-col gap-6 px-4 py-5 sm:px-6 lg:flex-row lg:gap-5">
        <div className="order-3 lg:order-none">
          <FreeformToolsPanel
            tool={tool}
            penSmooth={penSmooth}
            onPenSmoothChange={setPenSmooth}
            stamp={stamp}
            onStampChange={setStamp}
            generator={generator}
            onGeneratorChange={setGenerator}
            onGenerate={handleGenerate}
          />
        </div>

        {/* The rug comes first on small screens; the panels follow it. */}
        <div className="order-1 flex min-h-[460px] flex-1 flex-col overflow-hidden rounded-lg border border-night-700 bg-night-900 lg:order-none lg:min-h-[560px]">
          <div className="flex flex-wrap items-center gap-2 border-b border-night-700 px-2.5 py-2">
            <ToolSwitcher tool={tool} onToolChange={setTool} />
            <span className="mx-0.5 hidden h-5 w-px bg-night-700 sm:block" />
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
                className="w-12 rounded-md py-1.5 text-center text-xs tabular-nums text-sand-300 transition-colors hover:bg-night-700 hover:text-sand-100"
              >
                {Math.round(zoom * 100)}%
              </button>
              <BarButton label="Zoom in" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(1)))}>
                <MagnifyingGlassPlus size={18} />
              </BarButton>
              <label className="ml-2 flex items-center gap-1.5 text-xs text-sand-300">
                <span className="hidden xl:inline">Floor</span>
                <select
                  value={state.backgroundId}
                  onChange={(e) => history.commit((s) => ({ ...s, backgroundId: e.target.value as BackgroundId }))}
                  aria-label="Floor shown under the rug"
                  className="rounded-md border border-night-600 bg-night-950 px-2 py-1 text-xs text-sand-100"
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

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-night-700 bg-night-950/40 px-3 py-1.5 text-xs text-sand-300" aria-live="polite">
            <p className="min-w-0 flex-1">{toolHint[tool]}</p>
            <p className="shrink-0 tabular-nums text-sand-300/70">
              {state.widthFt}&prime; x {state.heightFt}&prime;, {state.shapes.length} {state.shapes.length === 1 ? 'shape' : 'shapes'}
            </p>
          </div>

          {selectedShape && (
            <div role="toolbar" aria-label="Selected shape" className="flex flex-wrap items-center gap-0.5 border-b border-night-700 bg-night-800/70 px-2.5 py-1">
              <span className="mr-1.5 text-xs font-medium text-gold-300">Shape</span>
              <div role="radiogroup" aria-label="Edges" className="mr-1 flex rounded-md border border-night-600 p-0.5">
                {(['smooth', 'straight'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={(v === 'smooth') === selectedShape.smooth}
                    onClick={() => handleShapeAction(v)}
                    className={`rounded px-2 py-1 text-xs transition-colors pointer-coarse:min-h-11 ${
                      (v === 'smooth') === selectedShape.smooth ? 'bg-night-600 text-sand-100' : 'text-sand-300 hover:text-sand-100'
                    }`}
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

          <div className="relative flex flex-1 flex-col">
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
                <div className="pointer-events-auto flex max-w-md flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-night-600 bg-night-900/95 px-4 py-3 text-center text-sm text-sand-200 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
                  <span>This rug is just ground so far.</span>
                  <button type="button" onClick={() => setTool('pen')} className="font-semibold text-gold-400 hover:text-gold-300">
                    Draw a shape
                  </button>
                  <span className="text-sand-300/60">or</span>
                  <button type="button" onClick={() => setTool('stamp')} className="font-semibold text-gold-400 hover:text-gold-300">
                    stamp one
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="order-2 lg:order-none">
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
            onContinue={handleContinue}
            onDownloadTemplate={handleDownloadTemplate}
            saveStatus={saveStatus}
          />
        </div>
      </div>

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

      {leavePrompt && (
        <UnsavedChangesDialog
          designName={state.name}
          saving={leaveStatus === 'saving'}
          error={leaveStatus === 'error'}
          onSave={handleLeaveSave}
          onDiscard={() => closeLeavePrompt(true)}
          onCancel={() => closeLeavePrompt(false)}
        />
      )}
    </div>
  )
}

/** A sensible starting brush: the most-used shape colour that isn't the ground. */
function brushFor(state: FreeformDesignState): string {
  const counts = new Map<string, number>()
  for (const s of state.shapes) if (s.swatchId !== state.ground.swatchId) counts.set(s.swatchId, (counts.get(s.swatchId) ?? 0) + 1)
  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    state.myStyles.find((id) => id !== state.ground.swatchId) ??
    state.myStyles[0] ??
    ''
  )
}

export default FreeformDesignerPage
