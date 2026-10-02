import type { ReactNode } from 'react'
import type { Swatch } from '../../types/swatch'
import type { FreeformDesignState, PileHeight, PileTexture, SurfaceFinish } from '../../types/freeform'
import type { Point } from '../../types/freeform'
import { contourLinesPath, flattenShape, shapePath } from '../../utils/freeformGeometry'

/**
 * Draws a freeform rug in feet units: the ground, then each shape back to front. A surface is
 * its yarn colour (or its tile photo) run through a pile-texture filter, with pile height as
 * relief and carving (groove / ribs / contour lines) cut into it. Shared by the designer canvas,
 * the wizard thumbnails, the room preview and the image export, so they all match.
 */

/** Grain per texture: noise frequency (cycles per foot, x then y) and how strong it reads. */
const GRAIN: Record<Exclude<PileTexture, 'photo'>, { type: 'fractalNoise' | 'turbulence'; freq: string; octaves: number; slope: number; intercept: number }> = {
  cut: { type: 'fractalNoise', freq: '28 28', octaves: 2, slope: 0.28, intercept: 0.82 },
  loop: { type: 'turbulence', freq: '26 11', octaves: 1, slope: 0.5, intercept: 0.68 },
  shag: { type: 'fractalNoise', freq: '5 1.6', octaves: 3, slope: 0.62, intercept: 0.58 },
  highlow: { type: 'fractalNoise', freq: '24 24', octaves: 2, slope: 0.3, intercept: 0.8 },
}

function surfaceFilter(id: string, texture: PileTexture, pile: PileHeight): ReactNode {
  const g = texture === 'photo' ? null : GRAIN[texture]
  const tone = pile === 'low' ? 0.93 : pile === 'high' ? 1.04 : 1
  return (
    <filter key={id} id={id} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
      {g ? (
        <>
          <feTurbulence type={g.type} baseFrequency={g.freq} numOctaves={g.octaves} seed={7} result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="grey" />
          <feComponentTransfer in="grey" result="grain">
            <feFuncR type="linear" slope={g.slope} intercept={g.intercept} />
            <feFuncG type="linear" slope={g.slope} intercept={g.intercept} />
            <feFuncB type="linear" slope={g.slope} intercept={g.intercept} />
          </feComponentTransfer>
          {texture === 'highlow' && (
            // Patches of two pile heights: coarse noise, stepped to two tones, over the fine grain.
            <>
              <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves={1} seed={3} result="coarse" />
              <feColorMatrix in="coarse" type="saturate" values="0" result="coarseGrey" />
              <feComponentTransfer in="coarseGrey" result="steps">
                <feFuncR type="discrete" tableValues="0.84 1" />
                <feFuncG type="discrete" tableValues="0.84 1" />
                <feFuncB type="discrete" tableValues="0.84 1" />
              </feComponentTransfer>
              <feBlend in="steps" in2="grain" mode="multiply" result="grain2" />
            </>
          )}
          <feBlend in="SourceGraphic" in2={texture === 'highlow' ? 'grain2' : 'grain'} mode="multiply" result="woven" />
        </>
      ) : (
        <feOffset in="SourceGraphic" dx={0} dy={0} result="woven" />
      )}
      <feComponentTransfer in="woven" result="toned">
        <feFuncR type="linear" slope={tone} />
        <feFuncG type="linear" slope={tone} />
        <feFuncB type="linear" slope={tone} />
      </feComponentTransfer>
      <feComposite in="toned" in2="SourceGraphic" operator="in" result="surface" />
      {pile === 'high' ? (
        // Raised pile casts a soft shadow onto what's around it.
        <feDropShadow in="surface" dx={0.02} dy={0.05} stdDeviation={0.045} floodColor="#000" floodOpacity={0.4} />
      ) : (
        <feOffset in="surface" dx={0} dy={0} />
      )}
    </filter>
  )
}

const filterId = (prefix: string, f: Pick<SurfaceFinish, 'texture' | 'pile'>) => `${prefix}-f-${f.texture}-${f.pile}`
const photoId = (prefix: string, swatchId: string) => `${prefix}-ph-${swatchId}`
const ribId = (prefix: string, angle: number) => `${prefix}-rib-${Math.round(angle)}`

function fillFor(prefix: string, f: SurfaceFinish, swatch: Swatch | undefined): string {
  if (f.texture === 'photo' && swatch?.imageUrl) return `url(#${photoId(prefix, swatch.id)})`
  return swatch?.swatchColor ?? '#cccccc'
}

/** Carving laid over a surface outlined by `d`. `clip` is that surface's clip-path id. */
function carving(prefix: string, key: string, f: SurfaceFinish, d: string, clip: string, W: number, H: number, around: Point[][]): ReactNode {
  if (f.carve === 'groove') {
    // A cut channel along the edge: a soft dark line with a lit lip just above it.
    return (
      <g key={`${key}-carve`} className="pointer-events-none" clipPath={`url(#${clip})`}>
        <path d={d} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={0.07} />
        <path d={d} fill="none" stroke="#fff" strokeOpacity={0.22} strokeWidth={0.025} transform="translate(-0.018 -0.018)" />
      </g>
    )
  }
  if (f.carve === 'ribbed') {
    return <path key={`${key}-carve`} className="pointer-events-none" d={d} fill={`url(#${ribId(prefix, f.carveAngle)})`} />
  }
  if (f.carve === 'contour') {
    const lines = contourLinesPath(W, H, around)
    return (
      <g key={`${key}-carve`} className="pointer-events-none" clipPath={`url(#${clip})`}>
        <path d={lines} fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={0.03} />
        <path d={lines} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.014} transform="translate(-0.012 -0.012)" />
      </g>
    )
  }
  return null
}

export function renderFreeform(state: FreeformDesignState, swatchesById: Map<string, Swatch>, prefix: string): ReactNode[] {
  const { widthFt: W, heightFt: H, ground } = state
  const surfaces: { key: string; finish: SurfaceFinish; d: string }[] = [
    { key: 'ground', finish: ground, d: `M0,0H${W}V${H}H0Z` },
    ...state.shapes.map((s) => ({ key: s.id, finish: s as SurfaceFinish, d: shapePath(s.points, s.smooth) })),
  ]

  // Only the filters, photo patterns and rib patterns this rug actually uses.
  const filters = new Map<string, ReactNode>()
  const photos = new Map<string, ReactNode>()
  const ribs = new Map<string, ReactNode>()
  for (const { finish: f } of surfaces) {
    const fid = filterId(prefix, f)
    if (!filters.has(fid)) filters.set(fid, surfaceFilter(fid, f.texture, f.pile))
    const sw = swatchesById.get(f.swatchId)
    if (f.texture === 'photo' && sw?.imageUrl && !photos.has(sw.id)) {
      photos.set(
        sw.id,
        // One 18" tile per repeat, like the physical tile the photo shows.
        <pattern key={sw.id} id={photoId(prefix, sw.id)} patternUnits="userSpaceOnUse" width={1.5} height={1.5}>
          <rect width={1.5} height={1.5} fill={sw.swatchColor} />
          <image href={sw.imageUrl} width={1.5} height={1.5} preserveAspectRatio="none" />
        </pattern>,
      )
    }
    if (f.carve === 'ribbed') {
      const rid = ribId(prefix, f.carveAngle)
      if (!ribs.has(rid)) {
        ribs.set(
          rid,
          <pattern key={rid} id={rid} patternUnits="userSpaceOnUse" width={0.16} height={0.16} patternTransform={`rotate(${Math.round(f.carveAngle)})`}>
            <rect y={0} width={0.16} height={0.04} fill="#000" fillOpacity={0.26} />
            <rect y={0.04} width={0.16} height={0.018} fill="#fff" fillOpacity={0.2} />
          </pattern>,
        )
      }
    }
  }

  // Contour grooves ripple out from the shapes' outlines.
  const around = surfaces.some((s) => s.finish.carve === 'contour') ? state.shapes.map((s) => flattenShape(s, 3)) : []

  const out: ReactNode[] = [
    <defs key="freeform-defs">
      {/* Shapes may be dragged past the edge; the rug itself ends at its binding. */}
      <clipPath id={`${prefix}-rug`}>
        <rect width={W} height={H} />
      </clipPath>
      {[...filters.values()]}
      {[...photos.values()]}
      {[...ribs.values()]}
      {surfaces
        .filter((s) => s.finish.carve === 'groove' || s.finish.carve === 'contour')
        .map((s) => (
          <clipPath key={s.key} id={`${prefix}-clip-${s.key}`}>
            <path d={s.d} />
          </clipPath>
        ))}
    </defs>,
  ]
  const body: ReactNode[] = []
  for (const s of surfaces) {
    const sw = swatchesById.get(s.finish.swatchId)
    body.push(
      <path key={s.key} data-shape={s.key} d={s.d} fill={fillFor(prefix, s.finish, sw)} filter={`url(#${filterId(prefix, s.finish)})`} />,
      carving(prefix, s.key, s.finish, s.d, `${prefix}-clip-${s.key}`, W, H, around),
    )
  }
  out.push(
    <g key="freeform-body" clipPath={`url(#${prefix}-rug)`}>
      {body}
    </g>,
  )
  return out
}

