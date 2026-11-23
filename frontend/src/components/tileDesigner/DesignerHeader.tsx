import { useEffect, useRef, useState } from 'react'
import { CaretDown, Check, FilePlus, FloppyDisk, Keyboard, PencilSimple, Trash } from '@phosphor-icons/react'

export type DesignSummary = { id: string; name: string }

type DesignerHeaderProps = {
  name: string
  onRename: (name: string) => void
  onSave: () => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  myDesigns: DesignSummary[]
  currentId: string | null
  onLoad: (id: string) => void
  onDelete: () => void
  onNew: () => void
  /** Guests design freely; Save asks them to sign in first. */
  signedIn: boolean
  dirty: boolean
  onShowShortcuts?: () => void
}

const quiet =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-[0.9rem] text-ink transition-colors hover:border-ink'

function SaveState({ signedIn, dirty, saveStatus }: Pick<DesignerHeaderProps, 'signedIn' | 'dirty' | 'saveStatus'>) {
  const label =
    saveStatus === 'saving'
      ? 'Saving…'
      : !signedIn
        ? 'Kept on this device'
        : dirty
          ? 'Unsaved changes'
          : 'All changes saved'
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted" aria-live="polite">
      {signedIn && !dirty && saveStatus !== 'saving' ? (
        <Check size={14} weight="bold" className="text-success" />
      ) : (
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${signedIn && dirty ? 'bg-saffron' : 'bg-line-hover'}`} />
      )}
      {label}
    </span>
  )
}

function DesignerHeader({
  name,
  onRename,
  onSave,
  saveStatus,
  myDesigns,
  currentId,
  onLoad,
  onDelete,
  onNew,
  signedIn,
  dirty,
  onShowShortcuts,
}: DesignerHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  function startEditing() {
    setDraft(name)
    setEditing(true)
  }

  useEffect(() => {
    if (!menuOpen) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    // Escape closes the menu and returns focus to its button, like a native dropdown.
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      menuRef.current?.querySelector<HTMLElement>('button')?.focus()
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function commitName() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) onRename(trimmed)
    else setDraft(name)
  }

  const menuItem = 'flex min-h-11 w-full items-center gap-2 px-3 text-left text-[0.9rem] transition-colors hover:bg-surface-2'

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-paper px-4 py-2 sm:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
        <div className="flex min-w-0 items-center gap-1">
          {editing ? (
            <input
              autoFocus
              aria-label="Design name"
              maxLength={120}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName()
                if (e.key === 'Escape') {
                  setDraft(name)
                  setEditing(false)
                }
              }}
              className="min-h-11 rounded-md border border-line-strong bg-paper px-2 font-display text-xl text-ink focus:border-accent"
            />
          ) : (
            <>
              <h1 className="truncate font-display text-xl font-medium text-ink">{name}</h1>
              <button
                type="button"
                onClick={startEditing}
                aria-label="Rename design"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <PencilSimple size={16} />
              </button>
            </>
          )}
        </div>
        <SaveState signedIn={signedIn} dirty={dirty} saveStatus={saveStatus} />
      </div>

      <div className="flex items-center gap-2">
        {onShowShortcuts && (
          <button type="button" onClick={onShowShortcuts} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" className={`${quiet} hidden px-3 lg:inline-flex`}>
            <Keyboard size={18} />
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="design-menu"
            className={quiet}
          >
            Designs <CaretDown size={13} />
          </button>
          {menuOpen && (
            <div
              id="design-menu"
              role="menu"
              className="absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-xl border border-line bg-paper py-1 shadow-[0_24px_60px_-20px_rgba(31,27,22,0.35)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onNew()
                }}
                className={`${menuItem} text-ink`}
              >
                <FilePlus size={16} /> New design
              </button>
              {currentId && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete()
                  }}
                  className={`${menuItem} text-danger`}
                >
                  <Trash size={16} /> Delete this design
                </button>
              )}
              <div className="my-1 border-t border-line" />
              <p className="px-3 pb-1 pt-2 text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-muted-2">Saved designs</p>
              {!signedIn ? (
                <p className="px-3 pb-3 text-sm text-muted">Sign in to save designs and open them here.</p>
              ) : myDesigns.length === 0 ? (
                <p className="px-3 pb-3 text-sm text-muted">Nothing saved yet.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {myDesigns.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onLoad(d.id)
                        setMenuOpen(false)
                      }}
                      className={`${menuItem} truncate ${d.id === currentId ? 'font-semibold text-accent' : 'text-ink-2'}`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-[0.9rem] font-semibold text-paper transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FloppyDisk size={16} /> {saveStatus === 'saving' ? 'Saving…' : signedIn ? 'Save' : 'Sign in to save'}
        </button>
      </div>
    </header>
  )
}

export default DesignerHeader
