/**
 * The tour's chapters: chapter 0 is the whole courtyard, chapters 1-6 are its numbered stops.
 * Scrolling moves the camera from one chapter's view to the next; each chapter is also a section
 * of the landing page (its DOM panel lives in `TourHome`).
 */
export type Vec3 = [number, number, number]

export type Stop = {
  id: number
  title: string
  /** Where the numbered marker floats (chapter 0 has none). */
  at?: Vec3
  camera: Vec3
  target: Vec3
}

export const STOPS: Stop[] = [
  { id: 0, title: 'The courtyard', camera: [6.2, 3.9, 7.4], target: [0, 0.55, -0.3] },
  { id: 1, title: 'Your rug', at: [0.25, 0.25, 1.35], camera: [2.9, 3.5, 5.0], target: [0.2, 0.1, 1.2] },
  { id: 2, title: 'The loom', at: [0, 1.5, -1.75], camera: [1.0, 1.75, 2.3], target: [0, 1.05, -1.75] },
  { id: 3, title: 'The colours', at: [1.0, 1.1, -0.95], camera: [3.6, 2.0, 1.6], target: [1.0, 0.6, -1.0] },
  { id: 4, title: 'Classic styles', at: [-1.95, 0.5, 0.85], camera: [-4.4, 2.4, 4.0], target: [-1.9, 0.35, 0.85] },
  { id: 5, title: 'Your own picture', at: [2.35, 1.35, -0.45], camera: [5.0, 2.2, 2.7], target: [2.3, 1.1, -0.45] },
  { id: 6, title: 'See it at home', at: [2.2, 0.35, 0.7], camera: [4.5, 2.1, 4.1], target: [2.1, 0.1, 0.7] },
]
