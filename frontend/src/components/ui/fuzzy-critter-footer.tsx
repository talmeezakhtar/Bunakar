import * as React from "react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js"
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js"

/**
 * The site footer with residents: soft, furry little balls of dyed wool drop in when the footer
 * scrolls into view, land with a squash, blink, follow the pointer, and can be grabbed, thrown
 * or clicked to hop. Adapted for Bunakar from the "fuzzy critter footer": the site's paper and
 * ink tokens and fonts, router links for the site's own pages, a rich bottom line (for credits),
 * and the creatures in the wool dye colours.
 *
 * It imports three.js, so the site loads it lazily (`common/Footer.tsx`) with the plain footer
 * standing in until it arrives, and on devices without 3D.
 */

export type CritterShape = "cloud" | "flower" | "cube" | "triangle" | "bean" | "puff"
export type CritterEyes = "pills" | "short" | "dashes" | "big"

export type Critter = {
  shape: CritterShape
  /** [root, tip] fur colours */
  colors: [string, string]
  eyes: CritterEyes
  /** Relative size, 0.5–1.8 */
  size?: number
}

export type FooterLink = { label: string; href: string }
export type FooterColumn = { title: string; links: FooterLink[] }

export type FuzzyCritterFooterProps = {
  /** The giant word along the bottom; it fits the footer width */
  wordmark?: string
  /** Small name over the tagline */
  name?: string
  tagline?: string
  columns?: FooterColumn[]
  legal?: FooterLink[]
  /** Left side of the bottom row: copyright, credits */
  copyright?: ReactNode
  /** The creatures that drop in, left to right */
  critters?: Critter[]
  /** Fall acceleration, stage px/s² */
  gravity?: number
  /** Restitution off the floor, walls and each other (0–0.9) */
  bounce?: number
  /** Breeze in the fur. 0 holds still. */
  wind?: number
  /** Fur strands per creature, as a multiple of 10 000 */
  density?: number
  /** Little synthesised blips on grab, click and landing */
  sound?: boolean
  volume?: number
  /** The wordmark arcs while the footer is partly on screen and straightens as it settles */
  curve?: boolean
  /** Now and then a resting creature hops on its own */
  idleHops?: boolean
  /** Label of the re-drop button. Empty string hides it. */
  dropLabel?: string
  onDrop?: () => void
  onCritterClick?: (shape: CritterShape) => void
  className?: string
}

const CSS =
  ".fcf-root{position:relative;overflow:hidden;width:100%;box-sizing:border-box;padding:44px clamp(20px,5vw,64px) 0;border-top:1px solid var(--color-line);background:var(--color-paper);color:var(--color-ink);font-family:var(--font-sans);-webkit-font-smoothing:antialiased}" +
  ".fcf-root *,.fcf-root *::before,.fcf-root *::after{box-sizing:border-box}" +
  ".fcf-top{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,2fr);gap:48px;max-width:72rem;margin:0 auto}" +
  ".fcf-name{margin:0;font-family:var(--font-logo);font-size:28px;line-height:1.2;font-weight:400;letter-spacing:.02em}" +
  ".fcf-tag{margin:8px 0 0;max-width:32ch;font-size:15px;line-height:1.5;color:var(--color-muted)}" +
  ".fcf-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}" +
  ".fcf-ct{margin:0 0 14px;font-size:13px;line-height:1.2;font-weight:600;color:var(--color-ink)}" +
  ".fcf-list{margin:0;padding:0;list-style:none}" +
  ".fcf-list li{margin:0;line-height:1.3}" +
  ".fcf-list li+li{margin-top:12px}" +
  ".fcf-link{position:relative;z-index:3;display:inline-flex;align-items:center;min-height:44px;color:var(--color-muted);text-decoration:none;font-size:15px;transition:color .2s ease}" +
  ".fcf-link:hover{color:var(--color-accent)}" +
  ".fcf-link:focus-visible,.fcf-again:focus-visible{outline:2px solid var(--color-accent);outline-offset:3px;border-radius:2px}" +
  ".fcf-bottom{position:relative;z-index:3;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:12px 24px;max-width:72rem;margin:32px auto 0;padding-top:16px;border-top:1px solid var(--color-line);font-size:13px;line-height:1.5;color:var(--color-muted)}" +
  ".fcf-bottom a{color:inherit;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--color-line-strong)}" +
  ".fcf-bottom a:hover{color:var(--color-accent)}" +
  ".fcf-note{max-width:60ch}" +
  ".fcf-legal{display:inline-flex;flex-wrap:wrap;align-items:baseline;gap:20px}" +
  ".fcf-legal .fcf-link{font-size:13px;text-decoration:none}" +
  ".fcf-again{margin:0;padding:0;border:0;background:none;font:inherit;line-height:inherit;color:var(--color-ink);cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--color-line-strong);transition:text-decoration-color .2s ease}" +
  ".fcf-again:hover{text-decoration-color:currentColor}" +
  ".fcf-word{position:relative;z-index:1;display:block;left:50%;width:max-content;margin:clamp(24px,4vw,64px) 0 0;padding:0 .065em .05em 0;transform:translateX(-50%);font-family:var(--font-logo);font-size:17vw;font-weight:400;letter-spacing:.01em;line-height:.82;white-space:nowrap;color:var(--color-ink);user-select:none;-webkit-user-select:none}" +
  ".fcf-ch{display:inline-block;transform-origin:50% 0}" +
  ".fcf-stage{position:absolute;left:0;right:0;top:0;bottom:0;z-index:2;pointer-events:none;opacity:0;transition:opacity .4s ease}" +
  ".fcf-stage.fcf-ready{opacity:1}" +
  ".fcf-canvas{position:absolute;inset:0;width:100%;height:100%;max-width:none;display:block}" +
  ".fcf-haze{position:absolute;left:0;right:0;top:0;height:150px;z-index:2;pointer-events:none}" +
  ".fcf-haze i{position:absolute;inset:0}" +
  ".fcf-haze i:nth-child(1){-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);-webkit-mask-image:linear-gradient(#000 0%,#000 55%,transparent 100%);mask-image:linear-gradient(#000 0%,#000 55%,transparent 100%)}" +
  ".fcf-haze i:nth-child(2){-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);-webkit-mask-image:linear-gradient(#000 0%,#000 30%,transparent 70%);mask-image:linear-gradient(#000 0%,#000 30%,transparent 70%)}" +
  ".fcf-haze i:nth-child(3){-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);-webkit-mask-image:linear-gradient(#000 0%,transparent 45%);mask-image:linear-gradient(#000 0%,transparent 45%)}" +
  ".fcf-haze::after{content:'';position:absolute;inset:0;background:linear-gradient(var(--color-paper),transparent 38%)}" +
  ".fcf-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}" +
  "@media (hover:hover) and (pointer:fine){.fcf-root.fcf-over{cursor:grab}.fcf-link{min-height:32px}}" +
  ".fcf-root.fcf-grab,.fcf-root.fcf-grab *{cursor:grabbing !important;user-select:none;-webkit-user-select:none}" +
  "@media (max-width:760px){.fcf-top{grid-template-columns:minmax(0,1fr);gap:20px}.fcf-cols{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}}" +
  "@media (prefers-reduced-motion:reduce){.fcf-stage,.fcf-link,.fcf-again{transition:none}}"

const DEFAULT_COLUMNS: FooterColumn[] = [
  { title: "Design", links: [{ label: "Start a rug", href: "/studio?new=1" }, { label: "Studio", href: "/studio" }, { label: "My designs", href: "/my-designs" }] },
  { title: "Bunakar", links: [{ label: "About", href: "/about" }, { label: "Pricing", href: "/pricing" }, { label: "FAQ", href: "/faq" }, { label: "Contact", href: "/contact" }] },
  { title: "Legal", links: [{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Cancellation", href: "/cancellation" }, { label: "Credits", href: "/credits" }] },
]
const DEFAULT_LEGAL: FooterLink[] = []
/** Six balls of dyed wool, in the courtyard's dye pots: madder, saffron, indigo, walnut, leaf, ivory. */
const DEFAULT_CRITTERS: Critter[] = [
  { shape: "cloud", colors: ["#c98f2a", "#f2cf7c"], eyes: "dashes", size: 1.08 },
  { shape: "flower", colors: ["#b5473c", "#f0a191"], eyes: "short", size: 0.86 },
  { shape: "cube", colors: ["#2f3a72", "#97a6e3"], eyes: "pills", size: 1.22 },
  { shape: "triangle", colors: ["#8f2c24", "#e0705f"], eyes: "short", size: 1.05 },
  { shape: "bean", colors: ["#4f6e3b", "#b6d59a"], eyes: "big", size: 0.96 },
  { shape: "puff", colors: ["#cbb895", "#fbf4e4"], eyes: "pills", size: 0.95 },
]

/** The site's own pages go through the router; anything else is a plain link. */
function FooterAnchor({ href, children }: { href: string; children: ReactNode }) {
  return href.startsWith("/") ? (
    <Link className="fcf-link" to={href}>
      {children}
    </Link>
  ) : (
    <a className="fcf-link" href={href}>
      {children}
    </a>
  )
}

// #region physics
// Screen-space 2D bodies in stage pixels: x right, y up from the stage bottom.
// Everything here is plain math so the test can lift it and run it as shipped.

/** r: round collision radius between bodies; wall: visual half-width, so wide shapes stop at the stage edge instead of poking past it */
export type Body = { x: number; y: number; vx: number; vy: number; a: number; va: number; r: number; wall: number; live: boolean; held: boolean; onFloor: boolean }
export type World = { w: number; h: number; floor: number; gravity: number; bounce: number }
export type Hand = { x: number; y: number }

/** Creature unit size in px for a stage width: one creature is ~1.36 units across. Phones get a smaller unit so all six fit side by side instead of stacking into the haze. */
export function unitFor(w: number) {
  return Math.max(40, Math.min(150, w < 640 ? w / 8.8 : w / 9.4))
}

/** Floor line, px above the stage bottom */
export function floorFor(unit: number) {
  return 10 + unit * 0.16
}

export function makeBody(r: number, wall = r): Body {
  return { x: 0, y: -9999, vx: 0, vy: 0, a: 0, va: 0, r, wall, live: false, held: false, onFloor: false }
}

/** Where the i-th of n creatures enters: above the stage top, spread across, falling and tumbling */
export function dropStart(b: Body, i: number, n: number, world: World, rnd: () => number) {
  const lane = (i + 0.5 + (rnd() - 0.5) * 0.6) / n
  b.live = true
  b.held = false
  b.onFloor = false
  b.x = Math.min(world.w - b.wall, Math.max(b.wall, lane * world.w))
  b.y = world.h + b.r + 40 + rnd() * 160
  b.vx = (rnd() - 0.5) * 140
  b.vy = -60 - rnd() * 120
  b.a = (rnd() - 0.5) * 1.2
  b.va = (rnd() - 0.5) * 3
}

/** Reduced motion: evenly spaced, resting on the floor, upright */
export function restInRow(bodies: Body[], world: World) {
  const gap = world.w / (bodies.length + 1)
  bodies.forEach((b, i) => {
    b.live = true
    b.x = gap * (i + 1)
    b.y = world.floor + b.r
    b.vx = b.vy = b.a = b.va = 0
    b.onFloor = true
  })
}

/** One substep. Returns landing strengths (0..1) by body index, for squash, fur shake and the thud. */
export function stepBodies(bodies: Body[], world: World, dt: number, hand: Hand | null): number[] {
  const impacts: number[] = []
  const e = Math.max(0, Math.min(0.9, world.bounce))
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    impacts[i] = 0
    if (!b.live) continue
    if (b.held && hand) {
      // a stiff spring to the hand, kept inside the stage
      const tx = Math.min(world.w - b.wall, Math.max(b.wall, hand.x))
      const ty = Math.min(world.h - b.r * 0.6, Math.max(world.floor + b.r, hand.y))
      b.vx = (tx - b.x) * 18
      b.vy = (ty - b.y) * 18
      b.va += (-b.vx * 0.00025 - b.va) * 4 * dt
    } else b.vy -= world.gravity * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.a += b.va * dt
    b.onFloor = false
    if (b.y - b.r < world.floor) {
      b.y = world.floor + b.r
      if (b.vy < -80) impacts[i] = Math.min(1, -b.vy / 1400)
      b.vy = -b.vy * e
      if (Math.abs(b.vy) < 60) b.vy = 0
      b.onFloor = true
      b.vx *= 1 - 3 * dt
      // rolling: spin follows the ground speed
      b.va += (-b.vx / b.r - b.va) * Math.min(1, 3 * dt)
    }
    if (b.x - b.wall < 0) { b.x = b.wall; b.vx = Math.abs(b.vx) * e }
    if (b.x + b.wall > world.w) { b.x = world.w - b.wall; b.vx = -Math.abs(b.vx) * e }
    b.va *= 1 - 0.6 * dt
    if (b.onFloor) {
      // sit back up: a spring toward upright on the shortest way round
      const tilt = Math.atan2(Math.sin(b.a), Math.cos(b.a))
      b.va += -tilt * 38 * dt
      b.va *= 1 - 4 * dt
    }
  }
  // soft discs: overlap pushed apart half each, closing speed reflected
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const p = bodies[i], q = bodies[j]
      if (!p.live || !q.live) continue
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), min = (p.r + q.r) * 0.92
      if (d <= 0 || d >= min) continue
      const nx = dx / d, ny = dy / d, half = (min - d) / 2
      p.x -= nx * half; p.y -= ny * half; q.x += nx * half; q.y += ny * half
      const closing = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny
      if (closing < 0) {
        const jn = (-(1 + e) * closing) / 2
        p.vx -= jn * nx; p.vy -= jn * ny; q.vx += jn * nx; q.vy += jn * ny
        const slide = (q.vx - p.vx) * -ny + (q.vy - p.vy) * nx
        p.va += slide * 0.002; q.va -= slide * 0.002
      }
    }
  }
  // a crowded row can shove a body back past a wall or into the floor: those have the last word
  for (const b of bodies) {
    if (!b.live) continue
    if (b.x - b.wall < 0) b.x = b.wall
    if (b.x + b.wall > world.w) b.x = world.w - b.wall
    if (b.y - b.r < world.floor) {
      b.y = world.floor + b.r
      if (b.vy < 0) b.vy = 0
    }
    // a held body can't be shoved up out of the stage by the crowd it's dragged into
    if (b.held && hand && b.y > world.h - b.r * 0.6) b.y = world.h - b.r * 0.6
  }
  return impacts
}

/** Topmost live body under a point (later bodies draw on top) */
export function bodyAt(bodies: Body[], x: number, y: number) {
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i]
    if (b.live && Math.hypot(b.x - x, b.y - y) < b.r * 0.95) return i
  }
  return -1
}

/** Wordmark arc for glyph i of n at bend w (0 = straight): em offsets and degrees */
export function arcFor(i: number, n: number, w: number) {
  const c = n > 1 ? (i / (n - 1)) * 2 - 1 : 0
  return { x: w * 0.14 * c, y: w * 0.2 * c * c, deg: w * 13 * c }
}

/** How far the footer still has to scroll in: 1 = just entering, 0 = fully on screen */
export function bendFor(top: number, height: number, viewport: number) {
  const seen = (viewport - top) / Math.max(1, height)
  return 1 - Math.min(1, Math.max(0, seen))
}
// #endregion

// ---------- creatures ----------

const FUR_VERT =
  "attribute vec3 aRoot;attribute vec3 aNrm;attribute vec4 aHair;" +
  "uniform float uTime,uWind,uJolt,uStroke;uniform vec3 uHand;" +
  "varying float vS;varying float vTint;varying vec3 vN;" +
  "void main(){" +
  "float s=position.y;float s2=s*s;vec3 n=normalize(aNrm);" +
  "vec3 ref=abs(n.y)<0.9?vec3(0.,1.,0.):vec3(1.,0.,0.);" +
  "vec3 u=normalize(cross(n,ref));vec3 v=cross(n,u);" +
  "float cs=cos(aHair.x),sn=sin(aHair.x);vec3 side=u*cs+v*sn;vec3 lean=v*cs-u*sn;" +
  "float len=aHair.y;" +
  "vec3 p=aRoot+side*position.x+n*s*len+lean*aHair.z*s2*len;" +
  "float sway=0.7*sin(uTime*1.1+dot(aRoot,vec3(1.6,1.2,1.4)))+0.3*sin(uTime*1.7+dot(aRoot,vec3(-2.,2.5,.6)));" +
  "vec3 wd=normalize(vec3(1.,0.,.45));wd-=n*dot(wd,n);" +
  "p+=wd*(sway*uWind*s2*len*.55);" +
  "p+=side*(sin(uTime*32.+aHair.w*40.)*uJolt*s2*len*.45);" +
  "vec3 off=aRoot-uHand;float f=uStroke*smoothstep(.42,0.,length(off));" +
  "vec3 tang=off-n*dot(off,n);tang=length(tang)>1e-4?normalize(tang):side;" +
  "p+=tang*(f*s2*len*1.5)-n*(f*s*len*.35);" +
  "vS=s;vTint=aHair.w;vN=normalize(mat3(modelMatrix)*n);" +
  "gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}"

const FUR_FRAG =
  "uniform vec3 uRoot,uMid,uTip,uSun;varying float vS;varying float vTint;varying vec3 vN;" +
  "void main(){" +
  "vec3 c=mix(uRoot,uMid,smoothstep(0.,.45,vS));c=mix(c,uTip,smoothstep(.5,1.,vS));" +
  "c*=.94+vTint*.12;" +
  "float lit=max(dot(normalize(vN),normalize(uSun)),0.)*.32+.8;" +
  "c*=lit*mix(.86,1.,smoothstep(0.,.5,vS));" +
  "gl_FragColor=vec4(c,1.);}"

/** [radius, length, tilt (rad), half spacing] of the two white eye pills */
const EYES: Record<CritterEyes, [number, number, number, number]> = {
  pills: [0.055, 0.11, 0, 0.13],
  short: [0.04, 0.06, 0, 0.1],
  dashes: [0.038, 0.13, 1.2, 0.15],
  big: [0.068, 0.11, 0, 0.115],
}
const EYE_LINE: Record<CritterShape, number> = { cloud: 0.05, flower: 0.05, cube: 0.05, triangle: -0.16, bean: 0.02, puff: -0.03 }

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Darken toward black by k, in display (sRGB) terms */
function darker(hex: string, k: number) {
  const s = { r: 0, g: 0, b: 0 }
  new THREE.Color(hex).getRGB(s, THREE.SRGBColorSpace)
  return new THREE.Color().setRGB(s.r * (1 - k), s.g * (1 - k), s.b * (1 - k), THREE.SRGBColorSpace)
}

function puffUp(outline: THREE.Shape) {
  const g = new THREE.ExtrudeGeometry(outline, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.1, bevelSegments: 6, curveSegments: 24 })
  g.center()
  return smooth(g)
}

function smooth(g: THREE.BufferGeometry) {
  g.deleteAttribute("normal")
  g.deleteAttribute("uv")
  const m = mergeVertices(g, 1e-3)
  m.computeVertexNormals()
  g.dispose()
  return m
}

function polar(radius: (t: number) => number, sx = 1, sy = 1, steps = 180) {
  const s = new THREE.Shape()
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * Math.PI * 2
    const r = radius(t)
    const x = Math.cos(t + Math.PI / 2) * r * sx, y = Math.sin(t + Math.PI / 2) * r * sy
    if (k) s.lineTo(x, y)
    else s.moveTo(x, y)
  }
  return s
}

function bodyGeometry(shape: CritterShape): THREE.BufferGeometry {
  if (shape === "cube") return new RoundedBoxGeometry(1, 1, 1, 8, 0.24)
  if (shape === "cloud") return puffUp(polar((t) => 0.5 + 0.055 * Math.cos(5 * t + 0.6) + 0.03 * Math.cos(3 * t + 1.4)))
  if (shape === "flower") return puffUp(polar((t) => 0.47 + 0.15 * Math.cos(5 * t)))
  if (shape === "puff") {
    const s = new THREE.Shape()
    for (let k = 0; k <= 200; k++) {
      const t = (k / 200) * Math.PI * 2
      const top = Math.min(1, Math.max(0, Math.sin(t) * 1.6)) // bumps only along the top
      const r = 0.46 + 0.08 * Math.cos(6 * t + Math.PI) * top
      const x = Math.cos(t) * r * 1.32, y = Math.sin(t) * r * 0.82
      if (k) s.lineTo(x, y)
      else s.moveTo(x, y)
    }
    return puffUp(s)
  }
  if (shape === "bean") {
    const s = new THREE.Shape(), half = 0.64, rad = 0.36
    s.moveTo(-half + rad, -rad)
    s.lineTo(half - rad, -rad * 0.92)
    s.absarc(half - rad, 0, rad * 0.97, -Math.PI / 2, Math.PI / 2, false)
    s.lineTo(-half + rad, rad)
    s.absarc(-half + rad, 0, rad, Math.PI / 2, (Math.PI * 3) / 2, false)
    return puffUp(s)
  }
  // rounded triangle: each corner replaced by a quadratic through the vertex
  const pts = [[0, 0.6], [-0.66, -0.46], [0.66, -0.46]], cut = 0.16, s = new THREE.Shape()
  pts.forEach((p, k) => {
    const prev = pts[(k + 2) % 3], next = pts[(k + 1) % 3]
    const lp = Math.hypot(prev[0] - p[0], prev[1] - p[1]), ln = Math.hypot(next[0] - p[0], next[1] - p[1])
    const a = [p[0] + ((prev[0] - p[0]) * cut) / lp, p[1] + ((prev[1] - p[1]) * cut) / lp]
    const b = [p[0] + ((next[0] - p[0]) * cut) / ln, p[1] + ((next[1] - p[1]) * cut) / ln]
    if (k) s.lineTo(a[0], a[1])
    else s.moveTo(a[0], a[1])
    s.quadraticCurveTo(p[0], p[1], b[0], b[1])
  })
  s.closePath()
  return puffUp(s)
}

/** Half the on-screen width of a body turned by its resting tilt and yaw */
function halfWidth(geo: THREE.BufferGeometry, tilt: number, yaw: number) {
  const pos = geo.getAttribute("position"), v = new THREE.Vector3(), turn = new THREE.Euler(tilt, yaw, 0)
  let m = 0
  for (let k = 0; k < pos.count; k++) m = Math.max(m, Math.abs(v.fromBufferAttribute(pos, k).applyEuler(turn).x))
  return m
}

/** One tapered card per strand: 5 segments, root at y=0, tip at y=1 */
function strandCard() {
  const segs = 5, pos: number[] = [], idx: number[] = []
  for (let k = 0; k <= segs; k++) {
    const t = k / segs, half = 0.019 * Math.pow(1 - t, 0.85) + 0.0008
    pos.push(-half, t, 0, half, t, 0)
  }
  for (let k = 0; k < segs; k++) {
    const a = k * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  return { pos, idx }
}

type Rig = {
  shape: CritterShape
  reach: number
  outer: THREE.Group
  inner: THREE.Group
  eyes: THREE.Group[]
  pupils: THREE.Mesh[]
  shadow: THREE.Mesh
  u: { uJolt: { value: number }; uStroke: { value: number }; uHand: { value: THREE.Vector3 } }
  k: number
  yaw: number
  spin: number
  spinV: number
  sq: number
  sqV: number
  jx: number
  jy: number
  jvx: number
  jvy: number
  blinkAt: number
  blink: number
  lastThud: number
}

export default function FuzzyCritterFooter({
  wordmark = "Buنakar",
  name = "Buنakar",
  tagline = "A rug design studio from India's carpet belt. Design it, see it as real wool, hand it to any weaver.",
  columns = DEFAULT_COLUMNS,
  legal = DEFAULT_LEGAL,
  copyright = "© Bunakar",
  critters = DEFAULT_CRITTERS,
  gravity = 2600,
  bounce = 0.32,
  wind = 1,
  density = 1,
  sound = true,
  volume = 0.4,
  curve = true,
  idleHops = true,
  dropLabel = "Drop the wool again",
  onDrop,
  onCritterClick,
  className,
}: FuzzyCritterFooterProps) {
  const rootRef = React.useRef(null as HTMLElement | null)
  const wordRef = React.useRef(null as HTMLDivElement | null)
  const stageRef = React.useRef(null as HTMLDivElement | null)
  const hazeRef = React.useRef(null as HTMLDivElement | null)
  const dropRef = React.useRef(() => {})
  const live = React.useRef({ onDrop, onCritterClick, sound, volume })
  React.useEffect(() => {
    live.current = { onDrop, onCritterClick, sound, volume }
  })
  const [ready, setReady] = React.useState(false)

  // ---- the scene: creatures, physics, pointer ----
  React.useEffect(() => {
    const root = rootRef.current, stage = stageRef.current
    if (!root || !stage) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let gl: THREE.WebGLRenderer
    try {
      gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    } catch {
      return // no WebGL: the footer still works, just without its residents
    }
    gl.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    gl.setClearColor(0x000000, 0)
    gl.domElement.className = "fcf-canvas"
    stage.appendChild(gl.domElement)
    const scene = new THREE.Scene()
    const cam = new THREE.OrthographicCamera(0, 1, 1, 0, -2000, 2000)
    cam.position.z = 1000
    const world: World = { w: 1, h: 1, floor: 10, gravity, bounce }
    let unit = 100

    const place = () => {
      const row = root.querySelector(".fcf-bottom") as HTMLElement | null
      const word = wordRef.current, haze = hazeRef.current
      if (row) {
        const top = row.offsetTop + row.offsetHeight + 6
        stage.style.top = top + "px"
        if (haze) {
          haze.style.top = top + "px"
          haze.style.height = Math.max(36, (word ? word.offsetTop : top + 150) - top - 4) + "px"
        }
      }
      world.w = Math.max(1, stage.clientWidth)
      world.h = Math.max(1, stage.clientHeight)
      gl.setSize(world.w, world.h, false)
      cam.right = world.w
      cam.top = world.h
      cam.updateProjectionMatrix()
      unit = unitFor(world.w)
      world.floor = floorFor(unit)
    }
    place()

    const clock = { value: 0 }
    const windU = { value: reduced ? 0 : wind }
    const sun = { value: new THREE.Vector3(0.4, 1, 0.8) }
    const blob = (() => {
      const c = document.createElement("canvas")
      c.width = c.height = 64
      const x = c.getContext("2d")
      if (x) {
        const g = x.createRadialGradient(32, 32, 2, 32, 32, 32)
        g.addColorStop(0, "rgba(40,26,16,0.34)")
        g.addColorStop(0.5, "rgba(40,26,16,0.14)")
        g.addColorStop(1, "rgba(40,26,16,0)")
        x.fillStyle = g
        x.fillRect(0, 0, 64, 64)
      }
      return new THREE.CanvasTexture(c)
    })()
    const card = strandCard()
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const strands = Math.round(10000 * Math.max(0.2, density) * (world.w < 640 ? 0.6 : 1))

    const bodies: Body[] = []
    const rigs: Rig[] = critters.map((spec, i) => {
      const k = Math.max(0.5, Math.min(1.8, spec.size ?? 1))
      const geo = bodyGeometry(spec.shape)
      geo.computeBoundingBox()
      const front = geo.boundingBox ? geo.boundingBox.max.z : 0.3
      const yaw = -0.22 + hash(i * 3.3) * 0.3
      const reach = halfWidth(geo, 0.16, yaw) + 0.24 // on-screen half-width, longest (curled) fur included
      const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(spec.colors[0]) }))
      const [er, el, tilt, gap] = EYES[spec.eyes]
      const eyeY = EYE_LINE[spec.shape]
      const clear = er + el / 2 + 0.09

      // fur roots sampled over the body; strands near the eyes are trimmed so the eyes sit in a dip
      const sampler = new MeshSurfaceSampler(core).build()
      const roots = new Float32Array(strands * 3), nrms = new Float32Array(strands * 3), hair = new Float32Array(strands * 4)
      const p = new THREE.Vector3(), n = new THREE.Vector3()
      for (let s = 0; s < strands; s++) {
        const seed = s * 7.13 + i * 97
        sampler.sample(p, n)
        n.normalize()
        let len = 0.15 * (0.86 + hash(seed + 3.1) * 0.28)
        if (n.z > 0.4 && p.z > front - 0.2) {
          const d = Math.min(Math.hypot(p.x - gap, p.y - eyeY), Math.hypot(p.x + gap, p.y - eyeY))
          if (d < clear) len *= 0.08 + 0.92 * (d / clear) ** 2
        }
        const bend = n.z > 0.55 ? (0.42 + hash(seed + 7.9) * 0.36) * Math.min(1, len / 0.12) : (hash(seed + 7.9) - 0.5) * 0.38
        roots.set([p.x, p.y, p.z], s * 3)
        nrms.set([n.x, n.y, n.z], s * 3)
        hair.set([hash(seed + 5.3) * Math.PI * 2, len, bend, hash(seed + 9.2)], s * 4)
      }
      const fg = new THREE.InstancedBufferGeometry()
      fg.setAttribute("position", new THREE.Float32BufferAttribute(card.pos, 3))
      fg.setIndex(card.idx)
      fg.setAttribute("aRoot", new THREE.InstancedBufferAttribute(roots, 3))
      fg.setAttribute("aNrm", new THREE.InstancedBufferAttribute(nrms, 3))
      fg.setAttribute("aHair", new THREE.InstancedBufferAttribute(hair, 4))
      fg.instanceCount = strands
      const u = { uJolt: { value: 0 }, uStroke: { value: 0 }, uHand: { value: new THREE.Vector3(9, 9, 9) } }
      // ShaderMaterial skips the output transform, so hand it display-space colours
      const disp = (c: THREE.Color) => c.clone().convertLinearToSRGB()
      const fur = new THREE.Mesh(
        fg,
        new THREE.ShaderMaterial({
          vertexShader: FUR_VERT,
          fragmentShader: FUR_FRAG,
          side: THREE.DoubleSide,
          uniforms: { uTime: clock, uWind: windU, uSun: sun, uRoot: { value: disp(darker(spec.colors[0], 0.2)) }, uMid: { value: disp(new THREE.Color(spec.colors[0])) }, uTip: { value: disp(new THREE.Color(spec.colors[1])) }, ...u },
        }),
      )
      fur.frustumCulled = false

      const face = new THREE.Group()
      face.position.set(0, eyeY, front + 0.13)
      const pill = new THREE.CapsuleGeometry(er, el, 6, 16)
      const eyes: THREE.Group[] = [], pupils: THREE.Mesh[] = []
      for (const side of [-1, 1]) {
        const lid = new THREE.Group()
        lid.position.x = side * gap
        const m = new THREE.Mesh(pill, white)
        m.rotation.z = -tilt
        m.scale.z = 0.45
        lid.add(m)
        face.add(lid)
        eyes.push(lid)
        pupils.push(m)
      }
      const inner = new THREE.Group()
      inner.add(core, fur, face)
      inner.rotation.set(0.16, yaw, 0)
      const outer = new THREE.Group()
      outer.add(inner)
      outer.scale.setScalar(unit * k)
      scene.add(outer)
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }))
      shadow.position.z = -900
      shadow.visible = false
      scene.add(shadow)
      bodies.push(makeBody(unit * 0.68 * k, unit * reach * k))
      return { shape: spec.shape, reach, outer, inner, eyes, pupils, shadow, u, k, yaw, spin: 0, spinV: 0, sq: 0, sqV: 0, jx: 0, jy: 0, jvx: 0, jvy: 0, blinkAt: 1 + hash(i * 5.5) * 4, blink: -1, lastThud: 0 }
    })

    // ---- sound: tiny synthesised blips, only after a gesture ----
    let audio: AudioContext | null = null
    const wake = () => {
      if (!live.current.sound) return
      try {
        if (!audio) audio = new AudioContext()
        if (audio.state === "suspended") void audio.resume()
      } catch {
        audio = null
      }
    }
    const blip = (from: number, to: number, dur: number, gain: number, type: OscillatorType = "sine") => {
      if (!audio || audio.state !== "running" || !live.current.sound) return
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain()
      const peak = Math.max(0, Math.min(1, live.current.volume)) * gain
      o.type = type
      o.frequency.setValueAtTime(from, t)
      o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(peak, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(audio.destination)
      o.start(t)
      o.stop(t + dur + 0.02)
    }
    const timers: number[] = []
    const later = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)) }

    // ---- dropping in ----
    const drop = () => {
      timers.forEach(clearTimeout)
      timers.length = 0
      if (reduced) {
        restInRow(bodies, world)
        live.current.onDrop?.()
        return
      }
      const start = performance.now()
      bodies.forEach((b, i) => {
        const at = i * 260 + Math.random() * 120
        if (!b.live) {
          b.y = -9999
          later(at, () => dropIn(i))
          return
        }
        // already here: hop up and out through the haze first, never blink out; drop back in on the same cadence
        later(i * 70, () => {
          if (held === i) release()
          b.onFloor = false
          b.vy = 1.25 * Math.sqrt(2 * world.gravity * Math.max(0, world.h - b.y + b.r * 1.5 + 60))
          b.vx += (Math.random() - 0.5) * 120
          b.va += (Math.random() - 0.5) * 6
          leaving[i] = start + 520 + at
        })
      })
      live.current.onDrop?.()
    }
    const dropIn = (i: number) => {
      leaving[i] = 0
      dropStart(bodies[i], i, bodies.length, world, Math.random)
      const r = rigs[i]
      r.spin = (Math.random() - 0.5) * 2
      r.spinV = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 4)
      r.sq = r.sqV = 0
    }
    const leaving = bodies.map(() => 0)
    dropRef.current = drop
    let dropped = false
    const watch = () => {
      if (dropped) return
      const r = root.getBoundingClientRect()
      if (bendFor(r.top, r.height, window.innerHeight) <= 0.015 || r.bottom <= window.innerHeight + 2) {
        dropped = true
        later(curve && !reduced ? 260 : 0, drop)
      }
    }
    window.addEventListener("scroll", watch, { passive: true })
    window.addEventListener("resize", watch)

    // ---- pointer: gaze, brushing, grab, throw, click-to-hop ----
    let hx = -1e4, hy = -1e4, hvx = 0, hvy = 0, lastMove = 0
    let held = -1, grabAt = { x: 0, y: 0 }, moved = false
    const local = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect()
      return { x: e.clientX - r.left, y: r.bottom - e.clientY }
    }
    const track = (e: PointerEvent) => {
      const p = local(e), now = performance.now(), dt = Math.max(8, now - lastMove) / 1000
      hvx = (p.x - hx) / dt
      hvy = (p.y - hy) / dt
      hx = p.x
      hy = p.y
      lastMove = now
      if (Math.abs(hvx) > 4000 || Math.abs(hvy) > 4000) hvx = hvy = 0
      if (held < 0) root.classList.toggle("fcf-over", bodyAt(bodies, p.x, p.y) >= 0)
    }
    const leave = () => {
      hx = hy = -1e4
      root.classList.remove("fcf-over")
    }
    const dragMove = (e: PointerEvent) => {
      track(e)
      if (Math.hypot(hx - grabAt.x, hy - grabAt.y) > 6) moved = true
    }
    const release = () => {
      window.removeEventListener("pointermove", dragMove)
      window.removeEventListener("pointerup", release)
      window.removeEventListener("pointercancel", release)
      root.classList.remove("fcf-grab")
      const i = held
      held = -1
      if (i < 0) return
      const b = bodies[i]
      b.held = false
      if (!moved) {
        // a click: hop
        b.vy = 950 + Math.random() * 250
        b.vx += (Math.random() - 0.5) * 300
        b.va += (Math.random() - 0.5) * 9
        b.onFloor = false
        blip(220, 520, 0.12, 0.35)
        later(90, () => blip(520, 240, 0.18, 0.25))
        live.current.onCritterClick?.(rigs[i].shape)
      } else {
        const v = Math.hypot(b.vx, b.vy), cap = 2600
        if (v > cap) { b.vx *= cap / v; b.vy *= cap / v }
      }
    }
    const grab = (e: PointerEvent) => {
      if (reduced || (e.target as Element).closest("a,button,input")) return
      const p = local(e), i = bodyAt(bodies, p.x, p.y)
      if (i < 0) return
      e.preventDefault()
      wake()
      blip(520, 980, 0.07, 0.35)
      held = i
      bodies[i].held = true
      grabAt = p
      moved = false
      hx = p.x
      hy = p.y
      root.classList.add("fcf-grab")
      window.addEventListener("pointermove", dragMove)
      window.addEventListener("pointerup", release)
      window.addEventListener("pointercancel", release)
    }
    root.addEventListener("pointermove", track)
    root.addEventListener("pointerleave", leave)
    root.addEventListener("pointerdown", grab)

    const ro = new ResizeObserver(() => {
      place()
      bodies.forEach((b, i) => {
        b.r = unit * 0.68 * rigs[i].k
        b.wall = unit * rigs[i].reach * rigs[i].k
        b.x = Math.min(world.w - b.wall, Math.max(b.wall, b.x))
        if (b.live && b.y - b.r < world.floor) b.y = world.floor + b.r
      })
      if (reduced && dropped) restInRow(bodies, world)
    })
    ro.observe(stage)
    ro.observe(root)

    // ---- frame loop, paused off screen ----
    let onScreen = false, raf = 0, last = performance.now(), time = 0, nextHop = 4
    const handLocal = new THREE.Vector3()
    const frame = (now: number) => {
      raf = 0
      if (!onScreen) return
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      time += dt
      clock.value = time
      if (!reduced) {
        const hand = held >= 0 ? { x: hx, y: hy } : null
        for (let s = 0; s < 3; s++) {
          const hits = stepBodies(bodies, world, dt / 3, hand)
          hits.forEach((h, i) => {
            if (h <= 0) return
            const r = rigs[i]
            r.u.uJolt.value = h
            r.sqV -= h * 9
            r.jvy -= h * 2.4
            const t = performance.now()
            if (h >= 0.12 && t - r.lastThud > 140) {
              r.lastThud = t
              blip(150 - r.k * 30, 60, 0.16, 0.5 * h, "triangle")
            }
          })
        }
        // re-drop: a body that has left through the top (fur and all) waits off stage for its turn to fall back in
        leaving.forEach((at, i) => {
          const b = bodies[i]
          if (at <= 0 || !b.live) return
          if (b.y - b.r * 1.5 > world.h || now > at + 400) {
            b.live = false
            b.y = -9999
            b.vx = b.vy = 0
            leaving[i] = -1
            later(Math.max(0, at - now), () => dropIn(i))
          }
        })
      }
      const aware = hx > -1000
      bodies.forEach((b, i) => {
        const r = rigs[i]
        r.shadow.visible = b.live
        r.outer.visible = b.live
        if (!b.live) return
        if (!reduced) {
          // brushing past ruffles the fur and nudges the body
          if (held < 0 && aware && Math.hypot(b.x - hx, b.y - hy) < b.r * 1.05) {
            b.vx += hvx * 0.06
            if (hvy > 0) b.vy += hvy * 0.05
            b.va -= hvx * 0.0006
            r.inner.worldToLocal(handLocal.set(hx, hy, unit * 0.5))
            r.u.uHand.value.copy(handLocal)
            r.u.uStroke.value = Math.min(1, r.u.uStroke.value + 0.2)
          }
          r.u.uStroke.value *= Math.pow(0.05, dt)
          r.u.uJolt.value *= Math.pow(0.03, dt)
          // blink every 2–6 s, 150 ms
          if (r.blink < 0 && time > r.blinkAt) r.blink = 0
          let lid = 1
          if (r.blink >= 0) {
            r.blink += dt / 0.15
            lid = 1 - Math.sin(Math.min(1, r.blink) * Math.PI) * 0.9
            if (r.blink >= 1) { r.blink = -1; r.blinkAt = time + 2 + Math.random() * 4 }
          }
          r.eyes.forEach((g) => (g.scale.y = lid))
          // eyes follow the pointer (in the body's own frame) and jiggle on landings
          const dx = aware ? hx - b.x : 0, dy = aware ? hy - b.y : 0, dist = Math.hypot(dx, dy) || 1
          const reach = aware ? Math.min(1, dist / 220) : 0
          const ca = Math.cos(-b.a), sa = Math.sin(-b.a)
          const gx = ((dx / dist) * ca - (dy / dist) * sa) * reach, gy = ((dx / dist) * sa + (dy / dist) * ca) * reach
          r.jvx += (-r.jx * 140 - r.jvx * 7 - b.vx * 0.0009) * dt
          r.jvy += (-r.jy * 140 - r.jvy * 7 - b.vy * 0.0009) * dt
          r.jx += r.jvx * dt
          r.jy += r.jvy * dt
          const range = 0.035
          r.pupils.forEach((m) => {
            let tx = gx * range + r.jx * range * 3, ty = gy * range + r.jy * range * 3
            const l = Math.hypot(tx, ty)
            if (l > range) { tx *= range / l; ty *= range / l }
            m.position.x += (tx - m.position.x) * Math.min(1, dt * 14)
            m.position.y += (ty - m.position.y) * Math.min(1, dt * 14)
          })
          r.inner.rotation.x = 0.16 - gy * 0.12
          r.inner.rotation.y = r.yaw + r.spin + gx * 0.18
          if (b.onFloor || b.y - b.r < world.floor + 3) r.spinV += (-r.spin * 60 - r.spinV * 9) * dt
          else r.spinV *= 1 - 0.3 * dt
          r.spin += r.spinV * dt
          // stretch while falling, squash on landing
          const target = b.onFloor ? 0 : Math.min(0.14, Math.abs(b.vy) / 6000)
          r.sqV += ((target - r.sq) * 220 - r.sqV * 11) * dt
          r.sq += r.sqV * dt
        }
        const breath = reduced ? 1 : 1 + Math.sin(time * 2 + b.r) * 0.015
        const sy = breath * (1 + r.sq), sx = (2 - breath) * (1 - r.sq * 0.55)
        r.outer.position.set(b.x, b.y - (1 - sy) * b.r * 0.55, 0)
        r.outer.rotation.z = b.a
        r.outer.scale.set(unit * r.k * sx, unit * r.k * sy, unit * r.k)
        const lift = Math.max(0, b.y - b.r - world.floor)
        r.shadow.position.set(b.x, world.floor - 1, -900)
        r.shadow.scale.set(b.r * 2.1 * (1 - Math.min(0.55, lift / 500)), b.r * 0.42, 1)
        ;(r.shadow.material as THREE.MeshBasicMaterial).opacity = 0.9 - Math.min(0.75, lift / 420)
      })
      hvx *= 0.6
      hvy *= 0.6
      if (idleHops && !reduced && time > nextHop) {
        nextHop = time + 3.5 + Math.random() * 3
        const resting = bodies.filter((b) => b.live && b.onFloor && !b.held)
        const b = resting[Math.floor(Math.random() * resting.length)]
        if (b) { b.vy = 650 + Math.random() * 300; b.va += (Math.random() - 0.5) * 5 }
      }
      gl.render(scene, cam)
      raf = requestAnimationFrame(frame)
    }
    const io = new IntersectionObserver(([en]) => {
      onScreen = en.isIntersecting
      if (onScreen) watch()
      if (onScreen && !raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }, { threshold: [0, 0.2, 0.4] })
    io.observe(root)
    setReady(true)

    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener("scroll", watch)
      window.removeEventListener("resize", watch)
      root.removeEventListener("pointermove", track)
      root.removeEventListener("pointerleave", leave)
      root.removeEventListener("pointerdown", grab)
      window.removeEventListener("pointermove", dragMove)
      window.removeEventListener("pointerup", release)
      window.removeEventListener("pointercancel", release)
      root.classList.remove("fcf-over", "fcf-grab")
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat?.dispose()
      })
      blob.dispose()
      gl.dispose()
      gl.forceContextLoss()
      gl.domElement.remove()
      if (audio) void audio.close()
      setReady(false)
    }
  }, [critters, gravity, bounce, wind, density, idleHops, curve])

  // ---- the wordmark fills the footer width ----
  React.useEffect(() => {
    const word = wordRef.current, root = rootRef.current
    if (!word || !root) return
    const fit = () => {
      word.style.fontSize = "100px"
      const natural = word.scrollWidth
      if (natural > 0) word.style.fontSize = Math.max(40, (100 * root.clientWidth * 0.965) / natural) + "px"
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    let alive = true
    document.fonts?.ready.then(() => { if (alive) fit() }).catch(() => {})
    return () => { alive = false; ro.disconnect() }
  }, [wordmark])

  // ---- the arc: eased toward the scroll position, straight once the footer is all in ----
  React.useEffect(() => {
    const word = wordRef.current, root = rootRef.current
    if (!word || !root || !curve || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const glyphs = Array.from(word.querySelectorAll(".fcf-ch")) as HTMLElement[]
    let bend = 1, raf = 0
    const aim = () => {
      const r = root.getBoundingClientRect()
      return bendFor(r.top, r.height, window.innerHeight)
    }
    const paint = (w: number) => {
      glyphs.forEach((g, i) => {
        const a = arcFor(i, glyphs.length, w)
        g.style.transform = w < 1e-3 ? "" : "translate(" + a.x.toFixed(4) + "em," + a.y.toFixed(4) + "em) rotate(" + a.deg.toFixed(2) + "deg)"
      })
    }
    const tick = () => {
      raf = 0
      const goal = aim()
      bend += (goal - bend) * 0.14
      if (Math.abs(goal - bend) < 1e-3) bend = goal
      paint(bend)
      if (bend !== goal) raf = requestAnimationFrame(tick)
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick) }
    bend = aim()
    paint(bend)
    window.addEventListener("scroll", kick, { passive: true })
    window.addEventListener("resize", kick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", kick)
      window.removeEventListener("resize", kick)
      glyphs.forEach((g) => (g.style.transform = ""))
    }
  }, [wordmark, curve])

  return (
    <footer ref={rootRef} className={"fcf-root" + (className ? " " + className : "")}>
      <style>{CSS}</style>
      <div className="fcf-top">
        <div>
          <p className="fcf-name">{name}</p>
          <p className="fcf-tag">{tagline}</p>
        </div>
        <nav className="fcf-cols" aria-label="Footer">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="fcf-ct">{col.title}</p>
              <ul className="fcf-list">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <FooterAnchor href={l.href}>{l.label}</FooterAnchor>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="fcf-bottom">
        <span className="fcf-note">{copyright}</span>
        <span className="fcf-legal">
          {legal.map((l) => (
            <FooterAnchor key={l.label} href={l.href}>
              {l.label}
            </FooterAnchor>
          ))}
          {dropLabel ? (
            <button type="button" className="fcf-again" onClick={() => dropRef.current()}>{dropLabel}</button>
          ) : null}
        </span>
      </div>
      <div ref={wordRef} className="fcf-word" aria-label={wordmark.replace("ن", "n")} role="img">
        {Array.from(wordmark).map((ch, i) => (
          <span key={i} className="fcf-ch" aria-hidden="true">{ch}</span>
        ))}
      </div>
      <div ref={stageRef} className={"fcf-stage" + (ready ? " fcf-ready" : "")} aria-hidden="true" />
      <div ref={hazeRef} className="fcf-haze" aria-hidden="true"><i /><i /><i /></div>
      <p className="fcf-sr">Six fuzzy balls of dyed wool sit along the bottom of the footer. Drag them around, or click one to make it hop.</p>
    </footer>
  )
}
