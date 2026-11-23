/**
 * Every yarn fibre Bunakar offers, as one table: how it renders (3D and 2D) and what it is like to
 * live with. The pickers, the fabric pages, the renderer and the weaver's chart all read from here,
 * so they can never disagree. Pure data, no DOM.
 *
 * Facts are typical values for the fibre in hand-made rugs, not a supplier's spec sheet.
 */

export type Fibre = 'wool' | 'wool-nz' | 'silk' | 'bamboo-silk' | 'cotton' | 'jute'

/** A tileable grey photo the fibre's surface grain comes from (in `public/textures/`). */
export type GrainId = 'pile' | 'velvet' | 'yarn' | 'jute'

export const GRAIN_URL: Record<GrainId, string> = {
  pile: '/textures/pile.jpg',
  velvet: '/textures/velvet.jpg',
  yarn: '/textures/yarn.jpg',
  jute: '/textures/jute.jpg',
}

export interface FibreRender {
  /** Microfacet roughness, 0 (mirror) to 1 (chalk). */
  roughness: number
  /** Scales the fibre's reflectance (1 is any plain dielectric, like a polished fibre). */
  specular: number
  /** Soft grazing-angle glow of fibres standing up, 0..1. */
  sheen: number
  sheenRoughness: number
  /** How much the sheen takes the dye's own colour (0: a warm neutral, 1: the dye). */
  sheenTint: number
  /** Stretched highlight along the fibres (silk), 0..1. */
  anisotropy: number
  /** Pile relief against a wool knot (silk is cut finer and lies flatter). */
  relief: number
  /** Colour saturation and brightness against the dyed swatch. */
  saturation: number
  lift: number
  grain: GrainId
  /** How strongly the grain shows, in colour and in relief. */
  grainDepth: number
  /** How strongly brushing the pile changes the shade (silk shows it most). */
  brush: number
}

export interface FibreFacts {
  /** 1 to 5. */
  softness: number
  shine: number
  durability: number
  origin: string
  feel: string
  rooms: string[]
  care: string
  /** Yarn weight against Indian wool for the same knot count. */
  weight: number
}

export interface FibreMaterial {
  id: Fibre
  name: string
  short: string
  description: string
  render: FibreRender
  facts: FibreFacts
}

export const MATERIALS: Record<Fibre, FibreMaterial> = {
  wool: {
    id: 'wool',
    name: 'Indian wool',
    short: 'Wool',
    description: 'The Bhadohi staple: springy, hard-wearing hand-spun wool from Rajasthan and the Himalayan foothills, with a dry, matte hand and a soft glow at a low angle.',
    render: { roughness: 0.92, specular: 0.9, sheen: 1, sheenRoughness: 0.55, sheenTint: 0, anisotropy: 0, relief: 1, saturation: 1, lift: 1, grain: 'pile', grainDepth: 0.28, brush: 0.15 },
    facts: {
      softness: 3,
      shine: 1,
      durability: 5,
      origin: 'Rajasthan and the Himalayan foothills, India',
      feel: 'Springy and dry, a little coarse, warm underfoot',
      rooms: ['Living room', 'Hallway', 'Dining room'],
      care: 'Vacuum weekly without the beater bar; blot spills, then spot-clean with cool water.',
      weight: 1,
    },
  },
  'wool-nz': {
    id: 'wool-nz',
    name: 'New Zealand wool',
    short: 'NZ wool',
    description: 'Long-staple wool, whiter than Indian wool, so dyes come out clearer. It has more lustre and a softer, denser pile.',
    render: { roughness: 0.84, specular: 0.95, sheen: 1, sheenRoughness: 0.48, sheenTint: 0.2, anisotropy: 0, relief: 1.05, saturation: 1.05, lift: 1.02, grain: 'pile', grainDepth: 0.22, brush: 0.2 },
    facts: {
      softness: 4,
      shine: 2,
      durability: 5,
      origin: 'New Zealand, spun in India',
      feel: 'Soft and dense, smooth to the hand, bounces back',
      rooms: ['Living room', 'Bedroom', 'Nursery'],
      care: 'Vacuum weekly; naturally resists stains and fire. Professional wash every few years.',
      weight: 0.95,
    },
  },
  silk: {
    id: 'silk',
    name: 'Silk',
    short: 'Silk',
    description: 'Mulberry silk, knotted very fine. It shines, and its shade changes as you walk around it, because light catches the pile from one side.',
    render: { roughness: 0.36, specular: 1, sheen: 0.6, sheenRoughness: 0.3, sheenTint: 0.9, anisotropy: 0.8, relief: 0.5, saturation: 1.12, lift: 1.06, grain: 'velvet', grainDepth: 0.14, brush: 1 },
    facts: {
      softness: 5,
      shine: 5,
      durability: 2,
      origin: 'Mulberry silk, Karnataka and Kashmir',
      feel: 'Cool, smooth and slippery; the pile moves under your hand',
      rooms: ['Bedroom', 'Formal living room', 'Wall hanging'],
      care: 'Low traffic only. No water on spills: blot dry and call a specialist cleaner.',
      weight: 0.9,
    },
  },
  'bamboo-silk': {
    id: 'bamboo-silk',
    name: 'Bamboo silk',
    short: 'Bamboo silk',
    description: 'A viscose spun from bamboo pulp. It has the shine and drape of silk for a fraction of the price, with a slightly softer, less crisp lustre.',
    render: { roughness: 0.42, specular: 1, sheen: 0.65, sheenRoughness: 0.34, sheenTint: 0.85, anisotropy: 0.7, relief: 0.55, saturation: 1.1, lift: 1.05, grain: 'velvet', grainDepth: 0.16, brush: 0.85 },
    facts: {
      softness: 5,
      shine: 4,
      durability: 2,
      origin: 'Bamboo viscose, spun in India',
      feel: 'Silky and cool, very soft, crushes where it is walked on',
      rooms: ['Bedroom', 'Formal living room'],
      care: 'Keep dry: water marks and yellows it. Vacuum gently on suction only; blot spills at once.',
      weight: 1.05,
    },
  },
  cotton: {
    id: 'cotton',
    name: 'Cotton',
    short: 'Cotton',
    description: 'Mostly for flatweaves and dhurries, and the warp and fringe of every knotted rug. It is flat and matte, and takes dye in clean, slightly chalky colours.',
    render: { roughness: 0.96, specular: 0.7, sheen: 0.45, sheenRoughness: 0.8, sheenTint: 0.15, anisotropy: 0, relief: 0.8, saturation: 0.9, lift: 1.02, grain: 'yarn', grainDepth: 0.24, brush: 0.05 },
    facts: {
      softness: 3,
      shine: 1,
      durability: 3,
      origin: 'Gujarat and Maharashtra, India',
      feel: 'Flat, dry and crisp, like a heavy canvas',
      rooms: ['Kitchen', 'Kids room', 'Bathroom'],
      care: 'Small rugs can be hand-washed cold; dry flat in the shade.',
      weight: 1.1,
    },
  },
  jute: {
    id: 'jute',
    name: 'Jute',
    short: 'Jute',
    description: 'A golden plant fibre from Bengal, woven flat or braided. Coarse and earthy, with a dry, waxy glint along each strand.',
    render: { roughness: 0.9, specular: 0.85, sheen: 0.3, sheenRoughness: 0.85, sheenTint: 0.3, anisotropy: 0.2, relief: 0.9, saturation: 0.85, lift: 1, grain: 'jute', grainDepth: 0.4, brush: 0 },
    facts: {
      softness: 1,
      shine: 2,
      durability: 3,
      origin: 'West Bengal, India',
      feel: 'Rough and fibrous, firm underfoot, a little scratchy',
      rooms: ['Hallway', 'Living room', 'Under a dining table'],
      care: 'Keep dry; vacuum often. Blot spills and dry fast with a hair dryer.',
      weight: 1.3,
    },
  },
}

export const FIBRES: Fibre[] = ['wool', 'wool-nz', 'silk', 'bamboo-silk', 'cotton', 'jute']

/** The fibre's material; an unknown or missing id (old or hand-edited designs) reads as wool. */
export function fibreMaterial(id: string | undefined | null): FibreMaterial {
  return (id && MATERIALS[id as Fibre]) || MATERIALS.wool
}

export const isFibre = (id: unknown): id is Fibre => typeof id === 'string' && id in MATERIALS

/** Colour lift for a fibre: saturation about the pixel's lightness, then brightness. In place on r,g,b. */
export function fibreColour(r: number, g: number, b: number, fibre: FibreMaterial): [number, number, number] {
  const { saturation: sat, lift } = fibre.render
  if (sat === 1 && lift === 1) return [r, g, b]
  const L = 0.299 * r + 0.587 * g + 0.114 * b
  return [(L + (r - L) * sat) * lift, (L + (g - L) * sat) * lift, (L + (b - L) * sat) * lift]
}

/** The warm neutral sheen wool has always had (sRGB 0..255). */
const NEUTRAL_SHEEN = [61, 55, 49]

/** Sheen colour (sRGB 0..255) for a dyed yarn of this fibre: a warm neutral towards the dye's own colour. */
export function sheenColour(dye: [number, number, number], fibre: FibreMaterial): [number, number, number] {
  const { sheen, sheenTint: t } = fibre.render
  // A tinted sheen is the dye brightened towards white, so dark silks still glow.
  const lit = dye.map((c) => c + (255 - c) * 0.12)
  return [0, 1, 2].map((k) => Math.min(255, (NEUTRAL_SHEEN[k] * (1 - t) + lit[k] * t) * sheen)) as [number, number, number]
}
