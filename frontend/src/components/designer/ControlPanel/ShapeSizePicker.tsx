import { useDesign } from '../../../store/DesignContext'
import { SIZE_PRESETS } from '../../../types/design'
import type { DesignShape } from '../../../types/design'

const SHAPES: { value: DesignShape; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'round', label: 'Round' },
  { value: 'runner', label: 'Runner' },
]

function ShapeSizePicker() {
  const { design, dispatch } = useDesign()

  return (
    <section aria-labelledby="shape-size-heading" className="space-y-3">
      <h2 id="shape-size-heading" className="text-sm font-semibold text-stone-700">
        Shape & size
      </h2>

      <div className="flex gap-2">
        {SHAPES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => dispatch({ type: 'SET_SHAPE', shape: s.value })}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              design.shape === s.value
                ? 'border-stone-800 bg-stone-800 text-white'
                : 'border-stone-300 text-stone-700 hover:border-stone-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SIZE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => dispatch({ type: 'SET_SIZE', widthFt: preset.widthFt, heightFt: preset.heightFt })}
            className={`rounded-md border px-2.5 py-1 text-xs ${
              design.widthFt === preset.widthFt && design.heightFt === preset.heightFt
                ? 'border-stone-800 bg-stone-100'
                : 'border-stone-300 text-stone-600 hover:border-stone-400'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-sm text-stone-600">
        <label className="flex items-center gap-1.5">
          W (ft)
          <input
            type="number"
            min={1}
            value={design.widthFt}
            onChange={(e) => dispatch({ type: 'SET_SIZE', widthFt: Number(e.target.value), heightFt: design.heightFt })}
            className="w-16 rounded border border-stone-300 px-1.5 py-0.5"
          />
        </label>
        <label className="flex items-center gap-1.5">
          H (ft)
          <input
            type="number"
            min={1}
            value={design.heightFt}
            onChange={(e) => dispatch({ type: 'SET_SIZE', widthFt: design.widthFt, heightFt: Number(e.target.value) })}
            className="w-16 rounded border border-stone-300 px-1.5 py-0.5"
          />
        </label>
      </div>
    </section>
  )
}

export default ShapeSizePicker
