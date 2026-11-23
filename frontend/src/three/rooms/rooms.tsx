import type { ReactNode } from 'react'
import type { RugCategory } from '../../types/tileDesign'
import {
  Armchair,
  Art,
  Bed,
  Bench,
  Books,
  Bookshelf,
  Clock,
  Curtains,
  CoatRail,
  CoffeeTable,
  Console,
  Desk,
  DeskThings,
  DiningSet,
  Door,
  FloorLamp,
  Flowers,
  Mirror,
  Nightstand,
  Pendant,
  Plant,
  Pouf,
  Sconce,
  Shoes,
  SideTable,
  Socket,
  Sofa,
  Suitcase,
  TableSettings,
  Window,
} from './kit'
import type { FloorKind } from './kit'

/**
 * The 3D rooms. Each one is built from the kit around the rug: it is given the rug's real size and
 * sizes itself (and places its furniture) so the rug sits where it would in life - under the
 * coffee table, under the foot of the bed, the length of a hallway, wall to wall. Rooms share
 * components; colour schemes make them distinct.
 */

/** The rug as the room sees it, metres, long side along x (rooms turn it to suit). */
export type RugFit = { long: number; short: number }

export type BuiltRoom = {
  w: number
  d: number
  floor: FloorKind
  wall?: string
  accentWall?: string
  rug: { position: [number, number, number]; rotationY: number }
  /** True when the rug's long side should run along x (the default) or along z. */
  content: ReactNode
}

export type RoomDef = {
  id: string
  name: string
  setting: string
  /** Rug types this room shows best; matching rooms come first in the carousel. */
  fits: RugCategory[]
  build: (rug: RugFit) => BuiltRoom
}

type Scheme = { wall: string; accent: string; sofa: string; chair: string; art: string[] }

const SCHEMES: Record<string, Scheme> = {
  sage: { wall: '#f1efe8', accent: '#cdd5c3', sofa: '#8a9384', chair: '#c9a27a', art: ['#c98b5e', '#2f3a72', '#e2c79a'] },
  terracotta: { wall: '#f4ede4', accent: '#e4bea6', sofa: '#c9774f', chair: '#e8dcc6', art: ['#2f3a72', '#d9a13b', '#5f7a45'] },
  indigo: { wall: '#eeeef0', accent: '#46527a', sofa: '#d9cdb8', chair: '#2f3a72', art: ['#d9a13b', '#e8e2d6', '#a8352b'] },
  blush: { wall: '#f6efec', accent: '#ecd2c9', sofa: '#e9dccb', chair: '#b98e7a', art: ['#7e8c76', '#c9774f', '#2a2420'] },
  ochre: { wall: '#f3efe6', accent: '#e8cf9b', sofa: '#6f7d68', chair: '#d6b98f', art: ['#a8352b', '#2f3a72', '#efe4cf'] },
}

const clampMin = (v: number, min: number) => Math.max(min, v)

/** Living room: sofa against the back wall, the rug in front with the coffee table on it. */
function living(id: string, name: string, scheme: Scheme, floor: FloorKind, round = false): RoomDef {
  return {
    id,
    name,
    setting: 'Living room',
    fits: ['area'],
    build: ({ long, short }) => {
      const w = clampMin(long + 2.4, 4.8)
      const d = clampMin(short + 2.6, 4.4)
      const rugZ = -d / 2 + 0.9 + short / 2
      const sofaW = Math.min(2.6, Math.max(1.8, long * 0.75))
      return {
        w,
        d,
        floor,
        wall: scheme.wall,
        accentWall: scheme.accent,
        rug: { position: [0, 0.012, rugZ], rotationY: Math.PI / 2 },
        content: (
          <>
            <Sofa position={[0, 0, -d / 2 + 0.55]} color={scheme.sofa} width={sofaW} />
            <Armchair position={[long / 2 + 0.15, 0, rugZ]} rotationY={-Math.PI / 2} color={scheme.chair} />
            <Armchair position={[-long / 2 - 0.15, 0, rugZ]} rotationY={Math.PI / 2} color={scheme.chair} />
            <CoffeeTable position={[0, 0.012, rugZ]} round={round} />
            <SideTable position={[sofaW / 2 + 0.4, 0, -d / 2 + 0.5]} />
            <FloorLamp position={[-w / 2 + 0.45, 0, -d / 2 + 0.45]} />
            <Plant position={[w / 2 - 0.5, 0, -d / 2 + 0.5]} />
            <Art position={[0, 1.55, -d / 2 + 0.02]} w={Math.min(1.6, sofaW * 0.6)} colors={scheme.art} />
            <Window position={[-w / 2 + 0.01, 1.45, rugZ]} w={Math.min(2, d * 0.45)} />
            <Curtains position={[-w / 2 + 0.01, 0, rugZ]} span={Math.min(2, d * 0.45)} color={scheme.wall === '#f1efe8' ? '#e6e0d2' : '#efe6d6'} />
            <Books position={[-0.25, 0.43, rugZ + 0.05]} rotationY={0.3} />
            <Flowers position={[0.3, 0.43, rugZ - 0.05]} color={scheme.art[0]} />
            <Flowers position={[sofaW / 2 + 0.4, 0.55, -d / 2 + 0.5]} color={scheme.art[1]} />
            <Pouf position={[long / 2 - 0.2, 0, rugZ + short / 2 + 0.1]} color={scheme.art[2]} />
            <Socket position={[sofaW / 2 + 0.8, 0.3, -d / 2 + 0.005]} />
            <Clock position={[w / 2 - 0.9, 1.9, -d / 2 + 0.03]} />
          </>
        ),
      }
    },
  }
}

/** Bedroom: bed against the back wall, the rug under its lower two-thirds and beyond. */
function bedroom(id: string, name: string, scheme: Scheme, floor: FloorKind): RoomDef {
  return {
    id,
    name,
    setting: 'Bedroom',
    fits: ['area'],
    build: ({ long, short }) => {
      const bedW = 1.6
      const bedL = 2.05
      const w = clampMin(long + 2.2, 4.4)
      const d = clampMin(bedL * 0.5 + short + 1.6, 4.6)
      const bedZ = -d / 2 + bedL / 2 + 0.05
      const rugZ = bedZ + bedL * 0.18 + short * 0.18
      return {
        w,
        d,
        floor,
        wall: scheme.wall,
        accentWall: scheme.accent,
        rug: { position: [0, 0.012, rugZ], rotationY: Math.PI / 2 },
        content: (
          <>
            <Bed position={[0, 0.012, bedZ]} width={bedW} length={bedL} />
            <Nightstand position={[-bedW / 2 - 0.4, 0, -d / 2 + 0.3]} />
            <Nightstand position={[bedW / 2 + 0.4, 0, -d / 2 + 0.3]} />
            <Bench position={[0, 0.012, bedZ + bedL / 2 + 0.35]} width={Math.min(1.3, bedW)} />
            <Plant position={[w / 2 - 0.5, 0, -d / 2 + 0.5]} scale={0.9} />
            <Armchair position={[-w / 2 + 0.7, 0, d / 2 - 1]} rotationY={Math.PI / 4} color={scheme.chair} />
            <Art position={[0, 1.7, -d / 2 + 0.02]} w={1.2} h={0.5} colors={scheme.art} />
            <Window position={[-w / 2 + 0.01, 1.45, 0]} w={1.6} />
            <Curtains position={[-w / 2 + 0.01, 0, 0]} span={1.6} color={scheme.accent} />
            <Books position={[-bedW / 2 - 0.52, 0.53, -d / 2 + 0.25]} count={2} />
            <Flowers position={[bedW / 2 + 0.55, 0.53, -d / 2 + 0.25]} color={scheme.art[1]} />
            <Sconce position={[-bedW / 2 - 0.4, 1.35, -d / 2 + 0.01]} />
            <Sconce position={[bedW / 2 + 0.4, 1.35, -d / 2 + 0.01]} />
            <Shoes position={[0.5, 0.012, bedZ + bedL / 2 + 0.75]} rotationY={0.3} />
            <Mirror position={[w / 2 - 0.9, 1.5, -d / 2 + 0.03]} r={0.35} />
            <Socket position={[bedW / 2 + 0.75, 0.3, -d / 2 + 0.005]} />
          </>
        ),
      }
    },
  }
}

/** Dining room: the table and chairs sit fully on the rug. */
function dining(id: string, name: string, scheme: Scheme, floor: FloorKind): RoomDef {
  return {
    id,
    name,
    setting: 'Dining room',
    fits: ['area'],
    build: ({ long, short }) => {
      const w = clampMin(long + 2.2, 4.6)
      const d = clampMin(short + 2.2, 4.2)
      const tableL = Math.max(1.2, Math.min(2.6, long - 1.2))
      const seats = tableL > 2.1 ? 8 : tableL > 1.5 ? 6 : 4
      return {
        w,
        d,
        floor,
        wall: scheme.wall,
        accentWall: scheme.accent,
        rug: { position: [0, 0.012, 0.15], rotationY: Math.PI / 2 },
        content: (
          <>
            <DiningSet position={[0, 0.012, 0.15]} length={tableL} seats={seats} />
            <Pendant position={[0, 1.95, 0.15]} />
            <Console position={[0, 0, -d / 2 + 0.25]} width={Math.min(2, w * 0.4)} />
            <Art position={[0, 1.6, -d / 2 + 0.02]} w={1.1} colors={scheme.art} />
            <Plant position={[w / 2 - 0.5, 0, -d / 2 + 0.5]} />
            <Plant position={[-w / 2 + 0.5, 0, -d / 2 + 0.5]} scale={0.8} />
            <Window position={[-w / 2 + 0.01, 1.45, 0.15]} w={1.6} />
            <Curtains position={[-w / 2 + 0.01, 0, 0.15]} span={1.6} color={scheme.accent} />
            <TableSettings position={[0, 0.012, 0.15]} length={tableL} seats={seats} />
            <Flowers position={[Math.min(2, w * 0.4) * 0.3, 0.82, -d / 2 + 0.25]} color={scheme.art[0]} />
            <Sconce position={[-0.9, 1.7, -d / 2 + 0.01]} />
            <Sconce position={[0.9, 1.7, -d / 2 + 0.01]} />
          </>
        ),
      }
    },
  }
}

/** Hallway: a runner the length of a long, narrow corridor. */
function hallway(id: string, name: string, scheme: Scheme, floor: FloorKind): RoomDef {
  return {
    id,
    name,
    setting: 'Hallway',
    fits: ['runner'],
    build: ({ long, short }) => {
      const w = clampMin(long + 1.8, 4)
      const d = clampMin(short + 1.4, 1.9)
      return {
        w,
        d,
        floor,
        wall: scheme.wall,
        accentWall: scheme.accent,
        rug: { position: [0.2, 0.012, 0.15], rotationY: Math.PI / 2 },
        content: (
          <>
            <Console position={[-w / 2 + 1.3, 0, -d / 2 + 0.22]} width={1.2} />
            <Art position={[-w / 2 + 1.3, 1.55, -d / 2 + 0.02]} w={0.8} h={0.55} colors={scheme.art} />
            <Door position={[w * 0.1, 0, -d / 2 + 0.03]} />
            <CoatRail position={[w / 2 - 1.1, 1.75, -d / 2 + 0.03]} />
            <Bench position={[w / 2 - 1.1, 0, -d / 2 + 0.25]} width={1} />
            <Plant position={[-w / 2 + 0.35, 0, -d / 2 + 0.35]} scale={0.85} />
            <Mirror position={[w * 0.1 + 1.1, 1.5, -d / 2 + 0.03]} r={0.32} />
            <Shoes position={[w / 2 - 1.35, 0.012, -d / 2 + 0.6]} rotationY={0.2} />
            <Shoes position={[w / 2 - 0.85, 0.012, -d / 2 + 0.62]} rotationY={-0.25} color="#2a2420" />
            <Flowers position={[-w / 2 + 1.0, 0.82, -d / 2 + 0.22]} color={scheme.art[0]} />
            <Sconce position={[-w / 2 + 2.3, 1.75, -d / 2 + 0.01]} />
            <Socket position={[w * 0.1 + 0.8, 0.3, -d / 2 + 0.005]} />
          </>
        ),
      }
    },
  }
}

/** Study: a desk by the window and a bookcase; wall-to-wall rugs fill the whole floor. */
function study(id: string, name: string, scheme: Scheme, floor: FloorKind): RoomDef {
  return {
    id,
    name,
    setting: 'Home office',
    fits: ['wall', 'area'],
    build: ({ long, short }) => {
      // Wall to wall: the room is the rug's size (with a floor of at least 3 x 3 m).
      const w = clampMin(long, 3.2)
      const d = clampMin(short, 3)
      return {
        w,
        d,
        floor,
        wall: scheme.wall,
        accentWall: scheme.accent,
        rug: { position: [0, 0.012, 0], rotationY: Math.PI / 2 },
        content: (
          <>
            <Desk position={[-w / 2 + 1.0, 0.012, 0]} rotationY={Math.PI / 2} />
            <Bookshelf position={[w / 2 - 0.9, 0.012, -d / 2 + 0.2]} width={Math.min(1.4, w * 0.35)} />
            <Armchair position={[w / 2 - 0.7, 0.012, d / 2 - 0.8]} rotationY={-Math.PI * 0.75} color={scheme.chair} />
            <FloorLamp position={[w / 2 - 0.25, 0.012, d / 2 - 0.25]} />
            <Plant position={[-w / 2 + 0.4, 0.012, -d / 2 + 0.4]} scale={0.9} />
            <Window position={[-w / 2 + 0.01, 1.45, 0]} w={Math.min(1.8, d * 0.55)} />
            <Art position={[-0.2, 1.6, -d / 2 + 0.02]} w={0.9} colors={scheme.art} />
            <Curtains position={[-w / 2 + 0.01, 0, 0]} span={Math.min(1.8, d * 0.55)} color={scheme.accent} />
            <DeskThings position={[-w / 2 + 1.0, 0.012, 0]} rotationY={Math.PI / 2} />
            <Clock position={[w / 2 - 0.9, 2.0, -d / 2 + 0.03]} />
            <Books position={[w / 2 - 0.45, 0.012, d / 2 - 0.25]} count={4} />
          </>
        ),
      }
    },
  }
}

/** Hotel lobby: a seating group across a large rug on marble, with planters and pendants. */
function lobby(id: string, name: string, scheme: Scheme): RoomDef {
  return {
    id,
    name,
    setting: 'Hotel lobby',
    fits: ['wall', 'area'],
    build: ({ long, short }) => {
      const w = clampMin(long + 4, 8)
      const d = clampMin(short + 4, 7)
      return {
        w,
        d,
        floor: 'marble',
        wall: scheme.wall,
        accentWall: scheme.accent,
        rug: { position: [0, 0.012, 0.3], rotationY: Math.PI / 2 },
        content: (
          <>
            <Sofa position={[0, 0, 0.3 - short / 2 + 0.2]} color={scheme.sofa} width={Math.min(2.8, long * 0.7)} />
            <Sofa position={[0, 0, 0.3 + short / 2 - 0.2]} rotationY={Math.PI} color={scheme.sofa} width={Math.min(2.8, long * 0.7)} />
            <Armchair position={[long / 2 - 0.3, 0.012, 0.3]} rotationY={-Math.PI / 2} color={scheme.chair} />
            <CoffeeTable position={[0, 0.012, 0.3]} round />
            <Pendant position={[-0.8, 2.3, 0.3]} color="#b8913f" />
            <Pendant position={[0.8, 2.3, 0.3]} color="#b8913f" />
            {/* Reception desk on the back wall. */}
            <group position={[w / 4, 0, -d / 2 + 0.7]}>
              <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.6, 1.1, 0.7]} />
                <meshStandardMaterial color="#5a3b28" roughness={0.5} />
              </mesh>
              <mesh position={[0, 1.13, 0.04]} castShadow>
                <boxGeometry args={[2.8, 0.06, 0.85]} />
                <meshStandardMaterial color="#ece7df" roughness={0.25} />
              </mesh>
            </group>
            <Plant position={[-w / 2 + 0.6, 0, -d / 2 + 0.6]} scale={1.4} />
            <Plant position={[w / 2 - 0.6, 0, -d / 2 + 0.6]} scale={1.4} />
            <Plant position={[-w / 2 + 0.6, 0, d / 2 - 0.6]} scale={1.2} />
            <Art position={[-w / 4, 1.7, -d / 2 + 0.02]} w={2} h={1.1} colors={scheme.art} />
            <Flowers position={[w / 4 - 0.9, 1.16, -d / 2 + 0.65]} color={scheme.art[1]} />
            <Flowers position={[0.15, 0.43, 0.3]} color={scheme.art[0]} />
            <Suitcase position={[w / 4 + 1.8, 0, -d / 2 + 1.3]} rotationY={-0.4} />
            <Suitcase position={[w / 4 + 2.25, 0, -d / 2 + 1.2]} rotationY={0.2} color="#2f3a72" />
            <Sconce position={[-w / 4 - 1.4, 1.8, -d / 2 + 0.01]} />
            <Sconce position={[-w / 4 + 1.4, 1.8, -d / 2 + 0.01]} />
            <Clock position={[w / 4, 2.1, -d / 2 + 0.03]} />
          </>
        ),
      }
    },
  }
}

/** Reading corner: an armchair, lamp and bookcase - for small rugs. */
function nook(id: string, name: string, scheme: Scheme, floor: FloorKind): RoomDef {
  return {
    id,
    name,
    setting: 'Reading corner',
    fits: ['area'],
    build: ({ long, short }) => {
      const w = clampMin(long + 1.6, 3.4)
      const d = clampMin(short + 1.6, 3.2)
      return {
        w,
        d,
        floor,
        wall: scheme.wall,
        accentWall: scheme.accent,
        rug: { position: [0, 0.012, 0], rotationY: Math.PI / 2 },
        content: (
          <>
            <Armchair position={[-0.3, 0.012, -0.1]} rotationY={0.4} color={scheme.chair} />
            <SideTable position={[0.45, 0.012, -0.3]} />
            <FloorLamp position={[-w / 2 + 0.4, 0, -d / 2 + 0.4]} />
            <Bookshelf position={[w / 2 - 0.8, 0, -d / 2 + 0.2]} width={1.1} />
            <Plant position={[-w / 2 + 0.4, 0, d / 2 - 0.5]} scale={0.8} />
            <Window position={[-w / 2 + 0.01, 1.45, 0.2]} w={1.3} />
            <Curtains position={[-w / 2 + 0.01, 0, 0.2]} span={1.3} color={scheme.accent} />
            <Books position={[0.45, 0.54, -0.3]} count={2} rotationY={0.6} />
            <Pouf position={[0.25, 0, 0.55]} color={scheme.art[1]} />
            <Mirror position={[0.1, 1.55, -d / 2 + 0.03]} r={0.3} />
          </>
        ),
      }
    },
  }
}

export const ROOMS: RoomDef[] = [
  living('living-sage', 'Sage living room', SCHEMES.sage, 'herringbone'),
  living('living-terracotta', 'Terracotta living room', SCHEMES.terracotta, 'oak', true),
  bedroom('bedroom-blush', 'Blush bedroom', SCHEMES.blush, 'oak'),
  bedroom('bedroom-indigo', 'Indigo bedroom', SCHEMES.indigo, 'walnut'),
  dining('dining-ochre', 'Ochre dining room', SCHEMES.ochre, 'terrazzo'),
  hallway('hallway-sage', 'Sage hallway', SCHEMES.sage, 'oak'),
  hallway('hallway-indigo', 'Indigo hallway', SCHEMES.indigo, 'concrete'),
  study('study-ochre', 'Ochre study', SCHEMES.ochre, 'oak'),
  lobby('lobby', 'Hotel lobby', SCHEMES.terracotta),
  nook('nook-blush', 'Reading corner', SCHEMES.blush, 'walnut'),
]

/** Rooms for this kind of rug first, then the rest. */
export function roomsFor(category: RugCategory): RoomDef[] {
  return [...ROOMS.filter((r) => r.fits[0] === category), ...ROOMS.filter((r) => r.fits[0] !== category && r.fits.includes(category)), ...ROOMS.filter((r) => !r.fits.includes(category))]
}
