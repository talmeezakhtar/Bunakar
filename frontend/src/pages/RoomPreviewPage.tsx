import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, DownloadSimple, PencilSimple, ShareNetwork } from '@phosphor-icons/react'
import type { Swatch } from '../types/swatch'
import type { TileDesignState } from '../types/tileDesign'
import { formatRugSize, recordToState } from '../types/tileDesign'
import { roomPhotosForDesign } from '../data/roomPhotos'
import RugRoomCarousel from '../components/tileDesigner/RugRoomCarousel'
import { loadDesign, loadSwatchCatalog } from '../components/tileDesigner/tileDesignStorage'
import { applyHomography, invertHomography, rectToQuadHomography } from '../utils/perspective'

type Status = 'loading' | 'ready' | 'not-found'

const EXPORT_RUG_RASTER = 1000

function RoomPreviewPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const designId = searchParams.get('design')

  const [status, setStatus] = useState<Status>(designId ? 'loading' : 'not-found')
  const [design, setDesign] = useState<TileDesignState | null>(null)
  const [swatchesById, setSwatchesById] = useState<Map<string, Swatch>>(new Map())
  const [exporting, setExporting] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!designId) return
    let cancelled = false
    Promise.all([loadSwatchCatalog(), loadDesign(designId)]).then(([catalog, record]) => {
      if (cancelled) return
      setSwatchesById(new Map(catalog.swatches.map((s) => [s.id, s])))
      if (!record) {
        setStatus('not-found')
        return
      }
      setDesign(recordToState(record))
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [designId])

  const categoryPhotos = useMemo(
    () => (design ? roomPhotosForDesign(design.rugCategory) : []),
    [design],
  )

  function handleBackToEditing() {
    navigate(designId ? `/designer?design=${designId}` : '/designer')
  }

  async function handleShare() {
    const url = `${window.location.origin}/designer/preview?design=${designId}`
    try {
      await navigator.clipboard.writeText(url)
      window.alert('Preview link copied to clipboard.')
    } catch {
      window.prompt('Copy this link to share your design preview:', url)
    }
  }

  async function svgToImage(svgEl: SVGSVGElement): Promise<HTMLImageElement> {
    const svgString = new XMLSerializer().serializeToString(svgEl)
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

  async function handleExport() {
    if (!design) return
    const photo = categoryPhotos[slideIndex]
    const imgEl = carouselRef.current?.querySelector('img')
    const svgEl = carouselRef.current?.querySelector('svg')
    if (!photo || !imgEl || !svgEl) {
      window.alert('The preview is still loading - try again in a moment.')
      return
    }

    setExporting(true)
    try {
      if (!imgEl.complete) await imgEl.decode()

      // Rasterize the rug design once, at export resolution.
      const rugImg = await svgToImage(svgEl)
      const rugAspect = design.widthTiles / design.heightTiles
      const rugW = EXPORT_RUG_RASTER
      const rugH = Math.round(EXPORT_RUG_RASTER / rugAspect)
      const rugCanvas = document.createElement('canvas')
      rugCanvas.width = rugW
      rugCanvas.height = rugH
      const rugCtx = rugCanvas.getContext('2d')
      if (!rugCtx) throw new Error('Canvas unavailable')
      rugCtx.drawImage(rugImg, 0, 0, rugW, rugH)
      const rugData = rugCtx.getImageData(0, 0, rugW, rugH).data

      // Draw the room photo at its native resolution.
      const canvas = document.createElement('canvas')
      canvas.width = photo.width
      canvas.height = photo.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')
      ctx.drawImage(imgEl, 0, 0, photo.width, photo.height)

      // Map every destination pixel inside the rug's quad back to a source pixel in the
      // rasterized rug (inverse-homography sampling - gap-free, unlike forward mapping).
      const dest = {
        topLeft: { x: photo.corners.topLeft.x * photo.width, y: photo.corners.topLeft.y * photo.height },
        topRight: { x: photo.corners.topRight.x * photo.width, y: photo.corners.topRight.y * photo.height },
        bottomRight: { x: photo.corners.bottomRight.x * photo.width, y: photo.corners.bottomRight.y * photo.height },
        bottomLeft: { x: photo.corners.bottomLeft.x * photo.width, y: photo.corners.bottomLeft.y * photo.height },
      }
      const forward = rectToQuadHomography(rugW, rugH, dest)
      const inverse = invertHomography(forward)

      const xs = [dest.topLeft.x, dest.topRight.x, dest.bottomRight.x, dest.bottomLeft.x]
      const ys = [dest.topLeft.y, dest.topRight.y, dest.bottomRight.y, dest.bottomLeft.y]
      const minX = Math.max(0, Math.floor(Math.min(...xs)))
      const maxX = Math.min(photo.width, Math.ceil(Math.max(...xs)))
      const minY = Math.max(0, Math.floor(Math.min(...ys)))
      const maxY = Math.min(photo.height, Math.ceil(Math.max(...ys)))

      const frame = ctx.getImageData(0, 0, photo.width, photo.height)
      for (let py = minY; py < maxY; py++) {
        for (let px = minX; px < maxX; px++) {
          const src = applyHomography(inverse, px, py)
          if (src.x < 0 || src.x >= rugW || src.y < 0 || src.y >= rugH) continue
          const sx = Math.min(rugW - 1, Math.max(0, Math.round(src.x)))
          const sy = Math.min(rugH - 1, Math.max(0, Math.round(src.y)))
          const sIdx = (sy * rugW + sx) * 4
          const dIdx = (py * photo.width + px) * 4
          frame.data[dIdx] = rugData[sIdx]
          frame.data[dIdx + 1] = rugData[sIdx + 1]
          frame.data[dIdx + 2] = rugData[sIdx + 2]
          frame.data[dIdx + 3] = 255
        }
      }
      ctx.putImageData(frame, 0, 0)

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not create image')
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${(design.name || 'rug-design').replace(/\s+/g, '-').toLowerCase()}-${photo.id}.png`
      link.click()
      URL.revokeObjectURL(downloadUrl)
    } catch {
      window.alert("Couldn't export the image. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-night-950 text-sand-300">
        Loading your preview...
      </div>
    )
  }

  if (status === 'not-found' || !design) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-night-950 text-center">
        <p className="text-sand-300">We couldn't find that design.</p>
        <button
          type="button"
          onClick={() => navigate('/designer')}
          className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-night-950 transition-colors hover:bg-gold-400"
        >
          <ArrowLeft size={16} /> Back to the designer
        </button>
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
              {formatRugSize(design.widthTiles, design.heightTiles)} &middot; browse it in a few different rooms
            </p>
          </div>
          <button
            type="button"
            onClick={handleBackToEditing}
            className="inline-flex items-center gap-1.5 rounded-full border border-night-600 px-3.5 py-2 text-sm font-medium text-sand-200 transition-colors hover:border-sand-300"
          >
            <PencilSimple size={16} /> Back to Editing
          </button>
        </div>

        <div ref={carouselRef}>
          <RugRoomCarousel
            photos={categoryPhotos}
            state={design}
            swatchesById={swatchesById}
            index={slideIndex}
            onIndexChange={setSlideIndex}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-2.5 text-sm font-semibold tracking-wide text-night-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <DownloadSimple size={16} /> {exporting ? 'Exporting...' : 'Export as Image'}
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
  )
}

export default RoomPreviewPage
