import { useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { ThreeEvent } from '@react-three/fiber'
import { BackSide, NeutralToneMapping, PMREMGenerator, Color, DataTexture, FrontSide, LinearFilter, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, RGBAFormat, UnsignedByteType, Vector2 } from 'three'
import type { BufferAttribute, DirectionalLight, Mesh } from 'three'
import { fibreMaterial, sheenColour } from '../../data/materials'
import type { Fibre } from '../../data/materials'
import type { PileTexture } from '../../types/freeform'
import { detectTier } from '../tier'
import { heightToNormal } from '../rug/normal'
import { dataTexture } from '../rug/rugTextures'
import { fabricPatch } from './fabricPatch'
import { hexRgb, loadGrain } from './fabricChip'
import type { Grain } from './fabricChip'

/**
 * "Feel this fabric": a 10 cm square of one yarn, close up, in WebGL. The pointer is a lamp held
 * low (raking light shows the pile); dragging brushes the pile, and silk shows it the way a real
 * silk rug does, darker and richer against the nap, paler with it; "Lift corner" curls the corner
 * up to show the back, where a hand-knotted rug's knots show through.
 */
export interface FabricViewerProps {
  hex: string
  fibre: Fibre | string
  pile?: PileTexture
  flat?: boolean
  /** Knots per inch (a closer weave reads finer). */
  kpi?: number
  /** Camera tilt: 0 straight down, 1 low and grazing. */
  tilt?: number
  lifted?: boolean
  /** Bumped to clear the brush marks. */
  resetKey?: number
}

const SIDE = 0.1 // metres
const SEG = 160
const BRUSH = 128
const AMP = 0.0024 // metres of relief between the lowest and highest point

interface PointerState {
  /** Light position target, normalised -1..1 over the canvas; null when the pointer is away. */
  light: [number, number] | null
  down: boolean
  last: [number, number] | null
}

function Patch({ hex, fibre: fibreId, pile, flat, kpi = 10, lifted = false, resetKey = 0, pointer, high }: FabricViewerProps & { pointer: MutableRefObject<PointerState>; high: boolean }) {
  const fibre = fibreMaterial(fibreId)
  const [grain, setGrain] = useState<Grain | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    loadGrain(fibre.render.grain).then((g) => live && setGrain(g))
    return () => {
      live = false
    }
  }, [fibre.render.grain])

  const size = high ? 768 : 384
  const built = useMemo(() => {
    if (grain === undefined) return null
    // Silk is knotted finer than wool: about half again as many knots to the inch.
    const knots = Math.round((SIDE / 0.0254) * kpi * (fibre.render.anisotropy > 0.5 ? 1.5 : 1))
    const patch = fabricPatch(hexRgb(hex), fibre, { size, knots, pile, flat, grain: grain?.g, grainW: grain?.w, grainH: grain?.h, seed: 7 })
    // Silk lies flatter and smoother: gentler normals, so its lustre is broad, not glittery.
    const normal = heightToNormal(patch.height, size, size, 4 * (size / 256) * fibre.render.relief ** 1.6)
    const map = dataTexture(patch.color, size, size, true)
    const normalMap = dataTexture(normal, size, size, false)
    // Geometry: the relief as real displacement (so the corner can curl with it).
    const geo = new PlaneGeometry(SIDE, SIDE, SEG, SEG)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as BufferAttribute
    const uv = geo.attributes.uv as BufferAttribute
    let lo = Infinity
    let hi = -Infinity
    for (const v of patch.height) {
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    const span = hi - lo || 1
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i)
      const v = uv.getY(i)
      const px = Math.min(size - 1, Math.round(u * (size - 1)))
      const py = Math.min(size - 1, Math.round((1 - v) * (size - 1)))
      pos.setY(i, ((patch.height[py * size + px] - lo) / span) * AMP * fibre.render.relief)
    }
    geo.computeVertexNormals()
    const base = Float32Array.from(pos.array as Float32Array)
    return { map, normalMap, geo, base }
  }, [grain, hex, fibre, size, kpi, pile, flat])

  useEffect(
    () => () => {
      built?.map.dispose()
      built?.normalMap.dispose()
      built?.geo.dispose()
    },
    [built],
  )

  // The brush: 0.5 neutral, towards 1 brushed against the pile, towards 0 smoothed with it.
  const brush = useMemo(() => {
    const data = new Uint8Array(BRUSH * BRUSH * 4).fill(128)
    const tex = new DataTexture(data, BRUSH, BRUSH, RGBAFormat, UnsignedByteType)
    tex.magFilter = LinearFilter
    tex.minFilter = LinearFilter
    tex.flipY = true
    tex.needsUpdate = true
    return { data, tex }
  }, [])
  useEffect(() => () => brush.tex.dispose(), [brush])
  useEffect(() => {
    brush.data.fill(128)
    brush.tex.needsUpdate = true
  }, [resetKey, brush, built])

  const materials = useMemo(() => {
    if (!built) return null
    const r = fibre.render
    const sheen = sheenColour(hexRgb(hex), fibre)
    const brushK = { value: r.brush }
    const common = { map: built.map, normalMap: built.normalMap, normalScale: new Vector2(1.1, 1.1), roughness: r.roughness, metalness: 0, side: FrontSide }
    const front = high
      ? new MeshPhysicalMaterial({
          ...common,
          sheen: 1,
          sheenColor: new Color(`rgb(${sheen.map(Math.round).join(',')})`),
          sheenRoughness: r.sheenRoughness,
          specularIntensity: r.specular,
          anisotropy: r.anisotropy,
          // Along the pile, which leans towards the viewer.
          anisotropyRotation: Math.PI / 2,
        })
      : new MeshStandardMaterial(common)
    front.onBeforeCompile = (shader) => {
      shader.uniforms.brushMap = { value: brush.tex }
      shader.uniforms.brushK = brushK
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform sampler2D brushMap;\nuniform float brushK;\nvoid main() {')
        .replace(
          '#include <map_fragment>',
          // Against the nap the fibre ends face you: darker, richer, rougher. With it: paler, glossier.
          '#include <map_fragment>\nfloat bv = (texture2D(brushMap, vMapUv).r - 0.5) * 2.0 * brushK;\ndiffuseColor.rgb *= 1.0 - 0.38 * bv;',
        )
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + 0.3 * bv, 0.04, 1.0);')
    }
    // The back: the same knots seen through the foundation, flat and dry.
    const back = new MeshStandardMaterial({ map: built.map, color: new Color('#b9ad97'), roughness: 1, side: BackSide })
    return { front, back }
  }, [built, fibre, hex, high, brush])
  useEffect(
    () => () => {
      materials?.front.dispose()
      materials?.back.dispose()
    },
    [materials],
  )

  // Corner curl, eased.
  const curl = useRef(0)
  const mesh = useRef<Mesh>(null)
  const backMesh = useRef<Mesh>(null)
  const light = useRef<DirectionalLight>(null)
  const sweep = useRef(0)
  useFrame((_, dt) => {
    // Lamp: follows the pointer, held low; sweeps slowly by itself when the pointer is away.
    const L = light.current
    if (L) {
      let tx: number
      let tz: number
      if (pointer.current.light) {
        ;[tx, tz] = pointer.current.light
      } else {
        sweep.current += dt * 0.35
        tx = Math.cos(sweep.current) * 0.9
        tz = Math.sin(sweep.current) * 0.6
      }
      const k = 1 - Math.exp(-dt * 8)
      L.position.x += (tx * 0.16 - L.position.x) * k
      L.position.z += (tz * 0.16 - L.position.z) * k
      // Further from the middle, lower: a raking light at the edges.
      const r = Math.min(1, Math.hypot(tx, tz))
      L.position.y += (0.03 + (1 - r) * 0.14 - L.position.y) * k
    }
    const target = lifted ? 1 : 0
    if (!built || Math.abs(curl.current - target) < 0.001) return
    curl.current += (target - curl.current) * (1 - Math.exp(-dt * 5))
    if (Math.abs(curl.current - target) < 0.002) curl.current = target
    const pos = built.geo.attributes.position as BufferAttribute
    const arr = pos.array as Float32Array
    const t = curl.current
    // Roll the near-right corner up over a cylinder of radius R whose axis is a diagonal hinge
    // line; the hinge moves in from the corner as the lift grows. s runs along the diagonal.
    const R = 0.008
    const h = SIDE * Math.SQRT1_2 - t * 0.045
    for (let i = 0; i < pos.count; i++) {
      const x = built.base[i * 3]
      const y = built.base[i * 3 + 1]
      const z = built.base[i * 3 + 2]
      const s = (x + z) * Math.SQRT1_2
      const a = s - h
      if (a <= 0) {
        arr[i * 3] = x
        arr[i * 3 + 1] = y
        arr[i * 3 + 2] = z
        continue
      }
      let s2: number
      let up: number
      let ns: number
      let nu: number
      if (a <= Math.PI * R) {
        const phi = a / R
        s2 = h + R * Math.sin(phi)
        up = R - R * Math.cos(phi)
        // The pile faces in towards the roll's axis.
        ns = -Math.sin(phi)
        nu = Math.cos(phi)
      } else {
        s2 = h - (a - Math.PI * R)
        up = 2 * R
        ns = 0
        nu = -1
      }
      const ds = s2 + y * ns - s
      arr[i * 3] = x + ds * Math.SQRT1_2
      arr[i * 3 + 1] = up + y * nu
      arr[i * 3 + 2] = z + ds * Math.SQRT1_2
    }
    pos.needsUpdate = true
    built.geo.computeVertexNormals()
  })

  function paint(e: ThreeEvent<PointerEvent>) {
    if (!pointer.current.down || !e.uv) return
    const u = e.uv.x
    const v = e.uv.y
    const last = pointer.current.last
    pointer.current.last = [u, v]
    if (!last) return
    // Stroking towards the viewer (v falling) goes with the pile; away from it, against.
    const dv = v - last[1]
    const du = u - last[0]
    const len = Math.hypot(du, dv)
    if (len < 1e-4) return
    const target = dv > 0 ? 255 : 0
    const amt = Math.min(1, Math.abs(dv) / len) * 0.55
    const cx = u * BRUSH
    const cy = (1 - v) * BRUSH
    const rad = BRUSH * 0.09
    const steps = Math.max(1, Math.ceil((len * BRUSH) / (rad * 0.5)))
    for (let k = 1; k <= steps; k++) {
      const px = cx - (du * BRUSH * (steps - k)) / steps
      const py = cy + (dv * BRUSH * (steps - k)) / steps
      for (let y = Math.max(0, Math.floor(py - rad)); y < Math.min(BRUSH, Math.ceil(py + rad)); y++)
        for (let x = Math.max(0, Math.floor(px - rad)); x < Math.min(BRUSH, Math.ceil(px + rad)); x++) {
          const d = Math.hypot(x - px, y - py) / rad
          if (d >= 1) continue
          const w = amt * (1 - d * d)
          const i = (y * BRUSH + x) * 4
          brush.data[i] = brush.data[i] + (target - brush.data[i]) * w
        }
    }
    brush.tex.needsUpdate = true
    if (e.pointerType === 'touch') navigator.vibrate?.(4)
  }

  if (!built || !materials) return null
  return (
    <>
      <directionalLight ref={light} position={[0.12, 0.06, 0.08]} intensity={2.4} color="#fff3e2" />
      <mesh
        ref={mesh}
        geometry={built.geo}
        material={materials.front}
        onPointerDown={(e) => {
          e.stopPropagation()
          ;(e.target as Element | null)?.setPointerCapture?.(e.pointerId)
          pointer.current.down = true
          pointer.current.last = e.uv ? [e.uv.x, e.uv.y] : null
        }}
        onPointerMove={paint}
        onPointerUp={() => {
          pointer.current.down = false
          pointer.current.last = null
        }}
      />
      <mesh ref={backMesh} geometry={built.geo} material={materials.back} />
    </>
  )
}

/** A soft procedural room for glossy fibres to reflect (silk's lustre is reflected room light). */
function Room() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.14
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function Rig({ tilt }: { tilt: number }) {
  useFrame(({ camera }, dt) => {
    const a = 0.12 + tilt * 1.05 // radians from straight down
    const d = 0.17
    const k = 1 - Math.exp(-dt * 6)
    camera.position.x += (0 - camera.position.x) * k
    camera.position.y += (Math.cos(a) * d - camera.position.y) * k
    camera.position.z += (Math.sin(a) * d - camera.position.z) * k
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function FabricViewer3D(props: FabricViewerProps) {
  const high = detectTier() === 'high'
  const pointer = useRef<PointerState>({ light: null, down: false, last: null })
  return (
    <div
      className="relative h-full w-full touch-none select-none bg-[radial-gradient(80%_70%_at_50%_40%,#3a332c_0%,#1d1915_75%)]"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        pointer.current.light = [((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1]
      }}
      onPointerLeave={() => {
        pointer.current.light = null
        pointer.current.down = false
        pointer.current.last = null
      }}
    >
      <Canvas dpr={high ? [1, 2] : 1} camera={{ position: [0, 0.17, 0.03], fov: 34, near: 0.005, far: 5 }} gl={{ toneMapping: NeutralToneMapping, antialias: true }}>
        <hemisphereLight args={['#fff6ea', '#3b3127', 0.2]} />
        <Room />
        <Rig tilt={props.tilt ?? 0.35} />
        <Patch {...props} pointer={pointer} high={high} />
      </Canvas>
    </div>
  )
}
