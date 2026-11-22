import heritageRugImg from '../../assets/heritage-rug.webp'

/** The story behind the name. Anchored as #about-us so the old /about route still lands here. */
function CraftSection() {
  return (
    <section id="about-us" className="scroll-mt-16 border-t border-line bg-surface px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="overflow-hidden rounded-[var(--radius-card)] ring-1 ring-line">
          <img
            src={heritageRugImg}
            alt="A hand-knotted rug with a crimson and gold medallion"
            width={1200}
            height={823}
            loading="lazy"
            decoding="async"
            className="w-full transition-transform duration-700 ease-[var(--ease-gallery)] hover:scale-[1.02]"
          />
        </div>

        <div className="max-w-xl">
          <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] font-medium leading-tight tracking-[-0.015em] text-ink">
            A weaving town&apos;s craft, in your hands
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            <span lang="hi">Bunakar</span> is the Hindi word for weaver. Mirzapur and Bhadohi have knotted carpets for
            centuries, and their hand-knotted rugs carry India&apos;s Geographical Indication tag: a mark that the craft
            belongs to the place.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            We built Bunakar so that anyone can bring a design to that tradition: choose how it&apos;s made, the pattern, the
            yarns and the size, see it where it will lie, and send it to the loom.
          </p>
          <p className="mt-8 border-t border-line pt-6 leading-relaxed text-ink-2">
            Design it knotted, flatwoven, tufted, hooked, braided, in needlepoint or in tiles, as fine as 225 knots to the
            square inch.
          </p>
        </div>
      </div>
    </section>
  )
}

export default CraftSection
