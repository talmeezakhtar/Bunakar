import type { Swatch } from '../types/swatch'
import type { FreeformDesignState, SurfaceFinish } from '../types/freeform'
import { CARVINGS, PILE_HEIGHTS, PILE_TEXTURES } from '../types/freeform'
import { boundsOf, centroid, flattenShape, pointInPolygon, polygonArea } from './freeformGeometry'

/**
 * Production side of a freeform rug: how much of each yarn/finish it takes, and the full-scale
 * tufting template a tufter works from.
 */

export interface FinishUsage {
  key: string
  code: string
  finish: SurfaceFinish
  areaSqFt: number
}

export function finishKey(f: SurfaceFinish): string {
  return `${f.swatchId}|${f.texture}|${f.pile}|${f.carve}|${f.carve === 'ribbed' ? f.carveAngle : ''}`
}

/** Letter codes A..Z, AA.. for the template legend. */
function code(i: number): string {
  let s = ''
  let n = i + 1
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/**
 * Visible area per finish. Shapes overlap (later ones on top), so this samples the rug on a fine
 * grid and credits each sample to the topmost surface there - exact enough for yarn.
 */
export function finishUsage(state: FreeformDesignState, step = 0.1): FinishUsage[] {
  const { widthFt: W, heightFt: H } = state
  const polys = state.shapes.map((s) => {
    const poly = flattenShape(s, 6)
    return { shape: s, poly, box: boundsOf(poly) }
  })
  const counts = new Map<string, { finish: SurfaceFinish; n: number }>()
  const bump = (f: SurfaceFinish) => {
    const k = finishKey(f)
    const e = counts.get(k)
    if (e) e.n++
    else counts.set(k, { finish: f, n: 1 })
  }
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      let hit: SurfaceFinish = state.ground
      for (let i = polys.length - 1; i >= 0; i--) {
        const { poly, box, shape } = polys[i]
        if (x < box.minX || x > box.maxX || y < box.minY || y > box.maxY) continue
        if (pointInPolygon({ x, y }, poly)) {
          hit = shape
          break
        }
      }
      bump(hit)
    }
  }
  const cell = step * step
  const rows = [...counts.entries()]
    .map(([key, { finish, n }]) => ({ key, finish, areaSqFt: n * cell, code: '' }))
    .sort((a, b) => b.areaSqFt - a.areaSqFt)
  rows.forEach((r, i) => (r.code = code(i)))
  return rows
}

export function describeFinish(f: SurfaceFinish, swatch: Swatch | undefined): string {
  const texture = PILE_TEXTURES.find((t) => t.id === f.texture)?.label ?? f.texture
  const pile = PILE_HEIGHTS.find((p) => p.id === f.pile)?.label ?? f.pile
  const carve = f.carve === 'none' ? '' : `, ${CARVINGS.find((c) => c.id === f.carve)?.label}${f.carve === 'ribbed' ? ` ${f.carveAngle}°` : ''}`
  return `${swatch ? `${swatch.familyName} ${swatch.colorName}` : 'Unknown yarn'} - ${texture}, ${pile} pile${carve}`
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/**
 * Full-scale tufting template (1 SVG unit = 1 inch, printed at true size): every shape's outline,
 * a finish code in each region, and a legend of yarn, pile, carving and area per code.
 */
export function tuftingTemplateSvg(state: FreeformDesignState, swatchesById: Map<string, Swatch>): string {
  const usage = finishUsage(state)
  const codeOf = new Map(usage.map((u) => [u.key, u.code]))
  const IN = 12
  const W = state.widthFt * IN
  const H = state.heightFt * IN
  const legendW = 150
  const f = (n: number) => Math.round(n * 100) / 100
  const outline = (pts: { x: number; y: number }[]) => `M${pts.map((p) => `${f(p.x * IN)},${f(p.y * IN)}`).join('L')}Z`
  const labelSize = Math.max(2, Math.min(W, H) / 30)

  const shapes = state.shapes
    .map((s) => {
      const poly = flattenShape(s, 8)
      const c = centroid(poly)
      const small = polygonArea(poly) < 0.15
      return (
        `<path d="${outline(poly)}" fill="none" stroke="#000" stroke-width="0.12"/>` +
        (small ? '' : `<text x="${f(c.x * IN)}" y="${f(c.y * IN)}" font-size="${f(labelSize)}" text-anchor="middle" dominant-baseline="middle">${codeOf.get(finishKey(s))}</text>`)
      )
    })
    .join('\n')

  const legend = usage
    .map((u, i) => {
      const sw = swatchesById.get(u.finish.swatchId)
      const y = 14 + i * 9
      return (
        `<rect x="${W + 10}" y="${y - 5}" width="6" height="6" fill="${sw?.swatchColor ?? '#ccc'}" stroke="#000" stroke-width="0.1"/>` +
        `<text x="${W + 19}" y="${y}" font-size="3.2"><tspan font-weight="bold">${u.code}</tspan>  ${esc(describeFinish(u.finish, sw))}</text>` +
        `<text x="${W + 19}" y="${y + 3.6}" font-size="2.4" fill="#555">${u.areaSqFt.toFixed(1)} sq ft</text>`
      )
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${f(W + legendW)}in" height="${f(Math.max(H, 20 + usage.length * 9))}in" viewBox="0 0 ${f(W + legendW)} ${f(Math.max(H, 20 + usage.length * 9))}" font-family="Helvetica, Arial, sans-serif">
<title>${esc(state.name)} - tufting template (full scale, 1 unit = 1 inch)</title>
<rect x="0" y="0" width="${f(W)}" height="${f(H)}" fill="none" stroke="#000" stroke-width="0.25"/>
<text x="3" y="${f(H - 3)}" font-size="${f(labelSize)}">${codeOf.get(finishKey(state.ground)) ?? ''} (ground)</text>
${shapes}
<text x="${W + 10}" y="6" font-size="4" font-weight="bold">${esc(state.name)} - ${state.widthFt}' x ${state.heightFt}'</text>
${legend}
</svg>`
}

export function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
