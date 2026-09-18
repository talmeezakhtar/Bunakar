import { useMemo } from 'react'
import { useDesign } from '../../store/DesignContext'
import { estimatePrice } from '../../utils/pricing'
import type { Material, PileType } from '../../types/catalog'

function PriceBar({ materials, pileTypes }: { materials: Material[]; pileTypes: PileType[] }) {
  const { design } = useDesign()

  const price = useMemo(() => {
    const material = materials.find((m) => m.id === design.materialId)
    const pileType = pileTypes.find((p) => p.id === design.pileTypeId)
    return estimatePrice({
      widthFt: design.widthFt,
      heightFt: design.heightFt,
      material: material?.name,
      pileType: pileType?.name,
      borderCount: design.borders.length,
      medallionEnabled: design.medallionEnabled,
    })
  }, [design, materials, pileTypes])

  return (
    <div className="sticky bottom-0 flex items-center justify-between border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:static md:rounded-lg md:border md:shadow-sm">
      <span className="text-sm text-stone-500">Estimated price</span>
      <span className="text-lg font-semibold text-stone-900">
        {price === null ? 'Select material & pile type' : `$${price.toFixed(2)}`}
      </span>
    </div>
  )
}

export default PriceBar
