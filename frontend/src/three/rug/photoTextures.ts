import { bitmapPixels } from './rasterize'
import { dataTexture } from './rugTextures'
import { computePhotoNormalMap } from './normalWorker'
import type { RugTextures } from './rugTextures'
export { RUG_PHOTOS } from '../../data/rugPhotos'
export type { RugPhoto } from '../../data/rugPhotos'

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
      // Relief and normals are worked out off the main thread while the scene loads.
      const normal = await computePhotoNormalMap(color.data, w, h, 2.2)
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
