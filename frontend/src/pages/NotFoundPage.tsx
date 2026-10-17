import { Link } from 'react-router-dom'
import PageMeta from '../components/common/PageMeta'

function NotFoundPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-night-950 px-4 pt-16 text-center">
      <PageMeta title="Page not found" description="This page doesn't exist on Bunakar." noindex />
      <h1 className="font-display text-3xl tracking-wide text-sand-100 sm:text-4xl">This page has unraveled</h1>
      <p className="max-w-md text-sand-300/80">
        We couldn&apos;t find what you were looking for. The link may be old, or the address may have a typo.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex min-h-11 items-center rounded-full bg-gold-500 px-6 text-sm font-semibold tracking-wide text-night-950 transition-colors hover:bg-gold-400"
      >
        Back to the home page
      </Link>
      <nav aria-label="Other pages" className="mt-1 flex gap-5 text-sm text-sand-300/80">
        <Link to="/#create-design" className="inline-flex min-h-11 items-center hover:text-gold-400">
          Designer
        </Link>
        <Link to="/#about-us" className="inline-flex min-h-11 items-center hover:text-gold-400">
          About the craft
        </Link>
      </nav>
    </div>
  )
}

export default NotFoundPage
