import { GRAIN_URL, fibreMaterial } from '../../data/materials'
import type { Fibre, GrainId } from '../../data/materials'
import type { PileTexture } from '../../types/freeform'
import { heightToNormal } from '../rug/normal'
import { grainFrom, shadeRug } from '../rug/shade'
import { LruCache } from '../rug/textureCache'
import { fabricPatch } from './fabricPatch'

/**
 * A small picture of one yarn colour in one fibre and pile, lit from the top left: what a fabric
 * chip shows in place of a flat colour. Browser only (canvas). Cached by content.
 */
export interface ChipSpec {
  hex: string
  fibre: Fibre | string
  pile?: PileTexture
  flat?: boolean
  /** Side in px. */
  px: number
  /** Knots across the chip (fewer reads as a closer look). */
  knots?: number
}

export interface Grain {
  g: Float32Array
  w: number
  h: number
}

const grains = new Map<GrainId, Promise<Grain | null>>()

/** A fibre's grain photo as values about 1 (loaded once; renders fine without it). */
export function loadGrain(id: GrainId, depth = 0.5): Promise<Grain | null> {
  let p = grains.get(id)
  if (!p) {
    p = fetch(GRAIN_URL[id])
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('no grain'))))
      .then((b) => createImageBitmap(b))
      .then((bmp) => {
        const c = new OffscreenCanvas(bmp.width, bmp.height)
        const g = c.getContext('2d', { willReadFrequently: true })
        if (!g) throw new Error('Canvas unavailable')
        g.drawImage(bmp, 0, 0)
        bmp.close()
        const px = g.getImageData(0, 0, c.width, c.height)
        return { g: grainFrom(px.data, px.width, px.height, depth), w: px.width, h: px.height }
      })
      .catch(() => null)
    grains.set(id, p)
  }
  return p
}

export const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.replace('#', '').slice(0, 6), 16) || 0
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

async function render(spec: ChipSpec): Promise<string> {
  const f = fibreMaterial(spec.fibre)
  const n = Math.max(16, Math.round(spec.px))
  const grain = await loadGrain(f.render.grain)
  const knots = spec.knots ?? Math.max(3, Math.round(n / 14))
  const patch = fabricPatch(hexRgb(spec.hex), f, { size: n, knots, pile: spec.pile, flat: spec.flat, grain: grain?.g, grainW: grain?.w, grainH: grain?.h })
  // Relief per knot, not per pixel, so a big swatch reads like a small one, only sharper; glossy
  // fibres lie flatter (as in the 3D close-up).
  const normal = heightToNormal(patch.height, n, n, 0.75 * (n / knots) * f.render.relief ** 1.6)
  const surface = new Uint8Array(n * n * 4)
  for (let i = 0; i < n * n; i++) {
    surface[i * 4 + 1] = f.render.roughness * 255
    surface[i * 4 + 3] = f.render.specular * 255
  }
  const shaded = shadeRug(patch.color, normal, n, n, { edge: 0, ambient: 0.5, surface })
  // Glossy fibres photograph with a broad band of reflected window light across them, broken up
  // by the pile; matte ones don't.
  const gloss = Math.min(1, Math.max(0, (0.72 - f.render.roughness) / 0.3))
  if (gloss > 0) {
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const t = (x * 0.35 + y) / (n * 1.35) - 0.38
        const band = Math.exp(-(t * t) / 0.03) * gloss * 0.32 * (0.6 + 0.8 * (patch.height[y * n + x] - 0.45))
        if (band <= 0) continue
        const i = (y * n + x) * 4
        for (let k = 0; k < 3; k++) shaded[i + k] = shaded[i + k] + (235 - shaded[i + k]) * band * (0.55 + 0.45 * (shaded[i + k] / 255))
      }
  }
  const canvas = new OffscreenCanvas(n, n)
  canvas.getContext('2d')?.putImageData(new ImageData(shaded, n, n), 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 })
  return URL.createObjectURL(blob)
}

const cache = new LruCache<string>(240, (url) => URL.revokeObjectURL(url))

export function fabricChipUrl(spec: ChipSpec): Promise<string> {
  const key = `${spec.hex}|${spec.fibre}|${spec.pile ?? 'cut'}|${spec.flat ? 1 : 0}|${spec.px}|${spec.knots ?? ''}`
  return cache.get(key, () => render(spec))
}
