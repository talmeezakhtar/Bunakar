import { Suspense, lazy, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CaretLeft, CaretRight, DownloadSimple, PencilSimple, ShareNetwork } from '@phosphor-icons/react'
import type { RugCategory, TileDesignRecord } from '../types/tileDesign'
import { formatFeetInches, formatRugSize, recordToState } from '../types/tileDesign'
import { freeformRecordToState } from '../types/freeform'
import type { FreeformDesignRecord } from '../types/freeform'
import { roomPhotosForDesign } from '../data/roomPhotos'
import RugRoomCarousel from '../components/tileDesigner/RugRoomCarousel'
import type { RugArt } from '../components/tileDesigner/RugPhotoSlide'
import { patternPrefix, renderTileFills } from '../components/tileDesigner/renderTiles'
// Saved designs can carry motifs: load the motif renderer with this page.
import '../components/tileDesigner/renderOverlays'
import { renderFreeform } from '../components/freeform/renderFreeform'
import { loadSwatchCatalog } from '../components/tileDesigner/tileDesignStorage'
import { freeformDesignsApi, tileDesignsApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { FREE_LIMITS, usePlan } from '../hooks/usePlan'
import { freePlanImage } from '../utils/planImage'
import { useToast } from '../components/common/Toast'
import { readDraft } from '../hooks/useDesignPersistence'
import { COLORWAYS, applyTemplate, findColorway, findTemplate } from '../data/patternTemplates'
import { createDefaultTileDesign, feetToTiles } from '../types/tileDesign'
import type { TileDesignState } from '../types/tileDesign'
import type { FreeformDesignState } from '../types/freeform'
import PageMeta from '../components/common/PageMeta'
import { canShow3D } from '../three/canShow3D'
import { rugDesignsApi } from '../services/api'
import type { RugDoc } from '../studio/model'
import { docArt } from '../studio/compose'
import { draftToDoc } from '../studio/compress'
import type { DraftDoc } from '../studio/compress'
import { recordToDoc } from '../studio/records'
import { roomsFor } from '../three/rooms/rooms'
import type { RoomViewerHandle } from '../three/rooms/RoomViewer3D'
import type { RugSource } from '../three/rug/rugSource'

// three.js and the room models load only when someone opens the 3D rooms.
const RoomViewer3D = lazy(() => import('../three/rooms/RoomViewer3D'))

type Status = 'loading' | 'ready' | 'not-found'

/** What the page needs from either kind of design: tile (modular) or freeform (hand-tufted). */
type PreviewDesign = {
  name: string
  rugCategory: RugCategory
  sizeLabel: string
  rug: RugArt
  /** The viewer owns it, so "Back to Editing" makes sense; a shared link's visitor doesn't. */
  canEdit: boolean
  /** Shown from this browser's draft, not the server: nothing to share a link to yet. */
  local?: boolean
  /** The design itself, for the 3D rooms. */
  source: RugSource
}

/** Pixels along the exported rug image's longer side. */
const EXPORT_LONG_SIDE = 2400

function parseRoomIndex(raw: string | null): number {
  if (!raw) return 0
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function RoomPreviewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const designId = searchParams.get('design')
  // `?draft=tile|freeform`: preview the design kept in this browser (guests, or the server is down).
  const draftParam = searchParams.get('draft')
  const draftKind = draftParam === 'tile' || draftParam === 'freeform' || draftParam === 'studio' ? draftParam : null
  const isFreeform = searchParams.get('kind') === 'freeform' || draftKind === 'freeform'
  const isStudio = searchParams.get('kind') === 'studio' || draftKind === 'studio'
  const editorPath = isStudio ? '/studio' : isFreeform ? '/freeform' : '/designer'
  // `?template=<id>&colorway=<id>&w=<ft>&h=<ft>`: one of the pattern templates, before any design exists.
  const templateParam = findTemplate(searchParams.get('template') ?? undefined)
  const templateOpts = { colorway: searchParams.get('colorway'), w: searchParams.get('w'), h: searchParams.get('h') }
  const templateKey = `${templateOpts.colorway}|${templateOpts.w}|${templateOpts.h}`
  const { user } = useAuth()
  const { isPro } = usePlan()
  const signedIn = !!user

  const [status, setStatus] = useState<Status>(designId || draftKind || templateParam ? 'loading' : 'not-found')
  const [design, setDesign] = useState<PreviewDesign | null>(null)
  const [exporting, setExporting] = useState(false)
  const [slideIndexState, setSlideIndexState] = useState(() => parseRoomIndex(searchParams.get('room')))
  const rugSvgRef = useRef<SVGSVGElement>(null)
  // Photo rooms or 3D rooms; which 3D room. Both live in the URL so shared links keep them.
  // 3D rooms wherever the device can show them; the photo rooms are the fallback.
  const [has3D] = useState(canShow3D)
  const view: 'photo' | '3d' = has3D ? '3d' : 'photo'
  const viewer = useRef<RoomViewerHandle>(null)
  function setParam(key: string, value: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set(key, value)
        return params
      },
      { replace: true },
    )
  }
  const exportPrefix = patternPrefix(useId())

  // The room choice lives in the URL (not just component state) so it survives a "Back to
  // Editing" -> "Continue" round-trip, a page refresh, and travels along with a shared link.
  function handleSlideIndexChange(next: number) {
    setSlideIndexState(next)
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('room', String(next))
        return params
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (!designId && !draftKind && !templateParam) return
    let cancelled = false
    const loadPreview = async (): Promise<PreviewDesign | null> => {
      const catalog = await loadSwatchCatalog()
      const swatchesById = new Map(catalog.swatches.map((s) => [s.id, s]))
      const studioPreview = (doc: RugDoc, canEdit: boolean, local?: boolean): PreviewDesign => ({
        name: doc.name,
        rugCategory: doc.rugCategory,
        sizeLabel: `${formatFeetInches(doc.widthFt)} x ${formatFeetInches(doc.heightFt)}`,
        rug: docArt(doc, swatchesById),
        canEdit,
        local,
        source: { kind: 'doc', doc, swatchesById },
      })
      if (draftKind === 'studio') {
        const draft = readDraft<DraftDoc>('studio')?.state
        return draft ? studioPreview(draftToDoc(draft), true, true) : null
      }
      if (isStudio && designId) {
        const owned = signedIn ? await rugDesignsApi.get(designId).catch(() => null) : null
        const record = owned ?? (await rugDesignsApi.getPublic(designId).catch(() => null))
        return record ? studioPreview(await recordToDoc(record), !!owned) : null
      }
      if (draftKind === 'freeform') {
        const state = readDraft<FreeformDesignState>('freeform')?.state
        if (!state) return null
        return {
          name: state.name,
          rugCategory: state.rugCategory,
          sizeLabel: `${formatFeetInches(state.widthFt)} x ${formatFeetInches(state.heightFt)}`,
          rug: { width: state.widthFt, height: state.heightFt, render: (p) => renderFreeform(state, swatchesById, p) },
          canEdit: true,
          local: true,
          source: { kind: 'freeform', state, swatchesById },
        }
      }
      if (draftKind === 'tile') {
        const state = readDraft<TileDesignState>('tile')?.state
        if (!state) return null
        return {
          name: state.name,
          rugCategory: state.rugCategory,
          sizeLabel: formatRugSize(state.widthTiles, state.heightTiles),
          rug: { width: state.widthTiles, height: state.heightTiles, render: (p) => renderTileFills(state, swatchesById, p) },
          canEdit: true,
          local: true,
          source: { kind: 'tile', state, swatchesById },
        }
      }
      if (templateParam && !draftKind && !designId) {
        const colorway = findColorway(templateOpts.colorway ?? templateParam.colorwayId) ?? COLORWAYS[0]
        const w = feetToTiles(Number(templateOpts.w) || 6)
        const h = feetToTiles(Number(templateOpts.h) || 9)
        const state = { ...applyTemplate(createDefaultTileDesign(w, h), templateParam, colorway, catalog.swatches), name: `${templateParam.name}, ${colorway.name}` }
        return {
          name: state.name,
          rugCategory: state.rugCategory,
          sizeLabel: formatRugSize(state.widthTiles, state.heightTiles),
          rug: { width: state.widthTiles, height: state.heightTiles, render: (p) => renderTileFills(state, swatchesById, p) },
          canEdit: false,
          local: true,
          source: { kind: 'tile', state, swatchesById },
        }
      }
      if (!designId) return null
      // The owner's own read first (it proves they can edit), then the public read-only view.
      const api = isFreeform ? freeformDesignsApi : tileDesignsApi
      const owned = signedIn ? await api.get(designId).catch(() => null) : null
      const record = owned ?? (await api.getPublic(designId).catch(() => null))
      if (!record) return null
      if (isFreeform) {
        const state = freeformRecordToState(record as FreeformDesignRecord)
        return {
          name: state.name,
          rugCategory: state.rugCategory,
          sizeLabel: `${formatFeetInches(state.widthFt)} x ${formatFeetInches(state.heightFt)}`,
          rug: { width: state.widthFt, height: state.heightFt, render: (p) => renderFreeform(state, swatchesById, p) },
          canEdit: !!owned,
          source: { kind: 'freeform', state, swatchesById },
        }
      }
      const state = recordToState(record as TileDesignRecord)
      return {
        name: state.name,
        rugCategory: state.rugCategory,
        sizeLabel: formatRugSize(state.widthTiles, state.heightTiles),
        rug: { width: state.widthTiles, height: state.heightTiles, render: (p) => renderTileFills(state, swatchesById, p) },
        canEdit: !!owned,
        source: { kind: 'tile', state, swatchesById },
      }
    }
    loadPreview().then((preview) => {
      if (cancelled) return
      setDesign(preview)
      setStatus(preview ? 'ready' : 'not-found')
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- templateKey stands for templateOpts
  }, [designId, draftKind, templateParam, templateKey, isFreeform, isStudio, signedIn])

  const rooms3D = useMemo(() => roomsFor(design?.rugCategory ?? 'area'), [design?.rugCategory])
  const roomIndex = Math.max(0, rooms3D.findIndex((r) => r.id === searchParams.get('room3d')))
  const room3D = rooms3D[roomIndex]
  const goRoom = (step: number) => setParam('room3d', rooms3D[(roomIndex + step + rooms3D.length) % rooms3D.length].id)
  useEffect(() => {
    if (view !== '3d') return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') goRoom(1)
      if (e.key === 'ArrowLeft') goRoom(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const categoryPhotos = useMemo(
    () => (design ? roomPhotosForDesign(design.rugCategory) : []),
    [design],
  )

  // A `room` param carried over from a shared link or a stale bookmark can point past the end
  // once the actual photo count is known - clamp it for rendering rather than storing a second
  // copy of "the real index" in state (which would need an effect to keep in sync).
  const slideIndex = categoryPhotos.length > 0 ? Math.min(Math.max(slideIndexState, 0), categoryPhotos.length - 1) : 0

  const exportScale = design ? EXPORT_LONG_SIDE / Math.max(design.rug.width, design.rug.height) : 1
  const exportSize = design
    ? { width: Math.round(design.rug.width * exportScale), height: Math.round(design.rug.height * exportScale) }
    : { width: 0, height: 0 }

  function handleBackToEditing() {
    navigate(designId ? `${editorPath}?design=${designId}` : editorPath)
  }

  async function handleShare() {
    if (design?.local) {
      showToast({ tone: 'info', message: 'Save your rug first, then you can share a link to it.' })
      return
    }
    const url = `${window.location.origin}/designer/preview?${isStudio ? 'kind=studio&' : isFreeform ? 'kind=freeform&' : ''}design=${designId}&room=${slideIndex}${view === '3d' ? `&room3d=${room3D.id}` : ''}`
    try {
      await navigator.clipboard.writeText(url)
      showToast({ tone: 'success', message: 'Preview link copied to clipboard.' })
    } catch {
      showToast({ tone: 'info', message: 'Copy this link to share your preview:', detail: url })
    }
  }

  async function svgToImage(svgEl: SVGSVGElement): Promise<HTMLImageElement> {
    // An SVG loaded as an image can't fetch anything, so tile photos are inlined as data URLs.
    const clone = svgEl.cloneNode(true) as SVGSVGElement
    await Promise.all(
      Array.from(clone.querySelectorAll('image')).map(async (image) => {
        const href = image.getAttribute('href')
        if (!href || href.startsWith('data:')) return
        const blob = await (await fetch(href)).blob()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(blob)
        })
        image.setAttribute('href', dataUrl)
      }),
    )
    const svgString = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Could not rasterize the rug'))
        img.src = url
      })
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  /** Downloads the rug alone, flat and top-down. The room is only a preview, not part of the design. */
  /** Free and guest downloads come smaller and marked; Pro gets the full image. */
  async function forPlan(blob: Blob): Promise<Blob> {
    return isPro ? blob : freePlanImage(blob, FREE_LIMITS.downloadPx)
  }

  function downloaded(what: string) {
    if (isPro) showToast({ tone: 'success', message: `${what} downloaded.` })
    else
      showToast({
        tone: 'success',
        message: `${what} downloaded, at ${FREE_LIMITS.downloadPx}px with a small Bunakar mark.`,
        detail: 'Pro downloads are full size and unmarked.',
        action: { label: 'See Pro', onClick: () => navigate('/pricing') },
      })
  }

  async function handleExport() {
    if (view === '3d') {
      const captured = await viewer.current?.capture()
      if (!captured || !design) {
        showToast({ tone: 'error', message: "Couldn't save the image. Please try again." })
        return
      }
      const blob = await forPlan(captured)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(design.name || 'rug-design').replace(/\s+/g, '-').toLowerCase()}-${room3D.id}.png`
      a.click()
      URL.revokeObjectURL(url)
      downloaded('Room image')
      return
    }
    const svgEl = rugSvgRef.current
    if (!design || !svgEl) return
    setExporting(true)
    try {
      const rugImg = await svgToImage(svgEl)
      const canvas = document.createElement('canvas')
      canvas.width = exportSize.width
      canvas.height = exportSize.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')
      ctx.drawImage(rugImg, 0, 0, canvas.width, canvas.height)

      const full: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!full) throw new Error('Could not create image')
      const downloadUrl = URL.createObjectURL(await forPlan(full))
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${(design.name || 'rug-design').replace(/\s+/g, '-').toLowerCase()}.png`
      link.click()
      URL.revokeObjectURL(downloadUrl)
      downloaded('Rug image')
    } catch (err) {
      console.error('Rug export failed', err)
      showToast({ tone: 'error', message: "Couldn't export the image. Please try again." })
    } finally {
      setExporting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-paper" aria-busy="true" aria-label="Weaving your preview">
        <PageMeta title="Room preview" description="Preview a handwoven rug design in a real room, on Bunakar." noindex />
        <div className="mx-auto max-w-5xl animate-pulse px-4 py-8 sm:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-6 w-40 rounded bg-surface-2" />
              <div className="h-4 w-56 rounded bg-surface-2" />
            </div>
            <div className="h-9 w-32 rounded-full bg-surface-2" />
          </div>
          <div className="aspect-video w-full rounded-2xl bg-surface-2" />
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-10 w-36 rounded-full bg-surface-2" />
            <div className="h-10 w-24 rounded-full bg-surface-2" />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'not-found' || !design) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-paper text-center">
        <PageMeta title="Room preview" description="Preview a handwoven rug design in a real room, on Bunakar." noindex />
        <p className="text-muted">We couldn't find that design.</p>
        <p className="max-w-sm text-sm text-muted-2">
          The link may be mistyped, or the rug may have been deleted.
        </p>
        <Link
          to={editorPath}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-accent-hover"
        >
          <ArrowLeft size={16} /> Design your own rug
        </Link>
      </div>
    )
  }

  const editButton = design.canEdit ? (
    <button
      type="button"
      onClick={handleBackToEditing}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-paper/90 px-4 text-[0.9rem] font-medium text-ink shadow-[var(--shadow-soft)] ring-1 ring-line backdrop-blur transition-colors hover:bg-paper"
    >
      <PencilSimple size={16} /> Back to editing
    </button>
  ) : (
    <Link
      to="/#create-design"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-paper/90 px-4 text-[0.9rem] font-medium text-ink shadow-[var(--shadow-soft)] ring-1 ring-line backdrop-blur transition-colors hover:bg-paper"
    >
      <PencilSimple size={16} /> Design your own
    </Link>
  )

  if (view === '3d') {
    const arrow =
      'absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-paper/95 text-ink shadow-[var(--shadow-soft)] ring-1 ring-line transition-transform hover:scale-105 active:scale-95'
    return (
      <div className="bg-white pt-16">
        <PageMeta title="Room preview" description="See a handwoven rug design in 3D rooms, on Bunakar." noindex />
        <div className="relative h-[calc(100dvh-4rem)] min-h-[520px] w-full overflow-hidden">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-muted">Setting up the rooms…</div>}>
            <RoomViewer3D ref={viewer} room={room3D} source={design.source} />
          </Suspense>

          {/* Top: the rug, and the way back. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-6">
            <div className="pointer-events-auto rounded-2xl bg-paper/90 px-4 py-3 shadow-[var(--shadow-soft)] ring-1 ring-line backdrop-blur">
              <h1 className="font-display text-xl font-medium text-ink">{design.name}</h1>
              <p className="text-sm text-muted">
                {design.sizeLabel} &middot; {design.local ? 'from this device, not saved yet' : 'drawn to scale'}
              </p>
            </div>
            <div className="pointer-events-auto">{editButton}</div>
          </div>

          {/* The carousel: arrows either side, the room and dots below. */}
          <button type="button" onClick={() => goRoom(-1)} aria-label="Previous room" className={`${arrow} left-3 sm:left-6`}>
            <CaretLeft size={22} weight="bold" />
          </button>
          <button type="button" onClick={() => goRoom(1)} aria-label="Next room" className={`${arrow} right-3 sm:right-6`}>
            <CaretRight size={22} weight="bold" />
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 sm:p-6">
            <div className="pointer-events-auto flex flex-col items-center rounded-2xl bg-paper/90 px-5 py-3 text-center shadow-[var(--shadow-soft)] ring-1 ring-line backdrop-blur">
              <p className="font-display text-lg font-medium text-ink">{room3D.name}</p>
              <p className="text-[0.8125rem] text-muted" aria-live="polite">
                {room3D.setting} &middot; {roomIndex + 1} of {rooms3D.length}
              </p>
              <div role="tablist" aria-label="Rooms" className="mt-2 flex gap-1">
                {rooms3D.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    role="tab"
                    aria-selected={i === roomIndex}
                    aria-label={r.name}
                    title={r.name}
                    onClick={() => setParam('room3d', r.id)}
                    className="flex h-6 w-6 items-center justify-center"
                  >
                    <span className={`block rounded-full transition-all ${i === roomIndex ? 'h-2 w-5 bg-ink' : 'h-2 w-2 bg-ink/30 hover:bg-ink/50'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="pointer-events-auto flex w-full flex-wrap items-center justify-between gap-2">
              <p className="hidden rounded-full bg-paper/90 px-3 py-1.5 text-[0.8125rem] text-ink-2 ring-1 ring-line sm:block">
                Drag to turn &middot; scroll to zoom &middot; &larr; &rarr; for rooms
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-[0.9rem] font-semibold text-paper shadow-[var(--shadow-soft)] transition-colors hover:bg-accent-hover"
                >
                  <DownloadSimple size={16} /> Download this view
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-paper/95 px-4 text-[0.9rem] font-medium text-ink shadow-[var(--shadow-soft)] ring-1 ring-line transition-colors hover:bg-paper"
                >
                  <ShareNetwork size={16} /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <PageMeta title="Room preview" description="Preview a handwoven rug design in a real room, on Bunakar." noindex />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl text-ink">{design.name}</h1>
            <p className="text-sm text-muted-2">
              {design.sizeLabel} &middot; {design.local ? "from this device, not saved yet" : "watch it come home"}
            </p>
          </div>
          {design.canEdit ? (
            <button
              type="button"
              onClick={handleBackToEditing}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors hover:border-muted"
            >
              <PencilSimple size={16} /> Back to Editing
            </button>
          ) : (
            <Link
              to="/#create-design"
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors hover:border-muted"
            >
              <PencilSimple size={16} /> Design your own
            </Link>
          )}
        </div>

        <RugRoomCarousel photos={categoryPhotos} rug={design.rug} index={slideIndex} onIndexChange={handleSlideIndexChange} />

        {/* The plain rug, off-screen, that "Download rug image" rasterizes. */}
        <svg
          ref={rugSvgRef}
          aria-hidden="true"
          className="hidden"
          width={exportSize.width}
          height={exportSize.height}
          viewBox={`0 0 ${design.rug.width} ${design.rug.height}`}
          preserveAspectRatio="none"
        >
          {design.rug.render(exportPrefix)}
        </svg>

        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              aria-busy={exporting}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold tracking-wide text-paper transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <DownloadSimple size={16} />
              <span aria-live="polite" aria-atomic="true">
                {exporting ? 'Exporting…' : 'Download rug image'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:border-muted"
            >
              <ShareNetwork size={16} /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomPreviewPage
