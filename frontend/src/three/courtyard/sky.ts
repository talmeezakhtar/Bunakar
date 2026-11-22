/**
 * Time of day in the courtyard, shared by everything that lights up: `night` runs 0 (full day)
 * to 1 (full night). `DayNight` advances it every frame; lamps and bulbs read it in their own
 * frame loops, so nothing re-renders as the light changes.
 */
export const sky = { night: 0 }

/** One day in seconds: a long day, a dusk, a long night and a dawn. */
export const DAY_CYCLE = { day: 60, dusk: 12, night: 45, dawn: 12 }

/** Night amount (0..1) at `t` seconds into the cycle, eased through dusk and dawn. */
export function nightAt(t: number): number {
  const { day, dusk, night, dawn } = DAY_CYCLE
  const total = day + dusk + night + dawn
  const x = ((t % total) + total) % total
  const ease = (k: number) => k * k * (3 - 2 * k)
  if (x < day) return 0
  if (x < day + dusk) return ease((x - day) / dusk)
  if (x < day + dusk + night) return 1
  return 1 - ease((x - day - dusk - night) / dawn)
}
