import { useLocation, useSearchParams } from 'react-router-dom'
import TileDesignerLayout from '../components/tileDesigner/TileDesignerLayout'
import type { RugCategory } from '../types/tileDesign'

interface DesignerNavState {
  shape?: string
  rugCategory?: RugCategory
  widthFt?: number
  heightFt?: number
}

function DesignerPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const navState = (location.state as DesignerNavState | null) ?? {}
  const designId = searchParams.get('design') ?? undefined

  return (
    <TileDesignerLayout
      initialShape={navState.shape}
      initialRugCategory={navState.rugCategory}
      initialWidthFt={navState.widthFt}
      initialHeightFt={navState.heightFt}
      initialDesignId={designId}
    />
  )
}

export default DesignerPage
