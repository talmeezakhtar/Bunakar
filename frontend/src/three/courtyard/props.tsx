import { useSurface } from './surfaces'
import { useYarnMap } from './yarn'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { sky } from './sky'
import { BufferGeometry, Float32BufferAttribute, LatheGeometry, PlaneGeometry, Vector2 } from 'three'
import type { MeshStandardMaterial, PointLight, Texture } from 'three'
import { BRASS } from './architecture'
import { Bounce } from './interact'

/** Dye colours of the wool on the rack: madder, indigo, saffron, walnut, ivory, leaf. */
export const DYES = ['#a8352b', '#2f3a72', '#d9a13b', '#6b4430', '#efe4cf', '#5f7a45']

function Beam({ p, s }: { p: [number, number, number]; s: [number, number, number] }) {
  // Walnut, the grain running along the beam's length.
  const along = s[0] > s[1]
  const wood = useSurface('wood', [1, Math.max(s[0], s[1]) / 1.2], true, along)
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial map={wood} bumpMap={wood} bumpScale={0.8} roughness={0.55} />
    </mesh>
  )
}

/**
 * An upright hand-knotting loom: two posts, warp and cloth beams, the warp threads above and the
 * part already knotted - a photographed rug, `woven` of the way up - below.
 */
export function Loom({ map, normalMap = null, woven = 0.45, width = 1.5, height = 1.95 }: { map: Texture | null; normalMap?: Texture | null; woven?: number; width?: number; height?: number }) {
  const warp = useSurface('warp', [2, 1])
  const clothBottom = 0.32
  const clothTop = height - 0.12
  const wovenTop = clothBottom + (clothTop - clothBottom) * woven
  const warps = useMemo(() => {
    const g = new BufferGeometry()
    const pts: number[] = []
    const n = 64
    for (let i = 0; i <= n; i++) {
      const x = -width / 2 + 0.06 + ((width - 0.12) * i) / n
      pts.push(x, wovenTop, 0, x, clothTop, 0)
    }
    g.setAttribute('position', new Float32BufferAttribute(pts, 3))
    return g
  }, [width, wovenTop, clothTop])
  // The woven part shows the bottom of the rug art (row 0 is the top of the art, so v runs down).
  const cloth = useMemo(() => {
    const g = new PlaneGeometry(width - 0.12, wovenTop - clothBottom)
    const uv = g.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * woven)
    uv.needsUpdate = true
    return g
  }, [width, wovenTop, woven])
  return (
    <group>
      <Beam p={[-width / 2 - 0.05, height / 2, 0]} s={[0.09, height, 0.09]} />
      <Beam p={[width / 2 + 0.05, height / 2, 0]} s={[0.09, height, 0.09]} />
      <Beam p={[0, clothTop + 0.05, 0]} s={[width + 0.3, 0.1, 0.1]} />
      <Beam p={[0, clothBottom - 0.05, 0]} s={[width + 0.3, 0.1, 0.1]} />
      <Beam p={[0, wovenTop + 0.03, 0.06]} s={[width + 0.05, 0.035, 0.035]} />
      <mesh position={[0, (wovenTop + clothTop) / 2, -0.004]}>
        <planeGeometry args={[width - 0.12, clothTop - wovenTop]} />
        <meshStandardMaterial map={warp} roughness={1} />
      </mesh>
      <lineSegments geometry={warps}>
        <lineBasicMaterial color="#efe6d4" transparent opacity={0.85} />
      </lineSegments>
      <mesh geometry={cloth} position={[0, (clothBottom + wovenTop) / 2, 0.005]} castShadow receiveShadow>
        <meshStandardMaterial key={map?.uuid ?? 'plain'} map={map ?? undefined} normalMap={normalMap ?? undefined} color={map ? '#ffffff' : '#a8352b'} roughness={0.95} />
      </mesh>
    </group>
  )
}

/** A hank of dyed wool: a fat twisted loop. */
function Skein({ color, x }: { color: string; x: number }) {
  const yarn = useYarnMap([3, 1])
  return (
    <group position={[x, 0, 0]}>
      <mesh rotation-y={Math.PI / 2} castShadow>
        <torusGeometry args={[0.1, 0.045, 16, 40]} />
        <meshStandardMaterial map={yarn} bumpMap={yarn} bumpScale={1.5} color={color} roughness={1} />
      </mesh>
    </group>
  )
}

/** A low bench with wool hanks drying over a bar. */
export function SkeinRack() {
  const yarn = useYarnMap([2, 1])
  return (
    <group>
      <Beam p={[0, 0.32, 0]} s={[0.95, 0.06, 0.38]} />
      {[-0.42, 0.42].map((x) => (
        <Beam key={x} p={[x, 0.15, 0]} s={[0.06, 0.3, 0.32]} />
      ))}
      <Beam p={[-0.44, 0.62, 0]} s={[0.05, 0.6, 0.05]} />
      <Beam p={[0.44, 0.62, 0]} s={[0.05, 0.6, 0.05]} />
      <Beam p={[0, 0.9, 0]} s={[0.98, 0.04, 0.04]} />
      <group position={[0, 0.8, 0]}>
        {/* Touch a hank and it hops on the bar. */}
        {DYES.slice(0, 5).map((c, i) => (
          <Bounce key={c} position={[-0.34 + i * 0.17, 0, 0]} height={0.6}>
            <Skein color={c} x={0} />
          </Bounce>
        ))}
      </group>
      {/* Cones of spun yarn on the bench. */}
      {DYES.map((c, i) => (
        <mesh key={c} position={[-0.36 + i * 0.145, 0.42, 0.05]} castShadow>
          <coneGeometry args={[0.05, 0.16, 24]} />
          <meshStandardMaterial map={yarn} bumpMap={yarn} bumpScale={1.5} color={c} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/** A brass lantern with a glowing pierced body, in coloured glass; `light` adds a real point light (keep it to a few). */
export function Lantern({ light = false, chain = 0, scale = 1, glass = '#ffcc80', glow = '#ff9d3c' }: { light?: boolean; chain?: number; scale?: number; glass?: string; glow?: string }) {
  const cap = useMemo(
    () => new LatheGeometry([[0.001, 0.14], [0.06, 0.13], [0.1, 0.09], [0.11, 0.06], [0.001, 0.06]].map(([a, b]) => new Vector2(a, b)), 12),
    [],
  )
  // Lit glass at night, a faint warm glass by day; the light itself only after dusk.
  const glassMat = useRef<MeshStandardMaterial>(null)
  const lamp = useRef<PointLight>(null)
  useFrame(() => {
    const n = sky.night
    if (glassMat.current) glassMat.current.emissiveIntensity = 0.25 + 2.4 * n
    if (lamp.current) lamp.current.intensity = (light ? 2.6 : 1.4) * n
  })
  return (
    <group scale={scale}>
      {chain > 0 && (
        <mesh position={[0, chain / 2, 0]}>
          <cylinderGeometry args={[0.006, 0.006, chain, 4]} />
          <meshStandardMaterial color="#3b2a1c" />
        </mesh>
      )}
      <group position={[0, -0.12, 0]}>
        <mesh geometry={cap} castShadow>
          <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.085, 0.07, 0.17, 8]} />
          <meshStandardMaterial ref={glassMat} color={glass} emissive={glow} emissiveIntensity={0.25} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.09, 0.075, 0.17, 8, 1, true]} />
          <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.4} wireframe />
        </mesh>
        <mesh position={[0, -0.13, 0]} rotation-x={Math.PI}>
          <coneGeometry args={[0.07, 0.07, 8]} />
          <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
        </mesh>
        <pointLight ref={lamp} position={[0, -0.02, 0]} color={glow} intensity={0} distance={light ? 3 : 2} decay={2} />
      </group>
    </group>
  )
}

/** A brass lota (water pot). */
export function Lota({ scale = 1 }: { scale?: number }) {
  const geo = useMemo(
    () =>
      new LatheGeometry(
        [[0.001, 0], [0.06, 0], [0.07, 0.01], [0.11, 0.06], [0.12, 0.1], [0.1, 0.15], [0.05, 0.19], [0.045, 0.22], [0.065, 0.24], [0.06, 0.25]].map(
          ([a, b]) => new Vector2(a, b),
        ),
        20,
      ),
    [],
  )
  // Hammered brass from the photo, worn by the metal so it reflects the courtyard.
  const brass = useSurface('brass', [3, 1])
  return (
    <mesh geometry={geo} scale={scale} castShadow>
      <meshStandardMaterial map={brass} bumpMap={brass} bumpScale={2} color="#ffe2a8" metalness={0.85} roughness={0.32} />
    </mesh>
  )
}

/** A terracotta pot with a small plant. */
export function PlantPot() {
  const pot = useMemo(
    () => new LatheGeometry([[0.001, 0], [0.12, 0], [0.17, 0.2], [0.2, 0.3], [0.18, 0.32]].map(([a, b]) => new Vector2(a, b)), 16),
    [],
  )
  return (
    <group>
      <mesh geometry={pot} castShadow>
        <meshStandardMaterial color="#b4603f" roughness={0.9} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.06, 0.45, Math.sin(a) * 0.06]} rotation={[Math.sin(a) * 0.5, a, Math.cos(a) * 0.5]} castShadow>
            <coneGeometry args={[0.05, 0.32, 4]} />
            <meshStandardMaterial color="#4f6b39" roughness={0.9} flatShading />
          </mesh>
        )
      })}
    </group>
  )
}

/** A low stool with a woven seat. */
export function Stool() {
  return (
    <group>
      {[-0.18, 0.18].flatMap((x) => [-0.14, 0.14].map((z) => <Beam key={`${x}${z}`} p={[x, 0.14, z]} s={[0.05, 0.28, 0.05]} />))}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.05, 0.38]} />
        <meshStandardMaterial color="#c9a36b" roughness={1} />
      </mesh>
    </group>
  )
}
