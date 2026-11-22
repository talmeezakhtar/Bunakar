import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'

/** The way into the Studio, for the 2D home page (the 3D tour shows the same in its chapter 1). */
function StartSection() {
  return (
    <section id="create-design" className="scroll-mt-16 border-t border-line bg-surface px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] font-medium leading-tight tracking-[-0.015em] text-ink">One studio for every rug</h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          Knotted, flatwoven, tufted, braided or tiles. Choose how it&apos;s made, its size and yarns when you start.
        </p>
        <Link
          to="/studio?new=1"
          className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-paper transition-[background-color,transform] duration-200 hover:bg-accent-hover active:scale-[0.98]"
        >
          Start a rug
          <ArrowRight size={18} weight="bold" className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}

export default StartSection
