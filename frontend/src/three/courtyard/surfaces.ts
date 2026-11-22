import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { RepeatWrapping, SRGBColorSpace } from 'three'

/**
 * Photo surfaces in `public/textures/` (stone, paving, rocks, jute, brass, warp, pile, bolster,
 * yarn, block-print cotton, cream drape, velvet, walnut), tiled `repeat` times across a mesh's UVs. Each use gets its own copy: the loaded texture
 * is cached and shared, so its repeat must not be changed in place.
 */
export type Surface = 'stone' | 'paving' | 'rocks' | 'jute' | 'brass' | 'warp' | 'pile' | 'bolster' | 'yarn' | 'blockprint' | 'drape' | 'velvet' | 'wood'

/** `sideways` turns the photo a quarter, e.g. so wood grain runs along a horizontal beam. */
export function useSurface(name: Surface, repeat: [number, number] = [1, 1], color = true, sideways = false) {
  const source = useTexture(`/textures/${name}.jpg`)
  const [u, v] = repeat
  const map = useMemo(() => {
    const t = source.clone()
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(u, v)
    if (sideways) {
      t.center.set(0.5, 0.5)
      t.rotation = Math.PI / 2
    }
    t.anisotropy = 8
    if (color) t.colorSpace = SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [source, u, v, color, sideways])
  useEffect(() => () => map.dispose(), [map])
  return map
}
