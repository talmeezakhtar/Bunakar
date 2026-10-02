/**
 * Planar-homography ("corner pin") math: maps a rectangle's four corners onto an arbitrary
 * quadrilateral, so a flat rug texture can be warped to sit correctly on a photographed floor.
 * This is the standard technique used for CSS 3D corner-pinning and for texture-mapping a
 * rectangle onto an arbitrary quad in a 2D canvas.
 */

export type Point = { x: number; y: number }
export type Quad = { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }

type Mat3 = number[] // row-major, length 9

function adjugate(m: Mat3): Mat3 {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ]
}

function multMM(a: Mat3, b: Mat3): Mat3 {
  const c: number[] = new Array(9).fill(0)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0
      for (let k = 0; k < 3; k++) sum += a[3 * i + k] * b[3 * k + j]
      c[3 * i + j] = sum
    }
  }
  return c
}

function multMV(m: Mat3, v: [number, number, number]): [number, number, number] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

function basisToPoints(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): Mat3 {
  const m: Mat3 = [x1, x2, x3, y1, y2, y3, 1, 1, 1]
  const v = multMV(adjugate(m), [x4, y4, 1])
  return multMM(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]])
}

/** The 3x3 homography mapping source quad -> destination quad (both given as 4 point pairs). */
function general2DProjection(
  x1s: number, y1s: number, x1d: number, y1d: number,
  x2s: number, y2s: number, x2d: number, y2d: number,
  x3s: number, y3s: number, x3d: number, y3d: number,
  x4s: number, y4s: number, x4d: number, y4d: number,
): Mat3 {
  const s = basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s)
  const d = basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d)
  return multMM(d, adjugate(s))
}

/**
 * Homography mapping the rectangle (0,0)-(w,0)-(0,h)-(w,h) onto `dest` (its four pixel-space
 * corners), normalized so the bottom-right entry is 1.
 */
export function rectToQuadHomography(w: number, h: number, dest: Quad): Mat3 {
  const t = general2DProjection(
    0, 0, dest.topLeft.x, dest.topLeft.y,
    w, 0, dest.topRight.x, dest.topRight.y,
    0, h, dest.bottomLeft.x, dest.bottomLeft.y,
    w, h, dest.bottomRight.x, dest.bottomRight.y,
  )
  const scale = t[8] || 1
  return t.map((v) => v / scale)
}

/** CSS `matrix3d(...)` string for a homography computed by rectToQuadHomography. */
export function homographyToCssMatrix3d(t: Mat3): string {
  const m = [
    t[0], t[3], 0, t[6],
    t[1], t[4], 0, t[7],
    0, 0, 1, 0,
    t[2], t[5], 0, t[8],
  ]
  return `matrix3d(${m.join(',')})`
}
