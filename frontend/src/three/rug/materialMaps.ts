import { fibreMaterial } from '../../data/materials'
import type { FibreMaterial } from '../../data/materials'
import { sheenColour } from '../../data/materials'
import { compositeChart } from '../../studio/weaveRules'
import type { RugDesign } from './rugSource'

/**
 * Which fibre each pixel of a rug is, and the per-pixel material maps that follow from it, so one
 * rug can be wool in the field and silk in the highlights. Pure, no DOM, no three.js.
 *
 * - surface: G = roughness, A = specular intensity (three reads roughnessMap.g, specularIntensityMap.a)
 * - sheen:   RGB = sheen colour (sRGB), A = sheen roughness (sheenColorMap.rgb, sheenRoughnessMap.a)
 * - aniso:   RG = direction (along the rug's length), B = strength (anisotropyMap), or null
 */
export interface FibreIndex {
  fibres: FibreMaterial[]
  /** Per pixel, an index into `fibres`; null when the whole rug is `fibres[0]`. */
  index: Uint8Array | null
}

export interface MaterialMaps {
  /** Null when one fibre with a plain sheen covers the rug: use `uniform`'s scalars instead. */
  surface: Uint8Array | null
  sheen: Uint8Array | null
  aniso: Uint8Array | null
  /** Strongest anisotropy anywhere on the rug, 0..1 (the material's scalar). */
  anisotropy: number
  /** Lowest roughness anywhere: lets callers skip specular work for an all-wool rug. */
  minRoughness: number
  /** The one fibre, when the whole rug is it. */
  uniform: FibreMaterial | null
}

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.replace('#', '').slice(0, 6), 16) || 0
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Pixel -> fibre: exact from the knot chart where there is one, else the nearest swatch colour. */
export function fibreIndex(design: RugDesign, rgba: ArrayLike<number>, w: number, h: number): FibreIndex {
  // Candidate yarns: colour and fibre.
  const yarns: { rgb: [number, number, number]; fibre: FibreMaterial }[] = []
  if (design.kind === 'doc') {
    for (const y of design.doc.palette) yarns.push({ rgb: hex(design.swatchesById.get(y.swatchId)?.swatchColor ?? '#888888'), fibre: fibreMaterial(y.fibre) })
  } else {
    const ids = new Set<string>()
    if (design.kind === 'tile') for (const pieces of Object.values(design.state.tiles)) for (const p of pieces) ids.add(p.swatchId)
    else {
      ids.add(design.state.ground.swatchId)
      for (const s of design.state.shapes) ids.add(s.swatchId)
    }
    for (const id of ids) {
      const sw = design.swatchesById.get(id)
      if (sw) yarns.push({ rgb: hex(sw.swatchColor), fibre: fibreMaterial(sw.fibre) })
    }
  }
  const fibres = [...new Set(yarns.map((y) => y.fibre))]
  if (fibres.length <= 1) return { fibres: fibres.length ? fibres : [fibreMaterial('wool')], index: null }
  const slot = new Map(fibres.map((f, i) => [f, i]))
  const index = new Uint8Array(w * h)

  if (design.kind === 'doc') {
    const flat = compositeChart(design.doc)
    if (flat) {
      const bySlot = yarns.map((y) => slot.get(y.fibre) ?? 0)
      for (let y = 0; y < h; y++) {
        const row = Math.min(flat.rows - 1, Math.floor((y * flat.rows) / h)) * flat.cols
        for (let x = 0; x < w; x++) {
          const v = flat.cells[row + Math.min(flat.cols - 1, Math.floor((x * flat.cols) / w))]
          index[y * w + x] = v ? bySlot[v - 1] ?? 0 : 0
        }
      }
      return { fibres, index }
    }
  }
  // No chart: the nearest yarn colour decides (good enough for flat-dyed shapes and tiles).
  const cache = new Map<number, number>()
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2)
    let s = cache.get(key)
    if (s === undefined) {
      let best = Infinity
      s = 0
      for (const y of yarns) {
        const d = (y.rgb[0] - r) ** 2 + (y.rgb[1] - g) ** 2 + (y.rgb[2] - b) ** 2
        if (d < best) {
          best = d
          s = slot.get(y.fibre) ?? 0
        }
      }
      cache.set(key, s)
    }
    index[i] = s
  }
  return { fibres, index }
}

/** Cheap per-pixel hash in 0..1, for a little roughness variation fibre to fibre. */
const hash = (x: number, y: number) => {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

/** Material maps from a fibre index and the rug's (finished) colour image, RGBA w x h. */
export function buildMaterialMaps(fi: FibreIndex, rgba: ArrayLike<number>, w: number, h: number): MaterialMaps {
  const anisotropy = Math.max(...fi.fibres.map((f) => f.render.anisotropy))
  const uniform = fi.index ? null : fi.fibres[0]
  // One matte fibre with an untinted sheen (an all-wool rug): scalars do, no maps to upload.
  if (uniform && uniform.render.sheenTint === 0 && !anisotropy) return { surface: null, sheen: null, aniso: null, anisotropy: 0, minRoughness: uniform.render.roughness, uniform }
  const surface = new Uint8Array(w * h * 4)
  const sheen = new Uint8Array(w * h * 4)
  const aniso = anisotropy > 0 ? new Uint8Array(w * h * 4) : null
  let minRoughness = 1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const f = fi.fibres[fi.index ? fi.index[i] : 0] ?? fi.fibres[0]
      const r = f.render
      const rough = Math.min(1, Math.max(0.05, r.roughness + (hash(x, y) - 0.5) * 0.08))
      if (rough < minRoughness) minRoughness = rough
      const o = i * 4
      surface[o] = 0
      surface[o + 1] = Math.round(rough * 255)
      surface[o + 2] = 0
      surface[o + 3] = Math.round(r.specular * 255)
      const s = sheenColour([rgba[o], rgba[o + 1], rgba[o + 2]], f)
      sheen[o] = s[0]
      sheen[o + 1] = s[1]
      sheen[o + 2] = s[2]
      sheen[o + 3] = Math.round(r.sheenRoughness * 255)
      if (aniso) {
        // Direction (0, 1) in tangent space: the pile leans down the rug's length.
        aniso[o] = 128
        aniso[o + 1] = 255
        aniso[o + 2] = anisotropy ? Math.round((r.anisotropy / anisotropy) * 255) : 0
        aniso[o + 3] = 255
      }
    }
  }
  return { surface, sheen, aniso, anisotropy, minRoughness, uniform }
}
