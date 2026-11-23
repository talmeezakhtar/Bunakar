import { useState } from 'react'
import type { Fibre } from '../../data/materials'
import { fibreMaterial } from '../../data/materials'
import type { PileTexture } from '../../types/freeform'
import FabricChip from '../ui/FabricChip'

/**
 * The close-up without WebGL: a large baked swatch with a highlight that follows the pointer,
 * broad and faint on wool, tight and bright on silk.
 */
export default function FabricCloseUp({ hex, fibre, pile, flat }: { hex: string; fibre: Fibre | string; pile?: PileTexture; flat?: boolean }) {
  const [at, setAt] = useState<[number, number]>([35, 30])
  const r = fibreMaterial(fibre).render
  const gloss = Math.max(0, 1 - r.roughness)
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onPointerMove={(e) => {
        const b = e.currentTarget.getBoundingClientRect()
        setAt([((e.clientX - b.left) / b.width) * 100, ((e.clientY - b.top) / b.height) * 100])
      }}
    >
      <FabricChip hex={hex} fibre={fibre} pile={pile} flat={flat} px={512} knots={36} className="h-full w-full" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        style={{ background: `radial-gradient(${30 + (1 - gloss) * 50}% ${30 + (1 - gloss) * 50}% at ${at[0]}% ${at[1]}%, rgba(255,250,240,${0.25 + gloss * 0.6}), transparent 70%)` }}
      />
    </div>
  )
}
