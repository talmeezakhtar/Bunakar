import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import type { Object3D } from 'three'

/**
 * Third-party models in the courtyard (all CC BY 4.0; credited in the site footer and in
 * `assets-src/LICENSES.md`). Each file is meshopt-compressed with WebP textures; `Piece` pulls one
 * or more named meshes out of a file, sits them on the ground at the origin and scales them to a
 * height in metres, so the source files' own units and layouts don't matter.
 */
export const MODELS = {
  palm: '/models/palm.glb',
  lamps: '/models/hanging-lamps.glb',
  lounge: '/models/lounge-props.glb',
  oilLamp: '/models/oil-lamp.glb',
} as const

/** three.js strips some characters from node names; compare names without them. */
const plain = (s: string) => s.replace(/\W/g, '').toLowerCase()

type PieceProps = {
  url: string
  /** Name prefixes of the meshes to take (each matched against the file's mesh names). */
  names: string[]
  /** Height of the whole piece in metres. */
  height: number
  /** 'bottom' stands it on the origin; 'top' hangs it from the origin (lamps). */
  anchor?: 'bottom' | 'top'
  position?: [number, number, number]
  rotationY?: number
}

export function Piece({ url, names, height, anchor = 'bottom', position, rotationY = 0 }: PieceProps) {
  const { scene } = useGLTF(url, false, true)
  const built = useMemo(() => {
    const wanted = names.map(plain)
    const parts: Object3D[] = []
    scene.updateMatrixWorld(true)
    scene.traverse((o) => {
      if (!(o as { isMesh?: boolean }).isMesh) return
      if (!wanted.some((w) => plain(o.name).startsWith(w))) return
      // A copy with its world placement baked in, sharing geometry and materials with the file.
      const c = o.clone(false)
      o.matrixWorld.decompose(c.position, c.quaternion, c.scale)
      c.castShadow = true
      c.receiveShadow = true
      parts.push(c)
    })
    const box = new Box3()
    for (const p of parts) {
      p.updateMatrixWorld(true)
      box.expandByObject(p)
    }
    const size = box.getSize(new Vector3())
    const centre = box.getCenter(new Vector3())
    const scale = size.y > 0 ? height / size.y : 1
    const offset: [number, number, number] = [-centre.x, anchor === 'top' ? -box.max.y : -box.min.y, -centre.z]
    return { parts, scale, offset }
  }, [scene, names, height, anchor])
  return (
    <group position={position} rotation-y={rotationY}>
      <group scale={built.scale}>
        <group position={built.offset}>
          {built.parts.map((p) => (
            <primitive key={p.uuid} object={p} />
          ))}
        </group>
      </group>
    </group>
  )
}

/** Starts fetching every courtyard model as soon as the scene's code loads. */
export function preloadModels() {
  for (const url of Object.values(MODELS)) useGLTF.preload(url, false, true)
}
