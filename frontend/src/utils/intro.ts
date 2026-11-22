/**
 * Seconds until the first-visit intro (index.html) fades, so the page's own entrance plays
 * as the panel fades instead of behind it. 0 once the intro is over or when it didn't play.
 */
export function introDelay(): number {
  if (typeof document === 'undefined' || document.documentElement.dataset.intro !== 'playing') return 0
  return Math.max(0, 3.55 - performance.now() / 1000)
}
