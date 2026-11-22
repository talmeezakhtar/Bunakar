import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type { RugArt } from '../../components/tileDesigner/RugPhotoSlide'

export interface RasterSize {
  width: number
  height: number
}

/** Pixel size for a rug at `pxPerFt`, scaled down uniformly so the long side is at most `maxPx`. */
export function rasterSize(widthFt: number, heightFt: number, pxPerFt: number, maxPx: number): RasterSize {
  const w = widthFt * pxPerFt
  const h = heightFt * pxPerFt
  const k = Math.min(1, maxPx / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}

/**
 * Draws the art's SVG once, off-DOM, and serializes it. React renders synchronously into a
 * detached node (createRoot + flushSync); react-dom/server stays out of the bundle.
 */
export function renderArtSvg(art: RugArt, size: RasterSize, background?: string, prefix = 'r3d'): SVGSVGElement {
  const host = document.createElement('div')
  const root = createRoot(host)
  try {
    flushSync(() => {
      root.render(
        createElement(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            width: size.width,
            height: size.height,
            viewBox: `0 0 ${art.width} ${art.height}`,
            preserveAspectRatio: 'none',
          },
          background ? createElement('rect', { width: art.width, height: art.height, fill: background }) : null,
          art.render(prefix),
        ),
      )
    })
    const svg = host.querySelector('svg')
    if (!svg) throw new Error('Rug art rendered no SVG')
    return svg.cloneNode(true) as SVGSVGElement
  } finally {
    root.unmount()
  }
}

/** An SVG loaded as an image can't fetch anything, so photos are inlined as data URLs first. */
async function inlineImages(svg: SVGSVGElement, signal?: AbortSignal): Promise<void> {
  const cache = new Map<string, Promise<string>>()
  const toDataUrl = async (href: string) => {
    const blob = await (await fetch(href, { signal })).blob()
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }
  await Promise.all(
    Array.from(svg.querySelectorAll('image')).map(async (image) => {
      const href = image.getAttribute('href')
      if (!href || href.startsWith('data:')) return
      if (!cache.has(href)) cache.set(href, toDataUrl(href))
      image.setAttribute('href', await cache.get(href)!)
    }),
  )
}

export interface RasterizeOptions {
  widthFt: number
  heightFt: number
  pxPerFt: number
  /** Long-side cap in pixels (GPU texture limits, memory on low tiers). */
  maxPx?: number
  /** Fill under the art; leave unset to keep unpainted tiles transparent (alpha mask). */
  background?: string
  /** Bitmap rows bottom-up, for three.js (ImageBitmap textures ignore `flipY`). */
  flipY?: boolean
  signal?: AbortSignal
}

/** Rasterizes rug art to an ImageBitmap at `pxPerFt` (long side capped). Browser only. */
export async function rasterizeRug(art: RugArt, opts: RasterizeOptions): Promise<ImageBitmap> {
  const size = rasterSize(opts.widthFt, opts.heightFt, opts.pxPerFt, opts.maxPx ?? 4096)
  // flushSync does nothing while React is mid-commit (e.g. called from an effect): step out first.
  await new Promise((resolve) => setTimeout(resolve, 0))
  const svg = renderArtSvg(art, size, opts.background)
  await inlineImages(svg, opts.signal)
  const svgString = new XMLSerializer().serializeToString(svg)
  const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not rasterize the rug'))
      img.src = url
    })
    // Draw through a canvas: SVG images can't go to createImageBitmap directly in every browser.
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(img, 0, 0, size.width, size.height)
    return await createImageBitmap(canvas, { imageOrientation: opts.flipY ? 'flipY' : 'from-image', premultiplyAlpha: 'none' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Pixels of a bitmap (in the bitmap's own row order). */
export function bitmapPixels(bitmap: ImageBitmap): ImageData {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(bitmap, 0, 0)
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height)
}
