import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { RoundedBox, useTexture } from '@react-three/drei'
import {
  CanvasTexture,
  CatmullRomCurve3,
  ExtrudeGeometry,
  LatheGeometry,
  Object3D,
  Path,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import type { InstancedMesh, Texture } from 'three'
import { loadPhotoRugTextures } from '../rug/photoTextures'
import { useSurface } from './surfaces'
import type { RugTextures } from '../rug/rugTextures'

/**
 * Bazaar pieces built in code, after the owner's reference pictures: a stitched leather pouf, a
 * kilim lumbar pillow, an enamelled vase, a brass ewer, an octagonal inlaid table, a bundle of
 * rolled rugs standing on end, and the fringes on a rug's ends. Photo textures live in
 * `public/textures/`.
 */

const BRASS = { color: '#c9a24f', metalness: 0.9, roughness: 0.32 } as const

function srgb(t: Texture) {
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** A Moroccan leather pouf; its top-down photo is projected onto a squashed sphere. */
export function Pouf({ position, r = 0.24 }: { position?: [number, number, number]; r?: number }) {
  const map = srgb(useTexture('/textures/pouf-leather.jpg'))
  const geo = useMemo(() => {
    const g = new SphereGeometry(r, 48, 24)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    // Seen from above, the photo's rim (at ~0.47 of the frame) meets the pouf's widest point.
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + (pos.getX(i) / r) * 0.47, 0.5 - (pos.getZ(i) / r) * 0.47)
    return g
  }, [r])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo} position={position ? [position[0], r * 0.62, position[2]] : [0, r * 0.62, 0]} scale={[1, 0.62, 1]} castShadow receiveShadow>
      <meshStandardMaterial map={map} roughness={0.55} />
    </mesh>
  )
}

/** A kilim lumbar pillow, its woven face from the photo. */
export function KilimPillow({ position, rotation }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  const map = srgb(useTexture('/textures/pillow-kilim.jpg'))
  return (
    <RoundedBox args={[0.52, 0.26, 0.12]} radius={0.05} smoothness={4} position={position} rotation={rotation} castShadow receiveShadow>
      <meshStandardMaterial map={map} roughness={1} />
    </RoundedBox>
  )
}

/** Lathe UVs run by point index; re-map v to height so a photo wraps without stretching. */
function latheByHeight(points: [number, number][], segments: number, height: number) {
  const g = new LatheGeometry(points.map(([r, y]) => new Vector2(r * height, y * height)), segments)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getY(i) / height)
  return g
}

/** An enamelled bottle vase, the photo wrapped around it. */
export function EnamelVase({ position, height = 0.36 }: { position?: [number, number, number]; height?: number }) {
  const tex = useTexture('/textures/vase-enamel.jpg')
  const map = useMemo(() => {
    const t = srgb(tex.clone())
    t.wrapS = RepeatWrapping
    t.repeat.set(2, 1)
    t.needsUpdate = true
    return t
  }, [tex])
  const geo = useMemo(
    () =>
      latheByHeight(
        [[0.001, 0], [0.13, 0], [0.14, 0.03], [0.1, 0.06], [0.2, 0.15], [0.27, 0.28], [0.26, 0.36], [0.18, 0.46], [0.09, 0.58], [0.065, 0.72], [0.07, 0.82], [0.09, 0.86], [0.06, 0.9], [0.06, 0.97], [0.09, 1]],
        40,
        height,
      ),
    [height],
  )
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo} position={position} castShadow receiveShadow>
      <meshStandardMaterial map={map} roughness={0.18} metalness={0.05} />
    </mesh>
  )
}

/** A tall brass ewer with a swan-neck spout, a handle and a domed lid. */
export function BrassEwer({ position, rotationY = 0, height = 0.42 }: { position?: [number, number, number]; rotationY?: number; height?: number }) {
  const body = useMemo(
    () => latheByHeight([[0.001, 0], [0.12, 0], [0.13, 0.03], [0.07, 0.07], [0.08, 0.12], [0.17, 0.3], [0.2, 0.42], [0.16, 0.55], [0.08, 0.65], [0.06, 0.75], [0.075, 0.8], [0.06, 0.84], [0.07, 0.88], [0.001, 0.9]], 32, height),
    [height],
  )
  const spout = useMemo(() => {
    const h = height
    const curve = new CatmullRomCurve3([new Vector3(0.12 * h, 0.3 * h, 0), new Vector3(0.24 * h, 0.4 * h, 0), new Vector3(0.3 * h, 0.65 * h, 0), new Vector3(0.42 * h, 0.85 * h, 0)])
    return curve
  }, [height])
  const handle = useMemo(() => {
    const h = height
    return new CatmullRomCurve3([new Vector3(-0.07 * h, 0.8 * h, 0), new Vector3(-0.3 * h, 0.82 * h, 0), new Vector3(-0.32 * h, 0.55 * h, 0), new Vector3(-0.17 * h, 0.4 * h, 0)])
  }, [height])
  useEffect(() => () => body.dispose(), [body])
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[spout, 24, height * 0.022, 8, false]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[handle, 24, height * 0.014, 8, false]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, height * 0.93, 0]} castShadow>
        <sphereGeometry args={[height * 0.035, 12, 10]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
    </group>
  )
}

/** The inlaid top of the octagonal table: a medallion and bands in light wood on dark. */
function inlayTexture() {
  const s = 512
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  g.fillStyle = '#5b3a24'
  g.fillRect(0, 0, s, s)
  const ring = (r: number, w: number, col: string) => {
    g.strokeStyle = col
    g.lineWidth = w
    g.beginPath()
    g.arc(s / 2, s / 2, r, 0, Math.PI * 2)
    g.stroke()
  }
  ring(236, 10, '#d8bf8f')
  ring(214, 3, '#d8bf8f')
  ring(120, 6, '#d8bf8f')
  ring(70, 3, '#e9dcc0')
  // Petals round the medallion and leaf scrolls between the bands.
  g.fillStyle = '#e2cfa3'
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.save()
    g.translate(s / 2 + Math.cos(a) * 95, s / 2 + Math.sin(a) * 95)
    g.rotate(a)
    g.beginPath()
    g.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    g.beginPath()
    g.arc(s / 2 + Math.cos(a) * 170, s / 2 + Math.sin(a) * 170, i % 2 ? 6 : 10, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = '#f1e6cc'
  g.beginPath()
  g.arc(s / 2, s / 2, 26, 0, Math.PI * 2)
  g.fill()
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** An octagonal table with an inlaid top and arched, fretted side panels. */
export function OctagonTable({ position, rotationY = 0, r = 0.34, h = 0.4 }: { position?: [number, number, number]; rotationY?: number; r?: number; h?: number }) {
  const inlay = useMemo(() => inlayTexture(), [])
  // Extruded panels have UVs in metres: one photo per ~0.5 m.
  const wood = useSurface('wood', [2, 0.2], true, true)
  const panelWood = useSurface('wood', [2, 2])
  const panel = useMemo(() => {
    const side = 2 * r * Math.sin(Math.PI / 8) * 0.98
    const ph = h - 0.04
    const sh = new Shape()
    sh.moveTo(-side / 2, 0)
    sh.lineTo(side / 2, 0)
    sh.lineTo(side / 2, ph)
    sh.lineTo(-side / 2, ph)
    sh.closePath()
    // An arch cut out of the lower panel, and a small window above it.
    const aw = side * 0.32
    const arch = new Path()
    arch.moveTo(-aw, 0.02)
    arch.lineTo(aw, 0.02)
    arch.lineTo(aw, ph * 0.42)
    arch.absarc(0, ph * 0.42, aw, 0, Math.PI, false)
    arch.lineTo(-aw, 0.02)
    sh.holes.push(arch)
    const win = new Path()
    win.absarc(0, ph * 0.8, side * 0.12, 0, Math.PI * 2, true)
    sh.holes.push(win)
    const geo = new ExtrudeGeometry(sh, { depth: 0.015, bevelEnabled: false })
    geo.translate(0, 0, -0.0075)
    return { geo, apothem: r * Math.cos(Math.PI / 8) * 0.96 }
  }, [r, h])
  useEffect(
    () => () => {
      inlay.dispose()
      panel.geo.dispose()
    },
    [inlay, panel],
  )
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, h - 0.02, 0]} rotation-y={Math.PI / 8} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, 0.04, 8]} />
        {/* Faces: side, top, bottom. */}
        <meshStandardMaterial attach="material-0" map={wood} roughness={0.45} />
        <meshStandardMaterial attach="material-1" map={inlay} roughness={0.35} />
        <meshStandardMaterial attach="material-2" map={wood} roughness={0.6} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} geometry={panel.geo} position={[Math.sin(a) * panel.apothem, 0, Math.cos(a) * panel.apothem]} rotation-y={a} castShadow receiveShadow>
            <meshStandardMaterial map={panelWood} bumpMap={panelWood} bumpScale={0.8} roughness={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Photographed rugs rolled and stood on end in a bundle, like a bazaar shop's wall of rugs. */
export function RugRollBundle({ photos, position, rotationY = 0 }: { photos: string[]; position?: [number, number, number]; rotationY?: number }) {
  const [tex, setTex] = useState<Record<string, RugTextures>>({})
  useEffect(() => {
    let live = true
    for (const url of photos)
      loadPhotoRugTextures(url)
        .then((t) => live && setTex((m) => ({ ...m, [url]: t })))
        .catch(() => {})
    return () => {
      live = false
    }
  }, [photos])
  const rolls = useMemo(
    () =>
      photos.map((url, i) => {
        const a = i * 2.39996
        const d = 0.06 + Math.sqrt(i) * 0.12
        return { url, x: Math.cos(a) * d, z: Math.sin(a) * d, h: 1.05 + ((i * 37) % 5) * 0.12, r: 0.06 + ((i * 13) % 3) * 0.012, tilt: ((i % 3) - 1) * 0.05 }
      }),
    [photos],
  )
  return (
    <group position={position} rotation-y={rotationY}>
      {rolls.map((roll) => {
        const t = tex[roll.url]
        return (
          <group key={roll.url} position={[roll.x, 0, roll.z]} rotation={[roll.tilt, 0, -roll.tilt * 0.6]}>
            <mesh position={[0, roll.h / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[roll.r, roll.r * 1.03, roll.h, 24, 1]} />
              {/* Faces: side (the rug), top end, bottom end (its backing). */}
              <meshStandardMaterial key={t ? 'tex' : 'plain'} attach="material-0" map={t?.map} normalMap={t?.normalMap} color={t ? '#ffffff' : '#8d3a2c'} roughness={0.95} />
              <meshStandardMaterial attach="material-1" color="#6d3a2a" roughness={1} />
              <meshStandardMaterial attach="material-2" color="#6d3a2a" roughness={1} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

const dummy = new Object3D()

/**
 * A rug's fringe: cotton warp ends along one edge. `width` metres along x, strands hanging
 * `length` towards +z (lying flat) or straight down (`hanging`).
 */
export function Fringe({ width, length = 0.06, position, rotationY = 0, hanging = false, color = '#efe6d2' }: { width: number; length?: number; position: [number, number, number]; rotationY?: number; hanging?: boolean; color?: string }) {
  const count = Math.max(8, Math.round(width / 0.014))
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < count; i++) {
      const x = -width / 2 + (i + 0.5) * (width / count)
      const l = length * (0.85 + (((i * 7919) % 13) / 13) * 0.3)
      const sway = (((i * 104729) % 17) / 17 - 0.5) * 0.25
      if (hanging) {
        dummy.position.set(x, -l / 2, 0)
        dummy.rotation.set(0, 0, sway * 0.3)
      } else {
        dummy.position.set(x, 0.003, l / 2)
        dummy.rotation.set(Math.PI / 2, 0, 0)
        dummy.rotation.z = sway
      }
      dummy.scale.set(1, l, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [count, width, length, hanging])
  return (
    <group position={position} rotation-y={rotationY}>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.0022, 0.0018, 1, 4]} />
        <meshStandardMaterial color={color} roughness={1} />
      </instancedMesh>
    </group>
  )
}
