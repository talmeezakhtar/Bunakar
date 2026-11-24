import { fullTitle } from '../../seo/routeMeta'
import type { RouteMeta } from '../../seo/routeMeta'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://bunakar.vercel.app').replace(/\/$/, '')

type PageMetaProps = {
  /** Omit for the home page's own title. */
  title?: string
  description: string
  /** Set on pages with no lasting search value: login-gated pages, share links, the 404. */
  noindex?: boolean
  /** Public, canonical pages only - the path this content really lives at, e.g. "/" or "/login". */
  canonicalPath?: string
} & Partial<Pick<RouteMeta, 'priority' | 'changefreq'>>

/** Renders the per-route title/description/robots/canonical and link-preview tags via React
 * 19's native head-tag hoisting. main.tsx removes index.html's static copies once, before first
 * mount, so these are always the only copies in the document. */
function PageMeta({ title, description, noindex, canonicalPath }: PageMetaProps) {
  const full = fullTitle(title)
  return (
    <>
      <title>{full}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={full} />
      <meta name="twitter:description" content={description} />
      {canonicalPath !== undefined && <link rel="canonical" href={`${SITE_URL}${canonicalPath}`} />}
      {canonicalPath !== undefined && <meta property="og:url" content={`${SITE_URL}${canonicalPath}`} />}
    </>
  )
}

export default PageMeta
