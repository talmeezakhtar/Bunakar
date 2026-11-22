import { fibreMaterial } from '../../data/materials'
import type { Fibre } from '../../data/materials'

/** A fibre's shine, softness and durability as five-dot meters. */
export default function FibreFacts({ fibre, className = '' }: { fibre: Fibre | string; className?: string }) {
  const f = fibreMaterial(fibre).facts
  const rows: [string, number][] = [
    ['Shine', f.shine],
    ['Softness', f.softness],
    ['Durability', f.durability],
  ]
  return (
    <dl className={`flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] text-muted ${className}`}>
      {rows.map(([label, v]) => (
        <div key={label} className="flex items-center gap-1">
          <dt>{label}</dt>
          <dd className="flex gap-[2px]" aria-label={`${v} of 5`}>
            {[1, 2, 3, 4, 5].map((k) => (
              <span key={k} className={`h-1.5 w-1.5 rounded-full ${k <= v ? 'bg-ink/70' : 'bg-ink/15'}`} />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}
