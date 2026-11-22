/**
 * Design pieces and borders laid over painted tiles (see `DesignOverlay`). They are vector motifs
 * from `data/motifs`: layered paths with colour roles, drawn in the rug's own palette, so they
 * stay crisp at any size and follow the rug's colours instead of carrying fixed ones.
 *
 * Saved designs from before the vector library point at the old raster ids (`s1-medallion-1`...);
 * those resolve through `LEGACY_ALIASES` to the closest motif, keeping the old proportions.
 */
import { MOTIF_DEFS, getMotif } from './motifs/catalogue'
import { LEGACY_ALIASES } from './motifs/legacyAliases'
import type { MotifCategory, MotifSpec } from './motifs/types'

export type DesignAssetKind = 'piece' | 'border'
export type DesignCategory = MotifCategory

export interface DesignAsset {
  id: string
  name: string
  kind: DesignAssetKind
  category: DesignCategory
  /** Width / height of the art (for a border: of one seamless repeat, at full strip height). */
  aspect: number
  spec: MotifSpec
}

export const PIECE_CATEGORIES: DesignCategory[] = ['Medallions', 'Modern', 'Florals', 'Geometric', 'Paisley', 'Animals', 'Organic']

/** Every motif in the catalogue, in catalogue order: names and kinds only, no geometry built. */
export const DESIGN_CATALOGUE = MOTIF_DEFS.map((d) => ({ id: d.id, name: d.name, kind: d.kind, category: d.category }))

const cache = new Map<string, DesignAsset>()

/** The asset for a motif id or a legacy raster id; geometry is generated on first use. */
export function findDesignAsset(id: string | null | undefined): DesignAsset | undefined {
  if (!id) return undefined
  const hit = cache.get(id)
  if (hit) return hit
  const legacy = LEGACY_ALIASES[id]
  const spec = getMotif(legacy?.motifId ?? id)
  if (!spec) return undefined
  // A legacy piece keeps the proportions it was placed with, so its footprint doesn't shift.
  const asset: DesignAsset = {
    id,
    name: spec.name,
    kind: spec.kind,
    category: spec.category,
    aspect: spec.kind === 'piece' && legacy ? legacy.aspect : spec.aspect,
    spec,
  }
  cache.set(id, asset)
  return asset
}

/** A piece's footprint in whole tiles at `size` tiles tall, keeping the art's proportions. */
export function pieceFootprint(asset: Pick<DesignAsset, 'aspect'>, size: number): { widthTiles: number; heightTiles: number } {
  return { widthTiles: Math.max(1, Math.round(asset.aspect * size)), heightTiles: size }
}

/** Default size (tiles tall) when a piece is picked: medallions and panels read as a centerpiece. */
export function defaultPieceSize(asset: Pick<DesignAsset, 'category'>): number {
  return asset.category === 'Medallions' || asset.category === 'Modern' ? 2 : 1
}
