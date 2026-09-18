import { swatchesApi, tileDesignsApi } from '../../services/api'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import type { Swatch } from '../../types/swatch'
import type { TileDesignRecord } from '../../types/tileDesign'

const LOCAL_KEY = 'bunakar_tile_designs'

function readLocal(): TileDesignRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as TileDesignRecord[]) : []
  } catch {
    return []
  }
}

function writeLocal(records: TileDesignRecord[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(records))
}

export async function loadSwatchCatalog(): Promise<{ swatches: Swatch[]; usedFallback: boolean }> {
  try {
    const swatches = await swatchesApi.list()
    if (swatches.length > 0) return { swatches, usedFallback: false }
    return { swatches: MOCK_SWATCHES, usedFallback: true }
  } catch {
    return { swatches: MOCK_SWATCHES, usedFallback: true }
  }
}

export async function listMyDesigns(isAuthenticated: boolean): Promise<TileDesignRecord[]> {
  if (isAuthenticated) {
    try {
      return await tileDesignsApi.mine()
    } catch {
      // fall through to local
    }
  }
  return readLocal()
}

export async function saveDesign(
  record: Omit<TileDesignRecord, 'id' | 'updatedAt'>,
  existingId: string | null,
  isAuthenticated: boolean,
): Promise<TileDesignRecord> {
  if (isAuthenticated) {
    try {
      return existingId ? await tileDesignsApi.update(existingId, record) : await tileDesignsApi.create(record)
    } catch {
      // fall through to local
    }
  }
  const local = readLocal()
  const id = existingId ?? `local-${Date.now()}`
  const saved: TileDesignRecord = { ...record, id, updatedAt: new Date().toISOString() }
  const next = existingId ? local.map((d) => (d.id === existingId ? saved : d)) : [...local, saved]
  writeLocal(next)
  return saved
}

export async function loadDesign(id: string): Promise<TileDesignRecord | null> {
  if (!id.startsWith('local-')) {
    try {
      return await tileDesignsApi.get(id)
    } catch {
      // fall through to local
    }
  }
  return readLocal().find((d) => d.id === id) ?? null
}

export async function deleteDesign(id: string, isAuthenticated: boolean): Promise<void> {
  if (isAuthenticated && !id.startsWith('local-')) {
    try {
      await tileDesignsApi.remove(id)
      return
    } catch {
      // fall through to local
    }
  }
  writeLocal(readLocal().filter((d) => d.id !== id))
}
