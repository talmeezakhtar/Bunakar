import { useEffect, useRef } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import type { RoomPhoto } from '../../data/roomPhotos'
import RugPhotoSlide from './RugPhotoSlide'
import type { RugArt } from './RugPhotoSlide'

type RugRoomCarouselProps = {
  photos: RoomPhoto[]
  rug: RugArt
  index: number
  onIndexChange: (index: number) => void
}

function RugRoomCarousel({ photos, rug, index, onIndexChange }: RugRoomCarouselProps) {
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
    <div className="overflow-hidden rounded-2xl border border-line-strong shadow-[0_24px_60px_-20px_rgba(31,27,22,0.35)]">
      <div className="relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Keyed by room, so each one fades in rather than snapping over the last. */}
        <div key={photo.id} className="motion-safe:animate-[fade-in_600ms_cubic-bezier(0.22,1,0.36,1)]">
          <RugPhotoSlide photo={photo} rug={rug} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
          <p className="font-display text-sm text-paper">{photo.label}</p>
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Previous room"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 pointer-coarse:h-11 pointer-coarse:w-11 items-center justify-center rounded-full bg-paper/70 text-ink backdrop-blur transition-colors hover:bg-paper/90"
            >
              <CaretLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Next room"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 pointer-coarse:h-11 pointer-coarse:w-11 items-center justify-center rounded-full bg-paper/70 text-ink backdrop-blur transition-colors hover:bg-paper/90"
            >
              <CaretRight size={18} />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        // Each dot stays small; the button around it is a full 44px tap target.
        <div className="flex items-center justify-center bg-surface">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Show ${p.label}`}
              aria-current={i === index}
              className="group flex h-11 min-w-11 items-center justify-center bg-transparent"
            >
              <span
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-accent' : 'w-2 bg-line-strong group-hover:bg-line-hover'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default RugRoomCarousel
