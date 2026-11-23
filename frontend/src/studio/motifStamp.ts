/**
 * Catalogue motifs as knot charts. A motif is vector paths tagged with colour roles; this draws
 * each path as a mask at the chart's size (paths in order, so later ones win) and maps the roles
 * to the rug's own yarns. Browser only (it needs a canvas); `layout.ts` takes it as a `Stamper`.
 */
import { getMotif } from '../data/motifs/catalogue'
import { parseHex, resolveRoles } from '../data/motifs/palette'
import type { MotifArt, MotifRole } from '../data/motifs/types'
import { MOTIF_ROLES } from '../data/motifs/types'
import type { Patch } from './chartOps'
import type { Stamper } from './layout'

/** Rasterise at most this many pixels, then scale up: motifs are bold shapes, not fine detail. */
const MAX_PX = 160_000

const roleMasks = new Map<string, Uint8Array>()

/** For each cell, 1 + the index in MOTIF_ROLES of the top-most path over it, or 0. */
function rasterRoles(key: string, art: MotifArt, w: number, h: number): Uint8Array {
  const hit = roleMasks.get(key)
  if (hit) return hit
  const s = Math.min(1, Math.sqrt(MAX_PX / (w * h)))
  const rw = Math.max(1, Math.round(w * s))
  const rh = Math.max(1, Math.round(h * s))
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(rw, rh) : Object.assign(document.createElement('canvas'), { width: rw, height: rh })
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  const [, , vw, vh] = art.viewBox
  const roles = new Uint8Array(rw * rh)
  for (const layer of art.layers) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, rw, rh)
    ctx.setTransform(rw / vw, 0, 0, rh / vh, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fill(new Path2D(layer.d))
    const px = ctx.getImageData(0, 0, rw, rh).data
    const v = MOTIF_ROLES.indexOf(layer.role) + 1
    // Outlines are thin: keep any knot they half-cover, or they break up at coarse densities.
    const min = layer.role === 'outline' ? 48 : 128
    for (let i = 0; i < roles.length; i++) if (px[i * 4 + 3] >= min) roles[i] = v
  }
  let out = roles
  if (rw !== w || rh !== h) {
    out = new Uint8Array(w * h)
    for (let r = 0; r < h; r++) {
      const sr = Math.min(rh - 1, Math.floor((r * rh) / h)) * rw
      for (let c = 0; c < w; c++) out[r * w + c] = roles[sr + Math.min(rw - 1, Math.floor((c * rw) / w))]
    }
  }
  if (roleMasks.size > 200) roleMasks.clear()
  roleMasks.set(key, out)
  return out
}

const dist = (a: [number, number, number], b: [number, number, number]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

/**
 * Which yarn (1-based palette index) each role takes. The motif's own ground role shows the
 * ground under it (0); the others come from the rug's yarns, never the ground's.
 */
export function roleYarns(art: MotifArt, palette: string[], ground: number, solid = false): number[] {
  const others = palette.map((hex, i) => ({ hex, i: i + 1 })).filter((p) => p.i !== ground)
  if (!others.length) return MOTIF_ROLES.map(() => 0)
  // Earlier yarns lead (primary), as the rug's palette is ordered ground first.
  const colors = resolveRoles(art, others.map((p, k) => ({ color: p.hex, weight: others.length - k })))
  return MOTIF_ROLES.map((role: MotifRole) => {
    if (role === 'ground') return solid ? ground : 0
    const want = parseHex(colors[role] ?? '')
    if (!want) return others[0].i
    let best = others[0]
    for (const p of others) if (dist(parseHex(p.hex) ?? [0, 0, 0], want) < dist(parseHex(best.hex) ?? [0, 0, 0], want)) best = p
    return best.i
  })
}

export function artOf(motifId: string, part: 'piece' | 'unit' | 'corner'): MotifArt | null {
  const spec = getMotif(motifId)
  if (!spec) return null
  return part === 'corner' && spec.kind === 'border' ? spec.corner : spec
}

/** A motif as a chart patch, w x h cells, in the rug's yarns. */
export function motifPatch(motifId: string, part: 'piece' | 'unit' | 'corner', w: number, h: number, palette: string[], ground: number, solid = false): Patch | null {
  const art = artOf(motifId, part)
  if (!art || w < 1 || h < 1) return null
  const mask = rasterRoles(`${motifId}:${part}:${w}x${h}`, art, w, h)
  const yarns = roleYarns(art, palette, ground, solid)
  const cells = new Uint8Array(w * h)
  for (let i = 0; i < cells.length; i++) if (mask[i]) cells[i] = yarns[mask[i] - 1]
  return { cols: w, rows: h, cells }
}

/** A Stamper over the catalogue for a palette of hex colours (palette[0] is yarn 1). */
export function catalogueStamper(palette: string[]): Stamper {
  return {
    aspect: (id) => getMotif(id)?.aspect,
    draw: (id, part, w, h, ground, solid) => motifPatch(id, part, w, h, palette, ground, solid),
  }
}
