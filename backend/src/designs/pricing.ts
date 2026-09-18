import { MaterialName } from '../materials/entities/material.entity';
import { PileTypeName } from '../materials/entities/pile-type.entity';

const MATERIAL_RATE_PER_SQFT: Record<MaterialName, number> = {
  [MaterialName.WOOL]: 40,
  [MaterialName.SILK]: 120,
  [MaterialName.JUTE]: 15,
  [MaterialName.COTTON]: 20,
};

const PILE_TYPE_MULTIPLIER: Record<PileTypeName, number> = {
  [PileTypeName.HAND_KNOTTED]: 1.5,
  [PileTypeName.TUFTED]: 1.0,
  [PileTypeName.FLATWEAVE]: 0.8,
  [PileTypeName.SHAG]: 1.1,
};

const BORDER_COST_PER_RING = 15;
const MEDALLION_COST = 50;

export interface PriceEstimateInput {
  widthFt: number;
  heightFt: number;
  material: MaterialName;
  pileType: PileTypeName;
  borderCount: number;
  medallionEnabled: boolean;
}

export function estimatePrice(input: PriceEstimateInput): number {
  const area = input.widthFt * input.heightFt;
  const base =
    area *
    MATERIAL_RATE_PER_SQFT[input.material] *
    PILE_TYPE_MULTIPLIER[input.pileType];
  const borderCost = input.borderCount * BORDER_COST_PER_RING;
  const medallionCost = input.medallionEnabled ? MEDALLION_COST : 0;
  return Math.round((base + borderCost + medallionCost) * 100) / 100;
}
