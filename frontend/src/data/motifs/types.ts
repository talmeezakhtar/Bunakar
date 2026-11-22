/**
 * Vector motif format. A motif is a stack of filled paths, each tagged with a colour role; the
 * roles are mapped to the rug's palette at draw time (see `palette.ts`), so the art follows the
 * rug instead of carrying fixed colours.
 *
 * Paths use absolute M/L/C/Z commands only, are drawn in order (painter's algorithm) with the
 * default `nonzero` fill rule, and stay inside their `viewBox`. Holes are wound the other way.
 */

export type MotifRole = 'ground' | 'primary' | 'secondary' | 'accent' | 'outline'

export const MOTIF_ROLES: readonly MotifRole[] = ['ground', 'primary', 'secondary', 'accent', 'outline']

export type MotifCategory = 'Medallions' | 'Modern' | 'Florals' | 'Geometric' | 'Paisley' | 'Animals' | 'Organic' | 'Borders'

export interface MotifLayer {
  d: string
  role: MotifRole
}

/** `[minX, minY, width, height]`; minX and minY are always 0. */
export type ViewBox = readonly [number, number, number, number]

/** A drawable block of art: a piece, one border repeat, or a border corner. */
export interface MotifArt {
  viewBox: ViewBox
  layers: MotifLayer[]
}

interface MotifBase extends MotifArt {
  id: string
  name: string
  category: MotifCategory
  /** viewBox width / height. For a border: of one seamless repeat at full strip height. */
  aspect: number
}

export interface PieceSpec extends MotifBase {
  kind: 'piece'
}

/**
 * A border strip. `viewBox`/`layers` hold ONE repeat unit for the top edge: it runs along +x, its
 * outer (rug-edge) side is y = 0 and its inner side y = height. Units tile seamlessly side by side.
 * Other edges are the same unit rotated about the rug centre (right edge: rotate 90deg clockwise).
 *
 * `corner` is the top-left corner square (height x height), outer edges at x = 0 and y = 0. It is
 * symmetric about its diagonal, so it joins the top strip at its right edge and the left strip at
 * its bottom edge; rotate it 90deg clockwise per corner for the others.
 */
export interface BorderSpec extends MotifBase {
  kind: 'border'
  corner: MotifArt
}

export type MotifSpec = PieceSpec | BorderSpec

export type RoleColors = Partial<Record<MotifRole, string>>
