import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { List, X } from '@phosphor-icons/react'
import { useAuth } from '../../hooks/useAuth'
import Logo from './Logo'
import { canShow3D } from '../../three/canShow3D'

const linkBase = 'inline-flex min-h-11 items-center rounded-md px-1 text-[0.95rem] transition-colors duration-700'
const linkDay = `${linkBase} text-ink hover:text-accent`
const linkNight = `${linkBase} text-paper/85 hover:text-saffron`

/** The home courtyard announces dusk and dawn (`courtyard-night`); the bar turns dark with it. */
function useCourtyardNight() {
  const [night, setNight] = useState(() => typeof document !== 'undefined' && document.documentElement.dataset.night === '1')
  useEffect(() => {
    const on = (e: Event) => setNight((e as CustomEvent<boolean>).detail)
    window.addEventListener('courtyard-night', on)
    return () => window.removeEventListener('courtyard-night', on)
  }, [])
  return night
}

function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  // The menu belongs to the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = (next: boolean | ((was: boolean) => boolean)) =>
    setOpenOn((prev) => ((typeof next === 'function' ? next(prev === pathname) : next) ? pathname : null))
  const [scrolled, setScrolled] = useState(false)
  const isDesigner = pathname.startsWith('/designer') || pathname.startsWith('/freeform') || pathname.startsWith('/studio')
  const isMyDesigns = pathname === '/my-designs'
  const night = useCourtyardNight() && !isDesigner
  const linkClass = night ? linkNight : linkDay
  // The landing page's 3D courtyard is the backdrop: the bar lies on it, transparent, its
  // text dark by day and light by night. The plain home page is transparent until it scrolls.
  const [tour] = useState(canShow3D)
  const home = pathname === '/'
  const clear = home && !open && (tour || !scrolled)

  // A hairline and a solid ground once the page moves, so content never slides under bare links.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape closes the phone menu.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const links = (
    <>
      <Link to="/studio?new=1" className={linkClass}>
        Design a rug
      </Link>
      <Link to="/#how-it-works" className={linkClass}>
        How it works
      </Link>
      <Link to="/fabrics" className={linkClass}>
        Fabrics
      </Link>
      <Link to="/pricing" className={linkClass}>
        Pricing
      </Link>
      <Link to="/about" className={linkClass}>
        About
      </Link>
      {user && (
        <Link
          to="/my-designs"
          aria-current={isMyDesigns ? 'page' : undefined}
          className={`${linkClass} ${isMyDesigns ? 'text-accent' : ''}`}
        >
          My designs
        </Link>
      )}
    </>
  )

  const account = user ? (
    <button type="button" onClick={() => void logout()} className={linkClass} title={`Signed in as ${user.name}`}>
      Log out
    </button>
  ) : (
    <Link
      to="/login"
      state={{ from: pathname }}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-[0.95rem] font-medium transition-colors duration-700 ${
        night ? 'border-white/35 text-paper hover:border-paper' : 'border-line-strong text-ink hover:border-ink'
      }`}
    >
      Log in
    </Link>
  )

  return (
    <header
      className={`inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-700 ${isDesigner ? 'relative' : 'fixed'} ${
        clear
          ? // Transparent, with a soft fade of the sky's own tone so the links stay legible over the scene.
            `border-transparent bg-transparent before:pointer-events-none max-lg:before:hidden before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-24 before:bg-gradient-to-b before:to-transparent before:transition-colors before:duration-700 ${
              night ? 'before:from-[#14152b]/55' : 'before:from-paper/55'
            }`
          : night
            ? `bg-[#14152b]/80 backdrop-blur ${scrolled || open ? 'border-white/10' : 'border-transparent'}`
            : scrolled || isDesigner || open
              ? 'border-line bg-paper/95 backdrop-blur'
              : 'border-transparent bg-paper/75 backdrop-blur-sm'
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="inline-flex min-h-11 items-center rounded-md">
          {/* Over the tour on wide screens the logo sits on the light reading panel, so it stays dark. */}
          <Logo light={night && clear && tour ? 'narrow' : night} />
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {links}
          {account}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className={`-mr-2 flex h-11 w-11 items-center justify-center rounded-md md:hidden ${night ? 'text-paper' : 'text-ink'}`}
        >
          {open ? <X size={22} /> : <List size={22} />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className={`flex flex-col gap-1 border-t px-4 pb-5 pt-2 md:hidden ${night ? 'border-white/10 bg-[#14152b]' : 'border-line bg-paper'}`}>
          {links}
          <div className="pt-2">{account}</div>
        </div>
      )}
    </header>
  )
}

export default Navbar
