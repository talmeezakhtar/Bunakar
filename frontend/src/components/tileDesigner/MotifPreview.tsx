import { memo } from 'react'
import { findDesignAsset } from '../../data/designAssets'
import { resolveRoles } from '../../data/motifs/palette'
import type { PaletteInput } from '../../data/motifs/palette'
import type { MotifArt, RoleColors } from '../../data/motifs/types'

function Paths({ art, colors }: { art: MotifArt; colors: RoleColors }) {
  return (
    <>
      {art.layers.map((l, i) => (
        <path key={i} d={l.d} fill={colors[l.role] ?? '#000'} />
      ))}
    </>
  )
}

type MotifPreviewProps = {
  id: string
  palette: PaletteInput
  tint?: string
  className?: string
  /** Borders: how many repeats to show beside the corner. */
  repeats?: number
}

/** A motif drawn in a rug's colours: a piece whole, or a border as a corner and a short run. */
function MotifPreview({ id, palette, tint, className, repeats = 3 }: MotifPreviewProps) {
  const asset = findDesignAsset(id)
  if (!asset) return null
  const spec = asset.spec
  const colors = resolveRoles(spec, palette, tint)
  if (spec.kind === 'piece') {
    const [, , w, h] = spec.viewBox
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true">
        <Paths art={spec} colors={colors} />
      </svg>
    )
  }
  const [, , uw, uh] = spec.viewBox
  const [, , cw] = spec.corner.viewBox
  const scale = uh / cw
  return (
    <svg viewBox={`0 0 ${uh + repeats * uw} ${uh}`} preserveAspectRatio="xMinYMid meet" className={className} aria-hidden="true">
      <g transform={`scale(${scale})`}>
        <Paths art={spec.corner} colors={colors} />
      </g>
      {Array.from({ length: repeats }, (_, i) => (
        <g key={i} transform={`translate(${uh + i * uw - (i > 0 ? 0.2 : 0)} 0)`}>
          <Paths art={spec} colors={colors} />
        </g>
      ))}
    </svg>
  )
}

export default memo(MotifPreview)
