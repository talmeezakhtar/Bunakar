// Self-check for the woven-rug shading: `npx tsx src/three/rug/shade.check.ts`.
import { grainFrom, shadeRug } from './shade'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

const w = 40
const h = 30
const color = new Uint8ClampedArray(w * h * 4)
const flat = new Uint8Array(w * h * 4)
for (let i = 0; i < w * h; i++) {
  color.set([200, 100, 50, 255], i * 4)
  flat.set([128, 128, 255, 255], i * 4)
}
// A flat rug keeps its colour in the middle, and darkens at the edge.
const out = shadeRug(color, flat, w, h, { edge: 4 })
const mid = ((h >> 1) * w + (w >> 1)) * 4
assert(Math.abs(out[mid] - 200) <= 3 && Math.abs(out[mid + 1] - 100) <= 2, `flat middle keeps colour, got ${out[mid]},${out[mid + 1]}`)
assert(out[0] < out[mid], 'corner is darker than the middle')
assert(out[mid + 3] === 255, 'alpha kept')

// A slope facing the light (top left) is brighter than one facing away.
const toward = new Uint8Array(w * h * 4).fill(0)
const away = new Uint8Array(w * h * 4).fill(0)
for (let i = 0; i < w * h; i++) {
  toward.set([90, 166, 230, 255], i * 4)
  away.set([166, 90, 230, 255], i * 4)
}
assert(shadeRug(color, toward, w, h)[mid] > shadeRug(color, away, w, h)[mid], 'lit slope is brighter')

// Transparent (unpainted) pixels stay transparent.
const holes = color.slice()
holes[mid + 3] = 0
assert(shadeRug(holes, flat, w, h)[mid + 3] === 0, 'mask kept')

// Grain averages to about 1.
const px = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255])
const g = grainFrom(px, 2, 1, 0.3)
assert(Math.abs((g[0] + g[1]) / 2 - 1) < 1e-6 && g[0] < 1 && g[1] > 1, 'grain centred on 1')

console.log('ok: woven rug shading')
