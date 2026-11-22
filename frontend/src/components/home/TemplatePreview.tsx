import { memo, useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { Colorway, PatternTemplate } from '../../data/patternTemplates'
import { TILE_SIZE_FT } from '../../types/tileDesign'
import type { RugSource } from '../../three/rug/rugSource'
import RealisticRug from '../ui/RealisticRug'

type TemplatePreviewProps = {
  template: PatternTemplate
  colorway: Colorway
  widthTiles: number
  heightTiles: number
  className?: string
  style?: CSSProperties
  /** An SVG-style hint kept for callers: anything with 'slice' fills the box. */
  preserveAspectRatio?: string
  /** Long side of the rendered rug in px. */
  longPx?: number
}

/** A template in a colourway, shown as the woven rug it would make. */
function TemplatePreview({ template, colorway, widthTiles, heightTiles, className, style, preserveAspectRatio, longPx }: TemplatePreviewProps) {
  const source = useMemo<RugSource>(
    () => ({ kind: 'template', templateId: template.id, colorwayId: colorway.id, widthFt: widthTiles * TILE_SIZE_FT, heightFt: heightTiles * TILE_SIZE_FT }),
    [template.id, colorway.id, widthTiles, heightTiles],
  )
  return (
    <RealisticRug
      source={source}
      longPx={longPx}
      alt={`${template.name} in ${colorway.name}`}
      className={className}
      style={style}
      fit={preserveAspectRatio?.includes('slice') ? 'cover' : 'contain'}
    />
  )
}

export default memo(TemplatePreview)
