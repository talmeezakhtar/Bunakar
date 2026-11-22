import { memo, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import { FREEFORM_GENERATORS, applyGenerator, findGenerator, findPalette } from '../../data/freeformGenerators'
import { createDefaultFreeformDesign } from '../../types/freeform'
import type { RugSource } from '../../three/rug/rugSource'
import RealisticRug from '../ui/RealisticRug'

const SWATCHES_BY_ID = new Map(MOCK_SWATCHES.map((s) => [s.id, s]))

type FreeformPreviewProps = {
  generatorId: string
  paletteId?: string
  widthFt: number
  heightFt: number
  seed?: number
  className?: string
  style?: CSSProperties
  /** An SVG-style hint kept for callers: anything with 'slice' fills the box. */
  preserveAspectRatio?: string
  longPx?: number
}

/** A generated freeform rug, shown as the hand-tufted rug it would make (sample catalog colours). */
function FreeformPreview({ generatorId, paletteId, widthFt, heightFt, seed = 7, className, style, preserveAspectRatio, longPx }: FreeformPreviewProps) {
  const g = findGenerator(generatorId) ?? FREEFORM_GENERATORS[0]
  const source = useMemo<RugSource>(() => {
    const palette = findPalette(paletteId) ?? findPalette(g.paletteId)!
    const state = applyGenerator(createDefaultFreeformDesign(widthFt, heightFt), g, palette, { seed, ...g.defaults }, MOCK_SWATCHES)
    return { kind: 'freeform', state, swatchesById: SWATCHES_BY_ID }
  }, [g, paletteId, widthFt, heightFt, seed])
  return (
    <RealisticRug
      source={source}
      longPx={longPx}
      alt={`${g.name} hand-tufted rug`}
      className={className}
      style={style}
      fit={preserveAspectRatio?.includes('slice') ? 'cover' : 'contain'}
    />
  )
}

export default memo(FreeformPreview)
