import { DataTexture, LinearMipmapLinearFilter, LinearFilter, NoColorSpace, RGBAFormat, SRGBColorSpace, UnsignedByteType } from 'three'
import { buildHeightField } from './heightMap'
import { computeNormalMap } from './normalWorker'
import { bitmapPixels, rasterizeRug } from './rasterize'
import type { ResolvedRug } from './rugSource'
import { applyFinish } from '../../studio/finish'
import { buildMaterialMaps, fibreIndex } from './materialMaps'
import type { FibreMaterial } from '../../data/materials'
export { computeNormalMap }
import { LruCache, RUG_TEXTURE_CACHE_SIZE } from './textureCache'

export type RugTier = 'high' | 'low'

/** Texture density per device tier, and the long-side cap. */
export const TIER_TEXTURES: Record<RugTier, { pxPerFt: number; maxPx: number }> = {
  high: { pxPerFt: 128, maxPx: 4096 },
  low: { pxPerFt: 56, maxPx: 2048 },
}

export interface RugTextures {
  map: DataTexture
  normalMap: DataTexture
  /** Per-fibre material: G roughness, A specular intensity (linear). */
  surfaceMap?: DataTexture
  /** Per-fibre sheen: RGB colour (sRGB), A sheen roughness. */
  sheenMap?: DataTexture
  /** Silk's stretched highlight, when the rug has any (linear), and its overall strength. */
  anisotropyMap?: DataTexture | null
  anisotropy?: number
  /** The rug's one fibre when it has no maps (an all-wool rug). */
  fibre?: FibreMaterial | null
  width: number
  height: number
  dispose(): void
}

export interface RugTextureOptions {
  pxPerFt: number
  maxPx: number
  /** Normal map slope scale. */
  normalStrength?: number
}

// ---- textures ------------------------------------------------------------------------------

export function dataTexture(data: Uint8Array | Uint8ClampedArray, w: number, h: number, srgb: boolean): DataTexture {
  const tex = new DataTexture(data, w, h, RGBAFormat, UnsignedByteType)
  // Pixel arrays are top row first; flip so the image's top lands at v = 1.
  tex.flipY = true
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  tex.magFilter = LinearFilter
  tex.minFilter = LinearMipmapLinearFilter
  tex.generateMipmaps = true
  // Rugs are seen at grazing angles; three clamps this to what the GPU supports.
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

/** Rasterize -> relief -> normal map -> GPU textures. Browser only. */
export async function buildRugTextures(rug: ResolvedRug, opts: RugTextureOptions): Promise<RugTextures> {
  const bitmap = await rasterizeRug(rug.art, { widthFt: rug.widthFt, heightFt: rug.heightFt, pxPerFt: opts.pxPerFt, maxPx: opts.maxPx })
  const color = bitmapPixels(bitmap)
  bitmap.close()
  const { width: w, height: h } = color
  const field = buildHeightField(rug.design, color)
  // Which fibre each pixel is, read from the design's own colours before the finish shifts them.
  const fibres = fibreIndex(rug.design, color.data, w, h)
  if (rug.design.kind === 'doc') applyFinish(color.data, w, h, rug.design.doc)
  const mats = buildMaterialMaps(fibres, color.data, w, h)
  // Relief steps are in 0..1 per pixel; keep the look the same at any density.
  const strength = (opts.normalStrength ?? 3) * (opts.pxPerFt / 96)
  const normal = await computeNormalMap(field.data, w, h, strength)
  const rgba = color.data
  if (field.mask) for (let i = 0; i < field.mask.length; i++) rgba[i * 4 + 3] = field.mask[i]
  else for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = 255
  const map = dataTexture(rgba, w, h, true)
  const normalMap = dataTexture(normal, w, h, false)
  const surfaceMap = mats.surface ? dataTexture(mats.surface, w, h, false) : undefined
  const sheenMap = mats.sheen ? dataTexture(mats.sheen, w, h, true) : undefined
  const anisotropyMap = mats.aniso ? dataTexture(mats.aniso, w, h, false) : null
  return {
    map,
    normalMap,
    surfaceMap,
    sheenMap,
    anisotropyMap,
    anisotropy: mats.anisotropy,
    fibre: mats.uniform,
    width: w,
    height: h,
    dispose() {
      map.dispose()
      normalMap.dispose()
      surfaceMap?.dispose()
      sheenMap?.dispose()
      anisotropyMap?.dispose()
    },
  }
}

export const rugTextureCache = new LruCache<RugTextures>(RUG_TEXTURE_CACHE_SIZE, (t) => t.dispose())

/** Cached `buildRugTextures`: same design + density -> the same textures. */
export function loadRugTextures(rug: ResolvedRug, opts: RugTextureOptions): Promise<RugTextures> {
  const key = `${rug.key}@${opts.pxPerFt}/${opts.maxPx}/${opts.normalStrength ?? 3}`
  return rugTextureCache.get(key, () => buildRugTextures(rug, opts))
}
