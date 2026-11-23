import { Navigate, useSearchParams } from 'react-router-dom'
import type { LegacyKind } from '../studio/legacy'

/**
 * `/designer` and `/freeform`, the earlier designers' addresses, now open the Studio. Bookmarks,
 * shared links and the room preview's "Back to editing" keep working: a design id and any
 * unsaved draft carry over and open converted.
 */
export default function LegacyDesignerRedirect({ kind }: { kind: LegacyKind }) {
  const [params] = useSearchParams()
  const design = params.get('design')
  return <Navigate to={`/studio?from=${kind}${design ? `&design=${encodeURIComponent(design)}` : ''}`} replace />
}
