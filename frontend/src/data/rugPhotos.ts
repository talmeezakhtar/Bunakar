/** Photographs of real rugs in `public/rugs/` (the owner's own photos), with their proportions. */
export type RugPhoto = { id: string; name: string; url: string; widthFt: number; heightFt: number }

export const RUG_PHOTO_LIST: RugPhoto[] = [
  { id: 'red-floral', name: 'Red floral', url: '/rugs/rug-1.jpg', widthFt: 4, heightFt: 6.1 },
  { id: 'red-gul', name: 'Red gul', url: '/rugs/rug-2.jpg', widthFt: 4, heightFt: 5.7 },
  { id: 'teal-medallion', name: 'Teal medallion', url: '/rugs/rug-3.jpg', widthFt: 3.4, heightFt: 6 },
  { id: 'green-sunburst', name: 'Green sunburst', url: '/rugs/rug-4.jpg', widthFt: 4, heightFt: 6 },
  { id: 'ivory-medallion', name: 'Ivory medallion', url: '/rugs/rug-5.jpg', widthFt: 4, heightFt: 6 },
  { id: 'green-medallion', name: 'Green medallion', url: '/rugs/rug-6.jpg', widthFt: 4, heightFt: 6 },
  { id: 'blue-oval', name: 'Blue oval', url: '/rugs/rug-7.jpg', widthFt: 3.4, heightFt: 6 },
]

const byId = Object.fromEntries(RUG_PHOTO_LIST.map((p) => [p.id, p]))

export const RUG_PHOTOS = {
  redFloral: byId['red-floral'],
  redGul: byId['red-gul'],
  tealMedallion: byId['teal-medallion'],
  greenSunburst: byId['green-sunburst'],
  ivoryMedallion: byId['ivory-medallion'],
  greenMedallion: byId['green-medallion'],
  blueOval: byId['blue-oval'],
}
