import { Link } from 'react-router-dom'
import PageMeta from '../components/common/PageMeta'

function NotFoundPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-paper px-4 pt-16 text-center">
      <PageMeta title="Page not found" description="This page doesn't exist on Bunakar." noindex />
      <p className="font-display text-sm text-accent">404</p>
      <h1 className="mt-3 font-display text-[clamp(2.25rem,5vw,3.5rem)] font-medium leading-tight tracking-[-0.015em] text-ink">
        This thread came loose
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
        We couldn&apos;t find that page. The link may be old, or the address may have a typo.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-paper transition-colors hover:bg-accent-hover"
        >
          Back to the home page
        </Link>
        <Link
          to="/#create-design"
          className="inline-flex min-h-12 items-center rounded-full border border-line-strong px-6 font-medium text-ink transition-colors hover:border-ink"
        >
          Design a rug
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
