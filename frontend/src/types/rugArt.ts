import type { ReactNode } from 'react'

/** Any rug the previews can show: its size in its own units (tiles, feet) and how to draw it in
 * that unit space. Tile designs and freeform rugs both provide one. */
export type RugArt = {
  width: number
  height: number
  render: (idPrefix: string) => ReactNode
}
