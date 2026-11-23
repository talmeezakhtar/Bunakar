import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalFocus } from '../../hooks/useModalFocus'

type ConfirmOptions = {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` paints the confirm button in the accent red - for deletes. */
  tone?: 'danger' | 'default'
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null)

/** `await confirm({...})` resolves true only when the visitor presses the confirm button. */
export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return confirm
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  function close(ok: boolean) {
    pending?.resolve(ok)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <ConfirmDialog {...pending} onClose={close} />}
    </ConfirmContext.Provider>
  )
}

function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onClose,
}: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, () => onClose(false))

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
      <div onClick={() => onClose(false)} className="absolute inset-0 bg-ink/45 backdrop-blur-sm" />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={body ? 'confirm-body' : undefined}
        className="relative w-full max-w-md rounded-t-2xl bg-paper p-6 shadow-[0_24px_60px_-20px_rgba(31,27,22,0.35)] sm:rounded-2xl"
      >
        <h2 id="confirm-title" className="font-display text-xl font-medium text-ink">
          {title}
        </h2>
        {body && (
          <p id="confirm-body" className="mt-2 leading-relaxed text-muted">
            {body}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* Cancel takes focus first, so Enter never deletes by accident. */}
          <button
            type="button"
            data-autofocus
            onClick={() => onClose(false)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line-strong px-5 font-medium text-ink transition-colors hover:border-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 font-semibold transition-colors ${
              tone === 'danger' ? 'bg-accent text-paper hover:bg-accent-hover' : 'bg-ink text-paper hover:bg-ink-2'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
