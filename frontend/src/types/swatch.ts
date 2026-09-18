export interface Swatch {
  id: string
  familyId: string
  familyName: string
  colorName: string
  swatchColor: string
  categories: string[]
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
