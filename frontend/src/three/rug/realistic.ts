import { buildHeightField } from './heightMap'
import { bitmapPixels, rasterizeRug } from './rasterize'
import { resolveRugSource } from './rugSource'
import type { RugSource } from './rugSource'
import { computeNormalMap } from './normalWorker'
import { grainFrom, shadeRug } from './shade'
import { LruCache } from './textureCache'
import { applyFinish } from '../../studio/finish'
import { buildMaterialMaps, fibreIndex } from './materialMaps'
import { shapePathFt } from '../../studio/compose'

/**
 * Any design as a picture of a real woven rug: the 3D pipeline's colour image and relief (pile,
 * tile seams, carving), lit from the top left, wool grain from a pile photo, a soft shadow and
 * cotton fringes on the short ends. Returns an object URL; results are cached by content.
 * Browser only. Free of three.js, so pages can use it without loading the 3D chunk.
 */

export interface RealisticOptions {
  /** Long side of the rug itself in px (fringe and shadow are added around it). */
  longPx: number
}

let grain: Promise<{ g: Float32Array; w: number; h: number } | null> | null = null

/** The wool-pile grain, from `public/textures/pile.jpg` (loaded once; renders fine without it). */
function pileGrain() {
  grain ??= fetch('/textures/pile.jpg')
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('no pile texture'))))
    .then((b) => createImageBitmap(b))
    .then((bmp) => {
      const px = bitmapPixels(bmp)
      bmp.close()
      return { g: grainFrom(px.data, px.width, px.height, 0.28), w: px.width, h: px.height }
    })
    .catch(() => null)
  return grain
}

/** Cotton warp ends along one short edge, hanging away from the rug. */
function drawFringe(g: CanvasRenderingContext2D, x0: number, y0: number, length: number, span: number, along: 'x' | 'y', dir: 1 | -1) {
  const step = Math.max(2, span / 90)
  g.lineCap = 'round'
  for (let t = step / 2, i = 0; t < span; t += step, i++) {
    const l = length * (0.82 + ((i * 7919) % 13) / 40)
    const sway = (((i * 104729) % 17) / 17 - 0.5) * length * 0.25
    g.strokeStyle = i % 3 === 0 ? '#e6dcc6' : '#f3ecdc'
    g.lineWidth = Math.max(1, step * 0.55)
    g.beginPath()
    if (along === 'x') {
      g.moveTo(x0 + t, y0)
      g.quadraticCurveTo(x0 + t + sway * 0.4, y0 + (dir * l) / 2, x0 + t + sway, y0 + dir * l)
    } else {
      g.moveTo(x0, y0 + t)
      g.quadraticCurveTo(x0 + (dir * l) / 2, y0 + t + sway * 0.4, x0 + dir * l, y0 + t + sway)
    }
    g.stroke()
  }
}

async function render(source: RugSource, opts: RealisticOptions): Promise<string> {
  const rug = resolveRugSource(source)
  const long = Math.max(rug.widthFt, rug.heightFt)
  const bitmap = await rasterizeRug(rug.art, { widthFt: rug.widthFt, heightFt: rug.heightFt, pxPerFt: opts.longPx / long, maxPx: opts.longPx })
  const color = bitmapPixels(bitmap)
  bitmap.close()
  const { width: w, height: h } = color
  const field = buildHeightField(rug.design, color)
  const fibres = fibreIndex(rug.design, color.data, w, h)
  // A studio rug's finish (abrash, wash, silk) on its colours; the relief is read before it.
  if (rug.design.kind === 'doc') applyFinish(color.data, w, h, rug.design.doc)
  const mats = buildMaterialMaps(fibres, color.data, w, h)
  if (field.mask) for (let i = 0; i < field.mask.length; i++) color.data[i * 4 + 3] = Math.min(color.data[i * 4 + 3], field.mask[i])
  // Relief strength relative to resolution, as the 3D textures do.
  const normal = await computeNormalMap(field.data, w, h, 3 * (opts.longPx / long / 96))
  const pile = await pileGrain()
  const shaded = shadeRug(color.data, normal, w, h, { ...(pile ? { grain: pile.g, grainW: pile.w, grainH: pile.h } : {}), surface: mats.surface && mats.minRoughness < 0.72 ? mats.surface : null })

  // Frame: room for the fringe on the short ends and a soft shadow below.
  const fringe = Math.round(Math.max(w, h) * 0.045)
  const pad = fringe + Math.round(Math.max(w, h) * 0.03)
  const canvas = document.createElement('canvas')
  canvas.width = w + pad * 2
  canvas.height = h + pad * 2
  const g = canvas.getContext('2d')
  if (!g) throw new Error('Canvas unavailable')
  const tile = document.createElement('canvas')
  tile.width = w
  tile.height = h
  tile.getContext('2d')?.putImageData(new ImageData(shaded, w, h), 0, 0)
  // Fringes first, so the rug's edge covers their roots. Studio rugs say how their ends are
  // finished; fringes only make sense on a rectangle's short ends.
  const doc = rug.design.kind === 'doc' ? rug.design.doc : null
  const rect = !doc || doc.shape.kind === 'rect'
  const edges = doc?.finish.edges ?? 'fringe'
  const shortAlongX = w <= h
  // Kilim ends: a band of plain flatweave past each short end, then a shorter fringe.
  const band = edges === 'kilim-end' && rect ? Math.round(Math.max(w, h) * 0.022) : 0
  if (rect && (edges === 'fringe' || edges === 'kilim-end')) {
    const l = band ? fringe * 0.55 : fringe
    if (shortAlongX) {
      drawFringe(g, pad, pad + 1 - band, l, w, 'x', -1)
      drawFringe(g, pad, pad + h - 1 + band, l, w, 'x', 1)
    } else {
      drawFringe(g, pad + 1 - band, pad, l, h, 'y', -1)
      drawFringe(g, pad + w - 1 + band, pad, l, h, 'y', 1)
    }
  }
  if (band) {
    const ends = shortAlongX
      ? [
          [pad, pad - band, w, band],
          [pad, pad + h, w, band],
        ]
      : [
          [pad - band, pad, band, h],
          [pad + w, pad, band, h],
        ]
    for (const [x, y, bw, bh] of ends) {
      g.fillStyle = '#e4d9c3'
      g.fillRect(x, y, bw, bh)
      // Weft ribs across the band.
      g.strokeStyle = 'rgba(120,100,70,0.22)'
      g.lineWidth = 1
      g.beginPath()
      const step = Math.max(2, band / 7)
      for (let t = step / 2; t < (shortAlongX ? bh : bw); t += step) {
        if (shortAlongX) {
          g.moveTo(x, y + t)
          g.lineTo(x + bw, y + t)
        } else {
          g.moveTo(x + t, y)
          g.lineTo(x + t, y + bh)
        }
      }
      g.stroke()
    }
  }
  g.save()
  g.shadowColor = 'rgba(46, 30, 18, 0.32)'
  g.shadowBlur = pad * 0.55
  g.shadowOffsetY = pad * 0.18
  g.drawImage(tile, pad, pad)
  g.restore()
  // A bound edge: whipped binding along the outline, in a deeper shade of the rug's own edge.
  if (doc && edges === 'binding') {
    let r = 0
    let gg = 0
    let b = 0
    let n = 0
    for (let x = 0; x < w; x += 3)
      for (const y of [2, h - 3]) {
        const i = (y * w + x) * 4
        if (!shaded[i + 3]) continue
        r += shaded[i]
        gg += shaded[i + 1]
        b += shaded[i + 2]
        n++
      }
    const c = n ? [r / n, gg / n, b / n].map((v) => Math.round(v * 0.72)) : [60, 48, 40]
    g.save()
    g.translate(pad, pad)
    g.scale(w / doc.widthFt, h / doc.heightFt)
    g.lineWidth = (Math.max(w, h) * 0.007) / (w / doc.widthFt)
    g.strokeStyle = `rgb(${c[0]},${c[1]},${c[2]})`
    g.stroke(new Path2D(shapePathFt(doc.shape, doc.widthFt, doc.heightFt)))
    g.restore()
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
  if (!blob) throw new Error('Could not encode the rug')
  return URL.createObjectURL(blob)
}

const cache = new LruCache<string>(80, (url) => URL.revokeObjectURL(url))

// Renders share the main thread: two at a time keeps a grid of thumbnails from stalling the page.
let running = 0
const queue: (() => void)[] = []
async function slot<T>(job: () => Promise<T>): Promise<T> {
  if (running >= 2) await new Promise<void>((resolve) => queue.push(resolve))
  running++
  try {
    return await job()
  } finally {
    running--
    queue.shift()?.()
  }
}

/** A woven-rug picture of `source` (object URL, cached by content and size). */
export function renderRealisticRug(source: RugSource, opts: RealisticOptions): Promise<string> {
  const rug = resolveRugSource(source)
  return cache.get(`${rug.key}@${opts.longPx}`, () => slot(() => render(source, opts)))
}
