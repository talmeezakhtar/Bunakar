import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import PageMeta from '../components/common/PageMeta'
import { ContentPage, Section } from '../components/content/ContentPage'
import TeamLanyardRail from '../components/ui/team-lanyard-rail'
import type { LanyardMember } from '../components/ui/team-lanyard-rail'

const PHOTOS = [
  { src: '/rugs/rug-1.jpg', alt: 'A red hand-knotted rug with an all-over floral field and a dark border' },
  { src: '/rugs/rug-4.jpg', alt: 'A dark green rug with a large golden sunburst medallion' },
  { src: '/rugs/rug-5.jpg', alt: 'An ivory rug with a blue and gold medallion and corner spandrels' },
  { src: '/rugs/rug-3.jpg', alt: 'A teal and red rug with a central floral medallion' },
]

const EMAIL = 'talmeezmzp@gmail.com'

const TEAM: LanyardMember[] = [
  {
    id: 'talmeez',
    name: 'Talmeez Akhtar',
    role: 'Founder · Lead developer',
    team: 'Bunakar · Mirzapur',
    // The portrait goes here (square, at least 400px); until then the badge shows a silhouette.
    image: '/images/team/talmeez.jpg',
    bio: 'Grew up among the looms of Mirzapur. Designs and builds Bunakar, and answers every email.',
    tags: ['Mirzapur', 'Design & code'],
    links: [
      { label: 'Email', href: `mailto:${EMAIL}` },
      { label: 'Website', href: 'https://talmeezakhtar.github.io/' },
    ],
    tone: 1,
  },
]

function AboutPage() {
  return (
    <ContentPage
      title="A rug design studio, named for the weaver."
      intro={
        <p>
          <em>Bunakar</em> is the Hindi word for weaver. It&apos;s a studio where anyone can design a rug the way weavers read one, see it as real
          wool, and hand a workshop a chart it can make.
        </p>
      }
    >
      <PageMeta
        title="About"
        description="Bunakar is a rug design studio from Mirzapur, in India's carpet belt: design any kind of rug, see it as real wool, and hand a weaver the chart to make it."
        canonicalPath="/about"
      />

      <div className="-mx-4 mb-14 grid grid-cols-2 gap-3 sm:mx-0 sm:grid-cols-4">
        {PHOTOS.map((p) => (
          <img key={p.src} src={p.src} alt={p.alt} loading="lazy" width={512} height={768} className="arch aspect-[2/3] w-full object-cover shadow-[var(--shadow-soft)]" />
        ))}
      </div>

      <Section title="Why I built it">
        <p>
          I grew up in Mirzapur, in the carpet belt of Uttar Pradesh, where the sound of looms is part of the street. Mirzapur and Bhadohi have knotted
          carpets for centuries, for homes all over the world, and their hand-knotted rugs carry India&apos;s Geographical Indication tag.
        </p>
        <p>
          What I kept noticing was how much a rug depends on one sheet of paper: the <em>naksha</em>, the chart a designer draws square by square so
          the weaver knows which colour every knot takes. Drawing one by hand takes days, and changing a single colour can mean starting again. And the
          people ordering rugs, from families to interior designers and small studios, struggled to say what they wanted: a photo from the internet, a
          sketch, &ldquo;like this, but in blue&rdquo;.
        </p>
        <p>
          The skill was never missing. The common language was. So I started building the tool I wished existed: a place to draw a rug the way
          weavers read it, see it in wool and in a room before a single knot is tied, and hand the workshop a chart it can follow. That became
          Bunakar.
        </p>
      </Section>

      <Section title="What Bunakar does">
        <ul>
          <li>Design any kind of rug in one Studio: hand-knotted on a knot chart, flatwoven, tufted or hooked freehand, braided, needlepoint or in tiles.</li>
          <li>Start from a blank chart, one of twenty classic styles, or a photo turned into a chart in real yarns.</li>
          <li>See it as real wool while you work, in 3D, and in ten rooms at its true size.</li>
          <li>Hand the weaver what they need: a paged knot chart with yarn counts, a full-scale tufting template or a tile map.</li>
        </ul>
        <p>Bunakar doesn&apos;t sell rugs. Your designs are yours, to make with any weaver you choose.</p>
      </Section>

      <Section title="The people">
        <p>Bunakar is made by one person, for now: founder, designer and lead developer, from Mirzapur.</p>
      </Section>
      <TeamLanyardRail
        items={TEAM}
        caption="Pull the badge down, or click it to flip it over."
        labels={{ flip: 'Click or press Enter to flip the badge', back: 'Click again or press Esc to turn it back', show: 'Show' }}
        className="-mx-4 mb-6 rounded-[var(--radius-card)] sm:mx-0"
        action={
          <a href={`mailto:${EMAIL}`} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-[0.95rem] font-medium text-ink transition-colors hover:border-ink">
            Write to me at {EMAIL}
          </a>
        }
      />

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/studio?new=1"
          className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-paper transition-colors hover:bg-accent-hover"
        >
          Start a rug <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link to="/faq" className="inline-flex min-h-12 items-center rounded-full border border-line-strong px-6 font-medium text-ink transition-colors hover:border-ink">
          Read the FAQ
        </Link>
      </div>
    </ContentPage>
  )
}

export default AboutPage
