import { useState } from 'react'
import { useDesign } from '../../store/DesignContext'
import { designsApi } from '../../services/api'

function SaveExportBar() {
  const { design } = useDesign()
  const [status, setStatus] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  async function handleSave() {
    setStatus('Saving...')
    try {
      const saved = await designsApi.create(design)
      setSavedId(saved.id ?? null)
      setStatus('Saved')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleSave}
        className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900"
      >
        Save design
      </button>

      {savedId && (
        <>
          <a
            href={designsApi.pdfUrl(savedId)}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-400"
          >
            Download spec sheet (PDF)
          </a>
          <span className="text-xs text-stone-500">
            Shareable link: {window.location.origin}/designs/{savedId}
          </span>
        </>
      )}

      {status && <span className="text-xs text-stone-500">{status}</span>}
    </div>
  )
}

export default SaveExportBar
