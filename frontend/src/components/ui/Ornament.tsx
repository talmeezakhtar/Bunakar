/**
 * Small Arabic-style ornaments: the eight-point star (khatam, two overlapping squares) used in
 * Islamic geometric work and rug borders, and a divider that sets it between two fine rules.
 */
export function Khatam({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2.5 14.8 9.2 21.5 12 14.8 14.8 12 21.5 9.2 14.8 2.5 12 9.2 9.2Z" fill="currentColor" opacity="0.35" />
      <rect x="5.3" y="5.3" width="13.4" height="13.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5.3" y="5.3" width="13.4" height="13.4" fill="none" stroke="currentColor" strokeWidth="1.6" transform="rotate(45 12 12)" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    </svg>
  )
}

/** A section divider: rule, star, rule. */
export function StarRule({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-accent ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line-strong" />
      <Khatam className="h-4 w-4" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line-strong" />
    </div>
  )
}
