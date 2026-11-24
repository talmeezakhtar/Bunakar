import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUp } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { COLORWAYS, findTemplate } from '../../data/patternTemplates'
import { FREEFORM_GENERATORS } from '../../data/freeformGenerators'
import { RUG_PHOTO_LIST } from '../../data/rugPhotos'
import { STOPS } from '../../three/courtyard/stops'
import FreeformPreview from './FreeformPreview'
import { ColourwayPicker, HeroCopy } from './HeroCopy'
import TemplatePreview from './TemplatePreview'
import { canShow3D } from '../../three/canShow3D'
import { introDelay } from '../../utils/intro'
import { RugsAwake } from '../ui/RealisticRug'
import WeavingLoader from '../ui/WeavingLoader'

// three.js and the scene load only where they can run, after the page itself.
const CourtyardScene = lazy(() => import('../../three/courtyard/CourtyardScene'))

const MEDALLION = findTemplate('persian-medallion')
/** Fixed star positions for the night sky (percent x, percent y, size px), upper half of the stage. */
const STARS: [number, number, number][] = Array.from({ length: 46 }, (_, i) => {
  const h = (n: number) => (((Math.sin(n * 91.7) * 43758.5453) % 1) + 1) % 1
  return [h(i) * 100, h(i + 100) * 55, h(i + 200) > 0.85 ? 2.5 : 1.5]
})
/** Four classics shown on the tour, each opening the Studio with the closest of its twenty styles. */
const SHOWCASE = (
  [
    ['persian-medallion', 'heriz'],
    ['turkmen-gul', 'bukhara'],
    ['herati-lattice', 'tabriz'],
    ['kazak-medallions', 'kazak'],
  ] as const
).flatMap(([id, style]) => {
  const t = findTemplate(id)
  return t ? [{ ...t, style }] : []
})

/** Anchors old links still use, mapped to the chapter that now holds that content. */
const ANCHORS: Record<number, string> = { 1: 'create-design', 2: 'about-us', 6: 'how-it-works' }

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

/** If the scene fails for any reason, the panels still work over the painted sky. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

const panelText = 'mt-3 text-lg leading-relaxed text-ink-2'
const panelTitle = 'font-display text-[clamp(2rem,3.6vw,3rem)] font-medium leading-[1.05] tracking-[-0.015em] text-ink'
const start = 'group inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-paper transition-[background-color,transform] duration-200 hover:bg-accent-hover active:scale-[0.98]'
const link = 'group inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent transition-colors hover:text-accent-hover'

/**
 * The landing page as one 3D experience: the courtyard stays pinned while the page scrolls, and
 * each screen of scroll is a chapter - the camera flies to that part of the courtyard and the
 * matching section of the site appears beside it. Scroll, swipe, the numbers in the scene, the
 * dots or the arrow keys all move between chapters.
 */
function TourHome() {
  const navigate = useNavigate()
  const reduce = !!useReducedMotion()
  const wide = useMedia('(min-width: 1024px)')
  const touch = useMedia('(pointer: coarse)')
  const track = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const [chapter, setChapter] = useState(0)
  // Chapters' woven rugs render once the tour is within a chapter of them, then stay.
  const [woken, setWoken] = useState(1)
  if (chapter + 1 > woken) setWoken(chapter + 1)
  // Rare devices without WebGL2 (or with data saver on) get the tour over a still of the scene.
  const [has3D] = useState(canShow3D)
  const [ready, setReady] = useState(!has3D)
  // Only draw the scene while its stage is on screen and the tab is visible.
  const stage = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(true)
  useEffect(() => {
    const el = stage.current
    if (!el || !has3D) return
    let onScreen = true
    const update = () => setActive(onScreen && !document.hidden)
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      update()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [has3D])
  // The loading loom steps aside when the scene is ready, or after 15 s if it never gets there.
  const [waited, setWaited] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setWaited(true), 15000)
    return () => window.clearTimeout(t)
  }, [])
  const [colorwayId, setColorwayId] = useState('kilim-red')
  const [rugIndex, setRugIndex] = useState(0)
  const last = STOPS.length - 1

  // Scroll position -> chapter (fractional for the camera, rounded for the panels).
  useEffect(() => {
    const onScroll = () => {
      const el = track.current
      if (!el) return
      const p = Math.min(last, Math.max(0, -el.getBoundingClientRect().top / window.innerHeight))
      progress.current = p
      setChapter(Math.round(p))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [last])

  const goTo = useCallback(
    (i: number) => {
      const el = track.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY + Math.max(0, Math.min(last, i)) * window.innerHeight
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
    },
    [last, reduce],
  )

  const nextRug = () => setRugIndex((i) => (i + 1) % RUG_PHOTO_LIST.length)
  const frontRug = RUG_PHOTO_LIST[rugIndex]
  const colorway = COLORWAYS.find((c) => c.id === colorwayId) ?? COLORWAYS[0]

  const enter = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: delay + introDelay(), ease: [0.22, 1, 0.36, 1] as const } }

  const panels: ReactNode[] = [
    // 0 - the welcome
    <div key="0">
      <HeroCopy enter={enter} />
      <motion.div {...enter(0.4)} className="mt-6 max-lg:hidden">
        <div role="radiogroup" aria-label="Rug in front" className="flex flex-wrap gap-1.5">
          {RUG_PHOTO_LIST.map((r, i) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={i === rugIndex}
              aria-label={r.name}
              title={r.name}
              onClick={() => setRugIndex(i)}
              className={`h-11 w-11 overflow-hidden rounded-md transition-transform hover:-translate-y-0.5 ${i === rugIndex ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'ring-1 ring-black/10'}`}
            >
              <img src={r.url} alt="" width={44} height={44} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-2">
          <span className="font-medium text-ink">{frontRug.name}</span> in front. Tap the rug to see the next one.
        </p>
      </motion.div>
    </div>,
    // 1 - start a rug
    <div key="1">
      <h2 className={panelTitle}>One studio for every rug</h2>
      <p className={panelText}>Knotted, flatwoven, tufted, braided or tiles. Choose how it&apos;s made, its size and yarns when you start.</p>
      <Link to="/studio?new=1" className={`mt-5 ${start}`}>
        Start a rug
        <ArrowRight size={18} weight="bold" className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </div>,
    // 2 - the craft
    <div key="2">
      <h2 className={panelTitle}>A weaving town&apos;s craft, in your hands</h2>
      <p className={panelText}>
        <i>Bunakar</i> is the Hindi word for weaver. Mirzapur and Bhadohi have knotted carpets for centuries,
        and their hand-knotted rugs carry India&apos;s Geographical Indication tag.
      </p>
      <p className="mt-4 border-t border-line pt-4 text-[0.95rem] leading-relaxed text-ink-2 max-lg:hidden">
        Design it knotted, flatwoven, tufted, hooked, braided, in needlepoint or in tiles, as fine as 225 knots to the square inch.
      </p>
    </div>,
    // 3 - colours
    <div key="3">
      <h2 className={panelTitle}>Real yarns, true colours</h2>
      <p className={panelText}>Every colour on your rug is a yarn from our catalogue, in wool, silk or cotton, so what you design can be woven. Try a colourway.</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ColourwayPicker value={colorwayId} onChange={setColorwayId} />
        <span className="font-medium text-ink">{colorway.name}</span>
      </div>
      {MEDALLION && (
        <div className="mt-4 w-40 overflow-hidden rounded-lg ring-1 ring-line">
          <TemplatePreview template={MEDALLION} colorway={colorway} widthTiles={4} heightTiles={6} className="aspect-[2/3] w-full" />
        </div>
      )}
    </div>,
    // 4 - ready-made patterns
    <div key="4">
      <h2 className={panelTitle}>Start from a classic</h2>
      <p className={panelText}>
        Twenty styles, each a whole layout in its own yarns: Heriz, Kashan, Tabriz, Oushak, Baluch, prayer rugs, garden carpets, kilims,
        Navajo eye-dazzlers and ikat. Change anything once it&apos;s yours.
      </p>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {SHOWCASE.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => navigate(`/studio?new=1&style=${t.style}`)}
            title={t.name}
            className="overflow-hidden rounded-lg ring-1 ring-line transition-transform hover:-translate-y-0.5"
          >
            <TemplatePreview template={t} colorway={COLORWAYS.find((c) => c.id === t.colorwayId) ?? COLORWAYS[0]} widthTiles={4} heightTiles={5} className="aspect-[4/5] w-full" />
          </button>
        ))}
      </div>
      <Link to={'/studio?new=1'} className={`mt-3 ${link}`}>
        See the styles in the Studio <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>,
    // 5 - freeform
    <div key="5">
      <h2 className={panelTitle}>Or bring your own picture</h2>
      <p className={panelText}>
        Draw a tufted rug freehand in flowing shapes, or photograph a rug you love and turn it into a knot chart in real yarns.
      </p>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {FREEFORM_GENERATORS.slice(0, 4).map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => navigate('/studio?new=1&make=tufted')}
            title={g.name}
            className="overflow-hidden rounded-lg ring-1 ring-line transition-transform hover:-translate-y-0.5"
          >
            <FreeformPreview generatorId={g.id} widthFt={4} heightFt={5} className="aspect-[4/5] w-full" />
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        <Link to="/studio?new=1&make=tufted" className={link}>
          Draw a tufted rug <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link to="/studio?new=1&photo=1" className={link}>
          Turn a photo into a chart <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>,
    // 6 - see it at home
    <div key="6">
      <h2 className={panelTitle}>Walk round it in a 3D room</h2>
      <p className={panelText}>
        Ten rooms built around your rug at its real size, from a hallway to a hotel lobby. Turn the view, step from room to room, then save the
        picture or share the link.
      </p>
      <Link
        to={`/designer/preview?template=persian-medallion&colorway=${colorwayId}&w=6&h=9`}
        className="group mt-5 block overflow-hidden rounded-xl bg-white ring-1 ring-line"
      >
        <img
          src="/posters/room-living.jpg"
          alt="A 6 by 9 foot medallion rug in a 3D living room, under a coffee table between a sofa and two armchairs"
          width={1480}
          height={1009}
          loading="lazy"
          className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] md:h-auto"
        />
      </Link>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        <Link to={`/designer/preview?template=persian-medallion&colorway=${colorwayId}&w=6&h=9`} className={link}>
          See this rug in a room <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
        <button type="button" onClick={() => goTo(1)} className={link}>
          Design your rug <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>,
  ]

  // Desktop: the island sits right of the panel. Phones: above the panel sheet.
  const shift: [number, number] = wide ? [0.2, 0.02] : [0, -0.1]

  return (
    <div ref={track} className="relative" style={{ height: `${STOPS.length * 100}svh` }}>
      {/* Where old links land: one anchor per chapter that took over an old section. */}
      {Object.entries(ANCHORS).map(([i, id]) => (
        <div key={id} id={id} aria-hidden="true" className="absolute left-0 h-px w-px" style={{ top: `${Number(i) * 100}svh` }} />
      ))}

      <div ref={stage} className="sticky top-0 h-svh overflow-hidden bg-[radial-gradient(110%_85%_at_70%_20%,#f8d3a5_0%,#e9a274_34%,#b86b5c_60%,#5d3d55_85%,#33293f_100%)]">
        {/* Night sky: fades in with the courtyard's own clock (the scene sets --night, 0 day to 1 night). */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: 'var(--night, 0)' }}>
          <div className="absolute inset-0 bg-[radial-gradient(110%_85%_at_70%_20%,#3a4478_0%,#232a55_38%,#151634_70%,#0b0a1c_100%)]" />
          {STARS.map(([x, y, r], i) => (
            <span key={i} className="absolute rounded-full bg-white/80" style={{ left: `${x}%`, top: `${y}%`, width: r, height: r }} />
          ))}
        </div>
        <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}>
          {has3D ? (
          <SceneBoundary>
            <Suspense fallback={null}>
              <CourtyardScene
                progress={progress}
                chapter={chapter}
                onGoTo={goTo}
                rugIndex={rugIndex}
                onNextRug={nextRug}
                reduceMotion={reduce}
                onReady={() => setReady(true)}
                shift={shift}
                touch={touch}
                distance={wide ? 1 : 1.3}
                active={active}
              />
            </Suspense>
          </SceneBoundary>
          ) : (
            <img src="/posters/room-living.jpg" alt="" width={1480} height={1009} className="h-full w-full object-cover" />
          )}
        </div>
        {!ready && !waited && (
          <div className={`pointer-events-none absolute inset-0 grid place-items-center ${wide ? 'pl-[38%]' : 'pb-[30%]'}`}>
            <WeavingLoader label="Weaving the courtyard" />
          </div>
        )}

        {/* A soft ivory fade behind the panel keeps the text readable over the scene. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(0deg,rgb(251_248_242/0.6)_0%,rgb(251_248_242/0)_45%)] lg:bg-[linear-gradient(90deg,var(--color-paper)_0%,rgb(251_248_242/0.9)_30%,rgb(251_248_242/0.35)_48%,rgb(251_248_242/0)_62%)]"
        />

        <div className="pointer-events-none absolute inset-0 z-20 mx-auto flex max-w-6xl items-end px-0 sm:px-6 lg:items-center lg:pt-16">
          {/* Phones: a solid sheet at the bottom; wide screens: the panel floats over the fade. */}
          <div className="relative max-h-[40svh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper/95 px-5 pb-5 pt-4 shadow-[0_-12px_40px_-16px_rgba(31,27,22,0.35)] backdrop-blur max-lg:[&_h1]:text-[1.75rem] max-lg:[&_h2]:text-[1.5rem] max-lg:[&_p]:text-[1rem] lg:max-h-none lg:overflow-visible lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            {panels.map((panel, i) => (
              <section
                key={i}
                aria-hidden={chapter !== i}
                inert={chapter !== i}
                className={`transition-[opacity,transform] duration-500 ease-[var(--ease-gallery)] ${
                  chapter === i ? 'pointer-events-auto relative opacity-100' : 'pointer-events-none absolute inset-x-0 bottom-0 translate-y-4 opacity-0 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2'
                }`}
              >
                <RugsAwake.Provider value={i <= woken}>{panel}</RugsAwake.Provider>
              </section>
            ))}
          </div>
        </div>

        {/* Chapter dots and arrows: another way through, and where you are. */}
        <nav aria-label="Tour" className="absolute right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => goTo(chapter - 1)}
            disabled={chapter === 0}
            aria-label="Previous"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-paper/80 text-ink backdrop-blur transition-opacity disabled:opacity-0"
          >
            <ArrowUp size={16} weight="bold" />
          </button>
          {STOPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              aria-label={`${s.id === 0 ? 'Overview' : `${s.id}. ${s.title}`}`}
              aria-current={chapter === s.id ? 'step' : undefined}
              className="flex h-7 w-10 items-center justify-center"
            >
              <span className={`block rounded-full transition-all ${chapter === s.id ? 'h-2.5 w-2.5 bg-ink' : 'h-1.5 w-1.5 bg-ink/40'}`} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => goTo(chapter + 1)}
            disabled={chapter === last}
            aria-label="Next"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-paper/80 text-ink backdrop-blur transition-opacity disabled:opacity-0"
          >
            <ArrowDown size={16} weight="bold" />
          </button>
        </nav>

        {chapter === 0 && (
          <button
            type="button"
            onClick={() => goTo(1)}
            className="absolute bottom-5 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-ink/60 px-4 py-2 text-[0.8125rem] font-medium text-paper backdrop-blur lg:inline-flex"
          >
            Scroll to explore the courtyard <ArrowDown size={14} weight="bold" />
          </button>
        )}
      </div>

    </div>
  )
}

export default TourHome
