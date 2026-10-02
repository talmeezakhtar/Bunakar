// Self-check for the template library: `npx tsx src/data/patternTemplates.check.ts`.
// Every template, at every rug size the wizard can produce, must fill each tile completely
// with pieces the designer itself accepts (no overlaps), in every colorway.
import { MOCK_SWATCHES } from './mockSwatches'
import { COLORWAYS, PATTERN_TEMPLATES, applyTemplate, encodeBlock } from './patternTemplates'
import { createDefaultTileDesign, tileKey } from '../types/tileDesign'
import { canPlacePiece, findPieceIndexAt } from '../components/tileDesigner/cutShapes'
import type { TileCell } from '../types/tileDesign'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

assert(encodeBlock([[1, 1], [1, 1]], 2).length === 1, 'uniform block -> one full tile')
assert(encodeBlock([[1, 1], [2, 2]], 2).every((p) => p.cut === 'half'), 'row-uniform block -> halves')

const sizes = [[2, 6], [2, 8], [3, 5], [5, 7], [7, 8], [1, 1], [13, 13]]
for (const t of PATTERN_TEMPLATES) {
  for (const cw of COLORWAYS) {
    for (const [w, h] of sizes) {
      const s = applyTemplate(createDefaultTileDesign(w, h), t, cw, MOCK_SWATCHES)
      assert(s.myStyles.length >= 2 || w * h < 4, `${t.id}: at least two colors`)
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const pieces = s.tiles[tileKey(r, c)]
          assert(pieces?.length, `${t.id} ${w}x${h}: tile ${r},${c} empty`)
          const placed: TileCell[] = []
          for (const p of pieces) {
            assert(canPlacePiece(placed, p), `${t.id} ${w}x${h}: overlap at ${r},${c}`)
            placed.push(p)
          }
          for (let i = 0; i < 8; i++)
            for (let j = 0; j < 8; j++)
              assert(findPieceIndexAt(pieces, (i + 0.37) / 8, (j + 0.61) / 8) >= 0, `${t.id} ${w}x${h}: gap at ${r},${c}`)
        }
      }
    }
  }
}
console.log(`ok: ${PATTERN_TEMPLATES.length} templates x ${COLORWAYS.length} colorways x ${sizes.length} sizes`)
