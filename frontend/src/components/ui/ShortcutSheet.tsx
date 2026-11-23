import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'
import { useModalFocus } from '../../hooks/useModalFocus'

export type ShortcutGroup = { title: string; items: { keys: string[]; label: string }[] }

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
/** "Mod" reads as ⌘ on a Mac and Ctrl everywhere else. */
const show = (key: string) => (key === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : key)

export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-7 items-center justify-center rounded-md border border-line-strong bg-paper px-1.5 py-0.5 font-sans text-[0.8125rem] font-medium text-ink shadow-[0_1px_0_var(--color-line-strong)]">
      {show(children)}
    </kbd>
  )
}

/** Every keyboard shortcut of a designer, grouped, in one dialog. Opened with "?". */
function ShortcutSheet({ groups, onClose }: { groups: ShortcutGroup[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, onClose)

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
      <div onClick={onClose} className="absolute inset-0 bg-ink/45 backdrop-blur-sm" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="relative max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-paper p-6 shadow-[0_24px_60px_-20px_rgba(31,27,22,0.35)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="shortcuts-title" className="font-display text-2xl font-medium text-ink">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {groups.map((g) => (
            <section key={g.title}>
              <h3 className="text-sm font-semibold text-ink">{g.title}</h3>
              <dl className="mt-2 divide-y divide-line">
                {g.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-[0.95rem] text-ink-2">{item.label}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {item.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ShortcutSheet
