/**
 * Title and description of every public page, in one place: the pages render them (PageMeta),
 * and the build writes them into each page's own HTML (scripts/prerender-heads.ts), so link
 * previews and crawlers that don't run JavaScript see the right page. Also the sitemap.
 */
export type RouteMeta = {
  /** Omit for the home page. */
  title?: string
  description: string
  priority: number
  changefreq: 'monthly' | 'yearly'
}

export const SITE_NAME = 'Bunakar'
export const HOME_TITLE = 'Bunakar: Design Your Own Hand-Knotted Rug'

export function fullTitle(title?: string) {
  return title ? `${title} · ${SITE_NAME}` : HOME_TITLE
}

export const ROUTES = {
  '/': {
    description:
      'Bunakar is a rug design studio: draw a hand-knotted, flatwoven, tufted or tiled rug knot by knot, from a classic style or from a photo, see it as real wool in a 3D room, and hand a weaver its knot chart. Free to start.',
    priority: 1,
    changefreq: 'monthly',
  },
  '/studio': {
    title: 'Studio',
    description: 'Bunakar Studio: design any rug, knot by knot or freehand, and see it woven and in a room.',
    priority: 0.9,
    changefreq: 'monthly',
  },
  '/fabrics': {
    title: 'Rug fabrics',
    description:
      'Wool, New Zealand wool, silk, bamboo silk, cotton and jute: how each rug fibre looks, feels and wears. See every one up close in 3D before you design.',
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/pricing': {
    title: 'Pricing',
    description: "Bunakar is free to design with. Pro adds unlimited designs, full-size images, weaver's charts, tufting templates and tile maps.",
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/about': {
    title: 'About',
    description:
      "Bunakar is a rug design studio from Mirzapur, in India's carpet belt: design any kind of rug, see it as real wool, and hand a weaver the chart to make it.",
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/faq': {
    title: 'FAQ',
    description:
      "Answers about Bunakar's Free and Pro plans, designing knotted, flatwoven, tufted, braided and tile rugs in the Studio, weaver's charts, and your account.",
    priority: 0.6,
    changefreq: 'monthly',
  },
  '/contact': {
    title: 'Contact',
    description: 'Contact Bunakar about designing rugs, your account, the Pro plan, or using Bunakar in your business.',
    priority: 0.5,
    changefreq: 'yearly',
  },
  '/credits': {
    title: 'Credits',
    description: 'Credits for the 3D models and typefaces used on Bunakar.',
    priority: 0.3,
    changefreq: 'yearly',
  },
  '/privacy': {
    title: 'Privacy policy',
    description: 'What Bunakar collects, why, who processes it, and your rights.',
    priority: 0.2,
    changefreq: 'yearly',
  },
  '/terms': {
    title: 'Terms of use',
    description: 'The terms for using Bunakar, its designers and its plans.',
    priority: 0.2,
    changefreq: 'yearly',
  },
  '/cancellation': {
    title: 'Cancellation and refunds',
    description: 'How cancelling Bunakar Pro works, and refunds.',
    priority: 0.2,
    changefreq: 'yearly',
  },
} satisfies Record<string, RouteMeta>

export type RoutePath = keyof typeof ROUTES
