import type { RugArt } from '../../components/tileDesigner/RugPhotoSlide'
import { renderTileFills } from '../../components/tileDesigner/renderTiles'
import '../../components/tileDesigner/renderOverlays'
import { renderFreeform } from '../../components/freeform/renderFreeform'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import { applyTemplate, findColorway, findTemplate } from '../../data/patternTemplates'
import type { FreeformDesignState } from '../../types/freeform'
import type { Swatch } from '../../types/swatch'
import type { TileDesignState } from '../../types/tileDesign'
import type { RugDoc } from '../../studio/model'
import { docArt, hashBytes } from '../../studio/compose'
import { TILE_SIZE_FT, createDefaultTileDesign, feetToTiles } from '../../types/tileDesign'

/** Anything the 3D pipeline can turn into a rug: a saved design or a template at a size. */
export type RugSource =
  | { kind: 'doc'; doc: RugDoc; swatchesById: Map<string, Swatch> }
  | { kind: 'tile'; state: TileDesignState; swatchesById: Map<string, Swatch> }
  | { kind: 'freeform'; state: FreeformDesignState; swatchesById: Map<string, Swatch> }
  | {
      kind: 'template'
      templateId: string
      colorwayId: string
      widthFt: number
      heightFt: number
      /** Swatch catalog the colorway resolves against; the bundled mock catalog by default. */
      catalog?: Swatch[]
    }

/** The design data behind a rug, kept for the height map (pile, seams, carving). */
export type RugDesign =
  | { kind: 'doc'; doc: RugDoc; swatchesById: Map<string, Swatch> }
  | { kind: 'tile'; state: TileDesignState; swatchesById: Map<string, Swatch> }
  | { kind: 'freeform'; state: FreeformDesignState; swatchesById: Map<string, Swatch> }

export interface ResolvedRug {
  /** Draws the rug in its own units (tiles for tile designs, feet for freeform). */
  art: RugArt
  widthFt: number
  heightFt: number
  /** Feet per art unit: 1.5 for tile designs, 1 for freeform. */
  ftPerUnit: number
  design: RugDesign
  /** Stable content hash: same design and swatches -> same key, for the texture cache. */
  key: string
}

/** The rug's outline when it isn't a plain rectangle (studio rugs only), for the 3D mesh. */
export const rugShape = (rug: ResolvedRug) => (rug.design.kind === 'doc' && rug.design.doc.shape.kind !== 'rect' ? rug.design.doc.shape : undefined)

/** 32-bit FNV-1a over a string, as 8 hex chars. */
export function hashString(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Only what changes pixels: geometry and the swatches actually referenced (not names/ids of the design). */
function docKey(design: Extract<RugDesign, { kind: 'doc' }>): string {
  const { doc, swatchesById } = design
  const charts = doc.layers.map((l) => (l.kind === 'chart' ? `${l.id}:${l.visible}:${hashBytes(l.cells)}` : ''))
  const rest = { ...doc, id: null, name: '', layers: doc.layers.map((l) => (l.kind === 'chart' ? { ...l, cells: null } : l)) }
  const colours = doc.palette.map((y) => swatchesById.get(y.swatchId)?.swatchColor ?? y.swatchId)
  return `doc:${hashString(JSON.stringify([rest, charts, colours]))}`
}

function designKey(design: RugDesign): string {
  if (design.kind === 'doc') return docKey(design)
  const ids = new Set<string>()
  if (design.kind === 'tile') {
    for (const pieces of Object.values(design.state.tiles)) for (const p of pieces) ids.add(p.swatchId)
  } else {
    ids.add(design.state.ground.swatchId)
    for (const sh of design.state.shapes) ids.add(sh.swatchId)
  }
  const swatches = [...ids].sort().map((id) => {
    const sw = design.swatchesById.get(id)
    return sw ? [id, sw.swatchColor, sw.imageUrl ?? '', sw.fibre ?? ''] : [id]
  })
  const geometry =
    design.kind === 'tile'
      ? { w: design.state.widthTiles, h: design.state.heightTiles, t: design.state.tiles, o: design.state.overlays }
      : { w: design.state.widthFt, h: design.state.heightFt, g: design.state.ground, s: design.state.shapes }
  return `${design.kind}:${hashString(JSON.stringify([geometry, swatches]))}`
}

function fromTile(state: TileDesignState, swatchesById: Map<string, Swatch>): ResolvedRug {
  const design: RugDesign = { kind: 'tile', state, swatchesById }
  return {
    art: { width: state.widthTiles, height: state.heightTiles, render: (prefix) => renderTileFills(state, swatchesById, prefix) },
    widthFt: state.widthTiles * TILE_SIZE_FT,
    heightFt: state.heightTiles * TILE_SIZE_FT,
    ftPerUnit: TILE_SIZE_FT,
    design,
    key: designKey(design),
  }
}

function fromFreeform(state: FreeformDesignState, swatchesById: Map<string, Swatch>): ResolvedRug {
  const design: RugDesign = { kind: 'freeform', state, swatchesById }
  return {
    art: { width: state.widthFt, height: state.heightFt, render: (prefix) => renderFreeform(state, swatchesById, prefix) },
    widthFt: state.widthFt,
    heightFt: state.heightFt,
    ftPerUnit: 1,
    design,
    key: designKey(design),
  }
}

/**
 * Resolves a source to drawable art plus its real size. Templates are laid out on whole 1.5 ft
 * tiles (at least one each way), so the returned feet may round from the requested ones.
 */
function fromDoc(doc: RugDoc, swatchesById: Map<string, Swatch>): ResolvedRug {
  const design: RugDesign = { kind: 'doc', doc, swatchesById }
  return { art: docArt(doc, swatchesById), widthFt: doc.widthFt, heightFt: doc.heightFt, ftPerUnit: 1, design, key: designKey(design) }
}

export function resolveRugSource(source: RugSource): ResolvedRug {
  if (source.kind === 'doc') return fromDoc(source.doc, source.swatchesById)
  if (source.kind === 'tile') return fromTile(source.state, source.swatchesById)
  if (source.kind === 'freeform') return fromFreeform(source.state, source.swatchesById)
  const template = findTemplate(source.templateId)
  const colorway = findColorway(source.colorwayId)
  if (!template) throw new Error(`Unknown template ${source.templateId}`)
  if (!colorway) throw new Error(`Unknown colorway ${source.colorwayId}`)
  const catalog = source.catalog ?? MOCK_SWATCHES
  const base = createDefaultTileDesign(Math.max(1, feetToTiles(source.widthFt)), Math.max(1, feetToTiles(source.heightFt)))
  const state = applyTemplate(base, template, colorway, catalog)
  return fromTile(state, new Map(catalog.map((s) => [s.id, s])))
}
