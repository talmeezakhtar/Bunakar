import type { ReactNode } from 'react'
import type { Swatch } from '../types/swatch'
import type { RugArt } from '../types/rugArt'
import { renderTileFills } from '../components/tileDesigner/renderTiles'
import '../components/tileDesigner/renderOverlays'
import { renderFreeform } from '../components/freeform/renderFreeform'
import { shapeLayerState, tileLayerState } from './convert'
import type { ChartLayer, RugDoc, RugShape } from './model'

/**
 * A rug document drawn as one SVG in feet, layer by layer, clipped to the rug's shape: what the
 * realistic renderer, the 3D view and the room previews rasterise. Charts become one image each
 * (one pixel per knot, drawn crisp); tile and shape layers use the old designers' own renderers.
 */

/** 32-bit FNV-1a over bytes, for caching chart images by content. */
export function hashBytes(bytes: Uint8Array, seed = 0x811c9dc5): number {
  let h = seed
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  const n = m ? parseInt(m[1], 16) : 0xcccccc
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Palette index -> RGB, from the swatch catalogue (index 0 unused: empty). */
export function paletteRgb(doc: RugDoc, swatchesById: Map<string, Swatch>): [number, number, number][] {
  return [[0, 0, 0], ...doc.palette.map((y) => hexToRgb(swatchesById.get(y.swatchId)?.swatchColor ?? '#cccccc'))]
}

/** Chart pixels as RGBA, one pixel per cell (empty cells transparent). Pure. */
export function chartPixels(chart: ChartLayer, rgb: [number, number, number][]): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(chart.cols * chart.rows * 4)
  for (let i = 0; i < chart.cells.length; i++) {
    const v = chart.cells[i]
    if (!v) continue
    const c = rgb[v] ?? [204, 204, 204]
    out[i * 4] = c[0]
    out[i * 4 + 1] = c[1]
    out[i * 4 + 2] = c[2]
    out[i * 4 + 3] = 255
  }
  return out
}

const imageCache = new Map<string, string>()

/** A chart as a PNG data URL (browser only), cached by content and colours. */
export function chartImage(chart: ChartLayer, rgb: [number, number, number][]): string {
  const key = `${chart.cols}x${chart.rows}:${hashBytes(chart.cells)}:${rgb.join(';')}`
  const hit = imageCache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = chart.cols
  canvas.height = chart.rows
  canvas.getContext('2d')?.putImageData(new ImageData(chartPixels(chart, rgb), chart.cols, chart.rows), 0, 0)
  const url = canvas.toDataURL('image/png')
  if (imageCache.size > 24) imageCache.delete(imageCache.keys().next().value!)
  imageCache.set(key, url)
  return url
}

/** The rug's outline as an SVG path in feet. */
export function shapePathFt(shape: RugShape, W: number, H: number): string {
  switch (shape.kind) {
    case 'round':
    case 'oval':
      return `M0,${H / 2}A${W / 2},${H / 2} 0 1,0 ${W},${H / 2}A${W / 2},${H / 2} 0 1,0 0,${H / 2}Z`
    case 'octagon': {
      const c = Math.min(W, H) * 0.29
      return `M${c},0H${W - c}L${W},${c}V${H - c}L${W - c},${H}H${c}L0,${H - c}V${c}Z`
    }
    case 'free':
      return shape.outline?.length ? `M${shape.outline.map((p) => `${p.x},${p.y}`).join('L')}Z` : `M0,0H${W}V${H}H0Z`
    default:
      return `M0,0H${W}V${H}H0Z`
  }
}

export function docArt(doc: RugDoc, swatchesById: Map<string, Swatch>): RugArt {
  const W = doc.widthFt
  const H = doc.heightFt
  return {
    width: W,
    height: H,
    render: (prefix) => {
      const rgb = paletteRgb(doc, swatchesById)
      const clipId = `${prefix}-shape`
      const layers: ReactNode[] = doc.layers.map((layer) => {
        if (!layer.visible) return null
        if (layer.kind === 'chart')
          return <image key={layer.id} href={chartImage(layer, rgb)} x={0} y={0} width={W} height={H} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} />
        if (layer.kind === 'tiles')
          return (
            <g key={layer.id} transform={`scale(${W / layer.widthTiles} ${H / layer.heightTiles})`}>
              {renderTileFills(tileLayerState(doc, layer), swatchesById, `${prefix}-${layer.id}`)}
            </g>
          )
        if (layer.kind === 'shapes') return <g key={layer.id}>{renderFreeform(shapeLayerState(doc, layer), swatchesById, `${prefix}-${layer.id}`)}</g>
        return null
      })
      return (
        <g>
          <defs>
            <clipPath id={clipId}>
              <path d={shapePathFt(doc.shape, W, H)} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>{layers}</g>
        </g>
      )
    },
  }
}
