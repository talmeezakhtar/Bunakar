import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, Environment, Html, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { AgXToneMapping, MathUtils, Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'
import { FT, RugMesh } from '../rug/RugMesh'
import type { RugTextures } from '../rug/rugTextures'
import { loadPhotoRugTextures } from '../rug/photoTextures'
import { RUG_PHOTOS, RUG_PHOTO_LIST } from '../../data/rugPhotos'
import type { RugPhoto } from '../../data/rugPhotos'
import { PAVILION, Pavilion, Plinth } from './architecture'
import { Balustrade, Bolster, DrapedRug, Stones, WoolBasket } from './details'
import { BrassEwer, EnamelVase, Fringe, KilimPillow, OctagonTable, Pouf, RugRollBundle } from './crafts'
import { MODELS, Piece, preloadModels } from './models'
import { useSurface } from './surfaces'
import { DayNight, NightLight } from './daynight'
import { Awning, CutOut, FoldedCurtain, NameSign, StringLights, TiedCurtain } from './decor'
import { Bounce, Swing, hoverable } from './interact'
import { DYES, Lantern, Loom, Lota, SkeinRack } from './props'
import { STOPS } from './stops'
import { detectTier } from '../tier'
import type { Stop } from './stops'

/**
 * "A weaver's courtyard at golden hour": a floating diorama built entirely in code - a sandstone
 * chhatri with a hand-knotting loom, dyed wool, hanging, folded and rolled rugs, and brass
 * lanterns. Every rug in it is a photograph of a real rug, with pile relief worked out from the photo.
 *
 * It is the landing page's stage: `progress` (a chapter number, fractional between chapters, fed
 * by page scroll) flies the camera from the overview through the numbered stops. Most things can
 * be touched: lanterns and hanging rugs swing on springs, skeins hop, rolled rugs unroll, the top
 * folded rug lifts, and the rug in front changes to the next photographed rug.
 */

preloadModels()

export type { Stop } from './stops'
export { STOPS } from './stops'

/** A photographed rug, scaled so its long side is `longFt` (keeping the photo's proportions). */
function usePhotoRug(photo: RugPhoto, longFt: number) {
  const [tex, setTex] = useState<RugTextures | null>(null)
  useEffect(() => {
    let live = true
    loadPhotoRugTextures(photo.url)
      .then((t) => live && setTex(t))
      .catch(() => {
        // A photo that can't load simply doesn't appear.
      })
    return () => {
      live = false
    }
  }, [photo.url])
  const k = longFt / Math.max(photo.widthFt, photo.heightFt)
  return { rug: { widthFt: photo.widthFt * k, heightFt: photo.heightFt * k }, tex }
}

/** The rug in front: one of the photographed rugs, lying across the view; touch it for the next. */
function FloorRug({ photo, onTouch, tier }: { photo: RugPhoto; onTouch: () => void; tier: 'high' | 'low' }) {
  const { rug, tex } = usePhotoRug(photo, 7.5)
  if (!tex) return null
  return (
    <group
      position={[0.2, 0.004, 1.25]}
      rotation-y={0.08 + Math.PI / 2}
      onClick={(e) => {
        e.stopPropagation()
        onTouch()
      }}
      {...hoverable}
    >
      <RugMesh map={tex.map} normalMap={tex.normalMap} widthFt={rug.widthFt} heightFt={rug.heightFt} tier={tier} />
      <Fringe width={rug.widthFt * FT} position={[0, 0, (rug.heightFt * FT) / 2]} length={0.07} />
      <Fringe width={rug.widthFt * FT} position={[0, 0, (-rug.heightFt * FT) / 2]} rotationY={Math.PI} length={0.07} />
    </group>
  )
}

/** A rug hanging from a wooden rod on two posts; touch it and it swings on the rod. */
function HangingRug({ photo, position, rotationY, longFt = 4.6, tier }: { photo: RugPhoto; position: [number, number, number]; rotationY: number; longFt?: number; tier: 'high' | 'low' }) {
  const { rug, tex } = usePhotoRug(photo, longFt)
  const rodY = 1.95
  const span = rug.widthFt * 0.3048 + 0.35
  const wood = useSurface('wood', [1, 1.2])
  return (
    <group position={position} rotation-y={rotationY}>
      {[-span / 2, span / 2].map((x) => (
        <mesh key={x} position={[x, rodY / 2, -0.06]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, rodY, 8]} />
          <meshStandardMaterial map={wood} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, rodY, -0.06]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.022, 0.022, span + 0.12, 8]} />
        <meshStandardMaterial map={wood} roughness={0.55} />
      </mesh>
      <Swing axis="x" position={[0, rodY, -0.06]} strength={1.6} idle={0.025} phase={position[0]} stiffness={9} damping={1.1}>
        {tex && (
          <group position={[0, -rodY, 0.06]}>
            <RugMesh map={tex.map} normalMap={tex.normalMap} widthFt={rug.widthFt} heightFt={rug.heightFt} pose="hanging" hangHeight={rodY - 0.03} wallZ={-0.05} tier={tier} />
            <Fringe width={rug.widthFt * FT} position={[0, Math.max(0.02, rodY - 0.03 - rug.heightFt * FT), 0.02]} hanging length={0.07} />
          </group>
        )}
      </Swing>
    </group>
  )
}

/** A rolled rug; touch it and it unrolls across the floor, touch again and it rolls back up. */
function RolledRug({ photo, position, rotationY, tier }: { photo: RugPhoto; position: [number, number, number]; rotationY: number; tier: 'high' | 'low' }) {
  const { rug, tex } = usePhotoRug(photo, 5)
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  useFrame((_, dt) => {
    const goal = open ? 1 : 0
    if (Math.abs(progress - goal) < 0.002) return
    setProgress((p) => MathUtils.damp(p, goal, 3.2, dt))
  })
  if (!tex) return null
  return (
    <group
      position={position}
      rotation-y={rotationY}
      onClick={(e) => {
        e.stopPropagation()
        setOpen((o) => !o)
      }}
      {...hoverable}
    >
      <RugMesh
        map={tex.map}
        normalMap={tex.normalMap}
        widthFt={rug.widthFt}
        heightFt={rug.heightFt}
        pose="rolled"
        progress={progress}
        tier={tier}
        backingColor="#7c3326"
        bindingColor="#3b1f19"
      />
    </group>
  )
}

/** One folded rug in the stack: a slab with the rug's face on top. */
function FoldedRug({ photo, y, rot, color = '#8d3a2c' }: { photo: RugPhoto; y: number; rot: number; color?: string }) {
  const { tex } = usePhotoRug(photo, 3)
  // The folded edges show the pile from the side: the rug-pile photo, in the rug's ground colour.
  const pile = useSurface('pile', [3, 0.3])
  return (
    <mesh position={[0, y, 0]} rotation-y={rot} castShadow receiveShadow>
      <boxGeometry args={[0.82, 0.075, 0.82]} />
      {/* Faces: +x, -x, +y (the rug), -y, +z, -z. */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <meshStandardMaterial
          // Re-made once the photo arrives: a map added later would never reach the shader.
          key={`${i}-${tex ? 'tex' : 'plain'}`}
          attach={`material-${i}`}
          map={i === 2 ? tex?.map : pile}
          normalMap={i === 2 && tex ? tex.normalMap : undefined}
          color={i === 2 && tex ? '#ffffff' : color}
          roughness={0.95}
        />
      ))}
    </mesh>
  )
}

function LoomWithRug() {
  const { tex } = usePhotoRug(RUG_PHOTOS.redGul, 6)
  return (
    <group position={[0, 0.1, PAVILION.cz - 0.6]}>
      <Loom map={tex?.map ?? null} normalMap={tex?.normalMap ?? null} woven={0.46} />
    </group>
  )
}

/** Railings either side of the pavilion's front, with small rugs folded over them. */
function RailRugs() {
  const a = usePhotoRug(RUG_PHOTOS.tealMedallion, 3)
  const b = usePhotoRug(RUG_PHOTOS.ivoryMedallion, 3)
  const front = PAVILION.cz + PAVILION.halfD + 0.12
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (PAVILION.halfW - 0.35), 0.1, front]}>
          <Balustrade length={0.75} posts={5} />
          <DrapedRug map={(side < 0 ? a : b).tex?.map ?? null} normalMap={(side < 0 ? a : b).tex?.normalMap ?? null} width={0.62} />
        </group>
      ))}
    </>
  )
}

/** Light posts at the front of the courtyard that the festoon lights swag to. */
const LIGHT_POSTS: [number, number, number][] = [
  [-2.05, 0, 2.25],
  [2.15, 0, 2.2],
]
const POST_H = 2.05

/** The pavilion dressed as a rug shop: awning, curtains, plants, a name sign and festoon lights. */
function PavilionDecor() {
  const { cz, halfW, halfD, colH } = PAVILION
  const postWood = useSurface('wood', [1, 1.5])
  // The eave reaches ~1.48 m out from the pavilion's centre on every side.
  const eave = 1.46
  const awning = { width: halfW * 2 + 0.5, from: [colH - 0.02, eave - 0.06] as [number, number], out: 0.55, drop: 0.3 }
  const poleTop: [number, number] = [colH - 0.02 - awning.drop, cz + eave - 0.06 + awning.out]
  return (
    <>
      <group position={[0, 0, cz]}>
        <Awning {...awning} />
        <NameSign position={[0, colH + 0.41, halfD + 0.08]} />
        {/* A warm light on the sign after dark, and a glow at the top of each light post. */}
        <NightLight position={[0, colH + 0.62, halfD + 0.45]} color="#ffcf8a" intensity={0.9} distance={1.2} />
        {[-1, 1].map((s) => (
          <TiedCurtain key={s} position={[s * halfW, 0.1, halfD]} height={colH - 0.15} />
        ))}
        <FoldedCurtain position={[0, 0.1, -halfD + 0.08]} width={halfW * 2 - 0.22} height={colH - 0.25} />
        {/* Bougainvillea climbing the front right column; a smaller spray on the back left. */}
        <CutOut url="/textures/bougainvillea.png" position={[halfW + 0.06, colH + 0.02, halfD + 0.06]} height={1.5} aspect={414 / 768} rotationY={0.4} />
        <CutOut url="/textures/bougainvillea.png" position={[halfW - 0.04, colH - 0.5, halfD + 0.1]} height={0.9} aspect={414 / 768} rotationY={-0.6} />
        <CutOut url="/textures/bougainvillea.png" position={[-halfW - 0.05, colH + 0.02, -halfD - 0.05]} height={1.1} aspect={414 / 768} rotationY={1.1} />
        {/* Trailing plants hung from the eave's front corners. */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * (halfW + 0.3), colH - 0.03, halfD + 0.32]}>
            <mesh position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.12, 4]} />
              <meshStandardMaterial color="#8a7a62" />
            </mesh>
            <CutOut url="/textures/hanging-plant.png" position={[0, -0.1, 0]} height={0.7} aspect={432 / 768} rotationY={s * 0.5} />
          </group>
        ))}
      </group>
      {LIGHT_POSTS.map((p) => (
        <group key={p[0]} position={p}>
          <mesh position={[0, POST_H / 2, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.035, POST_H, 8]} />
            <meshStandardMaterial map={postWood} roughness={0.55} />
          </mesh>
          <mesh position={[0, POST_H + 0.03, 0]}>
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshStandardMaterial color="#c9a24f" metalness={0.8} roughness={0.35} />
          </mesh>
          <NightLight position={[0, POST_H - 0.05, 0]} color="#ffb86b" intensity={1.4} distance={2.6} />
        </group>
      ))}
      <StringLights
        spans={[
          [[-awning.width / 2, poleTop[0], poleTop[1]], [LIGHT_POSTS[0][0], POST_H, LIGHT_POSTS[0][2]]],
          [[awning.width / 2, poleTop[0], poleTop[1]], [LIGHT_POSTS[1][0], POST_H, LIGHT_POSTS[1][2]]],
          [[LIGHT_POSTS[0][0], POST_H, LIGHT_POSTS[0][2]], [LIGHT_POSTS[1][0], POST_H, LIGHT_POSTS[1][2]]],
          [[-halfW - 0.3, colH, cz + halfD + 0.3], [-2.3, 1.95, -0.6]],
          [[halfW + 0.3, colH, cz + halfD + 0.3], [2.35, 1.95, -0.45]],
        ]}
      />
    </>
  )
}

/** A lantern hung from its chain's top: touch it and it swings. */
function HangingLantern({ top, lamp, length, glow, light, phase }: { top: [number, number, number]; lamp: string; length: number; glow: string; light?: boolean; phase: number }) {
  return (
    <Swing position={top} phase={phase} idle={0.035}>
      <Piece url={MODELS.lamps} names={[`${lamp}_mesh`]} height={length} anchor="top" />
      <NightLight position={[0, -length + 0.14, 0]} color={glow} intensity={light ? 2.6 : 1.6} distance={3} glow={0.035} />
    </Swing>
  )
}

const UP = new Vector3(0, 1, 0)

/**
 * The camera: follows the tour (`progress`, a fractional chapter), eased between chapter views,
 * with a little drag-to-look that drifts back to the tour and a gentle idle orbit on the overview.
 */
function TourCamera({ progress, look, reduce, distance }: { progress: RefObject<number>; look: RefObject<{ yaw: number; pitch: number }>; reduce: boolean; distance: number }) {
  const { camera } = useThree()
  const v = useMemo(() => ({ pos: new Vector3(), tgt: new Vector3(), a: new Vector3(), b: new Vector3(), off: new Vector3(), right: new Vector3() }), [])
  const cur = useRef({ pos: new Vector3(...STOPS[0].camera), tgt: new Vector3(...STOPS[0].target) })
  useFrame(({ clock }, dt) => {
    const p = MathUtils.clamp(progress.current ?? 0, 0, STOPS.length - 1)
    const i0 = Math.floor(p)
    const i1 = Math.min(i0 + 1, STOPS.length - 1)
    const t = MathUtils.smootherstep(p - i0, 0, 1)
    v.pos.lerpVectors(v.a.set(...STOPS[i0].camera), v.b.set(...STOPS[i1].camera), t)
    v.tgt.lerpVectors(v.a.set(...STOPS[i0].target), v.b.set(...STOPS[i1].target), t)
    // Orbit the view about its target: idle drift on the overview, plus the visitor's drag.
    const idle = reduce ? 0 : Math.sin(clock.elapsedTime * 0.12) * 0.22 * Math.max(0, 1 - p)
    v.off.copy(v.pos).sub(v.tgt).multiplyScalar(distance)
    v.off.applyAxisAngle(UP, idle + (look.current?.yaw ?? 0))
    v.right.crossVectors(v.off, UP).normalize()
    v.off.applyAxisAngle(v.right, look.current?.pitch ?? 0)
    v.pos.copy(v.tgt).add(v.off)
    const k = reduce ? 1 : 1 - Math.exp(-dt * 4)
    cur.current.pos.lerp(v.pos, k)
    cur.current.tgt.lerp(v.tgt, k)
    camera.position.copy(cur.current.pos)
    camera.lookAt(cur.current.tgt)
  })
  return null
}

/** Frame offset: moves what the camera frames, so the island sits beside the page's text. */
function FrameShift({ shift }: { shift: [number, number] }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as PerspectiveCamera
    if (shift[0] === 0 && shift[1] === 0) cam.clearViewOffset()
    else cam.setViewOffset(size.width, size.height, -shift[0] * size.width, -shift[1] * size.height, size.width, size.height)
    cam.updateProjectionMatrix()
  }, [camera, size.width, size.height, shift])
  return null
}

function Marker({ stop, active, onGo }: { stop: Stop; active: boolean; onGo: (id: number) => void }) {
  if (!stop.at) return null
  return (
    <Html position={stop.at} center zIndexRange={[20, 0]}>
      <button
        type="button"
        onClick={() => onGo(stop.id)}
        aria-label={`Go to ${stop.id}: ${stop.title}`}
        aria-current={active ? 'step' : undefined}
        className="group flex h-11 w-11 items-center justify-center rounded-full"
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur transition-transform group-hover:scale-110 ${
            active ? 'scale-110 border-paper bg-paper text-ink' : 'border-paper/90 bg-ink/55 text-paper'
          }`}
        >
          {stop.id}
        </span>
      </button>
    </Html>
  )
}

export type CourtyardSceneProps = {
  /** The tour position: chapter number, fractional between chapters. Read every frame. */
  progress: RefObject<number>
  /** The chapter the page is on, for the markers. */
  chapter: number
  onGoTo: (chapter: number) => void
  /** Which photographed rug lies in front, and what touching it does. */
  rugIndex: number
  onNextRug: () => void
  reduceMotion: boolean
  onReady?: () => void
  shift?: [number, number]
  /** Phones: dragging scrolls the page instead of looking around. */
  touch?: boolean
  /** Pull every view back (narrow screens need more room around the subject). */
  distance?: number
}

function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => onReady?.(), [onReady])
  return null
}

export default function CourtyardScene({
  progress,
  chapter,
  onGoTo,
  rugIndex,
  onNextRug,
  reduceMotion,
  onReady,
  shift = [0, 0],
  touch = false,
  distance = 1,
}: CourtyardSceneProps) {
  // High tier: shadows and up to 1.75x pixels; low tier (or after frames drop): neither.
  const [degraded, setDegraded] = useState(false)
  const rich = detectTier() === 'high' && !degraded
  // Photographed rugs get the sheen material when the device can afford it.
  const rugTier = rich ? 'high' : 'low'
  // Drag to look around: offsets that spring back to the tour's view when let go.
  const look = useRef({ yaw: 0, pitch: 0 })
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null)
  useEffect(() => {
    let raf = 0
    const relax = () => {
      if (!drag.current) {
        look.current.yaw *= 0.95
        look.current.pitch *= 0.95
      }
      raf = requestAnimationFrame(relax)
    }
    raf = requestAnimationFrame(relax)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <Canvas
      shadows={rich}
      dpr={rich ? [1, 1.75] : 1}
      camera={{ position: STOPS[0].camera, fov: 36, near: 0.1, far: 60 }}
      gl={{ toneMapping: AgXToneMapping, alpha: true, antialias: true }}
      style={{ touchAction: touch ? 'pan-y' : 'none' }}
      onPointerDown={(e) => {
        if (touch) return
        drag.current = { x: e.clientX, y: e.clientY, yaw: look.current.yaw, pitch: look.current.pitch }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        look.current.yaw = MathUtils.clamp(d.yaw - (e.clientX - d.x) * 0.006, -0.9, 0.9)
        look.current.pitch = MathUtils.clamp(d.pitch - (e.clientY - d.y) * 0.004, -0.25, 0.35)
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
    >
      <PerformanceMonitor onDecline={() => setDegraded(true)} />
      <AdaptiveDpr pixelated />
      <FrameShift shift={shift} />
      <TourCamera progress={progress} look={look} reduce={reduceMotion} distance={distance} />
      {/* Soft image-based light, built from glowing panels (no files): a warm low sun, a pale sky and
          a dusky bounce, so wood, brass, glass and the rugs' pile pick up believable reflections. */}
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={3} color="#ffc58f" position={[-6, 3, 5]} scale={[6, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#dfe4ff" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#b07a8c" position={[5, 1, -5]} scale={[8, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      {/* Low evening sun from the front left: long warm shadows across the courtyard. */}
      <DayNight rich={rich} reduce={reduceMotion} />

      <Suspense fallback={null}>
        <Plinth />
        <Stones />
        <Pavilion />
        <PavilionDecor />
        <LoomWithRug />
        <RailRugs />
        <group position={[1.0, 0.1, PAVILION.cz + 0.15]} rotation-y={-0.35}>
          <SkeinRack />
        </group>
        <group position={[-0.75, 0.1, PAVILION.cz + 0.05]}>
          <Bolster band="#c9b48a" />
          <KilimPillow position={[0.05, 0.16, 0.12]} rotation={[-0.45, 0.15, 0]} />
          <Piece url={MODELS.lounge} names={['Pillow4_']} height={0.16} position={[-0.05, 0, 0.42]} rotationY={0.3} />
          <Piece url={MODELS.lounge} names={['Pillow1_']} height={0.09} position={[0.42, 0, 0.48]} rotationY={-0.4} />
        </group>
        <group position={[1.55, 0.1, PAVILION.cz - 0.45]}>
          <WoolBasket colors={[DYES[0], DYES[1], DYES[2], DYES[4], DYES[5]]} />
        </group>

        <FloorRug photo={RUG_PHOTO_LIST[rugIndex % RUG_PHOTO_LIST.length]} onTouch={onNextRug} tier={rugTier} />
        <Bounce position={[-0.55, 0.004, 1.75]}>
          <Piece url={MODELS.lounge} names={['Pillow2_']} height={0.12} />
        </Bounce>
        <Bounce position={[-1.3, 0, 1.35]}>
          <Pouf />
        </Bounce>
        <RugRollBundle photos={RUG_PHOTO_LIST.map((p) => p.url)} position={[-2.45, 0, 1.55]} />
        <HangingRug photo={RUG_PHOTOS.tealMedallion} position={[-2.3, 0, -0.6]} rotationY={0.65} tier={rugTier} />
        <HangingRug photo={RUG_PHOTOS.ivoryMedallion} position={[2.35, 0, -0.45]} rotationY={-0.55} tier={rugTier} />
        <HangingRug photo={RUG_PHOTOS.greenSunburst} position={[-0.9, 0, -2.75]} rotationY={0.15} longFt={5.6} tier={rugTier} />

        <group position={[-1.95, 0, 0.85]}>
          <FoldedRug photo={RUG_PHOTOS.greenMedallion} y={0.04} rot={0.08} color="#1f3a26" />
          <FoldedRug photo={RUG_PHOTOS.blueOval} y={0.115} rot={-0.12} color="#22305a" />
          <FoldedRug photo={RUG_PHOTOS.redGul} y={0.19} rot={0.2} color="#5a1414" />
          <Bounce height={1.2}>
            <FoldedRug photo={RUG_PHOTOS.redFloral} y={0.265} rot={-0.05} color="#6e1a1c" />
          </Bounce>
        </group>
        <RolledRug photo={RUG_PHOTOS.redFloral} position={[2.05, 0, 1.0]} rotationY={0.5} tier={rugTier} />
        <RolledRug photo={RUG_PHOTOS.blueOval} position={[2.45, 0, 0.3]} rotationY={0.35} tier={rugTier} />

        {/* Coloured-glass lanterns under the dome, and two on the ground. Hanging ones swing when touched. */}
        <HangingLantern top={[-0.6, PAVILION.colH - 0.02, PAVILION.cz + 0.35]} lamp="lamp1" length={0.62} glow="#ff9d3c" light phase={0} />
        <HangingLantern top={[0.6, PAVILION.colH - 0.02, PAVILION.cz + 0.25]} lamp="lamp2" length={0.78} glow="#e0533f" phase={1.3} />
        <HangingLantern top={[0.05, PAVILION.colH - 0.02, PAVILION.cz - 0.35]} lamp="lamp3" length={0.9} glow="#5967d6" light phase={2.1} />
        <HangingLantern top={[-0.25, PAVILION.colH - 0.02, PAVILION.cz + 0.6]} lamp="lamp4" length={0.5} glow="#4f9a52" phase={3.4} />
        <HangingLantern top={[0.95, PAVILION.colH - 0.02, PAVILION.cz - 0.5]} lamp="lamp5" length={0.66} glow="#f2b53c" phase={4.2} />
        <group position={[-1.2, 0.26, 1.95]}>
          <Lantern scale={1.4} light />
        </group>
        <group position={[1.55, 0.26, 2.0]}>
          <Lantern scale={1.2} glass="#f1a7a0" glow="#e0533f" />
        </group>

        <Bounce position={[-0.85, 0, 2.05]}>
          <Lota />
        </Bounce>
        <Bounce position={[-0.62, 0, 2.18]}>
          <Lota scale={0.8} />
        </Bounce>
        {/* A low octagonal table by the rug, with an oil lamp and candles; a ewer and a vase beside it. */}
        <OctagonTable position={[1.15, 0, 1.75]} rotationY={0.3} />
        <Piece url={MODELS.oilLamp} names={['Object_4', 'Object_6']} height={0.09} position={[1.08, 0.4, 1.68]} rotationY={0.9} />
        <Piece url={MODELS.lounge} names={['Candle1', 'Candle2', 'Candle3']} height={0.13} position={[1.27, 0.4, 1.86]} />
        <NightLight position={[1.15, 0.5, 1.66]} color="#ffb347" intensity={0.7} distance={1.4} glow={0.012} />
        <NightLight position={[1.27, 0.56, 1.86]} color="#ffc070" intensity={1.1} distance={1.8} glow={0.01} />
        <BrassEwer position={[1.6, 0, 1.45]} rotationY={-0.6} />
        <EnamelVase position={[-0.38, 0, 2.28]} />
        <Piece url={MODELS.lounge} names={['PotplantBase2', 'PlantLeaves2']} height={0.95} position={[-2.6, 0, 0]} />
        <Piece url={MODELS.lounge} names={['PotplantBase3', 'PlantLeaves3']} height={1.05} position={[2.75, 0, -1.4]} />
        <Piece url={MODELS.palm} names={['palm']} height={3.4} position={[2.35, 0, -2.0]} />
        <Piece url={MODELS.palm} names={['palm']} height={2.7} position={[-2.45, 0, -1.7]} rotationY={1.3} />

        {STOPS.map((s) => (
          <Marker key={s.id} stop={s} active={chapter === s.id} onGo={onGoTo} />
        ))}
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
