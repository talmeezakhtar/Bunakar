import type { Swatch } from '../../types/swatch'
import type { FreeformDesignState, SurfaceFinish } from '../../types/freeform'
import { renderFreeform } from './renderFreeform'

/** A small square of one finish - the texture/pile swatches in the finish controls. */
function FinishSample({ finish, swatch, id, size = 28 }: { finish: SurfaceFinish; swatch: Swatch | undefined; id: string; size?: number }) {
  const state: FreeformDesignState = {
    id: null, name: '', widthFt: 1, heightFt: 1, rugCategory: 'area', backgroundId: 'none',
    ground: finish, shapes: [], myStyles: [],
  }
  return (
    <svg viewBox="0 0 1 1" width={size} height={size} aria-hidden="true" className="rounded-sm">
      {renderFreeform(state, new Map(swatch ? [[swatch.id, swatch]] : []), id)}
    </svg>
  )
}

export default FinishSample
