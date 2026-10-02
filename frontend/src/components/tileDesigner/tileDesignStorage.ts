import { swatchesApi, tileDesignsApi } from '../../services/api'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import type { Swatch } from '../../types/swatch'
import type { TileDesignRecord } from '../../types/tileDesign'

export async function loadSwatchCatalog(): Promise<{ swatches: Swatch[]; usedFallback: boolean }> {
  try {
    const swatches = await swatchesApi.list()
    if (swatches.length > 0) return { swatches, usedFallback: false }
    return { swatches: MOCK_SWATCHES, usedFallback: true }
  } catch {
    return { swatches: MOCK_SWATCHES, usedFallback: true }
  }
}

/** A design this account owns, or null if it's missing or someone else's. */
export async function loadDesign(id: string): Promise<TileDesignRecord | null> {
  try {
    return await tileDesignsApi.get(id)
  } catch {
    return null
  }
}
