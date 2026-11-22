import type { ReactNode } from 'react'
import Footer from '../common/Footer'
import { Khatam, StarRule } from '../ui/Ornament'

/** The shell for text pages (about, pricing, FAQ, contact, policies): one column, warm paper. */
export function ContentPage({ title, intro, children, wide = false }: { title: ReactNode; intro?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <>
      <div className="relative bg-paper px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
        {/* A faint star lattice behind the header, fading out down the page. */}
        <div aria-hidden="true" className="bg-girih pointer-events-none absolute inset-x-0 top-0 h-[28rem] opacity-[0.07] [mask-image:linear-gradient(#000,transparent)]" />
        {/* Wide pages line up with the nav's content edges (its 72rem less its own 1.5rem padding each side). */}
        <div className={`relative mx-auto ${wide ? 'max-w-[69rem]' : 'max-w-3xl'}`}>
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.6rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-ink">{title}</h1>
          {intro && <div className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">{intro}</div>}
          <StarRule className="mt-10 max-w-md" />
          <div className="mt-10">{children}</div>
        </div>
      </div>
      <Footer />
    </>
  )
}

/** A section of a text page, with an anchor. */
export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-10 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-ink">
        <Khatam className="h-4 w-4 shrink-0 text-accent" />
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[1.0625rem] leading-relaxed text-ink-2 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  )
}

/**
 * A fact only the owner knows, left visibly blank: "[fill in: founding year]". Nothing about the
 * company is invented; search the code for `<Blank` to find every one before launch.
 */
export function Blank({ children }: { children: string }) {
  return <mark className="rounded bg-saffron/25 px-1 py-px font-medium text-ink">[fill in: {children}]</mark>
}

/** Visible notice on drafted legal pages. */
export function LegalDraftNotice() {
  return (
    <p className="mb-10 rounded-xl border border-saffron/50 bg-saffron/10 px-4 py-3 text-[0.95rem] text-ink-2">
      Draft for review. Have a lawyer check this page before launch.
    </p>
  )
}
