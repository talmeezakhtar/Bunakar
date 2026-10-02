import { useEffect } from 'react'

const SITE = 'Bunakar'

/** Per-page browser tab title ("Log in · Bunakar"); no argument gives the home-page title. */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} · ${SITE}` : `${SITE}: Weave Your Own Rug`
  }, [page])
}
