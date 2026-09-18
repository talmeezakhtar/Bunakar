export type ColorGroup = 'traditional' | 'pastel' | 'bold'

export interface Color {
  id: string
  name: string
  hex: string
  group: ColorGroup
}

export type PatternCategory = 'geometric' | 'persian_floral' | 'medallion' | 'tribal' | 'contemporary'

export interface Pattern {
  id: string
  name: string
  category: PatternCategory
  svgPath: string
  colorSlots: string[]
}

export type MaterialName = 'wool' | 'silk' | 'jute' | 'cotton'

export interface Material {
  id: string
  name: MaterialName
  textureSwatchUrl: string
}

export type PileTypeName = 'hand_knotted' | 'tufted' | 'flatweave' | 'shag'

export interface PileType {
  id: string
  name: PileTypeName
  textureSwatchUrl: string
}
