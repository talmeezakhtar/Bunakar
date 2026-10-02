/**
 * Design pieces and borders cut from the three design sheets (public/designs, transparent WebP,
 * ~420 KB in total). Sheets 1-2 are traditional Persian/tribal art; sheet 3 is modern
 * hand-tufted carved pile. They sit on top of painted tiles - see `DesignOverlay`.
 */

export type DesignAssetKind = 'piece' | 'border'

export type DesignCategory = 'Medallions' | 'Modern' | 'Florals' | 'Geometric' | 'Paisley' | 'Animals' | 'Organic' | 'Borders'

export interface DesignAsset {
  id: string
  name: string
  kind: DesignAssetKind
  category: DesignCategory
  url: string
  /** Width / height of the art (for a border: of one seamless repeat, at full strip height). */
  aspect: number
}

export const DESIGN_ASSETS: DesignAsset[] = [
  { id: 's1-border-1', name: 'Herati Guard', kind: 'border', category: 'Borders', url: '/designs/s1-border-1.webp', aspect: 4.836 },
  { id: 's1-border-2', name: 'Kilim Lozenge', kind: 'border', category: 'Borders', url: '/designs/s1-border-2.webp', aspect: 4.102 },
  { id: 's1-border-3', name: 'Vine Scroll', kind: 'border', category: 'Borders', url: '/designs/s1-border-3.webp', aspect: 2.062 },
  { id: 's2-border-1', name: 'Crescent Guard', kind: 'border', category: 'Borders', url: '/designs/s2-border-1.webp', aspect: 1.930 },
  { id: 's2-border-2', name: 'Lotus Vine', kind: 'border', category: 'Borders', url: '/designs/s2-border-2.webp', aspect: 3.477 },
  { id: 's2-border-3', name: 'Tree of Life Band', kind: 'border', category: 'Borders', url: '/designs/s2-border-3.webp', aspect: 4.984 },
  { id: 's1-medallion-1', name: 'Star Medallion', kind: 'piece', category: 'Medallions', url: '/designs/s1-medallion-1.webp', aspect: 1.343 },
  { id: 's1-medallion-2', name: 'Octagram Medallion', kind: 'piece', category: 'Medallions', url: '/designs/s1-medallion-2.webp', aspect: 1.012 },
  { id: 's1-medallion-3', name: 'Garden Medallion', kind: 'piece', category: 'Medallions', url: '/designs/s1-medallion-3.webp', aspect: 1.378 },
  { id: 's2-medallion-1', name: 'Shah Abbas Medallion', kind: 'piece', category: 'Medallions', url: '/designs/s2-medallion-1.webp', aspect: 1.366 },
  { id: 's2-medallion-2', name: 'Caucasian Medallion', kind: 'piece', category: 'Medallions', url: '/designs/s2-medallion-2.webp', aspect: 1.315 },
  { id: 's2-medallion-3', name: 'Isfahan Medallion', kind: 'piece', category: 'Medallions', url: '/designs/s2-medallion-3.webp', aspect: 1.357 },
  { id: 's1-motif-1', name: 'Boteh', kind: 'piece', category: 'Paisley', url: '/designs/s1-motif-1.webp', aspect: 0.600 },
  { id: 's1-motif-2', name: 'Boteh, Gold', kind: 'piece', category: 'Paisley', url: '/designs/s1-motif-2.webp', aspect: 0.610 },
  { id: 's1-motif-3', name: 'Endless Knot', kind: 'piece', category: 'Geometric', url: '/designs/s1-motif-3.webp', aspect: 1.415 },
  { id: 's1-motif-5', name: 'Star Gul', kind: 'piece', category: 'Geometric', url: '/designs/s1-motif-5.webp', aspect: 1.386 },
  { id: 's1-motif-8', name: 'Lozenge', kind: 'piece', category: 'Geometric', url: '/designs/s1-motif-8.webp', aspect: 0.740 },
  { id: 's1-motif-11', name: 'Kilim Diamond', kind: 'piece', category: 'Geometric', url: '/designs/s1-motif-11.webp', aspect: 1.120 },
  { id: 's1-motif-14', name: 'Small Lozenge', kind: 'piece', category: 'Geometric', url: '/designs/s1-motif-14.webp', aspect: 0.850 },
  { id: 's2-motif-7', name: 'Lozenge, Coral', kind: 'piece', category: 'Geometric', url: '/designs/s2-motif-7.webp', aspect: 0.750 },
  { id: 's2-motif-13', name: 'Small Lozenge, Coral', kind: 'piece', category: 'Geometric', url: '/designs/s2-motif-13.webp', aspect: 0.842 },
  { id: 's1-motif-4', name: 'Rosette', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-4.webp', aspect: 1.000 },
  { id: 's1-motif-6', name: 'Rosette, Crimson', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-6.webp', aspect: 1.020 },
  { id: 's1-motif-7', name: 'Flower Spray', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-7.webp', aspect: 0.710 },
  { id: 's1-motif-9', name: 'Palmette, Amber', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-9.webp', aspect: 0.929 },
  { id: 's1-motif-10', name: 'Blossom, Navy', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-10.webp', aspect: 1.000 },
  { id: 's1-motif-12', name: 'Palmette, Crimson', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-12.webp', aspect: 0.963 },
  { id: 's1-motif-13', name: 'Blossom, Wine', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-13.webp', aspect: 1.000 },
  { id: 's1-motif-15', name: 'Sprig, Sage', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-15.webp', aspect: 0.933 },
  { id: 's1-motif-16', name: 'Sprig, Rust', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-16.webp', aspect: 0.893 },
  { id: 's1-motif-24', name: 'Leaf Fan', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-24.webp', aspect: 0.900 },
  { id: 's1-motif-25', name: 'Sprig, Olive', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-25.webp', aspect: 0.926 },
  { id: 's1-motif-26', name: 'Stem Flower', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-26.webp', aspect: 0.720 },
  { id: 's1-motif-27', name: 'Star Flower', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-27.webp', aspect: 1.000 },
  { id: 's1-motif-28', name: 'Star Flower, Wine', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-28.webp', aspect: 0.971 },
  { id: 's1-motif-29', name: 'Lotus Palmette', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-29.webp', aspect: 0.971 },
  { id: 's1-motif-30', name: 'Lotus, Navy', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-30.webp', aspect: 0.909 },
  { id: 's1-motif-31', name: 'Lotus Bud', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-31.webp', aspect: 1.028 },
  { id: 's1-motif-33', name: 'Lotus, Amber', kind: 'piece', category: 'Florals', url: '/designs/s1-motif-33.webp', aspect: 0.973 },
  { id: 's2-motif-28', name: 'Feather Palmette', kind: 'piece', category: 'Florals', url: '/designs/s2-motif-28.webp', aspect: 1.000 },
  { id: 's2-motif-29', name: 'Lotus, Coral', kind: 'piece', category: 'Florals', url: '/designs/s2-motif-29.webp', aspect: 0.973 },
  { id: 's2-motif-3', name: 'Peacock', kind: 'piece', category: 'Animals', url: '/designs/s2-motif-3.webp', aspect: 0.964 },
  { id: 's2-motif-4', name: 'Lion', kind: 'piece', category: 'Animals', url: '/designs/s2-motif-4.webp', aspect: 1.341 },
  { id: 's2-motif-24', name: 'Tribal Hound, Coral', kind: 'piece', category: 'Animals', url: '/designs/s2-motif-24.webp', aspect: 1.195 },
  { id: 's2-motif-25', name: 'Tribal Hound, Ivory', kind: 'piece', category: 'Animals', url: '/designs/s2-motif-25.webp', aspect: 1.220 },
  // Sheet 3: modern hand-tufted carved pieces
  { id: 's3-border-4', name: 'Wave Ribbon', kind: 'border', category: 'Borders', url: '/designs/s3-border-4.webp', aspect: 14.604 },
  { id: 's3-border-6', name: 'Carved Swirl', kind: 'border', category: 'Borders', url: '/designs/s3-border-6.webp', aspect: 19.031 },
  { id: 's3-panel-1', name: 'Color Field Panel', kind: 'piece', category: 'Modern', url: '/designs/s3-panel-1.webp', aspect: 1.634 },
  { id: 's3-panel-2', name: 'Cobblestone Panel', kind: 'piece', category: 'Modern', url: '/designs/s3-panel-2.webp', aspect: 1.152 },
  { id: 's3-panel-3', name: 'Mosaic Panel, Teal', kind: 'piece', category: 'Modern', url: '/designs/s3-panel-3.webp', aspect: 1.440 },
  { id: 's3-panel-5', name: 'Mosaic Panel, Stone', kind: 'piece', category: 'Modern', url: '/designs/s3-panel-5.webp', aspect: 2.993 },
  { id: 's3-shape-7', name: 'Ink Splash, Charcoal', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-7.webp', aspect: 0.975 },
  { id: 's3-shape-8', name: 'Cloud, Taupe', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-8.webp', aspect: 1.012 },
  { id: 's3-shape-9', name: 'Starburst, Sand', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-9.webp', aspect: 0.994 },
  { id: 's3-shape-10', name: 'Pebble, Mustard', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-10.webp', aspect: 1.139 },
  { id: 's3-shape-11', name: 'Pebble, Teal', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-11.webp', aspect: 1.078 },
  { id: 's3-shape-12', name: 'Pebble, Cream', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-12.webp', aspect: 1.060 },
  { id: 's3-shape-13', name: 'Ribbed Wedge', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-13.webp', aspect: 0.817 },
  { id: 's3-shape-14', name: 'Ribbon, Teal', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-14.webp', aspect: 3.255 },
  { id: 's3-shape-15', name: 'Fringed Square, Grey', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-15.webp', aspect: 1.266 },
  { id: 's3-shape-16', name: 'Cloud, Umber', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-16.webp', aspect: 1.087 },
  { id: 's3-shape-17', name: 'Ribbed Slope', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-17.webp', aspect: 1.737 },
  { id: 's3-shape-18', name: 'Pebble, Moss', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-18.webp', aspect: 1.012 },
  { id: 's3-shape-19', name: 'Pebble, Ivory', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-19.webp', aspect: 1.125 },
  { id: 's3-shape-20', name: 'Pebble, Stone', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-20.webp', aspect: 1.173 },
  { id: 's3-shape-21', name: 'Ribbon, Rust', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-21.webp', aspect: 3.114 },
  { id: 's3-shape-22', name: 'Arc, Sage', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-22.webp', aspect: 2.069 },
  { id: 's3-shape-23', name: 'Fringed Square, Camel', kind: 'piece', category: 'Organic', url: '/designs/s3-shape-23.webp', aspect: 1.420 },
]

export const PIECE_CATEGORIES: DesignCategory[] = ['Medallions', 'Modern', 'Florals', 'Geometric', 'Paisley', 'Animals', 'Organic']

const BY_ID = new Map(DESIGN_ASSETS.map((a) => [a.id, a]))

export function findDesignAsset(id: string | null | undefined): DesignAsset | undefined {
  return id ? BY_ID.get(id) : undefined
}

/** A piece's footprint in whole tiles at `size` tiles tall, keeping the art's proportions. */
export function pieceFootprint(asset: DesignAsset, size: number): { widthTiles: number; heightTiles: number } {
  return { widthTiles: Math.max(1, Math.round(asset.aspect * size)), heightTiles: size }
}

/** Default size (tiles tall) when a piece is picked: medallions and panels read as a centerpiece. */
export function defaultPieceSize(asset: DesignAsset): number {
  return asset.category === 'Medallions' || asset.category === 'Modern' ? 2 : 1
}
