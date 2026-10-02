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
      <div onClick={saving ? undefined : onCancel} className="absolute inset-0 bg-night-950/80 backdrop-blur-sm" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        aria-describedby="unsaved-desc"
        className="relative w-full max-w-md rounded-2xl border border-night-600 bg-night-900 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="space-y-2 px-5 py-5">
          <h2 id="unsaved-title" className="font-display text-lg tracking-wide text-sand-100">
            Save changes to &ldquo;{designName}&rdquo;?
          </h2>
          <p id="unsaved-desc" className="text-sm text-sand-300">
            Only saved designs appear in My Designs. If you don&apos;t save, these changes are lost.
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-400">
              Couldn&apos;t save. Check your connection and try again.
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-night-700 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border border-night-600 bg-transparent px-4 py-2 text-sm font-medium text-sand-200 transition-colors hover:border-sand-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="rounded-full border border-night-600 bg-transparent px-4 py-2 text-sm font-medium text-sand-200 transition-colors hover:border-red-400 hover:text-red-300 disabled:opacity-50"
          >
            Don&apos;t save
          </button>
          <button
            type="button"
            autoFocus
            onClick={onSave}
            disabled={saving}
            className="rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-night-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
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
