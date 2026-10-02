import { useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import TileDesignerLayout from '../components/tileDesigner/TileDesignerLayout'
import type { RugCategory } from '../types/tileDesign'

interface DesignerNavState {
  shape?: string
  rugCategory?: RugCategory
  widthFt?: number
  heightFt?: number
  templateId?: string
  colorwayId?: string
}

function DesignerPage() {
  useDocumentTitle('Design your rug')
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const navState = (location.state as DesignerNavState | null) ?? {}
  const designId = searchParams.get('design') ?? undefined
  const { user } = useAuth()

  return (
    // Keyed by account: a different user gets a fresh, blank designer - never the last one's work.
    <TileDesignerLayout
      key={user?.id}
      initialShape={navState.shape}
      initialRugCategory={navState.rugCategory}
      initialWidthFt={navState.widthFt}
      initialHeightFt={navState.heightFt}
      initialDesignId={designId}
      initialTemplateId={navState.templateId}
      initialColorwayId={navState.colorwayId}
    />
  )
}

export default DesignerPage
