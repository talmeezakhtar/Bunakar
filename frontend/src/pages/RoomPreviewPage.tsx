import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, DownloadSimple, PencilSimple, ShareNetwork } from '@phosphor-icons/react'
import type { RugCategory, TileDesignRecord } from '../types/tileDesign'
import { formatFeetInches, formatRugSize, recordToState } from '../types/tileDesign'
import { freeformRecordToState } from '../types/freeform'
import type { FreeformDesignRecord } from '../types/freeform'
import { roomPhotosForDesign } from '../data/roomPhotos'
import RugRoomCarousel from '../components/tileDesigner/RugRoomCarousel'
import type { RugArt } from '../components/tileDesigner/RugPhotoSlide'
import { patternPrefix, renderTileFills } from '../components/tileDesigner/renderTiles'
import { renderFreeform } from '../components/freeform/renderFreeform'
import { loadSwatchCatalog } from '../components/tileDesigner/tileDesignStorage'
import { freeformDesignsApi, tileDesignsApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/common/Toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

type Status = 'loading' | 'ready' | 'not-found'

/** What the page needs from either kind of design: tile (modular) or freeform (hand-tufted). */
type PreviewDesign = {
  name: string
  rugCategory: RugCategory
  sizeLabel: string
  rug: RugArt
  /** The viewer owns it, so "Back to Editing" makes sense; a shared link's visitor doesn't. */
  canEdit: boolean
}

/** Pixels along the exported rug image's longer side. */
const EXPORT_LONG_SIDE = 2400

function parseRoomIndex(raw: string | null): number {
  if (!raw) return 0
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function RoomPreviewPage() {
  useDocumentTitle('Room preview')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const designId = searchParams.get('design')
  const isFreeform = searchParams.get('kind') === 'freeform'
  const { user } = useAuth()
  const signedIn = !!user

  const [status, setStatus] = useState<Status>(designId ? 'loading' : 'not-found')
  const [design, setDesign] = useState<PreviewDesign | null>(null)
  const [exporting, setExporting] = useState(false)
  const [slideIndexState, setSlideIndexState] = useState(() => parseRoomIndex(searchParams.get('room')))
  const rugSvgRef = useRef<SVGSVGElement>(null)
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
    if (!designId) return
    let cancelled = false
    const loadPreview = async (): Promise<PreviewDesign | null> => {
      const catalog = await loadSwatchCatalog()
      const swatchesById = new Map(catalog.swatches.map((s) => [s.id, s]))
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
        }
      }
      const state = recordToState(record as TileDesignRecord)
      return {
        name: state.name,
        rugCategory: state.rugCategory,
        sizeLabel: formatRugSize(state.widthTiles, state.heightTiles),
        rug: { width: state.widthTiles, height: state.heightTiles, render: (p) => renderTileFills(state, swatchesById, p) },
        canEdit: !!owned,
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
  }, [designId, isFreeform, signedIn])

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
    const editor = isFreeform ? '/freeform' : '/designer'
    navigate(designId ? `${editor}?design=${designId}` : editor)
  }

  async function handleShare() {
    const url = `${window.location.origin}/designer/preview?${isFreeform ? 'kind=freeform&' : ''}design=${designId}&room=${slideIndex}`
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
  async function handleExport() {
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

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not create image')
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${(design.name || 'rug-design').replace(/\s+/g, '-').toLowerCase()}.png`
      link.click()
      URL.revokeObjectURL(downloadUrl)
      showToast({ tone: 'success', message: 'Rug image downloaded.' })
    } catch (err) {
      console.error('Rug export failed', err)
      showToast({ tone: 'error', message: "Couldn't export the image. Please try again." })
    } finally {
      setExporting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-night-950" aria-busy="true" aria-label="Weaving your preview">
        <div className="mx-auto max-w-5xl animate-pulse px-4 py-8 sm:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-6 w-40 rounded bg-night-800" />
              <div className="h-4 w-56 rounded bg-night-800" />
            </div>
            <div className="h-9 w-32 rounded-full bg-night-800" />
          </div>
          <div className="aspect-video w-full rounded-2xl bg-night-800" />
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-10 w-36 rounded-full bg-night-800" />
            <div className="h-10 w-24 rounded-full bg-night-800" />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'not-found' || !design) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-night-950 text-center">
        <p className="text-sand-300">We couldn't find that design.</p>
        <p className="max-w-sm text-sm text-sand-300/70">
          The link may be mistyped, or the rug may have been deleted.
        </p>
        <Link
          to={isFreeform ? '/freeform' : '/designer'}
          className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-night-950 transition-colors hover:bg-gold-400"
        >
          <ArrowLeft size={16} /> Design your own rug
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-night-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl tracking-wide text-sand-100">{design.name}</h1>
            <p className="text-sm text-sand-300/70">
              {design.sizeLabel} &middot; watch it come home
            </p>
          </div>
          {design.canEdit ? (
            <button
              type="button"
              onClick={handleBackToEditing}
              className="inline-flex items-center gap-1.5 rounded-full border border-night-600 px-3.5 py-2 text-sm font-medium text-sand-200 transition-colors hover:border-sand-300"
            >
              <PencilSimple size={16} /> Back to Editing
            </button>
          ) : (
            <Link
              to="/#create-design"
              className="inline-flex items-center gap-1.5 rounded-full border border-night-600 px-3.5 py-2 text-sm font-medium text-sand-200 transition-colors hover:border-sand-300"
            >
              <PencilSimple size={16} /> Design your own
            </Link>
          )}
        </div>

        <RugRoomCarousel
          photos={categoryPhotos}
          rug={design.rug}
          index={slideIndex}
          onIndexChange={handleSlideIndexChange}
        />

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
              className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-2.5 text-sm font-semibold tracking-wide text-night-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <DownloadSimple size={16} />
              <span aria-live="polite" aria-atomic="true">
                {exporting ? 'Exporting...' : 'Download rug image'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-night-600 px-4 py-2.5 text-sm font-medium text-sand-200 transition-colors hover:border-sand-300"
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
