/**
 * Old raster design ids (`designAssets.ts`, assets-src/designs/*.webp) -> closest vector motif, so saved
 * designs still open. `aspect` is the old art's aspect: keep it when placing the alias so the
 * piece keeps its footprint. Variant names like "Lotus, Navy" collapse onto one motif; the colour
 * now comes from the rug palette.
 */

export interface LegacyAlias {
  motifId: string
  aspect: number
}

export const LEGACY_ALIASES: Readonly<Record<string, LegacyAlias>> = {
  // borders
  's1-border-1': { motifId: 'border-herati-guard', aspect: 4.836 },
  's1-border-2': { motifId: 'border-kilim-lozenge', aspect: 4.102 },
  's1-border-3': { motifId: 'border-vine-scroll', aspect: 2.062 },
  's2-border-1': { motifId: 'border-crescent-guard', aspect: 1.93 },
  's2-border-2': { motifId: 'border-lotus-vine', aspect: 3.477 },
  's2-border-3': { motifId: 'border-tree-band', aspect: 4.984 },
  's3-border-4': { motifId: 'border-wave-ribbon', aspect: 14.604 },
  's3-border-6': { motifId: 'border-carved-swirl', aspect: 19.031 },
  // medallions
  's1-medallion-1': { motifId: 'medallion-star', aspect: 1.343 },
  's1-medallion-2': { motifId: 'medallion-sun', aspect: 1.012 },
  's1-medallion-3': { motifId: 'medallion-garden', aspect: 1.378 },
  's2-medallion-1': { motifId: 'medallion-shah-abbas', aspect: 1.366 },
  's2-medallion-2': { motifId: 'medallion-caucasian', aspect: 1.315 },
  's2-medallion-3': { motifId: 'medallion-isfahan', aspect: 1.357 },
  // paisley
  's1-motif-1': { motifId: 'boteh', aspect: 0.6 },
  's1-motif-2': { motifId: 'boteh-banded', aspect: 0.61 },
  // geometric
  's1-motif-3': { motifId: 'endless-knot', aspect: 1.415 },
  's1-motif-5': { motifId: 'gul-star', aspect: 1.386 },
  's1-motif-8': { motifId: 'lozenge', aspect: 0.74 },
  's1-motif-11': { motifId: 'kilim-diamond', aspect: 1.12 },
  's1-motif-14': { motifId: 'lozenge-small', aspect: 0.85 },
  's2-motif-7': { motifId: 'lozenge', aspect: 0.75 },
  's2-motif-13': { motifId: 'lozenge-small', aspect: 0.842 },
  // florals
  's1-motif-4': { motifId: 'rosette-classic', aspect: 1 },
  's1-motif-6': { motifId: 'rosette-classic', aspect: 1.02 },
  's1-motif-7': { motifId: 'flower-spray', aspect: 0.71 },
  's1-motif-9': { motifId: 'palmette-shah-abbasi', aspect: 0.929 },
  's1-motif-10': { motifId: 'rosette-blossom', aspect: 1 },
  's1-motif-12': { motifId: 'palmette-shah-abbasi', aspect: 0.963 },
  's1-motif-13': { motifId: 'rosette-blossom', aspect: 1 },
  's1-motif-15': { motifId: 'sprig', aspect: 0.933 },
  's1-motif-16': { motifId: 'sprig', aspect: 0.893 },
  's1-motif-24': { motifId: 'leaf-fan', aspect: 0.9 },
  's1-motif-25': { motifId: 'sprig', aspect: 0.926 },
  's1-motif-26': { motifId: 'stem-flower', aspect: 0.72 },
  's1-motif-27': { motifId: 'rosette-star', aspect: 1 },
  's1-motif-28': { motifId: 'rosette-star', aspect: 0.971 },
  's1-motif-29': { motifId: 'palmette-fan', aspect: 0.971 },
  's1-motif-30': { motifId: 'lotus', aspect: 0.909 },
  's1-motif-31': { motifId: 'lotus-bud', aspect: 1.028 },
  's1-motif-33': { motifId: 'lotus', aspect: 0.973 },
  's2-motif-28': { motifId: 'palmette-feather', aspect: 1 },
  's2-motif-29': { motifId: 'lotus', aspect: 0.973 },
  // animals
  's2-motif-3': { motifId: 'peacock', aspect: 0.964 },
  's2-motif-4': { motifId: 'lion', aspect: 1.341 },
  's2-motif-24': { motifId: 'hound', aspect: 1.195 },
  's2-motif-25': { motifId: 'hound', aspect: 1.22 },
  // modern panels
  's3-panel-1': { motifId: 'panel-color-field', aspect: 1.634 },
  's3-panel-2': { motifId: 'panel-cobblestone', aspect: 1.152 },
  's3-panel-3': { motifId: 'panel-mosaic', aspect: 1.44 },
  's3-panel-5': { motifId: 'panel-mosaic-wide', aspect: 2.993 },
  // organic
  's3-shape-7': { motifId: 'organic-splash', aspect: 0.975 },
  's3-shape-8': { motifId: 'organic-cloud', aspect: 1.012 },
  's3-shape-9': { motifId: 'organic-starburst', aspect: 0.994 },
  's3-shape-10': { motifId: 'organic-pebble-round', aspect: 1.139 },
  's3-shape-11': { motifId: 'organic-pebble-tilted', aspect: 1.078 },
  's3-shape-12': { motifId: 'organic-pebble-soft', aspect: 1.06 },
  's3-shape-13': { motifId: 'organic-wedge', aspect: 0.817 },
  's3-shape-14': { motifId: 'organic-ribbon', aspect: 3.255 },
  's3-shape-15': { motifId: 'organic-fringed', aspect: 1.266 },
  's3-shape-16': { motifId: 'organic-cloud-small', aspect: 1.087 },
  's3-shape-17': { motifId: 'organic-slope', aspect: 1.737 },
  's3-shape-18': { motifId: 'organic-river-stone', aspect: 1.012 },
  's3-shape-19': { motifId: 'organic-oval-stone', aspect: 1.125 },
  's3-shape-20': { motifId: 'organic-flat-stone', aspect: 1.173 },
  's3-shape-21': { motifId: 'organic-curved-ribbon', aspect: 3.114 },
  's3-shape-22': { motifId: 'organic-arc', aspect: 2.069 },
  's3-shape-23': { motifId: 'organic-fringed', aspect: 1.42 },
}

/** New motif id for an old asset id; ids that are already motif ids pass through unchanged. */
export function resolveLegacyId(id: string): string {
  return LEGACY_ALIASES[id]?.motifId ?? id
}
