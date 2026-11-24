import type { FormEvent } from 'react'

/** A field people never see or fill; form-filling bots usually do. The server quietly drops
 * submissions that fill it. */
export default function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  )
}

/** The honeypot's value from a submitted form ('' for people). */
export function honeypotValue(e: FormEvent<HTMLFormElement>): string {
  return String(new FormData(e.currentTarget).get('website') ?? '')
}
