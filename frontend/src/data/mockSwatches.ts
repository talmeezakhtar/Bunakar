import type { Swatch } from '../types/swatch'

export const CATEGORIES = ['Solid Color', 'Geometric', 'Persian Floral', 'Tribal'] as const

export const MOCK_SWATCHES: Swatch[] = [
  // Solid Color family
  { id: 'solid-wine', familyId: 'solid', familyName: 'Solid Weave', colorName: 'Wine', swatchColor: '#7a2436', categories: ['Solid Color'] },
  { id: 'solid-gold', familyId: 'solid', familyName: 'Solid Weave', colorName: 'Gold', swatchColor: '#d9a441', categories: ['Solid Color'] },
  { id: 'solid-ivory', familyId: 'solid', familyName: 'Solid Weave', colorName: 'Ivory', swatchColor: '#e6d5b3', categories: ['Solid Color'] },
  { id: 'solid-navy', familyId: 'solid', familyName: 'Solid Weave', colorName: 'Navy', swatchColor: '#1c2444', categories: ['Solid Color'] },
  { id: 'solid-forest', familyId: 'solid', familyName: 'Solid Weave', colorName: 'Forest', swatchColor: '#173a36', categories: ['Solid Color'] },

  // Geometric Bloom family
  { id: 'geo-emerald', familyId: 'geometric-bloom', familyName: 'Geometric Bloom', colorName: 'Emerald', swatchColor: '#3f9c82', categories: ['Geometric'] },
  { id: 'geo-clay', familyId: 'geometric-bloom', familyName: 'Geometric Bloom', colorName: 'Clay', swatchColor: '#e0916b', categories: ['Geometric'] },
  { id: 'geo-slate', familyId: 'geometric-bloom', familyName: 'Geometric Bloom', colorName: 'Slate', swatchColor: '#8fa8d9', categories: ['Geometric'] },

  // Persian Medallion family
  { id: 'persian-wine', familyId: 'persian-medallion', familyName: 'Persian Medallion', colorName: 'Wine & Gold', swatchColor: '#7a2436', categories: ['Persian Floral'] },
  { id: 'persian-navy', familyId: 'persian-medallion', familyName: 'Persian Medallion', colorName: 'Navy & Ivory', swatchColor: '#1c2444', categories: ['Persian Floral'] },

  // Tribal Weave family
  { id: 'tribal-clay', familyId: 'tribal-weave', familyName: 'Tribal Weave', colorName: 'Clay & Gold', swatchColor: '#7a3b1e', categories: ['Tribal'] },
  { id: 'tribal-charcoal', familyId: 'tribal-weave', familyName: 'Tribal Weave', colorName: 'Charcoal', swatchColor: '#2c1810', categories: ['Tribal'] },
]
