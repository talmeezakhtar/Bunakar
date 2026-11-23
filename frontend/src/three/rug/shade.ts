/**
 * Pure 2D "woven rug" shading, no DOM: lights a rug's colour image with its normal map (the same
 * one the 3D view uses) from the top left, multiplies in wool-pile grain, darkens the edges a
 * touch where the binding rolls under, and keeps the alpha mask (unpainted tiles stay clear).
 *
 * `color` RGBA8 and `normal` RGBA8 (from `heightToNormal`: x right, y up the image) share w x h.
 * `grain` is optional pile grain: values around 1 (e.g. 0.85..1.15), tiled at `grainW` x `grainH`.
 */
export interface ShadeOptions {
  grain?: Float32Array | null
  grainW?: number
  grainH?: number
  /** Light direction (towards the light), image space: x right, y up, z out of the rug. */
  light?: [number, number, number]
  /** Flat light that reaches everything, 0..1. */
  ambient?: number
  /** Edge darkening width in px. */
  edge?: number
  /** Per-fibre surface map (RGBA, w x h; G roughness, A specular), from `buildMaterialMaps`. */
  surface?: ArrayLike<number> | null
}

export function shadeRug(color: ArrayLike<number>, normal: ArrayLike<number>, w: number, h: number, opts: ShadeOptions = {}): Uint8ClampedArray<ArrayBuffer> {
  const { grain = null, grainW = 1, grainH = 1, light = [-0.45, 0.55, 0.7], ambient = 0.58, edge = Math.max(2, Math.round(Math.min(w, h) * 0.012)), surface = null } = opts
  const len = Math.hypot(light[0], light[1], light[2])
  const lx = light[0] / len
  const ly = light[1] / len
  const lz = light[2] / len
  // A flat patch of pile should keep its own colour: normalise so n = (0, 0, 1) shades to 1.
  const flat = ambient + (1 - ambient) * lz
  // Half vector for a viewer straight above: only glossy fibres (silk) catch a highlight on the
  // knot faces tilted towards it; a flat patch sits well off the peak, so its colour holds.
  const hl = Math.hypot(lx, ly, lz + 1)
  const hx = lx / hl
  const hy = ly / hl
  const hz = (lz + 1) / hl
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const nx = normal[i] / 127.5 - 1
      const ny = normal[i + 1] / 127.5 - 1
      const nz = normal[i + 2] / 127.5 - 1
      const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz)
      let k = (ambient + (1 - ambient) * diffuse) / flat
      if (grain) k *= grain[(y % grainH) * grainW + (x % grainW)]
      const d = Math.min(x, y, w - 1 - x, h - 1 - y)
      if (d < edge) k *= 0.82 + 0.18 * (d / edge)
      let spec = 0
      if (surface) {
        const rough = surface[i + 1] / 255
        // Matte fibres (wool, cotton, jute) get none, so their look is unchanged.
        const gloss = Math.min(1, Math.max(0, (0.72 - rough) / 0.3))
        if (gloss > 0) {
          const shin = Math.min(160, 2 / (rough * rough * rough * rough + 1e-4) - 2)
          const ndh = Math.max(0, nx * hx + ny * hy + nz * hz)
          spec = gloss * (surface[i + 3] / 255) * 0.55 * Math.pow(ndh, shin) * ((shin + 2) / 40)
          if (spec > 0.6) spec = 0.6
        }
      }
      // A dielectric highlight is mostly white, tinted a little by the dye.
      out[i] = color[i] * k + spec * (170 + color[i] * 0.33)
      out[i + 1] = color[i + 1] * k + spec * (170 + color[i + 1] * 0.33)
      out[i + 2] = color[i + 2] * k + spec * (170 + color[i + 2] * 0.33)
      out[i + 3] = color[i + 3]
    }
  }
  return out
}

/** Pile grain from a grey photo's pixels: values around 1, `depth` controls the spread. */
export function grainFrom(rgba: ArrayLike<number>, w: number, h: number, depth = 0.3): Float32Array {
  const g = new Float32Array(w * h)
  let mean = 0
  for (let i = 0; i < w * h; i++) {
    g[i] = (rgba[i * 4] + rgba[i * 4 + 1] + rgba[i * 4 + 2]) / 765
    mean += g[i]
  }
  mean /= w * h || 1
  for (let i = 0; i < g.length; i++) g[i] = 1 + (g[i] - mean) * depth * 2
  return g
}
