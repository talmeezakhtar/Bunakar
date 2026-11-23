import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react'

type ToastTone = 'success' | 'error' | 'info'

type ToastAction = { label: string; onClick: () => void }

type ToastOptions = {
  tone?: ToastTone
  message: string
  /** Extra text shown in a selectable, read-only field - e.g. a link the user can copy by hand
   * when the Clipboard API is unavailable. */
  detail?: string
  action?: ToastAction
  durationMs?: number
}

type ToastEntry = ToastOptions & { id: number; tone: ToastTone }

type ToastContextValue = {
  showToast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_ICON = {
  success: CheckCircle,
  error: WarningCircle,
  info: Info,
} as const

const TONE_ACCENT: Record<ToastTone, string> = {
  success: 'border-success/40 text-success',
  error: 'border-danger/40 text-danger',
  info: 'border-line-strong text-muted',
}

const DEFAULT_DURATION = 6000

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ tone = 'info', message, detail, action, durationMs = DEFAULT_DURATION }: ToastOptions) => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, tone, message, detail, action, durationMs }])
      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs)
      }
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone]
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              aria-live={t.tone === 'error' ? 'assertive' : 'polite'}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border bg-surface/95 px-4 py-3 shadow-[0_24px_60px_-20px_rgba(31,27,22,0.35)] backdrop-blur ${TONE_ACCENT[t.tone]}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" weight="fill" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.message}</p>
                {t.detail && (
                  <input
                    readOnly
                    value={t.detail}
                    aria-label="Link to copy"
                    onFocus={(e) => e.currentTarget.select()}
                    className="mt-1.5 w-full rounded-md border border-line-strong bg-paper px-2 py-1 text-xs text-muted focus:border-accent"
                  />
                )}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action!.onClick()
                      dismiss(t.id)
                    }}
                    className="mt-1.5 text-xs font-semibold text-accent-hover underline decoration-accent/40 underline-offset-2 hover:text-accent-deep"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-full p-0.5 text-muted-2 transition-colors hover:text-ink"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

export { ToastProvider, useToast }
