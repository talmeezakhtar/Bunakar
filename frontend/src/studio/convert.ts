import type { FreeformDesignState } from '../types/freeform'
import type { TileDesignState } from '../types/tileDesign'
import { TILE_SIZE_FT, classifyRugCategory } from '../types/tileDesign'
import type { RugDoc, ShapeLayer, TileLayer, Yarn } from './model'
import { DENSITY_PRESETS, defaultFinish, newId } from './model'

/**
 * Old designs into studio rugs, and studio layers back into the shapes the existing renderers
 * draw. Saved tile and freeform designs convert on open; nothing about them is lost.
 */

const yarns = (swatchIds: string[]): Yarn[] => [...new Set(swatchIds)].map((swatchId) => ({ swatchId, fibre: 'wool' }))

export function tileToDoc(state: TileDesignState): RugDoc {
  const layer: TileLayer = {
    kind: 'tiles',
    id: newId(),
    name: 'Tiles',
    visible: true,
    widthTiles: state.widthTiles,
    heightTiles: state.heightTiles,
    orientation: state.orientation,
    tiles: state.tiles,
    overlays: state.overlays,
  }
  const used = Object.values(state.tiles).flatMap((pieces) => pieces.map((p) => p.swatchId))
  return {
    v: 1,
    id: null,
    name: state.name,
    construction: 'tiles',
    shape: { kind: 'rect' },
    widthFt: state.widthTiles * TILE_SIZE_FT,
    heightFt: state.heightTiles * TILE_SIZE_FT,
    density: DENSITY_PRESETS.tiles[0].density,
    palette: yarns([...state.myStyles, ...used]),
    layout: null,
    layers: [layer],
    finish: defaultFinish('tiles'),
    rugCategory: state.rugCategory,
    backgroundId: state.backgroundId,
  }
}

export function freeformToDoc(state: FreeformDesignState): RugDoc {
  const layer: ShapeLayer = { kind: 'shapes', id: newId(), name: 'Shapes', visible: true, ground: state.ground, shapes: state.shapes }
  return {
    v: 1,
    id: null,
    name: state.name,
    construction: 'tufted',
    shape: { kind: 'rect' },
    widthFt: state.widthFt,
    heightFt: state.heightFt,
    density: DENSITY_PRESETS.tufted[0].density,
    palette: yarns([...state.myStyles, state.ground.swatchId, ...state.shapes.map((s) => s.swatchId)]),
    layout: null,
    layers: [layer],
    finish: defaultFinish('tufted'),
    rugCategory: state.rugCategory,
    backgroundId: state.backgroundId,
  }
}

/** A tile layer as the tile designer's state, for its renderer (`renderTileFills`). */
export function tileLayerState(doc: RugDoc, layer: TileLayer): TileDesignState {
  return {
    id: null,
    name: doc.name,
    widthTiles: layer.widthTiles,
    heightTiles: layer.heightTiles,
    orientation: layer.orientation,
    backgroundId: doc.backgroundId,
    rugCategory: doc.rugCategory ?? classifyRugCategory(layer.widthTiles, layer.heightTiles),
    tiles: layer.tiles,
    myStyles: doc.palette.map((y) => y.swatchId),
    overlays: layer.overlays,
  }
}

/** A shape layer as the freeform designer's state, for its renderer (`renderFreeform`). */
export function shapeLayerState(doc: RugDoc, layer: ShapeLayer): FreeformDesignState {
  return {
    id: null,
    name: doc.name,
    widthFt: doc.widthFt,
    heightFt: doc.heightFt,
    rugCategory: doc.rugCategory,
    backgroundId: doc.backgroundId,
    // A layer without its own ground is drawn over what's beneath: an invisible ground.
    ground: layer.ground ?? { swatchId: '', texture: 'cut', carve: 'none', carveAngle: 0, pile: 'standard' },
    shapes: layer.shapes,
    myStyles: doc.palette.map((y) => y.swatchId),
  }
}

/** The palette for a list of swatch ids, keeping each yarn's fibre and pile where it already was. */
function paletteFor(doc: RugDoc, ids: string[]): Yarn[] {
  return ids.map((swatchId) => doc.palette.find((y) => y.swatchId === swatchId) ?? { swatchId, fibre: 'wool' })
}

/**
 * The freeform designer's edits written back to a studio rug: the shape layer's ground and
 * shapes, and the rug's name, size, floor and yarns. Hosts the old editor on a studio layer.
 */
export function writeShapeLayer(doc: RugDoc, layerId: string, s: FreeformDesignState): RugDoc {
  return {
    ...doc,
    name: s.name,
    widthFt: s.widthFt,
    heightFt: s.heightFt,
    rugCategory: s.rugCategory,
    backgroundId: s.backgroundId,
    palette: paletteFor(doc, s.myStyles),
    layers: doc.layers.map((l) => (l.id === layerId && l.kind === 'shapes' ? { ...l, ground: s.ground.swatchId ? s.ground : null, shapes: s.shapes } : l)),
  }
}

/** The tile designer's edits written back: the tile layer, and the rug's name, size, floor and yarns. */
export function writeTileLayer(doc: RugDoc, layerId: string, s: TileDesignState): RugDoc {
  return {
    ...doc,
    name: s.name,
    widthFt: s.widthTiles * TILE_SIZE_FT,
    heightFt: s.heightTiles * TILE_SIZE_FT,
    rugCategory: s.rugCategory,
    backgroundId: s.backgroundId,
    palette: paletteFor(doc, s.myStyles),
    layers: doc.layers.map((l) =>
      l.id === layerId && l.kind === 'tiles' ? { ...l, widthTiles: s.widthTiles, heightTiles: s.heightTiles, orientation: s.orientation, tiles: s.tiles, overlays: s.overlays } : l,
    ),
  }
}

/** An edit to the old designer's state applied through a studio rug (unchanged when it changes nothing). */
export function throughShapes(doc: RugDoc, layerId: string, edit: (s: FreeformDesignState) => FreeformDesignState): RugDoc {
  const layer = doc.layers.find((l) => l.id === layerId)
  if (layer?.kind !== 'shapes') return doc
  const before = shapeLayerState(doc, layer)
  const after = edit(before)
  return after === before ? doc : writeShapeLayer(doc, layerId, after)
}

export function throughTiles(doc: RugDoc, layerId: string, edit: (s: TileDesignState) => TileDesignState): RugDoc {
  const layer = doc.layers.find((l) => l.id === layerId)
  if (layer?.kind !== 'tiles') return doc
  const before = tileLayerState(doc, layer)
  const after = edit(before)
  return after === before ? doc : writeTileLayer(doc, layerId, after)
}
