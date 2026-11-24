import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Minus } from '@phosphor-icons/react'
import PageMeta from '../components/common/PageMeta'
import { ROUTES } from '../seo/routeMeta'
import { ContentPage } from '../components/content/ContentPage'
import { Field } from '../components/content/Field'
import { useAuth } from '../hooks/useAuth'
import { FREE_LIMITS, usePlan } from '../hooks/usePlan'
import Honeypot, { honeypotValue } from '../components/common/Honeypot'
import { inboxApi } from '../services/api'

type Billing = 'monthly' | 'yearly'

/** Suggested launch prices (Canva Pro in India is about ₹499 a month or ₹4,000 a year); change them here. */
const PRICE = { monthly: 499, yearly: 3999 }
const SAVING = Math.round((1 - PRICE.yearly / (PRICE.monthly * 12)) * 100)
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

const FREE = ['Every kind of rug, in the full Studio', 'Twenty classic styles and photo to chart', 'Real-wool view, 3D and ten rooms', `${FREE_LIMITS.designs} saved designs`]
const PRO = ['Everything in Free', 'Unlimited saved designs', 'Full-size images, no mark', "Weaver's charts, tufting templates and tile maps"]

/** Free and Pro, feature by feature: true is included, a string says how much. */
const COMPARE: { group: string; rows: [string, boolean | string, boolean | string][] }[] = [
  {
    group: 'Design',
    rows: [
      ['Knotted, flatweave, tufted, hooked, braided, needlepoint and tile rugs', true, true],
      ['Twenty classic styles, motifs and layouts', true, true],
      ['Photo to chart', true, true],
      ['Saved designs', `${FREE_LIMITS.designs}`, 'Unlimited'],
    ],
  },
  {
    group: 'See it',
    rows: [
      ['Real-wool view, 3D and ten rooms', true, true],
      ['Share a read-only link', true, true],
      ['Image downloads', `Up to ${FREE_LIMITS.downloadPx}px, with a mark`, 'Full size, no mark'],
    ],
  },
  {
    group: 'Make it',
    rows: [
      ['Yarn counts and estimated weights', true, true],
      ["Weaver's chart, paged with numbered rows", false, true],
      ['Full-scale tufting template', false, true],
      ['Tile map and wool list', false, true],
    ],
  },
]

function Mark({ value }: { value: boolean | string }) {
  if (typeof value === 'string') return <span className="text-[0.9375rem] text-ink">{value}</span>
  return value ? <Check size={18} weight="bold" className="mx-auto text-success" aria-label="Included" /> : <Minus size={18} className="mx-auto text-line-hover" aria-label="Not included" />
}

/** Plans, and the Pro waitlist until online payments are connected. */
function PricingPage() {
  const { user } = useAuth()
  const { plan } = usePlan()
  const [billing, setBilling] = useState<Billing>('yearly')
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', use: 'home' as 'home' | 'business', note: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const website = honeypotValue(e)
    setStatus('sending')
    try {
      await inboxApi.requestUpgrade({ ...form, billing, note: form.note || undefined, ...(website && { website }) })
      setStatus('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  return (
    <ContentPage
      wide
      title="Free to design. Pro when it goes to a weaver."
      intro={<p>The whole Studio is free. Pro adds the files a workshop works from, full-size images and room for every design.</p>}
    >
      <PageMeta {...ROUTES['/pricing']} canonicalPath="/pricing" />

      <div role="radiogroup" aria-label="Billing" className="inline-flex items-center rounded-full border border-line-strong bg-surface p-1">
        {(['monthly', 'yearly'] as const).map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={billing === b}
            onClick={() => setBilling(b)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[0.95rem] font-medium transition-colors ${billing === b ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}
          >
            {b === 'monthly' ? 'Monthly' : 'Yearly'}
            {b === 'yearly' && <span className={`rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${billing === b ? 'bg-saffron text-ink' : 'bg-accent-soft text-accent'}`}>Save {SAVING}%</span>}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-7 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-ink">Free</h2>
          <p className="mt-1 text-[0.95rem] text-muted">For trying ideas and designing for your own home.</p>
          <p className="mt-6 font-display text-5xl font-medium text-ink">₹0</p>
          <p className="mt-1 text-[0.875rem] text-muted">Forever. No card.</p>
          <ul className="mt-6 flex-1 space-y-2.5">
            {FREE.map((f) => (
              <li key={f} className="flex gap-2.5 text-ink-2">
                <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            to={user ? '/studio?new=1' : '/login'}
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong px-6 font-semibold text-ink transition-colors hover:border-ink"
          >
            {user ? 'Start a rug' : 'Create a free account'}
          </Link>
        </section>

        <section className="relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-ink p-7 text-paper shadow-[var(--shadow-soft)] sm:p-8">
          <div aria-hidden="true" className="bg-girih pointer-events-none absolute inset-0 opacity-[0.08]" />
          <h2 className="relative font-display text-2xl font-semibold">Pro</h2>
          <p className="relative mt-1 text-[0.95rem] text-paper/70">For makers, studios, exporters and anyone sending designs to a workshop.</p>
          <p className="relative mt-6 font-display text-5xl font-medium tabular-nums">
            {inr(billing === 'monthly' ? PRICE.monthly : Math.round(PRICE.yearly / 12))}
            <span className="ml-1.5 font-sans text-base text-paper/70">/ month</span>
          </p>
          <p className="relative mt-1 text-[0.875rem] text-paper/70">{billing === 'monthly' ? 'Billed monthly. Cancel any time.' : `${inr(PRICE.yearly)} billed once a year.`}</p>
          <ul className="relative mt-6 flex-1 space-y-2.5">
            {PRO.map((f) => (
              <li key={f} className="flex gap-2.5 text-paper/90">
                <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-saffron" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
          {plan === 'pro' ? (
            <p className="relative mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-paper/10 px-6 font-semibold">You&apos;re on Pro</p>
          ) : (
            <a href="#join-pro" className="relative mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-semibold text-paper transition-colors hover:bg-accent-hover">
              Join Pro
            </a>
          )}
        </section>
      </div>

      <section aria-labelledby="compare" className="mt-16">
        <h2 id="compare" className="font-display text-3xl font-medium text-ink">
          Free and Pro, side by side
        </h2>
        <table className="mt-6 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line-strong text-[0.875rem] text-muted">
              <th scope="col" className="py-3 pr-4 font-medium">
                <span className="sr-only">Feature</span>
              </th>
              <th scope="col" className="w-28 py-3 text-center font-semibold text-ink sm:w-44">Free</th>
              <th scope="col" className="w-28 py-3 text-center font-semibold text-ink sm:w-44">Pro</th>
            </tr>
          </thead>
          {COMPARE.map((g) => (
            <tbody key={g.group}>
              <tr>
                <th scope="colgroup" colSpan={3} className="pb-2 pt-7 font-display text-lg font-semibold text-ink">
                  {g.group}
                </th>
              </tr>
              {g.rows.map(([label, free, pro]) => (
                <tr key={label} className="border-t border-line">
                  <th scope="row" className="py-3 pr-4 text-[0.9375rem] font-normal text-ink-2">
                    {label}
                  </th>
                  <td className="py-3 text-center"><Mark value={free} /></td>
                  <td className="py-3 text-center"><Mark value={pro} /></td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </section>

      {plan !== 'pro' && (
        <section id="join-pro" className="mt-16 scroll-mt-24 rounded-[var(--radius-card)] border border-line bg-surface p-7 sm:p-10">
          <h2 className="font-display text-3xl font-medium text-ink">Join Pro</h2>
          <p className="mt-3 max-w-xl text-ink-2">
            Online payment isn&apos;t open yet. Leave your details and we&apos;ll email you to set up Pro ({billing === 'monthly' ? `${inr(PRICE.monthly)} a month` : `${inr(PRICE.yearly)} a year`}). You won&apos;t be charged
            anything now.
          </p>
          {status === 'sent' ? (
            <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-ink">
              Thanks, you&apos;re on the list. We&apos;ll email {form.email} when Pro is ready for you.
            </p>
          ) : (
            <form onSubmit={submit} className="relative mt-6 grid max-w-2xl gap-5 sm:grid-cols-2">
              <Honeypot />
              <Field label="Name">{(p) => <input {...p} required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
              <Field label="Email">
                {(p) => <input {...p} type="email" required maxLength={200} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
              </Field>
              <Field label="You're designing for">
                {(p) => (
                  <select {...p} value={form.use} onChange={(e) => setForm({ ...form, use: e.target.value as 'home' | 'business' })}>
                    <option value="home">My own home</option>
                    <option value="business">A business (studio, maker, exporter)</option>
                  </select>
                )}
              </Field>
              <Field label="Anything we should know? (optional)">
                {(p) => <input {...p} maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />}
              </Field>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-paper transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  {status === 'sending' ? 'Sending…' : 'Join the Pro list'}
                </button>
                {status === 'error' && (
                  <p role="alert" className="mt-3 text-danger">
                    {error} Your details are still here; try again in a moment.
                  </p>
                )}
              </div>
            </form>
          )}
        </section>
      )}

      <p className="mt-10 text-[0.95rem] text-muted">
        Questions about plans? See the <Link to="/faq#plans" className="text-accent underline underline-offset-4">FAQ</Link> or{' '}
        <Link to="/contact" className="text-accent underline underline-offset-4">contact us</Link>.
      </p>
    </ContentPage>
  )
}

export default PricingPage
