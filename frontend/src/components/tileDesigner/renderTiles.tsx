import type { ReactNode } from 'react'
import type { Swatch } from '../../types/swatch'
import type { DesignOverlay, TileDesignState } from '../../types/tileDesign'
import type { PaletteInput } from '../../data/motifs/palette'
import { tileKey } from '../../types/tileDesign'
import { cutPath, isPositionable } from './cutShapes'

/** Turns a React `useId()` value into something safe inside `url(#...)`. */
export function patternPrefix(reactId: string): string {
  return `t${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

/**
 * One `<pattern>` per photographed swatch, sized to exactly one tile in the referencing piece's
 * own (translated + rotated) coordinates. A cut piece therefore shows the part of the physical
 * tile it was cut from, and turns with its pile direction when rotated. `prefix` keeps ids unique
 * when several rug SVGs share a page.
 */
export function tilePatternDefs(swatches: Iterable<Swatch | undefined>, prefix: string): ReactNode {
  const seen = new Set<string>()
  const patterns: ReactNode[] = []
  for (const s of swatches) {
    if (!s?.imageUrl || seen.has(s.id)) continue
    seen.add(s.id)
    patterns.push(
      <pattern key={s.id} id={`${prefix}-${s.id}`} patternUnits="userSpaceOnUse" width={1} height={1}>
        <rect width={1} height={1} fill={s.swatchColor} />
        <image href={s.imageUrl} width={1} height={1} preserveAspectRatio="none" />
      </pattern>,
    )
  }
  return patterns.length ? <defs key="tile-patterns">{patterns}</defs> : null
}

/** Fill for a piece of this swatch: its tile photo when it has one, otherwise its flat color. */
export function swatchFill(swatch: Swatch, prefix: string): string {
  return swatch.imageUrl ? `url(#${prefix}-${swatch.id})` : swatch.swatchColor
}

/**
 * Renders just the painted cut pieces of a tile design as `<g>` fills in the design's own
 * 0..widthTiles x 0..heightTiles unit-square coordinate space - no grid lines, marks, or
 * interaction. Shared by the interactive grid and the read-only room-scene rug so both stay
 * geometrically identical. Starts with the `<defs>` for any photographed tiles it uses.
 */
export function renderTileFills(state: TileDesignState, swatchesById: Map<string, Swatch>, prefix = 'tile'): ReactNode[] {
  const { widthTiles: W, heightTiles: H, tiles } = state
  const used = new Map<string, Swatch>()
  const fills: ReactNode[] = []
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const pieces = tiles[tileKey(row, col)]
      if (!pieces) continue
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i]
        const swatch = swatchesById.get(piece.swatchId)
        if (!swatch) continue
        used.set(swatch.id, swatch)
        // Rotation is meaningless for slot-based pieces except the strip cuts (third/quarter),
        // which bake it directly into the path's own orientation - never spin those visually.
        const pieceRotation = isPositionable(piece.cutType) ? 0 : piece.rotation
        fills.push(
          <g key={`fill-${row}-${col}-${i}`} transform={`translate(${col} ${row})`}>
            <g transform={`rotate(${pieceRotation} 0.5 0.5)`}>
              <path d={cutPath(piece.cutType, piece.slot, piece.rotation)} fill={swatchFill(swatch, prefix)} />
            </g>
          </g>,
        )
      }
    }
  }
  const tintColor = (id: string) => swatchesById.get(id)?.swatchColor
  const overlays =
    state.overlays.length > 0 && overlayRenderer ? overlayRenderer(state.overlays, prefix, { palette: rugPalette(state, swatchesById), tintColor }) : []
  return [tilePatternDefs(used.values(), prefix), ...fills, ...overlays]
}

/**
 * The finish that makes printed art read as tufted into the rug rather than stuck on it: a fine
 * pile grain (stretched along the pile), a touch of softness and desaturation, and a faint
 * carved edge where the design meets the ground. Units are tiles.
 */
export function weaveFilter(id: string): ReactNode {
  return (
    <filter key={id} id={id} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="46 14" numOctaves={2} seed={11} result="noise" />
      <feColorMatrix in="noise" type="saturate" values="0" result="grey" />
      <feComponentTransfer in="grey" result="grain">
        <feFuncR type="linear" slope={0.34} intercept={0.76} />
        <feFuncG type="linear" slope={0.34} intercept={0.76} />
        <feFuncB type="linear" slope={0.34} intercept={0.76} />
      </feComponentTransfer>
      <feGaussianBlur in="SourceGraphic" stdDeviation={0.004} result="soft" />
      <feBlend in="soft" in2="grain" mode="multiply" result="woven" />
      <feColorMatrix in="woven" type="saturate" values="0.9" result="toned" />
      <feComposite in="toned" in2="soft" operator="in" result="art" />
      <feDropShadow in="art" dx={0} dy={0.006} stdDeviation={0.006} floodColor="#000" floodOpacity={0.35} />
    </filter>
  )
}

/** The rug's colours weighted by how many tiles use them - what motifs take their colours from. */
export function rugPalette(state: Pick<TileDesignState, 'tiles'>, swatchesById: Map<string, Swatch>): PaletteInput {
  const weight = new Map<string, number>()
  for (const pieces of Object.values(state.tiles)) {
    for (const piece of pieces) {
      const color = swatchesById.get(piece.swatchId)?.swatchColor
      if (color) weight.set(color, (weight.get(color) ?? 0) + 1 / pieces.length)
    }
  }
  return [...weight].map(([color, w]) => ({ color, weight: w }))
}

export type OverlayColors = {
  palette: PaletteInput
  /** Resolves an overlay's `tint` (a swatch id) to a colour. */
  tintColor?: (swatchId: string) => string | undefined
}

type OverlayRenderer = (overlays: DesignOverlay[], prefix: string, colors: OverlayColors, finish?: boolean) => ReactNode[]
let overlayRenderer: OverlayRenderer | null = null

/** Called by `renderOverlays.tsx` when it loads (see there for why it is separate). */
export function registerOverlayRenderer(fn: OverlayRenderer) {
  overlayRenderer = fn
}
