import type { MaterialName, PileTypeName } from '../types/catalog'

// Mirrors backend/src/designs/pricing.ts for a live estimate; the backend
// value returned on save is always the source of truth.
const MATERIAL_RATE_PER_SQFT: Record<MaterialName, number> = {
  wool: 40,
  silk: 120,
  jute: 15,
  cotton: 20,
}

const PILE_TYPE_MULTIPLIER: Record<PileTypeName, number> = {
  hand_knotted: 1.5,
  tufted: 1.0,
  flatweave: 0.8,
  shag: 1.1,
}

const BORDER_COST_PER_RING = 15
const MEDALLION_COST = 50

export interface PriceEstimateInput {
  widthFt: number
  heightFt: number
  material?: MaterialName
  pileType?: PileTypeName
  borderCount: number
  medallionEnabled: boolean
}

export function estimatePrice(input: PriceEstimateInput): number | null {
  if (!input.material || !input.pileType) return null
  const area = input.widthFt * input.heightFt
  const base = area * MATERIAL_RATE_PER_SQFT[input.material] * PILE_TYPE_MULTIPLIER[input.pileType]
  const borderCost = input.borderCount * BORDER_COST_PER_RING
  const medallionCost = input.medallionEnabled ? MEDALLION_COST : 0
  return Math.round((base + borderCost + medallionCost) * 100) / 100
}
