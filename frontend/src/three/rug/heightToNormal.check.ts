// Self-check for the normal map: `npx tsx src/three/rug/heightToNormal.check.ts`.
// Flat -> straight up; slopes and a bump point the way three.js expects (OpenGL, green = up the image).
import { heightToNormal } from './normal'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}
const px = (n: Uint8Array, w: number, x: number, y: number) => Array.from(n.slice((y * w + x) * 4, (y * w + x) * 4 + 4))

{
  const w = 8
  const h = 6
  const n = heightToNormal(new Float32Array(w * h).fill(0.5), w, h, 4)
  for (let i = 0; i < w * h; i++) assert(px(n, w, i % w, Math.floor(i / w)).join() === '128,128,255,255', 'flat field must be (128,128,255)')
}
{
  // Rising to the right -> normal leans left (red < 128), green neutral.
  const w = 9
  const h = 9
  const ramp = Float32Array.from({ length: w * h }, (_, i) => (i % w) * 0.1)
  const [r, g, b] = px(heightToNormal(ramp, w, h, 4), w, 4, 4)
  assert(r < 128 && Math.abs(g - 128) <= 1 && b > 128, `x ramp normal ${[r, g, b]}`)
  // Rising down the image -> normal leans up the image (green > 128).
  const down = Float32Array.from({ length: w * h }, (_, i) => Math.floor(i / w) * 0.1)
  const [r2, g2] = px(heightToNormal(down, w, h, 4), w, 4, 4)
  assert(g2 > 128 && Math.abs(r2 - 128) <= 1, `y ramp normal ${[r2, g2]}`)
}
{
  // A bump: right of the peak leans right, above it leans up, and stronger relief leans further.
  const w = 15
  const h = 15
  const bump = Float32Array.from({ length: w * h }, (_, i) => Math.exp(-((((i % w) - 7) ** 2 + (Math.floor(i / w) - 7) ** 2) / 8)))
  const weak = heightToNormal(bump, w, h, 1)
  const strong = heightToNormal(bump, w, h, 6)
  assert(px(strong, w, 7, 7).slice(0, 2).join() === '128,128', 'peak is flat')
  assert(px(strong, w, 10, 7)[0] > 140, 'right of the peak leans right')
  assert(px(strong, w, 4, 7)[0] < 116, 'left of the peak leans left')
  assert(px(strong, w, 7, 4)[1] > 140, 'above the peak leans up')
  assert(px(strong, w, 10, 7)[0] > px(weak, w, 10, 7)[0], 'strength deepens relief')
  // Every texel is a unit vector.
  for (let i = 0; i < w * h; i++) {
    const [x, y, z] = px(strong, w, i % w, Math.floor(i / w)).map((c) => c / 127.5 - 1)
    assert(Math.abs(Math.hypot(x, y, z) - 1) < 0.02 && z > 0, 'normal not unit / facing out')
  }
}
{
  // Edges clamp instead of reading out of bounds.
  const n = heightToNormal(Float32Array.from([0, 1, 0, 1]), 2, 2, 2)
  assert(n.length === 16 && n.every((v) => Number.isFinite(v)), '2x2 edge case')
}
console.log('heightToNormal: ok')
