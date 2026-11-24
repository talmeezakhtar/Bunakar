import type { ReactNode } from 'react'
import RealisticRug from '../ui/RealisticRug'
import type { RugSource } from '../../three/rug/rugSource'

export type RugPick<T extends string> = { id: T; title: string; sub: string; detail?: ReactNode; source: RugSource }

/**
 * A choice shown as rugs hung side by side, like a bazaar wall: each a strip of its sample until
 * chosen, when it opens out to show the whole rug and what it means. Side by side when the
 * container is 42rem wide or more, stacked below that.
 */
export default function RugPicker<T extends string>({ label, items, value, onChange }: { label: string; items: RugPick<T>[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="@container">
      <div role="radiogroup" aria-label={label} className="flex flex-col gap-2 @2xl:h-[26rem] @2xl:flex-row">
        {items.map((item, i) => {
          const on = item.id === value
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(item.id)}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`group relative overflow-hidden rounded-[var(--radius-card)] bg-ink text-left motion-safe:animate-[fade-in_600ms_var(--ease-gallery)_both] motion-safe:transition-[flex-grow,height] motion-safe:duration-700 motion-safe:ease-[var(--ease-gallery)] focus-visible:outline-offset-2 @2xl:h-auto @2xl:basis-0 ${
                on ? 'h-80 grow-[7]' : 'h-14 grow'
              }`}
            >
              <span
                className={`absolute inset-0 block motion-safe:transition-[filter,transform] motion-safe:duration-700 motion-safe:ease-[var(--ease-gallery)] ${
                  on ? 'scale-100' : 'scale-[1.06] brightness-[0.6] saturate-[0.85] group-hover:brightness-[0.78]'
                }`}
              >
                <RealisticRug source={item.source} longPx={on ? 900 : 480} fit="cover" alt="" className="h-full w-full" />
              </span>

              {on ? (
                <span className="absolute inset-0 flex flex-col justify-end bg-[linear-gradient(to_top,rgb(20_17_13/0.9),rgb(20_17_13/0.6)_38%,transparent_75%)] p-5 sm:p-6">
                  <span key={item.id} className="block max-w-md motion-safe:animate-[fade-in_450ms_180ms_var(--ease-gallery)_both]">
                    <span className="block font-display text-[clamp(1.5rem,2.6vw,2rem)] font-medium leading-tight text-paper">{item.title}</span>
                    <span className="mt-1 block text-[0.95rem] leading-snug text-paper/85">{item.sub}</span>
                    {item.detail && <span className="mt-3 block text-[0.875rem] text-paper/70">{item.detail}</span>}
                  </span>
                </span>
              ) : (
                <span className="absolute inset-0 flex items-center bg-gradient-to-r from-black/55 to-transparent px-5 text-paper @2xl:items-end @2xl:justify-center @2xl:bg-gradient-to-t @2xl:px-0 @2xl:pb-5">
                  <span className="font-display text-[1.0625rem] font-medium leading-none @2xl:rotate-180 @2xl:[writing-mode:vertical-rl]">{item.title}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
