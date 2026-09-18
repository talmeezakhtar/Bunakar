import { useEffect, useRef } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import type { TileDesignState } from '../../types/tileDesign'
import type { RoomPhoto } from '../../data/roomPhotos'
import RugPhotoSlide from './RugPhotoSlide'

type RugRoomCarouselProps = {
  photos: RoomPhoto[]
  state: TileDesignState
  swatchesById: Map<string, Swatch>
  index: number
  onIndexChange: (index: number) => void
}

function RugRoomCarousel({ photos, state, swatchesById, index, onIndexChange }: RugRoomCarouselProps) {
  const touchStartX = useRef<number | null>(null)
  const photo = photos[index]

  function goTo(next: number) {
    onIndexChange((next + photos.length) % photos.length)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goTo(index - 1)
      if (e.key === 'ArrowRight') goTo(index + 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos.length])

  function handleTouchStart(e: ReactTouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: ReactTouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    goTo(dx > 0 ? index - 1 : index + 1)
  }

  if (!photo) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-night-600 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <div className="relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <RugPhotoSlide photo={photo} state={state} swatchesById={swatchesById} />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
          <p className="font-display text-sm tracking-wide text-sand-100">{photo.label}</p>
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Previous room"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-night-950/70 text-sand-100 backdrop-blur transition-colors hover:bg-night-950/90"
            >
              <CaretLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Next room"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-night-950/70 text-sand-100 backdrop-blur transition-colors hover:bg-night-950/90"
            >
              <CaretRight size={18} />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-2 bg-night-900 py-3">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Show ${p.label}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-gold-500' : 'w-2 bg-night-600 hover:bg-night-500'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default RugRoomCarousel
