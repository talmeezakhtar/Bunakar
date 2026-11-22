import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type UnsavedChangesDialogProps = {
  designName: string
  saving: boolean
  error: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

function UnsavedChangesDialog({ designName, saving, error, onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, saving])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div onClick={saving ? undefined : onCancel} className="absolute inset-0 bg-ink/45 backdrop-blur-sm" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        aria-describedby="unsaved-desc"
        className="relative w-full max-w-md rounded-2xl bg-paper shadow-[0_24px_60px_-20px_rgba(31,27,22,0.35)]"
      >
        <div className="space-y-2 px-5 py-5">
          <h2 id="unsaved-title" className="font-display text-xl font-medium text-ink">
            Save changes to &ldquo;{designName}&rdquo;?
          </h2>
          <p id="unsaved-desc" className="text-sm text-muted">
            Only saved designs appear in My Designs. If you don&apos;t save, these changes are lost.
          </p>
          {error && (
            <p role="alert" className="text-sm text-danger">
              Couldn&apos;t save. Check your connection and try again.
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-transparent px-4 text-[0.95rem] font-medium text-ink transition-colors hover:border-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-transparent px-4 text-[0.95rem] font-medium text-ink transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
          >
            Don&apos;t save
          </button>
          <button
            type="button"
            autoFocus
            onClick={onSave}
            disabled={saving}
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-[0.95rem] font-semibold text-paper transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

export default UnsavedChangesDialog
