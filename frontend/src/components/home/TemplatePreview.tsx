import { memo, useId, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import type { Colorway, PatternTemplate } from '../../data/patternTemplates'
import { applyTemplate } from '../../data/patternTemplates'
import { createDefaultTileDesign } from '../../types/tileDesign'
import { patternPrefix, renderTileFills } from '../tileDesigner/renderTiles'

const SWATCHES_BY_ID = new Map(MOCK_SWATCHES.map((s) => [s.id, s]))

type TemplatePreviewProps = {
  template: PatternTemplate
  colorway: Colorway
  widthTiles: number
  heightTiles: number
  className?: string
  style?: CSSProperties
  preserveAspectRatio?: string
}

function groundColor({ roles: [[familyId, colorName]] }: Colorway) {
  return MOCK_SWATCHES.find((s) => s.familyId === familyId && s.colorName === colorName)?.swatchColor
}

/** A template drawn with the designer's own renderer (the sample catalog shares the live colors). */
function TemplatePreview({ template, colorway, widthTiles, heightTiles, className, style, preserveAspectRatio }: TemplatePreviewProps) {
  const prefix = patternPrefix(useId())
  const fills = useMemo(() => {
    const state = applyTemplate(createDefaultTileDesign(widthTiles, heightTiles), template, colorway, MOCK_SWATCHES)
    return renderTileFills(state, SWATCHES_BY_ID, prefix)
  }, [template, colorway, widthTiles, heightTiles, prefix])

  return (
    <svg
      viewBox={`0 0 ${widthTiles} ${heightTiles}`}
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      style={style}
      role="img"
      aria-label={`${template.name} in ${colorway.name}`}
    >
      {/* Ground underlay hides hairline anti-aliasing seams between neighboring pieces. */}
      <rect width={widthTiles} height={heightTiles} fill={groundColor(colorway)} />
      {fills}
    </svg>
  )
}

export default memo(TemplatePreview)
