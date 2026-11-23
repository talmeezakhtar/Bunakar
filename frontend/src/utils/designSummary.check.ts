// Self-check for the design summary: `npx tsx src/utils/designSummary.check.ts`.
import { createDefaultTileDesign } from '../types/tileDesign'
import { summarizeTileDesign } from './designSummary'

const same = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)}`)
}

const empty = createDefaultTileDesign(4, 6)
same(summarizeTileDesign(empty), { tiles: 0, colours: 0, motifs: 0 }, 'empty design')

const painted = {
  ...empty,
  tiles: {
    '0-0': [{ swatchId: 'wine', cutType: 'full', rotation: 0 }],
    '0-1': [{ swatchId: 'wine', cutType: 'full', rotation: 0 }],
    '1-1': [{ swatchId: 'gold', cutType: 'full', rotation: 0 }],
    '2-2': [],
  },
} as unknown as typeof empty
same(summarizeTileDesign(painted), { tiles: 3, colours: 2, motifs: 0 }, 'painted design')

console.log('ok: design summary')
