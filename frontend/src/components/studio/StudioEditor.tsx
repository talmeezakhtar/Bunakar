import { Suspense, lazy, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowArcLeft, ArrowArcRight, ArrowDown, ArrowRight, ArrowUp, Eye, EyeSlash, HandGrabbing, ImageSquare, Plus, Trash, X } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import { formatFeetInches } from '../../types/tileDesign'
import DesignerHeader from '../tileDesigner/DesignerHeader'
import RealisticRug from '../ui/RealisticRug'
import FabricChip from '../ui/FabricChip'
import { FIBRES, MATERIALS } from '../../data/materials'
import type { FeelTarget } from '../fabric/FabricDrawer'
import { useDesignPersistence } from '../../hooks/useDesignPersistence'
import { rugDesignsApi } from '../../services/api'
import { Stroke, useStudioHistory } from '../../studio/history'
import { copyRegion, flipPatch, repeatPositions, rotatePatch, stampCells } from '../../studio/chartOps'
import type { Patch, RepeatKind, Symmetry } from '../../studio/chartOps'
import ChartCanvas from './ChartCanvas'
import type { ChartCanvasHandle, ChartTool, Selection } from './ChartCanvas'
import { StampPicker, ToolOptions, ToolStrip, YarnStrip } from './ChartTools'
import { TOOLS } from './toolList'
import LayoutPanel, { Slider } from './LayoutPanel'
import { remapLayout, withLayout } from '../../studio/layout'
import { catalogueStamper, motifPatch } from '../../studio/motifStamp'
import { getMotif } from '../../data/motifs/catalogue'
import { PRESETS, mergePreset } from '../../studio/presets'
import ShortcutSheet from '../ui/ShortcutSheet'
import type { ShortcutGroup } from '../ui/ShortcutSheet'
import type { RugPreset } from '../../studio/presets'
import { docArt, paletteRgb } from '../../studio/compose'
import { docToDraft, draftToDoc } from '../../studio/compress'
import type { DraftDoc } from '../../studio/compress'
import type { ChartLayer, Fibre, Finish, Layer, LayoutSpec, RugDoc, RugShapeKind, ShapeLayer, TileLayer, Yarn } from '../../studio/model'
import { CONSTRUCTIONS, chartSize, emptyChart, newId, newRug, usedSwatches } from '../../studio/model'
import type { PhotoChartResult } from '../../studio/photoChart'
import { docToRecord, recordToDoc } from '../../studio/records'
import type { RugSource } from '../../three/rug/rugSource'
import { canShow3D } from '../../three/canShow3D'

const RugPreview3D = lazy(() => import('../../three/rug/RugPreview3D'))
const PhotoImport = lazy(() => import('./PhotoImport'))
const FabricDrawer = lazy(() => import('../fabric/FabricDrawer'))
import ShapeWorkbench from './ShapeWorkbench'
import TileWorkbench from './TileWorkbench'
import RugSizeControls from './RugSizeControls'
import BraidPanel from './BraidPanel'
import ProductionPanel from './ProductionPanel'
import { withBraid } from '../../studio/braid'
import { resizeRug } from '../../studio/resize'
import { compositeChart, findSlits, fixSlits, maxSlitRows } from '../../studio/weaveRules'
import type { FlatweaveTechnique } from '../../studio/model'

/** A saved studio rug as the persistence hook sees it: list entries are names only; opened ones carry the rug. */
type LoadedRug = { id: string; name: string; updatedAt?: string; doc?: RugDoc }

type View = 'chart' | 'woven' | '3d'
type Tab = 'rug' | 'layout' | 'yarns' | 'layers' | 'shapes' | 'tiles' | 'braid'

const CHARTED = new Set(['knotted', 'flatweave', 'needlepoint'])
/** Drawn with the freeform shape editor. */
const SHAPED = new Set(['tufted', 'hooked'])

async function loadRug(id: string): Promise<LoadedRug | null> {
  const record = await rugDesignsApi.get(id).catch(() => null)
  if (!record) return null
  return { id: record.id, name: record.name, updatedAt: record.updatedAt, doc: await recordToDoc(record) }
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-4 last:border-b-0">
      <h3 className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-muted">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

/** Piles a knotted yarn can take. */
const PILE_LABEL: Record<string, string> = { cut: 'Cut pile', highlow: 'Raised pile', shag: 'Shag', loop: 'Loop' }

const small = 'min-h-10 rounded-lg border border-line-strong bg-surface px-3 text-[0.9rem] text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none'
const iconBtn = 'inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30'

/** The composed rug drawn flat (charts crisp, one pixel per knot), fitted to its box. */
function FlatRug({ doc, swatchesById }: { doc: RugDoc; swatchesById: Map<string, Swatch> }) {
  const prefix = `flat${useId().replace(/:/g, '')}`
  const art = useMemo(() => docArt(doc, swatchesById), [doc, swatchesById])
  return (
    <svg viewBox={`0 0 ${art.width} ${art.height}`} className="h-full max-h-full w-full max-w-full drop-shadow-[0_18px_30px_rgba(31,27,22,0.35)]" role="img" aria-label={`${doc.name}, flat view`}>
      {art.render(prefix)}
    </svg>
  )
}

const TIP_KEY = 'bunakar_studio_tip'

/** A note the first time the chart editor opens: where things are. Dismissed once, for good. */
function FirstRunTip() {
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(TIP_KEY)
    } catch {
      return false
    }
  })
  if (!show) return null
  const close = () => {
    setShow(false)
    try {
      localStorage.setItem(TIP_KEY, '1')
    } catch {
      // storage blocked: it just shows again next time
    }
  }
  return (
    // Clicks pass through to the chart beneath, except on the button.
    <div role="note" className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 max-w-sm rounded-2xl bg-ink/90 p-4 text-sm leading-relaxed text-paper shadow-[var(--shadow-soft)] backdrop-blur sm:right-auto">
      <p className="font-semibold">Welcome to the Studio</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-paper/85">
        <li>Draw with the tools beside the chart: each square is one knot.</li>
        <li>
          The <b>Layout</b> tab has borders, twenty classic styles and photo to chart.
        </li>
        <li>Save, or see it woven and in a room, from the bar at the top.</li>
      </ul>
      <button type="button" onClick={close} className="pointer-events-auto mt-3 min-h-10 rounded-full bg-paper px-4 font-semibold text-ink hover:bg-white">
        Got it
      </button>
    </div>
  )
}

/** The knot-chart editor's keys, for the "?" sheet. */
const CHART_SHORTCUTS: ShortcutGroup[] = [
  { title: 'Tools', items: TOOLS.map((t) => ({ keys: t.key.split('+'), label: t.label })) },
  {
    title: 'Yarns and view',
    items: [
      { keys: ['1–9'], label: 'Pick yarn 1 to 9' },
      { keys: ['+'], label: 'Zoom in' },
      { keys: ['-'], label: 'Zoom out' },
      { keys: ['0'], label: 'Fit the rug to the screen' },
      { keys: ['Space'], label: 'Hold and drag to move the view' },
    ],
  },
  {
    title: 'Drawing with the keyboard',
    items: [
      { keys: ['←', '→', '↑', '↓'], label: 'Move the cursor (Shift: 10 knots)' },
      { keys: ['Enter'], label: 'Knot the cursor square' },
      { keys: ['Esc'], label: 'Drop the selection, paste or stamp' },
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

export default function StudioEditor({
  initial,
  swatches,
  canRestoreDraft,
  startWith,
}: {
  initial: RugDoc
  swatches: Swatch[]
  canRestoreDraft: boolean
  /** A new rug's first step, picked before the Studio opened: a classic style (by id) or a photo. */
  startWith?: { style?: string; photo?: boolean }
}) {
  const swatchesById = useMemo(() => new Map(swatches.map((s) => [s.id, s])), [swatches])
  const history = useStudioHistory(initial)
  const { doc } = history
  const [view, setView] = useState<View>(initial.construction === 'braided' ? 'woven' : 'chart')
  const [tab, setTab] = useState<Tab>(SHAPED.has(initial.construction) ? 'shapes' : initial.construction === 'tiles' ? 'tiles' : initial.construction === 'braided' ? 'braid' : 'rug')
  const [sideEl, setSideEl] = useState<HTMLElement | null>(null)
  const [adding, setAdding] = useState(false)
  const [feel, setFeel] = useState<(FeelTarget & { index: number }) | null>(null)
  // A fibre chip being hovered or focused: previewed in its yarn's swatch before it's picked.
  const [peek, setPeek] = useState<{ index: number; fibre: Fibre } | null>(null)
  const show3D = useMemo(() => canShow3D(), [])
  // Chart editing.
  const [tool, setTool] = useState<ChartTool>('pencil')
  const [brushSize, setBrushSize] = useState(1)
  const [symmetry, setSymmetry] = useState<Symmetry>('none')
  const [yarn, setYarn] = useState(1)
  const [selection, setSelection] = useState<Selection>(null)
  const [paste, setPaste] = useState<Patch | null>(null)
  const [stamp, setStamp] = useState<{ motifId: string; sizeIn: number } | null>(null)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [showSlits, setShowSlits] = useState(false)
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const chartRef = useRef<ChartCanvasHandle>(null)

  const persistence = useDesignPersistence<RugDoc, LoadedRug>({
    kind: 'studio',
    state: doc,
    replaceAll: history.replaceAll,
    initial,
    idOf: (d) => d.id,
    nameOf: (d) => d.name,
    save: async (d) => {
      const record = await docToRecord(d)
      const saved = d.id ? await rugDesignsApi.update(d.id, record) : await rugDesignsApi.create(record)
      return { id: saved.id, name: saved.name, updatedAt: saved.updatedAt, doc: { ...d, id: saved.id, name: saved.name } }
    },
    fromRecord: (r) => r.doc ?? initial,
    remove: (id) => rugDesignsApi.remove(id),
    list: async () => (await rugDesignsApi.summaries()).map((s) => ({ id: s.id, name: s.name })),
    previewPath: (r) => `/designer/preview?kind=studio&design=${r.id}`,
    canRestoreDraft,
    toDraft: (d) => docToDraft(d),
    fromDraft: (d) => draftToDoc(d as DraftDoc),
  })

  const shapeLayer = doc.layers.find((l): l is ShapeLayer => l.kind === 'shapes')
  const usesShapes = SHAPED.has(doc.construction) && !!shapeLayer
  const tileLayer = doc.layers.find((l): l is TileLayer => l.kind === 'tiles')
  const usesTiles = doc.construction === 'tiles' && !!tileLayer
  // A hosted editor (shapes, tiles) owns the keyboard while its drawing view shows.
  const hosted = (usesShapes || usesTiles) && view === 'chart'

  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Keyboard: tools, yarns, zoom, undo and redo; "?" lists them all.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (hosted || persistence.leaveOpen || (e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]')) return
      const mod = e.metaKey || e.ctrlKey
      if (!mod && !e.altKey && e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }
      if (!mod && !e.altKey && view === 'chart') {
        const k = e.key
        const t = TOOLS.find((x) => (x.key.startsWith('Shift+') ? e.shiftKey && k.toUpperCase() === x.key.slice(6) : !e.shiftKey && k.toUpperCase() === x.key))
        if (t) {
          e.preventDefault()
          setTool(t.id)
          return
        }
        if (/^[1-9]$/.test(k) && Number(k) <= doc.palette.length) {
          setYarn(Number(k))
          return
        }
        if (k === '+' || k === '=') return chartRef.current?.zoomBy(1.25)
        if (k === '-') return chartRef.current?.zoomBy(0.8)
        if (k === '0') return chartRef.current?.fit()
        if (k === 'Escape') {
          setPaste(null)
          setStamp(null)
          setSelection(null)
          return
        }
      }
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        history.undo()
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault()
        history.redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [history, persistence.leaveOpen, view, doc.palette.length, hosted])

  const source = useMemo<RugSource>(() => ({ kind: 'doc', doc, swatchesById }), [doc, swatchesById])
  const rgb = useMemo(() => paletteRgb(doc, swatchesById), [doc, swatchesById])
  const chartLayers = doc.layers.filter((l): l is ChartLayer => l.kind === 'chart')
  // The layer being drawn on: the chosen one, else the top chart.
  const activeChart = chartLayers.find((l) => l.id === activeLayerId) ?? chartLayers[chartLayers.length - 1] ?? null

  /** One undoable edit of the active chart, written in place through a stroke. */
  function editChart(edit: (layer: ChartLayer, stroke: Stroke) => void) {
    if (!activeChart) return
    const stroke = new Stroke(activeChart.id)
    edit(activeChart, stroke)
    history.endStroke(stroke)
    history.touch()
  }
  const selBox = selection && {
    c0: Math.min(selection.a.c, selection.b.c),
    r0: Math.min(selection.a.r, selection.b.r),
    c1: Math.max(selection.a.c, selection.b.c),
    r1: Math.max(selection.a.r, selection.b.r),
  }
  const selectedPatch = () => (activeChart && selection ? copyRegion(activeChart.cells, activeChart.cols, selection.a, selection.b) : null)
  /** Replace the selection's knots with a transformed copy, anchored at its top-left. */
  function transformSelection(fn: (p: Patch) => Patch) {
    const p = selectedPatch()
    if (!p || !selBox) return
    const next = fn(p)
    editChart((layer, stroke) => {
      for (let r = selBox.r0; r <= selBox.r1; r++) for (let c = selBox.c0; c <= selBox.c1; c++) stroke.set(layer, r * layer.cols + c, 0)
      for (const { index, value } of stampCells({ ...next, cells: next.cells.map((v) => v) }, { c: selBox.c0, r: selBox.r0 }, layer.cols, layer.rows)) stroke.set(layer, index, value)
    })
    setSelection({ a: { c: selBox.c0, r: selBox.r0 }, b: { c: Math.min(activeChart!.cols - 1, selBox.c0 + next.cols - 1), r: Math.min(activeChart!.rows - 1, selBox.r0 + next.rows - 1) } })
  }
  function repeatSelection(kind: RepeatKind) {
    const p = selectedPatch()
    if (!p || !activeChart) return
    editChart((layer, stroke) => {
      const box = { c0: selBox!.c0, r0: selBox!.r0, c1: layer.cols - 1, r1: layer.rows - 1 }
      // Tile from the selection outward across the whole rug, both ways.
      const start = { c0: box.c0 - Math.ceil(box.c0 / p.cols) * p.cols, r0: box.r0 - Math.ceil(box.r0 / p.rows) * p.rows, c1: box.c1, r1: box.r1 }
      for (const at of repeatPositions(p, start, kind)) for (const { index, value } of stampCells(p, at, layer.cols, layer.rows)) stroke.set(layer, index, value)
    })
  }
  const used = useMemo(() => usedSwatches(doc), [doc])
  const construction = CONSTRUCTIONS.find((c) => c.id === doc.construction)
  const charted = CHARTED.has(doc.construction)
  const knots = doc.layers.reduce((n, l) => (l.kind === 'chart' && l.visible ? Math.max(n, l.cols * l.rows) : n), 0)
  const fresh = () => newRug({ construction: doc.construction, shape: doc.shape, widthFt: doc.widthFt, heightFt: doc.heightFt, density: doc.density, palette: doc.palette, rugCategory: doc.rugCategory })

  const setFinish = (patch: Partial<Finish>) => history.commit((d) => ({ ...d, finish: { ...d.finish, ...patch } }))
  const setLayers = (edit: (layers: Layer[]) => Layer[]) => history.commit((d) => ({ ...d, layers: edit(d.layers) }))
  const hexes = (d: RugDoc) => d.palette.map((y) => swatchesById.get(y.swatchId)?.swatchColor ?? '#888888')
  const applyLayout = (spec: LayoutSpec | null) => history.commit((d) => withLayout(d, spec, catalogueStamper(hexes(d))))
  const applyPreset = (p: RugPreset) =>
    history.commit((d) => {
      const merged = mergePreset(d, p)
      return withLayout(merged.doc, merged.layout, catalogueStamper(hexes(merged.doc)))
    })
  // Once, as the rug opens: apply the style picked on the home page, or open the photo import.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || !startWith || !charted) return
    started.current = true
    const preset = PRESETS.find((p) => p.id === startWith.style)
    if (preset) {
      applyPreset(preset)
      setTab('layout')
    } else if (startWith.photo) {
      setTab('layout')
      setPhotoOpen(true)
    }
    // Runs once for the rug it opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  /** Choose a motif to stamp (or stop): it becomes the patch you click to place, in the rug's yarns. */
  function pickStamp(next: { motifId: string; sizeIn: number } | null) {
    setStamp(next)
    const spec = next && getMotif(next.motifId)
    if (!next || !spec) return setPaste(null)
    const w = Math.max(2, Math.round(next.sizeIn * doc.density.across))
    const h = Math.max(2, Math.round((next.sizeIn / spec.aspect) * doc.density.down))
    setPaste(motifPatch(next.motifId, 'piece', w, h, hexes(doc), doc.layout?.field ?? 1))
  }
  /** A chart made from a photo: its yarns join the palette and it goes on top as a new layer. */
  function addPhotoChart(res: PhotoChartResult) {
    history.commit((d) => {
      const palette = [...d.palette]
      const index = res.swatchIds.map((id) => {
        let i = palette.findIndex((y) => y.swatchId === id)
        if (i < 0 && palette.length < 255) {
          palette.push({ swatchId: id, fibre: swatchesById.get(id)?.fibre ?? 'wool' })
          i = palette.length - 1
        }
        return Math.max(0, i) + 1
      })
      const cells = res.cells.map((v) => (v ? index[v - 1] : 0))
      const layer: ChartLayer = { kind: 'chart', id: newId(), name: 'From a photo', visible: true, cols: res.cols, rows: res.rows, cells }
      return { ...d, palette, layers: [...d.layers, layer] }
    })
    setActiveLayerId(null)
    setPhotoOpen(false)
    setView('chart')
    requestAnimationFrame(() => chartRef.current?.fit())
  }
  // Kilims: long slits where colours meet in a straight vertical line.
  const slitRows = maxSlitRows(doc.density.down)
  const slits = useMemo(() => {
    if (doc.construction !== 'flatweave' || (doc.flatweave ?? 'kilim') !== 'kilim') return []
    const flat = compositeChart(doc)
    return flat ? findSlits(flat.cells, flat.cols, flat.rows, slitRows) : []
  }, [doc, slitRows])
  function stepTheEdges() {
    const flat = compositeChart(doc)
    if (!flat) return
    const { changes } = fixSlits(flat.cells, flat.cols, flat.rows, slitRows)
    editChart((layer, stroke) => {
      for (const { index, value } of changes) stroke.set(layer, index, value)
    })
  }
  const tabs: Tab[] = charted ? ['rug', 'layout', 'yarns', 'layers'] : usesShapes ? ['shapes', 'rug', 'layers'] : usesTiles ? ['tiles', 'rug', 'layers'] : doc.construction === 'braided' ? ['braid', 'rug', 'yarns', 'layers'] : ['rug', 'yarns', 'layers']

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-surface lg:h-[calc(100dvh-4rem)]">
      <DesignerHeader
        name={doc.name}
        onRename={(name) => history.commit((d) => ({ ...d, name }))}
        onSave={persistence.handleSave}
        saveStatus={persistence.saveStatus}
        myDesigns={persistence.myDesigns.map((d) => ({ id: d.id, name: d.name }))}
        currentId={doc.id}
        onLoad={(id) => persistence.handleLoad(id, loadRug)}
        onDelete={() => persistence.handleDelete(fresh())}
        onNew={() => persistence.handleNew(fresh())}
        signedIn={persistence.signedIn}
        dirty={persistence.dirty}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Canvas */}
        <div className="flex min-h-[26rem] min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper px-3 py-2">
            <div className="flex items-center gap-1">
              <button type="button" className={iconBtn} onClick={history.undo} disabled={!history.canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)">
                <ArrowArcLeft size={18} />
              </button>
              <button type="button" className={iconBtn} onClick={history.redo} disabled={!history.canRedo} aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)">
                <ArrowArcRight size={18} />
              </button>
            </div>
            <div role="radiogroup" aria-label="View" className="inline-flex rounded-full border border-line-strong bg-surface p-1">
              {(['chart', 'woven', '3d'] as const)
                .filter((v) => v !== '3d' || show3D)
                .map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={view === v}
                    onClick={() => setView(v)}
                    className={`min-h-9 rounded-full px-3.5 text-[0.875rem] font-medium transition-colors ${view === v ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}
                  >
                    {v === 'chart' ? (charted ? 'Chart' : usesShapes ? 'Draw' : usesTiles ? 'Tiles' : 'Flat') : v === 'woven' ? 'Woven' : '3D'}
                  </button>
                ))}
            </div>
          </div>
          <div className={`relative flex min-h-[60svh] flex-1 items-center justify-center overflow-hidden lg:min-h-0 bg-[radial-gradient(90%_80%_at_50%_30%,#fbf8f2_0%,#ece5d8_70%,#e2dacb_100%)] ${view === 'chart' && charted ? '' : 'p-6'}`}>
            {view === 'chart' && !(charted && activeChart) && !usesShapes && !usesTiles && <FlatRug doc={doc} swatchesById={swatchesById} />}
            {view === 'chart' && charted && <FirstRunTip />}
            {usesTiles && tileLayer && (
              <TileWorkbench
                doc={doc}
                layer={tileLayer}
                history={history}
                swatches={swatches}
                active={view === 'chart'}
                blocked={persistence.leaveOpen}
                sideTarget={tab === 'tiles' ? sideEl : null}
                onContinue={persistence.handleContinue}
                saveStatus={persistence.saveStatus}
              />
            )}
            {usesShapes && shapeLayer && (
              <ShapeWorkbench
                doc={doc}
                layer={shapeLayer}
                history={history}
                swatches={swatches}
                active={view === 'chart'}
                blocked={persistence.leaveOpen}
                sideTarget={tab === 'shapes' ? sideEl : null}
                onContinue={persistence.handleContinue}
                saveStatus={persistence.saveStatus}
              />
            )}
            {view === 'chart' && charted && activeChart && (
              <div className="absolute inset-0 flex">
                <ToolStrip tool={tool} onTool={setTool} onFit={() => chartRef.current?.fit()} onZoom={(k) => chartRef.current?.zoomBy(k)} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="relative z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-paper/80 px-3 py-2 backdrop-blur">
                    <ToolOptions
                      tool={tool}
                      brushSize={brushSize}
                      onBrushSize={setBrushSize}
                      symmetry={symmetry}
                      onSymmetry={setSymmetry}
                      hasSelection={!!selection}
                      pasting={!!paste}
                      onCopy={() => {
                        const p = selectedPatch()
                        if (p) setPaste(p)
                      }}
                      onFlip={(axis) => transformSelection((p) => flipPatch(p, axis))}
                      onRotate={() => transformSelection(rotatePatch)}
                      onRepeat={repeatSelection}
                      onClear={() =>
                        selBox &&
                        editChart((layer, stroke) => {
                          for (let r = selBox.r0; r <= selBox.r1; r++) for (let c = selBox.c0; c <= selBox.c1; c++) stroke.set(layer, r * layer.cols + c, 0)
                        })
                      }
                      onDeselect={() => setSelection(null)}
                    />
                    <StampPicker
                        motifId={stamp?.motifId ?? null}
                        sizeIn={stamp?.sizeIn ?? 12}
                        maxIn={Math.round(doc.widthFt * 12)}
                        palette={hexes(doc)}
                        onPick={(id) => pickStamp(id ? { motifId: id, sizeIn: stamp?.sizeIn ?? Math.max(4, Math.round(doc.widthFt * 3)) } : null)}
                        onSize={(n) => stamp && pickStamp({ ...stamp, sizeIn: n })}
                      />
                  </div>
                  <div className="min-h-0 flex-1">
                    <ChartCanvas
                      ref={chartRef}
                      doc={doc}
                      layer={activeChart}
                      rgb={rgb}
                      tool={tool}
                      brushSize={brushSize}
                      symmetry={symmetry}
                      yarn={Math.min(yarn, Math.max(1, doc.palette.length))}
                      selection={selection}
                      paste={paste}
                      marks={showSlits ? slits : undefined}
                      onPick={setYarn}
                      onSelect={setSelection}
                      onStamped={() => undefined}
                      onStroke={(stroke) => {
                        history.endStroke(stroke)
                        history.touch()
                      }}
                    />
                  </div>
                  <YarnStrip palette={doc.palette} swatchesById={swatchesById} yarn={yarn} onYarn={setYarn} />
                </div>
              </div>
            )}
            {view === 'woven' && <RealisticRug source={source} longPx={900} eager alt={`${doc.name}, woven`} className="h-full w-full" />}
            {view === '3d' && (
              <div className="absolute inset-0">
                <Suspense fallback={<div className="flex h-full items-center justify-center text-muted">Loading 3D…</div>}>
                  <RugPreview3D source={source} />
                </Suspense>
              </div>
            )}
          </div>
        </div>

        {/* Inspector */}
        <aside aria-label="Inspector" className="flex w-full shrink-0 flex-col border-t border-line bg-paper lg:w-[22rem] lg:border-l lg:border-t-0">
          <div role="tablist" aria-label="Inspector sections" className={`grid border-b border-line bg-paper max-lg:sticky max-lg:top-16 max-lg:z-10 ${tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`min-h-12 border-b-2 text-[0.95rem] font-medium capitalize transition-colors ${tab === t ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {(tab === 'shapes' || tab === 'tiles') && <div ref={setSideEl} className="[&>*]:w-full [&>*]:border-0" />}
            {tab === 'rug' && (
              <>
                <Panel title="Construction">
                  <p className="font-semibold text-ink">{construction?.name}</p>
                  <p className="text-[0.875rem] text-muted">{construction?.hint}</p>
                </Panel>
                <Panel title="Shape and size">
                  <label className="block text-sm text-ink-2">
                    Shape
                    <select
                      className={`${small} mt-1 block w-full`}
                      value={doc.shape.kind}
                      onChange={(e) =>
                        history.commit((d) => {
                          const kind = e.target.value as RugShapeKind
                          const next = { ...d, shape: { kind } }
                          // Round and octagonal rugs are as wide as they are long: square up at the shorter side.
                          if ((kind === 'round' || kind === 'octagon') && d.widthFt !== d.heightFt && CHARTED.has(d.construction)) {
                            const side = Math.min(d.widthFt, d.heightFt)
                            return resizeRug(next, side, side, 'keep', catalogueStamper(hexes(next)))
                          }
                          if (next.braid) return withBraid(next, next.braid)
                          // The layout's borders follow the outline, so redraw it for the new shape.
                          return next.layout ? withLayout(next, next.layout, catalogueStamper(hexes(next))) : next
                        })
                      }
                    >
                      <option value="rect">Rectangle</option>
                      <option value="round">Round</option>
                      <option value="oval">Oval</option>
                      <option value="octagon">Octagon</option>
                    </select>
                  </label>
                  <p className="text-[0.95rem] text-ink">
                    {formatFeetInches(doc.widthFt)} x {formatFeetInches(doc.heightFt)}
                    {charted && (
                      <span className="block text-[0.875rem] text-muted">
                        {doc.density.across} × {doc.density.down} per inch · {knots.toLocaleString()} {doc.construction === 'knotted' ? 'knots' : 'cells'}
                      </span>
                    )}
                  </p>
                  {(charted || doc.braid) && (
                    <RugSizeControls
                      key={`${doc.widthFt}x${doc.heightFt}`}
                      widthFt={doc.widthFt}
                      heightFt={doc.heightFt}
                      charted={charted}
                      square={doc.shape.kind === 'round' || doc.shape.kind === 'octagon'}
                      onApply={(w, h, mode) => history.commit((d) => resizeRug(d, w, h, mode, catalogueStamper(hexes(d))))}
                    />
                  )}
                </Panel>
                {doc.construction === 'flatweave' && (
                  <Panel title="Weave">
                    <label className="block text-sm text-ink-2">
                      Technique
                      <select className={`${small} mt-1 block w-full`} value={doc.flatweave ?? 'kilim'} onChange={(e) => history.commit((d) => ({ ...d, flatweave: e.target.value as FlatweaveTechnique }))}>
                        <option value="kilim">Kilim (slit tapestry)</option>
                        <option value="soumak">Soumak (wrapped wefts)</option>
                        <option value="dhurrie">Dhurrie (interlocked)</option>
                      </select>
                    </label>
                    {(doc.flatweave ?? 'kilim') === 'kilim' ? (
                      slits.length === 0 ? (
                        <p className="text-[0.875rem] text-ink-2">No long slits: every colour edge steps within ¾ inch.</p>
                      ) : (
                        <>
                          <p className="rounded-lg bg-saffron/20 px-3 py-2 text-[0.875rem] text-ink">
                            {slits.length} {slits.length === 1 ? 'place where' : 'places where'} two colours meet in a straight line longer than ¾ inch. A kilim leaves a slit there, which weakens the rug.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className={`${small} inline-flex items-center`} aria-pressed={showSlits} onClick={() => setShowSlits((v) => !v)}>
                              {showSlits ? 'Hide on the chart' : 'Show on the chart'}
                            </button>
                            <button type="button" className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-[0.875rem] font-medium text-paper hover:bg-ink-2" onClick={stepTheEdges}>
                              Step the edges
                            </button>
                          </div>
                          <p className="text-[0.8125rem] text-muted">Stepping moves the edge one knot across every ¾ inch, as weavers do. Or choose a dhurrie, whose interlocked wefts leave no slits.</p>
                        </>
                      )
                    ) : (
                      <p className="text-[0.875rem] text-ink-2">{doc.flatweave === 'soumak' ? 'Soumak wraps its wefts round the warps, so colour edges leave no slits.' : 'Dhurrie wefts interlock where colours meet, so there are no slits.'}</p>
                    )}
                  </Panel>
                )}
                <Panel title="Finish">
                  <label className="block text-sm text-ink-2">
                    Ends
                    <select className={`${small} mt-1 block w-full`} value={doc.finish.edges} onChange={(e) => setFinish({ edges: e.target.value as Finish['edges'] })}>
                      <option value="fringe">Fringe</option>
                      <option value="binding">Bound edge</option>
                      <option value="kilim-end">Kilim end</option>
                    </select>
                  </label>
                  {(['abrash', 'wash'] as const).map((k) => (
                    <Slider
                      key={k}
                      name={k === 'abrash' ? 'Abrash (dye banding)' : 'Antique wash'}
                      value={Math.round(doc.finish[k] * 100)}
                      min={0}
                      max={100}
                      step={5}
                      unit="%"
                      onCommit={(v) => setFinish({ [k]: v / 100 })}
                    />
                  ))}
                  {doc.construction === 'knotted' && (
                    <label className="flex items-center gap-2 text-sm text-ink-2">
                      <input type="checkbox" checked={!!doc.finish.carve} onChange={(e) => setFinish({ carve: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
                      Carve the outlines (pile cut lower where colours meet)
                    </label>
                  )}
                  <p className="text-[0.8125rem] text-muted">See them in the Woven and 3D views.</p>
                </Panel>
                {charted && <ProductionPanel doc={doc} swatchesById={swatchesById} />}
              </>
            )}

            {tab === 'braid' && <BraidPanel doc={doc} swatchesById={swatchesById} onBraid={(spec) => history.commit((d) => withBraid(d, spec))} />}
            {tab === 'layout' && charted && <LayoutPanel doc={doc} swatchesById={swatchesById} onLayout={applyLayout} onPreset={applyPreset} onPhoto={() => setPhotoOpen(true)} />}

            {tab === 'yarns' && (
              <Panel title={`Yarns (${doc.palette.length})`}>
                <ul className="space-y-3">
                  {doc.palette.map((y, i) => {
                    const sw = swatchesById.get(y.swatchId)
                    const name = sw?.colorName ?? y.swatchId
                    const hex = sw?.swatchColor ?? '#cccccc'
                    const flat = doc.construction === 'flatweave'
                    const shown = peek?.index === i ? peek.fibre : y.fibre
                    const m = MATERIALS[shown] ?? MATERIALS.wool
                    const inUse = used.has(y.swatchId)
                    const setYarn = (patch: Partial<Yarn>) => history.commit((d) => ({ ...d, palette: d.palette.map((p, j) => (j === i ? { ...p, ...patch } : p)) }))
                    return (
                      <li key={`${y.swatchId}-${i}`} className="overflow-hidden rounded-xl border border-line bg-surface">
                        {/* The yarn as the fabric it is: big enough to see its pile and shine. */}
                        <button
                          type="button"
                          onClick={() => setFeel({ index: i, hex, name, fibre: y.fibre, pile: y.pile, flat })}
                          aria-label={`${name} in ${m.name}: feel it up close`}
                          className="group relative block h-20 w-full overflow-hidden text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                        >
                          <FabricChip hex={hex} fibre={shown} pile={y.pile} flat={flat} px={384} knots={22} className="absolute inset-0 h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
                          <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,16,12,0.62)_0%,rgba(20,16,12,0.18)_55%,transparent_100%)]" />
                          <span className="relative flex h-full flex-col justify-end px-3 pb-2.5 text-white">
                            <span className="truncate text-[0.95rem] font-medium leading-tight">{name}</span>
                            <span className="truncate text-[0.8125rem] text-white/80">
                              {m.name}
                              {y.pile && y.pile !== 'cut' ? ` · ${PILE_LABEL[y.pile] ?? y.pile}` : ''}
                            </span>
                          </span>
                          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[0.75rem] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            <HandGrabbing size={13} /> Feel it
                          </span>
                        </button>
                        <div className="flex items-center gap-2 px-2.5 py-2.5">
                          <div role="radiogroup" aria-label={`Fibre for ${name}`} className="flex flex-1 gap-1">
                            {FIBRES.map((f) => (
                              <button
                                key={f}
                                type="button"
                                role="radio"
                                aria-checked={y.fibre === f}
                                aria-label={MATERIALS[f].name}
                                title={MATERIALS[f].name}
                                onClick={() => y.fibre !== f && setYarn({ fibre: f })}
                                onPointerEnter={() => setPeek({ index: i, fibre: f })}
                                onPointerLeave={() => setPeek(null)}
                                onFocus={() => setPeek({ index: i, fibre: f })}
                                onBlur={() => setPeek(null)}
                                className={`h-9 w-9 shrink-0 overflow-hidden rounded-md transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-y-0 ${y.fibre === f ? 'shadow-[0_0_0_2px_var(--color-paper),0_0_0_4px_var(--color-ink)]' : 'ring-1 ring-black/10'}`}
                              >
                                <FabricChip hex={hex} fibre={f} pile={y.pile} flat={flat} size={36} className="h-full w-full" />
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            className={iconBtn}
                            disabled={inUse}
                            title={inUse ? 'In use in the rug' : 'Remove'}
                            aria-label={`Remove ${name}`}
                            // Charts store palette positions, so a removed yarn's later yarns shift down.
                            onClick={() =>
                              history.commit((d) => ({
                                ...d,
                                palette: d.palette.filter((_, j) => j !== i),
                                layers: d.layers.map((l) => (l.kind === 'chart' ? { ...l, cells: l.cells.map((v) => (v > i + 1 ? v - 1 : v)) } : l)),
                                layout: d.layout && remapLayout(d.layout, (v) => (v > i + 1 ? v - 1 : v === i + 1 ? 1 : v)),
                              }))
                            }
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                        {doc.construction === 'knotted' && (
                          <div className="flex items-center gap-2 border-t border-line px-3 py-2 text-[0.8125rem] text-muted">
                            <label htmlFor={`pile-${i}`}>Pile</label>
                            <select
                              id={`pile-${i}`}
                              className="min-h-8 flex-1 rounded-md border border-line-strong bg-paper px-1.5 text-ink"
                              value={y.pile ?? 'cut'}
                              onChange={(e) => setYarn({ pile: e.target.value as Yarn['pile'] })}
                            >
                              {Object.entries(PILE_LABEL).map(([v, label]) => (
                                <option key={v} value={v}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {doc.palette.length < 255 && (
                  <button type="button" className={`${small} inline-flex items-center gap-1.5`} onClick={() => setAdding(true)}>
                    <Plus size={14} /> Add a yarn
                  </button>
                )}
                {adding && (
                  <div className="rounded-xl border border-line bg-surface p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-ink">Catalogue</p>
                      <button type="button" className={iconBtn} onClick={() => setAdding(false)} aria-label="Close the catalogue">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {swatches
                        .filter((s) => !doc.palette.some((y) => y.swatchId === s.id))
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            title={`${s.familyName} - ${s.colorName}`}
                            aria-label={`Add ${s.familyName} ${s.colorName}`}
                            onClick={() => history.commit((d) => ({ ...d, palette: [...d.palette, { swatchId: s.id, fibre: s.fibre ?? 'wool' }] }))}
                            className="aspect-square overflow-hidden rounded-md ring-1 ring-black/10 transition-transform hover:scale-110"
                            style={s.imageUrl ? { backgroundColor: s.swatchColor, backgroundImage: `url(${s.imageUrl})`, backgroundSize: 'cover' } : undefined}
                          >
                            {!s.imageUrl && <FabricChip hex={s.swatchColor} fibre={s.fibre} flat={doc.construction === 'flatweave'} size={40} className="h-full w-full" />}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {tab === 'layers' && (
              <Panel title="Layers, top first">
                <ul className="space-y-1.5">
                  {[...doc.layers].reverse().map((layer) => {
                    const i = doc.layers.indexOf(layer)
                    return (
                      <li key={layer.id} className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1">
                        <button
                          type="button"
                          className={iconBtn}
                          aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                          onClick={() => setLayers((ls) => ls.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l)))}
                        >
                          {layer.visible ? <Eye size={17} /> : <EyeSlash size={17} />}
                        </button>
                        <button
                          type="button"
                          disabled={layer.kind !== 'chart'}
                          onClick={() => setActiveLayerId(layer.id)}
                          aria-pressed={layer.kind === 'chart' && activeChart?.id === layer.id}
                          className={`min-w-0 flex-1 truncate rounded-md px-1.5 py-1 text-left text-[0.95rem] text-ink ${layer.kind === 'chart' && activeChart?.id === layer.id ? 'bg-accent-soft/70 font-medium' : ''}`}
                        >
                          {layer.name} <span className="text-[0.8125rem] text-muted">· {layer.kind === 'chart' && activeChart?.id === layer.id ? 'drawing here' : layer.kind}</span>
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          aria-label={`Move ${layer.name} up`}
                          disabled={i === doc.layers.length - 1}
                          onClick={() => setLayers((ls) => {
                            const next = [...ls]
                            ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                            return next
                          })}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          aria-label={`Move ${layer.name} down`}
                          disabled={i === 0}
                          onClick={() => setLayers((ls) => {
                            const next = [...ls]
                            ;[next[i], next[i - 1]] = [next[i - 1], next[i]]
                            return next
                          })}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          aria-label={`Delete ${layer.name}`}
                          disabled={doc.layers.length === 1}
                          onClick={() => setLayers((ls) => ls.filter((l) => l.id !== layer.id))}
                        >
                          <Trash size={15} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {charted && (
                  <button
                    type="button"
                    className={`${small} inline-flex items-center gap-1.5`}
                    onClick={() => setLayers((ls) => [...ls, emptyChart(doc.widthFt, doc.heightFt, doc.density, 0, `Chart ${ls.filter((l) => l.kind === 'chart').length + 1}`)])}
                  >
                    <Plus size={14} /> Add a chart layer
                  </button>
                )}
                {charted && (
                  <button type="button" className={`${small} inline-flex items-center gap-1.5`} onClick={() => setPhotoOpen(true)}>
                    <ImageSquare size={14} /> Chart from a photo
                  </button>
                )}
              </Panel>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            <div className="min-w-0">
              <p className="font-display text-2xl font-semibold leading-none text-ink tabular-nums">
                {formatFeetInches(doc.widthFt)} x {formatFeetInches(doc.heightFt)}
              </p>
              <p className="mt-1 truncate text-[0.8125rem] text-muted" aria-live="polite">
                {used.size} {used.size === 1 ? 'yarn' : 'yarns'} in use{charted ? ` · ${knots.toLocaleString()} ${doc.construction === 'knotted' ? 'knots' : 'cells'}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={persistence.handleContinue}
              disabled={persistence.saveStatus === 'saving'}
              className="group inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-full bg-accent px-5 font-semibold text-paper transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {persistence.saveStatus === 'saving' ? 'Saving…' : 'See it in a room'}
              {persistence.saveStatus !== 'saving' && <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </div>
        </aside>
      </div>
      {persistence.leaveDialog}
      {feel && (
        <Suspense fallback={null}>
          <FabricDrawer
            target={feel}
            onClose={() => setFeel(null)}
            onUseFibre={(f) => {
              history.commit((d) => ({ ...d, palette: d.palette.map((p, j) => (j === feel.index ? { ...p, fibre: f } : p)) }))
              setFeel({ ...feel, fibre: f })
            }}
          />
        </Suspense>
      )}
      {shortcutsOpen && <ShortcutSheet groups={CHART_SHORTCUTS} onClose={() => setShortcutsOpen(false)} />}
      {photoOpen && (
        <Suspense fallback={null}>
          <PhotoImport
            {...chartSize(doc.widthFt, doc.heightFt, doc.density)}
            swatches={swatches}
            paletteSwatchIds={doc.palette.map((y) => y.swatchId)}
            onDone={addPhotoChart}
            onClose={() => setPhotoOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}
