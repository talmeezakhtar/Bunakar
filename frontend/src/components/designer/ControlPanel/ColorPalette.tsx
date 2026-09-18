import { useState } from 'react'
import { useDesign } from '../../../store/DesignContext'
import type { Color, ColorGroup } from '../../../types/catalog'

const GROUPS: { value: ColorGroup; label: string }[] = [
  { value: 'traditional', label: 'Traditional' },
  { value: 'pastel', label: 'Pastel' },
  { value: 'bold', label: 'Bold' },
]

function ColorPalette({ colors }: { colors: Color[] }) {
  const { design, dispatch } = useDesign()
  const [group, setGroup] = useState<ColorGroup>('traditional')

  const visible = colors.filter((c) => c.group === group)

  return (
    <section aria-labelledby="color-heading" className="space-y-3">
      <h2 id="color-heading" className="text-sm font-semibold text-stone-700">
        Field color
      </h2>

      <div className="flex gap-1.5 text-xs">
        {GROUPS.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => setGroup(g.value)}
            className={`rounded px-2 py-1 ${group === g.value ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {visible.map((color) => (
          <button
            key={color.id}
            type="button"
            title={color.name}
            aria-label={color.name}
            onClick={() => dispatch({ type: 'SET_FIELD_COLOR', colorId: color.id })}
            style={{ backgroundColor: color.hex }}
            className={`h-8 w-8 rounded-full border-2 ${
              design.fieldColorId === color.id ? 'border-stone-800' : 'border-transparent'
            }`}
          />
        ))}
        {visible.length === 0 && <p className="text-xs text-stone-400">No colors in this group yet.</p>}
      </div>
    </section>
  )
}

export default ColorPalette
