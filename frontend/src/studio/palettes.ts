import type { Fibre, Yarn } from './model'

/**
 * Starting yarns for a new rug, after real traditions. Each is a set of catalogue swatches, ground
 * first; the designer adds or removes yarns freely afterwards.
 */
export const STARTER_PALETTES: { id: string; name: string; swatchIds: string[] }[] = [
  { id: 'persian-red', name: 'Persian red', swatchIds: ['solid-wine', 'solid-navy', 'solid-ivory', 'solid-gold', 'tribal-charcoal', 'wool-terracotta'] },
  { id: 'heriz', name: 'Heriz', swatchIds: ['wool-terracotta', 'solid-navy', 'solid-ivory', 'wool-sand', 'tribal-charcoal', 'wool-aqua'] },
  { id: 'oushak', name: 'Oushak', swatchIds: ['wool-oat', 'wool-coral', 'wool-sage', 'wool-sand', 'wool-stone', 'wool-petrol'] },
  { id: 'kilim', name: 'Kilim', swatchIds: ['solid-wine', 'wool-mustard', 'solid-navy', 'solid-ivory', 'wool-terracotta', 'solid-forest'] },
  { id: 'gabbeh', name: 'Gabbeh', swatchIds: ['wool-terracotta', 'wool-mustard', 'wool-camel', 'wool-ivory', 'wool-charcoal'] },
  { id: 'beni-ourain', name: 'Beni Ourain', swatchIds: ['wool-ivory', 'wool-charcoal', 'wool-stone', 'wool-oat'] },
  { id: 'modern', name: 'Modern', swatchIds: ['wool-graphite', 'wool-petrol', 'wool-blush', 'wool-ivory', 'wool-mustard'] },
]

export const paletteYarns = (swatchIds: string[], fibre: Fibre = 'wool'): Yarn[] => swatchIds.map((swatchId) => ({ swatchId, fibre }))

/** Sizes offered per shape, in feet (width x height). */
export const SIZE_PRESETS: Record<'rect' | 'runner' | 'round' | 'oval' | 'octagon', [number, number][]> = {
  rect: [
    [3, 5],
    [4, 6],
    [5, 8],
    [6, 9],
    [8, 10],
    [9, 12],
    [10, 14],
  ],
  runner: [
    [2.5, 8],
    [2.5, 10],
    [3, 12],
    [3, 16],
  ],
  round: [
    [4, 4],
    [6, 6],
    [8, 8],
    [10, 10],
  ],
  oval: [
    [4, 6],
    [5, 8],
    [6, 9],
    [8, 11],
  ],
  octagon: [
    [6, 6],
    [8, 8],
  ],
}
