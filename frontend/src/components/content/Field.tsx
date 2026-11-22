import { useId } from 'react'
import type { ReactNode } from 'react'

type ControlProps = { id: string; 'aria-describedby'?: string; className: string }

/**
 * A labelled form control with an optional hint. The control itself comes from `children`, which
 * gets the id, hint link and shared styling: `<Field label="Email">{(p) => <input {...p} />}</Field>`.
 */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: (props: ControlProps) => ReactNode }) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id} className="text-[0.95rem] font-medium text-ink">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': hintId,
        className:
          'mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-muted-2 transition-colors hover:border-line-hover focus:border-ink focus:outline-none',
      })}
      {hint && (
        <p id={hintId} className="mt-1.5 text-[0.875rem] text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
