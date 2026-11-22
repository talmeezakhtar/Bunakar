import { useSurface } from './surfaces'

/** Wound-wool strand detail from a photo (grey, so each skein keeps its own dye colour). */
export function useYarnMap(repeat: [number, number] = [2, 1]) {
  return useSurface('yarn', repeat, false)
}
