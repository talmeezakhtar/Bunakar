import { detectTier } from './tier'

/** Whether this device gets 3D at all (see `detectTier`). */
export function canShow3D(): boolean {
  return detectTier() !== 'none'
}
