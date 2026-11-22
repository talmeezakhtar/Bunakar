import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Fibre } from '../../data/materials'
import type { PileTexture } from '../../types/freeform'

type Props = {
  /** The yarn's dye colour. */
  hex: string
  fibre?: Fibre | string
  pile?: PileTexture
  flat?: boolean
  /** Displayed side in CSS px; rendered at twice that for sharp screens. */
  size?: number
  className?: string
  style?: CSSProperties
  title?: string
  /** Render resolution in px, for large swatches (default: twice `size`, at most 160). */
  px?: number
  /** Knots across the swatch (default: scales with the resolution). */
  knots?: number
}

/**
 * One yarn as a real fabric swatch: its fibre and pile, lit, in place of a flat colour square.
 * Shows the flat colour until the picture is ready (a few ms); the renderer loads on first use.
 */
export default function FabricChip({ hex, fibre = 'wool', pile, flat, size = 36, className = '', style, title, px: pxIn, knots }: Props) {
  const px = pxIn ?? Math.min(160, Math.round(size * 2))
  const key = `${hex}|${fibre}|${pile}|${flat}|${px}|${knots}`
  const [done, setDone] = useState<{ key: string; url: string } | null>(null)
  useEffect(() => {
    let live = true
    import('../../three/fabric/fabricChip')
      .then(({ fabricChipUrl }) => fabricChipUrl({ hex, fibre, pile, flat, px, knots }))
      .then((url) => live && setDone({ key, url }))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [key, hex, fibre, pile, flat, px, knots])
  const url = done?.key === key ? done.url : null
  return (
    <span
      aria-hidden={title ? undefined : true}
      title={title}
      className={`inline-block shrink-0 overflow-hidden bg-cover bg-center ${className}`}
      style={{ backgroundColor: hex, backgroundImage: url ? `url(${url})` : undefined, ...style }}
    />
  )
}
