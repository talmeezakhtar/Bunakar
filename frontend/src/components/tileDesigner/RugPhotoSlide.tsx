import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import type { RoomPhoto } from '../../data/roomPhotos'
import { homographyToCssMatrix3d, rectToQuadHomography } from '../../utils/perspective'
import { RUG_LOOK, SOURCE_SCALE, buildShadeMap } from '../../utils/rugShading'
import { patternPrefix } from './renderTiles'

/** Any rug the room preview can show: its size in its own units (tiles, feet) and how to draw
 * it in that unit space. Tile designs and freeform rugs both provide one. */
export type RugArt = {
  width: number
  height: number
  render: (idPrefix: string) => ReactNode
}

type RugPhotoSlideProps = {
  photo: RoomPhoto
  rug: RugArt
}

function RugPhotoSlide({ photo, rug }: RugPhotoSlideProps) {
  const prefix = patternPrefix(useId())
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [shade, setShade] = useState<{ photoId: string; url: string } | null>(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) setSize({ width: box.width, height: box.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function handlePhotoLoad(e: SyntheticEvent<HTMLImageElement>) {
    setShade({ photoId: photo.id, url: buildShadeMap(e.currentTarget, photo.corners).toDataURL() })
  }

  const aspect = rug.width / rug.height
  const sourceW = SOURCE_SCALE
  const sourceH = SOURCE_SCALE / aspect
  // Source pixels per rug unit - converts pixel-sized effects into the SVG's own unit viewBox.
  const ppu = SOURCE_SCALE / rug.width

  const dest = {
    topLeft: { x: photo.corners.topLeft.x * size.width, y: photo.corners.topLeft.y * size.height },
    topRight: { x: photo.corners.topRight.x * size.width, y: photo.corners.topRight.y * size.height },
    bottomRight: { x: photo.corners.bottomRight.x * size.width, y: photo.corners.bottomRight.y * size.height },
    bottomLeft: { x: photo.corners.bottomLeft.x * size.width, y: photo.corners.bottomLeft.y * size.height },
  }
  const matrix = size.width > 0 ? homographyToCssMatrix3d(rectToQuadHomography(sourceW, sourceH, dest)) : 'none'
  const { topLeft, topRight, bottomRight, bottomLeft } = photo.corners
  const quadClip = `polygon(${[topLeft, topRight, bottomRight, bottomLeft].map((p) => `${p.x * 100}% ${p.y * 100}%`).join(', ')})`

  return (
    <div
      ref={containerRef}
      className="relative isolate w-full overflow-hidden bg-night-950"
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      <img
        src={photo.src}
        alt={photo.label}
        onLoad={handlePhotoLoad}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {size.width > 0 && (
        <div className="absolute inset-0" style={{ perspective: `${Math.max(size.width, size.height) * 1.4}px` }}>
          <div
            className="absolute left-0 top-0"
            style={{
              width: sourceW,
              height: sourceH,
              transform: matrix,
              transformOrigin: '0 0',
              boxShadow: `0 ${RUG_LOOK.shadowOffsetY}px ${RUG_LOOK.shadowBlur}px ${RUG_LOOK.shadowColor}`,
            }}
          >
            {/* Texture, tone and edge shading live inside the SVG itself so the export - which
                rasterizes this exact SVG - gets them for free. */}
            <svg
              width={sourceW}
              height={sourceH}
              viewBox={`0 0 ${rug.width} ${rug.height}`}
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="rug-photo-pile" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
                  {/* Stretched noise = woven pile rows instead of flat digital color. */}
                  <feTurbulence type="fractalNoise" baseFrequency={`${0.9 * ppu} ${0.45 * ppu}`} numOctaves={2} seed={3} result="noise" />
                  <feColorMatrix in="noise" type="saturate" values="0" result="grayNoise" />
                  <feComponentTransfer in="grayNoise" result="grain">
                    <feFuncR type="linear" slope={0.35} intercept={0.8} />
                    <feFuncG type="linear" slope={0.35} intercept={0.8} />
                    <feFuncB type="linear" slope={0.35} intercept={0.8} />
                    <feFuncA type="linear" slope={0} intercept={1} />
                  </feComponentTransfer>
                  <feBlend in="SourceGraphic" in2="grain" mode="multiply" result="woven" />
                  {/* Dye on wool is never as saturated or contrasty as screen color. */}
                  <feColorMatrix in="woven" type="saturate" values="0.88" result="toned" />
                  <feComponentTransfer in="toned">
                    <feFuncR type="linear" slope={0.94} intercept={0.03} />
                    <feFuncG type="linear" slope={0.94} intercept={0.03} />
                    <feFuncB type="linear" slope={0.94} intercept={0.03} />
                  </feComponentTransfer>
                </filter>
                <filter id="rug-photo-edge">
                  <feGaussianBlur stdDeviation={5 / ppu} />
                </filter>
              </defs>
              <g filter="url(#rug-photo-pile)">
                <rect x={0} y={0} width={rug.width} height={rug.height} fill="#efe6d2" />
                {rug.render(prefix)}
              </g>
              {/* Pile rolls over at the binding, so the rim reads slightly darker. */}
              <rect
                x={0}
                y={0}
                width={rug.width}
                height={rug.height}
                fill="none"
                stroke="#000"
                strokeOpacity={0.3}
                strokeWidth={8 / ppu}
                filter="url(#rug-photo-edge)"
              />
            </svg>
          </div>
        </div>
      )}
      {shade?.photoId === photo.id && (
        // The room's own light falloff, laid over the rug only.
        <div
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: quadClip, mixBlendMode: 'soft-light' }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${shade.url})`, backgroundSize: '100% 100%', filter: 'blur(20px)' }}
          />
        </div>
      )}
    </div>
  )
}

export default RugPhotoSlide
