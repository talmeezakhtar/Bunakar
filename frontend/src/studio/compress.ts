import type { ChartLayer, Layer, RugDoc } from './model'

/**
 * Saving and loading rug documents. Charts are a byte per knot (1.5 M for a 9x12 ft rug at
 * 100 kpsi) but very repetitive, so they're stored deflate-compressed and base64-encoded inside the
 * document's JSON. Everything else is plain JSON. Works in browsers and Node (CompressionStream).
 */

export type StoredChart = Omit<ChartLayer, 'cells'> & { cells: string; encoding: 'deflate-raw+base64' }
export type StoredLayer = Exclude<Layer, ChartLayer> | StoredChart
export type StoredDoc = Omit<RugDoc, 'layers'> & { layers: StoredLayer[] }

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export async function encodeDoc(doc: RugDoc): Promise<StoredDoc> {
  const layers = await Promise.all(
    doc.layers.map(async (l): Promise<StoredLayer> =>
      l.kind === 'chart' ? { ...l, cells: toBase64(await pipe(l.cells, new CompressionStream('deflate-raw'))), encoding: 'deflate-raw+base64' } : l,
    ),
  )
  return { ...doc, layers }
}

export async function decodeDoc(stored: StoredDoc): Promise<RugDoc> {
  const layers = await Promise.all(
    stored.layers.map(async (l): Promise<Layer> => {
      if (l.kind !== 'chart') return l
      const { encoding: _encoding, ...rest } = l
      const cells = await pipe(fromBase64(l.cells), new DecompressionStream('deflate-raw'))
      if (cells.length !== l.cols * l.rows) throw new Error(`Chart ${l.name} is damaged: ${cells.length} cells, expected ${l.cols * l.rows}`)
      return { ...rest, cells }
    }),
  )
  return { ...stored, layers }
}

// ---- drafts: a fast synchronous encoding for the autosave ----------------------------------

/** Run-length encoding of chart bytes as "value*count" pairs in base 36 (charts are mostly runs). */
export function rleEncode(cells: Uint8Array): string {
  const out: string[] = []
  for (let i = 0; i < cells.length; ) {
    const v = cells[i]
    let n = 1
    while (i + n < cells.length && cells[i + n] === v) n++
    out.push(n === 1 ? v.toString(36) : `${v.toString(36)}*${n.toString(36)}`)
    i += n
  }
  return out.join(',')
}

export function rleDecode(s: string, length: number): Uint8Array {
  const cells = new Uint8Array(length)
  let i = 0
  if (s)
    for (const part of s.split(',')) {
      const [v, n] = part.split('*')
      const value = parseInt(v, 36)
      const count = n ? parseInt(n, 36) : 1
      cells.fill(value, i, i + count)
      i += count
    }
  if (i !== length) throw new Error('Draft chart is damaged')
  return cells
}

type DraftChart = Omit<ChartLayer, 'cells'> & { rle: string }
export type DraftDoc = Omit<RugDoc, 'layers'> & { layers: (Exclude<Layer, ChartLayer> | DraftChart)[] }

export function docToDraft(doc: RugDoc): DraftDoc {
  return { ...doc, layers: doc.layers.map((l) => (l.kind === 'chart' ? { ...l, cells: undefined, rle: rleEncode(l.cells) } : l)) as DraftDoc['layers'] }
}

export function draftToDoc(draft: DraftDoc): RugDoc {
  return {
    ...draft,
    layers: draft.layers.map((l) => {
      if (l.kind !== 'chart') return l
      const { rle, ...rest } = l as DraftChart
      return { ...rest, cells: rleDecode(rle, rest.cols * rest.rows) }
    }),
  }
}
