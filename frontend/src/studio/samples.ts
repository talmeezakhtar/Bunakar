/**
 * A sample rug for each construction, for the setup step: built from the Studio's own styles and
 * generators, so it shows what that craft really makes. Given a set of yarns, the same sample is
 * recoloured in them, so a starting palette can be seen on the rug it will become.
 */
import type { Swatch } from '../types/swatch'
import { applyGenerator, findGenerator, findPalette } from '../data/freeformGenerators'
import { applyTemplate, findTemplate } from '../data/patternTemplates'
import type { Colorway } from '../data/patternTemplates'
import { createDefaultFreeformDesign } from '../types/freeform'
import { createDefaultTileDesign } from '../types/tileDesign'
import type { RugSource } from '../three/rug/rugSource'
import { remapLayout, withLayout } from './layout'
import { withBraid } from './braid'
import { catalogueStamper } from './motifStamp'
import { PRESETS } from './presets'
import { newRug } from './model'
import type { Construction } from './model'
import { paletteYarns } from './palettes'

/** Each charted construction's signature style. */
const STYLE: Partial<Record<Construction, string>> = { knotted: 'kashan', flatweave: 'kilim', needlepoint: 'art-deco' }

function charted(construction: Construction, swatchIds: string[] | undefined, byId: Map<string, Swatch>): RugSource {
  const preset = PRESETS.find((p) => p.id === STYLE[construction])!
  const ids = swatchIds ?? preset.swatchIds
  // A palette shorter than the style's: its yarns take the extra roles in turn.
  const layout = remapLayout(preset.layout, (i) => ((i - 1) % ids.length) + 1)
  const doc = newRug({ construction, widthFt: 8, heightFt: 5, palette: paletteYarns(ids) })
  const hexes = ids.map((id) => byId.get(id)?.swatchColor ?? '#888888')
  return { kind: 'doc', doc: withLayout(doc, layout, catalogueStamper(hexes)), swatchesById: byId }
}

function braided(swatchIds: string[] | undefined, byId: Map<string, Swatch>): RugSource {
  const ids = swatchIds ?? ['wool-terracotta', 'solid-navy', 'solid-ivory', 'wool-mustard', 'wool-sage']
  const y = (i: number) => (i % ids.length) + 1
  const doc = newRug({ construction: 'braided', shape: { kind: 'round' }, widthFt: 7, heightFt: 7, palette: paletteYarns(ids) })
  return { kind: 'doc', doc: withBraid(doc, { braidIn: 1.5, bands: [[y(0), y(1), y(2)], [y(2), y(2), y(3)], [y(1), y(0), y(1)], [y(3), y(4), y(2)]] }), swatchesById: byId }
}

function freehand(loop: boolean, swatchIds: string[] | undefined, byId: Map<string, Swatch>, catalog: Swatch[]): RugSource {
  const g = findGenerator(loop ? 'cobblestone' : 'splash')!
  const state = applyGenerator(createDefaultFreeformDesign(8, 5), g, findPalette(loop ? 'sage-garden' : 'riviera')!, { ...g.defaults, seed: 4 }, catalog)
  // Recolour: the generator's yarns, in order of first use, become the palette's.
  const used = [...new Set([state.ground.swatchId, ...state.shapes.map((s) => s.swatchId)])]
  const swap = (id: string) => (swatchIds ? swatchIds[used.indexOf(id) % swatchIds.length] : id)
  const texture = loop ? ('loop' as const) : undefined
  return {
    kind: 'freeform',
    state: {
      ...state,
      ground: { ...state.ground, swatchId: swap(state.ground.swatchId), ...(texture && { texture }) },
      shapes: state.shapes.map((s) => ({ ...s, swatchId: swap(s.swatchId), ...(texture && { texture }) })),
    },
    swatchesById: byId,
  }
}

function tiles(swatchIds: string[] | undefined, byId: Map<string, Swatch>, catalog: Swatch[]): RugSource {
  if (!swatchIds) return { kind: 'template', templateId: 'moorish-star', colorwayId: 'midnight-gold', widthFt: 9, heightFt: 6 }
  const ref = (i: number) => {
    const s = byId.get(swatchIds[i % swatchIds.length])
    return [s?.familyId ?? '', s?.colorName ?? ''] as const
  }
  const colorway = { id: 'sample', name: 'Sample', roles: [ref(1), ref(2), ref(0), ref(3)] } as Colorway
  return { kind: 'tile', state: applyTemplate(createDefaultTileDesign(6, 4), findTemplate('moorish-star')!, colorway, catalog), swatchesById: byId }
}

/** A landscape sample (about 8 by 5 feet) of the construction, in its own yarns or in `swatchIds`. */
export function constructionSample(construction: Construction, byId: Map<string, Swatch>, swatchIds?: string[]): RugSource {
  const catalog = [...byId.values()]
  switch (construction) {
    case 'knotted':
    case 'flatweave':
    case 'needlepoint':
      return charted(construction, swatchIds, byId)
    case 'tufted':
    case 'hooked':
      return freehand(construction === 'hooked', swatchIds, byId, catalog)
    case 'braided':
      return braided(swatchIds, byId)
    case 'tiles':
      return tiles(swatchIds, byId, catalog)
  }
}
