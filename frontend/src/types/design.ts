export type DesignShape = 'rectangle' | 'round' | 'runner'

export interface DesignBorder {
  order: number
  widthIn: number
  colorId: string
  patternId: string
}

export interface Design {
  id?: string
  shape: DesignShape
  widthFt: number
  heightFt: number
  fieldColorId: string
  fieldPatternId: string
  borders: DesignBorder[]
  medallionEnabled: boolean
  medallionPatternId?: string
  medallionColorId?: string
  medallionScale?: number
  materialId: string
  pileTypeId: string
  priceEstimate?: number
}

export const SIZE_PRESETS: { label: string; widthFt: number; heightFt: number }[] = [
  { label: "3' x 5'", widthFt: 3, heightFt: 5 },
  { label: "5' x 8'", widthFt: 5, heightFt: 8 },
  { label: "8' x 10'", widthFt: 8, heightFt: 10 },
]

export function createDefaultDesign(): Design {
  return {
    shape: 'rectangle',
    widthFt: 5,
    heightFt: 8,
    fieldColorId: '',
    fieldPatternId: '',
    borders: [],
    medallionEnabled: false,
    medallionScale: 1,
    materialId: '',
    pileTypeId: '',
  }
}
