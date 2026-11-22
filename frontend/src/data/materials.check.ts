// Self-check for the fibre table and per-fibre maps: `npx tsx src/data/materials.check.ts`.
import { FIBRES, MATERIALS, fibreColour, fibreMaterial, sheenColour } from './materials'
import { buildMaterialMaps, fibreIndex } from '../three/rug/materialMaps'
import { shadeRug } from '../three/rug/shade'
import { knotRelief } from '../three/fabric/knotSprite'
import { newRug } from '../studio/model'
import type { Swatch } from '../types/swatch'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

// Every fibre is complete and in range.
for (const id of FIBRES) {
  const m = MATERIALS[id]
  assert(m.id === id, `${id}: id matches key`)
  for (const [k, v] of Object.entries(m.render)) if (typeof v === 'number') assert(v >= 0 && v <= 1.2, `${id}.${k} in range`)
  for (const k of ['softness', 'shine', 'durability'] as const) assert(m.facts[k] >= 1 && m.facts[k] <= 5, `${id}.${k} 1..5`)
  assert(m.name && m.description && m.facts.care && m.facts.rooms.length, `${id}: has text`)
}
assert(FIBRES.length === Object.keys(MATERIALS).length, 'FIBRES lists every material')

// Old designs: 'wool' and unknown ids resolve to wool, which leaves colours untouched.
assert(fibreMaterial('wool') === MATERIALS.wool && fibreMaterial('nylon') === MATERIALS.wool && fibreMaterial(undefined) === MATERIALS.wool, 'fallback to wool')
assert(fibreColour(180, 30, 40, MATERIALS.wool).join() === '180,30,40', 'wool keeps its colour')
assert(sheenColour([180, 30, 40], MATERIALS.wool).join() === '61,55,49', 'wool keeps its old sheen')
// Silk is glossier, shinier and takes its sheen from the dye.
assert(MATERIALS.silk.render.roughness < MATERIALS.wool.render.roughness - 0.3, 'silk glossier than wool')
const silkSheen = sheenColour([180, 30, 40], MATERIALS.silk)
assert(silkSheen[0] > silkSheen[1] * 1.5, 'silk sheen is red for a red dye')

// A knotted rug, wool field and a silk yarn: exact per-pixel fibre from the chart.
const sw = (id: string, c: string): Swatch => ({ id, familyId: 'f', familyName: 'F', colorName: id, swatchColor: c, categories: [] })
const rug = newRug({ construction: 'knotted', widthFt: 2, heightFt: 2, density: { across: 1, down: 1 }, palette: [{ swatchId: 'a', fibre: 'wool' }, { swatchId: 'b', fibre: 'silk' }] })
const chart = rug.layers.find((l) => l.kind === 'chart')
assert(chart && chart.kind === 'chart', 'rug has a chart')
if (chart?.kind === 'chart') {
  chart.cells.fill(1)
  for (let i = 0; i < chart.cols * (chart.rows / 2); i++) chart.cells[i] = 2 // top half silk
}
const swatches = new Map([sw('a', '#b8573e'), sw('b', '#1c2444')].map((s) => [s.id, s]))
const w = 24
const h = 24
const rgba = new Uint8ClampedArray(w * h * 4).fill(200)
const fi = fibreIndex({ kind: 'doc', doc: rug, swatchesById: swatches }, rgba, w, h)
assert(fi.index && fi.fibres.length === 2, 'two fibres, indexed')
const top = fi.fibres[fi.index![2 * w + 2]]
const bottom = fi.fibres[fi.index![(h - 3) * w + 2]]
assert(top.id === 'silk' && bottom.id === 'wool', `chart decides the fibre (got ${top.id}/${bottom.id})`)
const maps = buildMaterialMaps(fi, rgba, w, h)
assert(maps.surface && maps.sheen && maps.aniso, 'mixed rug gets maps')
assert(maps.surface![(2 * w + 2) * 4 + 1] < maps.surface![((h - 3) * w + 2) * 4 + 1] - 60, 'silk pixels are less rough')
assert(maps.anisotropy === MATERIALS.silk.render.anisotropy, 'anisotropy from silk')

// No chart: nearest swatch colour picks the fibre (tile/freeform designs use the swatch fibre).
const free = { kind: 'freeform' as const, state: { id: null, name: '', widthFt: 1, heightFt: 1, rugCategory: 'area' as const, backgroundId: 'none' as const, ground: { swatchId: 'a', texture: 'cut' as const, carve: 'none' as const, carveAngle: 0, pile: 'standard' as const }, shapes: [], myStyles: [] }, swatchesById: new Map([['a', { ...sw('a', '#b8573e'), fibre: 'silk' as const }]]) }
const uni = fibreIndex(free, rgba, w, h)
assert(!uni.index && uni.fibres[0].id === 'silk', 'one swatch, one fibre, no index')
// All wool: no maps at all.
const wool = buildMaterialMaps({ fibres: [MATERIALS.wool], index: null }, rgba, w, h)
assert(!wool.surface && wool.uniform === MATERIALS.wool, 'all-wool rug needs no maps')

// 2D shading: a knot face tilted to the light glints on silk, never on wool.
const color = new Uint8ClampedArray(4 * 4).fill(100)
const tilt = new Uint8Array([Math.round(127.5 + 127.5 * -0.24), Math.round(127.5 + 127.5 * 0.29), Math.round(127.5 + 127.5 * 0.93), 255])
const normal = new Uint8Array(16)
for (let i = 0; i < 4; i++) normal.set(tilt, i * 4)
const surf = (f: typeof MATERIALS.wool) => {
  const s = new Uint8Array(16)
  for (let i = 0; i < 4; i++) s.set([0, f.render.roughness * 255, 0, f.render.specular * 255], i * 4)
  return s
}
const plain = shadeRug(color, normal, 2, 2, { edge: 0 })
const woolLit = shadeRug(color, normal, 2, 2, { edge: 0, surface: surf(MATERIALS.wool) })
const silkLit = shadeRug(color, normal, 2, 2, { edge: 0, surface: surf(MATERIALS.silk) })
assert(woolLit[0] === plain[0], 'wool: no highlight')
assert(silkLit[0] > plain[0] + 20, `silk: a highlight (${plain[0]} -> ${silkLit[0]})`)
// Chart knots: neutral on average (the dye holds), with real relief; silk catches more light.
const knot = (f: string) => {
  const k = knotRelief(f, 'cut', false, 24)
  let sum = 0
  let max = 0
  let min = 255
  for (let i = 0; i < k.length; i += 4) {
    sum += k[i]
    max = Math.max(max, k[i])
    min = Math.min(min, k[i])
  }
  return { mean: sum / (k.length / 4), max, min }
}
const kw = knot('wool')
const ks = knot('silk')
assert(Math.abs(kw.mean - 128) < 2 && Math.abs(ks.mean - 128) < 2, 'knot relief is centred on grey')
assert(kw.max - kw.min > 40, `wool knot has relief (${kw.min}..${kw.max})`)
assert(ks.max > kw.max, `silk knot shines brighter (${ks.max} vs ${kw.max})`)
console.log('materials: ok')
