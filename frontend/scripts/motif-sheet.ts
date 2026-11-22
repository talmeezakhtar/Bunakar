// Contact sheet of every vector motif in two rug palettes:
//   npx tsx scripts/motif-sheet.ts [out.html]
// Pieces show on a tile-coloured square; borders show as a framed rug (corners + repeats).
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOTIF_CATEGORIES, allMotifs } from '../src/data/motifs/catalogue'
import { borderFrameSvg, motifToSvg, rankColors, resolveRoles } from '../src/data/motifs/palette'

const out = resolve(process.argv[2] ?? 'motif-sheet.html')

const PALETTES: { name: string; tile: string; colors: string[] }[] = [
  { name: 'Wine & Gold', tile: '#e6d5b3', colors: ['#7a2436', '#7a2436', '#7a2436', '#1c2444', '#1c2444', '#d9a441', '#e6d5b3'] },
  { name: 'Emerald & Clay', tile: '#173a36', colors: ['#3f9c82', '#3f9c82', '#e0916b', '#e0916b', '#ece4d4', '#173a36'] },
]

const specs = allMotifs()
let html = `<!doctype html><meta charset="utf-8"><title>Motif sheet</title><style>
body{font:13px/1.3 system-ui,sans-serif;margin:16px;background:#f3efe7;color:#222}
h2{margin:24px 0 8px;font-weight:600}
.row{display:flex;flex-wrap:wrap;gap:10px}
.cell{width:170px}
.cell .art{height:130px;display:flex;align-items:center;justify-content:center;border-radius:6px;padding:8px;box-sizing:border-box}
.cell svg{max-width:100%;max-height:100%}
.b{width:340px}.b .art{height:240px}
.cap{font-size:11px;color:#555;margin-top:3px}
.sw{display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:2px;vertical-align:middle;border:1px solid #0002}
</style><h1>Vector motifs (${specs.length})</h1>`

for (const pal of PALETTES) {
  html += `<p><b>${pal.name}</b> ${rankColors(pal.colors).map((c) => `<span class="sw" style="background:${c}"></span>`).join('')} on tile <span class="sw" style="background:${pal.tile}"></span></p>`
}

let n = 0
for (const cat of MOTIF_CATEGORIES) {
  const inCat = specs.filter((s) => s.category === cat)
  if (!inCat.length) continue
  html += `<h2>${cat}</h2>`
  for (const pal of PALETTES) {
    html += `<div class="row" style="margin-bottom:10px">`
    for (const s of inCat) {
      const colors = resolveRoles(s, pal.colors)
      const svg = s.kind === 'border'
        ? borderFrameSvg(s, colors, 2, 1, `m${n++}`, `<rect x="${s.viewBox[3]}" y="${s.viewBox[3]}" width="${2 * s.viewBox[2]}" height="${s.viewBox[2]}" fill="${pal.tile}"/>`)
        : motifToSvg(s, colors)
      html += `<div class="cell${s.kind === 'border' ? ' b' : ''}"><div class="art" style="background:${pal.tile}">${svg}</div><div class="cap">${s.name} <code>${s.id}</code></div></div>`
    }
    html += `</div>`
  }
}

writeFileSync(out, html)
console.log(`wrote ${out} (${Math.round(html.length / 1024)} KB, ${specs.length} motifs)`)
