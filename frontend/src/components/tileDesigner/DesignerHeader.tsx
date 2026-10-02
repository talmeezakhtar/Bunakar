import { useEffect, useRef, useState } from 'react'
import { CaretDown, FilePlus, FloppyDisk, PencilSimple, Trash } from '@phosphor-icons/react'

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
}

function DesignerHeader({ name, onRename, onSave, saveStatus, myDesigns, currentId, onLoad, onDelete, onNew }: DesignerHeaderProps) {
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
    // Escape closes the list and returns focus to its button, like a native dropdown.
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

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-night-700 bg-night-900 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
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
            className="rounded-md border border-night-600 bg-night-950 px-2 py-1 font-display text-lg tracking-wide text-sand-100 focus:border-gold-500 focus:outline-none"
          />
        ) : (
          <>
            <h1 className="font-display text-lg tracking-wide text-sand-100">{name}</h1>
            <button
              type="button"
              onClick={startEditing}
              aria-label="Rename design"
              className="inline-flex items-center justify-center rounded-full bg-transparent p-1 text-sand-400 pointer-coarse:min-h-11 pointer-coarse:min-w-11 transition-colors hover:text-gold-400"
            >
              <PencilSimple size={15} />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="my-designs-list"
            className="flex items-center gap-1.5 rounded-full border border-night-600 px-3 py-1.5 text-sm pointer-coarse:min-h-11 text-sand-200 transition-colors hover:border-sand-300"
          >
            My Designs <CaretDown size={13} />
          </button>
          {menuOpen && (
            <div id="my-designs-list" className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-night-600 bg-night-900 py-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              {myDesigns.length === 0 ? (
                <p className="px-3 py-2 text-xs text-sand-300/70">No saved designs yet.</p>
              ) : (
                myDesigns.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      onLoad(d.id)
                      setMenuOpen(false)
                    }}
                    className={`block w-full truncate px-3 py-2 text-left text-sm transition-colors hover:bg-night-800 ${
                      d.id === currentId ? 'font-semibold text-gold-400' : 'text-sand-200'
                    }`}
                  >
                    {d.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-1.5 rounded-full border border-night-600 px-3 py-1.5 text-sm pointer-coarse:min-h-11 text-sand-200 transition-colors hover:border-sand-300"
        >
          <FilePlus size={15} /> New Design
        </button>

        {currentId && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-full border border-night-600 px-3 py-1.5 text-sm pointer-coarse:min-h-11 text-sand-200 transition-colors hover:border-red-400/60 hover:text-red-400"
          >
            <Trash size={15} /> Delete
          </button>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className="flex items-center gap-1.5 rounded-full bg-gold-500 px-3.5 py-1.5 text-sm pointer-coarse:min-h-11 font-semibold tracking-wide text-night-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FloppyDisk size={15} /> {saveStatus === 'saving' ? 'Saving...' : 'Save'}
        </button>
      </div>
    </header>
  )
}

export default DesignerHeader
