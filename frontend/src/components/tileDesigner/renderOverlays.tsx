import type { ReactNode } from 'react'
import type { DesignOverlay } from '../../types/tileDesign'
import { findDesignAsset } from '../../data/designAssets'
import { resolveRoles } from '../../data/motifs/palette'
import type { MotifArt, RoleColors } from '../../data/motifs/types'
import { registerOverlayRenderer, weaveFilter } from './renderTiles'
import type { OverlayColors } from './renderTiles'

/**
 * Motif and border drawing, kept out of `renderTiles` so pages that never show motifs (the home
 * page's template previews) don't download the motif library. Importing this module registers it;
 * the designers, room preview, My Designs and the 3D pipeline import it.
 */

/** One block of motif art stretched into a box (x, y, w, h) in rug units. */
function art(key: string, a: MotifArt, colors: RoleColors, x: number, y: number, w: number, h: number, fit: 'meet' | 'none' = 'none'): ReactNode {
  const [, , vw, vh] = a.viewBox
  return (
    <svg key={key} x={x} y={y} width={w} height={h} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio={fit === 'meet' ? 'xMidYMid meet' : 'none'} overflow="visible">
      {a.layers.map((l, i) => (
        <path key={i} d={l.d} fill={colors[l.role] ?? '#000'} />
      ))}
    </svg>
  )
}

/**
 * Design pieces and border runs, drawn over the tile fills in placement order, as vector art in the
 * rug's colours. A border strip fits a whole number of repeats to its length; the top and bottom
 * runs of a Frame end in the border's corner pieces, and its side runs fill the space between.
 */
export function renderOverlays(overlays: DesignOverlay[], prefix: string, colors: OverlayColors, finish = true): ReactNode[] {
  if (overlays.length === 0) return []
  const filterId = `${prefix}-weave`
  const filter = finish ? `url(#${filterId})` : undefined
  const out: ReactNode[] = finish ? [<defs key="overlay-defs">{weaveFilter(filterId)}</defs>] : []
  const ids = new Set(overlays.map((o) => o.id))
  for (const o of overlays) {
    const asset = findDesignAsset(o.assetId)
    if (!asset) continue
    const tint = o.tint ? colors.tintColor?.(o.tint) : undefined
    const roleColors = resolveRoles(asset.spec, colors.palette, tint)
    const { widthTiles: w, heightTiles: h } = o
    // Work in the art's own upright frame (sides swap for 90/270), centred on the footprint.
    const sideways = o.rotation === 90 || o.rotation === 270
    const bw = sideways ? h : w
    const bh = sideways ? w : h
    const frame = `translate(${o.col + w / 2} ${o.row + h / 2}) rotate(${o.rotation}) translate(${-bw / 2} ${-bh / 2})`
    const spec = asset.spec
    if (spec.kind === 'border') {
      const t = o.thickness ?? 0.5
      const reach = o.reach ?? 0
      // Per-end reach is kept by footprint end; the art runs the other way on bottom and left strips.
      const lowFirst = o.rotation === 0 || o.rotation === 90
      const before = o.reachBefore ?? reach
      const after = o.reachAfter ?? reach
      const reachStart = lowFirst ? before : after
      const reachEnd = lowFirst ? after : before
      // The top/bottom runs of a Frame (ids "<frame>-t" / "-b" with side runs beside them) carry the corners.
      const frameId = o.id.replace(/-(t|b)$/, '')
      const cornered = frameId !== o.id && (ids.has(`${frameId}-l`) || ids.has(`${frameId}-r`))
      const start = cornered ? t : -reachStart
      const end = cornered ? bw - t : bw + reachEnd
      const length = Math.max(0, end - start)
      const repeats = Math.max(1, Math.round(length / (spec.aspect * t)))
      const period = length / repeats
      const units: ReactNode[] = []
      // Units overlap a hair so anti-aliased seams between them never show.
      for (let i = 0; i < repeats; i++) units.push(art(`u${i}`, spec, roleColors, start + i * period, 0, period + 0.004, t))
      if (cornered) {
        units.push(art('c0', spec.corner, roleColors, 0, 0, t, t))
        units.push(
          <g key="c1" transform={`translate(${bw} 0) rotate(90)`}>
            {art('c1a', spec.corner, roleColors, 0, 0, t, t)}
          </g>,
        )
      }
      out.push(
        <g key={o.id} filter={filter}>
          <g transform={frame}>{units}</g>
        </g>,
      )
    } else {
      // A little breathing room inside the footprint, like a motif set into its field.
      const inset = 0.06
      out.push(
        <g key={o.id} filter={filter}>
          <g transform={frame}>{art('p', spec, roleColors, inset, inset, bw - 2 * inset, bh - 2 * inset, 'meet')}</g>
        </g>,
      )
    }
  }
  return out
}

registerOverlayRenderer(renderOverlays)
