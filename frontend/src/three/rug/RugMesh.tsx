import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import { BackSide, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2 } from 'three'
import type { RugShape } from '../../studio/model'
import { shapePathFt } from '../../studio/compose'
import type { Texture } from 'three'
import { createCloth, floorPlane, pinRows } from '../physics/cloth'
import type { Cloth } from '../physics/cloth'
import type { RugTextures, RugTier } from './rugTextures'
import { rollState, unrollPoint } from './unroll'

export type RugPose = 'flat' | 'rolled' | 'hanging'

export const FT = 0.3048
/** A tufted tile rug is about half an inch thick. */
const THICKNESS = 0.5 * 0.0254
/** Innermost turn of a rolled rug. */
const ROLL_CORE = 0.035
const SHEEN_COLOR = '#3d3731'
const STEP = 1 / 60
const MAX_CATCHUP = 10
const CLOTH_COLS = 24
const CLOTH_ROWS = 36

type GroupProps = ThreeElements['group']

export interface RugMeshProps extends Omit<GroupProps, 'children'> {
  map: Texture | null
  normalMap?: Texture | null
  widthFt: number
  heightFt: number
  pose?: RugPose
  /** Rolled pose: 0 = rolled up (top edge in the core, roll resting where the bottom edge lies), 1 = flat. */
  progress?: number
  tier?: RugTier
  /** Hanging pose: height of the top edge and the wall plane (z) it hangs in front of, in metres. */
  hangHeight?: number
  wallZ?: number
  bindingColor?: string
  backingColor?: string
  normalScale?: number
  /** A round, oval, octagonal or free-outline rug: its face, backing and shadow are cut to it. */
  shape?: RugShape
  /** Per-fibre material maps (silk shines, wool stays matte); without them the rug is all wool. */
  fabric?: Pick<RugTextures, 'surfaceMap' | 'sheenMap' | 'anisotropyMap' | 'anisotropy' | 'fibre'>
}

/** White inside the rug's outline, black outside, as an alpha map (three reads its green). */
function shapeMask(shape: RugShape, widthFt: number, heightFt: number): CanvasTexture {
  const k = 512 / Math.max(widthFt, heightFt)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.round(widthFt * k))
  canvas.height = Math.max(2, Math.round(heightFt * k))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.scale(k, k)
  ctx.fillStyle = '#fff'
  ctx.fill(new Path2D(shapePathFt(shape, widthFt, heightFt)))
  return new CanvasTexture(canvas)
}

/**
 * One rug, any pose. Local frame, metres: the rug is centred on the origin, x across its width,
 * its top edge (row 0 of the art) towards -z, pile facing +y; it rests on y = 0. `rolled` winds
 * pile-in from the top edge (analytic; raising `progress` unrolls it from the bottom edge towards -z); `hanging` runs the cloth
 * from the top edge at `hangHeight`, in front of a wall at `wallZ`.
 */
export function RugMesh({
  map,
  normalMap = null,
  widthFt,
  heightFt,
  pose = 'flat',
  progress = 1,
  tier = 'high',
  hangHeight = 2.4,
  wallZ = -1.5,
  bindingColor = '#2a2420',
  backingColor = '#cfc4b0',
  normalScale = 1,
  shape,
  fabric,
  ...group
}: RugMeshProps) {
  const W = widthFt * FT
  const L = heightFt * FT
  // Enough rows along the length for a tight roll to read round (~24 per inner turn).
  const segU = Math.max(8, Math.round(W / 0.05))
  const segV = Math.max(32, Math.round(L / 0.012))

  const { surface, edge, boundary } = useMemo(() => buildGeometry(W, L, segU, segV), [W, L, segU, segV])
  useEffect(
    () => () => {
      surface.dispose()
      edge.dispose()
    },
    [surface, edge],
  )

  const shaped = !!shape && shape.kind !== 'rect'
  const shapeKey = shaped ? JSON.stringify(shape) : ''
  const mask = useMemo(() => (shapeKey ? shapeMask(JSON.parse(shapeKey) as RugShape, widthFt, heightFt) : null), [shapeKey, widthFt, heightFt])
  useEffect(() => () => mask?.dispose(), [mask])

  // Built with its maps, and rebuilt when they change, rather than patched after the fact.
  const front = useMemo(() => {
    const surfaceMap = fabric?.surfaceMap ?? null
    const common = {
      side: FrontSide,
      alphaMap: mask,
      alphaTest: 0.5,
      // With per-fibre maps, roughness comes from the map (three multiplies the two).
      roughness: surfaceMap ? 1 : (fabric?.fibre?.render.roughness ?? 0.92),
      roughnessMap: surfaceMap,
      metalness: 0,
      map,
      normalMap,
      normalScale: new Vector2(normalScale, normalScale),
    }
    if (tier !== 'high') return new MeshStandardMaterial(common)
    const sheenMap = fabric?.sheenMap ?? null
    const anisotropyMap = fabric?.anisotropyMap ?? null
    // Sheen is a grazing-angle rim; a white one at full strength washes dark dyes out to grey, so
    // its colour is a dark warm neutral for wool and the dye itself for silk (from the map).
    return new MeshPhysicalMaterial({
      ...common,
      sheen: 1,
      sheenRoughness: sheenMap ? 1 : (fabric?.fibre?.render.sheenRoughness ?? 0.55),
      sheenRoughnessMap: sheenMap,
      sheenColor: new Color(sheenMap ? '#ffffff' : SHEEN_COLOR).multiplyScalar(sheenMap ? 1 : (fabric?.fibre?.render.sheen ?? 1)),
      sheenColorMap: sheenMap,
      specularIntensity: surfaceMap ? 1 : (fabric?.fibre?.render.specular ?? 1),
      specularIntensityMap: surfaceMap,
      anisotropy: anisotropyMap ? (fabric?.anisotropy ?? 0) : 0,
      anisotropyMap,
    })
  }, [tier, map, normalMap, normalScale, mask, fabric?.surfaceMap, fabric?.sheenMap, fabric?.anisotropyMap, fabric?.anisotropy, fabric?.fibre])
  // The backing is cut to the same outline, so a round rug has no square underneath it.
  const back = useMemo(() => new MeshStandardMaterial({ side: BackSide, color: backingColor, roughness: 1, alphaMap: mask, alphaTest: mask ? 0.5 : 0 }), [backingColor, mask])
  const binding = useMemo(() => new MeshStandardMaterial({ side: DoubleSide, color: bindingColor, roughness: 0.85 }), [bindingColor])
  useEffect(() => () => front.dispose(), [front])
  useEffect(() => () => back.dispose(), [back])
  useEffect(() => () => binding.dispose(), [binding])


  const cloth = useMemo<Cloth | null>(() => {
    if (pose !== 'hanging') return null
    const tilt = 0.35 // released a little forward of the wall, so it swings in
    const c = createCloth({
      cols: CLOTH_COLS,
      rows: CLOTH_ROWS,
      width: W,
      length: L,
      origin: [-W / 2, hangHeight, wallZ + 0.02],
      across: [1, 0, 0],
      down: [0, -Math.cos(tilt), Math.sin(tilt)],
      planes: [floorPlane(0, 0.8), { nx: 0, ny: 0, nz: 1, d: wallZ, friction: 0.3 }],
      thickness: THICKNESS / 2,
    })
    pinRows(c, [0])
    return c
  }, [pose, W, L, hangHeight, wallZ])

  const dirty = useRef(true)
  const acc = useRef(0)
  useEffect(() => {
    dirty.current = true
  }, [pose, progress, surface, cloth])

  useFrame((_, delta) => {
    if (cloth && !cloth.sleeping) {
      // Fixed 60 Hz steps, catching up after slow frames (bounded, so a stall can't spiral).
      acc.current = Math.min(acc.current + delta, MAX_CATCHUP * STEP)
      while (acc.current >= STEP && !cloth.sleeping) {
        cloth.step(STEP)
        acc.current -= STEP
      }
      dirty.current = true
    }
    if (!dirty.current) return
    dirty.current = false
    const pos = surface.getAttribute('position') as BufferAttribute
    if (pose === 'hanging' && cloth) writeCloth(pos, cloth, segU, segV)
    else writePose(pos, W, L, segU, segV, pose === 'rolled' ? progress : 1)
    pos.needsUpdate = true
    surface.computeVertexNormals()
    surface.computeBoundingSphere()
    writeEdge(edge, surface, boundary)
  })

  return (
    <group {...group}>
      <mesh geometry={surface} material={front} castShadow receiveShadow />
      <mesh geometry={surface} material={back} castShadow receiveShadow />
      {/* The binding strip follows the rectangle's edge; shaped rugs end at their cut outline. */}
      {!shaped && <mesh geometry={edge} material={binding} castShadow receiveShadow />}
    </group>
  )
}

// ---- geometry ------------------------------------------------------------------------------

/** A (segU+1) x (segV+1) grid, row-major along v (top edge first), with UVs; plus the binding strip. */
function buildGeometry(W: number, L: number, segU: number, segV: number) {
  const nu = segU + 1
  const nv = segV + 1
  const positions = new Float32Array(nu * nv * 3)
  const uvs = new Float32Array(nu * nv * 2)
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const k = j * nu + i
      uvs[k * 2] = i / segU
      uvs[k * 2 + 1] = 1 - j / segV // textures are uploaded flipped: image top at v = 1
    }
  }
  const index: number[] = []
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * nu + i
      const b = a + nu // +v (towards the bottom edge)
      const c = a + 1 // +u
      const d = b + 1
      // (dv x du) faces the pile side.
      index.push(a, b, c, c, b, d)
    }
  }
  const surface = new BufferGeometry()
  surface.setAttribute('position', new BufferAttribute(positions, 3))
  surface.setAttribute('uv', new BufferAttribute(uvs, 2))
  surface.setIndex(index)
  writePose(surface.getAttribute('position') as BufferAttribute, W, L, segU, segV, 1)
  surface.computeVertexNormals()

  // Boundary loop: top edge, right edge, bottom edge (reversed), left edge (reversed).
  const boundary: number[] = []
  for (let i = 0; i < segU; i++) boundary.push(i)
  for (let j = 0; j < segV; j++) boundary.push(j * nu + segU)
  for (let i = segU; i > 0; i--) boundary.push(segV * nu + i)
  for (let j = segV; j > 0; j--) boundary.push(j * nu)
  const P = boundary.length
  const edge = new BufferGeometry()
  edge.setAttribute('position', new BufferAttribute(new Float32Array(P * 2 * 3), 3))
  const strip: number[] = []
  for (let k = 0; k < P; k++) {
    const k2 = (k + 1) % P
    strip.push(k * 2, k * 2 + 1, k2 * 2, k2 * 2, k * 2 + 1, k2 * 2 + 1)
  }
  edge.setIndex(strip)
  writeEdge(edge, surface, boundary)
  return { surface, edge, boundary }
}

/** Flat (progress 1) or partly rolled from the top edge. Sheet mid-surface sits THICKNESS/2 up. */
function writePose(pos: BufferAttribute, W: number, L: number, segU: number, segV: number, progress: number) {
  const opts = { thickness: THICKNESS, core: ROLL_CORE }
  const st = rollState(L, progress, opts)
  const nu = segU + 1
  for (let j = 0; j <= segV; j++) {
    // Roll from the top edge: distance from the bottom edge is what lies flat first.
    const v = L - (j / segV) * L
    const p = unrollPoint(v, L, progress, opts, st)
    const z = L / 2 - p.y
    const y = p.z + THICKNESS / 2
    for (let i = 0; i <= segU; i++) pos.setXYZ(j * nu + i, (i / segU - 0.5) * W, y, z)
  }
}

/** Bilinear sample of the cloth grid onto the render grid. */
function writeCloth(pos: BufferAttribute, cloth: Cloth, segU: number, segV: number) {
  const p = cloth.positions
  const { cols, rows } = cloth
  const nu = segU + 1
  for (let j = 0; j <= segV; j++) {
    const fy = (j / segV) * (rows - 1)
    const r0 = Math.min(rows - 2, Math.floor(fy))
    const ty = fy - r0
    for (let i = 0; i <= segU; i++) {
      const fx = (i / segU) * (cols - 1)
      const c0 = Math.min(cols - 2, Math.floor(fx))
      const tx = fx - c0
      const a = (r0 * cols + c0) * 3
      const b = a + 3
      const c = a + cols * 3
      const d = c + 3
      const out = [0, 0, 0]
      for (let k = 0; k < 3; k++) {
        const top = p[a + k] + (p[b + k] - p[a + k]) * tx
        const bot = p[c + k] + (p[d + k] - p[c + k]) * tx
        out[k] = top + (bot - top) * ty
      }
      pos.setXYZ(j * nu + i, out[0], out[1], out[2])
    }
  }
}

/** Binding strip: the outline pushed half the thickness either side along the surface normal. */
function writeEdge(edge: BufferGeometry, surface: BufferGeometry, boundary: number[]) {
  const pos = surface.getAttribute('position') as BufferAttribute
  const nrm = surface.getAttribute('normal') as BufferAttribute
  const out = edge.getAttribute('position') as BufferAttribute
  const h = THICKNESS / 2
  for (let k = 0; k < boundary.length; k++) {
    const v = boundary[k]
    const x = pos.getX(v)
    const y = pos.getY(v)
    const z = pos.getZ(v)
    const nx = nrm.getX(v)
    const ny = nrm.getY(v)
    const nz = nrm.getZ(v)
    out.setXYZ(k * 2, x + nx * h, y + ny * h, z + nz * h)
    out.setXYZ(k * 2 + 1, x - nx * h, y - ny * h, z - nz * h)
  }
  out.needsUpdate = true
  edge.computeVertexNormals()
  edge.computeBoundingSphere()
}
