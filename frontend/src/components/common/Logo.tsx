type LogoProps = {
  className?: string
  /** Light lettering, for dark grounds (the night sky); 'narrow' only below the lg breakpoint. */
  light?: boolean | 'narrow'
}

/**
 * The Bunakar logo: the unravelling-rug mark and the wordmark "Buنakar" - the old site's
 * spelling, with the Arabic letter noon (ن) for the first n - set in Rubaith. One accessible
 * name, so screen readers read "Bunakar" once.
 */
function Logo({ className = '', light = false }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="img" aria-label="Bunakar">
      <img src="/logo-mark-96.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0" />
      <span
        aria-hidden="true"
        className={`font-logo text-[1.6rem] leading-none tracking-wide transition-colors duration-700 ${light === 'narrow' ? 'text-paper lg:text-ink' : light ? 'text-paper' : 'text-ink'}`}
      >
        Buنakar
      </span>
    </span>
  )
}

export default Logo
