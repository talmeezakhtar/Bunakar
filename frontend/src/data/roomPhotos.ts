import type { RugCategory } from '../types/tileDesign'
import type { Quad } from '../utils/perspective'
import areaImg1 from '../assests/Area_Rugs_topview.png'
import areaImg2 from '../assests/Area_Rugs_topview_img2.png'
import runnerImg1 from '../assests/Runners_rugs_toview_img1.png'
import runnerImg2 from '../assests/Runners_rugs_toview_img2.png'
import wallImg1 from '../assests/WallToWall_rugs_img1.png'
import wallImg2 from '../assests/WallToWall_rugs_img2.png'

export interface RoomPhoto {
  id: string
  src: string
  /** Intrinsic pixel size of the source photo, so calibrated corners (0..1 fractions) always
   * line up regardless of how large the photo is rendered on screen. */
  width: number
  height: number
  category: RugCategory
  label: string
  /**
   * The four corners of the existing rug/floor area in the photo, as fractions (0..1) of the
   * photo's width/height, calibrated by hand against the source image. Order is the rug's own
   * top-left / top-right / bottom-right / bottom-left as it would unroll flat. These photos are
   * all shot top-down (bird's-eye), so the quads are plain axis-aligned rectangles.
   */
  corners: Quad
}

export const ROOM_PHOTOS: RoomPhoto[] = [
  {
    id: 'area-1',
    src: areaImg1,
    width: 1408,
    height: 768,
    category: 'area',
    label: 'Living Room, Warm Tones',
    corners: {
      topLeft: { x: 0.287, y: 0.245 },
      topRight: { x: 0.713, y: 0.245 },
      bottomRight: { x: 0.713, y: 0.76 },
      bottomLeft: { x: 0.287, y: 0.76 },
    },
  },
  {
    id: 'area-2',
    src: areaImg2,
    width: 1408,
    height: 768,
    category: 'area',
    label: 'Living Room, Blue Chairs',
    corners: {
      topLeft: { x: 0.29, y: 0.24 },
      topRight: { x: 0.705, y: 0.24 },
      bottomRight: { x: 0.705, y: 0.76 },
      bottomLeft: { x: 0.29, y: 0.76 },
    },
  },
  {
    id: 'runner-1',
    src: runnerImg1,
    width: 843,
    height: 1264,
    category: 'runner',
    label: 'Hallway, Dark Oak Floor',
    corners: {
      topLeft: { x: 0.315, y: 0.04 },
      topRight: { x: 0.685, y: 0.04 },
      bottomRight: { x: 0.685, y: 0.965 },
      bottomLeft: { x: 0.315, y: 0.965 },
    },
  },
  {
    id: 'runner-2',
    src: runnerImg2,
    width: 843,
    height: 1264,
    category: 'runner',
    label: 'Hallway, Dark Walnut Floor',
    corners: {
      topLeft: { x: 0.31, y: 0.04 },
      topRight: { x: 0.69, y: 0.04 },
      bottomRight: { x: 0.69, y: 0.965 },
      bottomLeft: { x: 0.31, y: 0.965 },
    },
  },
  {
    id: 'wall-1',
    src: wallImg1,
    width: 1408,
    height: 768,
    category: 'wall',
    label: 'Upstairs Bedroom',
    corners: {
      topLeft: { x: 0.115, y: 0.135 },
      topRight: { x: 0.885, y: 0.135 },
      bottomRight: { x: 0.885, y: 0.885 },
      bottomLeft: { x: 0.115, y: 0.885 },
    },
  },
  {
    id: 'wall-2',
    src: wallImg2,
    width: 1408,
    height: 768,
    category: 'wall',
    label: 'Study Library',
    corners: {
      topLeft: { x: 0.16, y: 0.185 },
      topRight: { x: 0.845, y: 0.16 },
      bottomRight: { x: 0.845, y: 0.68 },
      bottomLeft: { x: 0.16, y: 0.685 },
    },
  },
]

/** The two photos matching the design's own rug type - area rug designs only preview in area-rug
 * rooms, runners only in hallway runners, and so on. */
export function roomPhotosForDesign(category: RugCategory): RoomPhoto[] {
  return ROOM_PHOTOS.filter((p) => p.category === category)
}
