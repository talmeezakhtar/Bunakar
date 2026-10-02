import type { Swatch } from '../types/swatch'

export const CATEGORIES = ['Solid Color', 'Linear', 'Textured Solid', 'Organic', 'Geometric', 'Persian Floral', 'Tribal'] as const

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

  // Carpet tiles - photographed tiles; swatchColor is each photo's average, used while it loads.
  // Strata
  { id: 'strata-graphite-taupe', familyId: 'strata', familyName: 'Strata', colorName: 'Graphite Taupe', swatchColor: '#6b6865', imageUrl: '/tiles/strata-graphite-taupe.webp', categories: ['Linear'] },
  { id: 'strata-silver', familyId: 'strata', familyName: 'Strata', colorName: 'Silver', swatchColor: '#8d8b84', imageUrl: '/tiles/strata-silver.webp', categories: ['Linear'] },
  { id: 'strata-pewter', familyId: 'strata', familyName: 'Strata', colorName: 'Pewter', swatchColor: '#878787', imageUrl: '/tiles/strata-pewter.webp', categories: ['Linear'] },
  { id: 'strata-ash', familyId: 'strata', familyName: 'Strata', colorName: 'Ash', swatchColor: '#6f7378', imageUrl: '/tiles/strata-ash.webp', categories: ['Linear'] },
  { id: 'strata-slate', familyId: 'strata', familyName: 'Strata', colorName: 'Slate', swatchColor: '#50555b', imageUrl: '/tiles/strata-slate.webp', categories: ['Linear'] },
  { id: 'strata-midnight', familyId: 'strata', familyName: 'Strata', colorName: 'Midnight', swatchColor: '#2e3546', imageUrl: '/tiles/strata-midnight.webp', categories: ['Linear'] },
  // Heather Loop
  { id: 'heather-loop-cadet-blue', familyId: 'heather-loop', familyName: 'Heather Loop', colorName: 'Cadet Blue', swatchColor: '#5f687d', imageUrl: '/tiles/heather-loop-cadet-blue.webp', categories: ['Textured Solid'] },
  { id: 'heather-loop-stone', familyId: 'heather-loop', familyName: 'Heather Loop', colorName: 'Stone', swatchColor: '#7e7c78', imageUrl: '/tiles/heather-loop-stone.webp', categories: ['Textured Solid'] },
  { id: 'heather-loop-chalk', familyId: 'heather-loop', familyName: 'Heather Loop', colorName: 'Chalk', swatchColor: '#a4a4a1', imageUrl: '/tiles/heather-loop-chalk.webp', categories: ['Textured Solid'] },
  { id: 'heather-loop-juniper', familyId: 'heather-loop', familyName: 'Heather Loop', colorName: 'Juniper', swatchColor: '#464b49', imageUrl: '/tiles/heather-loop-juniper.webp', categories: ['Textured Solid'] },
  // Drift
  { id: 'drift-umber', familyId: 'drift', familyName: 'Drift', colorName: 'Umber', swatchColor: '#5f5a56', imageUrl: '/tiles/drift-umber.webp', categories: ['Organic'] },
  { id: 'drift-sandstone', familyId: 'drift', familyName: 'Drift', colorName: 'Sandstone', swatchColor: '#6f6c62', imageUrl: '/tiles/drift-sandstone.webp', categories: ['Organic'] },
  { id: 'drift-smoke', familyId: 'drift', familyName: 'Drift', colorName: 'Smoke', swatchColor: '#585754', imageUrl: '/tiles/drift-smoke.webp', categories: ['Organic'] },
  // Basketweave
  { id: 'basketweave-onyx', familyId: 'basketweave', familyName: 'Basketweave', colorName: 'Onyx', swatchColor: '#30302f', imageUrl: '/tiles/basketweave-onyx.webp', categories: ['Geometric'] },
  // Crescent
  { id: 'crescent-denim', familyId: 'crescent', familyName: 'Crescent', colorName: 'Denim', swatchColor: '#51677a', imageUrl: '/tiles/crescent-denim.webp', categories: ['Geometric'] },
  // Lattice
  { id: 'lattice-harbor', familyId: 'lattice', familyName: 'Lattice', colorName: 'Harbor', swatchColor: '#5e5d56', imageUrl: '/tiles/lattice-harbor.webp', categories: ['Geometric'] },
  // Tweed
  { id: 'tweed-charcoal-check', familyId: 'tweed', familyName: 'Tweed', colorName: 'Charcoal Check', swatchColor: '#686561', imageUrl: '/tiles/tweed-charcoal-check.webp', categories: ['Geometric'] },

  // Tufted Wool - solid yarn colours for hand-tufted freeform rugs (sampled from reference rugs)
  { id: 'wool-ivory', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Ivory', swatchColor: '#ece4d4', categories: ['Tufted Wool'] },
  { id: 'wool-oat', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Oat', swatchColor: '#d8c9ad', categories: ['Tufted Wool'] },
  { id: 'wool-sand', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Sand', swatchColor: '#d1ab7a', categories: ['Tufted Wool'] },
  { id: 'wool-camel', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Camel', swatchColor: '#b8895a', categories: ['Tufted Wool'] },
  { id: 'wool-blush', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Blush', swatchColor: '#e8d3c6', categories: ['Tufted Wool'] },
  { id: 'wool-coral', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Coral', swatchColor: '#e2625a', categories: ['Tufted Wool'] },
  { id: 'wool-terracotta', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Terracotta', swatchColor: '#b8573e', categories: ['Tufted Wool'] },
  { id: 'wool-mustard', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Mustard', swatchColor: '#e3b23c', categories: ['Tufted Wool'] },
  { id: 'wool-aqua', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Aqua', swatchColor: '#7bbab0', categories: ['Tufted Wool'] },
  { id: 'wool-petrol', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Petrol', swatchColor: '#2f5f68', categories: ['Tufted Wool'] },
  { id: 'wool-sage', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Sage', swatchColor: '#9aa98c', categories: ['Tufted Wool'] },
  { id: 'wool-stone', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Stone', swatchColor: '#a8a39a', categories: ['Tufted Wool'] },
  { id: 'wool-graphite', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Graphite', swatchColor: '#6e6d6b', categories: ['Tufted Wool'] },
  { id: 'wool-charcoal', familyId: 'tufted-wool', familyName: 'Tufted Wool', colorName: 'Charcoal', swatchColor: '#3a3a3c', categories: ['Tufted Wool'] },
]
