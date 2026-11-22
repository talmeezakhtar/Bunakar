import { Suspense, lazy, useState } from 'react'
import { Link } from 'react-router-dom'
import { canShow3D } from '../../three/canShow3D'
import Logo from './Logo'

const YEAR = new Date().getFullYear()

const CritterFooter = lazy(() => import('../ui/fuzzy-critter-footer'))

const linkClass = 'inline-flex min-h-11 items-center pointer-fine:min-h-8 text-[0.95rem] text-muted transition-colors hover:text-accent'

/** Copyright and maker; the models' CC BY credits are on the credits page, linked under Legal. */
function FooterNote({ className }: { className?: string }) {
  return (
    <p className={className}>
      © {YEAR} Bunakar. Built by{' '}
      <a href="https://talmeezakhtar.github.io/" target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-4 hover:text-accent">
        Talmeez Akhtar
      </a>
      .
    </p>
  )
}

function PlainFooter() {
  return (
    <footer className="relative border-t border-line bg-paper px-4 pb-6 pt-10 sm:px-6">
      <div aria-hidden="true" className="bg-girih pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="relative mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 leading-relaxed text-muted">
            A rug design studio from India&apos;s carpet belt. Design it, see it as real wool, hand it to any weaver.
          </p>
        </div>
        <nav aria-label="Design">
          <h2 className="text-sm font-semibold text-ink">Design</h2>
          <ul className="mt-2">
            <li><Link to="/studio?new=1" className={linkClass}>Start a rug</Link></li>
            <li><Link to="/studio" className={linkClass}>Studio</Link></li>
            <li><Link to="/my-designs" className={linkClass}>My designs</Link></li>
            <li><Link to="/fabrics" className={linkClass}>Fabrics</Link></li>
          </ul>
        </nav>
        <nav aria-label="Bunakar">
          <h2 className="text-sm font-semibold text-ink">Bunakar</h2>
          <ul className="mt-2">
            <li><Link to="/about" className={linkClass}>About</Link></li>
            <li><Link to="/pricing" className={linkClass}>Pricing</Link></li>
            <li><Link to="/faq" className={linkClass}>FAQ</Link></li>
            <li><Link to="/contact" className={linkClass}>Contact</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="text-sm font-semibold text-ink">Legal</h2>
          <ul className="mt-2">
            <li><Link to="/privacy" className={linkClass}>Privacy</Link></li>
            <li><Link to="/terms" className={linkClass}>Terms</Link></li>
            <li><Link to="/cancellation" className={linkClass}>Cancellation</Link></li>
            <li><Link to="/credits" className={linkClass}>Credits</Link></li>
          </ul>
        </nav>
      </div>
      <FooterNote className="relative mx-auto mt-8 max-w-6xl border-t border-line pt-6 text-sm text-muted" />
    </footer>
  )
}

/**
 * The site footer: the critter footer (wool creatures, the big Bunakar wordmark) where the device
 * can run 3D, loaded lazily so three.js stays out of every page's first download. The plain
 * footer shows while it loads, and is the footer on devices without 3D.
 */
function Footer() {
  const [critters] = useState(canShow3D)
  if (!critters) return <PlainFooter />
  return (
    <Suspense fallback={<PlainFooter />}>
      <CritterFooter copyright={<FooterNote />} />
    </Suspense>
  )
}

export default Footer
