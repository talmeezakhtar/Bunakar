import { EnvelopeSimple, InstagramLogo } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="border-t border-night-700 bg-night-950 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <span className="font-display text-lg tracking-wide text-sand-100">Bunakar</span>
          <p className="mt-1 text-sm text-sand-300/70">Handwoven rugs, designed your way.</p>
        </div>

        <nav className="flex gap-6 text-sm text-sand-300/80">
          <Link to="/designer" className="hover:text-gold-400">
            Designer
          </Link>
          <Link to="/about" className="hover:text-gold-400">
            About the craft
          </Link>
        </nav>

        <div className="flex gap-4 text-sand-300/80">
          <a
            href="https://instagram.com/bunakar.rugs"
            target="_blank"
            rel="noreferrer"
            aria-label="Bunakar on Instagram"
            className="transition-colors hover:text-gold-400"
          >
            <InstagramLogo size={20} weight="regular" />
          </a>
          <a
            href="mailto:hello@bunakar.in"
            aria-label="Email Bunakar"
            className="transition-colors hover:text-gold-400"
          >
            <EnvelopeSimple size={20} weight="regular" />
          </a>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-sand-300/50">
        © {new Date().getFullYear()} Bunakar. All rights reserved.
      </p>
    </footer>
  )
}

export default Footer
