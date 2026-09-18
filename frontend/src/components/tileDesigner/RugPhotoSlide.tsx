import { useLayoutEffect, useRef, useState } from 'react'
import type { Swatch } from '../../types/swatch'
import type { TileDesignState } from '../../types/tileDesign'
import type { RoomPhoto } from '../../data/roomPhotos'
import { homographyToCssMatrix3d, rectToQuadHomography } from '../../utils/perspective'
import { renderTileFills } from './renderTiles'

type RugPhotoSlideProps = {
  photo: RoomPhoto
  state: TileDesignState
  swatchesById: Map<string, Swatch>
}

const SOURCE_SCALE = 400

function RugPhotoSlide({ photo, state, swatchesById }: RugPhotoSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

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

  const aspect = state.widthTiles / state.heightTiles
  const sourceW = SOURCE_SCALE
  const sourceH = SOURCE_SCALE / aspect

  const dest = {
    topLeft: { x: photo.corners.topLeft.x * size.width, y: photo.corners.topLeft.y * size.height },
    topRight: { x: photo.corners.topRight.x * size.width, y: photo.corners.topRight.y * size.height },
    bottomRight: { x: photo.corners.bottomRight.x * size.width, y: photo.corners.bottomRight.y * size.height },
    bottomLeft: { x: photo.corners.bottomLeft.x * size.width, y: photo.corners.bottomLeft.y * size.height },
  }
  const matrix = size.width > 0 ? homographyToCssMatrix3d(rectToQuadHomography(sourceW, sourceH, dest)) : 'none'

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-night-950"
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      <img src={photo.src} alt={photo.label} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      {size.width > 0 && (
        <div className="absolute inset-0" style={{ perspective: `${Math.max(size.width, size.height) * 1.4}px` }}>
          <div
            className="absolute left-0 top-0"
            style={{ width: sourceW, height: sourceH, transform: matrix, transformOrigin: '0 0' }}
          >
            <svg
              width={sourceW}
              height={sourceH}
              viewBox={`0 0 ${state.widthTiles} ${state.heightTiles}`}
              preserveAspectRatio="none"
            >
              <rect x={0} y={0} width={state.widthTiles} height={state.heightTiles} fill="#efe6d2" />
              {renderTileFills(state, swatchesById)}
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

export default RugPhotoSlide
