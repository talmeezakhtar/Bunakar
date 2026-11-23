import type { RugDesignRecord } from '../services/api'
import { decodeDoc, encodeDoc } from './compress'
import type { RugDoc } from './model'

/** A rug document as the API's record (charts compressed), and back. */
export async function docToRecord(doc: RugDoc): Promise<Omit<RugDesignRecord, 'id' | 'updatedAt'>> {
  const { id: _id, ...rest } = doc
  return { name: doc.name || 'Untitled rug', construction: doc.construction, widthFt: doc.widthFt, heightFt: doc.heightFt, doc: await encodeDoc({ ...rest, id: null }) }
}

export async function recordToDoc(record: RugDesignRecord): Promise<RugDoc> {
  const doc = await decodeDoc(record.doc)
  return { ...doc, id: record.id, name: record.name }
}
