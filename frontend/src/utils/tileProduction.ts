import type { Swatch } from '../types/swatch'
import type { CutType, TileDesignState } from '../types/tileDesign'
import { CUT_TYPES, TILE_SIZE_FT, formatRugSize, tileKey } from '../types/tileDesign'
import { findDesignAsset } from '../data/designAssets'

/**
 * The weaver's sheet for a tile rug: a full-scale tile map (1 unit = 1 inch) with every tile's
 * reference (column letter, row number) and colour codes, a legend of each wool with its swatch
 * code and how many tiles it takes, and the motifs and borders laid over the grid. Pure.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const f = (n: number) => Math.round(n * 100) / 100

/** How much of a tile each cut covers, for counting wool by tile. */
const CUT_AREA: Record<CutType, number> = {
  full: 1,
  half: 0.5,
  quad: 0.25,
  third: 1 / 3,
  quarter: 0.25,
  ninth: 1 / 9,
  sixteenth: 1 / 16,
  diagonal: 0.5,
  arc: Math.PI / 4,
  'arc-remnant': 1 - Math.PI / 4,
}

/** Spreadsheet-style column letters: A..Z, AA, AB... */
export function columnName(i: number): string {
  let n = i + 1
  let out = ''
  while (n > 0) {
    const r = (n - 1) % 26
    out = String.fromCharCode(65 + r) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

export interface WoolLine {
  code: string
  swatchId: string
  name: string
  color: string
  /** Tiles' worth of this wool (cut pieces count by the share of the tile they cover). */
  tiles: number
  pieces: number
}

/** Wool used, most first, each with a short code (C1, C2...) for the map. */
export function woolList(state: TileDesignState, swatchesById: Map<string, Swatch>): WoolLine[] {
  const by = new Map<string, { tiles: number; pieces: number }>()
  for (const pieces of Object.values(state.tiles))
    for (const p of pieces) {
      const e = by.get(p.swatchId) ?? { tiles: 0, pieces: 0 }
      e.tiles += CUT_AREA[p.cutType] ?? 1
      e.pieces += 1
      by.set(p.swatchId, e)
    }
  return [...by.entries()]
    .sort((a, b) => b[1].tiles - a[1].tiles)
    .map(([swatchId, e], i) => {
      const sw = swatchesById.get(swatchId)
      return {
        code: `C${i + 1}`,
        swatchId,
        name: sw ? `${sw.familyName} - ${sw.colorName}` : swatchId,
        color: sw?.swatchColor ?? '#cccccc',
        tiles: Math.round(e.tiles * 100) / 100,
        pieces: e.pieces,
      }
    })
}

export function tileWeaverSheetSvg(state: TileDesignState, swatchesById: Map<string, Swatch>): string {
  const IN = TILE_SIZE_FT * 12 // inches per tile
  const W = state.widthTiles * IN
  const H = state.heightTiles * IN
  const wool = woolList(state, swatchesById)
  const codeOf = new Map(wool.map((w) => [w.swatchId, w]))
  const cutLabel = new Map(CUT_TYPES.map((c) => [c.id, c.label]))
  const gutter = 10
  const legendX = W + gutter * 2
  const legendW = 190

  const cells: string[] = []
  for (let r = 0; r < state.heightTiles; r++)
    for (let c = 0; c < state.widthTiles; c++) {
      const x = gutter + c * IN
      const y = gutter + r * IN
      const pieces = state.tiles[tileKey(r, c)] ?? []
      const first = pieces[0] ? codeOf.get(pieces[0].swatchId) : undefined
      const lines = pieces.map((p) => {
        const code = codeOf.get(p.swatchId)?.code ?? '?'
        const cut = p.cutType === 'full' ? '' : ` ${cutLabel.get(p.cutType) ?? p.cutType}`
        const turn = p.rotation ? ` ${p.rotation}°` : ''
        return `${code}${cut}${turn}`
      })
      cells.push(
        `<rect x="${x}" y="${y}" width="${IN}" height="${IN}" fill="${first ? first.color : '#ffffff'}" fill-opacity="${first ? 0.35 : 0}" stroke="#000" stroke-width="0.2"/>` +
          `<text x="${x + 1}" y="${y + 2.6}" font-size="2.2" fill="#333">${columnName(c)}${r + 1}</text>` +
          lines.map((l, i) => `<text x="${x + IN / 2}" y="${y + IN / 2 + (i - (lines.length - 1) / 2) * 3}" font-size="2.6" text-anchor="middle" dominant-baseline="middle">${esc(l)}</text>`).join(''),
      )
    }

  const colLabels = Array.from({ length: state.widthTiles }, (_, c) => `<text x="${gutter + c * IN + IN / 2}" y="${gutter - 3}" font-size="3.2" text-anchor="middle" font-weight="bold">${columnName(c)}</text>`)
  const rowLabels = Array.from({ length: state.heightTiles }, (_, r) => `<text x="${gutter - 3}" y="${gutter + r * IN + IN / 2}" font-size="3.2" text-anchor="end" dominant-baseline="middle" font-weight="bold">${r + 1}</text>`)

  const legend = wool.map((w, i) => {
    const y = gutter + 18 + i * 10
    return (
      `<rect x="${legendX}" y="${y - 5}" width="7" height="7" fill="${w.color}" stroke="#000" stroke-width="0.15"/>` +
      `<text x="${legendX + 10}" y="${y}" font-size="3.4"><tspan font-weight="bold">${w.code}</tspan>  ${esc(w.name)}</text>` +
      `<text x="${legendX + 10}" y="${y + 3.8}" font-size="2.5" fill="#555">Swatch ${esc(w.swatchId)} · ${w.tiles} tiles · ${w.pieces} pieces</text>`
    )
  })

  const motifsTop = gutter + 26 + wool.length * 10
  const motifs = state.overlays.map((o, i) => {
    const name = findDesignAsset(o.assetId)?.name ?? o.assetId
    const where = `${columnName(o.col)}${o.row + 1}–${columnName(o.col + o.widthTiles - 1)}${o.row + o.heightTiles}`
    return `<text x="${legendX}" y="${motifsTop + 8 + i * 5}" font-size="2.8">${esc(name)} · ${where}${o.rotation ? ` · ${o.rotation}°` : ''}</text>`
  })

  const totalW = legendX + legendW
  const totalH = Math.max(H + gutter * 2, motifsTop + 14 + motifs.length * 5)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${f(totalW)}in" height="${f(totalH)}in" viewBox="0 0 ${f(totalW)} ${f(totalH)}" font-family="Helvetica, Arial, sans-serif">
<title>${esc(state.name)} - weaver's sheet (full scale, 1 unit = 1 inch)</title>
${colLabels.join('')}
${rowLabels.join('')}
${cells.join('\n')}
<rect x="${gutter}" y="${gutter}" width="${W}" height="${H}" fill="none" stroke="#000" stroke-width="0.6"/>
<text x="${legendX}" y="${gutter + 4}" font-size="4.4" font-weight="bold">${esc(state.name)}</text>
<text x="${legendX}" y="${gutter + 9.5}" font-size="3">${esc(formatRugSize(state.widthTiles, state.heightTiles))} · ${state.widthTiles} × ${state.heightTiles} tiles of 18″</text>
${legend.join('\n')}
${motifs.length ? `<text x="${legendX}" y="${motifsTop}" font-size="3.4" font-weight="bold">Motifs and borders</text>\n${motifs.join('\n')}` : ''}
</svg>`
}
