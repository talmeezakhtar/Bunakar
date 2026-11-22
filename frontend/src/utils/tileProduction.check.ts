// Self-check for the weaver's sheet: `npx tsx src/utils/tileProduction.check.ts`.
import { MOCK_SWATCHES } from '../data/mockSwatches'
import { createDefaultTileDesign } from '../types/tileDesign'
import type { TileDesignState } from '../types/tileDesign'
import { columnName, tileWeaverSheetSvg, woolList } from './tileProduction'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

assert(columnName(0) === 'A' && columnName(25) === 'Z' && columnName(26) === 'AA', 'column names')

const byId = new Map(MOCK_SWATCHES.map((s) => [s.id, s]))
const state: TileDesignState = {
  ...createDefaultTileDesign(2, 2),
  name: 'Test & <Rug>',
  tiles: {
    '0-0': [{ swatchId: 'solid-wine', cutType: 'full', rotation: 0 }],
    '0-1': [
      { swatchId: 'solid-wine', cutType: 'half', rotation: 0 },
      { swatchId: 'solid-gold', cutType: 'half', rotation: 180 },
    ],
    '1-0': [{ swatchId: 'solid-gold', cutType: 'full', rotation: 0 }],
  },
} as TileDesignState

const wool = woolList(state, byId)
assert(wool.length === 2 && wool[0].tiles === 1.5 && wool[1].tiles === 1.5, `wool by tile share: ${JSON.stringify(wool)}`)
assert(wool[0].code === 'C1', 'codes in order')

const svg = tileWeaverSheetSvg(state, byId)
assert(svg.includes('Test &amp; &lt;Rug&gt;') && !svg.includes('<Rug>'), 'name escaped')
assert(svg.includes('>A1<') && svg.includes('>B2<'), 'tile references')
assert(svg.includes('Swatch solid-wine'), 'swatch codes listed')
console.log('ok: weaver sheet')
