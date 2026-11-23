// Runs every `*.check.ts` self-check under src/ and fails if any throws: `npm run check`.
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

function find(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return find(path)
    return name.endsWith('.check.ts') ? [path] : []
  })
}

const files = find(join(import.meta.dirname, '..', 'src')).sort()
let failed = 0
for (const file of files) {
  try {
    await import(pathToFileURL(file).href)
  } catch (err) {
    failed++
    console.error(`FAIL ${relative(process.cwd(), file)}\n`, err)
  }
}
console.log(`${files.length - failed}/${files.length} checks passed`)
if (failed) process.exit(1)
