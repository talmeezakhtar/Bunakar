import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { List, X } from '@phosphor-icons/react'
import { useAuth } from '../../hooks/useAuth'

function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const isHome = pathname === '/'
  const isDesigner = pathname.startsWith('/designer')

  const authLink = user ? (
    <button
      type="button"
      onClick={() => {
        logout()
        setOpen(false)
      }}
      className="text-left transition-colors hover:text-gold-400"
    >
      Log out ({user.name})
    </button>
  ) : (
    <Link to="/login" className="transition-colors hover:text-gold-400" onClick={() => setOpen(false)}>
      Log in
    </Link>
  )

  return (
    <header
      className={`inset-x-0 top-0 z-50 border-b transition-colors ${isDesigner ? 'relative' : 'fixed'} ${
        isHome ? 'border-white/10 bg-transparent' : 'border-night-700 bg-night-950/95 backdrop-blur'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link
          to="/"
          className="font-logo text-2xl tracking-wide text-sand-100"
          onClick={() => setOpen(false)}
        >
          Buنakar
        </Link>

        <div className="hidden items-center gap-6 text-sm text-sand-300 sm:flex">
          <Link to="/#create-design" className="transition-colors hover:text-gold-400">
            Design
          </Link>
          <Link to="/#about-us" className="transition-colors hover:text-gold-400">
            About Us
          </Link>
          {authLink}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="bg-transparent text-sand-100 sm:hidden"
        >
          {open ? <X size={22} /> : <List size={22} />}
        </button>
      </nav>

      {open && (
        <div
          className={`flex flex-col gap-4 px-4 py-5 text-sm text-sand-300 backdrop-blur sm:hidden ${
            isHome ? 'bg-transparent' : 'bg-night-950/95'
          }`}
        >
          <Link to="/#create-design" className="hover:text-gold-400" onClick={() => setOpen(false)}>
            Design
          </Link>
          <Link to="/#about-us" className="hover:text-gold-400" onClick={() => setOpen(false)}>
            About Us
          </Link>
          {authLink}
        </div>
      )}
    </header>
  )
}

export default Navbar
