/**
 * Rug styles to start from: a layout and the yarns it's drawn in, after real weaving traditions.
 * Yarn numbers in each layout are 1-based positions in its own `swatchIds`; applying a preset
 * adds any yarns the rug lacks and renumbers the layout to the rug's palette.
 */
import { remapLayout } from './layout'
import type { LayoutSpec, RugDoc } from './model'

export type PresetGroup = 'Persian & classical' | 'Tribal & village' | 'Flatweave'
export const PRESET_GROUPS: PresetGroup[] = ['Persian & classical', 'Tribal & village', 'Flatweave']

export interface RugPreset {
  id: string
  name: string
  group: PresetGroup
  hint: string
  swatchIds: string[]
  layout: LayoutSpec
}

export const PRESETS: RugPreset[] = [
  {
    id: 'heriz',
    group: 'Persian & classical',
    name: 'Heriz',
    hint: 'Bold angular medallion on brick red, deep navy border',
    swatchIds: ['wool-terracotta', 'solid-navy', 'solid-ivory', 'wool-sand', 'tribal-charcoal', 'wool-aqua'],
    layout: {
      borders: [
        { role: 'outer-guard', widthIn: 1.5, ground: 3 },
        { role: 'main', widthIn: 7, ground: 2, motifId: 'border-kilim-lozenge' },
        { role: 'inner-guard', widthIn: 1.5, ground: 4 },
      ],
      corners: 'mitred',
      field: 1,
      medallion: { shape: 'lozenge', widthPct: 64, heightPct: 54, ground: 2, pendants: true, motifId: 'medallion-caucasian' },
      spandrels: { ground: 3 },
    },
  },
  {
    id: 'kashan',
    group: 'Persian & classical',
    name: 'Kashan',
    hint: 'Curved floral medallion with pendants on wine, scrolling vine border',
    swatchIds: ['solid-wine', 'solid-navy', 'solid-ivory', 'solid-gold', 'tribal-charcoal', 'wool-terracotta'],
    layout: {
      borders: [
        { role: 'outer-guard', widthIn: 1.5, ground: 3 },
        { role: 'main', widthIn: 7, ground: 2, motifId: 'border-vine-scroll' },
        { role: 'inner-guard', widthIn: 1.5, ground: 4 },
      ],
      corners: 'flowing',
      field: 1,
      medallion: { shape: 'oval', widthPct: 62, heightPct: 54, ground: 3, pendants: true, motifId: 'medallion-isfahan' },
      spandrels: { ground: 2, motifId: 'palmette-shah-abbasi' },
    },
  },
  {
    id: 'tabriz',
    group: 'Persian & classical',
    name: 'Tabriz',
    hint: 'Star medallion on ivory, wine corners, lotus vine border',
    swatchIds: ['solid-ivory', 'solid-wine', 'solid-navy', 'solid-gold', 'tribal-charcoal', 'wool-sage'],
    layout: {
      borders: [
        { role: 'outer-guard', widthIn: 1.5, ground: 2 },
        { role: 'main', widthIn: 6.5, ground: 3, motifId: 'border-lotus-vine' },
        { role: 'inner-guard', widthIn: 1.5, ground: 2 },
      ],
      corners: 'flowing',
      field: 1,
      medallion: { shape: 'star', widthPct: 64, heightPct: 52, ground: 2, pendants: true, motifId: 'medallion-star' },
      spandrels: { ground: 2, motifId: 'rosette-classic' },
    },
  },
  {
    id: 'oushak',
    group: 'Persian & classical',
    name: 'Oushak',
    hint: 'Large soft medallion in coral on oat, wide sage border',
    swatchIds: ['wool-oat', 'wool-coral', 'wool-sage', 'wool-sand', 'wool-stone', 'wool-petrol'],
    layout: {
      borders: [{ role: 'main', widthIn: 9, ground: 3, motifId: 'border-vine-scroll' }],
      corners: 'flowing',
      field: 1,
      medallion: { shape: 'oval', widthPct: 76, heightPct: 64, ground: 2, pendants: false, motifId: 'medallion-garden' },
    },
  },
  {
    id: 'isfahan',
    group: 'Persian & classical',
    name: 'Isfahan',
    hint: 'Shah Abbas medallion over an all-over Herati field',
    swatchIds: ['solid-ivory', 'persian-navy', 'persian-wine', 'solid-gold', 'wool-sage', 'tribal-charcoal'],
    layout: {
      borders: [
        { role: 'outer-guard', widthIn: 1.5, ground: 3 },
        { role: 'main', widthIn: 7, ground: 2, motifId: 'border-herati-guard' },
        { role: 'inner-guard', widthIn: 1.5, ground: 3 },
      ],
      corners: 'flowing',
      field: 1,
      repeat: { motifId: 'herati', everyIn: 6, drop: 'half-drop' },
      medallion: { shape: 'lozenge', widthPct: 58, heightPct: 48, ground: 3, pendants: true, motifId: 'medallion-shah-abbas' },
      spandrels: { ground: 2 },
    },
  },
  {
    id: 'baluch',
    group: 'Tribal & village',
    name: 'Baluch',
    hint: 'Dark tribal rug: rows of octagon guls, sawtooth borders',
    swatchIds: ['persian-navy', 'persian-wine', 'wool-camel', 'solid-ivory', 'tribal-charcoal'],
    layout: {
      borders: [
        { role: 'outer-guard', widthIn: 1, ground: 5 },
        { role: 'main', widthIn: 4, ground: 2, motifId: 'border-sawtooth' },
        { role: 'inner-guard', widthIn: 1, ground: 3 },
      ],
      corners: 'mitred',
      field: 1,
      repeat: { motifId: 'gul-octagon', everyIn: 11, drop: 'brick' },
    },
  },
  {
    id: 'bukhara',
    group: 'Tribal & village',
    name: 'Bukhara (Turkmen)',
    hint: 'Rows of star guls on deep red, the classic Turkmen field',
    swatchIds: ['persian-wine', 'tribal-charcoal', 'solid-ivory', 'persian-navy', 'wool-terracotta'],
    layout: {
      borders: [
        { role: 'outer-guard', widthIn: 1, ground: 2 },
        { role: 'main', widthIn: 5, ground: 1, motifId: 'border-reciprocal-trefoil' },
        { role: 'inner-guard', widthIn: 1, ground: 2 },
      ],
      corners: 'mitred',
      field: 1,
      repeat: { motifId: 'gul-star', everyIn: 14, drop: 'straight' },
    },
  },
  {
    id: 'art-deco',
    group: 'Persian & classical',
    name: 'Chinese Art Deco',
    hint: 'Strong plain field, flower sprays in the corners, a key border',
    swatchIds: ['wool-petrol', 'wool-ivory', 'wool-blush', 'wool-mustard', 'wool-sage'],
    layout: {
      borders: [{ role: 'main', widthIn: 3, ground: 2, motifId: 'border-greek-key' }],
      corners: 'mitred',
      field: 1,
      spandrels: { ground: 1, motifId: 'flower-spray' },
      medallion: { shape: 'round', widthPct: 34, heightPct: 34, ground: 1, pendants: false, motifId: 'rosette-blossom' },
    },
  },
  {
    id: 'garden',
    group: 'Persian & classical',
    name: 'Garden (compartments)',
    hint: 'A Persian garden: panels of trees and flowers between channels',
    swatchIds: ['solid-ivory', 'solid-navy', 'solid-forest', 'solid-wine', 'solid-gold', 'wool-sage'],
    layout: {
      borders: [
        { role: 'outer-guard', widthIn: 1.5, ground: 4 },
        { role: 'main', widthIn: 6, ground: 2, motifId: 'border-lotus-vine' },
        { role: 'inner-guard', widthIn: 1.5, ground: 4 },
      ],
      corners: 'flowing',
      field: 1,
      compartments: { cols: 3, rows: 4, lineWidthIn: 2, ground: 1, line: 2, motifId: 'tree-of-life' },
    },
  },
  {
    id: 'prayer',
    group: 'Persian & classical',
    name: 'Prayer rug',
    hint: 'A pointed niche, its spandrels in a second colour',
    swatchIds: ['solid-wine', 'solid-navy', 'solid-ivory', 'solid-gold', 'tribal-charcoal'],
    layout: {
      borders: [
        { role: 'outer-guard', widthIn: 1.5, ground: 3 },
        { role: 'main', widthIn: 6, ground: 2, motifId: 'border-crescent-guard' },
        { role: 'inner-guard', widthIn: 1.5, ground: 4 },
      ],
      corners: 'flowing',
      field: 1,
      niche: { ground: 1, archPct: 34, spandrel: 2, motifId: 'tree-of-life' },
    },
  },
  {
    id: 'kilim',
    group: 'Flatweave',
    name: 'Kilim',
    hint: 'Stepped diamonds in rows, a lozenge border',
    swatchIds: ['solid-wine', 'wool-mustard', 'solid-navy', 'solid-ivory', 'wool-terracotta', 'solid-forest'],
    layout: {
      borders: [{ role: 'main', widthIn: 6, ground: 3, motifId: 'border-kilim-lozenge' }],
      corners: 'mitred',
      field: 1,
      repeat: { motifId: 'kilim-diamond', everyIn: 16, drop: 'straight' },
    },
  },
  {
    id: 'beni-ourain',
    group: 'Tribal & village',
    name: 'Beni Ourain',
    hint: 'Ivory shag with a loose charcoal lattice, no border',
    swatchIds: ['wool-ivory', 'wool-charcoal', 'wool-stone'],
    layout: { borders: [], corners: 'mitred', field: 1, repeat: { motifId: 'lozenge', everyIn: 18, drop: 'half-drop', color: 2 } },
  },
  {
    id: 'mamluk',
    name: 'Mamluk star',
    group: 'Persian & classical',
    hint: 'Cairo: an eight-point star medallion on red, small lozenges all over',
    swatchIds: ['solid-wine', 'geo-emerald', 'solid-navy', 'solid-gold', 'solid-ivory'],
    layout: {
      borders: [
        { role: 'outer-guard', widthIn: 1, ground: 4 },
        { role: 'main', widthIn: 5, ground: 2, motifId: 'border-reciprocal-trefoil' },
        { role: 'inner-guard', widthIn: 1, ground: 4 },
      ],
      corners: 'mitred',
      field: 1,
      repeat: { motifId: 'lozenge-small', everyIn: 6, drop: 'half-drop', color: 2 },
      medallion: { shape: 'round', widthPct: 58, heightPct: 46, ground: 3, pendants: false, motifId: 'star-octagram' },
      spandrels: { ground: 2 },
    },
  },
  {
    id: 'kazak',
    name: 'Kazak',
    group: 'Tribal & village',
    hint: 'Caucasian village rug: big stacked medallions, a sawtooth border',
    swatchIds: ['solid-wine', 'solid-navy', 'solid-ivory', 'wool-mustard', 'solid-forest'],
    layout: {
      borders: [
        { role: 'outer-guard', widthIn: 1.5, ground: 2 },
        { role: 'main', widthIn: 6, ground: 3, motifId: 'border-sawtooth' },
        { role: 'inner-guard', widthIn: 1.5, ground: 2 },
      ],
      corners: 'mitred',
      field: 1,
      compartments: { cols: 1, rows: 3, lineWidthIn: 1, ground: 1, line: 1, motifId: 'medallion-caucasian' },
    },
  },
  {
    id: 'gabbeh',
    name: 'Gabbeh',
    group: 'Tribal & village',
    hint: 'Thick Qashqai pile: an open field, a few animals, a plain edge',
    swatchIds: ['wool-terracotta', 'wool-mustard', 'wool-camel', 'wool-ivory', 'wool-charcoal'],
    layout: { borders: [{ role: 'main', widthIn: 3, ground: 2 }], corners: 'mitred', field: 1, repeat: { motifId: 'camel', everyIn: 24, drop: 'brick' } },
  },
  {
    id: 'kilim-chevron',
    name: 'Kilim chevron',
    group: 'Flatweave',
    hint: 'Zigzag bands woven across, Anatolian colours',
    swatchIds: ['solid-wine', 'wool-mustard', 'solid-navy', 'solid-ivory'],
    layout: { borders: [{ role: 'main', widthIn: 3, ground: 3 }], corners: 'mitred', field: 1, pattern: { kind: 'chevron', sizeIn: 10, bands: 4, colors: [1, 2, 3, 4] } },
  },
  {
    id: 'dhurrie-stripe',
    name: 'Dhurrie stripe',
    group: 'Flatweave',
    hint: 'Cotton dhurrie: plain bands across, no border',
    swatchIds: ['wool-ivory', 'solid-navy', 'wool-terracotta', 'wool-mustard'],
    layout: { borders: [], corners: 'mitred', field: 1, pattern: { kind: 'stripes', sizeIn: 18, bands: 6, colors: [2, 1, 3, 1, 4, 1] } },
  },
  {
    id: 'eye-dazzler',
    name: 'Eye dazzler',
    group: 'Flatweave',
    hint: 'Navajo: nested diamonds in many bright bands',
    swatchIds: ['solid-wine', 'solid-ivory', 'tribal-charcoal', 'wool-mustard', 'solid-navy'],
    layout: { borders: [{ role: 'main', widthIn: 2, ground: 3 }], corners: 'mitred', field: 1, pattern: { kind: 'diamonds', sizeIn: 20, bands: 9, colors: [1, 3, 2, 4, 1, 5, 2, 3, 4] } },
  },
  {
    id: 'ikat',
    name: 'Ikat diamond',
    group: 'Flatweave',
    hint: 'Diamonds with the soft, feathered edges of dyed warps',
    swatchIds: ['wool-ivory', 'wool-petrol', 'wool-mustard', 'wool-blush'],
    layout: { borders: [], corners: 'mitred', field: 1, pattern: { kind: 'ikat', sizeIn: 22, bands: 5, colors: [1, 2, 1, 3, 4] } },
  },
  {
    id: 'moorish-star',
    name: 'Moorish star',
    group: 'Flatweave',
    hint: 'Andalusian tilework: eight-point stars in a grid',
    swatchIds: ['solid-ivory', 'solid-navy', 'solid-gold', 'solid-forest'],
    layout: {
      borders: [{ role: 'main', widthIn: 4, ground: 2, motifId: 'border-reciprocal-trefoil' }],
      corners: 'mitred',
      field: 1,
      repeat: { motifId: 'star-octagram', everyIn: 12, drop: 'straight' },
    },
  },
]

/**
 * The rug ready for a preset's layout. Before anything is painted the preset's yarns replace the
 * palette (trying styles one after another doesn't pile up yarns); after, the yarns the rug lacks
 * are added and the layout is numbered to the rug's palette, so the painting keeps its colours.
 */
export function mergePreset(doc: RugDoc, preset: RugPreset): { doc: RugDoc; layout: LayoutSpec } {
  const painted = doc.layers.some((l) => l.kind === 'chart' && l.role !== 'layout' && l.cells.some((v) => v !== l.cells[0]))
  if (!painted) return { doc: { ...doc, palette: preset.swatchIds.map((swatchId) => ({ swatchId, fibre: 'wool' })) }, layout: preset.layout }
  const palette = [...doc.palette]
  const index = preset.swatchIds.map((id) => {
    let i = palette.findIndex((y) => y.swatchId === id)
    if (i < 0 && palette.length < 255) {
      palette.push({ swatchId: id, fibre: 'wool' })
      i = palette.length - 1
    }
    return i + 1
  })
  return { doc: { ...doc, palette }, layout: remapLayout(preset.layout, (i) => index[i - 1] ?? 1) }
}
