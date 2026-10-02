import { GithubLogo } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { HeritageSwatch } from './RugSwatches'

const REPO_URL = 'https://github.com/talmeezakhtar/Bunakar'

function AboutSection() {
  const reduce = useReducedMotion()

  return (
    <section id="about-us" className="scroll-mt-16 bg-night-900 px-4 py-24 sm:py-28">
      <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
        <motion.div
          initial={reduce ? false : { opacity: 0, x: -32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-display text-3xl tracking-wide text-sand-100 sm:text-4xl">
            About <span className="font-logo text-[1.15em]">Buنakar</span>
          </h2>
          <p className="mt-5 leading-relaxed text-sand-300/80">
            <span className="font-logo text-lg">Buنakar</span> takes its name from the Hindi
            word for weaver. We built it to bring Mirzapur and Bhadohi&apos;s hand-knotted
            carpet tradition, a craft carrying its own Geographical Indication tag, into an
            interactive design tool.
          </p>
          <p className="mt-4 leading-relaxed text-sand-300/80">
            Choose a pattern, colors and size, and watch a real weaving tradition take the
            shape you imagine, then see your rug in a real room before it&apos;s woven.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-night-600 px-4 py-2.5 text-sm font-medium text-sand-100 transition-colors hover:border-gold-500/60 hover:text-gold-400"
            >
              <GithubLogo size={18} weight="regular" />
              View the source on GitHub
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-2xl border border-night-600 shadow-[0_30px_60px_rgba(0,0,0,0.35)]"
        >
          <HeritageSwatch className="w-full" />
        </motion.div>
      </div>
    </section>
  )
}

export default AboutSection
