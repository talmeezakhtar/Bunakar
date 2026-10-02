import type { Quad } from './perspective'

/** Width, in CSS px, the rug SVG is laid out at before being perspective-warped onto the photo. */
export const SOURCE_SCALE = 400

/** Realism knobs for the rug-in-room composite, shared by the live preview and the PNG export.
 * Tune by eye. Shadow sizes are in rug-source pixels (the rug is rendered SOURCE_SCALE wide). */
export const RUG_LOOK = {
  /** How strongly the photo's light falloff (skylights, dim corners) shows on the rug. */
  shadeStrength: 1.2,
  /** Long-side resolution of the lighting map - low on purpose, so only light survives, not
   * the pattern of the rug already in the photo. */
  shadeSamples: 16,
  shadowBlur: 6,
  shadowOffsetY: 1.5,
  shadowColor: 'rgba(0, 0, 0, 0.45)',
}

/**
 * A tiny grayscale lighting map of the room photo, normalized so the rug area averages to
 * mid-gray (128). Blended with `soft-light` over the rug it brightens/darkens it the same way
 * the room's light falls on the floor; mid-gray leaves the rug untouched.
 */
// ponytail: lighting is read off the photo's existing rug, so a very dark medallion in it can
// faintly darken our rug's center - sample the floor ring around the quad instead if that shows.
export function buildShadeMap(img: HTMLImageElement, corners: Quad): HTMLCanvasElement {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const n = RUG_LOOK.shadeSamples
  const tw = w >= h ? n : Math.max(1, Math.round((n * w) / h))
  const th = w >= h ? Math.max(1, Math.round((n * h) / w)) : n

  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, tw, th)
  const data = ctx.getImageData(0, 0, tw, th)
  const px = data.data

  const xs = [corners.topLeft.x, corners.topRight.x, corners.bottomRight.x, corners.bottomLeft.x]
  const ys = [corners.topLeft.y, corners.topRight.y, corners.bottomRight.y, corners.bottomLeft.y]
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]

  const lum = new Float32Array(tw * th)
  let sum = 0
  let count = 0
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const i = y * tw + x
      lum[i] = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]
      const cx = (x + 0.5) / tw
      const cy = (y + 0.5) / th
      if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
        sum += lum[i]
        count++
      }
    }
  }
  const mean = count > 0 ? sum / count : 128

  for (let i = 0; i < lum.length; i++) {
    const g = Math.min(255, Math.max(0, 128 + (lum[i] - mean) * RUG_LOOK.shadeStrength))
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = g
    px[i * 4 + 3] = 255
  }
  ctx.putImageData(data, 0, 0)
  return canvas
}
