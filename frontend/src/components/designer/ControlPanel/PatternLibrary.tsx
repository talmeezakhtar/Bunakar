import { useState } from 'react'
import { useDesign } from '../../../store/DesignContext'
import type { Pattern, PatternCategory } from '../../../types/catalog'

const CATEGORIES: { value: PatternCategory; label: string }[] = [
  { value: 'geometric', label: 'Geometric' },
  { value: 'persian_floral', label: 'Persian/Floral' },
  { value: 'medallion', label: 'Medallion' },
  { value: 'tribal', label: 'Tribal' },
  { value: 'contemporary', label: 'Contemporary' },
]

function PatternLibrary({ patterns }: { patterns: Pattern[] }) {
  const { design, dispatch } = useDesign()
  const [category, setCategory] = useState<PatternCategory>('geometric')

  const visible = patterns.filter((p) => p.category === category)

  return (
    <section aria-labelledby="pattern-heading" className="space-y-3">
      <h2 id="pattern-heading" className="text-sm font-semibold text-stone-700">
        Pattern
      </h2>

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as PatternCategory)}
        className="rounded border border-stone-300 px-2 py-1 text-sm"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-4 gap-2">
        {visible.map((pattern) => (
          <button
            key={pattern.id}
            type="button"
            title={pattern.name}
            onClick={() => dispatch({ type: 'SET_FIELD_PATTERN', patternId: pattern.id })}
            className={`flex aspect-square items-center justify-center rounded border text-[10px] ${
              design.fieldPatternId === pattern.id ? 'border-stone-800 ring-1 ring-stone-800' : 'border-stone-300'
            }`}
          >
            <svg viewBox="0 0 40 40" className="h-full w-full p-1">
              <path d={pattern.svgPath} fill="#8a7f6a" />
            </svg>
          </button>
        ))}
        {visible.length === 0 && <p className="col-span-4 text-xs text-stone-400">No patterns in this category yet.</p>}
      </div>
    </section>
  )
}

export default PatternLibrary
