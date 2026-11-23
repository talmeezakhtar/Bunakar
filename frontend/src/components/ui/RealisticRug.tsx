import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { RugSource } from '../../three/rug/rugSource'

type Props = {
  source: RugSource
  /** Long side of the rug in px to render at (the picture adds fringe and shadow around it). */
  longPx?: number
  alt: string
  className?: string
  /** Render straight away instead of waiting to scroll into view. */
  eager?: boolean
  /** 'cover' fills the box (cropping the fringe), 'contain' shows the whole rug. */
  fit?: 'contain' | 'cover'
  style?: CSSProperties
}

/**
 * A design shown as a real woven rug (pile, light, fringe, shadow). Renders once it nears the
 * viewport; until then, and while weaving, a wool-textured placeholder holds its place. The
 * renderer is loaded on first use, so pages that never show one don't pay for it.
 */
export default function RealisticRug({ source, longPx = 360, alt, className = '', eager = false, fit = 'contain', style }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(eager)
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (visible) return
    const el = box.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible) return
    let live = true
    import('../../three/rug/realistic')
      .then(({ renderRealisticRug }) => renderRealisticRug(source, { longPx }))
      .then((u) => live && setUrl(u))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [visible, source, longPx])

  return (
    <div ref={box} className={`relative ${fit === 'cover' ? 'overflow-hidden' : ''} ${className}`} style={style}>
      {!url && (
        <div
          aria-hidden="true"
          className={`absolute ${fit === 'cover' ? 'inset-0' : 'inset-[6%]'} rounded-[2px] bg-surface-2 bg-[url('/textures/pile.jpg')] bg-[length:120px] bg-blend-multiply ${failed ? '' : 'motion-safe:animate-pulse'}`}
        />
      )}
      {url && (
        <img
          src={url}
          alt={alt}
          className={`h-full w-full motion-safe:animate-[fade-in_400ms_ease-out] ${fit === 'cover' ? 'scale-[1.12] object-cover' : 'object-contain'}`}
          draggable={false}
        />
      )}
      {!url && <span className="sr-only">{alt}</span>}
    </div>
  )
}
