import { fibreMaterial } from '../../data/materials'
import type { PileTexture } from '../../types/freeform'
import { heightToNormal } from '../rug/normal'
import { shadeRug } from '../rug/shade'
import { fabricPatch } from './fabricPatch'

/**
 * One knot of a fibre and pile as a grey relief, mean 128: laid over a chart cell with the canvas
 * 'overlay' blend, it keeps the cell's dye and adds the knot's dome, strands and (silk) shine.
 */
export function knotRelief(fibre: string, pile: PileTexture | undefined, flat: boolean, px = 24): Uint8ClampedArray<ArrayBuffer> {
  const f = fibreMaterial(fibre)
  const patch = fabricPatch([128, 128, 128], f, { size: px, knots: 1, pile, flat, seed: 3 })
  const normal = heightToNormal(patch.height, px, px, 2.2 * px * f.render.relief ** 0.3)
  const surface = new Uint8Array(px * px * 4)
  for (let i = 0; i < px * px; i++) {
    surface[i * 4 + 1] = f.render.roughness * 255
    surface[i * 4 + 3] = f.render.specular * 255
  }
  const out = shadeRug(patch.color, normal, px, px, { edge: 0, ambient: 0.45, surface })
  // Centre on mid-grey so the overlay neither lightens nor darkens the cell on average.
  let sum = 0
  for (let i = 0; i < px * px; i++) sum += out[i * 4]
  const shift = 128 - sum / (px * px)
  for (let i = 0; i < px * px; i++) {
    const v = Math.max(0, Math.min(255, out[i * 4] + shift))
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v
    out[i * 4 + 3] = 255
  }
  return out
}

const sprites = new Map<string, HTMLCanvasElement>()

/** `knotRelief` as a cached canvas, for drawImage. Browser only. */
export function knotSprite(fibre: string, pile: PileTexture | undefined, flat: boolean): HTMLCanvasElement {
  const key = `${fibre}|${pile ?? 'cut'}|${flat}`
  let c = sprites.get(key)
  if (!c) {
    const px = 24
    c = document.createElement('canvas')
    c.width = c.height = px
    c.getContext('2d')!.putImageData(new ImageData(knotRelief(fibre, pile, flat, px), px, px), 0, 0)
    sprites.set(key, c)
  }
  return c
}
