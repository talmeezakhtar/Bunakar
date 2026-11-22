import { bitmapPixels } from './rasterize'
import { computeNormalMap, dataTexture } from './rugTextures'
import type { RugTextures } from './rugTextures'
export { RUG_PHOTOS } from '../../data/rugPhotos'
export type { RugPhoto } from '../../data/rugPhotos'

/** Box blur of a w x h field, radius r, in two passes. */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  const n = 2 * r + 1
  for (let y = 0; y < h; y++) {
    let sum = 0
    for (let x = -r; x <= r; x++) sum += src[y * w + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / n
      sum += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / n
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
    }
  }
  return out
}

/**
 * Pile relief from a photograph: the photo's fine detail (its brightness minus a local average,
 * so knots and outlines stand up and broad colour areas stay flat) plus a little tuft noise.
 */
export function photoHeight(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const lum = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) lum[i] = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255
  const local = boxBlur(lum, w, h, 3)
  const height = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const tuft = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1
    height[i] = 0.5 + (lum[i] - local[i]) * 1.4 + (tuft - 0.5) * 0.06
  }
  return height
}

const cache = new Map<string, Promise<RugTextures>>()

/** A photographed rug as rug textures: its picture plus a normal map made from it. Cached by URL. */
export function loadPhotoRugTextures(url: string): Promise<RugTextures> {
  let job = cache.get(url)
  if (!job) {
    job = (async () => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`rug photo ${res.status}`)
      const bitmap = await createImageBitmap(await res.blob())
      const color = bitmapPixels(bitmap)
      bitmap.close()
      const { width: w, height: h } = color
      const normal = await computeNormalMap(photoHeight(color.data, w, h), w, h, 2.2)
      const map = dataTexture(color.data, w, h, true)
      const normalMap = dataTexture(normal, w, h, false)
      return {
        map,
        normalMap,
        width: w,
        height: h,
        dispose() {
          map.dispose()
          normalMap.dispose()
        },
      }
    })()
    job.catch(() => cache.delete(url))
    cache.set(url, job)
  }
  return job
}
