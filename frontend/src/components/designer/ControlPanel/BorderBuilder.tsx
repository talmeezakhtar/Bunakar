import { useDesign } from '../../../store/DesignContext'
import type { Color, Pattern } from '../../../types/catalog'

function BorderBuilder({ colors, patterns }: { colors: Color[]; patterns: Pattern[] }) {
  const { design, dispatch } = useDesign()

  function addBorder() {
    dispatch({
      type: 'ADD_BORDER',
      border: {
        order: design.borders.length,
        widthIn: 2,
        colorId: colors[0]?.id ?? '',
        patternId: patterns[0]?.id ?? '',
      },
    })
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= design.borders.length) return
    const reordered = [...design.borders]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    dispatch({ type: 'REORDER_BORDERS', borders: reordered.map((b, i) => ({ ...b, order: i })) })
  }

  return (
    <section aria-labelledby="border-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="border-heading" className="text-sm font-semibold text-stone-700">
          Borders
        </h2>
        <button type="button" onClick={addBorder} className="text-xs font-medium text-stone-700 underline">
          + Add ring
        </button>
      </div>

      <ul className="space-y-2">
        {design.borders.map((border, index) => (
          <li key={index} className="flex items-center gap-2 rounded border border-stone-200 p-2 text-xs">
            <span className="w-4 text-stone-400">#{index + 1}</span>

            <select
              value={border.colorId}
              onChange={(e) => dispatch({ type: 'UPDATE_BORDER', index, border: { colorId: e.target.value } })}
              className="rounded border border-stone-300 px-1 py-0.5"
            >
              {colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={border.patternId}
              onChange={(e) => dispatch({ type: 'UPDATE_BORDER', index, border: { patternId: e.target.value } })}
              className="rounded border border-stone-300 px-1 py-0.5"
            >
              {patterns.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={0.5}
              step={0.5}
              value={border.widthIn}
              onChange={(e) => dispatch({ type: 'UPDATE_BORDER', index, border: { widthIn: Number(e.target.value) } })}
              className="w-14 rounded border border-stone-300 px-1 py-0.5"
              aria-label="Border width in inches"
            />

            <div className="ml-auto flex gap-1">
              <button type="button" onClick={() => move(index, -1)} className="text-stone-500">
                ↑
              </button>
              <button type="button" onClick={() => move(index, 1)} className="text-stone-500">
                ↓
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_BORDER', index })}
                className="text-red-600"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {design.borders.length === 0 && <p className="text-xs text-stone-400">No border rings yet.</p>}
      </ul>
    </section>
  )
}

export default BorderBuilder
