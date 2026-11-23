import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PageMeta from '../components/common/PageMeta'
import { ContentPage } from '../components/content/ContentPage'
import { Field } from '../components/content/Field'
import { useAuth } from '../hooks/useAuth'
import { inboxApi } from '../services/api'

type Topic = 'general' | 'support' | 'business' | 'press'

const TOPICS: { id: Topic; label: string }[] = [
  { id: 'general', label: 'A general question' },
  { id: 'support', label: 'Help with the designer or my account' },
  { id: 'business', label: 'Bunakar for my business' },
  { id: 'press', label: 'Press' },
]

function ContactPage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', topic: 'general' as Topic, message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      await inboxApi.contact(form)
      setStatus('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  return (
    <ContentPage
      title="Write to us."
      intro={
        <p>
          Questions about designing, your account, Pro, or using Bunakar in your business. Many answers are already in the{' '}
          <Link to="/faq" className="text-accent underline underline-offset-4">FAQ</Link>.
        </p>
      }
    >
      <PageMeta title="Contact" description="Contact Bunakar about designing rugs, your account, the Pro plan, or using Bunakar in your business." canonicalPath="/contact" />

      <div className="grid gap-12 md:grid-cols-[1fr_16rem]">
        {status === 'sent' ? (
          <p role="status" className="self-start rounded-xl bg-success/10 px-4 py-3 text-ink">
            Thanks, {form.name.split(' ')[0] || 'there'}. Your message is with us, and we&apos;ll reply to {form.email}.
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name">{(p) => <input {...p} required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
              <Field label="Email">
                {(p) => <input {...p} type="email" required maxLength={200} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
              </Field>
            </div>
            <Field label="What's it about?">
              {(p) => (
                <select {...p} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value as Topic })}>
                  {TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Message" hint="If it's about a design, paste its share link.">
              {(p) => <textarea {...p} rows={6} required maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />}
            </Field>
            <div>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-paper transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
              {status === 'error' && (
                <p role="alert" className="mt-3 text-danger">
                  {error} Your message is still here; try again in a moment, or email us.
                </p>
              )}
            </div>
          </form>
        )}

        <aside className="space-y-5 text-[0.95rem] text-ink-2">
          <div>
            <h2 className="font-display text-lg font-medium text-ink">Email</h2>
            <p className="mt-1">
              <a href="mailto:talmeezmzp@gmail.com" className="text-accent underline underline-offset-4">talmeezmzp@gmail.com</a>
            </p>
          </div>
          <div>
            <h2 className="font-display text-lg font-medium text-ink">Where we are</h2>
            <p className="mt-1">
              Mirzapur, Uttar Pradesh, India
            </p>
          </div>
        </aside>
      </div>
    </ContentPage>
  )
}

export default ContactPage
