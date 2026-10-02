import type { CSSProperties } from 'react'

export interface Swatch {
  id: string
  familyId: string
  familyName: string
  colorName: string
  swatchColor: string
  /** Top-view photo of one physical tile; absent for flat-color styles. */
  imageUrl?: string
  categories: string[]
}

/** CSS background for an HTML chip/card: the tile photo, over its average color while it loads. */
export function swatchBackground(swatch: Swatch | undefined): CSSProperties {
  if (!swatch) return { backgroundColor: '#999' }
  return {
    backgroundColor: swatch.swatchColor,
    backgroundImage: swatch.imageUrl ? `url(${swatch.imageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}

export interface SwatchFamily {
  familyId: string
  familyName: string
  categories: string[]
  variants: Swatch[]
}

export function groupByFamily(swatches: Swatch[]): SwatchFamily[] {
  const byFamily = new Map<string, SwatchFamily>()
  for (const swatch of swatches) {
    let family = byFamily.get(swatch.familyId)
    if (!family) {
      family = {
        familyId: swatch.familyId,
        familyName: swatch.familyName,
        categories: swatch.categories,
        variants: [],
      }
      byFamily.set(swatch.familyId, family)
    }
    family.variants.push(swatch)
  }
  return Array.from(byFamily.values())
}
