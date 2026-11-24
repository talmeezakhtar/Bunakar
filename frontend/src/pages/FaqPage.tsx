import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import PageMeta from '../components/common/PageMeta'
import { ROUTES } from '../seo/routeMeta'
import { ContentPage } from '../components/content/ContentPage'
import { FAQ } from '../data/faq'
import './faqDrawer.css'

/** Structured data, so search results can show the answers. */
const FAQ_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.flatMap((g) => g.items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } }))),
})

/** Tabs stand at three stations along the top edge, staggered as a filing clerk would. */
const STATIONS = [0.04, 0.37, 0.7]

/** The FAQ as a card cabinet: a drawer per topic, a card per question. Pull a card to read it. */
function FaqPage() {
  return (
    <ContentPage
      wide
      title="Questions, answered."
      intro={
        <p>
          Plans, designing in the Studio, getting a rug made, and your account. Pull a card to read it. Something missing?{' '}
          <Link to="/contact" className="text-accent underline underline-offset-4">
            Ask us
          </Link>
          .
        </p>
      }
    >
      <PageMeta {...ROUTES['/faq']} canonicalPath="/faq" />
      <script type="application/ld+json">{FAQ_LD}</script>

      <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
        <nav aria-label="FAQ sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {FAQ.map((g) => (
              <li key={g.id}>
                <a
                  href={`#${g.id}`}
                  className="inline-flex min-h-11 items-center gap-3 rounded-full border border-line-strong px-4 text-[0.95rem] text-ink-2 transition-colors hover:border-ink hover:text-ink lg:w-full lg:justify-between lg:rounded-lg lg:border-transparent lg:px-3 lg:hover:border-line-strong"
                >
                  {g.title}
                  <span className="text-[0.8125rem] tabular-nums text-muted">{g.items.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-14">
          {FAQ.map((g) => (
            <section key={g.id} id={g.id} aria-labelledby={`${g.id}-title`} className="scroll-mt-24">
              <h2 id={`${g.id}-title`} className="mb-5 font-display text-2xl font-semibold text-ink">
                {g.title}
              </h2>
              <div className="fq-drawer">
                <div className="fq-tray">
                  {g.items.map((item, i) => (
                    <details
                      key={item.q}
                      name={g.id}
                      open={i === 0 && g === FAQ[0] ? true : undefined}
                      className="fq-card"
                      style={{ '--depth': g.items.length > 1 ? (g.items.length - 1 - i) / (g.items.length - 1) : 0, '--tab-at': STATIONS[i % 3] } as CSSProperties}
                    >
                      <summary className="fq-edge">
                        <span className="fq-tab" aria-hidden="true">
                          {item.tab}
                        </span>
                        <span className="fq-no" aria-hidden="true">
                          No. {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{item.q}</span>
                        <span className="fq-mark" aria-hidden="true" />
                      </summary>
                      <div className="fq-face">
                        <p>{item.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
                <div className="fq-front" aria-hidden="true">
                  <span className="fq-holder">
                    <span>{g.title}</span>
                  </span>
                  <span className="fq-pull" />
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </ContentPage>
  )
}

export default FaqPage
