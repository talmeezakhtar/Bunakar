import { memo, useId, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import { FREEFORM_GENERATORS, applyGenerator, findGenerator, findPalette } from '../../data/freeformGenerators'
import { createDefaultFreeformDesign } from '../../types/freeform'
import { renderFreeform } from '../freeform/renderFreeform'
import { patternPrefix } from '../tileDesigner/renderTiles'

const SWATCHES_BY_ID = new Map(MOCK_SWATCHES.map((s) => [s.id, s]))

type FreeformPreviewProps = {
  generatorId: string
  paletteId?: string
  widthFt: number
  heightFt: number
  seed?: number
  className?: string
  style?: CSSProperties
  preserveAspectRatio?: string
}

/** A generated freeform rug drawn with the designer's own renderer (sample catalog colours). */
function FreeformPreview({ generatorId, paletteId, widthFt, heightFt, seed = 7, className, style, preserveAspectRatio }: FreeformPreviewProps) {
  const prefix = patternPrefix(useId())
  const art = useMemo(() => {
    const g = findGenerator(generatorId) ?? FREEFORM_GENERATORS[0]
    const palette = findPalette(paletteId) ?? findPalette(g.paletteId)!
    const state = applyGenerator(createDefaultFreeformDesign(widthFt, heightFt), g, palette, { seed, ...g.defaults }, MOCK_SWATCHES)
    return renderFreeform(state, SWATCHES_BY_ID, prefix)
  }, [generatorId, paletteId, widthFt, heightFt, seed, prefix])
  return (
    <svg viewBox={`0 0 ${widthFt} ${heightFt}`} preserveAspectRatio={preserveAspectRatio} className={className} style={style} role="img" aria-label="Freeform rug preview">
      {art}
    </svg>
  )
}

export default memo(FreeformPreview)
