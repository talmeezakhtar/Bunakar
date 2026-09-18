import { useState } from 'react'
import ShapeSizePicker from './ShapeSizePicker'
import ColorPalette from './ColorPalette'
import PatternLibrary from './PatternLibrary'
import BorderBuilder from './BorderBuilder'
import MaterialSelector from './MaterialSelector'
import type { Color, Material, Pattern, PileType } from '../../../types/catalog'

const TABS = [
  { id: 'shape', label: 'Shape & Size' },
  { id: 'field', label: 'Field' },
  { id: 'pattern', label: 'Pattern' },
  { id: 'border', label: 'Border' },
  { id: 'material', label: 'Material' },
] as const

type TabId = (typeof TABS)[number]['id']

interface ControlPanelProps {
  colors: Color[]
  patterns: Pattern[]
  materials: Material[]
  pileTypes: PileType[]
}

// Every tab is freely clickable — this is not a forced linear wizard.
function ControlPanel({ colors, patterns, materials, pileTypes }: ControlPanelProps) {
  const [active, setActive] = useState<TabId>('shape')

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm md:w-80">
      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-2 text-xs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`rounded px-2 py-1 transition-colors ${
              active === tab.id ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'shape' && <ShapeSizePicker />}
      {active === 'field' && <ColorPalette colors={colors} />}
      {active === 'pattern' && <PatternLibrary patterns={patterns} />}
      {active === 'border' && <BorderBuilder colors={colors} patterns={patterns} />}
      {active === 'material' && <MaterialSelector materials={materials} pileTypes={pileTypes} />}
    </div>
  )
}

export default ControlPanel
