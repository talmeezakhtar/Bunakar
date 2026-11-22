// Self-check for rug sources: `npx tsx src/three/rug/rugSource.check.ts`.
// Tiles are 1.5 ft; templates snap to whole tiles; keys follow the content, not the name.
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import { createDefaultFreeformDesign } from '../../types/freeform'
import { TILE_SIZE_FT, createDefaultTileDesign } from '../../types/tileDesign'
import { resolveRugSource } from './rugSource'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}
const byId = new Map(MOCK_SWATCHES.map((s) => [s.id, s]))

assert(TILE_SIZE_FT === 1.5, 'tiles are 18 inches')
{
  const state = createDefaultTileDesign(4, 6)
  state.tiles['0-0'] = [{ swatchId: 'solid-navy', cutType: 'full', rotation: 0 }]
  const rug = resolveRugSource({ kind: 'tile', state, swatchesById: byId })
  assert(rug.widthFt === 6 && rug.heightFt === 9, `4x6 tiles = 6x9 ft, got ${rug.widthFt}x${rug.heightFt}`)
  assert(rug.ftPerUnit === 1.5 && rug.art.width === 4 && rug.art.height === 6, 'tile art is in tile units')
  assert(rug.art.width * rug.ftPerUnit === rug.widthFt, 'feet per tile')
  const renamed = resolveRugSource({ kind: 'tile', state: { ...state, name: 'Other' }, swatchesById: byId })
  assert(renamed.key === rug.key, 'renaming must not change the texture key')
  const recolored = { ...state, tiles: { '0-0': [{ swatchId: 'solid-gold', cutType: 'full' as const, rotation: 0 as const }] } }
  assert(resolveRugSource({ kind: 'tile', state: recolored, swatchesById: byId }).key !== rug.key, 'recoloring must change the key')
}
{
  const rug = resolveRugSource({ kind: 'template', templateId: 'kilim-stepped-diamond', colorwayId: 'kilim-red', widthFt: 5, heightFt: 8 })
  // 5 ft -> 3 tiles (4.5 ft), 8 ft -> 5 tiles (7.5 ft).
  assert(rug.widthFt === 4.5 && rug.heightFt === 7.5, `template snaps to tiles, got ${rug.widthFt}x${rug.heightFt}`)
  assert(rug.design.kind === 'tile' && Object.keys(rug.design.state.tiles).length === 15, 'template fills every tile')
  // (Not calling render: tsx compiles the renderers' JSX in classic mode outside Vite.)
  assert(typeof rug.art.render === 'function', 'art has a renderer')
  const again = resolveRugSource({ kind: 'template', templateId: 'kilim-stepped-diamond', colorwayId: 'kilim-red', widthFt: 5, heightFt: 8 })
  assert(again.key === rug.key, 'same template -> same key')
  const tiny = resolveRugSource({ kind: 'template', templateId: 'kilim-chevron', colorwayId: 'oasis', widthFt: 0.2, heightFt: 0.2 })
  assert(tiny.widthFt === TILE_SIZE_FT && tiny.heightFt === TILE_SIZE_FT, 'at least one tile each way')
}
{
  const state = createDefaultFreeformDesign(5, 7, 'solid-ivory')
  const rug = resolveRugSource({ kind: 'freeform', state, swatchesById: byId })
  assert(rug.widthFt === 5 && rug.heightFt === 7 && rug.ftPerUnit === 1, 'freeform is in feet')
}
let threw = false
try {
  resolveRugSource({ kind: 'template', templateId: 'nope', colorwayId: 'oasis', widthFt: 5, heightFt: 8 })
} catch {
  threw = true
}
assert(threw, 'unknown template throws')
console.log('rugSource: ok')
