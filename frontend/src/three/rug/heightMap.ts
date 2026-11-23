import type { RugDoc } from '../../studio/model'
import { shapeLayerState, tileLayerState } from '../../studio/convert'
import { shapePathFt } from '../../studio/compose'
import { cutPath, isPositionable } from '../../components/tileDesigner/cutShapes'
import type { FreeformDesignState, PileHeight, PileTexture, SurfaceFinish } from '../../types/freeform'
import type { TileDesignState } from '../../types/tileDesign'
import { tileKey } from '../../types/tileDesign'
import { contourLinesPath, flattenShape, shapePath } from '../../utils/freeformGeometry'
import type { RugDesign } from './rugSource'
import { fibreMaterial } from '../../data/materials'

/**
 * Relief for a rug, in image order (row 0 = top), values about 0..1: the design's own structure
 * (pile per tile or shape, seams, carving) drawn with Canvas 2D, then `finishHeight` adds a
 * high-pass of the colour image (the printed pattern reads as tufting) and tuft noise.
 */
export interface HeightField {
  width: number
  height: number
  data: Float32Array
  /** 255 where the rug exists, 0 for unpainted tiles; null when the whole rectangle is rug. */
  mask: Uint8Array | null
}

/** Pile levels (0..1 of the relief range). */
const TILE_PILE = 0.78
const PIECE_EDGE = 0.62
const TILE_SEAM = 0.4
const FREEFORM_PILE: Record<PileHeight, number> = { low: 0.55, standard: 0.7, high: 0.86 }
const TEXTURE_LIFT: Record<PileTexture, number> = { cut: 0, loop: -0.04, shag: 0.08, highlow: 0, photo: 0 }

type Ctx = OffscreenCanvasRenderingContext2D
const grey = (v: number) => {
  const c = Math.round(Math.min(1, Math.max(0, v)) * 255)
  return `rgb(${c},${c},${c})`
}

function canvas(w: number, h: number): Ctx {
  const ctx = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas unavailable')
  return ctx
}

function readRed(ctx: Ctx, w: number, h: number): Float32Array {
  const px = ctx.getImageData(0, 0, w, h).data
  const out = new Float32Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4] / 255
  return out
}

function tileRelief(state: TileDesignState, w: number, h: number): { data: Float32Array; mask: Uint8Array } {
  const sx = w / state.widthTiles
  const sy = h / state.heightTiles
  const ctx = canvas(w, h)
  const outlines: Path2D[] = []
  for (let row = 0; row < state.heightTiles; row++) {
    for (let col = 0; col < state.widthTiles; col++) {
      const pieces = state.tiles[tileKey(row, col)]
      if (!pieces) continue
      for (const piece of pieces) {
        // Same frame as renderTileFills: translate to the cell, spin fixed cuts about its centre.
        const rot = isPositionable(piece.cutType) ? 0 : piece.rotation
        const m = new DOMMatrix().scale(sx, sy).translate(col, row).translate(0.5, 0.5).rotate(rot).translate(-0.5, -0.5)
        const p = new Path2D()
        p.addPath(new Path2D(cutPath(piece.cutType, piece.slot, piece.rotation)), m)
        outlines.push(p)
      }
    }
  }
  ctx.fillStyle = grey(TILE_PILE)
  for (const p of outlines) ctx.fill(p)
  // Unpainted cells: whatever got no pile.
  const px = ctx.getImageData(0, 0, w, h).data
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4 + 3] >= 128 ? 255 : 0
  // Where cut pieces butt inside a tile: a fine 1px line.
  ctx.strokeStyle = grey(PIECE_EDGE)
  ctx.lineWidth = 1
  for (const p of outlines) ctx.stroke(p)
  // Tile seams: 1.5px channels on every tile boundary.
  ctx.strokeStyle = grey(TILE_SEAM)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let c = 0; c <= state.widthTiles; c++) {
    ctx.moveTo(c * sx, 0)
    ctx.lineTo(c * sx, h)
  }
  for (let r = 0; r <= state.heightTiles; r++) {
    ctx.moveTo(0, r * sy)
    ctx.lineTo(w, r * sy)
  }
  ctx.stroke()
  return { data: readRed(ctx, w, h), mask }
}

function freeformRelief(state: FreeformDesignState, w: number, h: number): Float32Array {
  const { widthFt: W, heightFt: H } = state
  const ctx = canvas(w, h)
  ctx.setTransform(w / W, 0, 0, h / H, 0, 0)
  const surfaces: { finish: SurfaceFinish; path: Path2D }[] = [
    ...(state.ground.swatchId ? [{ finish: state.ground, path: new Path2D(`M0,0H${W}V${H}H0Z`) }] : []),
    ...state.shapes.map((s) => ({ finish: s as SurfaceFinish, path: new Path2D(shapePath(s.points, s.smooth)) })),
  ]
  const around = surfaces.some((s) => s.finish.carve === 'contour') ? state.shapes.map((s) => flattenShape(s, 3)) : []
  const reach = Math.hypot(W, H)
  for (const { finish: f, path } of surfaces) {
    const pile = FREEFORM_PILE[f.pile] + TEXTURE_LIFT[f.texture]
    ctx.fillStyle = grey(pile)
    ctx.fill(path)
    if (f.carve === 'none') continue
    ctx.save()
    ctx.clip(path)
    if (f.carve === 'groove') {
      ctx.strokeStyle = grey(pile - 0.3)
      ctx.lineWidth = 0.07
      ctx.stroke(path)
    } else if (f.carve === 'ribbed') {
      // Same rhythm as the 2D rib pattern: 0.16 ft period, 0.04 ft cut.
      ctx.fillStyle = grey(pile - 0.22)
      ctx.rotate((f.carveAngle * Math.PI) / 180)
      for (let y = -reach; y < reach; y += 0.16) ctx.fillRect(-reach, y, 2 * reach, 0.04)
    } else if (f.carve === 'contour') {
      ctx.strokeStyle = grey(pile - 0.22)
      ctx.lineWidth = 0.03
      ctx.stroke(new Path2D(contourLinesPath(W, H, around)))
    }
    ctx.restore()
  }
  return readRed(ctx, w, h)
}

/** Design relief only (no colour, no noise). Browser only (OffscreenCanvas). */
/**
 * Relief for a studio rug: each visible layer adds its own (tile seams and cuts, freeform pile
 * and carving, a soft dome per knot where knots are big enough to see), and the mask keeps only
 * what some layer paints, inside the rug's outline.
 */
/**
 * The height within one chart cell (dx, dy from -0.5 to 0.5) for a construction: a domed knot,
 * a kilim's weft rib, soumak's slanting wrap (alternating row by row, its herringbone), a tent
 * stitch's diagonal, or a braid's rounded strand.
 */
function cellSurface(doc: RugDoc): ((dx: number, dy: number, row: number, yarn: number) => number) | null {
  switch (doc.construction) {
    case 'knotted': {
      // Each yarn's pile: cut (a dome), raised (high-low), shag (tall and rough), loop (a ring);
      // silk is cut finer and lies flatter.
      const piles = doc.palette.map((y) => ({ pile: y.pile ?? 'cut', k: fibreMaterial(y.fibre).render.relief }))
      return (dx, dy, _row, yarn) => {
        const p = piles[yarn - 1] ?? { pile: 'cut', k: 1 }
        const r2 = dx * dx + dy * dy
        if (p.pile === 'loop') return 0.5 + 0.07 * p.k * (1 - Math.min(1, Math.abs(Math.sqrt(r2) - 0.3) * 5))
        if (p.pile === 'shag') return 0.62 + 0.1 * p.k * (1 - Math.min(1, r2 * 2.5)) * (0.7 + 0.3 * Math.sin((dx - dy) * 19))
        const dome = 0.06 * p.k * (1 - Math.min(1, r2 * 4))
        return (p.pile === 'highlow' ? 0.58 : 0.5) + dome
      }
    }
    case 'flatweave':
      if (doc.flatweave === 'soumak')
        return (dx, dy, row) => {
          const across = (row % 2 ? dx + dy : dx - dy) * Math.SQRT1_2
          return 0.5 + 0.06 * (1 - Math.min(1, across * across * 10))
        }
      // Weft-faced: a rib along each weft row, lightly bumped where it passes each warp.
      return (dx, dy) => 0.5 + 0.05 * (1 - 4 * dy * dy) * (0.75 + 0.25 * Math.cos(dx * Math.PI * 2))
    case 'needlepoint':
      return (dx, dy) => {
        const across = (dx - dy) * Math.SQRT1_2
        return 0.5 + 0.055 * (1 - Math.min(1, across * across * 12))
      }
    case 'braided':
      return (dx, dy) => 0.5 + 0.09 * (1 - Math.min(1, (dx * dx + dy * dy) * 3))
    default:
      return null
  }
}

function docRelief(doc: RugDoc, w: number, h: number): HeightField {
  const data = new Float32Array(w * h).fill(0.5)
  const mask = new Uint8Array(w * h)
  for (const layer of doc.layers) {
    if (!layer.visible) continue
    if (layer.kind === 'tiles') {
      const t = tileRelief(tileLayerState(doc, layer), w, h)
      for (let i = 0; i < data.length; i++) if (t.mask[i]) {
        data[i] = t.data[i]
        mask[i] = 255
      }
    } else if (layer.kind === 'shapes') {
      const state = shapeLayerState(doc, layer)
      const f = freeformRelief(state, w, h)
      // Where this layer painted (its ground covers everything; otherwise only its shapes).
      const ctx = canvas(w, h)
      ctx.setTransform(w / doc.widthFt, 0, 0, h / doc.heightFt, 0, 0)
      ctx.fillStyle = '#fff'
      if (state.ground.swatchId) ctx.fillRect(0, 0, doc.widthFt, doc.heightFt)
      for (const s of state.shapes) ctx.fill(new Path2D(shapePath(s.points, s.smooth)))
      const painted = readRed(ctx, w, h)
      for (let i = 0; i < data.length; i++) if (painted[i] > 0.5) {
        data[i] = f[i]
        mask[i] = 255
      }
    } else if (layer.kind === 'chart') {
      const kx = layer.cols / w
      const ky = layer.rows / h
      // Each construction's own surface, where a knot spans a few pixels (finer ones read as noise).
      const surface = 1 / kx >= 3 && 1 / ky >= 3 ? cellSurface(doc) : null
      const carve = !!doc.finish.carve && doc.construction === 'knotted'
      for (let y = 0; y < h; y++) {
        const cy = y * ky
        const row = Math.min(layer.rows - 1, Math.floor(cy))
        for (let x = 0; x < w; x++) {
          const cx = x * kx
          const v = layer.cells[row * layer.cols + Math.min(layer.cols - 1, Math.floor(cx))]
          if (!v) continue
          const i = y * w + x
          mask[i] = 255
          let z = surface ? surface((cx % 1) - 0.5, (cy % 1) - 0.5, row, v) : 0.5
          if (carve) {
            // A groove where the colour changes to a neighbouring knot.
            const col = Math.min(layer.cols - 1, Math.floor(cx))
            const at = (c: number, r: number) => layer.cells[Math.max(0, Math.min(layer.rows - 1, r)) * layer.cols + Math.max(0, Math.min(layer.cols - 1, c))]
            if (at(col - 1, row) !== v || at(col + 1, row) !== v || at(col, row - 1) !== v || at(col, row + 1) !== v) z -= 0.1
          }
          data[i] = z
        }
      }
    }
  }
  // Round, oval, octagon or free outlines.
  if (doc.shape.kind !== 'rect') {
    const ctx = canvas(w, h)
    ctx.setTransform(w / doc.widthFt, 0, 0, h / doc.heightFt, 0, 0)
    ctx.fillStyle = '#fff'
    ctx.fill(new Path2D(shapePathFt(doc.shape, doc.widthFt, doc.heightFt)))
    const inside = readRed(ctx, w, h)
    for (let i = 0; i < mask.length; i++) if (inside[i] < 0.5) mask[i] = 0
  }
  return { width: w, height: h, data, mask }
}

export function designRelief(design: RugDesign, w: number, h: number): HeightField {
  if (design.kind === 'doc') return docRelief(design.doc, w, h)
  if (design.kind === 'tile') {
    const { data, mask } = tileRelief(design.state, w, h)
    return { width: w, height: h, data, mask }
  }
  return { width: w, height: h, data: freeformRelief(design.state, w, h), mask: null }
}

/** Rec. 709 luma of RGBA pixels, 0..1. */
export function luminance(rgba: ArrayLike<number>, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255
  return out
}

/** Separable box blur, radius r (clamped edges). */
export function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src.slice()
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  const n = 2 * r + 1
  for (let y = 0; y < h; y++) {
    const row = y * w
    let sum = 0
    for (let k = -r; k <= r; k++) sum += src[row + Math.min(w - 1, Math.max(0, k))]
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / n
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / n
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
    }
  }
  return out
}

/** Deterministic hash noise in 0..1 for an integer lattice point. */
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export interface FinishOptions {
  /** How much of the colour image's fine detail becomes relief. */
  highPass?: number
  /** High-pass blur radius in px (detail finer than this counts). */
  highPassRadius?: number
  /** Per-pixel tuft noise amplitude. */
  tuft?: number
  /** Coarser clump noise amplitude (about `clumpPx` across). */
  clump?: number
  clumpPx?: number
  seed?: number
}

/** Pure: adds a luminance high-pass and tuft noise to a design relief, in place. Returns `base`. */
export function finishHeight(base: Float32Array, lum: Float32Array | null, w: number, h: number, opts: FinishOptions = {}): Float32Array {
  const { highPass = 0.35, highPassRadius = 3, tuft = 0.05, clump = 0.04, clumpPx = 5, seed = 1 } = opts
  if (lum && highPass) {
    const blur = boxBlur(lum, w, h, highPassRadius)
    for (let i = 0; i < base.length; i++) base[i] += highPass * (lum[i] - blur[i])
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Bilinear value noise for clumps of tufts, white noise for single tufts.
      const fx = x / clumpPx
      const fy = y / clumpPx
      const ix = Math.floor(fx)
      const iy = Math.floor(fy)
      const tx = fx - ix
      const ty = fy - iy
      const a = hash2(ix, iy, seed)
      const b = hash2(ix + 1, iy, seed)
      const c = hash2(ix, iy + 1, seed)
      const d = hash2(ix + 1, iy + 1, seed)
      const v = a + (b - a) * tx + (c - a + (a - b - c + d) * tx) * ty
      base[y * w + x] += clump * (v - 0.5) + tuft * (hash2(x, y, seed + 7) - 0.5)
    }
  }
  return base
}

/** Full height field: design relief + colour high-pass + tuft noise. `color` is RGBA in image order. */
export function buildHeightField(design: RugDesign, color: ImageData, opts?: FinishOptions): HeightField {
  const { width: w, height: h } = color
  const field = designRelief(design, w, h)
  finishHeight(field.data, luminance(color.data, w, h), w, h, opts)
  return field
}
