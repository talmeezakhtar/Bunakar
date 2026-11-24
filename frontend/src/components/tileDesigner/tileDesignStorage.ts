import { swatchesApi, tileDesignsApi } from '../../services/api'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import type { Swatch } from '../../types/swatch'
import type { TileDesignRecord } from '../../types/tileDesign'

const CATALOG_KEY = 'bunakar_swatches'
/** The API sleeps on its free host; past this the bundled catalogue (same ids) is used. */
const CATALOG_TIMEOUT_MS = 4000

function readCachedCatalog(): Swatch[] | null {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    const list = raw ? (JSON.parse(raw) as Swatch[]) : null
    return Array.isArray(list) && list.length > 0 ? list : null
  } catch {
    return null
  }
}

/** The catalogue to draw with right now, without waiting: the last one fetched, or the bundled one. */
export function peekSwatchCatalog(): Swatch[] {
  return readCachedCatalog() ?? MOCK_SWATCHES
}

let pending: Promise<{ swatches: Swatch[]; usedFallback: boolean }> | null = null

/** The server's catalogue, fetched once per page load (with a timeout), cached for next time. */
export function loadSwatchCatalog(): Promise<{ swatches: Swatch[]; usedFallback: boolean }> {
  pending ??= swatchesApi
    .list({ signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) })
    .then((swatches) => {
      if (swatches.length === 0) throw new Error('empty catalogue')
      try {
        localStorage.setItem(CATALOG_KEY, JSON.stringify(swatches))
      } catch {
        // Storage full or blocked: fine, it's only a cache.
      }
      return { swatches, usedFallback: false }
    })
    .catch(() => {
      pending = null // try the server again next time
      const cached = readCachedCatalog()
      return { swatches: cached ?? MOCK_SWATCHES, usedFallback: !cached }
    })
  return pending
}

/** A design this account owns, or null if it's missing or someone else's. */
export async function loadDesign(id: string): Promise<TileDesignRecord | null> {
  try {
    return await tileDesignsApi.get(id)
  } catch {
    return null
  }
}
