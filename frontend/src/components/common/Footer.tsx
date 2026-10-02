import { GithubLogo } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="border-t border-night-700 bg-night-950 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <span className="font-display text-lg tracking-wide text-sand-100">Bunakar</span>
          <p className="mt-1 text-sm text-sand-300/70">Handwoven rugs, designed your way.</p>
        </div>

        <nav aria-label="Footer" className="flex gap-4 text-sm text-sand-300/80">
          <Link to="/#create-design" className="inline-flex min-h-11 items-center hover:text-gold-400">
            Designer
          </Link>
          <Link to="/#about-us" className="inline-flex min-h-11 items-center hover:text-gold-400">
            About the craft
          </Link>
        </nav>

        <div className="flex gap-1 text-sand-300/80">
          <a
            href="https://github.com/talmeezakhtar/Bunakar"
            target="_blank"
            rel="noreferrer"
            aria-label="Bunakar source code on GitHub"
            className="inline-flex h-11 w-11 items-center justify-center transition-colors hover:text-gold-400"
          >
            <GithubLogo size={20} weight="regular" />
          </a>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-sand-300/70">
        © {new Date().getFullYear()} Bunakar. All rights reserved.
      </p>
    </footer>
  )
}

export default Footer
