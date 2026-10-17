const SITE = 'Bunakar'
const SITE_URL = 'https://bunakar.vercel.app'

type PageMetaProps = {
  /** Omit for the home page's own title ("Bunakar: Weave Your Own Rug"). */
  title?: string
  description: string
  /** Set on pages with no lasting search value: login-gated pages, share links, the 404. */
  noindex?: boolean
  /** Public, canonical pages only - the path this content really lives at, e.g. "/" or "/login". */
  canonicalPath?: string
}

/** Renders the per-route title/description/robots/canonical via React 19's native head-tag
 * hoisting. main.tsx removes index.html's static placeholders once, before first mount, so
 * these are always the only copies in the document. */
function PageMeta({ title, description, noindex, canonicalPath }: PageMetaProps) {
  return (
    <>
      <title>{title ? `${title} · ${SITE}` : `${SITE}: Weave Your Own Rug`}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex" />}
      {canonicalPath !== undefined && <link rel="canonical" href={`${SITE_URL}${canonicalPath}`} />}
    </>
  )
}

export default PageMeta
