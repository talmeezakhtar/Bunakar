// Self-check for photo to chart: `npx tsx src/studio/photoChart.check.ts`.
import { kmeans, oklab, photoToChart, sampleGrid, tidy } from './photoChart'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

// A 200 x 120 "photo": left half red, right half navy, a white disc in the middle, a little noise.
const W = 200
const H = 120
const data = new Uint8ClampedArray(W * H * 4)
let seed = 3
const noise = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 21) - 10
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4
    const disc = (x - 100) ** 2 + (y - 60) ** 2 < 25 ** 2
    const [r, g, b] = disc ? [240, 236, 226] : x < 100 ? [150, 30, 40] : [30, 40, 90]
    data.set([r + noise(), g + noise(), b + noise(), 255], o)
  }
const full = { topLeft: { x: 0, y: 0 }, topRight: { x: W, y: 0 }, bottomRight: { x: W, y: H }, bottomLeft: { x: 0, y: H } }

// Sampling the whole photo straight: knot colours match the photo there.
const grid = sampleGrid({ data, width: W, height: H, quad: full, cols: 40, rows: 24 })
assert(grid[0] > 120 && grid[2] < 70 && grid[(24 * 40 - 1) * 3 + 2] > 70, 'corners sample red and navy')

// OKLab: white is light and grey, black is dark.
const lab = new Float32Array(6)
oklab(255, 255, 255, lab, 0)
oklab(0, 0, 0, lab, 3)
assert(Math.abs(lab[0] - 1) < 0.01 && Math.abs(lab[1]) < 0.01 && lab[3] < 0.01, 'oklab white and black')

// k-means finds the three colours.
const pts = new Float32Array(300 * 3)
for (let i = 0; i < 300; i++) oklab(i < 100 ? 200 : i < 200 ? 20 : 120, i < 100 ? 20 : i < 200 ? 200 : 120, 40, pts, i * 3)
const cent = kmeans(pts, 3)
const Ls = [0, 1, 2].map((c) => cent[c * 3]).sort()
assert(Ls[2] - Ls[0] > 0.05, 'three distinct centres')

// The whole pipeline, against a small yarn catalogue.
const yarns = [
  { id: 'wine', hex: '#7a2436' },
  { id: 'navy', hex: '#1f2a4a' },
  { id: 'ivory', hex: '#efe8da' },
  { id: 'green', hex: '#2f5d3a' },
  { id: 'gold', hex: '#d4a63a' },
]
const res = photoToChart({ data, width: W, height: H, quad: full, cols: 100, rows: 60, colors: 3, yarns, cleanup: 1 })
assert(res.swatchIds.length === 3 && new Set(res.swatchIds).size === 3 && res.swatchIds.includes('ivory'), `three yarns: ${res.swatchIds}`)
const at = (c: number, r: number) => res.swatchIds[res.cells[r * 100 + c] - 1]
assert(at(10, 10) === 'wine' && at(90, 50) === 'navy' && at(50, 30) === 'ivory', 'red, navy and the white disc land in the right yarns')
assert(res.counts[0] >= res.counts[1] && res.counts[1] >= res.counts[2], 'most used yarn first')

// Evening the light: a dark-to-light ramp flattens, a small spot survives.
{
  const { evenLight } = await import('./photoChart')
  const c = 80
  const r = 80
  const L = new Float32Array(c * r * 3)
  for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) L[(y * c + x) * 3] = 0.3 + (0.4 * y) / r + ((x - 40) ** 2 + (y - 40) ** 2 < 9 ? 0.3 : 0)
  evenLight(L, c, r)
  const at = (x: number, y: number) => L[(y * c + x) * 3]
  assert(Math.abs(at(10, 30) - at(10, 50)) < 0.06, `ramp flattened: ${at(10, 30)} vs ${at(10, 50)}`)
  assert(at(40, 40) - at(20, 40) > 0.2, 'the spot stays')
}

// Two reds the eye tells apart stay two yarns when the catalogue has two close reds.
{
  const { assignYarns, applySwaps } = await import('./photoChart')
  const lab3 = (hex: string) => {
    const o = new Float32Array(3)
    oklab(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), o, 0)
    return o
  }
  const cent = new Float32Array([...lab3('#8a2030'), ...lab3('#a23a2c'), ...lab3('#1f2a4a')])
  const ylab = ['#7a2436', '#9c3b2e', '#1f2a4a', '#efe8da'].map(lab3)
  const y = assignYarns(cent, [0, 1, 2], new Uint32Array([500, 300, 200]), ylab)
  assert(y[0] === 0 && y[1] === 1 && y[2] === 2, `close reds keep their own yarns: ${[...y]}`)
  const y2 = assignYarns(cent, [0, 1, 2], new Uint32Array([500, 300, 200]), ['#7a2436', '#1f2a4a', '#efe8da'].map(lab3))
  assert(y2[0] === 0 && y2[1] === 0, 'with one red in the catalogue, both reds share it')

  // Swaps: navy for ivory merges two yarns into one; counts follow.
  const swapped = applySwaps(res, { navy: 'ivory' })
  assert(swapped.swatchIds.length === 2 && swapped.swatchIds.includes('ivory') && !swapped.swatchIds.includes('navy'), `swap merges: ${swapped.swatchIds}`)
  assert(swapped.counts.reduce((a, b) => a + b, 0) === 6000, 'every knot still counted')
}

// A lone knot is tidied away; a 3 x 3 block stays.
const g = new Uint8Array(100).fill(1)
g[22] = 2
for (const i of [55, 56, 57, 65, 66, 67, 75, 76, 77]) g[i] = 3
const t = tidy(g, 10, 10, 1)
assert(t[22] === 1 && t[66] === 3 && t[55] === 3, 'tidy removes lone knots, keeps shapes')

console.log('photo chart: ok')
