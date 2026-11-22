import { Suspense, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ComponentRef, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { AgXToneMapping, Vector3 } from 'three'
import { detectTier } from '../tier'
import { FT, RugMesh } from '../rug/RugMesh'
import { resolveRugSource, rugShape } from '../rug/rugSource'
import type { RugSource } from '../rug/rugSource'
import { TIER_TEXTURES, loadRugTextures } from '../rug/rugTextures'
import type { RugTextures } from '../rug/rugTextures'
import { Shell } from './kit'
import type { RoomDef } from './rooms'

type Controls = ComponentRef<typeof OrbitControls>

/** Where to stand to see a w x d room whole, from the open front-right corner, above. */
function framing(w: number, d: number) {
  const span = Math.max(w, d * 1.15)
  return {
    camera: new Vector3(w * 0.55 + span * 0.35, span * 0.78 + 0.8, d * 0.5 + span * 0.62),
    target: new Vector3(-w * 0.04, 0.35, -d * 0.06),
  }
}

/** Eases the camera to a new room's framing (from a little further out, so each room glides in). */
function CameraRig({ goal, controls }: { goal: { camera: Vector3; target: Vector3; key: string }; controls: RefObject<Controls | null> }) {
  const { camera } = useThree()
  const flying = useRef(true)
  useEffect(() => {
    camera.position.copy(goal.camera.clone().multiplyScalar(1.25))
    flying.current = true
  }, [goal, camera])
  useFrame((_, dt) => {
    const c = controls.current
    if (!flying.current || !c) return
    // A slow, settling glide: each room arrives rather than snaps.
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 2.2)
    camera.position.lerp(goal.camera, k)
    c.target.lerp(goal.target, k)
    c.update()
    if (camera.position.distanceTo(goal.camera) < 0.01) flying.current = false
  })
  return null
}

export type RoomViewerHandle = {
  /** The current view as a PNG, for "Download this view". */
  capture: () => Promise<Blob | null>
}

type Props = { room: RoomDef; source: RugSource }

/** Mounts only once everything beside it in its Suspense boundary has loaded and rendered. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    // Two frames: the first paints the new room, the second is on screen.
    let id = requestAnimationFrame(() => (id = requestAnimationFrame(onReady)))
    return () => cancelAnimationFrame(id)
  }, [onReady])
  return null
}

/**
 * A rug at its real size in a cut-away room built around it (no ceiling, white surround).
 * Drag to turn, scroll or pinch to zoom; switching rooms glides the camera to the next one.
 */
const RoomViewer3D = forwardRef<RoomViewerHandle, Props>(function RoomViewer3D({ room: wanted, source }, ref) {
  // Changing rooms: a white veil fades over the view, the room is swapped beneath it, and the
  // veil lifts once the new room has loaded and drawn, so nothing half-built or blank shows.
  const [room, setRoom] = useState(wanted)
  const [drawn, setDrawn] = useState<string | null>(null)
  const veiled = wanted !== room || drawn !== room.id
  useEffect(() => {
    if (wanted === room) return
    const t = window.setTimeout(() => setRoom(wanted), 380)
    return () => window.clearTimeout(t)
  }, [wanted, room])
  const reveal = useCallback(() => setDrawn(room.id), [room.id])
  const tier = detectTier() === 'high' ? 'high' : 'low'
  const [degraded, setDegraded] = useState(false)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const controls = useRef<Controls | null>(null)
  useImperativeHandle(ref, () => ({
    capture: () => new Promise((resolve) => (canvas.current ? canvas.current.toBlob(resolve, 'image/png') : resolve(null))),
  }))

  const rug = useMemo(() => resolveRugSource(source), [source])
  const [tex, setTex] = useState<RugTextures | null>(null)
  useEffect(() => {
    let live = true
    loadRugTextures(rug, TIER_TEXTURES[tier])
      .then((t) => live && setTex(t))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [rug, tier])

  // Rooms lay the rug's long side along x; a rug drawn wider than long turns a quarter less.
  const long = Math.max(rug.widthFt, rug.heightFt) * FT
  const short = Math.min(rug.widthFt, rug.heightFt) * FT
  const built = useMemo(() => room.build({ long, short }), [room, long, short])
  const turn = built.rug.rotationY - (rug.widthFt > rug.heightFt ? Math.PI / 2 : 0)
  const goal = useMemo(() => ({ ...framing(built.w, built.d), key: room.id }), [built.w, built.d, room.id])
  const shadowSpan = Math.max(built.w, built.d)

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows={tier === 'high' && !degraded}
        dpr={tier === 'high' ? [1, 1.75] : 1}
        camera={{ position: goal.camera.toArray(), fov: 34, near: 0.05, far: 200 }}
        gl={{ toneMapping: AgXToneMapping, antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          canvas.current = gl.domElement
          gl.setClearColor('#ffffff')
        }}
      >
        <PerformanceMonitor onDecline={() => setDegraded(true)} />
        <AdaptiveDpr pixelated />
        <hemisphereLight args={['#ffffff', '#d9d2c6', 1.9]} />
        <directionalLight
          position={[shadowSpan * 0.6, shadowSpan * 1.2, shadowSpan * 0.9]}
          intensity={2.4}
          color="#fff8ee"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-shadowSpan}
          shadow-camera-right={shadowSpan}
          shadow-camera-top={shadowSpan}
          shadow-camera-bottom={-shadowSpan}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[-6, 4, 3]} intensity={0.6} color="#eef3ff" />

        {/* The white "studio" ground the cut-away sits on, catching its soft shadow. */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.181, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <shadowMaterial opacity={0.14} />
        </mesh>

        <Suspense fallback={null}>
          <Shell w={built.w} d={built.d} floor={built.floor} wall={built.wall} accentWall={built.accentWall}>
            {built.content}
          </Shell>
          <Ready key={room.id} onReady={reveal} />
        </Suspense>
        {tex && (
          <group position={built.rug.position} rotation-y={turn}>
            <RugMesh map={tex.map} normalMap={tex.normalMap} fabric={tex} widthFt={rug.widthFt} heightFt={rug.heightFt} tier={tier} shape={rugShape(rug)} />
          </group>
        )}

        <OrbitControls
          ref={controls}
          makeDefault
          target={goal.target.toArray()}
          enablePan={false}
          minDistance={1.5}
          maxDistance={Math.max(built.w, built.d) * 3}
          minPolarAngle={0.2}
          maxPolarAngle={1.35}
          enableDamping
        />
        <CameraRig goal={goal} controls={controls} />
      </Canvas>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-white transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${veiled ? 'opacity-100 duration-[380ms]' : 'opacity-0 duration-700'}`}
      />
    </div>
  )
})

export default RoomViewer3D
