import { useDesign } from '../../../store/DesignContext'
import type { Material, PileType } from '../../../types/catalog'

function MaterialSelector({ materials, pileTypes }: { materials: Material[]; pileTypes: PileType[] }) {
  const { design, dispatch } = useDesign()

  return (
    <section aria-labelledby="material-heading" className="space-y-3">
      <h2 id="material-heading" className="text-sm font-semibold text-stone-700">
        Material & pile
      </h2>

      <div className="flex flex-wrap gap-2">
        {materials.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => dispatch({ type: 'SET_MATERIAL', materialId: m.id })}
            className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
              design.materialId === m.id
                ? 'border-stone-800 bg-stone-800 text-white'
                : 'border-stone-300 text-stone-700 hover:border-stone-400'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {pileTypes.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => dispatch({ type: 'SET_PILE_TYPE', pileTypeId: p.id })}
            className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
              design.pileTypeId === p.id
                ? 'border-stone-800 bg-stone-800 text-white'
                : 'border-stone-300 text-stone-700 hover:border-stone-400'
            }`}
          >
            {p.name.replace('_', ' ')}
          </button>
        ))}
      </div>
    </section>
  )
}

export default MaterialSelector
